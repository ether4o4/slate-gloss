/**
 * WindowFrame — draggable / resizable window (plain glass, no Skia).
 *
 * Drag (on the title bar) and the corner resize grip use Reanimated +
 * Gesture Handler only — both clamp to the screen. The Skia canvas/shader
 * backgrounds were removed because they crashed the release build at startup.
 */
import React, { useRef, useState } from 'react';
import { Dimensions, StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const TASKBAR_CLEARANCE = 48;

export interface WindowFrameProps {
  title: string;
  width: number;
  height: number;
  x?: number;
  y?: number;
  minWidth?: number;
  minHeight?: number;
  maxWidth?: number;
  maxHeight?: number;
  children?: React.ReactNode;
  onClose?: () => void;
  onMinimize?: () => void;
  onMaximize?: () => void;
  onRestore?: () => void;
  isMaximized?: boolean;
  isMinimized?: boolean;
  style?: ViewStyle;
  showTitleBar?: boolean;
  titleBarHeight?: number;
  cornerRadius?: number;
  resizable?: boolean;
  draggable?: boolean;
}

const WindowButton: React.FC<{
  type: 'minimize' | 'maximize' | 'close';
  onPress: () => void;
}> = ({ type, onPress }) => {
  const glyph = type === 'minimize' ? '—' : type === 'maximize' ? '▢' : '✕';
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={[styles.winBtn, type === 'close' && styles.winBtnClose]}>
      <Text style={styles.winBtnText}>{glyph}</Text>
    </TouchableOpacity>
  );
};

export const WindowFrame: React.FC<WindowFrameProps> = ({
  title,
  width: initialWidth,
  height: initialHeight,
  x: initialX = 50,
  y: initialY = 50,
  minWidth = 200,
  minHeight = 150,
  maxWidth,
  maxHeight,
  children,
  onClose,
  onMinimize,
  onMaximize,
  onRestore,
  isMaximized = false,
  style,
  showTitleBar = true,
  titleBarHeight = 34,
  cornerRadius = 8,
  draggable = true,
  resizable = true,
}) => {
  const [windowWidth, setWindowWidth] = useState(initialWidth);
  const [windowHeight, setWindowHeight] = useState(initialHeight);

  const posX = useSharedValue(initialX);
  const posY = useSharedValue(initialY);
  const opacity = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: posX.value }, { translateY: posY.value }],
    opacity: opacity.value,
  }));

  const dragGesture = Gesture.Pan()
    .enabled(draggable && !isMaximized)
    .onChange(event => {
      const maxX = SCREEN_W - 64;
      const maxY = SCREEN_H - TASKBAR_CLEARANCE - titleBarHeight;
      posX.value = Math.min(Math.max(posX.value + event.changeX, -(windowWidth - 64)), maxX);
      posY.value = Math.min(Math.max(posY.value + event.changeY, 0), maxY);
    });

  const resizeStart = useRef({ w: initialWidth, h: initialHeight });
  const resizeGesture = Gesture.Pan()
    .enabled(resizable && !isMaximized)
    .runOnJS(true)
    .onStart(() => {
      resizeStart.current = { w: windowWidth, h: windowHeight };
    })
    .onUpdate(event => {
      const capW = maxWidth ?? SCREEN_W;
      const capH = maxHeight ?? SCREEN_H - TASKBAR_CLEARANCE;
      setWindowWidth(Math.min(capW, Math.max(minWidth, resizeStart.current.w + event.translationX)));
      setWindowHeight(Math.min(capH, Math.max(minHeight, resizeStart.current.h + event.translationY)));
    });

  const handleClose = () => {
    const close = onClose ?? (() => {});
    opacity.value = withTiming(0, { duration: 150 }, () => {
      runOnJS(close)();
    });
  };

  const handleMaximize = () => {
    if (isMaximized) {
      onRestore?.();
    } else {
      onMaximize?.();
    }
  };

  return (
    <Animated.View
      style={[
        styles.container,
        { width: windowWidth, height: windowHeight, borderRadius: cornerRadius },
        animatedStyle,
        style,
      ]}>
      {showTitleBar && (
        <GestureDetector gesture={dragGesture}>
          <View style={[styles.titleBar, { height: titleBarHeight }]}>
            <Text style={styles.titleText} numberOfLines={1}>
              {title}
            </Text>
            <View style={styles.winButtons}>
              <WindowButton type="minimize" onPress={onMinimize || (() => {})} />
              <WindowButton type="maximize" onPress={handleMaximize} />
              <WindowButton type="close" onPress={handleClose} />
            </View>
          </View>
        </GestureDetector>
      )}

      <View style={styles.content}>{children}</View>

      {resizable && !isMaximized && (
        <GestureDetector gesture={resizeGesture}>
          <View style={styles.resizeCorner}>
            <Text style={styles.resizeGlyph}>◢</Text>
          </View>
        </GestureDetector>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    overflow: 'hidden',
    backgroundColor: 'rgba(28,42,66,0.94)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  titleBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: 12,
    paddingRight: 4,
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.25)',
  },
  titleText: {
    flex: 1,
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
    textShadowColor: 'rgba(0,0,0,0.45)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  winButtons: { flexDirection: 'row', alignItems: 'center' },
  winBtn: {
    width: 28,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 1,
    borderRadius: 4,
  },
  winBtnClose: { backgroundColor: 'rgba(232,17,35,0.0)' },
  winBtnText: { color: '#ffffff', fontSize: 13, fontWeight: '700' },
  content: { flex: 1, overflow: 'hidden' },
  resizeCorner: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 28,
    height: 28,
    alignItems: 'flex-end',
    justifyContent: 'flex-end',
    padding: 4,
  },
  resizeGlyph: { color: 'rgba(255,255,255,0.55)', fontSize: 12 },
});

export default WindowFrame;
