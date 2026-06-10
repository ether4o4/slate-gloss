import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import type { AppInfo } from '../../native/Launcher';
import { Theme } from '../../theme';
import { StartOrb } from './StartOrb';
import { AppIconImage } from './Icon';

interface Props {
  startActive: boolean;
  pinned: AppInfo[];
  colors: string[];
  startIconUri?: string;
  /** Count of open MVE intents, shown as a badge on the MVE button. */
  intentCount?: number;
  onStartPress: () => void;
  onMvePress: () => void;
  onClockPress: () => void;
  onLaunch: (pkg: string) => void;
  onPinMenu: (pkg: string) => void;
}

export const Taskbar: React.FC<Props> = ({
  startActive,
  pinned,
  colors,
  startIconUri,
  intentCount = 0,
  onStartPress,
  onMvePress,
  onClockPress,
  onLaunch,
  onPinMenu,
}) => {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    const toNext = 60000 - (Date.now() % 60000);
    const t = setTimeout(() => {
      setNow(new Date());
      interval = setInterval(() => setNow(new Date()), 60000);
    }, toNext);
    return () => {
      clearTimeout(t);
      clearInterval(interval);
    };
  }, []);

  return (
    <LinearGradient colors={colors} style={styles.bar}>
      <LinearGradient
        colors={['rgba(255,255,255,0.5)', 'rgba(255,255,255,0)']}
        style={styles.topEdge}
        pointerEvents="none"
      />
      <StartOrb
        active={startActive}
        onPress={onStartPress}
        size={48}
        imageUri={startIconUri}
      />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.pinScroll}
        contentContainerStyle={styles.pinContent}
      >
        {pinned.map(app => (
          <Pressable
            key={app.packageName}
            onPress={() => onLaunch(app.packageName)}
            onLongPress={() => onPinMenu(app.packageName)}
            delayLongPress={350}
            style={({ pressed }) => [
              styles.pinBtn,
              pressed && styles.pinPressed,
            ]}
          >
            <AppIconImage app={app} size={34} radius={8} />
          </Pressable>
        ))}
      </ScrollView>

      <Pressable
        onPress={onMvePress}
        style={({ pressed }) => [styles.mve, pressed && styles.pinPressed]}
      >
        <Text style={styles.mveDot}>◎</Text>
        {intentCount > 0 && (
          <View style={styles.mveBadge}>
            <Text style={styles.mveBadgeText}>
              {intentCount > 9 ? '9+' : intentCount}
            </Text>
          </View>
        )}
      </Pressable>

      <Pressable
        onPress={onClockPress}
        style={({ pressed }) => [styles.clock, pressed && styles.pinPressed]}
      >
        <Text style={styles.time}>
          {now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
        <Text style={styles.date}>
          {now.toLocaleDateString([], { month: 'short', day: 'numeric' })}
        </Text>
      </Pressable>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingTop: 6,
    height: 64,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.35)',
    gap: 8,
  },
  topEdge: { position: 'absolute', top: 0, left: 0, right: 0, height: 2 },
  pinScroll: { flex: 1 },
  pinContent: { alignItems: 'center', gap: 6, paddingHorizontal: 4 },
  pinBtn: { padding: 6, borderRadius: 10 },
  pinPressed: { backgroundColor: 'rgba(255,255,255,0.22)' },
  mve: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Theme.border,
  },
  mveDot: { color: '#bfe3ff', fontSize: 18 },
  mveBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 3,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(120,170,235,0.95)',
  },
  mveBadgeText: { color: '#ffffff', fontSize: 9, fontWeight: '700' },
  clock: {
    alignItems: 'flex-end',
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 8,
    minWidth: 56,
  },
  time: { color: Theme.text, fontSize: 15, fontWeight: '600' },
  date: { color: Theme.textDim, fontSize: 11 },
});

export default Taskbar;
