import React, {useCallback, useRef, useState} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import type {AppInfo} from '../../native/Launcher';
import type {DesktopIcon as DesktopIconModel} from '../../db/LauncherStore';
import {DesktopIcon} from './DesktopIcon';
import {Vista} from '../../theme';

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface Props {
  apps: Record<string, AppInfo>;
  icons: DesktopIconModel[];
  recycleCount: number;
  cellWidth: number;
  cellHeight: number;
  cols: number;
  rows: number;
  onLaunch: (pkg: string) => void;
  onIconMenu: (pkg: string) => void;
  onMoveIcon: (pkg: string, col: number, row: number) => void;
  onRecycle: (pkg: string) => void;
  onOpenRecycle: () => void;
}

export const Desktop: React.FC<Props> = ({
  apps,
  icons,
  recycleCount,
  cellWidth,
  cellHeight,
  cols,
  rows,
  onLaunch,
  onIconMenu,
  onMoveIcon,
  onRecycle,
  onOpenRecycle,
}) => {
  const gridOrigin = useRef<Rect>({x: 0, y: 0, w: 0, h: 0});
  const binRect = useRef<Rect>({x: 0, y: 0, w: 0, h: 0});
  const gridRef = useRef<View>(null);
  const binRef = useRef<View>(null);
  const [binHot, setBinHot] = useState(false);

  const measure = useCallback(() => {
    gridRef.current?.measureInWindow((x, y, w, h) => (gridOrigin.current = {x, y, w, h}));
    binRef.current?.measureInWindow((x, y, w, h) => (binRect.current = {x, y, w, h}));
  }, []);

  const isOverBin = (px: number, py: number) => {
    const b = binRect.current;
    return px >= b.x && px <= b.x + b.w && py >= b.y && py <= b.y + b.h;
  };

  const handleDragMove = useCallback((px: number, py: number) => {
    setBinHot(isOverBin(px, py));
  }, []);

  const handleDragEnd = useCallback(
    (pkg: string, px: number, py: number) => {
      setBinHot(false);
      if (isOverBin(px, py)) {
        onRecycle(pkg);
        return;
      }
      const o = gridOrigin.current;
      const col = Math.min(cols - 1, Math.max(0, Math.round((px - o.x - cellWidth / 2) / cellWidth)));
      const row = Math.min(rows - 1, Math.max(0, Math.round((py - o.y - cellHeight / 2) / cellHeight)));
      onMoveIcon(pkg, col, row);
    },
    [cols, rows, cellWidth, cellHeight, onMoveIcon, onRecycle],
  );

  return (
    <View style={styles.fill} ref={gridRef} onLayout={measure}>
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

      {/* Recycle Bin (drop target + opens the bin) */}
      <View ref={binRef} onLayout={measure} style={styles.binWrap}>
        <Pressable onPress={onOpenRecycle} style={styles.binPress}>
          <View style={[styles.binIcon, binHot && styles.binHot]}>
            <Text style={styles.binGlyph}>🗑️</Text>
            {recycleCount > 0 && (
              <View style={styles.binBadge}>
                <Text style={styles.binBadgeText}>{recycleCount}</Text>
              </View>
            )}
          </View>
          <Text style={styles.binLabel}>Recycle Bin</Text>
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  fill: {flex: 1},
  binWrap: {position: 'absolute', left: 8, bottom: 8, width: 84, alignItems: 'center'},
  binPress: {alignItems: 'center'},
  binIcon: {
    width: 56,
    height: 56,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  binHot: {backgroundColor: 'rgba(226,87,76,0.55)', borderColor: '#fff', transform: [{scale: 1.12}]},
  binGlyph: {fontSize: 28},
  binBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#e2574c',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  binBadgeText: {color: '#fff', fontSize: 11, fontWeight: '700'},
  binLabel: {
    color: Vista.text,
    fontSize: 11,
    marginTop: 4,
    textShadowColor: 'rgba(0,0,0,0.75)',
    textShadowOffset: {width: 0, height: 1},
    textShadowRadius: 3,
  },
});

export default Desktop;
