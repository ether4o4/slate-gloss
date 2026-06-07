import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {
  ActivityIndicator,
  AppState,
  Modal,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';

import {Vista} from './src/theme';
import {Taskbar} from './src/components/vista/Taskbar';
import {StartMenu} from './src/components/vista/StartMenu';
import {AppGrid} from './src/components/vista/AppGrid';
import SwarmChatWindow from './src/components/SwarmChatWindow';
import {
  getApps,
  isDefaultLauncher,
  isLauncherAvailable,
  type AppInfo,
} from './src/native/Launcher';

const STATUS_BAR_HEIGHT = StatusBar.currentHeight ?? 0;

const App: React.FC = () => {
  const [apps, setApps] = useState<AppInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [startOpen, setStartOpen] = useState(false);
  const [swarmOpen, setSwarmOpen] = useState(false);
  const [isDefault, setIsDefault] = useState(false);

  const loadApps = useCallback(async () => {
    setLoading(true);
    const list = await getApps();
    setApps(list);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadApps();
    isDefaultLauncher().then(setIsDefault);
  }, [loadApps]);

  // Refresh the "default launcher" badge when returning from settings.
  useEffect(() => {
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') {
        isDefaultLauncher().then(setIsDefault);
      }
    });
    return () => sub.remove();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      return apps;
    }
    return apps.filter(a => a.label.toLowerCase().includes(q));
  }, [apps, query]);

  const header = (
    <View style={styles.headerArea}>
      <Text style={styles.brand}>Vista</Text>
      <View style={styles.searchWrap}>
        <Text style={styles.searchIcon}>⌕</Text>
        <TextInput
          style={styles.search}
          value={query}
          onChangeText={setQuery}
          placeholder="Search apps…"
          placeholderTextColor={Vista.textDim}
          autoCorrect={false}
          clearButtonMode="while-editing"
        />
      </View>
    </View>
  );

  const empty = (
    <View style={styles.empty}>
      {loading ? (
        <>
          <ActivityIndicator color="#bfe3ff" />
          <Text style={styles.emptyText}>Loading apps…</Text>
        </>
      ) : (
        <Text style={styles.emptyText}>
          {isLauncherAvailable()
            ? query
              ? 'No apps match your search.'
              : 'No apps found.'
            : 'App list is only available in the Android build.'}
        </Text>
      )}
    </View>
  );

  return (
    <View style={styles.root}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

      {/* Subtle Aero vignette over the wallpaper for depth + contrast. */}
      <LinearGradient
        colors={Vista.vignette}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      <View style={styles.body}>
        <AppGrid
          apps={filtered}
          ListHeaderComponent={header}
          ListEmptyComponent={empty}
        />
      </View>

      <Taskbar
        startActive={startOpen}
        onStartPress={() => setStartOpen(v => !v)}
        onSwarmPress={() => setSwarmOpen(true)}
      />

      <StartMenu
        visible={startOpen}
        onClose={() => setStartOpen(false)}
        onOpenSwarm={() => setSwarmOpen(true)}
        onRefreshApps={loadApps}
        isDefaultLauncher={isDefault}
        appCount={apps.length}
      />

      <Modal
        visible={swarmOpen}
        animationType="slide"
        onRequestClose={() => setSwarmOpen(false)}>
        <SwarmChatWindow onClose={() => setSwarmOpen(false)} />
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: 'transparent'},
  body: {flex: 1, paddingTop: STATUS_BAR_HEIGHT},
  headerArea: {paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8},
  brand: {
    color: Vista.text,
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 12,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: {width: 0, height: 1},
    textShadowRadius: 4,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderRadius: 22,
    paddingHorizontal: 16,
    height: 44,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Vista.border,
  },
  searchIcon: {color: Vista.textDim, fontSize: 18},
  search: {flex: 1, color: Vista.text, fontSize: 15, padding: 0},
  empty: {alignItems: 'center', justifyContent: 'center', paddingVertical: 80, gap: 12},
  emptyText: {color: Vista.textDim, fontSize: 14, textAlign: 'center', paddingHorizontal: 32},
});

export default App;
