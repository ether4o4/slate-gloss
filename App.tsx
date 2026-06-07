import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  AppState,
  Dimensions,
  Modal,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';

import {Vista} from './src/theme';
import {Desktop} from './src/components/vista/Desktop';
import {Taskbar} from './src/components/vista/Taskbar';
import {StartMenu} from './src/components/vista/StartMenu';
import {SystemFlyout} from './src/components/vista/SystemFlyout';
import {RecycleBin} from './src/components/vista/RecycleBin';
import {Personalize} from './src/components/vista/Personalize';
import SwarmChatWindow from './src/components/SwarmChatWindow';
import {
  getApps,
  isDefaultLauncher,
  launchApp as nativeLaunch,
  openAppInfo,
  uninstallApp,
  requestDefaultLauncher,
  chooseWallpaper,
  pickStartIcon,
  getBatteryInfo,
  getSystemInfo,
  getNotifications,
  isNotificationAccessEnabled,
  openNotificationAccessSettings,
  dismissNotification,
  onNotificationsChanged,
  type AppInfo,
  type NotificationInfo,
  type BatteryInfo,
  type SystemInfo,
} from './src/native/Launcher';
import {getWeather, type Weather} from './src/api/Weather';
import {
  loadState,
  saveState,
  recordRecent,
  togglePin,
  addToDesktop,
  moveDesktopIcon,
  recycleDesktopIcon,
  restoreFromRecycle,
  emptyRecycle,
  setStartSize,
  setTaskbarColors,
  setStartIcon,
  toggleWidget,
  setNotes,
  type LauncherState,
} from './src/db/LauncherStore';

const STATUS_BAR = StatusBar.currentHeight ?? 0;
const TASKBAR_H = 64;
const CELL_W = 84;
const CELL_H = 96;

const App: React.FC = () => {
  const [apps, setApps] = useState<AppInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [state, setState] = useState<LauncherState | null>(null);
  const [isDefault, setIsDefault] = useState(false);
  const [notifications, setNotifications] = useState<NotificationInfo[]>([]);
  const [notifAccess, setNotifAccess] = useState(false);
  const [battery, setBattery] = useState<BatteryInfo>({level: 0, charging: false});
  const [system, setSystem] = useState<SystemInfo | null>(null);
  const [weather, setWeather] = useState<Weather | null>(null);

  const [startOpen, setStartOpen] = useState(false);
  const [swarmOpen, setSwarmOpen] = useState(false);
  const [flyoutOpen, setFlyoutOpen] = useState(false);
  const [recycleOpen, setRecycleOpen] = useState(false);
  const [personalizeOpen, setPersonalizeOpen] = useState(false);

  const grid = useMemo(() => {
    const win = Dimensions.get('window');
    const usableW = win.width - 12;
    const usableH = win.height - STATUS_BAR - TASKBAR_H - 16;
    const cols = Math.max(2, Math.floor(usableW / CELL_W));
    const rows = Math.max(3, Math.floor(usableH / CELL_H) - 1);
    return {cols, rows};
  }, []);

  const appsByPkg = useMemo(() => {
    const map: Record<string, AppInfo> = {};
    apps.forEach(a => (map[a.packageName] = a));
    return map;
  }, [apps]);

  // ---- loading ----------------------------------------------------------

  const loadApps = useCallback(async () => {
    setLoading(true);
    setApps(await getApps());
    setLoading(false);
  }, []);

  const refreshNotifications = useCallback(async () => {
    const access = await isNotificationAccessEnabled();
    setNotifAccess(access);
    setNotifications(access ? await getNotifications() : []);
  }, []);

  const refreshWidgets = useCallback(async () => {
    getBatteryInfo().then(setBattery);
    getSystemInfo().then(setSystem);
    getWeather().then(setWeather);
  }, []);

  useEffect(() => {
    loadApps();
    loadState().then(setState);
    isDefaultLauncher().then(setIsDefault);
    refreshNotifications();
    const unsub = onNotificationsChanged(refreshNotifications);
    const appSub = AppState.addEventListener('change', s => {
      if (s === 'active') {
        isDefaultLauncher().then(setIsDefault);
        refreshNotifications();
      }
    });
    return () => {
      unsub();
      appSub.remove();
    };
  }, [loadApps, refreshNotifications]);

  // ---- state mutation helper -------------------------------------------

  const update = useCallback((producer: (s: LauncherState) => LauncherState) => {
    setState(prev => {
      if (!prev) return prev;
      const next = producer(prev);
      saveState(next);
      return next;
    });
  }, []);

  const launch = useCallback(
    (pkg: string) => {
      nativeLaunch(pkg);
      update(s => recordRecent(s, pkg));
    },
    [update],
  );

  // ---- menus ------------------------------------------------------------

  const desktopIconMenu = useCallback(
    (pkg: string) => {
      const label = appsByPkg[pkg]?.label ?? pkg;
      Alert.alert(label, undefined, [
        {text: 'Open', onPress: () => launch(pkg)},
        {text: 'Remove from desktop', onPress: () => update(s => recycleDesktopIcon(s, pkg))},
        {text: 'App info', onPress: () => openAppInfo(pkg)},
        {text: 'Uninstall', style: 'destructive', onPress: () => uninstallApp(pkg)},
        {text: 'Cancel', style: 'cancel'},
      ]);
    },
    [appsByPkg, launch, update],
  );

  const startItemMenu = useCallback(
    (pkg: string) => {
      const label = appsByPkg[pkg]?.label ?? pkg;
      const isPinned = state?.pinned.includes(pkg);
      Alert.alert(label, undefined, [
        {text: isPinned ? 'Unpin' : 'Pin to Start', onPress: () => update(s => togglePin(s, pkg))},
        {
          text: 'Add to desktop',
          onPress: () => update(s => addToDesktop(s, pkg, grid.cols, grid.rows)),
        },
        {text: 'App info', onPress: () => openAppInfo(pkg)},
        {text: 'Uninstall', style: 'destructive', onPress: () => uninstallApp(pkg)},
        {text: 'Cancel', style: 'cancel'},
      ]);
    },
    [appsByPkg, state, update, grid],
  );

  const changeWallpaper = useCallback(async () => {
    await chooseWallpaper();
  }, []);

  const pickStart = useCallback(async () => {
    const uri = await pickStartIcon();
    if (uri) {
      update(s => setStartIcon(s, uri));
    }
  }, [update]);

  const resetStart = useCallback(() => update(s => setStartIcon(s, '')), [update]);

  const pinnedApps = useMemo(
    () => (state?.pinned ?? []).map(p => appsByPkg[p]).filter(Boolean) as AppInfo[],
    [state, appsByPkg],
  );

  if (!state) {
    return (
      <View style={[styles.root, styles.center]}>
        <LinearGradient colors={Vista.aurora} style={StyleSheet.absoluteFill} />
        <ActivityIndicator color="#bfe3ff" />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
      <LinearGradient colors={Vista.vignette} style={StyleSheet.absoluteFill} pointerEvents="none" />

      <View style={styles.body}>
        <Desktop
          apps={appsByPkg}
          icons={state.desktop}
          recycleCount={state.recycle.length}
          cellWidth={CELL_W}
          cellHeight={CELL_H}
          cols={grid.cols}
          rows={grid.rows}
          onLaunch={launch}
          onIconMenu={desktopIconMenu}
          onMoveIcon={(pkg, col, row) => update(s => moveDesktopIcon(s, pkg, col, row))}
          onRecycle={pkg => update(s => recycleDesktopIcon(s, pkg))}
          onOpenRecycle={() => setRecycleOpen(true)}
        />
      </View>

      <View style={styles.taskbarDock}>
        <Taskbar
          startActive={startOpen}
          pinned={pinnedApps}
          colors={state.taskbarColors}
          startIconUri={state.startIcon || undefined}
          onStartPress={() => setStartOpen(v => !v)}
          onSwarmPress={() => setSwarmOpen(true)}
          onClockPress={() => {
            refreshNotifications();
            refreshWidgets();
            setFlyoutOpen(true);
          }}
          onLaunch={launch}
        />
      </View>

      <StartMenu
        visible={startOpen}
        apps={apps}
        appsByPkg={appsByPkg}
        pinned={state.pinned}
        recents={state.recents}
        size={state.startSize}
        onClose={() => setStartOpen(false)}
        onLaunch={pkg => {
          launch(pkg);
          setStartOpen(false);
        }}
        onItemMenu={startItemMenu}
        onResize={(w, h) => update(s => setStartSize(s, w, h))}
        onPersonalize={() => {
          setStartOpen(false);
          setPersonalizeOpen(true);
        }}
        onSetDefault={() => {
          setStartOpen(false);
          requestDefaultLauncher();
        }}
        onOpenSwarm={() => {
          setStartOpen(false);
          setSwarmOpen(true);
        }}
      />

      <SystemFlyout
        visible={flyoutOpen}
        enabledWidgets={state.widgets}
        notifications={notifications}
        notifAccess={notifAccess}
        battery={battery}
        weather={weather}
        system={system}
        notes={state.notes}
        onClose={() => setFlyoutOpen(false)}
        onToggleWidget={id => update(s => toggleWidget(s, id))}
        onNotesChange={text => update(s => setNotes(s, text))}
        onGrantAccess={() => {
          setFlyoutOpen(false);
          openNotificationAccessSettings();
        }}
        onDismiss={key => {
          dismissNotification(key);
          setNotifications(n => n.filter(x => x.key !== key));
        }}
      />

      <RecycleBin
        visible={recycleOpen}
        items={state.recycle}
        apps={appsByPkg}
        onClose={() => setRecycleOpen(false)}
        onRestore={pkg => update(s => restoreFromRecycle(s, pkg, grid.cols, grid.rows))}
        onEmpty={() => update(s => emptyRecycle(s))}
        onUninstall={pkg => uninstallApp(pkg)}
      />

      <Personalize
        visible={personalizeOpen}
        currentColors={state.taskbarColors}
        startIcon={state.startIcon}
        onClose={() => setPersonalizeOpen(false)}
        onPickColors={colors => update(s => setTaskbarColors(s, colors))}
        onPickStartIcon={pickStart}
        onResetStartIcon={resetStart}
        onChangeWallpaper={changeWallpaper}
      />

      <Modal
        visible={swarmOpen}
        animationType="slide"
        onRequestClose={() => setSwarmOpen(false)}>
        <SwarmChatWindow onClose={() => setSwarmOpen(false)} />
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: 'transparent'},
  center: {alignItems: 'center', justifyContent: 'center'},
  body: {flex: 1, paddingTop: STATUS_BAR, paddingBottom: TASKBAR_H},
  taskbarDock: {position: 'absolute', left: 0, right: 0, bottom: 0},
});

export default App;
