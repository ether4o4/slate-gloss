import React from 'react';
import { Modal, Pressable, StyleSheet, Text } from 'react-native';
import { GlassSurface } from './GlassSurface';
import { Theme } from '../../theme';

export interface MenuItem {
  label: string;
  onPress: () => void;
  icon?: string;
  danger?: boolean;
}

interface Props {
  visible: boolean;
  title?: string;
  items: MenuItem[];
  onClose: () => void;
}

/** A styled long-press / right-click context menu (replaces stacked Alerts). */
export const ContextMenu: React.FC<Props> = ({
  visible,
  title,
  items,
  onClose,
}) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable onPress={() => {}} style={styles.cardWrap}>
          <GlassSurface radius={16} style={styles.card}>
            {!!title && (
              <Text style={styles.title} numberOfLines={1}>
                {title}
              </Text>
            )}
            {items.map((item, i) => (
              <Pressable
                key={`${item.label}-${i}`}
                onPress={() => {
                  onClose();
                  item.onPress();
                }}
                style={({ pressed }) => [
                  styles.row,
                  pressed && styles.rowPressed,
                ]}
              >
                {!!item.icon && <Text style={styles.icon}>{item.icon}</Text>}
                <Text style={[styles.label, item.danger && styles.danger]}>
                  {item.label}
                </Text>
              </Pressable>
            ))}
          </GlassSurface>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    padding: 36,
  },
  cardWrap: { alignSelf: 'center', minWidth: 240, maxWidth: 320 },
  card: { paddingVertical: 8, paddingHorizontal: 6 },
  title: {
    color: Theme.textDim,
    fontSize: 12,
    fontWeight: '700',
    paddingHorizontal: 12,
    paddingTop: 6,
    paddingBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 13,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  rowPressed: { backgroundColor: 'rgba(255,255,255,0.16)' },
  icon: { fontSize: 17, width: 22, textAlign: 'center' },
  label: { color: Theme.text, fontSize: 16, fontWeight: '500' },
  danger: { color: Theme.danger },
});

export default ContextMenu;
