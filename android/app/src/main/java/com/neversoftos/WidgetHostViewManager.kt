package com.neversoftos

import com.facebook.react.uimanager.SimpleViewManager
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.annotations.ReactProp

/** Exposes <WidgetHostView widgetId={n} /> to JS. */
class WidgetHostViewManager : SimpleViewManager<WidgetHostContainer>() {
  override fun getName(): String = "WidgetHostView"

  override fun createViewInstance(reactContext: ThemedReactContext): WidgetHostContainer =
      WidgetHostContainer(reactContext)

  @ReactProp(name = "widgetId", defaultInt = -1)
  fun setWidgetId(view: WidgetHostContainer, id: Int) {
    view.setWidget(id)
  }
}
