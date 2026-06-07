package com.vistalauncher

import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification

/**
 * Mirrors active system notifications so the launcher can show them in the
 * taskbar popup. Requires the user to grant "Notification access" in settings.
 * Holds a static reference to itself so [LauncherModule] can read the current
 * notifications and cancel them.
 */
class NotificationService : NotificationListenerService() {

  override fun onListenerConnected() {
    super.onListenerConnected()
    instance = this
    LauncherModule.onNotificationsChanged()
  }

  override fun onListenerDisconnected() {
    super.onListenerDisconnected()
    instance = null
  }

  override fun onNotificationPosted(sbn: StatusBarNotification?) {
    LauncherModule.onNotificationsChanged()
  }

  override fun onNotificationRemoved(sbn: StatusBarNotification?) {
    LauncherModule.onNotificationsChanged()
  }

  override fun onDestroy() {
    instance = null
    super.onDestroy()
  }

  companion object {
    @Volatile
    var instance: NotificationService? = null
      private set
  }
}
