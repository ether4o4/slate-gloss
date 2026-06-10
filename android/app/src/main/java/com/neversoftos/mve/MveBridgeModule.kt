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
          chatCompletion(provider)
        } catch (e: Exception) {
          "Request failed: ${e.message}"
        }
    history.add("assistant" to reply)
    promise.resolve(reply)
  }

  private fun chatCompletion(provider: ProviderDef): String {
    val url = URL(provider.baseUrl.trimEnd('/') + "/chat/completions")
    val conn = (url.openConnection() as HttpURLConnection).apply {
      requestMethod = "POST"
      connectTimeout = 20000
      readTimeout = 45000
      doOutput = true
      setRequestProperty("Content-Type", "application/json")
      setRequestProperty("Authorization", "Bearer ${keyOf(provider.id)}")
    }
    val body = JSONObject().apply {
      put("model", provider.model)
      put("messages", JSONArray().apply {
        history.forEach { (role, content) ->
          put(JSONObject().put("role", role).put("content", content))
        }
      })
    }
    OutputStreamWriter(conn.outputStream, Charsets.UTF_8).use { it.write(body.toString()) }

    val code = conn.responseCode
    val stream = if (code in 200..299) conn.inputStream else conn.errorStream
    val resp = stream?.bufferedReader()?.use { it.readText() } ?: ""
    if (code !in 200..299) return "Provider error $code: ${resp.take(300)}"

    val content = JSONObject(resp)
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
