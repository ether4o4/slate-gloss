import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  Dimensions,
  Modal,
  StatusBar,
  StyleSheet,
  View,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {
  Directions,
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';

import { Theme } from './src/theme';
import { Desktop } from './src/components/ui/Desktop';
import { Taskbar } from './src/components/ui/Taskbar';
import { StartMenu } from './src/components/ui/StartMenu';
import { SystemFlyout } from './src/components/ui/SystemFlyout';
import { RecycleBin } from './src/components/ui/RecycleBin';
import { Personalize } from './src/components/ui/Personalize';
import { ContextMenu, type MenuItem } from './src/components/ui/ContextMenu';
import { Tour } from './src/components/ui/Tour';
import AsyncStorage from '@react-native-async-storage/async-storage';

import MveScreen from './src/mve/MveScreen';
import MveSettingsScreen from './src/mve/MveSettingsScreen';
import { MveBridge } from './src/mve/MveBridge';
import { ActionRegistry, type Intent } from './src/mve/ActionRegistry';

const TOUR_KEY = '@nsos_tour_done';
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
  openBatteryOptimization,
  dismissNotification,
  onNotificationsChanged,
  type AppInfo,
  type NotificationInfo,
  type BatteryInfo,
  type SystemInfo,
} from './src/native/Launcher';
import { getWeather, type Weather } from './src/api/Weather';
import { pickWidget, removeHostedWidget } from './src/native/Widgets';
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
  addDesktopWidget,
  removeDesktopWidget,
  moveDesktopWidget,
  type LauncherState,
} from './src/db/LauncherStore';

const STATUS_BAR = StatusBar.currentHeight ?? 0;
const TASKBAR_H = 64;
const CELL_W = 84;
const CELL_H = 96;

/** True when any MVE provider instance has an API key configured. */
const mveHasKey = async (): Promise<boolean> => {
  try {
    const services = await MveBridge.services();
    const keys = await Promise.all(
      services.map(s => MveBridge.getApiKey(s.instanceId)),
    );
    return keys.some(k => !!k);
  } catch {
    return false;
  }
};

const App: React.FC = () => {
  const [apps, setApps] = useState<AppInfo[]>([]);
  const [, setLoading] = useState(true);
  const [state, setState] = useState<LauncherState | null>(null);
  const [isDefault, setIsDefault] = useState(false);
  const [notifications, setNotifications] = useState<NotificationInfo[]>([]);
  const [notifAccess, setNotifAccess] = useState(false);
  const [battery, setBattery] = useState<BatteryInfo>({
    level: 0,
    charging: false,
  });
  const [system, setSystem] = useState<SystemInfo | null>(null);
  const [weather, setWeather] = useState<Weather | null>(null);

  const [startOpen, setStartOpen] = useState(false);
  const [mveOpen, setMveOpen] = useState(false);
  const [mveSettingsOpen, setMveSettingsOpen] = useState(false);
  const [flyoutOpen, setFlyoutOpen] = useState(false);
  const [recycleOpen, setRecycleOpen] = useState(false);
  const [personalizeOpen, setPersonalizeOpen] = useState(false);
  const [menu, setMenu] = useState<{
    title?: string;
    items: MenuItem[];
  } | null>(null);
  const [tourOpen, setTourOpen] = useState(false);
  const [hasKey, setHasKey] = useState(false);

  // Open intents drive the taskbar MVE badge (context-first surfacing).
  const [openIntents, setOpenIntents] = useState<Intent[]>([]);
  useEffect(
    () => ActionRegistry.subscribe(() => setOpenIntents(ActionRegistry.open())),
    [],
  );

  const summonMve = useCallback(() => setMveOpen(true), []);

  // System gesture: a right-fling from the left edge calls MVE up from anywhere.
  const summonGesture = Gesture.Fling()
    .direction(Directions.RIGHT)
    .onEnd(() => {
      runOnJS(summonMve)();
    });

  const grid = useMemo(() => {
    const win = Dimensions.get('window');
    const usableW = win.width - 12;
    const usableH = win.height - STATUS_BAR - TASKBAR_H - 16;
    const cols = Math.max(2, Math.floor(usableW / CELL_W));
    const rows = Math.max(3, Math.floor(usableH / CELL_H) - 1);
    return { cols, rows };
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
    mveHasKey().then(setHasKey);
    refreshNotifications();
    // First launch → show the setup tour once.
    AsyncStorage.getItem(TOUR_KEY).then(done => {
      if (done !== '1') {
        setTourOpen(true);
      }
    });
    const unsub = onNotificationsChanged(refreshNotifications);
    const appSub = AppState.addEventListener('change', s => {
      if (s === 'active') {
        isDefaultLauncher().then(setIsDefault);
        mveHasKey().then(setHasKey);
        refreshNotifications();
      }
    });
    return () => {
      unsub();
      appSub.remove();
    };
  }, [loadApps, refreshNotifications]);

  const finishTour = useCallback(() => {
    AsyncStorage.setItem(TOUR_KEY, '1');
    setTourOpen(false);
  }, []);

  // ---- state mutation helper -------------------------------------------

  const update = useCallback(
    (producer: (s: LauncherState) => LauncherState) => {
      setState(prev => {
        if (!prev) {
          return prev;
        }
        const next = producer(prev);
        saveState(next);
        return next;
      });
    },
    [],
  );

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
      const isPinned = state?.pinned.includes(pkg);
      setMenu({
        title: label,
        items: [
          { label: 'Open', icon: '▶', onPress: () => launch(pkg) },
          {
            label: isPinned ? 'Unpin from taskbar' : 'Pin to taskbar',
            icon: '📌',
            onPress: () => update(s => togglePin(s, pkg)),
          },
          { label: 'App info', icon: 'ⓘ', onPress: () => openAppInfo(pkg) },
          {
            label: 'Remove from desktop',
            icon: '🗑️',
            onPress: () => update(s => recycleDesktopIcon(s, pkg)),
          },
          {
            label: 'Uninstall',
            icon: '⛔',
            danger: true,
            onPress: () => uninstallApp(pkg),
          },
        ],
      });
    },
    [appsByPkg, state, launch, update],
  );

  const startItemMenu = useCallback(
    (pkg: string) => {
      const label = appsByPkg[pkg]?.label ?? pkg;
      const isPinned = state?.pinned.includes(pkg);
      setMenu({
        title: label,
        items: [
          { label: 'Open', icon: '▶', onPress: () => launch(pkg) },
          {
            label: isPinned ? 'Unpin' : 'Pin to taskbar',
            icon: '📌',
            onPress: () => update(s => togglePin(s, pkg)),
          },
          {
            label: 'Add to desktop',
            icon: '➕',
            onPress: () =>
              update(s => addToDesktop(s, pkg, grid.cols, grid.rows)),
          },
          { label: 'App info', icon: 'ⓘ', onPress: () => openAppInfo(pkg) },
          {
            label: 'Uninstall',
            icon: '⛔',
            danger: true,
            onPress: () => uninstallApp(pkg),
          },
        ],
      });
    },
    [appsByPkg, state, update, grid, launch],
  );

  const emptyDesktopMenu = useCallback(() => {
    setMenu({
      title: 'Desktop',
      items: [
        {
          label: 'Open Start (apps)',
          icon: '⊞',
          onPress: () => setStartOpen(true),
        },
        { label: 'Add a widget', icon: '🧩', onPress: () => addWidget() },
        {
          label: 'Change wallpaper',
          icon: '🖼️',
          onPress: () => changeWallpaper(),
        },
        {
          label: 'Personalize',
          icon: '🎨',
          onPress: () => setPersonalizeOpen(true),
        },
      ],
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const taskbarPinMenu = useCallback(
    (pkg: string) => {
      const label = appsByPkg[pkg]?.label ?? pkg;
      setMenu({
        title: label,
        items: [
          { label: 'Open', icon: '▶', onPress: () => launch(pkg) },
          {
            label: 'Unpin',
            icon: '📌',
            onPress: () => update(s => togglePin(s, pkg)),
          },
          { label: 'App info', icon: 'ⓘ', onPress: () => openAppInfo(pkg) },
          {
            label: 'Uninstall',
            icon: '⛔',
            danger: true,
            onPress: () => uninstallApp(pkg),
          },
        ],
      });
    },
    [appsByPkg, launch, update],
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

  const resetStart = useCallback(
    () => update(s => setStartIcon(s, '')),
    [update],
  );

  // ---- Real widget hosting ---------------------------------------------

  // Snap a free pixel position to the icon grid (the "magnet").
  const snapToGrid = useCallback(
    (x: number, y: number) => ({
      x: Math.max(0, Math.round(x / CELL_W) * CELL_W),
      y: Math.max(0, Math.round(y / CELL_H) * CELL_H),
    }),
    [],
  );

  const addWidget = useCallback(async () => {
    const meta = await pickWidget();
    if (!meta) {
      return;
    }
    const screenW = Dimensions.get('window').width;
    const w = Math.max(120, Math.min(meta.minWidth || 160, screenW - 24));
    const h = Math.max(80, Math.min(meta.minHeight || 120, 420));
    update(s => {
      // Spawn in open space below the top icon rows (snapped + staggered),
      // never on top of the icons at the top of the screen.
      const n = s.desktopWidgets.length;
      const baseRow = Math.max(2, Math.floor(grid.rows * 0.4));
      const pos = snapToGrid((n % 2) * CELL_W, (baseRow + n) * CELL_H);
      return addDesktopWidget(s, {
        widgetId: meta.widgetId,
        x: pos.x,
        y: pos.y,
        w,
        h,
      });
    });
  }, [update, grid, snapToGrid]);

  const removeWidget = useCallback(
    (id: number) => {
      removeHostedWidget(id);
      update(s => removeDesktopWidget(s, id));
    },
    [update],
  );

  const moveWidget = useCallback(
    (id: number, x: number, y: number) => {
      const p = snapToGrid(x, y); // magnet to nearest grid slot on release
      update(s => moveDesktopWidget(s, id, p.x, p.y));
    },
    [update, snapToGrid],
  );

  const pinnedApps = useMemo(
    () =>
      (state?.pinned ?? []).map(p => appsByPkg[p]).filter(Boolean) as AppInfo[],
    [state, appsByPkg],
  );

  if (!state) {
    return (
      <View style={[styles.root, styles.center]}>
        <LinearGradient colors={Theme.aurora} style={StyleSheet.absoluteFill} />
        <ActivityIndicator color="#bfe3ff" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={styles.root}>
      <StatusBar
        translucent
        backgroundColor="transparent"
        barStyle="light-content"
      />
      <LinearGradient
        colors={Theme.vignette}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      <View style={styles.body}>
        <Desktop
          apps={appsByPkg}
          icons={state.desktop}
          widgets={state.desktopWidgets}
          recycleCount={state.recycle.length}
          cellWidth={CELL_W}
          cellHeight={CELL_H}
          cols={grid.cols}
          rows={grid.rows}
          onLaunch={launch}
          onIconMenu={desktopIconMenu}
          onMoveIcon={(pkg, col, row) =>
            update(s => moveDesktopIcon(s, pkg, col, row))
          }
          onRecycle={pkg => update(s => recycleDesktopIcon(s, pkg))}
          onOpenRecycle={() => setRecycleOpen(true)}
          onMoveWidget={moveWidget}
          onRemoveWidget={removeWidget}
          onEmptyMenu={emptyDesktopMenu}
        />
      </View>

      {/* Left-edge summon strip: right-fling here calls MVE up. */}
      <GestureDetector gesture={summonGesture}>
        <View style={styles.summonEdge} pointerEvents="box-only" />
      </GestureDetector>

      <View style={styles.taskbarDock}>
        <Taskbar
          startActive={startOpen}
          pinned={pinnedApps}
          colors={state.taskbarColors}
          startIconUri={state.startIcon || undefined}
          intentCount={openIntents.length}
          onStartPress={() => setStartOpen(v => !v)}
          onMvePress={summonMve}
          onClockPress={() => {
            refreshNotifications();
            refreshWidgets();
            setFlyoutOpen(true);
          }}
          onLaunch={launch}
          onPinMenu={taskbarPinMenu}
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
        onOpenMve={() => {
          setStartOpen(false);
          summonMve();
        }}
        onOpenMveSettings={() => {
          setStartOpen(false);
          setMveSettingsOpen(true);
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
        onRestore={pkg =>
          update(s => restoreFromRecycle(s, pkg, grid.cols, grid.rows))
        }
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
        onAddWidget={() => {
          setPersonalizeOpen(false);
          addWidget();
        }}
        onRunSetup={() => {
          setPersonalizeOpen(false);
          setTourOpen(true);
        }}
      />

      {/* MVE engine page: chat + Linux sandbox terminal. */}
      <Modal
        visible={mveOpen}
        animationType="slide"
        onRequestClose={() => setMveOpen(false)}
      >
        <MveScreen onClose={() => setMveOpen(false)} />
      </Modal>

      {/* MVE engine settings (providers, sandbox, daemon). */}
      <Modal
        visible={mveSettingsOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setMveSettingsOpen(false)}
      >
        <View style={styles.mveModalOverlay}>
          <MveSettingsScreen onClose={() => setMveSettingsOpen(false)} />
        </View>
      </Modal>

      <ContextMenu
        visible={menu != null}
        title={menu?.title}
        items={menu?.items ?? []}
        onClose={() => setMenu(null)}
      />

      <Tour
        visible={tourOpen}
        isDefault={isDefault}
        notifAccess={notifAccess}
        hasKey={hasKey}
        onClose={finishTour}
        onSetDefault={requestDefaultLauncher}
        onBattery={openBatteryOptimization}
        onNotifAccess={openNotificationAccessSettings}
        onAddKey={() => {
          finishTour();
          setMveSettingsOpen(true);
        }}
      />
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: 'transparent' },
  center: { alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1, paddingTop: STATUS_BAR, paddingBottom: TASKBAR_H },
  taskbarDock: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  summonEdge: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: TASKBAR_H,
    width: 16,
  },
  mveModalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 16,
  },
});

export default App;
