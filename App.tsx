import React, {useState, useCallback, useEffect} from 'react';
import {
  StatusBar,
  StyleSheet,
  View,
  Text,
  TextInput,
  SafeAreaView,
  ScrollView,
  Dimensions,
  TouchableOpacity,
  Modal,
} from 'react-native';
import {
  GestureHandlerRootView,
  GestureDetector,
  Gesture,
} from 'react-native-gesture-handler';
import {runOnJS} from 'react-native-reanimated';
import Animated from 'react-native-reanimated';
import LinearGradient from 'react-native-linear-gradient';

// Import our glass components
import {
  GlassPanel,
  GlassButton,
  StartOrb,
  WindowFrame,
  Taskbar,
} from './src/components/glass';

// Import animation hooks
import {useButtonHover} from './src/animations';

// NeverSoft desktop shell: themes, widgets, icons, popups
import {ThemeStore} from './src/theme/themes';
import GlassMenu, {MenuItem} from './src/desktop/GlassMenu';
import DesktopWidget, {WidgetSpec} from './src/desktop/DesktopWidget';
import NotificationCenter, {QuickswitchBox} from './src/desktop/NotificationCenter';
import Terminal from './src/desktop/Terminal';
import RecycleBin, {BinnedIcon} from './src/desktop/RecycleBin';
import BrowserPicker from './src/desktop/BrowserPicker';
import FolderWindow from './src/desktop/FolderWindow';
import SwarmChatWindow from './src/components/SwarmChatWindow';
import {
  GOOGLE_APPS,
  MICROSOFT_APPS,
  GHOST_KEY_PKG,
  GHOST_KEY_APK_URL,
  openAppOrStore,
  openPlayStore,
  openPlayStoreSearch,
} from './src/desktop/storeLinks';

const {width: SCREEN_WIDTH} = Dimensions.get('window');

// ── Desktop icon model ──
// Classic computer-styled shell icons. `pkg` links an icon to its app on the
// Play Store (used by "App settings" on long-press).
interface IconSpec {
  id: string;
  label: string;
  icon: string;
  pkg?: string;
}

const DEFAULT_ICONS: IconSpec[] = [
  {id: 'computer', label: 'Computer', icon: '💻'},
  {id: 'documents', label: 'Documents', icon: '📁'},
  {id: 'pictures', label: 'Pictures', icon: '🖼️'},
  {id: 'music', label: 'Music', icon: '🎵'},
  {id: 'ghost-key', label: 'Ghost Key', icon: '🗝️', pkg: GHOST_KEY_PKG},
  {id: 'file-explorer', label: 'File Explorer', icon: '🗂️'},
  {id: 'internet', label: 'Internet', icon: '🌐'},
  {id: 'cmd', label: 'cmd', icon: '＞_'},
  {id: 'google', label: 'Google', icon: '📂'},
  {id: 'microsoft', label: 'Microsoft', icon: '🪟'},
  {id: 'settings', label: 'Settings', icon: '⚙️'},
  {id: 'recycle-bin', label: 'Recycle Bin', icon: '🗑️'},
  {id: 'assistant', label: 'Assistant', icon: '💬'},
];

// Desktop Icon Component
const DesktopIcon: React.FC<{
  label: string;
  icon: string;
  onPress: () => void;
  onLongPress?: () => void;
}> = ({label, icon, onPress, onLongPress}) => {
  const {animatedStyle} = useButtonHover();

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={420}>
      <Animated.View style={[styles.desktopIcon, animatedStyle]}>
        <View style={styles.iconBox}>
          <Text style={styles.iconText}>{icon}</Text>
        </View>
        <Text style={styles.iconLabel}>{label}</Text>
      </Animated.View>
    </TouchableOpacity>
  );
};

// Start Menu Component
const StartMenu: React.FC<{
  visible: boolean;
  onClose: () => void;
  onOpenWindow: (title: string) => void;
}> = ({visible, onClose, onOpenWindow}) => {
  const open = (title: string) => {
    onClose();
    onOpenWindow(title);
  };
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}>
      <TouchableOpacity style={styles.modalOverlay} onPress={onClose}>
        <View style={styles.startMenu}>
          <GlassPanel width={280} height={400} cornerRadius={8}>
            <View style={styles.startMenuContent}>
              <Text style={styles.startMenuTitle}>Start</Text>
              <View style={styles.menuDivider} />

              <GlassButton
                title="Assistant"
                onPress={() => open('Assistant')}
                width={240}
              />
              <GlassButton title="cmd" onPress={() => open('cmd')} width={240} />
              <GlassButton
                title="Personalize"
                onPress={() => open('Settings')}
                width={240}
              />
              <GlassButton
                title="Recycle Bin"
                onPress={() => open('Recycle Bin')}
                width={240}
              />

              <View style={styles.menuDivider} />

              <GlassButton title="Shut Down" onPress={() => {}} width={240} />
            </View>
          </GlassPanel>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

// Small input dialog for naming new desktop folders.
const NameDialog: React.FC<{
  visible: boolean;
  onSubmit: (name: string) => void;
  onClose: () => void;
}> = ({visible, onSubmit, onClose}) => {
  const [name, setName] = useState('');
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.dialogBackdrop}>
        <View style={styles.dialogCard}>
          <Text style={styles.dialogTitle}>New folder</Text>
          <TextInput
            style={styles.dialogInput}
            value={name}
            onChangeText={setName}
            placeholder="Folder name"
            placeholderTextColor="#8aa6c8"
            autoFocus
          />
          <View style={styles.dialogRow}>
            <TouchableOpacity style={styles.dialogBtn} onPress={onClose}>
              <Text style={styles.dialogBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.dialogBtn, styles.dialogBtnPrimary]}
              onPress={() => {
                const clean = name.trim();
                if (clean) {
                  onSubmit(clean);
                  setName('');
                }
              }}>
              <Text style={styles.dialogBtnText}>Create</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// Live clock content for the clock widget.
const ClockWidgetContent: React.FC = () => {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <View style={styles.clockWidget}>
      <Text style={styles.clockWidgetTime}>
        {now.toLocaleTimeString('en-US', {hour: 'numeric', minute: '2-digit'})}
      </Text>
      <Text style={styles.clockWidgetDate}>
        {now.toLocaleDateString('en-US', {weekday: 'short', month: 'short', day: 'numeric'})}
      </Text>
    </View>
  );
};

type WidgetKind = 'clock' | 'quickswitch' | 'notes';

interface DesktopWidgetSpec extends WidgetSpec {
  kind: WidgetKind;
}

let widgetCounter = 1;
let folderCounter = 1;

// Main App Component
const App: React.FC = () => {
  const [startMenuOpen, setStartMenuOpen] = useState(false);
  const [openWindows, setOpenWindows] = useState<string[]>([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const [browserPickerOpen, setBrowserPickerOpen] = useState(false);
  const [icons, setIcons] = useState<IconSpec[]>(DEFAULT_ICONS);
  const [binned, setBinned] = useState<BinnedIcon[]>([]);
  const [widgets, setWidgets] = useState<DesktopWidgetSpec[]>([]);
  const [iconMenu, setIconMenu] = useState<IconSpec | null>(null);
  const [desktopMenuOpen, setDesktopMenuOpen] = useState(false);
  const [folderDialogOpen, setFolderDialogOpen] = useState(false);
  const [theme, setTheme] = useState(() => ThemeStore.theme());

  useEffect(() => ThemeStore.subscribe(() => setTheme(ThemeStore.theme())), []);

  const toggleStartMenu = useCallback(() => {
    setStartMenuOpen(prev => !prev);
  }, []);

  const openWindow = useCallback((title: string) => {
    setOpenWindows(prev => (prev.includes(title) ? prev : [...prev, title]));
  }, []);

  const closeWindow = useCallback((title: string) => {
    setOpenWindows(prev => prev.filter(w => w !== title));
  }, []);

  // Long-press on empty desktop → widgets / new folder / edit background.
  const openDesktopMenu = useCallback(() => setDesktopMenuOpen(true), []);
  const desktopLongPress = Gesture.LongPress()
    .minDuration(450)
    .onStart(() => {
      runOnJS(openDesktopMenu)();
    });

  // ── Icon actions ──
  const onIconPress = useCallback(
    (icon: IconSpec) => {
      switch (icon.id) {
        case 'ghost-key':
          // The legit NeverSoft (Ghost Key) file explorer — launch it if
          // installed, otherwise fetch the real APK.
          openAppOrStore(GHOST_KEY_PKG, GHOST_KEY_APK_URL);
          return;
        case 'file-explorer':
          // Shell icon → straight to file explorers on the Play Store.
          openPlayStoreSearch('file explorer');
          return;
        case 'internet':
          setBrowserPickerOpen(true);
          return;
        default:
          openWindow(icon.label);
      }
    },
    [openWindow],
  );

  const removeIcon = useCallback((icon: IconSpec) => {
    setIcons(prev => prev.filter(i => i.id !== icon.id));
    setBinned(prev => [...prev, {id: icon.id, label: icon.label, icon: icon.icon}]);
  }, []);

  const restoreIcon = useCallback(
    (id: string) => {
      setBinned(prev => prev.filter(b => b.id !== id));
      const original = DEFAULT_ICONS.find(i => i.id === id);
      setIcons(prev => {
        const fallback = binned.find(b => b.id === id);
        const spec =
          original ??
          (fallback ? {id: fallback.id, label: fallback.label, icon: fallback.icon} : null);
        return spec && !prev.some(i => i.id === id) ? [...prev, spec] : prev;
      });
    },
    [binned],
  );

  // ── Widgets ──
  const addWidget = useCallback((kind: WidgetKind) => {
    const id = `widget-${widgetCounter++}`;
    const base = {x: 24 + widgets.length * 24, y: 120 + widgets.length * 24};
    const spec: DesktopWidgetSpec =
      kind === 'clock'
        ? {id, kind, title: 'Clock', width: 170, height: 110, ...base}
        : kind === 'quickswitch'
          ? {id, kind, title: 'Aesthetic Quickswitch', width: 280, height: 320, ...base}
          : {id, kind, title: 'Notes', width: 220, height: 160, ...base};
    setWidgets(prev => [...prev, spec]);
  }, [widgets.length]);

  const removeWidget = useCallback((id: string) => {
    setWidgets(prev => prev.filter(w => w.id !== id));
  }, []);

  const newFolder = useCallback((name: string) => {
    setFolderDialogOpen(false);
    setIcons(prev => [
      ...prev,
      {id: `folder-${folderCounter++}`, label: name, icon: '📁'},
    ]);
  }, []);

  // ── Menus ──
  const desktopMenuItems: MenuItem[] = [
    {label: 'Add widget — Clock', icon: '🕐', onPress: () => addWidget('clock')},
    {label: 'Add widget — Quickswitch', icon: '🎨', onPress: () => addWidget('quickswitch')},
    {label: 'Add widget — Notes', icon: '⬜', onPress: () => addWidget('notes')},
    {label: 'New folder', icon: '📁', onPress: () => setFolderDialogOpen(true)},
    {label: 'Edit background', icon: '🖼️', onPress: () => openWindow('Settings')},
  ];

  const iconMenuItems: MenuItem[] = iconMenu
    ? [
        {
          label: 'App settings',
          icon: '⚙️',
          onPress: () =>
            iconMenu.pkg ? openPlayStore(iconMenu.pkg) : openWindow('Settings'),
        },
        {
          label: 'Remove from desktop',
          icon: '🗑️',
          danger: true,
          onPress: () => removeIcon(iconMenu),
        },
      ]
    : [];

  // ── Window content router ──
  const renderWindowContent = (title: string) => {
    switch (title) {
      case 'Recycle Bin':
        return (
          <RecycleBin
            items={binned}
            onRestore={restoreIcon}
            onEmpty={() => setBinned([])}
          />
        );
      case 'cmd':
        return <Terminal />;
      case 'Assistant':
        return <SwarmChatWindow onClose={() => closeWindow('Assistant')} />;
      case 'Google':
        return <FolderWindow apps={GOOGLE_APPS} />;
      case 'Microsoft':
        return <FolderWindow apps={MICROSOFT_APPS} />;
      case 'Settings':
        return (
          <ScrollView contentContainerStyle={styles.settingsContent}>
            <QuickswitchBox />
          </ScrollView>
        );
      default: {
        const folder = icons.find(i => i.label === title && i.id.startsWith('folder-'));
        if (folder) {
          return (
            <FolderWindow
              apps={[]}
              emptyHint="Empty folder — shell icons you add will appear here."
            />
          );
        }
        return (
          <View style={styles.windowContent}>
            <Text style={styles.windowText}>{title} Content</Text>
          </View>
        );
      }
    }
  };

  const windowSize = (title: string): {width: number; height: number} => {
    switch (title) {
      case 'cmd':
        return {width: Math.min(SCREEN_WIDTH - 24, 380), height: 440};
      case 'Assistant':
        return {width: Math.min(SCREEN_WIDTH - 24, 380), height: 480};
      case 'Recycle Bin':
        return {width: 330, height: 380};
      case 'Settings':
        return {width: 330, height: 430};
      case 'Google':
      case 'Microsoft':
        return {width: 330, height: 320};
      default:
        return {width: 320, height: 240};
    }
  };

  return (
    <GestureHandlerRootView style={styles.root}>
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={theme.gradient[2]} />

      {/* Themed Aero background — switches live with the design catalog */}
      <LinearGradient
        colors={theme.gradient}
        start={{x: 0, y: 0}}
        end={{x: 1, y: 1}}
        style={StyleSheet.absoluteFill}
      />

      {/* Desktop Area */}
      <View style={styles.desktop}>
        {/* Long-press surface for the empty desktop (behind the icons) */}
        <GestureDetector gesture={desktopLongPress}>
          <View style={StyleSheet.absoluteFill} />
        </GestureDetector>

        {/* Desktop Icons */}
        <View style={styles.iconGrid}>
          {icons.map(icon => (
            <DesktopIcon
              key={icon.id}
              label={icon.label}
              icon={icon.icon}
              onPress={() => onIconPress(icon)}
              onLongPress={() => setIconMenu(icon)}
            />
          ))}
        </View>

        {/* Widgets layer */}
        {widgets.map(w => (
          <DesktopWidget key={w.id} spec={w} onRemove={removeWidget}>
            {w.kind === 'clock' ? (
              <ClockWidgetContent />
            ) : w.kind === 'quickswitch' ? (
              <ScrollView contentContainerStyle={styles.widgetScroll}>
                <QuickswitchBox />
              </ScrollView>
            ) : (
              <TextInput
                style={styles.notesInput}
                multiline
                placeholder="Type here…"
                placeholderTextColor="rgba(255,255,255,0.45)"
              />
            )}
          </DesktopWidget>
        ))}

        {/* Open Windows */}
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
              onClose={() => closeWindow(title)}>
              {renderWindowContent(title)}
            </WindowFrame>
          );
        })}
      </View>

      {/* Start Menu */}
      <StartMenu
        visible={startMenuOpen}
        onClose={() => setStartMenuOpen(false)}
        onOpenWindow={openWindow}
      />

      {/* Taskbar — clock opens the notification/calendar popup */}
      <Taskbar
        height={48}
        startOrbComponent={<StartOrb size={40} onPress={toggleStartMenu} />}
        showClock={true}
        onClockPress={() => setNotifOpen(true)}
      />

      {/* Popups */}
      <NotificationCenter visible={notifOpen} onClose={() => setNotifOpen(false)} />
      <BrowserPicker
        visible={browserPickerOpen}
        onClose={() => setBrowserPickerOpen(false)}
      />
      <GlassMenu
        visible={desktopMenuOpen}
        title="Desktop"
        items={desktopMenuItems}
        onClose={() => setDesktopMenuOpen(false)}
      />
      <GlassMenu
        visible={iconMenu != null}
        title={iconMenu?.label}
        items={iconMenuItems}
        onClose={() => setIconMenu(null)}
      />
      <NameDialog
        visible={folderDialogOpen}
        onSubmit={newFolder}
        onClose={() => setFolderDialogOpen(false)}
      />
    </SafeAreaView>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  desktop: {
    flex: 1,
    padding: 16,
    paddingBottom: 64, // Space for taskbar
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 24,
  },
  desktopIcon: {
    width: 72,
    alignItems: 'center',
    gap: 4,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  iconText: {
    fontSize: 24,
    color: '#dffbe0',
    fontWeight: '700',
  },
  iconLabel: {
    fontSize: 11,
    color: 'white',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: {width: 0, height: 1},
    textShadowRadius: 2,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingBottom: 56,
    paddingLeft: 8,
  },
  startMenu: {
    width: 280,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 8},
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 16,
  },
  startMenuContent: {
    padding: 12,
    gap: 8,
  },
  startMenuTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
    paddingHorizontal: 8,
    paddingBottom: 8,
  },
  menuDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginVertical: 4,
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
  settingsContent: {
    padding: 12,
  },
  widgetScroll: {
    padding: 6,
  },
  notesInput: {
    flex: 1,
    color: '#ffffff',
    fontSize: 13,
    padding: 8,
    textAlignVertical: 'top',
  },
  clockWidget: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clockWidgetTime: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: '300',
    textShadowColor: 'rgba(0,0,0,0.45)',
    textShadowOffset: {width: 0, height: 1},
    textShadowRadius: 3,
  },
  clockWidgetDate: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 12,
  },
  dialogBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  dialogCard: {
    width: '100%',
    maxWidth: 320,
    borderRadius: 12,
    backgroundColor: 'rgba(28,42,66,0.96)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
    padding: 16,
    gap: 12,
  },
  dialogTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  dialogInput: {
    color: '#ffffff',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
  },
  dialogRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  dialogBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  dialogBtnPrimary: {
    backgroundColor: 'rgba(120,170,235,0.55)',
  },
  dialogBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
});

export default App;
