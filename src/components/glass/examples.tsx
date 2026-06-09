/**
 * Windows Vista Aero Glassmorphism - Usage Examples
 * 
 * This file demonstrates how to use all the glass components in your React Native app.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Dimensions,
  Image,
} from 'react-native';
import {
  GlassPanel,
  GlassButton,
  StartOrb,
  WindowFrame,
  Taskbar,
} from './index';

const { width, height } = Dimensions.get('window');

// ============================================
// Example 1: Basic Glass Panel
// ============================================
export const GlassPanelExample = () => {
  return (
    <View style={styles.exampleContainer}>
      <GlassPanel
        width={300}
        height={200}
        cornerRadius={12}
        blurRadius={25}
        opacity={0.9}
      >
        <Text style={styles.panelTitle}>Glass Panel</Text>
        <Text style={styles.panelText}>
          This is a translucent glass panel with blur effects,
          inner glow, and border highlights.
        </Text>
      </GlassPanel>
    </View>
  );
};

// ============================================
// Example 2: Glass Button Variants
// ============================================
export const GlassButtonExample = () => {
  return (
    <View style={styles.exampleContainer}>
      <View style={styles.buttonRow}>
        <GlassButton
          title="Primary"
          onPress={() => console.log('Primary pressed')}
          width={120}
        />
        
        <GlassButton
          title="Disabled"
          onPress={() => {}}
          disabled
          width={120}
          style={{ marginLeft: 12 }}
        />
      </View>
      
      <GlassButton
        title="Large Button"
        onPress={() => console.log('Large pressed')}
        width={252}
        height={50}
        style={{ marginTop: 12 }}
      />
    </View>
  );
};

// ============================================
// Example 3: Start Orb with Animation
// ============================================
export const StartOrbExample = () => {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <View style={styles.exampleContainer}>
      <StartOrb
        size={60}
        onPress={() => setMenuOpen(!menuOpen)}
        onLongPress={() => console.log('Long press!')}
        pulseOnIdle={!menuOpen}
      />
      
      {menuOpen && (
        <GlassPanel
          width={200}
          height={150}
          style={styles.startMenu}
        >
          <Text style={styles.menuText}>Start Menu</Text>
          <GlassButton
            title="Close"
            onPress={() => setMenuOpen(false)}
            width={168}
          />
        </GlassPanel>
      )}
    </View>
  );
};

// ============================================
// Example 4: Draggable Window Frame
// ============================================
export const WindowFrameExample = () => {
  const [isMaximized, setIsMaximized] = useState(false);
  const [isClosed, setIsClosed] = useState(false);

  if (isClosed) {
    return (
      <View style={styles.exampleContainer}>
        <GlassButton
          title="Restore Window"
          onPress={() => setIsClosed(false)}
          width={200}
        />
      </View>
    );
  }

  return (
    <View style={styles.windowContainer}>
      <WindowFrame
        title="My Application"
        width={isMaximized ? width : 350}
        height={isMaximized ? height - 100 : 250}
        x={isMaximized ? 0 : 20}
        y={isMaximized ? 20 : 50}
        isMaximized={isMaximized}
        onClose={() => setIsClosed(true)}
        onMinimize={() => console.log('Minimized')}
        onMaximize={() => setIsMaximized(true)}
        onRestore={() => setIsMaximized(false)}
        draggable={!isMaximized}
      >
        <View style={styles.windowContent}>
          <Text style={styles.windowText}>
            This is a draggable window with a glass title bar.
          </Text>
          
          <GlassButton
            title="Action"
            onPress={() => console.log('Action!')}
            width={120}
            style={{ marginTop: 20 }}
          />
        </View>
      </WindowFrame>
    </View>
  );
};

// ============================================
// Example 5: Full Taskbar with Start Menu
// ============================================
export const TaskbarExample = () => {
  const [startMenuOpen, setStartMenuOpen] = useState(false);
  const [activeWindow, setActiveWindow] = useState('app1');

  const renderWindowIcon = (color: string) => (
    <View style={[styles.windowIcon, { backgroundColor: color }]} />
  );

  return (
    <SafeAreaView style={styles.fullScreenContainer}>
      {/* Desktop background simulation */}
      <View style={styles.desktop}>
        <Text style={styles.desktopText}>Desktop</Text>
      </View>

      {/* Start Menu Overlay */}
      {startMenuOpen && (
        <View style={styles.startMenuOverlay}>
          <GlassPanel
            width={280}
            height={400}
            cornerRadius={8}
            style={styles.startMenuPanel}
          >
            <Text style={styles.startMenuTitle}>Windows Vista</Text>
            
            <View style={styles.menuItems}>
              {['Documents', 'Pictures', 'Music', 'Computer', 'Control Panel'].map((item) => (
                <GlassButton
                  key={item}
                  title={item}
                  onPress={() => console.log(item)}
                  width={248}
                  style={{ marginBottom: 8 }}
                />
              ))}
            </View>
          </GlassPanel>
        </View>
      )}

      {/* Taskbar */}
      <Taskbar
        height={42}
        startOrbComponent={
          <StartOrb
            size={44}
            onPress={() => setStartMenuOpen(!startMenuOpen)}
            pulseOnIdle={!startMenuOpen}
          />
        }
        quickLaunchItems={[
          renderWindowIcon('#4a90d9'),
          renderWindowIcon('#5eb8a2'),
          renderWindowIcon('#d94a4a'),
        ]}
        windowButtons={[
          <View
            key="app1"
            style={[
              styles.taskbarWindowButton,
              activeWindow === 'app1' && styles.activeWindowButton,
            ]}
            onTouchEnd={() => setActiveWindow('app1')}
          >
            {renderWindowIcon('#4a90d9')}
          </View>,
          <View
            key="app2"
            style={[
              styles.taskbarWindowButton,
              activeWindow === 'app2' && styles.activeWindowButton,
            ]}
            onTouchEnd={() => setActiveWindow('app2')}
          >
            {renderWindowIcon('#5eb8a2')}
          </View>,
        ]}
        showClock={true}
        clockFormat="12h"
      />
    </SafeAreaView>
  );
};

// ============================================
// Example 6: Complete Vista Desktop
// ============================================
export const CompleteVistaDesktop = () => {
  const [windows, setWindows] = useState([
    { id: '1', title: 'Welcome', x: 50, y: 100, width: 300, height: 200 },
    { id: '2', title: 'Documents', x: 100, y: 150, width: 350, height: 250 },
  ]);
  const [startMenuOpen, setStartMenuOpen] = useState(false);
  const [activeWindowId, setActiveWindowId] = useState('1');

  const bringToFront = (id: string) => {
    setActiveWindowId(id);
  };

  const closeWindow = (id: string) => {
    setWindows(windows.filter((w) => w.id !== id));
  };

  return (
    <SafeAreaView style={styles.fullScreenContainer}>
      {/* Desktop wallpaper */}
      <View style={styles.vistaWallpaper}>
        <View style={styles.wallpaperGradient} />
      </View>

      {/* Desktop icons */}
      <View style={styles.desktopIcons}>
        {['Computer', 'Recycle Bin', 'Network', 'Control Panel'].map((name, i) => (
          <View key={name} style={[styles.desktopIcon, { top: 20 + i * 90 }]}>
            <View style={styles.iconPlaceholder} />
            <Text style={styles.iconLabel}>{name}</Text>
          </View>
        ))}
      </View>

      {/* Windows */}
      {windows.map((window) => (
        <View
          key={window.id}
          style={[
            styles.windowWrapper,
            { zIndex: activeWindowId === window.id ? 100 : 10 },
          ]}
          onTouchStart={() => bringToFront(window.id)}
        >
          <WindowFrame
            title={window.title}
            width={window.width}
            height={window.height}
            x={window.x}
            y={window.y}
            onClose={() => closeWindow(window.id)}
            onMinimize={() => console.log('Minimize', window.id)}
          >
            <View style={styles.windowInnerContent}>
              <Text style={styles.contentText}>
                {window.title} Window Content
              </Text>
              
              <GlassButton
                title="Click Me"
                onPress={() => console.log('Clicked in', window.title)}
                width={150}
                style={{ marginTop: 20 }}
              />
            </View>
          </WindowFrame>
        </View>
      ))}

      {/* Start Menu */}
      {startMenuOpen && (
        <View style={styles.startMenuOverlay}>
          <GlassPanel
            width={320}
            height={450}
            cornerRadius={6}
            style={styles.fullStartMenu}
          >
            <View style={styles.startMenuHeader}>
              <Text style={styles.userName}>User</Text>
            </View>
            
            <View style={styles.startMenuLeft}>
              {['Internet', 'E-mail', 'Windows Media Player'].map((app) => (
                <GlassButton
                  key={app}
                  title={app}
                  onPress={() => console.log(app)}
                  width={150}
                  style={{ marginBottom: 4 }}
                />
              ))}
            </View>
            
            <View style={styles.startMenuRight}>
              {['Documents', 'Pictures', 'Music', 'Computer', 'Control Panel', 'Help'].map(
                (item) => (
                  <Text key={item} style={styles.menuItem}>{item}</Text>
                )
              )}
            </View>
            
            <View style={styles.startMenuFooter}>
              <GlassButton title="Log Off" onPress={() => {}} width={90} />
              <GlassButton title="Shut Down" onPress={() => {}} width={100} />
            </View>
          </GlassPanel>
        </View>
      )}

      {/* Taskbar */}
      <Taskbar
        height={42}
        startOrbComponent={
          <StartOrb
            size={44}
            onPress={() => setStartMenuOpen(!startMenuOpen)}
          />
        }
        windowButtons={windows.map((w) => (
          <View
            key={w.id}
            style={[
              styles.taskbarWindowBtn,
              activeWindowId === w.id && styles.taskbarWindowBtnActive,
            ]}
            onTouchEnd={() => bringToFront(w.id)}
          >
            <Text style={styles.taskbarWindowText} numberOfLines={1}>
              {w.title}
            </Text>
          </View>
        ))}
        showClock={true}
      />
    </SafeAreaView>
  );
};

// ============================================
// Styles
// ============================================
const styles = StyleSheet.create({
  exampleContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullScreenContainer: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  panelTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
  },
  panelText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    lineHeight: 20,
  },
  buttonRow: {
    flexDirection: 'row',
  },
  startMenu: {
    position: 'absolute',
    top: 70,
    left: 20,
  },
  menuText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    marginBottom: 16,
  },
  windowContainer: {
    flex: 1,
    position: 'relative',
  },
  windowContent: {
    flex: 1,
    padding: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  windowText: {
    color: 'rgba(0, 0, 0, 0.7)',
    fontSize: 14,
    textAlign: 'center',
  },
  desktop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  desktopText: {
    fontSize: 48,
    color: 'rgba(255, 255, 255, 0.2)',
    fontWeight: 'bold',
  },
  startMenuOverlay: {
    position: 'absolute',
    bottom: 50,
    left: 0,
    zIndex: 1000,
  },
  startMenuPanel: {
    marginLeft: 4,
  },
  startMenuTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 16,
  },
  menuItems: {
    marginTop: 8,
  },
  windowIcon: {
    width: 24,
    height: 24,
    borderRadius: 4,
  },
  taskbarWindowButton: {
    width: 40,
    height: 34,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 2,
    marginHorizontal: 2,
  },
  activeWindowButton: {
    backgroundColor: 'rgba(100, 150, 255, 0.3)',
  },
  vistaWallpaper: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0f2027',
  },
  wallpaperGradient: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  desktopIcons: {
    position: 'absolute',
    top: 0,
    left: 0,
    padding: 20,
  },
  desktopIcon: {
    position: 'absolute',
    left: 20,
    alignItems: 'center',
    width: 70,
  },
  iconPlaceholder: {
    width: 48,
    height: 48,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 4,
    marginBottom: 4,
  },
  iconLabel: {
    color: 'white',
    fontSize: 11,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
  },
  windowWrapper: {
    position: 'absolute',
  },
  windowInnerContent: {
    flex: 1,
    padding: 20,
  },
  contentText: {
    color: 'rgba(0, 0, 0, 0.7)',
    fontSize: 14,
  },
  fullStartMenu: {
    marginLeft: 4,
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 12,
  },
  startMenuHeader: {
    width: '100%',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    marginBottom: 12,
  },
  userName: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  startMenuLeft: {
    width: 160,
    paddingRight: 8,
  },
  startMenuRight: {
    flex: 1,
    paddingLeft: 8,
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(255, 255, 255, 0.1)',
  },
  menuItem: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 13,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  startMenuFooter: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingTop: 12,
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    gap: 8,
  },
  taskbarWindowBtn: {
    minWidth: 100,
    maxWidth: 160,
    height: 34,
    paddingHorizontal: 8,
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 2,
    marginHorizontal: 2,
  },
  taskbarWindowBtnActive: {
    backgroundColor: 'rgba(100, 150, 255, 0.25)',
  },
  taskbarWindowText: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 11,
  },
});

export default CompleteVistaDesktop;
