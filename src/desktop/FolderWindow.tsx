/**
 * FolderWindow — contents for desktop folders.
 *
 * Used by the Google and Microsoft icon folders (a grid of shell icons that
 * each deep-link to their app on the Play Store) and by user-created desktop
 * folders (which start empty).
 */
import React from 'react';
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { StoreApp, openPlayStore } from './storeLinks';

const FolderWindow: React.FC<{ apps: StoreApp[]; emptyHint?: string }> = ({
  apps,
  emptyHint,
}) => (
  <ScrollView style={styles.body} contentContainerStyle={styles.content}>
    {apps.length === 0 ? (
      <Text style={styles.empty}>
        {emptyHint ?? 'This folder is empty.'}
      </Text>
    ) : (
      <View style={styles.grid}>
        {apps.map(app => (
          <TouchableOpacity
            key={app.pkg}
            style={styles.tile}
            activeOpacity={0.75}
            onPress={() => openPlayStore(app.pkg)}>
            {app.image ? (
              <Image source={app.image} style={styles.tileImg} resizeMode="contain" />
            ) : app.tile ? (
              <LinearGradient
                colors={app.tile.colors}
                start={{ x: 0.1, y: 0 }}
                end={{ x: 0.9, y: 1 }}
                style={styles.glossTile}
              >
                <LinearGradient
                  colors={['rgba(255,255,255,0.55)', 'rgba(255,255,255,0.05)']}
                  style={styles.glossSheen}
                  pointerEvents="none"
                />
                <Text style={styles.glossGlyph}>{app.tile.glyph}</Text>
              </LinearGradient>
            ) : (
              <View style={styles.tileIconBox}>
                <Text style={styles.tileIcon}>{app.icon}</Text>
              </View>
            )}
            <Text style={styles.tileLabel} numberOfLines={1}>
              {app.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    )}
  </ScrollView>
);

const styles = StyleSheet.create({
  body: { flex: 1 },
  content: { padding: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  tile: { width: 64, alignItems: 'center', gap: 4 },
  tileIconBox: {
    width: 46,
    height: 46,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileIcon: { fontSize: 22 },
  // Glossy macOS-style squircle: brand gradient + top sheen + bold glyph.
  glossTile: {
    width: 46,
    height: 46,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.45)',
    elevation: 3,
  },
  glossSheen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 22,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  glossGlyph: {
    color: '#ffffff',
    fontSize: 19,
    fontWeight: '800',
    textShadowColor: 'rgba(0,0,0,0.35)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  tileImg: { width: 46, height: 46 },
  tileLabel: {
    color: '#ffffff',
    fontSize: 10,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  empty: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 24,
  },
});

export default FolderWindow;
