package com.vistalauncher

import android.content.Intent
import android.content.pm.PackageManager
import android.content.pm.ResolveInfo
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.drawable.BitmapDrawable
import android.graphics.drawable.Drawable
import android.net.Uri
import android.provider.Settings
import android.util.Base64
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableArray
import java.io.ByteArrayOutputStream

/**
 * Lightweight native bridge that lets the JS launcher talk to Android's
 * PackageManager: enumerate launchable apps, launch them, and manage the
 * "default home app" role. No third-party dependency, no background work —
 * everything runs on demand on the native-modules thread.
 */
class LauncherModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = "LauncherModule"

  /** Returns the installed launchable apps as [{ packageName, label, icon }]. */
  @ReactMethod
  fun getApps(promise: Promise) {
    try {
      val pm = reactContext.packageManager
      val intent = Intent(Intent.ACTION_MAIN, null).addCategory(Intent.CATEGORY_LAUNCHER)
      val resolveInfos: List<ResolveInfo> = pm.queryIntentActivities(intent, 0)

      val self = reactContext.packageName
      val apps: WritableArray = Arguments.createArray()

      resolveInfos
          .asSequence()
          .map { it to it.loadLabel(pm).toString() }
          .filter { (info, _) -> info.activityInfo.packageName != self }
          .sortedBy { (_, label) -> label.lowercase() }
          .forEach { (info, label) ->
            val map = Arguments.createMap()
            val pkg = info.activityInfo.packageName
            map.putString("packageName", pkg)
            map.putString("label", label)
            map.putString("icon", encodeIcon(info.loadIcon(pm)))
            apps.pushMap(map)
          }

      promise.resolve(apps)
    } catch (e: Exception) {
      promise.reject("get_apps_failed", e.message, e)
    }
  }

  /** Launches the app identified by [packageName]. */
  @ReactMethod
  fun launchApp(packageName: String, promise: Promise) {
    try {
      val launch = reactContext.packageManager.getLaunchIntentForPackage(packageName)
      if (launch == null) {
        promise.reject("not_launchable", "No launch intent for $packageName")
        return
      }
      launch.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      reactContext.startActivity(launch)
      promise.resolve(true)
    } catch (e: Exception) {
      promise.reject("launch_failed", e.message, e)
    }
  }

  /** Opens the system "App info" screen for [packageName]. */
  @ReactMethod
  fun openAppInfo(packageName: String) {
    val intent =
        Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:$packageName"))
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    reactContext.startActivity(intent)
  }

  /** Prompts the system uninstall dialog for [packageName]. */
  @ReactMethod
  fun uninstallApp(packageName: String) {
    val intent =
        Intent(Intent.ACTION_DELETE, Uri.parse("package:$packageName"))
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    reactContext.startActivity(intent)
  }

  /** Resolves true when this app is the current default home/launcher. */
  @ReactMethod
  fun isDefaultLauncher(promise: Promise) {
    try {
      val intent = Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_HOME)
      val res = reactContext.packageManager.resolveActivity(intent, PackageManager.MATCH_DEFAULT_ONLY)
      val pkg = res?.activityInfo?.packageName
      promise.resolve(pkg == reactContext.packageName)
    } catch (e: Exception) {
      promise.resolve(false)
    }
  }

  /** Opens the system settings page where the user can pick the default home app. */
  @ReactMethod
  fun openHomeSettings() {
    val intent = Intent(Settings.ACTION_HOME_SETTINGS).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    reactContext.startActivity(intent)
  }

  private fun encodeIcon(drawable: Drawable): String {
    return try {
      val bitmap = drawableToBitmap(drawable, ICON_SIZE_PX)
      val baos = ByteArrayOutputStream()
      bitmap.compress(Bitmap.CompressFormat.PNG, 100, baos)
      "data:image/png;base64," + Base64.encodeToString(baos.toByteArray(), Base64.NO_WRAP)
    } catch (e: Exception) {
      ""
    }
  }

  private fun drawableToBitmap(drawable: Drawable, size: Int): Bitmap {
    if (drawable is BitmapDrawable && drawable.bitmap != null) {
      return Bitmap.createScaledBitmap(drawable.bitmap, size, size, true)
    }
    val bitmap = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888)
    val canvas = Canvas(bitmap)
    drawable.setBounds(0, 0, canvas.width, canvas.height)
    drawable.draw(canvas)
    return bitmap
  }

  companion object {
    private const val ICON_SIZE_PX = 144
  }
}
