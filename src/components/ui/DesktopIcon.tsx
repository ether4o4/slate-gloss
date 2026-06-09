import React, { useRef } from 'react';
import { Animated, PanResponder, StyleSheet, Text, View } from 'react-native';
import type { AppInfo } from '../../native/Launcher';
import { AppIconImage } from './Icon';
import { Theme } from '../../theme';

interface Props {
  app?: AppInfo;
  label: string;
  x: number;
  y: number;
  cellWidth: number;
  cellHeight: number;
  onTap: () => void;
  onLongPress: () => void;
  onDragStart: () => void;
  onDragMove: (absX: number, absY: number) => void;
  onDragEnd: (absX: number, absY: number) => void;
}

const MOVE_THRESHOLD = 6;
const LONG_PRESS_MS = 450;

/**
 * Tap = launch. Move = drag (decided by movement, not a timer). Holding still
 * and then *releasing* opens the menu. Because the menu only fires on release,
 * it can never interrupt a drag or leave you stuck mid-gesture.
 */
export const DesktopIcon: React.FC<Props> = ({
  app,
  label,
  x,
  y,
  cellWidth,
  cellHeight,
  onTap,
  onLongPress,
  onDragStart,
  onDragMove,
  onDragEnd,
}) => {
  const pan = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const lift = useRef(new Animated.Value(0)).current;
  const dragging = useRef(false);
  const grantTime = useRef(0);
  const zIndex = useRef(new Animated.Value(0)).current;

  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_e, g) =>
        Math.abs(g.dx) > MOVE_THRESHOLD || Math.abs(g.dy) > MOVE_THRESHOLD,
      onPanResponderGrant: () => {
        dragging.current = false;
        grantTime.current = Date.now();
      },
      onPanResponderMove: (e, g) => {
        if (
          !dragging.current &&
          (Math.abs(g.dx) > MOVE_THRESHOLD || Math.abs(g.dy) > MOVE_THRESHOLD)
        ) {
          dragging.current = true;
          zIndex.setValue(999);
          Animated.spring(lift, {
            toValue: 1,
            useNativeDriver: false,
            speed: 40,
          }).start();
          onDragStart();
        }
        if (dragging.current) {
          pan.setValue({ x: g.dx, y: g.dy });
          onDragMove(e.nativeEvent.pageX, e.nativeEvent.pageY);
        }
      },
      onPanResponderRelease: e => {
        if (dragging.current) {
          dragging.current = false;
          onDragEnd(e.nativeEvent.pageX, e.nativeEvent.pageY);
          Animated.spring(pan, {
            toValue: { x: 0, y: 0 },
            useNativeDriver: false,
            speed: 30,
          }).start(() => zIndex.setValue(0));
          Animated.timing(lift, {
            toValue: 0,
            duration: 120,
            useNativeDriver: false,
          }).start();
        } else if (Date.now() - grantTime.current >= LONG_PRESS_MS) {
          onLongPress();
        } else {
          onTap();
        }
      },
      onPanResponderTerminate: () => {
        dragging.current = false;
        zIndex.setValue(0);
        Animated.spring(pan, {
          toValue: { x: 0, y: 0 },
          useNativeDriver: false,
        }).start();
        Animated.timing(lift, {
          toValue: 0,
          duration: 120,
          useNativeDriver: false,
        }).start();
      },
    }),
  ).current;

  const scale = lift.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.12],
  });
  const opacity = lift.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.85],
  });

  return (
    <Animated.View
      {...responder.panHandlers}
      style={[
        styles.cell,
        {
          left: x,
          top: y,
          width: cellWidth,
          height: cellHeight,
          zIndex: zIndex as any,
          opacity,
        },
        { transform: [...pan.getTranslateTransform(), { scale }] },
      ]}
    >
      <View style={styles.iconWrap}>
        <AppIconImage app={app} size={52} radius={12} />
      </View>
      <Text style={styles.label} numberOfLines={2}>
        {label}
      </Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  cell: { position: 'absolute', alignItems: 'center', paddingTop: 6 },
  iconWrap: { marginBottom: 4 },
  label: {
    color: Theme.text,
    fontSize: 11,
    textAlign: 'center',
    maxWidth: 76,
    textShadowColor: 'rgba(0,0,0,0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
});

export default DesktopIcon;
