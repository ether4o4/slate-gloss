import {NativeModules, NativeEventEmitter} from 'react-native';

export interface AppInfo {
  packageName: string;
  label: string;
  /** data:image/png;base64,... URI suitable for <Image source={{uri}} />. */
  icon: string;
}

export interface BatteryInfo {
  level: number;
  charging: boolean;
}

export interface NotificationInfo {
  key: string;
  packageName: string;
  app: string;
  title: string;
  text: string;
  time: number;
}

interface LauncherNativeModule {
  getApps(): Promise<AppInfo[]>;
  launchApp(packageName: string): Promise<boolean>;
  openAppInfo(packageName: string): void;
  uninstallApp(packageName: string): void;
  isDefaultLauncher(): Promise<boolean>;
  requestDefaultLauncher(): void;
  chooseWallpaper(): Promise<boolean>;
  getBatteryInfo(): Promise<BatteryInfo>;
  isNotificationAccessEnabled(): Promise<boolean>;
  openNotificationAccessSettings(): void;
  getNotifications(): Promise<NotificationInfo[]>;
  dismissNotification(key: string): void;
}

const native: LauncherNativeModule | undefined = NativeModules.LauncherModule;

export const isLauncherAvailable = (): boolean => native != null;

export const getApps = async (): Promise<AppInfo[]> => {
  if (!native) return [];
  try {
    return await native.getApps();
  } catch (e) {
    console.error('getApps failed:', e);
    return [];
  }
};

export const launchApp = async (packageName: string): Promise<void> => {
  try {
    await native?.launchApp(packageName);
  } catch (e) {
    console.error(`launchApp(${packageName}) failed:`, e);
  }
};

export const openAppInfo = (packageName: string): void => native?.openAppInfo(packageName);
export const uninstallApp = (packageName: string): void => native?.uninstallApp(packageName);

export const isDefaultLauncher = async (): Promise<boolean> => {
  if (!native) return false;
  try {
    return await native.isDefaultLauncher();
  } catch {
    return false;
  }
};

export const requestDefaultLauncher = (): void => native?.requestDefaultLauncher();

export const chooseWallpaper = async (): Promise<boolean> => {
  if (!native) return false;
  try {
    return await native.chooseWallpaper();
  } catch (e) {
    console.error('chooseWallpaper failed:', e);
    return false;
  }
};

export const getBatteryInfo = async (): Promise<BatteryInfo> => {
  if (!native) return {level: 0, charging: false};
  try {
    return await native.getBatteryInfo();
  } catch {
    return {level: 0, charging: false};
  }
};

export const isNotificationAccessEnabled = async (): Promise<boolean> => {
  if (!native) return false;
  try {
    return await native.isNotificationAccessEnabled();
  } catch {
    return false;
  }
};

export const openNotificationAccessSettings = (): void =>
  native?.openNotificationAccessSettings();

export const getNotifications = async (): Promise<NotificationInfo[]> => {
  if (!native) return [];
  try {
    return await native.getNotifications();
  } catch {
    return [];
  }
};

export const dismissNotification = (key: string): void => native?.dismissNotification(key);

/** Subscribe to "notifications changed" events. Returns an unsubscribe fn. */
export const onNotificationsChanged = (cb: () => void): (() => void) => {
  if (!native) return () => {};
  const emitter = new NativeEventEmitter(NativeModules.LauncherModule);
  const sub = emitter.addListener('VistaNotificationsChanged', cb);
  return () => sub.remove();
};
