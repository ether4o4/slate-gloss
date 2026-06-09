/**
 * Vista Launcher Animation Examples
 * Usage examples for all animation hooks
 */

import React from 'react';
import { View, StyleSheet, Pressable, Text } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

// Import all animation hooks
import {
  // Window animations
  useWindowController,
  
  // Minimize animations
  useMinimizeController,
  
  // Start menu animations
  useStartMenuController,
  
  // Drag physics
  useDragController,
  
  // Glass shimmer
  useGlassShimmer,
  useHoverShimmer,
  
  // Button hover
  useButtonController,
  
  // Taskbar bounce
  useTaskbarController,
  
  // Shared transitions
  SharedTransitionPresets,
} from './index';

// ============================================================================
// 1. Window Component with Open/Close Animation
// ============================================================================

export function AnimatedWindow({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { animatedStyle, isOpen: animIsOpen, open, close } = useWindowController({
    onCloseComplete: onClose,
  });

  React.useEffect(() => {
    if (isOpen && !animIsOpen.value) open();
    if (!isOpen && animIsOpen.value) close();
  }, [isOpen]);

  return (
    <Animated.View style={[styles.window, animatedStyle]}>
      <View style={styles.windowHeader}>
        <Text style={styles.windowTitle}>Window Title</Text>
        <Pressable onPress={close} style={styles.closeButton}>
          <Text>×</Text>
        </Pressable>
      </View>
      <View style={styles.windowContent}>
        <Text>Window content here</Text>
      </View>
    </Animated.View>
  );
}

// ============================================================================
// 2. Minimize to Taskbar Animation
// ============================================================================

export function MinimizableWindow({ 
  taskbarIconRef 
}: { 
  taskbarIconRef: React.RefObject<View> 
}) {
  const {
    animatedStyle,
    minimize,
    restore,
    isMinimized,
  } = useMinimizeController({
    windowWidth: 600,
    windowHeight: 400,
    onMinimizeComplete: () => console.log('Minimized!'),
    onRestoreComplete: () => console.log('Restored!'),
  });

  const handleMinimize = () => {
    // Get taskbar icon position
    taskbarIconRef.current?.measure((x, y, width, height, pageX, pageY) => {
      minimize(pageX, pageY);
    });
  };

  return (
    <Animated.View style={[styles.minimizeWindow, animatedStyle]}>
      <View style={styles.windowHeader}>
        <Text>Minimizable Window</Text>
        <Pressable onPress={handleMinimize}>
          <Text>—</Text>
        </Pressable>
        <Pressable onPress={restore}>
          <Text>□</Text>
        </Pressable>
      </View>
    </Animated.View>
  );
}

// ============================================================================
// 3. Start Menu with Staggered Reveal
// ============================================================================

export function AnimatedStartMenu({ isOpen }: { isOpen: boolean }) {
  const {
    menuAnimatedStyle,
    itemAnimations,
    isOpen: menuIsOpen,
    open,
    close,
  } = useStartMenuController({
    itemCount: 8,
    staggerDelay: 40,
    onOpenComplete: () => console.log('Menu opened!'),
  });

  React.useEffect(() => {
    if (isOpen && !menuIsOpen.value) open();
    if (!isOpen && menuIsOpen.value) close();
  }, [isOpen]);

  const menuItems = ['App 1', 'App 2', 'App 3', 'App 4', 'App 5', 'App 6', 'App 7', 'App 8'];

  return (
    <Animated.View style={[styles.startMenu, menuAnimatedStyle]}>
      {menuItems.map((item, index) => (
        <Animated.View 
          key={index} 
          style={[styles.menuItem, itemAnimations[index]?.animatedStyle]}
        >
          <Text>{item}</Text>
        </Animated.View>
      ))}
    </Animated.View>
  );
}

// ============================================================================
// 4. Draggable Window with Physics
// ============================================================================

export function DraggableWindow() {
  const {
    animatedStyle,
    handleDragStart,
    handleDragUpdate,
    handleDragEnd,
    isDragging,
  } = useDragController({
    bounds: { minX: 0, maxX: 800, minY: 0, maxY: 600 },
    velocityFactor: 0.7,
    snapToGrid: 10,
    onDragStart: () => console.log('Drag started'),
    onDragEnd: (x, y) => console.log('Drag ended at:', x, y),
    onMomentumEnd: (x, y) => console.log('Momentum ended at:', x, y),
  });

  const gesture = Gesture.Pan()
    .onStart(handleDragStart)
    .onUpdate(handleDragUpdate)
    .onEnd(handleDragEnd);

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={[styles.draggableWindow, animatedStyle, isDragging.value && styles.dragging]}>
        <Text>Drag me around!</Text>
      </Animated.View>
    </GestureDetector>
  );
}

// ============================================================================
// 5. Glass Surface with Shimmer
// ============================================================================

export function GlassPanel() {
  const { animatedStyle, shimmerPosition } = useGlassShimmer({
    duration: 5000,
    delay: 1000,
    intensity: 0.4,
  });

  return (
    <View style={styles.glassContainer}>
      <Animated.View style={[styles.shimmer, animatedStyle]} />
      <Text style={styles.glassText}>Glass Effect</Text>
    </View>
  );
}

// Hover-triggered shimmer
export function HoverGlassButton({ onPress }: { onPress: () => void }) {
  const { animatedStyle, onHoverIn, onHoverOut } = useHoverShimmer({
    intensity: 0.5,
    duration: 3000,
  });

  return (
    <Pressable 
      onPress={onPress}
      onHoverIn={onHoverIn}
      onHoverOut={onHoverOut}
      style={styles.glassButton}
    >
      <Animated.View style={[styles.buttonShimmer, animatedStyle]} />
      <Text style={styles.buttonText}>Hover Me</Text>
    </Pressable>
  );
}

// ============================================================================
// 6. Button with Hover Scale + Glow
// ============================================================================

export function GlowButton({ 
  title, 
  onPress 
}: { 
  title: string; 
  onPress: () => void 
}) {
  const {
    animatedStyle,
    glowStyle,
    handleHoverIn,
    handleHoverOut,
    handlePress,
  } = useButtonController({
    hoverScale: 1.08,
    glowIntensity: 0.7,
    shadowRadius: 20,
    glowColor: '#4facfe',
    onPress,
  });

  return (
    <View style={styles.buttonContainer}>
      {/* Glow effect layer */}
      <Animated.View style={[styles.glowLayer, glowStyle]} />
      
      {/* Main button */}
      <Pressable
        onPress={handlePress}
        onHoverIn={handleHoverIn}
        onHoverOut={handleHoverOut}
      >
        <Animated.View style={[styles.glowButton, animatedStyle]}>
          <Text style={styles.buttonText}>{title}</Text>
        </Animated.View>
      </Pressable>
    </View>
  );
}

// ============================================================================
// 7. Taskbar Icon with Bounce Notification
// ============================================================================

export function TaskbarIcon({ 
  icon, 
  badgeCount 
}: { 
  icon: React.ReactNode; 
  badgeCount: number 
}) {
  const {
    animatedStyle,
    badgeStyle,
    glowStyle,
    notify,
    grabAttention,
    clear,
  } = useTaskbarController({
    bounceHeight: -25,
    bounceCount: 3,
    glowColor: '#ff6b6b',
    onBounceComplete: () => console.log('Bounce complete'),
  });

  React.useEffect(() => {
    if (badgeCount > 0) {
      // Urgent notification if count increased significantly
      notify(badgeCount >= 5);
    } else {
      clear();
    }
  }, [badgeCount]);

  return (
    <View style={styles.taskbarIconContainer}>
      {/* Glow effect */}
      <Animated.View style={[styles.iconGlow, glowStyle]} />
      
      {/* Icon */}
      <Animated.View style={[styles.taskbarIcon, animatedStyle]}>
        {icon}
      </Animated.View>
      
      {/* Badge */}
      {badgeCount > 0 && (
        <Animated.View style={[styles.badge, badgeStyle]}>
          <Text style={styles.badgeText}>{badgeCount}</Text>
        </Animated.View>
      )}
    </View>
  );
}

// ============================================================================
// Combined Example: Full Window with All Features
// ============================================================================

export function FullFeaturedWindow() {
  const windowAnim = useWindowController();
  const dragAnim = useDragController({ bounds: { minX: 0, minY: 30 } });
  const minimizeAnim = useMinimizeController();
  
  // Combined styles
  const combinedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: dragAnim.translateX.value },
      { translateY: dragAnim.translateY.value },
      { scale: windowAnim.scale.value },
    ],
    opacity: windowAnim.opacity.value,
  }));

  return (
    <Animated.View style={[styles.fullWindow, combinedStyle]}>
      {/* Draggable header */}
      <GestureDetector gesture={Gesture.Pan().onUpdate(dragAnim.handleDragUpdate)}>
        <Animated.View style={styles.draggableHeader}>
          <Text>Full Featured Window</Text>
        </Animated.View>
      </GestureDetector>
      
      {/* Content with glass effect */}
      <GlassPanel />
      
      {/* Controls */}
      <GlowButton title="Action" onPress={() => {}} />
    </Animated.View>
  );
}

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  // Window styles
  window: {
    width: 400,
    height: 300,
    backgroundColor: '#fff',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  windowHeader: {
    height: 40,
    backgroundColor: '#f0f0f0',
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    justifyContent: 'space-between',
  },
  windowTitle: {
    fontWeight: '600',
  },
  windowContent: {
    flex: 1,
    padding: 16,
  },
  closeButton: {
    width: 24,
    height: 24,
    backgroundColor: '#ff5f56',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Minimize styles
  minimizeWindow: {
    width: 600,
    height: 400,
    backgroundColor: '#fff',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
  },

  // Start menu styles
  startMenu: {
    position: 'absolute',
    bottom: 60,
    left: 10,
    width: 300,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  menuItem: {
    padding: 12,
    borderRadius: 8,
    marginVertical: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },

  // Draggable styles
  draggableWindow: {
    width: 300,
    height: 200,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
  },
  dragging: {
    shadowOpacity: 0.4,
    shadowRadius: 20,
  },

  // Glass styles
  glassContainer: {
    width: 200,
    height: 100,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shimmer: {
    position: 'absolute',
    width: '200%',
    height: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  glassText: {
    color: '#fff',
    fontWeight: '600',
  },
  glassButton: {
    width: 150,
    height: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 12,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonShimmer: {
    position: 'absolute',
    width: '150%',
    height: '150%',
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },

  // Button styles
  buttonContainer: {
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
  },
  glowButton: {
    width: 150,
    height: 48,
    backgroundColor: '#4facfe',
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glowLayer: {
    position: 'absolute',
    width: 180,
    height: 78,
    borderRadius: 39,
    backgroundColor: 'rgba(79, 172, 254, 0.4)',
  },

  // Taskbar styles
  taskbarIconContainer: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  taskbarIcon: {
    width: 40,
    height: 40,
    backgroundColor: '#4facfe',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconGlow: {
    position: 'absolute',
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(79, 172, 254, 0.6)',
  },
  badge: {
    position: 'absolute',
    top: 0,
    right: 0,
    minWidth: 20,
    height: 20,
    backgroundColor: '#ff6b6b',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },

  // Full window styles
  fullWindow: {
    width: 500,
    height: 400,
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  draggableHeader: {
    height: 50,
    backgroundColor: '#f8f8f8',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

// ============================================================================
// Export component registry for easy reference
// ============================================================================

export const AnimationExamples = {
  AnimatedWindow,
  MinimizableWindow,
  AnimatedStartMenu,
  DraggableWindow,
  GlassPanel,
  HoverGlassButton,
  GlowButton,
  TaskbarIcon,
  FullFeaturedWindow,
};
