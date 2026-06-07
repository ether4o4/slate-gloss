package com.vistalauncher

import android.appwidget.AppWidgetHost
import android.appwidget.AppWidgetManager
import android.content.Context

/**
 * Process-wide holder for the launcher's AppWidgetHost so the bridge module and
 * the view manager share one host. HOST_ID is an arbitrary stable id for NSOS.
 */
object WidgetHost {
  const val HOST_ID = 0x4E534F // "NSO"

  private var host: AppWidgetHost? = null
  private var listening = false

  fun manager(ctx: Context): AppWidgetManager =
      AppWidgetManager.getInstance(ctx.applicationContext)

  fun host(ctx: Context): AppWidgetHost {
    val h = host ?: AppWidgetHost(ctx.applicationContext, HOST_ID).also { host = it }
    return h
  }

  fun startListening(ctx: Context) {
    try {
      if (!listening) {
        host(ctx).startListening()
        listening = true
      }
    } catch (_: Exception) {}
  }

  fun stopListening(ctx: Context) {
    try {
      if (listening) {
        host(ctx).stopListening()
        listening = false
      }
    } catch (_: Exception) {}
  }
}
