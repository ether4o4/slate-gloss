import React, {useRef} from 'react';
import {Animated, PanResponder, StyleSheet, Text, View} from 'react-native';
import type {AppInfo} from '../../native/Launcher';
import {AppIconImage} from './Icon';
import {Vista} from '../../theme';

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

const MOVE_THRESHOLD = 8;

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
  const pan = useRef(new Animated.ValueXY({x: 0, y: 0})).current;
  const dragging = useRef(false);
  const longPressed = useRef(false);
  const longTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const zIndex = useRef(new Animated.Value(0)).current;

  const clearTimer = () => {
    if (longTimer.current) {
      clearTimeout(longTimer.current);
      longTimer.current = null;
    }
  };

  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_e, g) =>
        Math.abs(g.dx) > MOVE_THRESHOLD || Math.abs(g.dy) > MOVE_THRESHOLD,
      onPanResponderGrant: () => {
        dragging.current = false;
        longPressed.current = false;
        clearTimer();
        longTimer.current = setTimeout(() => {
          if (!dragging.current) {
            longPressed.current = true;
            onLongPress();
          }
        }, 500);
      },
      onPanResponderMove: (e, g) => {
        if (!dragging.current && (Math.abs(g.dx) > MOVE_THRESHOLD || Math.abs(g.dy) > MOVE_THRESHOLD)) {
          dragging.current = true;
          clearTimer();
          zIndex.setValue(999);
          onDragStart();
        }
        if (dragging.current) {
          pan.setValue({x: g.dx, y: g.dy});
          onDragMove(e.nativeEvent.pageX, e.nativeEvent.pageY);
        }
      },
      onPanResponderRelease: (e, g) => {
        clearTimer();
        if (dragging.current) {
          dragging.current = false;
          onDragEnd(e.nativeEvent.pageX, e.nativeEvent.pageY);
          Animated.spring(pan, {toValue: {x: 0, y: 0}, useNativeDriver: false, speed: 30}).start(() =>
            zIndex.setValue(0),
          );
        } else if (!longPressed.current) {
          onTap();
        }
      },
      onPanResponderTerminate: () => {
        clearTimer();
        dragging.current = false;
        Animated.spring(pan, {toValue: {x: 0, y: 0}, useNativeDriver: false}).start();
      },
    }),
  ).current;

  return (
    <Animated.View
      {...responder.panHandlers}
      style={[
        styles.cell,
        {left: x, top: y, width: cellWidth, height: cellHeight, zIndex: zIndex as any},
        {transform: pan.getTranslateTransform()},
      ]}>
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
  cell: {position: 'absolute', alignItems: 'center', paddingTop: 6},
  iconWrap: {marginBottom: 4},
  label: {
    color: Vista.text,
    fontSize: 11,
    textAlign: 'center',
    maxWidth: 76,
    textShadowColor: 'rgba(0,0,0,0.75)',
    textShadowOffset: {width: 0, height: 1},
    textShadowRadius: 3,
  },
});

export default DesktopIcon;
