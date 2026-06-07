package com.vistalauncher

import android.app.Activity
import android.app.ActivityManager
import android.app.WallpaperManager
import android.app.role.RoleManager
import android.appwidget.AppWidgetManager
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
import android.os.Environment
import android.os.StatFs
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
import com.facebook.react.bridge.LifecycleEventListener
import java.io.ByteArrayOutputStream
import java.io.File

/**
 * Native bridge for the Vista launcher: enumerate/launch apps, manage the
 * default-home role, change the wallpaper, read battery, and surface system
 * notifications. Everything runs on demand — no background polling.
 */
class LauncherModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext), ActivityEventListener, LifecycleEventListener {

  private var wallpaperPromise: Promise? = null
  private var imagePromise: Promise? = null
  private var widgetPromise: Promise? = null
  private var pendingWidgetId = -1

  init {
    reactContext.addActivityEventListener(this)
    reactContext.addLifecycleEventListener(this)
    ctx = reactContext
  }

  // ---- LifecycleEventListener: keep the widget host listening while visible --
  override fun onHostResume() {
    WidgetHost.startListening(reactContext)
  }

  override fun onHostPause() {
    WidgetHost.stopListening(reactContext)
  }

  override fun onHostDestroy() {
    WidgetHost.stopListening(reactContext)
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

  @ReactMethod
  fun pickStartIcon(promise: Promise) {
    val activity = currentActivity
    if (activity == null) {
      promise.reject("no_activity", "No current activity")
      return
    }
    imagePromise = promise
    val pick = Intent(Intent.ACTION_GET_CONTENT).apply {
      type = "image/*"
      addCategory(Intent.CATEGORY_OPENABLE)
    }
    try {
      activity.startActivityForResult(Intent.createChooser(pick, "Select start button image"), REQ_IMAGE)
    } catch (e: Exception) {
      imagePromise = null
      promise.reject("picker_failed", e.message, e)
    }
  }

  override fun onActivityResult(activity: Activity?, requestCode: Int, resultCode: Int, data: Intent?) {
    when (requestCode) {
      REQ_WALLPAPER -> {
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
      REQ_IMAGE -> {
        val p = imagePromise
        imagePromise = null
        if (resultCode == Activity.RESULT_OK && data?.data != null) {
          try {
            val dst = File(reactContext.filesDir, "start_icon_${System.currentTimeMillis()}.png")
            val input = reactContext.contentResolver.openInputStream(data.data!!)
            if (input != null) {
              input.use { inp -> dst.outputStream().use { out -> inp.copyTo(out) } }
              p?.resolve("file://${dst.absolutePath}")
            } else {
              p?.reject("image_failed", "Could not open the selected image")
            }
          } catch (e: Exception) {
            p?.reject("image_failed", e.message, e)
          }
        } else {
          p?.resolve("")
        }
      }
      REQ_WIDGET_PICK -> {
        if (resultCode == Activity.RESULT_OK) {
          val id = data?.getIntExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, pendingWidgetId)
              ?: pendingWidgetId
          val info = WidgetHost.manager(reactContext).getAppWidgetInfo(id)
          if (info?.configure != null) {
            try {
              pendingWidgetId = id
              val cfg = Intent(AppWidgetManager.ACTION_APPWIDGET_CONFIGURE)
                  .setComponent(info.configure)
                  .putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, id)
              activity?.startActivityForResult(cfg, REQ_WIDGET_CONFIGURE)
            } catch (e: Exception) {
              finishWidget(id)
            }
          } else {
            finishWidget(id)
          }
        } else {
          try { WidgetHost.host(reactContext).deleteAppWidgetId(pendingWidgetId) } catch (_: Exception) {}
          widgetPromise?.resolve(null)
          widgetPromise = null
        }
      }
      REQ_WIDGET_CONFIGURE -> {
        if (resultCode == Activity.RESULT_OK) {
          finishWidget(pendingWidgetId)
        } else {
          try { WidgetHost.host(reactContext).deleteAppWidgetId(pendingWidgetId) } catch (_: Exception) {}
          widgetPromise?.resolve(null)
          widgetPromise = null
        }
      }
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

  // ---- App widgets (hosting) -------------------------------------------

  @ReactMethod
  fun pickWidget(promise: Promise) {
    val activity = currentActivity
    if (activity == null) {
      promise.reject("no_activity", "No current activity")
      return
    }
    try {
      WidgetHost.startListening(reactContext)
      val id = WidgetHost.host(reactContext).allocateAppWidgetId()
      pendingWidgetId = id
      widgetPromise = promise
      val intent = Intent(AppWidgetManager.ACTION_APPWIDGET_PICK)
          .putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, id)
      activity.startActivityForResult(intent, REQ_WIDGET_PICK)
    } catch (e: Exception) {
      widgetPromise = null
      promise.reject("widget_pick_failed", e.message, e)
    }
  }

  @ReactMethod
  fun removeWidget(widgetId: Int) {
    try {
      WidgetHost.host(reactContext).deleteAppWidgetId(widgetId)
    } catch (_: Exception) {}
  }

  private fun finishWidget(id: Int) {
    val p = widgetPromise
    widgetPromise = null
    try {
      val info = WidgetHost.manager(reactContext).getAppWidgetInfo(id)
      if (info == null) {
        p?.resolve(null)
        return
      }
      val d = reactContext.resources.displayMetrics.density
      val map = Arguments.createMap()
      map.putInt("widgetId", id)
      map.putInt("minWidth", (info.minWidth / d).toInt())
      map.putInt("minHeight", (info.minHeight / d).toInt())
      map.putString("label", info.loadLabel(reactContext.packageManager)?.toString() ?: "Widget")
      p?.resolve(map)
    } catch (e: Exception) {
      p?.reject("widget_info_failed", e.message, e)
    }
  }

  // ---- System info (RAM / storage) -------------------------------------

  @ReactMethod
  fun getSystemInfo(promise: Promise) {
    try {
      val am = reactContext.getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager
      val mi = ActivityManager.MemoryInfo()
      am.getMemoryInfo(mi)
      val totalMem = mi.totalMem
      val availMem = mi.availMem
      val ramUsedPct = if (totalMem > 0) (((totalMem - availMem) * 100) / totalMem).toInt() else 0

      val stat = StatFs(Environment.getDataDirectory().path)
      val totalBytes = stat.totalBytes
      val freeBytes = stat.availableBytes
      val storageUsedPct =
          if (totalBytes > 0) (((totalBytes - freeBytes) * 100) / totalBytes).toInt() else 0

      val gb = 1024.0 * 1024.0 * 1024.0
      val map = Arguments.createMap()
      map.putInt("ramUsedPct", ramUsedPct)
      map.putDouble("ramTotalGb", totalMem / gb)
      map.putDouble("ramUsedGb", (totalMem - availMem) / gb)
      map.putInt("storageUsedPct", storageUsedPct)
      map.putDouble("storageTotalGb", totalBytes / gb)
      map.putDouble("storageFreeGb", freeBytes / gb)
      promise.resolve(map)
    } catch (e: Exception) {
      promise.reject("system_info_failed", e.message, e)
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
    private const val REQ_IMAGE = 42002
    private const val REQ_WIDGET_PICK = 42010
    private const val REQ_WIDGET_CONFIGURE = 42011

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
