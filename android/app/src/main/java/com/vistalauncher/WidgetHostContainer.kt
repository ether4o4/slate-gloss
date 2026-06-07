package com.vistalauncher

import android.appwidget.AppWidgetManager
import android.content.Context
import android.os.Bundle
import android.widget.FrameLayout

/**
 * Hosts a live AppWidgetHostView for one bound widget id. React Native does not
 * run a normal measure/layout pass on native children, so we force one in
 * requestLayout() — the well-known fix for embedding native views in RN.
 */
class WidgetHostContainer(context: Context) : FrameLayout(context) {

  private var widgetId: Int = -1

  fun setWidget(id: Int) {
    if (id == widgetId) return
    removeAllViews()
    widgetId = id
    if (id <= 0) return
    try {
      val info = WidgetHost.manager(context).getAppWidgetInfo(id) ?: return
      WidgetHost.startListening(context)
      val hostView = WidgetHost.host(context).createView(context.applicationContext, id, info)
      addView(hostView, LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT))
      updateSize()
    } catch (_: Exception) {}
  }

  private fun updateSize() {
    if (widgetId <= 0 || width == 0 || height == 0) return
    try {
      val d = resources.displayMetrics.density
      val w = (width / d).toInt()
      val h = (height / d).toInt()
      val opts = Bundle().apply {
        putInt(AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH, w)
        putInt(AppWidgetManager.OPTION_APPWIDGET_MAX_WIDTH, w)
        putInt(AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT, h)
        putInt(AppWidgetManager.OPTION_APPWIDGET_MAX_HEIGHT, h)
      }
      WidgetHost.manager(context).updateAppWidgetOptions(widgetId, opts)
    } catch (_: Exception) {}
  }

  private val measureAndLayout = Runnable {
    measure(
        MeasureSpec.makeMeasureSpec(width, MeasureSpec.EXACTLY),
        MeasureSpec.makeMeasureSpec(height, MeasureSpec.EXACTLY),
    )
    layout(left, top, right, bottom)
    updateSize()
  }

  override fun requestLayout() {
    super.requestLayout()
    post(measureAndLayout)
  }
}
