import React, {useRef} from 'react';
import {Animated, PanResponder, Pressable, StyleSheet, Text, View} from 'react-native';
import type {DesktopWidget} from '../../db/LauncherStore';
import {WidgetHostView} from '../../native/Widgets';
import {Theme} from '../../theme';

interface Props {
  widget: DesktopWidget;
  onMove: (id: number, x: number, y: number) => void;
  onRemove: (id: number) => void;
}

/**
 * A real hosted AppWidget on the desktop. Only the top handle is draggable, so
 * the widget body itself stays fully interactive (buttons, scrolling, etc.).
 */
export const HostedWidget: React.FC<Props> = ({widget, onMove, onRemove}) => {
  const pan = useRef(new Animated.ValueXY({x: 0, y: 0})).current;
  const zIndex = useRef(new Animated.Value(1)).current;

  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: () => zIndex.setValue(999),
      onPanResponderMove: (_e, g) => pan.setValue({x: g.dx, y: g.dy}),
      onPanResponderRelease: (_e, g) => {
        onMove(widget.widgetId, widget.x + g.dx, widget.y + g.dy);
        pan.setValue({x: 0, y: 0});
        zIndex.setValue(1);
      },
      onPanResponderTerminate: () => {
        pan.setValue({x: 0, y: 0});
        zIndex.setValue(1);
      },
    }),
  ).current;

  return (
    <Animated.View
      style={[
        styles.wrap,
        {left: widget.x, top: widget.y, width: widget.w, height: widget.h, zIndex: zIndex as any},
        {transform: pan.getTranslateTransform()},
      ]}>
      <View style={styles.handle} {...responder.panHandlers}>
        <Text style={styles.grip}>⋮⋮</Text>
        <View style={{flex: 1}} />
        <Pressable onPress={() => onRemove(widget.widgetId)} hitSlop={10}>
          <Text style={styles.remove}>✕</Text>
        </Pressable>
      </View>
      <View style={styles.body}>
        {WidgetHostView ? (
          <WidgetHostView widgetId={widget.widgetId} style={styles.host} />
        ) : (
          <Text style={styles.fallback}>Widget hosting unavailable on this build.</Text>
        )}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  handle: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 22,
    paddingHorizontal: 8,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  grip: {color: Theme.textDim, fontSize: 12, letterSpacing: -2},
  remove: {color: '#fff', fontSize: 13, fontWeight: '700'},
  body: {flex: 1},
  host: {flex: 1},
  fallback: {color: Theme.textDim, fontSize: 12, padding: 10, textAlign: 'center'},
});

export default HostedWidget;
