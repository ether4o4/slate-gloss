import React from 'react';
import {Alert, FlatList, Modal, Pressable, StyleSheet, Text, View} from 'react-native';
import type {AppInfo} from '../../native/Launcher';
import type {RecycleItem} from '../../db/LauncherStore';
import {GlassSurface} from './GlassSurface';
import {AppIconImage} from './Icon';
import {Vista} from '../../theme';

interface Props {
  visible: boolean;
  items: RecycleItem[];
  apps: Record<string, AppInfo>;
  onClose: () => void;
  onRestore: (pkg: string) => void;
  onEmpty: () => void;
  onUninstall: (pkg: string) => void;
}

export const RecycleBin: React.FC<Props> = ({
  visible,
  items,
  apps,
  onClose,
  onRestore,
  onEmpty,
  onUninstall,
}) => {
  const confirmEmpty = () => {
    if (items.length === 0) return;
    Alert.alert('Empty Recycle Bin', 'Remove all items from the bin?', [
      {text: 'Cancel', style: 'cancel'},
      {text: 'Empty', style: 'destructive', onPress: onEmpty},
    ]);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable onPress={() => {}} style={styles.center}>
          <GlassSurface radius={18} style={styles.card}>
            <View style={styles.header}>
              <Text style={styles.title}>🗑️ Recycle Bin</Text>
              <Pressable onPress={onClose} hitSlop={12}>
                <Text style={styles.close}>✕</Text>
              </Pressable>
            </View>

            <FlatList
              data={items}
              keyExtractor={i => i.packageName}
              style={styles.list}
              ListEmptyComponent={<Text style={styles.empty}>The Recycle Bin is empty.</Text>}
              renderItem={({item}) => {
                const app = apps[item.packageName];
                return (
                  <View style={styles.row}>
                    <AppIconImage app={app} size={38} radius={9} />
                    <Text style={styles.rowLabel} numberOfLines={1}>
                      {app?.label ?? item.packageName}
                    </Text>
                    <Pressable onPress={() => onRestore(item.packageName)} style={styles.action}>
                      <Text style={styles.actionText}>Restore</Text>
                    </Pressable>
                    <Pressable onPress={() => onUninstall(item.packageName)} style={styles.action}>
                      <Text style={[styles.actionText, {color: Vista.danger}]}>Uninstall</Text>
                    </Pressable>
                  </View>
                );
              }}
            />

            <Pressable onPress={confirmEmpty} style={[styles.emptyBtn, items.length === 0 && styles.disabled]}>
              <Text style={styles.emptyBtnText}>Empty Recycle Bin</Text>
            </Pressable>
          </GlassSurface>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: 20},
  center: {maxHeight: '80%'},
  card: {padding: 16},
  header: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10},
  title: {color: Vista.text, fontSize: 18, fontWeight: '700'},
  close: {color: Vista.text, fontSize: 18},
  list: {maxHeight: 360},
  empty: {color: Vista.textDim, textAlign: 'center', paddingVertical: 28},
  row: {flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8},
  rowLabel: {flex: 1, color: Vista.text, fontSize: 14},
  action: {paddingHorizontal: 8, paddingVertical: 4},
  actionText: {color: '#9cc2ff', fontWeight: '600', fontSize: 13},
  emptyBtn: {
    marginTop: 12,
    backgroundColor: 'rgba(226,87,76,0.85)',
    borderRadius: 12,
    paddingVertical: 11,
    alignItems: 'center',
  },
  disabled: {opacity: 0.4},
  emptyBtnText: {color: '#fff', fontWeight: '700'},
});

export default RecycleBin;
