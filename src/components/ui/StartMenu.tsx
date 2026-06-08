import React, {useEffect, useMemo, useRef, useState} from 'react';
import {
  Dimensions,
  FlatList,
  Modal,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type {AppInfo} from '../../native/Launcher';
import {GlassSurface} from './GlassSurface';
import {AppIconImage} from './Icon';
import {Theme} from '../../theme';

interface Props {
  visible: boolean;
  apps: AppInfo[];
  appsByPkg: Record<string, AppInfo>;
  pinned: string[];
  recents: string[];
  size: {width: number; height: number};
  onClose: () => void;
  onLaunch: (pkg: string) => void;
  onItemMenu: (pkg: string) => void;
  onResize: (width: number, height: number) => void;
  onPersonalize: () => void;
  onSetDefault: () => void;
  onOpenSwarm: () => void;
}

const screen = Dimensions.get('window');
const DEFAULT_W = Math.min(screen.width - 20, 620);
// Tall by default so the search bar (at the top of the panel) always sits above
// the soft keyboard — the panel itself never moves, which keeps it rock-steady.
const DEFAULT_H = Math.min(Math.round(screen.height * 0.82), screen.height - 110);
const MIN_W = 300;
const MIN_H = 380;
const MAX_W = screen.width - 12;
const MAX_H = screen.height - 96;

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

const ProgramRow: React.FC<{
  app: AppInfo;
  onLaunch: () => void;
  onMenu: () => void;
}> = ({app, onLaunch, onMenu}) => (
  <Pressable
    onPress={onLaunch}
    onLongPress={onMenu}
    delayLongPress={350}
    style={({pressed}) => [styles.progRow, pressed && styles.rowPressed]}>
    <AppIconImage app={app} size={34} radius={8} />
    <Text style={styles.progLabel} numberOfLines={1}>
      {app.label}
    </Text>
  </Pressable>
);

export const StartMenu: React.FC<Props> = ({
  visible,
  apps,
  appsByPkg,
  pinned,
  recents,
  size,
  onClose,
  onLaunch,
  onItemMenu,
  onResize,
  onPersonalize,
  onSetDefault,
  onOpenSwarm,
}) => {
  const [query, setQuery] = useState('');
  const [dims, setDims] = useState({
    w: size.width || DEFAULT_W,
    h: size.height || DEFAULT_H,
  });
  const start = useRef({w: 0, h: 0});

  // Ref copy so the (memoised) PanResponder always sees the current dims.
  const dimsRef = useRef(dims);
  dimsRef.current = dims;

  useEffect(() => {
    if (visible) {
      setQuery('');
      setDims({w: size.width || DEFAULT_W, h: size.height || DEFAULT_H});
    }
  }, [visible, size.width, size.height]);

  const resizer = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        start.current = {...dimsRef.current};
      },
      onPanResponderMove: (_e, g) => {
        const w = clamp(start.current.w + g.dx, MIN_W, MAX_W);
        const h = clamp(start.current.h - g.dy, MIN_H, MAX_H);
        setDims({w, h});
      },
      onPanResponderRelease: () => {
        onResize(Math.round(dimsRef.current.w), Math.round(dimsRef.current.h));
      },
    }),
  ).current;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? apps.filter(a => a.label.toLowerCase().includes(q)) : apps;
  }, [apps, query]);

  // Stable height (never reacts to the keyboard); the panel is tall enough that
  // the search bar stays above the keyboard and the list just scrolls underneath.
  const renderH = Math.max(MIN_H, Math.min(dims.h, MAX_H));

  const pinnedApps = pinned.map(p => appsByPkg[p]).filter(Boolean) as AppInfo[];
  const recentApps = recents.map(p => appsByPkg[p]).filter(Boolean) as AppInfo[];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable
          onPress={() => {}}
          style={[styles.panelWrap, {width: dims.w, height: renderH, marginBottom: 72}]}>
          <GlassSurface radius={18} style={styles.panel}>
            {/* resize handle (top-right corner) */}
            <View {...resizer.panHandlers} style={styles.resizeHandle}>
              <Text style={styles.resizeGlyph}>⤡</Text>
            </View>

            <Text style={styles.brand}>Start</Text>

            <View style={styles.columns}>
              {/* LEFT: all programs */}
              <View style={styles.left}>
                <TextInput
                  style={styles.search}
                  value={query}
                  onChangeText={setQuery}
                  placeholder="Search programs…"
                  placeholderTextColor={Theme.textDim}
                  autoCorrect={false}
                />
                <FlatList
                  data={filtered}
                  keyExtractor={a => a.packageName}
                  renderItem={({item}) => (
                    <ProgramRow
                      app={item}
                      onLaunch={() => onLaunch(item.packageName)}
                      onMenu={() => onItemMenu(item.packageName)}
                    />
                  )}
                  showsVerticalScrollIndicator
                  keyboardShouldPersistTaps="handled"
                  initialNumToRender={30}
                  maxToRenderPerBatch={30}
                  windowSize={21}
                  removeClippedSubviews={false}
                />
              </View>

              <View style={styles.vDivider} />

              {/* RIGHT: pinned + recents */}
              <View style={styles.right}>
                <FlatList
                  data={[] as AppInfo[]}
                  renderItem={() => null}
                  keyExtractor={(_, i) => String(i)}
                  ListHeaderComponent={
                    <View>
                      <Text style={styles.sectionTitle}>Pinned</Text>
                      {pinnedApps.length === 0 ? (
                        <Text style={styles.hint}>Long-press an app → Pin.</Text>
                      ) : (
                        pinnedApps.map(a => (
                          <ProgramRow
                            key={a.packageName}
                            app={a}
                            onLaunch={() => onLaunch(a.packageName)}
                            onMenu={() => onItemMenu(a.packageName)}
                          />
                        ))
                      )}
                      <Text style={[styles.sectionTitle, {marginTop: 12}]}>Recent</Text>
                      {recentApps.length === 0 ? (
                        <Text style={styles.hint}>Recently opened apps appear here.</Text>
                      ) : (
                        recentApps.map(a => (
                          <ProgramRow
                            key={a.packageName}
                            app={a}
                            onLaunch={() => onLaunch(a.packageName)}
                            onMenu={() => onItemMenu(a.packageName)}
                          />
                        ))
                      )}
                    </View>
                  }
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                />
              </View>
            </View>

            {/* footer actions */}
            <View style={styles.footer}>
              <FooterBtn icon="✦" label="Swarm" onPress={onOpenSwarm} />
              <FooterBtn icon="🎨" label="Personalize" onPress={onPersonalize} />
              <FooterBtn icon="⚙" label="Default" onPress={onSetDefault} />
            </View>
          </GlassSurface>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const FooterBtn: React.FC<{icon: string; label: string; onPress: () => void}> = ({
  icon,
  label,
  onPress,
}) => (
  <Pressable onPress={onPress} style={({pressed}) => [styles.footerBtn, pressed && styles.rowPressed]}>
    <Text style={styles.footerIcon}>{icon}</Text>
    <Text style={styles.footerLabel}>{label}</Text>
  </Pressable>
);

const styles = StyleSheet.create({
  overlay: {flex: 1, justifyContent: 'flex-end', alignItems: 'flex-start', backgroundColor: 'rgba(0,0,0,0.35)'},
  panelWrap: {marginLeft: 8, marginBottom: 72},
  panel: {flex: 1, padding: 14},
  resizeHandle: {position: 'absolute', top: 0, right: 0, width: 40, height: 40, alignItems: 'center', justifyContent: 'center', zIndex: 5},
  resizeGlyph: {color: Theme.textDim, fontSize: 16, transform: [{rotate: '90deg'}]},
  brand: {color: Theme.text, fontSize: 20, fontWeight: '800', marginBottom: 10},
  columns: {flex: 1, flexDirection: 'row'},
  left: {flex: 1.3},
  right: {flex: 1, paddingLeft: 4},
  vDivider: {width: StyleSheet.hairlineWidth, backgroundColor: Theme.borderSoft, marginHorizontal: 8},
  search: {
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: Theme.text,
    fontSize: 14,
    marginBottom: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Theme.borderSoft,
  },
  progRow: {flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 7, paddingHorizontal: 6, borderRadius: 8},
  rowPressed: {backgroundColor: 'rgba(255,255,255,0.16)'},
  progLabel: {flex: 1, color: Theme.text, fontSize: 14},
  sectionTitle: {color: Theme.textDim, fontSize: 12, fontWeight: '700', marginBottom: 4, textTransform: 'uppercase'},
  hint: {color: Theme.textDim, fontSize: 12, fontStyle: 'italic'},
  footer: {flexDirection: 'row', justifyContent: 'space-around', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Theme.borderSoft, paddingTop: 10, marginTop: 8},
  footerBtn: {alignItems: 'center', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 10},
  footerIcon: {color: '#bfe3ff', fontSize: 18},
  footerLabel: {color: Theme.text, fontSize: 12, marginTop: 2},
});

export default StartMenu;
