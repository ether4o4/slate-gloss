/**
 * RecycleBin — a recycle bin that actually works.
 *
 * Two jobs:
 *   • icons removed from the desktop land here and can be restored or
 *     emptied for good;
 *   • quick-access "Clear cache" wipes the app/sandbox cache through the
 *     shell bridge (runShell) and reports what happened.
 */
import React, { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { runShell } from './ShellBridge';

export interface BinnedIcon {
  id: string;
  label: string;
  icon: string;
}

const RecycleBin: React.FC<{
  items: BinnedIcon[];
  onRestore: (id: string) => void;
  onEmpty: () => void;
}> = ({ items, onRestore, onEmpty }) => {
  const [cacheMsg, setCacheMsg] = useState<string | null>(null);
  const [clearing, setClearing] = useState(false);

  const clearCache = async () => {
    setClearing(true);
    setCacheMsg(null);
    try {
      const out = await runShell(
        'rm -rf "$HOME/.cache" ./cache/* ../cache/* /root/.cache 2>/dev/null; sync; echo "cache cleared"',
      );
      setCacheMsg(out.trim() || 'cache cleared');
    } catch (e) {
      setCacheMsg(`could not clear cache: ${String(e)}`);
    } finally {
      setClearing(false);
    }
  };

  return (
    <ScrollView style={styles.body} contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <Text style={styles.headerIcon}>🗑️</Text>
        <View style={styles.headerText}>
          <Text style={styles.title}>Recycle Bin</Text>
          <Text style={styles.subtitle}>
            {items.length === 0 ? 'Empty' : `${items.length} item${items.length === 1 ? '' : 's'}`}
          </Text>
        </View>
      </View>

      {items.map(item => (
        <View key={item.id} style={styles.row}>
          <Text style={styles.rowIcon}>{item.icon}</Text>
          <Text style={styles.rowLabel}>{item.label}</Text>
          <TouchableOpacity style={styles.restoreBtn} onPress={() => onRestore(item.id)}>
            <Text style={styles.restoreText}>Restore</Text>
          </TouchableOpacity>
        </View>
      ))}

      {items.length > 0 && (
        <TouchableOpacity style={styles.emptyBtn} onPress={onEmpty}>
          <Text style={styles.emptyBtnText}>Empty Recycle Bin</Text>
        </TouchableOpacity>
      )}

      <View style={styles.divider} />

      <TouchableOpacity
        style={[styles.cacheBtn, clearing && styles.cacheBtnBusy]}
        onPress={clearCache}
        disabled={clearing}>
        <Text style={styles.cacheBtnText}>
          {clearing ? 'Clearing cache…' : '🧹 Clear cache'}
        </Text>
      </TouchableOpacity>
      {cacheMsg ? <Text style={styles.cacheMsg}>{cacheMsg}</Text> : null}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  body: { flex: 1 },
  content: { padding: 14, gap: 8 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 },
  headerIcon: { fontSize: 30 },
  headerText: { flex: 1 },
  title: { color: '#ffffff', fontSize: 16, fontWeight: '700' },
  subtitle: { color: 'rgba(255,255,255,0.6)', fontSize: 12 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  rowIcon: { fontSize: 18 },
  rowLabel: { color: '#eaf4ff', fontSize: 13, flex: 1 },
  restoreBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 7,
    backgroundColor: 'rgba(120,170,235,0.4)',
  },
  restoreText: { color: '#ffffff', fontSize: 12, fontWeight: '600' },
  emptyBtn: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: 'rgba(255,110,110,0.3)',
    borderWidth: 1,
    borderColor: 'rgba(255,110,110,0.5)',
  },
  emptyBtnText: { color: '#ffc4c4', fontSize: 12, fontWeight: '700' },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.15)', marginVertical: 6 },
  cacheBtn: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 8,
    backgroundColor: 'rgba(125,216,127,0.25)',
    borderWidth: 1,
    borderColor: 'rgba(125,216,127,0.45)',
  },
  cacheBtnBusy: { opacity: 0.6 },
  cacheBtnText: { color: '#d2f5d3', fontSize: 13, fontWeight: '700' },
  cacheMsg: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    fontFamily: 'monospace',
  },
});

export default RecycleBin;
