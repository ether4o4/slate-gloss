/**
 * GlassMenu — the long-press context menu for the desktop shell.
 *
 * One component covers both surfaces:
 *   • long-press on empty desktop  → widgets / new folder / edit background
 *   • long-press on an app icon    → remove / app settings
 */
import React from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ThemeStore } from '../theme/themes';

export interface MenuItem {
  label: string;
  icon: string;
  danger?: boolean;
  onPress: () => void;
}

const GlassMenu: React.FC<{
  visible: boolean;
  title?: string;
  items: MenuItem[];
  onClose: () => void;
}> = ({ visible, title, items, onClose }) => {
  const accent = ThemeStore.theme().accent;
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose}>
        <View style={styles.menu}>
          {title ? (
            <Text style={[styles.title, { color: accent }]} numberOfLines={1}>
              {title}
            </Text>
          ) : null}
          {items.map(item => (
            <TouchableOpacity
              key={item.label}
              style={styles.row}
              activeOpacity={0.7}
              onPress={() => {
                onClose();
                item.onPress();
              }}>
              <Text style={styles.rowIcon}>{item.icon}</Text>
              <Text style={[styles.rowLabel, item.danger && styles.rowDanger]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menu: {
    minWidth: 230,
    maxWidth: 320,
    borderRadius: 10,
    paddingVertical: 6,
    backgroundColor: 'rgba(30,45,70,0.92)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  title: {
    fontSize: 12,
    fontWeight: '700',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.15)',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  rowIcon: { fontSize: 16 },
  rowLabel: { color: '#eaf4ff', fontSize: 14, fontWeight: '500' },
  rowDanger: { color: '#ff9d9d' },
});

export default GlassMenu;
