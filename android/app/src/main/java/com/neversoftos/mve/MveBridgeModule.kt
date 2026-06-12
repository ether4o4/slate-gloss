package com.neversoftos.mve

import android.content.Context
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.neversoftos.mve.sandbox.SandboxManager
import com.neversoftos.mve.sandbox.SandboxState
import kotlinx.coroutines.runBlocking
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL
import java.util.concurrent.Executors

/**
 * MveBridgeModule — the native (Kotlin) endpoint of the JS `MveBridge`.
 *
 * This is the real implementation that backs `NativeModules.MveBridge`, so the
 * shell stops running on the JS mock once the app is built. Everything that can
 * be done on-device today is done for real here:
 *
 *   • Sandbox terminal  — a bundled proot + Alpine Linux userland (the same
 *     sandbox the MorsVitaEst engine ships): real package manager (`apk`),
 *     bash, and a persistent shell session. File list/read/write/search hit
 *     the sandbox home (bind-mounted at /root).
 *   • Providers / keys   — persisted in SharedPreferences (user-supplied keys,
 *     privacy-first: nothing leaves the device except the chat call itself).
 *   • Chat               — a real OpenAI-compatible `/chat/completions` call to
 *     whichever provider the user enabled with a key.
 *
 * The MorsVitaEst engine (the `MveEngine` Kotlin facade) is the seam: once it is
 * vendored/linked into this build, `sendMessage` and the provider/memory calls
 * delegate to it instead of the inline implementations below. Method names and
 * return shapes already match the engine facade so that swap is mechanical.
 */
class MveBridgeModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

  private val io = Executors.newSingleThreadExecutor()
  private val prefs = reactContext.getSharedPreferences("mve_engine", Context.MODE_PRIVATE)
  private val history = mutableListOf<Pair<String, String>>()

  override fun getName(): String = "MveBridge"

  // ---- Providers -----------------------------------------------------------

  private data class ProviderDef(
      val id: String,
      val displayName: String,
      val baseUrl: String,
      val model: String,
  )

  private val providers = listOf(
      ProviderDef("openrouter", "OpenRouter", "https://openrouter.ai/api/v1", "openrouter/auto"),
      ProviderDef("deepseek", "DeepSeek", "https://api.deepseek.com/v1", "deepseek-chat"),
      ProviderDef("openai", "OpenAI", "https://api.openai.com/v1", "gpt-4o-mini"),
  )

  private fun keyOf(id: String): String = prefs.getString("key_$id", "") ?: ""
  private fun enabledOf(id: String): Boolean = prefs.getBoolean("enabled_$id", false)

  @ReactMethod
  fun services(promise: Promise) = io.execute {
    try {
      val arr = Arguments.createArray()
      providers.forEach { p ->
        val m = Arguments.createMap()
        m.putString("instanceId", p.id)
        m.putString("serviceId", p.id)
        m.putString("displayName", p.displayName)
        m.putBoolean("enabled", enabledOf(p.id))
        arr.pushMap(m)
      }
      promise.resolve(arr)
    } catch (e: Exception) {
      promise.reject("mve_error", e)
    }
  }

  @ReactMethod
  fun getApiKey(instanceId: String, promise: Promise) = io.execute {
    promise.resolve(keyOf(instanceId))
  }

  @ReactMethod
  fun setApiKey(instanceId: String, apiKey: String, promise: Promise) = io.execute {
    prefs.edit().putString("key_$instanceId", apiKey).apply()
    promise.resolve(null)
  }

  @ReactMethod
  fun setServiceEnabled(instanceId: String, enabled: Boolean, promise: Promise) = io.execute {
    prefs.edit().putBoolean("enabled_$instanceId", enabled).apply()
    promise.resolve(null)
  }

  // ---- Chat ----------------------------------------------------------------

  @ReactMethod
  fun sendMessage(text: String, promise: Promise) = io.execute {
    history.add("user" to text)
    val provider = providers.firstOrNull { enabledOf(it.id) && keyOf(it.id).isNotBlank() }
    if (provider == null) {
      val msg =
          "No provider is enabled yet. Open MVE → Settings, add an API key and enable a provider."
      history.add("assistant" to msg)
      promise.resolve(msg)
      return@execute
    }
    val reply =
        try {
          runAgentLoop(provider)
        } catch (e: Exception) {
          "Request failed: ${e.message}"
        }
    history.add("assistant" to reply)
    promise.resolve(reply)
  }

  // The user-authored directive. The execution protocol below is appended so
  // the model knows HOW it actually runs commands in this app.
  private val systemPrompt =
      """
      You are MVE, the intelligence behind NeverSoft OS.
      Be helpful, capable, and proactive. Approach every request with the mindset of finding a solution, not explaining why something might not work.
      Think before acting. Investigate before assuming. Verify before reporting.
      Use available tools, system access, and reasoning to understand the environment and complete tasks efficiently. When information is missing, gather evidence before asking questions.
      Communicate clearly and naturally. Be friendly, direct, and easy to work with. Keep responses focused on results.
      DO NOT perform any destructive actions (deleting) without permission.  always confirm before taking destructive action.

      If a task can be completed, complete it. If a task cannot be completed, explain exactly why and provide the best alternative path forward.
      Your goal is simple:
      Understand the user's intent, solve the problem, improve the system, and make technology feel effortless.

      You are not a chatbot that happens to have shell access.

      You are a system-level assistant whose primary method of understanding and interacting with the environment is through the Linux shell and available system tools.

      CORE DIRECTIVE

      Do not assume. Investigate.
      Do not guess. Verify.
      Do not declare limitations until you have confirmed them through available tools.

      PRIMARY WORKFLOW

      Observe -> Investigate -> Plan -> Execute -> Verify -> Report

      For every task:
      1. Observe the request.
      2. Investigate the system state.
      3. Form a plan.
      4. Execute the required actions.
      5. Verify the outcome.
      6. Report what was done and the result.

      SHELL BEHAVIOR

      The shell is your primary source of truth. Use available commands and tools to inspect files, search directories, read logs, examine running processes, analyze system state, launch applications, manage services, create and modify files, install software when appropriate, and automate repetitive actions. Never rely on assumptions when evidence can be gathered.

      UNCERTAINTY HANDLING

      When information is missing: investigate first, gather evidence, ask questions only when investigation cannot provide the answer. Before saying "I can't", "I don't have access", or "That isn't possible", you must first verify that statement through available tools and system inspection.

      AUTONOMY

      If a task can be completed safely without further clarification, complete it. If a repetitive workflow is detected, suggest automation. If multiple solutions exist, choose the simplest reliable solution first. Always favor action supported by evidence over speculation.

      REPORTING FORMAT

      After every task provide:
      REQUEST: What the user asked for.
      INVESTIGATION: What was examined.
      ACTION: What was executed.
      VERIFICATION: How success was confirmed.
      RESULT: Final outcome.

      PHILOSOPHY

      The filesystem is your memory. Running processes are your environment. Logs are your history. The shell is your senses. Your purpose is to understand, manage, optimize, and assist the operation of the system.

      Never fabricate results. Never pretend an action was completed when it was not. Never invent files, outputs, or system information. If verification fails, try to find another way; if you absolutely cannot complete the task, provide an alternative method the user can complete the task with. Always operate from evidence first, assumptions never.

      ENVIRONMENT & EXECUTION PROTOCOL

      Your shell is a real, bundled Linux sandbox: Alpine Linux running under proot (no root needed) on the user's Android device. It has busybox, bash, and the apk package manager. Internet works. Your home is /root, which is shared with the user's file storage.

      To run a command, end your message with one or more lines that each begin with exactly "RUN: " followed by a single shell command. Example:
      RUN: uname -a
      RUN: ls -la /root
      Emit only the commands you need this step, then STOP and wait. Do not write what you think the output will be. The system executes each command in order in the persistent shell and replies with the real combined output. Read that output, then continue: run more commands if needed, or, when the task is done and verified, reply normally with NO "RUN:" lines - that final message is your report to the user.

      Rules:
      - The shell is persistent: cd, exports, environment, and files survive between commands and between steps.
      - Only use "RUN: " for commands you actually want executed now. Never put "RUN: " in front of a command you are merely describing, and never invent or assume command output.
      - There is no PTY, so interactive/full-screen programs (vim, nano, htop, top, less) do not work. Use non-interactive equivalents: cat, sed, printf, redirects, and tool --flags.
      - Install software with "apk add <package>".
      - Destructive actions (rm, overwrite, apk del, killing processes) require the user's explicit confirmation first - ask before running them.
      - The user can also run commands themselves: a chat line starting with "$ " is run by the launcher directly (you never see it), and the "cmd" desktop icon opens a terminal into this same shell.
      - The launcher itself handles "themes", "theme <name>", and "call you <name>"; you never receive those.
      - There is nothing to exit or close - MVE is the engine you are part of. Never try to quit or close the chat.
      """.trimIndent()

  // Max model<->shell round-trips per user message, so a confused model can't
  // loop forever (and run up tokens). Each step may run several commands.
  private val maxAgentSteps = 6

  private val runLineRe = Regex("(?m)^\\s*RUN:\\s?(.+)$")

  /**
   * Agentic loop: ask the model, run any "RUN:" commands it emits in the
   * sandbox, feed the real output back, and repeat until it returns a final
   * answer with no commands (or we hit the step cap). Returns a transcript of
   * the reasoning, the commands, their output, and the final report.
   */
  private fun runAgentLoop(provider: ProviderDef): String {
    // Budget kill switch / daily cap.
    if (prefs.getBoolean("autonomy_paused", false)) {
      return "MVE is paused (autonomy kill switch is on — turn it off in MVE Settings → Budget)."
    }
    val cap = prefs.getInt("budget_cap", 0)
    if (cap > 0 && tokensUsedToday() >= cap) {
      return "Daily token budget reached ($cap). Raise or clear the cap in MVE Settings → Budget."
    }

    // System prompt = base directive + the user's Soul + learned memories.
    val soul = prefs.getString("soul", "")?.trim().orEmpty()
    val fullSystem = buildString {
      append(systemPrompt)
      if (soul.isNotEmpty()) append("\n\n## Owner directive (Soul)\n").append(soul)
      append(memoriesBlock())
    }
    // Per-user step cap.
    val steps = prefs.getInt("max_steps", maxAgentSteps)

    // Working message list for this turn: system + prior history.
    val messages = JSONArray()
    messages.put(JSONObject().put("role", "system").put("content", fullSystem))
    history.forEach { (role, content) ->
      messages.put(JSONObject().put("role", role).put("content", content))
    }

    val transcript = StringBuilder()
    for (step in 0 until steps) {
      val reply = chatCompletion(provider, messages)
      val commands = runLineRe.findAll(reply).map { it.groupValues[1].trim() }
          .filter { it.isNotEmpty() }.toList()

      // Text the model wrote above its RUN: lines (its reasoning this step).
      val prose = reply.replace(runLineRe, "").trim()

      if (commands.isEmpty()) {
        // Final answer.
        if (transcript.isEmpty()) return reply
        if (prose.isNotEmpty()) transcript.append(prose)
        return transcript.toString().trim()
      }

      // Record the model's turn verbatim so it has the full thread next step.
      messages.put(JSONObject().put("role", "assistant").put("content", reply))

      if (prose.isNotEmpty()) transcript.append(prose).append("\n\n")

      val observation = StringBuilder("SHELL OUTPUT:\n")
      for (cmd in commands) {
        transcript.append("$ ").append(cmd).append('\n')
        val out = runForAgent(cmd)
        if (out.isNotEmpty()) transcript.append(out).append('\n')
        transcript.append('\n')
        observation.append("$ ").append(cmd).append('\n')
            .append(out.ifEmpty { "(no output)" }).append("\n\n")
      }
      // Feed the real output back as the next turn's input.
      messages.put(JSONObject().put("role", "user").put("content", observation.toString().trim()))
    }

    transcript.append(
        "\n[Reached the ${steps}-step limit. Tell me to continue if there's more to do.]",
    )
    return transcript.toString().trim()
  }

  /** Run one command for the agent loop; guards on sandbox readiness. */
  private fun runForAgent(command: String): String {
    if (!prefs.getBoolean("sandbox_enabled", true)) {
      return "sandbox disabled (enable it in MVE Settings)"
    }
    return when (val s = sandbox.state) {
      is SandboxState.Ready -> execInSandbox(command).take(4000)
      is SandboxState.NotInstalled ->
          "sandbox not set up yet - the user must open MVE Settings and tap Setup"
      is SandboxState.Error -> "sandbox error: ${s.message}"
      else -> "sandbox busy (${statusText(s, true)})"
    }
  }

  private fun chatCompletion(provider: ProviderDef, messages: JSONArray): String {
    val url = URL(provider.baseUrl.trimEnd('/') + "/chat/completions")
    val conn = (url.openConnection() as HttpURLConnection).apply {
      requestMethod = "POST"
      connectTimeout = 20000
      readTimeout = 60000
      doOutput = true
      setRequestProperty("Content-Type", "application/json")
      setRequestProperty("Authorization", "Bearer ${keyOf(provider.id)}")
    }
    val modelOverride = prefs.getString("model_${provider.id}", "")?.takeIf { it.isNotBlank() }
    val body = JSONObject().apply {
      put("model", modelOverride ?: provider.model)
      put("messages", messages)
      put("temperature", prefs.getFloat("temperature", 0.7f).toDouble())
    }
    OutputStreamWriter(conn.outputStream, Charsets.UTF_8).use { it.write(body.toString()) }

    val code = conn.responseCode
    val stream = if (code in 200..299) conn.inputStream else conn.errorStream
    val resp = stream?.bufferedReader()?.use { it.readText() } ?: ""
    if (code !in 200..299) return "Provider error $code: ${resp.take(300)}"

    val parsed = JSONObject(resp)
    parsed.optJSONObject("usage")?.optInt("total_tokens", 0)?.let { if (it > 0) recordTokens(it) }
    val content = parsed
        .optJSONArray("choices")
        ?.optJSONObject(0)
        ?.optJSONObject("message")
        ?.optString("content")
    return content?.takeIf { it.isNotEmpty() } ?: "No content in provider response."
  }

  @ReactMethod
  fun getHistory(promise: Promise) = io.execute {
    val arr = Arguments.createArray()
    history.forEach { (role, content) ->
      arr.pushMap(Arguments.createMap().apply {
        putString("role", role)
        putString("content", content)
      })
    }
    promise.resolve(arr)
  }

  @ReactMethod
  fun startNewChat(promise: Promise) = io.execute {
    history.clear()
    promise.resolve(null)
  }

  @ReactMethod
  fun clearChat(promise: Promise) = io.execute {
    history.clear()
    promise.resolve(null)
  }

  // ---- Core toggles --------------------------------------------------------

  @ReactMethod
  fun isSandboxEnabled(promise: Promise) =
      promise.resolve(prefs.getBoolean("sandbox_enabled", true))

  @ReactMethod
  fun setSandboxEnabled(enabled: Boolean, promise: Promise) {
    prefs.edit().putBoolean("sandbox_enabled", enabled).apply()
    promise.resolve(null)
  }

  @ReactMethod
  fun isDaemonEnabled(promise: Promise) =
      promise.resolve(prefs.getBoolean("daemon_enabled", false))

  @ReactMethod
  fun setDaemonEnabled(enabled: Boolean, promise: Promise) {
    prefs.edit().putBoolean("daemon_enabled", enabled).apply()
    promise.resolve(null)
  }

  // ---- Heartbeat -----------------------------------------------------------
  // Periodic self-check. The interval/active-hours are stored and surfaced; the
  // actual background trigger runs when the daemon foreground service is on.

  @ReactMethod
  fun isHeartbeatEnabled(promise: Promise) =
      promise.resolve(prefs.getBoolean("hb_enabled", false))

  @ReactMethod
  fun setHeartbeatEnabled(enabled: Boolean, promise: Promise) {
    prefs.edit().putBoolean("hb_enabled", enabled).apply()
    promise.resolve(null)
  }

  @ReactMethod
  fun getHeartbeatConfig(promise: Promise) = io.execute {
    promise.resolve(Arguments.createMap().apply {
      putInt("intervalMinutes", prefs.getInt("hb_interval", 60))
      putInt("activeStartHour", prefs.getInt("hb_start", 8))
      putInt("activeEndHour", prefs.getInt("hb_end", 22))
    })
  }

  @ReactMethod
  fun setHeartbeatConfig(intervalMinutes: Int, startHour: Int, endHour: Int, promise: Promise) {
    prefs.edit()
        .putInt("hb_interval", intervalMinutes.coerceIn(5, 1440))
        .putInt("hb_start", startHour.coerceIn(0, 23))
        .putInt("hb_end", endHour.coerceIn(0, 23))
        .apply()
    promise.resolve(null)
  }

  // ---- Soul (custom system prompt) -----------------------------------------

  @ReactMethod
  fun getSoul(promise: Promise) = io.execute {
    promise.resolve(prefs.getString("soul", "") ?: "")
  }

  @ReactMethod
  fun setSoul(text: String, promise: Promise) {
    prefs.edit().putString("soul", text).apply()
    promise.resolve(null)
  }

  // ---- Generation params ---------------------------------------------------

  @ReactMethod
  fun getGeneration(promise: Promise) = io.execute {
    promise.resolve(Arguments.createMap().apply {
      putDouble("temperature", prefs.getFloat("temperature", 0.7f).toDouble())
      putBoolean("showReasoning", prefs.getBoolean("show_reasoning", false))
      putInt("maxAgentSteps", prefs.getInt("max_steps", 6))
    })
  }

  @ReactMethod
  fun setGeneration(temperature: Double, showReasoning: Boolean, maxAgentSteps: Int, promise: Promise) {
    prefs.edit()
        .putFloat("temperature", temperature.toFloat().coerceIn(0f, 2f))
        .putBoolean("show_reasoning", showReasoning)
        .putInt("max_steps", maxAgentSteps.coerceIn(1, 12))
        .apply()
    promise.resolve(null)
  }

  // ---- Budget --------------------------------------------------------------
  // Daily token cap + manual kill switch. Usage is recorded from each chat
  // completion's reported token count (see chatCompletion).

  private fun today(): String =
      java.text.SimpleDateFormat("yyyy-MM-dd", java.util.Locale.US).format(java.util.Date())

  private fun tokensUsedToday(): Int =
      if (prefs.getString("usage_day", "") == today()) prefs.getInt("usage_tokens", 0) else 0

  private fun recordTokens(n: Int) {
    val t = today()
    val cur = if (prefs.getString("usage_day", "") == t) prefs.getInt("usage_tokens", 0) else 0
    prefs.edit().putString("usage_day", t).putInt("usage_tokens", cur + n).apply()
  }

  @ReactMethod
  fun getBudget(promise: Promise) = io.execute {
    promise.resolve(Arguments.createMap().apply {
      putInt("dailyTokenCap", prefs.getInt("budget_cap", 0)) // 0 = unlimited
      putInt("tokensUsedToday", tokensUsedToday())
      putBoolean("autonomyPaused", prefs.getBoolean("autonomy_paused", false))
    })
  }

  @ReactMethod
  fun setBudget(dailyTokenCap: Int, autonomyPaused: Boolean, promise: Promise) {
    prefs.edit()
        .putInt("budget_cap", dailyTokenCap.coerceAtLeast(0))
        .putBoolean("autonomy_paused", autonomyPaused)
        .apply()
    promise.resolve(null)
  }

  // ---- Memories ------------------------------------------------------------
  // Persistent facts injected into every system prompt.

  private fun memoriesArray(): JSONArray =
      runCatching { JSONArray(prefs.getString("memories", "[]")) }.getOrDefault(JSONArray())

  @ReactMethod
  fun getMemories(promise: Promise) = io.execute {
    val arr = Arguments.createArray()
    val mem = memoriesArray()
    for (i in 0 until mem.length()) {
      val o = mem.getJSONObject(i)
      arr.pushMap(Arguments.createMap().apply {
        putString("id", o.optString("id"))
        putString("key", o.optString("key"))
        putString("content", o.optString("content"))
        putString("category", o.optString("category", "general"))
      })
    }
    promise.resolve(arr)
  }

  @ReactMethod
  fun addMemory(key: String, content: String, category: String, promise: Promise) = io.execute {
    val mem = memoriesArray()
    mem.put(JSONObject().apply {
      put("id", System.currentTimeMillis().toString())
      put("key", key)
      put("content", content)
      put("category", category.ifBlank { "general" })
    })
    prefs.edit().putString("memories", mem.toString()).apply()
    promise.resolve(null)
  }

  @ReactMethod
  fun deleteMemory(id: String, promise: Promise) = io.execute {
    val mem = memoriesArray()
    val out = JSONArray()
    for (i in 0 until mem.length()) {
      val o = mem.getJSONObject(i)
      if (o.optString("id") != id) out.put(o)
    }
    prefs.edit().putString("memories", out.toString()).apply()
    promise.resolve(null)
  }

  /** Memories formatted for the system prompt. */
  private fun memoriesBlock(): String {
    val mem = memoriesArray()
    if (mem.length() == 0) return ""
    val lines = StringBuilder("\n\n## Learned memories\n")
    for (i in 0 until mem.length()) {
      val o = mem.getJSONObject(i)
      lines.append("- ").append(o.optString("key")).append(": ")
          .append(o.optString("content")).append('\n')
    }
    return lines.toString().trimEnd()
  }

  // ---- MCP servers ---------------------------------------------------------

  private fun mcpArray(): JSONArray =
      runCatching { JSONArray(prefs.getString("mcp_servers", "[]")) }.getOrDefault(JSONArray())

  @ReactMethod
  fun getMcpServers(promise: Promise) = io.execute {
    val arr = Arguments.createArray()
    val list = mcpArray()
    for (i in 0 until list.length()) {
      val o = list.getJSONObject(i)
      arr.pushMap(Arguments.createMap().apply {
        putString("id", o.optString("id"))
        putString("name", o.optString("name"))
        putString("url", o.optString("url"))
        putBoolean("enabled", o.optBoolean("enabled", true))
      })
    }
    promise.resolve(arr)
  }

  @ReactMethod
  fun addMcpServer(name: String, url: String, promise: Promise) = io.execute {
    val list = mcpArray()
    list.put(JSONObject().apply {
      put("id", System.currentTimeMillis().toString())
      put("name", name)
      put("url", url)
      put("enabled", true)
    })
    prefs.edit().putString("mcp_servers", list.toString()).apply()
    promise.resolve(null)
  }

  @ReactMethod
  fun deleteMcpServer(id: String, promise: Promise) = io.execute {
    val list = mcpArray()
    val out = JSONArray()
    for (i in 0 until list.length()) {
      val o = list.getJSONObject(i)
      if (o.optString("id") != id) out.put(o)
    }
    prefs.edit().putString("mcp_servers", out.toString()).apply()
    promise.resolve(null)
  }

  // ---- Settings export / import --------------------------------------------

  @ReactMethod
  fun exportSettings(promise: Promise) = io.execute {
    val out = JSONObject()
    out.put("soul", prefs.getString("soul", ""))
    out.put("memories", memoriesArray())
    out.put("mcpServers", mcpArray())
    out.put("heartbeat", JSONObject().apply {
      put("enabled", prefs.getBoolean("hb_enabled", false))
      put("intervalMinutes", prefs.getInt("hb_interval", 60))
      put("activeStartHour", prefs.getInt("hb_start", 8))
      put("activeEndHour", prefs.getInt("hb_end", 22))
    })
    out.put("generation", JSONObject().apply {
      put("temperature", prefs.getFloat("temperature", 0.7f).toDouble())
      put("showReasoning", prefs.getBoolean("show_reasoning", false))
      put("maxAgentSteps", prefs.getInt("max_steps", 6))
    })
    out.put("budget", JSONObject().apply {
      put("dailyTokenCap", prefs.getInt("budget_cap", 0))
    })
    out.put("sandboxEnabled", prefs.getBoolean("sandbox_enabled", true))
    out.put("daemonEnabled", prefs.getBoolean("daemon_enabled", false))
    promise.resolve(out.toString(2))
  }

  @ReactMethod
  fun importSettings(json: String, promise: Promise) = io.execute {
    try {
      val o = JSONObject(json)
      val e = prefs.edit()
      o.optString("soul").let { e.putString("soul", it) }
      o.optJSONArray("memories")?.let { e.putString("memories", it.toString()) }
      o.optJSONArray("mcpServers")?.let { e.putString("mcp_servers", it.toString()) }
      o.optJSONObject("heartbeat")?.let { hb ->
        e.putBoolean("hb_enabled", hb.optBoolean("enabled", false))
        e.putInt("hb_interval", hb.optInt("intervalMinutes", 60))
        e.putInt("hb_start", hb.optInt("activeStartHour", 8))
        e.putInt("hb_end", hb.optInt("activeEndHour", 22))
      }
      o.optJSONObject("generation")?.let { g ->
        e.putFloat("temperature", g.optDouble("temperature", 0.7).toFloat())
        e.putBoolean("show_reasoning", g.optBoolean("showReasoning", false))
        e.putInt("max_steps", g.optInt("maxAgentSteps", 6))
      }
      o.optJSONObject("budget")?.let { b -> e.putInt("budget_cap", b.optInt("dailyTokenCap", 0)) }
      if (o.has("sandboxEnabled")) e.putBoolean("sandbox_enabled", o.optBoolean("sandboxEnabled"))
      if (o.has("daemonEnabled")) e.putBoolean("daemon_enabled", o.optBoolean("daemonEnabled"))
      e.apply()
      promise.resolve(null)
    } catch (ex: Exception) {
      promise.reject("mve_error", "Invalid settings file: ${ex.message}")
    }
  }

  // ---- Sandbox: terminal + files ------------------------------------------
  //
  // Backed by the bundled proot + Alpine sandbox (SandboxManager). The shell is
  // a persistent session: cwd, exports and in-shell state survive across calls.

  private val sandbox by lazy { SandboxManager(reactContext) }

  private fun sandboxRoot(): File =
      File(sandbox.homePath).apply { if (!exists()) mkdirs() }

  private fun resolvePath(path: String): File = File(sandboxRoot(), path.trimStart('/'))

  private fun relPath(f: File): String = "/" + f.relativeTo(sandboxRoot()).path

  private fun statusText(state: SandboxState, enabled: Boolean): String = when {
    !enabled -> "Sandbox disabled"
    state is SandboxState.NotInstalled -> "Sandbox not set up — tap Setup"
    state is SandboxState.Downloading ->
        "Downloading Alpine… ${(state.progress * 100).toInt()}%"
    state is SandboxState.Extracting -> "Extracting rootfs…"
    state is SandboxState.Installing -> state.detail.ifEmpty { "Installing…" }
    state is SandboxState.Ready ->
        if (sandbox.arePackagesInstalled()) "Sandbox ready (full toolset)" else "Sandbox ready"
    state is SandboxState.Error -> "Error: ${state.message}"
    else -> "Unknown"
  }

  /** Run a command in the persistent sandbox shell, combined output as one string. */
  private fun execInSandbox(command: String, timeoutSeconds: Long = 120): String {
    val result = runBlocking { sandbox.shell.run(command, timeoutSeconds = timeoutSeconds) }
    val stdout = result["stdout"] as? String ?: ""
    val stderr = result["stderr"] as? String ?: ""
    val exit = result["exit_code"] as? Int ?: -1
    val combined = listOf(stdout, stderr).filter { it.isNotBlank() }.joinToString("\n").trimEnd()
    return if (combined.isEmpty() && exit != 0) "(exit $exit)" else combined
  }

  @ReactMethod
  fun sandboxStatus(promise: Promise) = io.execute {
    val state = sandbox.state
    val enabled = prefs.getBoolean("sandbox_enabled", true)
    val working = state is SandboxState.Downloading ||
        state is SandboxState.Extracting ||
        state is SandboxState.Installing
    promise.resolve(Arguments.createMap().apply {
      putBoolean("installed", File(sandbox.rootfsPath).isDirectory)
      putBoolean("ready", state is SandboxState.Ready && enabled)
      putBoolean("working", working)
      putString("statusText", statusText(state, enabled))
    })
  }

  @ReactMethod
  fun setupSandbox(promise: Promise) {
    // Runs on its own thread: setup can take minutes (rootfs download + apk
    // update) and must not block the io executor that serves status polls.
    Thread {
      try {
        if (sandbox.state is SandboxState.Ready) {
          promise.resolve(null)
          return@Thread
        }
        sandbox.setup()
        val deadline = System.currentTimeMillis() + 30 * 60 * 1000
        while (System.currentTimeMillis() < deadline) {
          when (val s = sandbox.state) {
            is SandboxState.Ready -> {
              val welcome = File(sandboxRoot(), "notes.txt")
              if (!welcome.exists()) {
                welcome.writeText("Welcome to the MVE Linux sandbox.\n")
              }
              promise.resolve(null)
              return@Thread
            }
            is SandboxState.Error -> {
              promise.reject("mve_error", s.message)
              return@Thread
            }
            else -> Thread.sleep(300)
          }
        }
        promise.reject("mve_error", "Sandbox setup timed out")
      } catch (e: Exception) {
        promise.reject("mve_error", e)
      }
    }.start()
  }

  @ReactMethod
  fun installSandboxPackages(promise: Promise) {
    Thread {
      try {
        if (sandbox.state !is SandboxState.Ready) {
          promise.reject("mve_error", "Set up the sandbox first")
          return@Thread
        }
        sandbox.installPackages()
        val deadline = System.currentTimeMillis() + 30 * 60 * 1000
        while (System.currentTimeMillis() < deadline) {
          when (val s = sandbox.state) {
            is SandboxState.Ready -> { promise.resolve(null); return@Thread }
            is SandboxState.Error -> { promise.reject("mve_error", s.message); return@Thread }
            else -> Thread.sleep(300)
          }
        }
        promise.reject("mve_error", "Package install timed out")
      } catch (e: Exception) {
        promise.reject("mve_error", e)
      }
    }.start()
  }

  @ReactMethod
  fun run(command: String, promise: Promise) = io.execute {
    try {
      if (!prefs.getBoolean("sandbox_enabled", true)) {
        promise.resolve("Sandbox disabled — enable it in MVE Settings.")
        return@execute
      }
      when (val s = sandbox.state) {
        is SandboxState.Ready -> promise.resolve(execInSandbox(command))
        is SandboxState.Error -> promise.resolve("sandbox error: ${s.message}")
        is SandboxState.NotInstalled ->
            promise.resolve("Sandbox not set up — open MVE Settings and tap Setup.")
        else -> promise.resolve("Sandbox is busy: ${statusText(s, true)} — try again shortly.")
      }
    } catch (e: Exception) {
      promise.resolve("error: ${e.message}")
    }
  }

  @ReactMethod
  fun listDir(path: String, promise: Promise) = io.execute {
    try {
      val arr = Arguments.createArray()
      resolvePath(path).listFiles()?.sortedBy { it.name }?.forEach { f ->
        arr.pushMap(Arguments.createMap().apply {
          putString("name", f.name)
          putString("path", relPath(f))
          putBoolean("isDirectory", f.isDirectory)
          putDouble("sizeBytes", f.length().toDouble())
          putDouble("lastModifiedMs", f.lastModified().toDouble())
        })
      }
      promise.resolve(arr)
    } catch (e: Exception) {
      promise.reject("mve_error", e)
    }
  }

  @ReactMethod
  fun readFile(path: String, promise: Promise) = io.execute {
    val f = resolvePath(path)
    promise.resolve(if (f.isFile) f.readText() else null)
  }

  @ReactMethod
  fun writeFile(path: String, content: String, promise: Promise) = io.execute {
    try {
      val f = resolvePath(path)
      f.parentFile?.mkdirs()
      f.writeText(content)
      promise.resolve(true)
    } catch (e: Exception) {
      promise.resolve(false)
    }
  }

  @ReactMethod
  fun searchFilenames(root: String, keyword: String, promise: Promise) = io.execute {
    val arr = Arguments.createArray()
    val base = resolvePath(root)
    if (base.exists()) {
      base.walkTopDown().forEach { f ->
        if (f.isFile && f.name.contains(keyword, ignoreCase = true)) {
          arr.pushString(relPath(f))
        }
      }
    }
    promise.resolve(arr)
  }

  @ReactMethod
  fun writeIfValid(path: String, content: String, validateCommand: String, promise: Promise) =
      io.execute {
        try {
          val f = resolvePath(path)
          f.parentFile?.mkdirs()
          f.writeText(content)
          val output =
              if (validateCommand.isBlank()) {
                "validation skipped"
              } else if (sandbox.state is SandboxState.Ready) {
                execInSandbox(validateCommand)
              } else {
                "validation skipped - sandbox not ready"
              }
          promise.resolve(Arguments.createMap().apply {
            putBoolean("saved", true)
            putString("output", output)
          })
        } catch (e: Exception) {
          promise.resolve(Arguments.createMap().apply {
            putBoolean("saved", false)
            putString("output", "error: ${e.message}")
          })
        }
      }
}
