import {NativeModules} from 'react-native';

export interface AppInfo {
  packageName: string;
  label: string;
  /** data:image/png;base64,... URI suitable for <Image source={{uri}} />. */
  icon: string;
}

interface LauncherNativeModule {
  getApps(): Promise<AppInfo[]>;
  launchApp(packageName: string): Promise<boolean>;
  openAppInfo(packageName: string): void;
  uninstallApp(packageName: string): void;
  isDefaultLauncher(): Promise<boolean>;
  openHomeSettings(): void;
}

const native: LauncherNativeModule | undefined = NativeModules.LauncherModule;

export const isLauncherAvailable = (): boolean => native != null;

/** Lists launchable apps. Returns [] if the native module is unavailable. */
export const getApps = async (): Promise<AppInfo[]> => {
  if (!native) {
    return [];
  }
  try {
    return await native.getApps();
  } catch (error) {
    console.error('getApps failed:', error);
    return [];
  }
};

export const launchApp = async (packageName: string): Promise<void> => {
  if (!native) {
    return;
  }
  try {
    await native.launchApp(packageName);
  } catch (error) {
    console.error(`launchApp(${packageName}) failed:`, error);
  }
};

export const openAppInfo = (packageName: string): void => {
  native?.openAppInfo(packageName);
};

export const uninstallApp = (packageName: string): void => {
  native?.uninstallApp(packageName);
};

export const isDefaultLauncher = async (): Promise<boolean> => {
  if (!native) {
    return false;
  }
  try {
    return await native.isDefaultLauncher();
  } catch {
    return false;
  }
};

export const openHomeSettings = (): void => {
  native?.openHomeSettings();
};
