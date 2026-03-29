import React, {useState, useCallback} from 'react';
import {
  StatusBar,
  StyleSheet,
  View,
  Text,
  SafeAreaView,
  Dimensions,
  TouchableOpacity,
  Modal,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
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
import {
  useStartMenuAnimation,
  useGlassShimmer,
  useButtonHover,
} from './src/animations';

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
}> = ({visible, onClose}) => {
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

  const toggleStartMenu = useCallback(() => {
    setStartMenuOpen(prev => !prev);
  }, []);

  const openWindow = useCallback((title: string) => {
    setOpenWindows(prev => [...prev, title]);
  }, []);

  const closeWindow = useCallback((title: string) => {
    setOpenWindows(prev => prev.filter(w => w !== title));
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1a3a5c" />
      
      {/* Vista Aurora Background */}
      <LinearGradient
        colors={['#2c5aa0', '#3d7ab8', '#1a3a5c', '#0d2137']}
        start={{x: 0, y: 0}}
        end={{x: 1, y: 1}}
        style={StyleSheet.absoluteFill}
      />

      {/* Desktop Area */}
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

      {/* Start Menu */}
      <StartMenu
        visible={startMenuOpen}
        onClose={() => setStartMenuOpen(false)}
      />

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
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
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
