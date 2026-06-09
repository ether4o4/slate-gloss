/**
 * BrowserPicker — what the WWW / Internet desktop icon opens.
 *
 * A curated list of browsers to install, leading with the rarer picks
 * (Kiwi, Firefox Nightly) per the house style; every row deep-links to
 * that exact app on the Play Store, with a search fallback at the bottom
 * for anything else.
 */
import React from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { BROWSERS, openPlayStore, openPlayStoreSearch } from './storeLinks';

const BrowserPicker: React.FC<{ visible: boolean; onClose: () => void }> = ({
  visible,
  onClose,
}) => (
  <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
    <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose}>
      <View style={styles.panel}>
        <Text style={styles.title}>🌐 Choose a browser</Text>
        <Text style={styles.subtitle}>Tap one to grab it from the Play Store</Text>
        <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
          {BROWSERS.map(b => (
            <TouchableOpacity
              key={b.pkg}
              style={styles.row}
              activeOpacity={0.75}
              onPress={() => {
                onClose();
                openPlayStore(b.pkg);
              }}>
              <Text style={styles.rowIcon}>{b.icon}</Text>
              <View style={styles.rowText}>
                <Text style={styles.rowLabel}>{b.label}</Text>
                {b.note ? <Text style={styles.rowNote}>{b.note}</Text> : null}
              </View>
              <Text style={styles.rowGo}>⇣</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            style={[styles.row, styles.moreRow]}
            activeOpacity={0.75}
            onPress={() => {
              onClose();
              openPlayStoreSearch('web browser');
            }}>
            <Text style={styles.rowIcon}>🛍️</Text>
            <View style={styles.rowText}>
              <Text style={styles.rowLabel}>Something different…</Text>
              <Text style={styles.rowNote}>browse all browsers on the Play Store</Text>
            </View>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </TouchableOpacity>
  </Modal>
);

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  panel: {
    width: '100%',
    maxWidth: 360,
    maxHeight: '75%',
    borderRadius: 12,
    backgroundColor: 'rgba(28,42,66,0.95)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
    padding: 14,
  },
  title: { color: '#ffffff', fontSize: 17, fontWeight: '700' },
  subtitle: { color: 'rgba(255,255,255,0.6)', fontSize: 12, marginBottom: 10 },
  list: { flexGrow: 0 },
  listContent: { gap: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  moreRow: { backgroundColor: 'rgba(120,170,235,0.18)' },
  rowIcon: { fontSize: 22 },
  rowText: { flex: 1 },
  rowLabel: { color: '#eaf4ff', fontSize: 14, fontWeight: '600' },
  rowNote: { color: 'rgba(255,255,255,0.55)', fontSize: 11 },
  rowGo: { color: '#9ed0ff', fontSize: 16, fontWeight: '700' },
});

export default BrowserPicker;
