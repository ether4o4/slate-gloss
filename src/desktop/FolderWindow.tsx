/**
 * FolderWindow — contents for desktop folders.
 *
 * Used by the Google and Microsoft icon folders (a grid of shell icons that
 * each deep-link to their app on the Play Store) and by user-created desktop
 * folders (which start empty).
 */
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
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
            <View style={styles.tileIconBox}>
              <Text style={styles.tileIcon}>{app.icon}</Text>
            </View>
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
