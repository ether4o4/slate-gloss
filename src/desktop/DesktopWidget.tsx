/**
 * DesktopWidget — a draggable, RESIZABLE glass box pinned to the home screen.
 *
 * Fixes the two widget complaints:
 *   • drags are clamped to the desktop bounds on every frame, so a widget can
 *     never get stuck off-screen or pinned at the top;
 *   • a grab handle in the bottom-right corner resizes the box (min/max clamped).
 */
import React from 'react';
import { Dimensions, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const MIN_W = 120;
const MIN_H = 90;
const TASKBAR_H = 48;
const TITLE_H = 26;

export interface WidgetSpec {
  id: string;
  title: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

const DesktopWidget: React.FC<{
  spec: WidgetSpec;
  onRemove: (id: string) => void;
  children?: React.ReactNode;
}> = ({ spec, onRemove, children }) => {
  const x = useSharedValue(spec.x);
  const y = useSharedValue(spec.y);
  const w = useSharedValue(spec.width);
  const h = useSharedValue(spec.height);
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);
  const startW = useSharedValue(0);
  const startH = useSharedValue(0);
  const dragging = useSharedValue(0);

  const dragGesture = Gesture.Pan()
    .onStart(() => {
      startX.value = x.value;
      startY.value = y.value;
      dragging.value = 1;
    })
    .onUpdate(e => {
      // Clamp every frame — widgets can never leave the desktop or jam at the top.
      const maxX = SCREEN_WIDTH - w.value;
      const maxY = SCREEN_HEIGHT - TASKBAR_H - h.value;
      x.value = Math.min(Math.max(startX.value + e.translationX, 0), Math.max(0, maxX));
      y.value = Math.min(Math.max(startY.value + e.translationY, 0), Math.max(0, maxY));
    })
    .onEnd(() => {
      dragging.value = 0;
    })
    .onFinalize(() => {
      dragging.value = 0;
    });

  const resizeGesture = Gesture.Pan()
    .onStart(() => {
      startW.value = w.value;
      startH.value = h.value;
    })
    .onUpdate(e => {
      const maxW = SCREEN_WIDTH - x.value;
      const maxH = SCREEN_HEIGHT - TASKBAR_H - y.value;
      w.value = Math.min(Math.max(startW.value + e.translationX, MIN_W), maxW);
      h.value = Math.min(Math.max(startH.value + e.translationY, MIN_H), maxH);
    });

  const boxStyle = useAnimatedStyle(() => ({
    left: x.value,
    top: y.value,
    width: w.value,
    height: h.value,
    borderColor: dragging.value ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.4)',
    transform: [{ scale: dragging.value ? 1.02 : 1 }],
  }));

  return (
    <Animated.View style={[styles.box, boxStyle]}>
      <GestureDetector gesture={dragGesture}>
        <View style={styles.titleBar}>
          <Text style={styles.title} numberOfLines={1}>
            {spec.title}
          </Text>
          <TouchableOpacity onPress={() => onRemove(spec.id)} hitSlop={8}>
            <Text style={styles.close}>✕</Text>
          </TouchableOpacity>
        </View>
      </GestureDetector>

      <View style={styles.content}>{children}</View>

      <GestureDetector gesture={resizeGesture}>
        <View style={styles.resizeHandle}>
          <Text style={styles.resizeGlyph}>◢</Text>
        </View>
      </GestureDetector>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  box: {
    position: 'absolute',
    borderRadius: 10,
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.18)',
    overflow: 'hidden',
  },
  titleBar: {
    height: TITLE_H,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.3)',
  },
  title: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
    flex: 1,
    textShadowColor: 'rgba(0,0,0,0.45)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  close: { color: 'rgba(255,255,255,0.85)', fontSize: 12, fontWeight: '700' },
  content: { flex: 1 },
  resizeHandle: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 26,
    height: 26,
    alignItems: 'flex-end',
    justifyContent: 'flex-end',
    padding: 3,
  },
  resizeGlyph: { color: 'rgba(255,255,255,0.65)', fontSize: 12 },
});

export default DesktopWidget;
