import React, { useCallback, useRef } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import type { AppInfo } from '../../native/Launcher';
import type {
  DesktopIcon as DesktopIconModel,
  DesktopWidget,
} from '../../db/LauncherStore';
import { DesktopIcon } from './DesktopIcon';
import { HostedWidget } from './HostedWidget';

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface Props {
  apps: Record<string, AppInfo>;
  icons: DesktopIconModel[];
  widgets: DesktopWidget[];
  cellWidth: number;
  cellHeight: number;
  cols: number;
  rows: number;
  onLaunch: (pkg: string) => void;
  onIconMenu: (pkg: string) => void;
  onMoveIcon: (pkg: string, col: number, row: number) => void;
  onMoveWidget: (id: number, x: number, y: number) => void;
  onResizeWidget: (id: number, w: number, h: number) => void;
  onRemoveWidget: (id: number) => void;
  onEmptyMenu: () => void;
}

export const Desktop: React.FC<Props> = ({
  apps,
  icons,
  widgets,
  cellWidth,
  cellHeight,
  cols,
  rows,
  onLaunch,
  onIconMenu,
  onMoveIcon,
  onMoveWidget,
  onResizeWidget,
  onRemoveWidget,
  onEmptyMenu,
}) => {
  const gridOrigin = useRef<Rect>({ x: 0, y: 0, w: 0, h: 0 });
  const gridRef = useRef<View>(null);

  const measure = useCallback(() => {
    gridRef.current?.measureInWindow(
      (x, y, w, h) => (gridOrigin.current = { x, y, w, h }),
    );
  }, []);

  // The desktop no longer hosts its own Recycle Bin (the classic icon column
  // has one); drags simply snap to the grid.
  const handleDragMove = useCallback(() => {}, []);

  const handleDragEnd = useCallback(
    (pkg: string, px: number, py: number) => {
      const o = gridOrigin.current;
      const col = Math.min(
        cols - 1,
        Math.max(0, Math.round((px - o.x - cellWidth / 2) / cellWidth)),
      );
      const row = Math.min(
        rows - 1,
        Math.max(0, Math.round((py - o.y - cellHeight / 2) / cellHeight)),
      );
      onMoveIcon(pkg, col, row);
    },
    [cols, rows, cellWidth, cellHeight, onMoveIcon],
  );

  return (
    <View style={styles.fill} ref={gridRef} onLayout={measure}>
      {/* Long-press empty desktop space for the context menu. */}
      <Pressable
        style={StyleSheet.absoluteFill}
        onLongPress={onEmptyMenu}
        delayLongPress={400}
      />

      {icons.map(icon => {
        const app = apps[icon.packageName];
        return (
          <DesktopIcon
            key={icon.packageName}
            app={app}
            label={app?.label ?? icon.packageName}
            x={icon.col * cellWidth}
            y={icon.row * cellHeight}
            cellWidth={cellWidth}
            cellHeight={cellHeight}
            onTap={() => onLaunch(icon.packageName)}
            onLongPress={() => onIconMenu(icon.packageName)}
            onDragStart={measure}
            onDragMove={handleDragMove}
            onDragEnd={(px, py) => handleDragEnd(icon.packageName, px, py)}
          />
        );
      })}

      {/* Widgets render above icons so their drag handle is always grabbable. */}
      {widgets.map(w => (
        <HostedWidget
          key={w.widgetId}
          widget={w}
          onMove={onMoveWidget}
          onResize={onResizeWidget}
          onRemove={onRemoveWidget}
        />
      ))}

    </View>
  );
};

const styles = StyleSheet.create({
  fill: { flex: 1 },
});

export default Desktop;
