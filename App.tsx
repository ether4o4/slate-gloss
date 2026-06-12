import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  AppState,
  Dimensions,
  Image,
  type ImageSourcePropType,
  Linking,
  Modal,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
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

import MveSettingsScreen from './src/mve/MveSettingsScreen';
import { MveBridge } from './src/mve/MveBridge';
import { ActionRegistry, type Intent } from './src/mve/ActionRegistry';
import AssistantWall from './src/desktop/AssistantWall';
import Terminal from './src/desktop/Terminal';
import FolderWindow from './src/desktop/FolderWindow';
import ThemePicker from './src/desktop/ThemePicker';
import Calculator from './src/desktop/Calculator';
import Notepad from './src/desktop/Notepad';
import ChatWindow, { type ChatSize } from './src/desktop/ChatWindow';
import RobotSetup, { type RobotPaint } from './src/desktop/RobotSetup';
import WindowFrame from './src/components/glass/WindowFrame';
import { ThemeStore } from './src/theme/themes';
import {
  GOOGLE_APPS,
  MICROSOFT_APPS,
  openPlayStoreSearch,
  openUrl,
} from './src/desktop/storeLinks';

const TOUR_KEY = '@nsos_tour_done';
import {
  getApps,
  isDefaultLauncher,
  launchApp as nativeLaunch,
  openAppInfo,
  uninstallApp,
  clearCache,
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
  resizeDesktopWidget,
  type LauncherState,
} from './src/db/LauncherStore';

const STATUS_BAR = StatusBar.currentHeight ?? 0;
const TASKBAR_H = 64;
const CELL_W = 84;
const CELL_H = 96;
const CLASSIC_COL_W = 88;
const SCREEN_W = Dimensions.get('window').width;

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

// ── Classic desktop icons ──
interface ClassicIconSpec {
  id: string;
  label: string;
  icon: string;
  /** Custom image icon (wins over the emoji glyph when set). */
  image?: ImageSourcePropType;
  /** Links an icon to its app on the Play Store (long-press → App settings). */
  pkg?: string;
  /** Optional red letters drawn over the icon glyph (e.g. "NS" on a folder). */
  badge?: string;
}

const ICONS = {
  internet: require('./src/assets/icons/internet.png'),
  recycle: require('./src/assets/icons/recycle.png'),
  cmd: require('./src/assets/icons/cmd.png'),
  settings: require('./src/assets/icons/settings.png'),
  googleFolder: require('./src/assets/icons/google-folder.png'),
  microsoftFolder: require('./src/assets/icons/microsoft-folder.png'),
};

const ROBOT_PAINT_KEY = '@nsos_robot_paint';

// The final desktop set, one column down the far left: globe (Internet —
// opens whatever browser the user has set as their Android default), Recycle
// Bin, cmd, Settings, and the Google / Microsoft app folders. Calculator and
// Notepad windows stay reachable from the Start menu.
const CLASSIC_ICONS: ClassicIconSpec[] = [
  { id: 'internet', label: 'Internet', icon: '🌐', image: ICONS.internet },
  { id: 'recycle-bin', label: 'Recycle Bin', icon: '🗑️', image: ICONS.recycle },
  { id: 'cmd', label: 'cmd', icon: '＞_', image: ICONS.cmd },
  { id: 'settings', label: 'Settings', icon: '⚙️', image: ICONS.settings },
  { id: 'google', label: 'Google', icon: '📂', image: ICONS.googleFolder },
  { id: 'microsoft', label: 'Microsoft', icon: '🪟', image: ICONS.microsoftFolder },
];

const ClassicIcon: React.FC<{
  spec: ClassicIconSpec;
  onPress: () => void;
  onLongPress: () => void;
}> = ({ spec, onPress, onLongPress }) => (
  <TouchableOpacity
    activeOpacity={0.8}
    onPress={onPress}
    onLongPress={onLongPress}
    delayLongPress={420}
    style={styles.classicIcon}
  >
    {spec.image ? (
      <View style={styles.classicBareBox}>
        <Image source={spec.image} style={styles.classicImg} resizeMode="contain" />
        {spec.badge ? (
          <View style={styles.classicBadgeWrap} pointerEvents="none">
            <Text style={styles.classicBadge}>{spec.badge}</Text>
          </View>
        ) : null}
      </View>
    ) : (
      <View style={styles.classicBox}>
        <Text style={styles.classicGlyph}>{spec.icon}</Text>
        {spec.badge ? (
          <View style={styles.classicBadgeWrap} pointerEvents="none">
            <Text style={styles.classicBadge}>{spec.badge}</Text>
          </View>
        ) : null}
      </View>
    )}
    <Text style={styles.classicLabel} numberOfLines={1}>
      {spec.label}
    </Text>
  </TouchableOpacity>
);

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

  // Robot paint: loaded from storage; first run shows the paint setup once the
  // tour is out of the way. 'unset' = storage not read yet.
  const [robotPaint, setRobotPaint] = useState<string | null | 'unset'>('unset');
  const [robotSetupOpen, setRobotSetupOpen] = useState(false);
  useEffect(() => {
    AsyncStorage.getItem(ROBOT_PAINT_KEY).then(v => {
      if (v == null) {
        setRobotPaint(null);
        setRobotSetupOpen(true);
      } else {
        setRobotPaint(v === 'classic' ? null : v);
      }
    });
  }, []);
  const finishRobotSetup = useCallback((paint: RobotPaint) => {
    AsyncStorage.setItem(ROBOT_PAINT_KEY, paint.color ?? 'classic');
    setRobotPaint(paint.color);
    setRobotSetupOpen(false);
  }, []);

  // ── Classic shell: windows, browser picker, live theme ──
  const [openWindows, setOpenWindows] = useState<string[]>([]);
  // Persistent floating chat: closed until first summon, then min/half/full.
  const [chatOpen, setChatOpen] = useState(false);
  const [chatSize, setChatSize] = useState<ChatSize>('half');
  const [theme, setTheme] = useState(() => ThemeStore.theme());
  useEffect(() => ThemeStore.subscribe(() => setTheme(ThemeStore.theme())), []);

  const pagerRef = useRef<ScrollView>(null);

  // Open intents drive the taskbar MVE badge (context-first surfacing).
  const [openIntents, setOpenIntents] = useState<Intent[]>([]);
  useEffect(
    () => ActionRegistry.subscribe(() => setOpenIntents(ActionRegistry.open())),
    [],
  );

  // Summon MVE: snap the pager to the wall page (left of home).
  const summonMve = useCallback(() => {
    pagerRef.current?.scrollTo({ x: 0, animated: true });
  }, []);

  // Taskbar chat button: open the floating chat, or restore it if minimized;
  // pressing it while visible tucks it away (minimize) instead of closing.
  const toggleChat = useCallback(() => {
    if (!chatOpen) {
      setChatOpen(true);
      setChatSize('half');
      return;
    }
    setChatSize(prev => (prev === 'min' ? 'half' : 'min'));
  }, [chatOpen]);

  // System gesture: a right-fling from the left edge calls MVE up from anywhere.
  const summonGesture = Gesture.Fling()
    .direction(Directions.RIGHT)
    .onEnd(() => {
      runOnJS(summonMve)();
    });

  const grid = useMemo(() => {
    const win = Dimensions.get('window');
    // The classic icon column hugs the far left; the app grid gets the rest.
    const usableW = win.width - 12 - CLASSIC_COL_W;
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

  // ---- classic shell windows --------------------------------------------

  const openWindow = useCallback((title: string) => {
    setOpenWindows(prev => (prev.includes(title) ? prev : [...prev, title]));
  }, []);

  const closeWindow = useCallback((title: string) => {
    setOpenWindows(prev => prev.filter(w => w !== title));
  }, []);

  const onClassicPress = useCallback(
    (spec: ClassicIconSpec) => {
      switch (spec.id) {
        case 'internet':
          // Universal: Android routes this to whatever browser the user has
          // set as their default.
          openUrl('https://www.google.com');
          return;
        case 'recycle-bin':
          setRecycleOpen(true);
          return;
        default:
          // Calculator, Notepad, Google, Microsoft → desktop windows.
          openWindow(spec.label);
      }
    },
    [openWindow],
  );

  // Taskbar device buttons: phone, messages, camera.
  const openPhone = useCallback(() => {
    Linking.sendIntent('android.intent.action.DIAL').catch(() => {
      Linking.openURL('tel:').catch(() => {});
    });
  }, []);
  const openMessages = useCallback(() => {
    Linking.openURL('sms:').catch(() => {});
  }, []);
  const openCamera = useCallback(() => {
    Linking.sendIntent('android.media.action.STILL_IMAGE_CAMERA').catch(() =>
      openPlayStoreSearch('camera'),
    );
  }, []);

  const doClearCache = useCallback(async () => {
    const freed = await clearCache();
    const mb = (freed / (1024 * 1024)).toFixed(1);
    Alert.alert('Cache cleared', `Freed ${mb} MB.`);
  }, []);

  const classicMenu = useCallback(
    (spec: ClassicIconSpec) => {
      setMenu({
        title: spec.label,
        items: [
          { label: 'Open', icon: '▶', onPress: () => onClassicPress(spec) },
          {
            label: 'Themes',
            icon: '🖌️',
            onPress: () => openWindow('Settings'),
          },
        ],
      });
    },
    [onClassicPress, openWindow],
  );

  const renderWindowContent = (title: string) => {
    switch (title) {
      case 'cmd':
        return <Terminal />;
      case 'Calculator':
        return <Calculator />;
      case 'Notepad':
        return (
          <Notepad
            initial={state?.notes ?? ''}
            onChange={text => update(s => setNotes(s, text))}
          />
        );
      case 'Google':
        return <FolderWindow apps={GOOGLE_APPS} />;
      case 'Microsoft':
        return <FolderWindow apps={MICROSOFT_APPS} />;
      case 'Settings':
        return <ThemePicker />;
      default:
        return (
          <View style={styles.windowContent}>
            <Text style={styles.windowText}>{title} Content</Text>
          </View>
        );
    }
  };

  const windowSize = (title: string): { width: number; height: number } => {
    switch (title) {
      case 'cmd':
        return { width: Math.min(SCREEN_W - 24, 380), height: 440 };
      case 'Calculator':
        return { width: 300, height: 420 };
      case 'Notepad':
        return { width: Math.min(SCREEN_W - 24, 380), height: 420 };
      case 'Settings':
        return { width: 330, height: 430 };
      case 'Google':
      case 'Microsoft':
        return { width: 330, height: 360 };
      default:
        return { width: 320, height: 240 };
    }
  };

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
        {
          label: 'Themes',
          icon: '🖌️',
          onPress: () => openWindow('Settings'),
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

  const resizeWidget = useCallback(
    (id: number, w: number, h: number) => {
      update(s => resizeDesktopWidget(s, id, w, h));
    },
    [update],
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
      {/* Theme-driven backdrop. The default "My Wallpaper" theme is a
          translucent vignette, so the system wallpaper shows through. */}
      <LinearGradient
        colors={theme.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      {/* Horizontal pager: the MVE wall (news feed + assistant) sits to the
          LEFT of the home desktop. Starts on home; swipe right to reach it. */}
      <ScrollView
        ref={pagerRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        style={styles.pager}
        contentOffset={{ x: SCREEN_W, y: 0 }}
        onLayout={() =>
          pagerRef.current?.scrollTo({ x: SCREEN_W, animated: false })
        }
      >
        {/* MVE page — news feed + NeverSoft Service Assistant */}
        <View style={[styles.page, styles.wallPage]}>
          <AssistantWall />
        </View>

        {/* Home desktop */}
        <View style={[styles.page, styles.body, styles.homeRow]}>
          {/* Classic shell icons: a column hugging the far left, Internet on
              top, the rest in order beneath it — the basic generic PC way. */}
          <View style={styles.classicCol}>
            {CLASSIC_ICONS.map(spec => (
              <ClassicIcon
                key={spec.id}
                spec={spec}
                onPress={() => onClassicPress(spec)}
                onLongPress={() => classicMenu(spec)}
              />
            ))}
          </View>

          <View style={styles.desktopArea}>
            <Desktop
              apps={appsByPkg}
              icons={state.desktop}
              widgets={state.desktopWidgets}
              cellWidth={CELL_W}
              cellHeight={CELL_H}
              cols={grid.cols}
              rows={grid.rows}
              onLaunch={launch}
              onIconMenu={desktopIconMenu}
              onMoveIcon={(pkg, col, row) =>
                update(s => moveDesktopIcon(s, pkg, col, row))
              }
              onMoveWidget={moveWidget}
              onResizeWidget={resizeWidget}
              onRemoveWidget={removeWidget}
              onEmptyMenu={emptyDesktopMenu}
            />
          </View>

          {/* Classic windows (cmd terminal, folders, theme settings) */}
          {openWindows.map((title, index) => {
            const size = windowSize(title);
            return (
              <WindowFrame
                key={title}
                title={title}
                width={size.width}
                height={size.height}
                x={24 + index * 20}
                y={40 + index * 20}
                resizable
                onClose={() => closeWindow(title)}
              >
                {renderWindowContent(title)}
              </WindowFrame>
            );
          })}
        </View>
      </ScrollView>

      {/* Left-edge summon strip: right-fling here calls MVE up. */}
      <GestureDetector gesture={summonGesture}>
        <View style={styles.summonEdge} pointerEvents="box-only" />
      </GestureDetector>

      {/* Persistent floating chat — lives above the desktop, never covers
          the taskbar, survives navigation (state is module-level in MVE). */}
      {chatOpen && (
        <ChatWindow
          size={chatSize}
          taskbarH={TASKBAR_H}
          statusBarH={STATUS_BAR}
          assistantName={ThemeStore.get().assistantName}
          onSize={setChatSize}
          onClose={() => setChatOpen(false)}
        />
      )}

      <View style={styles.taskbarDock}>
        <Taskbar
          startActive={startOpen}
          pinned={pinnedApps}
          colors={state.taskbarColors}
          startIconUri={state.startIcon || undefined}
          intentCount={openIntents.length}
          chatActive={chatOpen && chatSize !== 'min'}
          robotTint={robotPaint === 'unset' ? null : robotPaint}
          onStartPress={() => setStartOpen(v => !v)}
          onChatPress={toggleChat}
          onPhonePress={openPhone}
          onMessagesPress={openMessages}
          onCameraPress={openCamera}
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
        onOpenCmd={() => {
          setStartOpen(false);
          openWindow('cmd');
        }}
        onOpenCalculator={() => {
          setStartOpen(false);
          openWindow('Calculator');
        }}
        onOpenNotepad={() => {
          setStartOpen(false);
          openWindow('Notepad');
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
        onClearCache={doClearCache}
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

      {/* First-run robot paint (after the tour). */}
      <RobotSetup
        visible={robotSetupOpen && !tourOpen}
        onDone={finishRobotSetup}
      />
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: 'transparent' },
  center: { alignItems: 'center', justifyContent: 'center' },
  pager: { flex: 1 },
  page: { width: SCREEN_W },
  wallPage: {
    paddingTop: STATUS_BAR,
    paddingBottom: TASKBAR_H,
  },
  body: { flex: 1, paddingTop: STATUS_BAR, paddingBottom: TASKBAR_H },
  desktopArea: { flex: 1 },
  taskbarDock: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  summonEdge: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: TASKBAR_H,
    width: 16,
  },
  homeRow: { flexDirection: 'row' },
  classicCol: {
    width: CLASSIC_COL_W,
    paddingTop: 8,
    paddingLeft: 6,
    gap: 14,
    alignItems: 'center',
  },
  classicIcon: { width: 78, alignItems: 'center', gap: 3 },
  classicBox: {
    width: 62,
    height: 62,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  classicGlyph: { fontSize: 30 },
  // Custom image icons render bare — no box, background, or border.
  classicBareBox: {
    width: 62,
    height: 62,
    alignItems: 'center',
    justifyContent: 'center',
  },
  classicImg: { width: 62, height: 62 },
  classicBadgeWrap: {
    position: 'absolute',
    top: 2,
    right: 2,
  },
  classicBadge: {
    color: '#e2574c',
    fontSize: 10,
    fontWeight: '900',
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  classicLabel: {
    fontSize: 11,
    color: '#ffffff',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    textAlign: 'center',
  },
  windowContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  windowText: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
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
