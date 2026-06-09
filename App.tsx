import React, {useState, useCallback, useRef, useEffect} from 'react';
import {
  StatusBar,
  StyleSheet,
  View,
  Text,
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
  Directions,
} from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import LinearGradient from 'react-native-linear-gradient';

// Context-first registry: open intents are surfaced on the taskbar.
import {ActionRegistry, Intent} from './src/mve/ActionRegistry';

// Import our glass components
import {
  GlassPanel,
  GlassButton,
  StartOrb,
  WindowFrame,
  Taskbar,
} from './src/components/glass';

// Import animation hooks
import {
  useStartMenuAnimation,
  useGlassShimmer,
  useButtonHover,
} from './src/animations';

// MVE engine pages (chat + Linux sandbox) and settings
import MveScreen from './src/mve/MveScreen';
import MveSettingsScreen from './src/mve/MveSettingsScreen';

const {width: SCREEN_WIDTH, height: SCREEN_HEIGHT} = Dimensions.get('window');

// Desktop Icon Component
const DesktopIcon: React.FC<{
  label: string;
  icon: string;
  onPress: () => void;
}> = ({label, icon, onPress}) => {
  const {scale, animatedStyle, onPressIn, onPressOut} = useButtonHover();

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}>
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
  onOpenMve: () => void;
}> = ({visible, onClose, onOpenMve}) => {
  const {animatedStyle} = useStartMenuAnimation(visible);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}>
      <TouchableOpacity style={styles.modalOverlay} onPress={onClose}>
        <Animated.View style={[styles.startMenu, animatedStyle]}>
          <GlassPanel width={280} height={400} borderRadius={8}>
            <View style={styles.startMenuContent}>
              <Text style={styles.startMenuTitle}>Start</Text>
              <View style={styles.menuDivider} />

              <GlassButton
                title="MVE"
                onPress={onOpenMve}
                width={240}
              />
              <GlassButton
                title="All Programs"
                onPress={() => {}}
                width={240}
              />
              <GlassButton
                title="Settings"
                onPress={() => {}}
                width={240}
              />
              <GlassButton
                title="Search"
                onPress={() => {}}
                width={240}
              />
              <GlassButton
                title="Run"
                onPress={() => {}}
                width={240}
              />
              
              <View style={styles.menuDivider} />
              
              <GlassButton
                title="Shut Down"
                onPress={() => {}}
                width={240}
                variant="danger"
              />
            </View>
          </GlassPanel>
        </Animated.View>
      </TouchableOpacity>
    </Modal>
  );
};

// Main App Component
const App: React.FC = () => {
  const [startMenuOpen, setStartMenuOpen] = useState(false);
  const [openWindows, setOpenWindows] = useState<string[]>([]);
  const [mveSettingsOpen, setMveSettingsOpen] = useState(false);
  const pagerRef = useRef<ScrollView>(null);

  const toggleStartMenu = useCallback(() => {
    setStartMenuOpen(prev => !prev);
  }, []);

  const openWindow = useCallback((title: string) => {
    setOpenWindows(prev => [...prev, title]);
  }, []);

  const closeWindow = useCallback((title: string) => {
    setOpenWindows(prev => prev.filter(w => w !== title));
  }, []);

  // Summon MVE: snap the pager to the MVE page (left of home).
  const summonMve = useCallback(() => {
    pagerRef.current?.scrollTo({x: 0, animated: true});
  }, []);

  // Open intents drive the taskbar MVE pill (context-first surfacing).
  const [openIntents, setOpenIntents] = useState<Intent[]>([]);
  useEffect(
    () => ActionRegistry.subscribe(() => setOpenIntents(ActionRegistry.open())),
    [],
  );

  // System gesture: a right-fling from the left edge calls MVE up from anywhere.
  const summonGesture = Gesture.Fling()
    .direction(Directions.RIGHT)
    .onEnd(() => {
      runOnJS(summonMve)();
    });

  return (
    <GestureHandlerRootView style={styles.root}>
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1a3a5c" />
      
      {/* Vista Aurora Background */}
      <LinearGradient
        colors={['#2c5aa0', '#3d7ab8', '#1a3a5c', '#0d2137']}
        start={{x: 0, y: 0}}
        end={{x: 1, y: 1}}
        style={StyleSheet.absoluteFill}
      />

      {/* Horizontal pager: MVE page sits to the LEFT of the home desktop.
          Starts on the home page; swipe left to reach the MVE engine. */}
      <ScrollView
        ref={pagerRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        style={styles.pager}
        contentOffset={{x: SCREEN_WIDTH, y: 0}}
        onLayout={() =>
          pagerRef.current?.scrollTo({x: SCREEN_WIDTH, animated: false})
        }>
        {/* MVE page — chat + Linux sandbox */}
        <View style={styles.page}>
          <MveScreen />
        </View>

        {/* Home desktop */}
        <View style={styles.page}>
          <View style={styles.desktop}>
            {/* Desktop Icons */}
            <View style={styles.iconGrid}>
          <DesktopIcon
            label="Computer"
            icon="💻"
            onPress={() => openWindow('Computer')}
          />
          <DesktopIcon
            label="Documents"
            icon="📁"
            onPress={() => openWindow('Documents')}
          />
          <DesktopIcon
            label="Pictures"
            icon="🖼️"
            onPress={() => openWindow('Pictures')}
          />
          <DesktopIcon
            label="Music"
            icon="🎵"
            onPress={() => openWindow('Music')}
          />
          <DesktopIcon
            label="Settings"
            icon="⚙️"
            onPress={() => openWindow('Settings')}
          />
          <DesktopIcon
            label="Recycle Bin"
            icon="🗑️"
            onPress={() => openWindow('Recycle Bin')}
          />
        </View>

        {/* Open Windows */}
        {openWindows.map((title, index) => (
          <WindowFrame
            key={`${title}-${index}`}
            title={title}
            width={320}
            height={240}
            initialX={50 + index * 20}
            initialY={50 + index * 20}
            onClose={() => closeWindow(title)}>
            <View style={styles.windowContent}>
              <Text style={styles.windowText}>{title} Content</Text>
            </View>
          </WindowFrame>
        ))}
          </View>
        </View>
      </ScrollView>

      {/* Start Menu */}
      <StartMenu
        visible={startMenuOpen}
        onClose={() => setStartMenuOpen(false)}
        onOpenMve={() => {
          setStartMenuOpen(false);
          setMveSettingsOpen(true);
        }}
      />

      {/* MVE Settings (opened from the start menu) */}
      <Modal
        visible={mveSettingsOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setMveSettingsOpen(false)}>
        <View style={styles.mveModalOverlay}>
          <MveSettingsScreen onClose={() => setMveSettingsOpen(false)} />
        </View>
      </Modal>

      {/* Left-edge summon strip: right-fling here calls MVE up. */}
      <GestureDetector gesture={summonGesture}>
        <View style={styles.summonEdge} pointerEvents="box-only" />
      </GestureDetector>

      {/* Taskbar */}
      <Taskbar
        height={48}
        startOrbComponent={
          <StartOrb
            size={40}
            onPress={toggleStartMenu}
            isActive={startMenuOpen}
          />
        }
        showClock={true}
        openApps={openWindows}
        onAppClick={(app) => console.log('Clicked:', app)}
      />

      {/* MVE intent pill: open-task count, tap to summon MVE. */}
      <TouchableOpacity
        style={styles.mvePill}
        onPress={summonMve}
        activeOpacity={0.8}>
        <Text style={styles.mvePillText}>
          ◎ MVE{openIntents.length ? ` · ${openIntents.length}` : ''}
        </Text>
      </TouchableOpacity>
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
  pager: {
    flex: 1,
  },
  summonEdge: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 48,
    width: 16,
  },
  mvePill: {
    position: 'absolute',
    right: 12,
    bottom: 56,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: 'rgba(120,170,235,0.65)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  mvePillText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  page: {
    width: SCREEN_WIDTH,
  },
  mveModalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 16,
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
});

export default App;
