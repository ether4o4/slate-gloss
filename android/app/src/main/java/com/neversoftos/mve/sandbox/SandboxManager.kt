package com.neversoftos.mve.sandbox

import android.content.Context
import android.os.Build
import android.util.Log
import java.io.File
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.ensureActive
import kotlinx.coroutines.launch
import kotlin.coroutines.coroutineContext

private const val TAG = "MveSandbox"

/**
 * Owns the bundled proot + Alpine sandbox: rootfs download/extraction, package
 * install, and the persistent shell the MVE terminal runs in. This is the
 * NeverSoft port of the MorsVitaEst engine's sandbox manager, trimmed to a
 * single shell session (the bridge exposes one terminal stream to JS).
 */
class SandboxManager(private val context: Context) {

  private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
  private var currentJob: Job? = null

  @Volatile
  var state: SandboxState = SandboxState.NotInstalled
    private set

  private val sandboxDir: File
    get() = File(context.filesDir, "linux-sandbox")

  val rootfsPath: String get() = File(sandboxDir, "rootfs").absolutePath

  // Sandbox /root is bind-mounted from externally-visible app storage so files
  // produced in the terminal can be shared/opened outside the app.
  val homePath: String by lazy {
    val external = context.getExternalFilesDir(null)
    val target = if (external != null) File(external, "sandbox-home") else File(sandboxDir, "home")
    target.mkdirs()
    target.absolutePath
  }

  val tmpPath: String get() = File(sandboxDir, "tmp").absolutePath

  // proot runs directly from nativeLibraryDir where Android grants exec permission.
  val prootPath: String get() = File(context.applicationInfo.nativeLibraryDir, "libproot.so").absolutePath
  private val nativeLibDir: String get() = context.applicationInfo.nativeLibraryDir

  private val downloader = RootfsDownloader()

  /** The one persistent terminal shell. Created lazily; survives until reset. */
  val shell: PersistentSandboxShell by lazy {
    PersistentSandboxShell(createProotExecutor(), tmpPath)
  }

  init {
    checkExistingInstallation()
  }

  private fun checkExistingInstallation() {
    val rootfs = File(sandboxDir, "rootfs")
    val proot = File(prootPath)
    if (rootfs.isDirectory && proot.exists() && proot.canExecute()) {
      state = SandboxState.Ready
    }
  }

  private fun getLinuxArch(): String {
    val abi = Build.SUPPORTED_ABIS.firstOrNull() ?: "arm64-v8a"
    return when {
      abi.startsWith("arm64") -> "aarch64"
      abi.startsWith("armeabi") -> "armhf"
      abi.startsWith("x86_64") -> "x86_64"
      abi.startsWith("x86") -> "x86"
      else -> "aarch64"
    }
  }

  fun setup() {
    if (currentJob?.isActive == true) return
    currentJob = scope.launch {
      try {
        setupInternal()
      } catch (e: kotlinx.coroutines.CancellationException) {
        checkExistingInstallation()
      } catch (e: Exception) {
        state = SandboxState.Error(e.message ?: "Setup failed")
      }
    }
  }

  private suspend fun setupInternal() {
    val arch = getLinuxArch()

    val proot = File(prootPath)
    if (!proot.exists()) {
      throw IllegalStateException(
          "Proot binary not found at $prootPath. " +
              "nativeLibraryDir contents: ${File(nativeLibDir).listFiles()?.map { it.name } ?: "empty"}",
      )
    }

    sandboxDir.mkdirs()
    File(sandboxDir, "tmp").mkdirs()
    homePath // touch lazy creation

    // Copy libtalloc with correct soname (Android strips .so.2 suffix in jniLibs).
    copyLibtalloc()

    val rootfsDir = File(sandboxDir, "rootfs")
    if (!rootfsDir.isDirectory) {
      val tarGzFile = File(sandboxDir, "rootfs.tar.gz")
      try {
        state = SandboxState.Downloading(0f)
        val job = coroutineContext[Job]
        downloader.download(arch, tarGzFile, shouldAbort = { job?.isActive == false }) { progress ->
          state = SandboxState.Downloading(progress)
        }

        state = SandboxState.Extracting
        downloader.extractTarGz(tarGzFile, rootfsDir)
      } finally {
        tarGzFile.delete()
      }
    }

    state = SandboxState.Installing("Configuring...")
    downloader.makeWritable(rootfsDir)
    downloader.writeResolvConf(rootfsDir)

    val executor = createProotExecutor()
    var updated = false
    for (mirror in downloader.mirrors) {
      downloader.writeRepositories(rootfsDir, mirror)
      val result = executor.execute("apk update", timeoutSeconds = 60)
      if (result["success"] as? Boolean == true) {
        updated = true
        break
      }
    }
    if (!updated) {
      throw IllegalStateException("apk update failed on all Alpine mirrors")
    }

    // Pull bash up front so the persistent shell uses it from the very first
    // command. Best-effort — the shell falls back to busybox sh when missing.
    val bashInstall = runCatching {
      executor.execute("apk add --no-cache bash", timeoutSeconds = 60)
    }.getOrNull()
    if (bashInstall?.get("success") != true) {
      Log.w(TAG, "bash preinstall failed; shell will use busybox sh until packages are installed")
    }

    state = SandboxState.Ready
  }

  private fun copyLibtalloc() {
    val tallocTarget = File(sandboxDir, "libtalloc.so.2")
    if (tallocTarget.exists()) return

    val source = File(nativeLibDir, "libtalloc.so")
    if (source.exists()) {
      source.copyTo(tallocTarget, overwrite = true)
    }
  }

  fun createProotExecutor(): ProotExecutor = ProotExecutor(
      prootPath = prootPath,
      libDir = sandboxDir.absolutePath,
      rootfsPath = rootfsPath,
      homePath = homePath,
      tmpPath = tmpPath,
  )

  /** Full Termux-class toolset; idempotent (apk skips what's installed). */
  fun installPackages() {
    if (currentJob?.isActive == true) return
    val packages = listOf(
        "bash", "curl", "wget", "git", "jq", "python3", "py3-pip", "nodejs",
        "openssh-client", "lftp", "rsync",
    )
    currentJob = scope.launch {
      try {
        val executor = createProotExecutor()
        for (pkg in packages) {
          ensureActive()
          state = SandboxState.Installing("Installing $pkg...")
          val result = executor.execute("apk add --no-cache $pkg", timeoutSeconds = 120)
          ensureActive()
          if (result["success"] as? Boolean != true) {
            val stderr = result["stderr"] as? String ?: ""
            val error = result["error"] as? String ?: ""
            state = SandboxState.Error("Failed to install $pkg: ${stderr.ifEmpty { error }.take(200)}")
            return@launch
          }
        }
        state = SandboxState.Ready
      } catch (_: kotlinx.coroutines.CancellationException) {
        state = SandboxState.Ready
      } catch (e: Exception) {
        state = SandboxState.Error("Install failed: ${e.message}")
      }
    }
  }

  fun arePackagesInstalled(): Boolean {
    if (state !is SandboxState.Ready) return false
    return File(rootfsPath, "usr/bin/python3").exists() &&
        File(rootfsPath, "usr/bin/ssh").exists()
  }

  fun reset() {
    currentJob?.cancel()
    shell.reset()
    scope.launch {
      sandboxDir.deleteRecursively()
      state = SandboxState.NotInstalled
    }
  }
}
