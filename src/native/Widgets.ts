import {
  NativeModules,
  UIManager,
  requireNativeComponent,
  Platform,
} from 'react-native';

const native: any = NativeModules.LauncherModule;
const COMPONENT = 'WidgetHostView';

export interface HostedWidgetMeta {
  widgetId: number;
  minWidth: number;
  minHeight: number;
  label: string;
}

/** True only when the native widget-host view manager is registered. */
export const widgetHostAvailable: boolean =
  Platform.OS === 'android' &&
  typeof (UIManager as any).getViewManagerConfig === 'function' &&
  !!(UIManager as any).getViewManagerConfig(COMPONENT);

/** Native view that renders a bound AppWidget (null if unsupported). */
export const WidgetHostView: any = widgetHostAvailable
  ? requireNativeComponent(COMPONENT)
  : null;

/** Opens the system widget picker; resolves the bound widget's meta, or null. */
export const pickWidget = async (): Promise<HostedWidgetMeta | null> => {
  if (!native?.pickWidget) {
    return null;
  }
  try {
    return await native.pickWidget();
  } catch (e) {
    console.error('pickWidget failed:', e);
    return null;
  }
};

/** Releases a hosted widget id natively. */
export const removeHostedWidget = (widgetId: number): void => {
  try {
    native?.removeWidget?.(widgetId);
  } catch (e) {
    console.error('removeWidget failed:', e);
  }
};
