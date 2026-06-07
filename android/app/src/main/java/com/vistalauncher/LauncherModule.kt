package com.vistalauncher

import android.app.Activity
import android.app.WallpaperManager
import android.app.role.RoleManager
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.PackageManager
import android.content.pm.ResolveInfo
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.drawable.BitmapDrawable
import android.graphics.drawable.Drawable
import android.net.Uri
import android.os.BatteryManager
import android.os.Build
import android.provider.Settings
import android.util.Base64
import androidx.core.app.NotificationManagerCompat
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableArray
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.facebook.react.bridge.ActivityEventListener
import java.io.ByteArrayOutputStream

/**
 * Native bridge for the Vista launcher: enumerate/launch apps, manage the
 * default-home role, change the wallpaper, read battery, and surface system
 * notifications. Everything runs on demand — no background polling.
 */
class LauncherModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext), ActivityEventListener {

  private var wallpaperPromise: Promise? = null

  init {
    reactContext.addActivityEventListener(this)
    ctx = reactContext
  }

  override fun getName(): String = "LauncherModule"

  // ---- Apps -------------------------------------------------------------

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
            map.putString("packageName", info.activityInfo.packageName)
            map.putString("label", label)
            map.putString("icon", encodeIcon(info.loadIcon(pm)))
            apps.pushMap(map)
          }
      promise.resolve(apps)
    } catch (e: Exception) {
      promise.reject("get_apps_failed", e.message, e)
    }
  }

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

  @ReactMethod
  fun openAppInfo(packageName: String) {
    val intent =
        Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:$packageName"))
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    reactContext.startActivity(intent)
  }

  @ReactMethod
  fun uninstallApp(packageName: String) {
    val intent =
        Intent(Intent.ACTION_DELETE, Uri.parse("package:$packageName"))
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    reactContext.startActivity(intent)
  }

  // ---- Default launcher -------------------------------------------------

  @ReactMethod
  fun isDefaultLauncher(promise: Promise) {
    try {
      val intent = Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_HOME)
      val res = reactContext.packageManager.resolveActivity(intent, PackageManager.MATCH_DEFAULT_ONLY)
      promise.resolve(res?.activityInfo?.packageName == reactContext.packageName)
    } catch (e: Exception) {
      promise.resolve(false)
    }
  }

  @ReactMethod
  fun requestDefaultLauncher() {
    val activity = currentActivity
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q && activity != null) {
      val rm = reactContext.getSystemService(Context.ROLE_SERVICE) as? RoleManager
      if (rm != null && rm.isRoleAvailable(RoleManager.ROLE_HOME) && !rm.isRoleHeld(RoleManager.ROLE_HOME)) {
        activity.startActivity(rm.createRequestRoleIntent(RoleManager.ROLE_HOME))
        return
      }
    }
    reactContext.startActivity(
        Intent(Settings.ACTION_HOME_SETTINGS).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
  }

  // ---- Wallpaper --------------------------------------------------------

  @ReactMethod
  fun chooseWallpaper(promise: Promise) {
    val activity = currentActivity
    if (activity == null) {
      promise.reject("no_activity", "No current activity")
      return
    }
    wallpaperPromise = promise
    val pick = Intent(Intent.ACTION_GET_CONTENT).apply {
      type = "image/*"
      addCategory(Intent.CATEGORY_OPENABLE)
    }
    try {
      activity.startActivityForResult(Intent.createChooser(pick, "Select wallpaper"), REQ_WALLPAPER)
    } catch (e: Exception) {
      wallpaperPromise = null
      promise.reject("picker_failed", e.message, e)
    }
  }

  override fun onActivityResult(activity: Activity?, requestCode: Int, resultCode: Int, data: Intent?) {
    if (requestCode != REQ_WALLPAPER) return
    val p = wallpaperPromise
    wallpaperPromise = null
    if (resultCode == Activity.RESULT_OK && data?.data != null) {
      try {
        val input = reactContext.contentResolver.openInputStream(data.data!!)
        if (input != null) {
          input.use { WallpaperManager.getInstance(reactContext).setStream(it) }
          p?.resolve(true)
        } else {
          p?.reject("wallpaper_failed", "Could not open the selected image")
        }
      } catch (e: Exception) {
        p?.reject("wallpaper_failed", e.message, e)
      }
    } else {
      p?.resolve(false)
    }
  }

  override fun onNewIntent(intent: Intent?) {}

  // ---- Battery ----------------------------------------------------------

  @ReactMethod
  fun getBatteryInfo(promise: Promise) {
    try {
      val status = reactContext.registerReceiver(null, IntentFilter(Intent.ACTION_BATTERY_CHANGED))
      val level = status?.getIntExtra(BatteryManager.EXTRA_LEVEL, -1) ?: -1
      val scale = status?.getIntExtra(BatteryManager.EXTRA_SCALE, 100) ?: 100
      val st = status?.getIntExtra(BatteryManager.EXTRA_STATUS, -1) ?: -1
      val pct = if (level >= 0 && scale > 0) (level * 100 / scale) else 0
      val charging =
          st == BatteryManager.BATTERY_STATUS_CHARGING || st == BatteryManager.BATTERY_STATUS_FULL
      val map = Arguments.createMap()
      map.putInt("level", pct)
      map.putBoolean("charging", charging)
      promise.resolve(map)
    } catch (e: Exception) {
      promise.reject("battery_failed", e.message, e)
    }
  }

  // ---- Notifications ----------------------------------------------------

  @ReactMethod
  fun isNotificationAccessEnabled(promise: Promise) {
    val enabled =
        NotificationManagerCompat.getEnabledListenerPackages(reactContext)
            .contains(reactContext.packageName)
    promise.resolve(enabled)
  }

  @ReactMethod
  fun openNotificationAccessSettings() {
    val intent = Intent("android.settings.ACTION_NOTIFICATION_LISTENER_SETTINGS")
        .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    reactContext.startActivity(intent)
  }

  @ReactMethod
  fun getNotifications(promise: Promise) {
    try {
      val pm = reactContext.packageManager
      val out = Arguments.createArray()
      val active = NotificationService.instance?.activeNotifications
      if (active != null) {
        for (sbn in active) {
          val n = sbn.notification ?: continue
          val extras = n.extras
          val title = extras?.getCharSequence("android.title")?.toString() ?: ""
          val text = extras?.getCharSequence("android.text")?.toString() ?: ""
          if (title.isEmpty() && text.isEmpty()) continue
          val label = try {
            pm.getApplicationLabel(pm.getApplicationInfo(sbn.packageName, 0)).toString()
          } catch (e: Exception) {
            sbn.packageName
          }
          val map = Arguments.createMap()
          map.putString("key", sbn.key)
          map.putString("packageName", sbn.packageName)
          map.putString("app", label)
          map.putString("title", title)
          map.putString("text", text)
          map.putDouble("time", sbn.postTime.toDouble())
          out.pushMap(map)
        }
      }
      promise.resolve(out)
    } catch (e: Exception) {
      promise.reject("notifications_failed", e.message, e)
    }
  }

  @ReactMethod
  fun dismissNotification(key: String) {
    try {
      NotificationService.instance?.cancelNotification(key)
    } catch (e: Exception) {
      // ignore
    }
  }

  // RN event-emitter bookkeeping (required when using NativeEventEmitter).
  @ReactMethod fun addListener(eventName: String) {}
  @ReactMethod fun removeListeners(count: Int) {}

  // ---- helpers ----------------------------------------------------------

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
    private const val REQ_WALLPAPER = 42001

    @Volatile private var ctx: ReactApplicationContext? = null

    /** Called by NotificationService when the active set changes. */
    fun onNotificationsChanged() {
      val c = ctx ?: return
      try {
        if (c.hasActiveReactInstance()) {
          c.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
              .emit("VistaNotificationsChanged", null)
        }
      } catch (e: Exception) {
        // ignore
      }
    }
  }
}
