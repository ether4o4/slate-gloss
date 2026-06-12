import React, { useRef } from 'react';
import {
  Animated,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { DesktopWidget } from '../../db/LauncherStore';
import { WidgetHostView } from '../../native/Widgets';
import { Theme } from '../../theme';

interface Props {
  widget: DesktopWidget;
  onMove: (id: number, x: number, y: number) => void;
  onResize: (id: number, w: number, h: number) => void;
  onRemove: (id: number) => void;
}

/**
 * A real hosted AppWidget on the desktop. Only the top handle is draggable, so
 * the widget body itself stays fully interactive (buttons, scrolling, etc.).
 */
export const HostedWidget: React.FC<Props> = ({
  widget,
  onMove,
  onResize,
  onRemove,
}) => {
  const pan = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const zIndex = useRef(new Animated.Value(1)).current;
  const [liveSize, setLiveSize] = React.useState<{ w: number; h: number } | null>(
    null,
  );
  const sizeRef = useRef({ w: widget.w, h: widget.h });
  sizeRef.current = { w: widget.w, h: widget.h };

  // Bottom-right grip: drag to resize, clamped to sane widget bounds.
  const resizer = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => zIndex.setValue(999),
      onPanResponderMove: (_e, g) => {
        setLiveSize({
          w: Math.max(100, sizeRef.current.w + g.dx),
          h: Math.max(70, sizeRef.current.h + g.dy),
        });
      },
      onPanResponderRelease: (_e, g) => {
        zIndex.setValue(1);
        setLiveSize(null);
        onResize(
          widget.widgetId,
          Math.round(Math.max(100, sizeRef.current.w + g.dx)),
          Math.round(Math.max(70, sizeRef.current.h + g.dy)),
        );
      },
      onPanResponderTerminate: () => {
        zIndex.setValue(1);
        setLiveSize(null);
      },
    }),
  ).current;

  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: () => zIndex.setValue(999),
      onPanResponderMove: (_e, g) => pan.setValue({ x: g.dx, y: g.dy }),
      onPanResponderRelease: (_e, g) => {
        onMove(widget.widgetId, widget.x + g.dx, widget.y + g.dy);
        pan.setValue({ x: 0, y: 0 });
        zIndex.setValue(1);
      },
      onPanResponderTerminate: () => {
        pan.setValue({ x: 0, y: 0 });
        zIndex.setValue(1);
      },
    }),
  ).current;

  return (
    <Animated.View
      style={[
        styles.wrap,
        {
          left: widget.x,
          top: widget.y,
          width: liveSize?.w ?? widget.w,
          height: liveSize?.h ?? widget.h,
          zIndex: zIndex as any,
        },
        { transform: pan.getTranslateTransform() },
      ]}
    >
      <View style={styles.handle} {...responder.panHandlers}>
        <Text style={styles.grip}>⠿⠿ drag</Text>
        <View style={{ flex: 1 }} />
        <Pressable
          onPress={() => onRemove(widget.widgetId)}
          hitSlop={14}
          style={styles.removeBtn}
        >
          <Text style={styles.remove}>✕</Text>
        </Pressable>
      </View>
      <View style={styles.body}>
        {WidgetHostView ? (
          <WidgetHostView widgetId={widget.widgetId} style={styles.host} />
        ) : (
          <Text style={styles.fallback}>
            Widget hosting unavailable on this build.
          </Text>
        )}
      </View>
      {/* Resize grip (bottom-right corner). */}
      <View style={styles.resizeGrip} {...resizer.panHandlers}>
        <Text style={styles.resizeGlyph}>⤡</Text>
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
    height: 30,
    paddingHorizontal: 10,
    backgroundColor: 'rgba(10,20,35,0.85)',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.18)',
  },
  grip: { color: '#cdd9e6', fontSize: 12, fontWeight: '700', letterSpacing: 1 },
  resizeGrip: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(10,20,35,0.7)',
    borderTopLeftRadius: 12,
  },
  resizeGlyph: { color: '#cdd9e6', fontSize: 15, fontWeight: '700' },
  removeBtn: {
    width: 26,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  remove: { color: '#fff', fontSize: 13, fontWeight: '700' },
  body: { flex: 1 },
  host: { flex: 1 },
  fallback: {
    color: Theme.textDim,
    fontSize: 12,
    padding: 10,
    textAlign: 'center',
  },
});

export default HostedWidget;
