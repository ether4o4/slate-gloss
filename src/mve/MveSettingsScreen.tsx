/**
 * MveSettingsScreen — the "MVE" tab opened from the NeverSoft start menu.
 *
 * Surfaces MVE's own engine configuration in the NeverSoft look: provider
 * instances (enable/disable, API keys) and the core toggles (Linux sandbox,
 * 24/7 daemon). All values are read from and written to the MVE engine through
 * {@link MveBridge}; nothing is stored here. Richer settings (MCP servers, agent
 * rules, memory, heartbeat) hang off the same bridge and can be added as further
 * sections without new plumbing.
 */
import React, { useEffect, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { MveBridge, SandboxStatus, ServiceInstance, isNative } from './MveBridge';

const MveSettingsScreen: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [services, setServices] = useState<ServiceInstance[]>([]);
  const [keys, setKeys] = useState<Record<string, string>>({});
  const [sandbox, setSandbox] = useState(false);
  const [daemon, setDaemon] = useState(false);
  const [sbStatus, setSbStatus] = useState<SandboxStatus | null>(null);

  const refreshSandbox = async () => {
    setSbStatus(await MveBridge.sandboxStatus());
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [svc, sb, dm, st] = await Promise.all([
        MveBridge.services(),
        MveBridge.isSandboxEnabled(),
        MveBridge.isDaemonEnabled(),
        MveBridge.sandboxStatus(),
      ]);
      if (cancelled) return;
      setServices(svc);
      setSandbox(sb);
      setDaemon(dm);
      setSbStatus(st);
      const loaded: Record<string, string> = {};
      await Promise.all(
        svc.map(async s => {
          loaded[s.instanceId] = await MveBridge.getApiKey(s.instanceId);
        }),
      );
      if (!cancelled) setKeys(loaded);
    })().catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const toggleService = async (s: ServiceInstance, enabled: boolean) => {
    setServices(prev =>
      prev.map(x => (x.instanceId === s.instanceId ? { ...x, enabled } : x)),
    );
    await MveBridge.setServiceEnabled(s.instanceId, enabled);
  };

  const commitKey = async (instanceId: string) => {
    await MveBridge.setApiKey(instanceId, keys[instanceId] ?? '');
  };

  return (
    <View style={styles.panel}>
      <View style={styles.titleRow}>
        <Text style={styles.title}>MVE Settings</Text>
        <TouchableOpacity onPress={onClose}>
          <Text style={styles.close}>✕</Text>
        </TouchableOpacity>
      </View>

      {!isNative && (
        <Text style={styles.mockBanner}>Engine not linked — showing mock data</Text>
      )}

      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.section}>Providers</Text>
        {services.map(s => (
          <View key={s.instanceId} style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>{s.displayName}</Text>
              <Switch
                value={s.enabled}
                onValueChange={v => toggleService(s, v)}
              />
            </View>
            <TextInput
              style={styles.keyInput}
              value={keys[s.instanceId] ?? ''}
              onChangeText={t => setKeys(prev => ({ ...prev, [s.instanceId]: t }))}
              onBlur={() => commitKey(s.instanceId)}
              placeholder="API key"
              placeholderTextColor="#7f9bbd"
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
        ))}
        {services.length === 0 && (
          <Text style={styles.empty}>No providers configured yet.</Text>
        )}

        <Text style={styles.section}>System</Text>
        <ToggleRow
          label="Linux sandbox"
          hint="Embedded shell, file manager, package manager"
          value={sandbox}
          onChange={async v => {
            setSandbox(v);
            await MveBridge.setSandboxEnabled(v);
            await refreshSandbox();
          }}
        />
        {sbStatus && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.flex}>
                <Text style={styles.cardTitle}>Sandbox status</Text>
                <Text style={styles.hint}>{sbStatus.statusText}</Text>
              </View>
              {!sbStatus.installed && (
                <TouchableOpacity
                  style={styles.setupBtn}
                  onPress={async () => {
                    await MveBridge.setupSandbox();
                    await refreshSandbox();
                  }}>
                  <Text style={styles.setupBtnText}>Setup</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
        <ToggleRow
          label="Daemon (24/7 background)"
          hint="Keep the engine running for scheduled tasks and heartbeat"
          value={daemon}
          onChange={async v => {
            setDaemon(v);
            await MveBridge.setDaemonEnabled(v);
          }}
        />
      </ScrollView>
    </View>
  );
};

const ToggleRow: React.FC<{
  label: string;
  hint: string;
  value: boolean;
  onChange: (v: boolean) => void;
}> = ({ label, hint, value, onChange }) => (
  <View style={styles.card}>
    <View style={styles.cardHeader}>
      <View style={styles.flex}>
        <Text style={styles.cardTitle}>{label}</Text>
        <Text style={styles.hint}>{hint}</Text>
      </View>
      <Switch value={value} onValueChange={onChange} />
    </View>
  </View>
);

const styles = StyleSheet.create({
  panel: {
    width: '92%',
    maxWidth: 460,
    maxHeight: '82%',
    backgroundColor: 'rgba(20,40,70,0.96)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    overflow: 'hidden',
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.18)',
  },
  title: { color: '#eaf4ff', fontSize: 18, fontWeight: '700' },
  close: { color: '#cfe0f2', fontSize: 18 },
  mockBanner: {
    color: '#ffd9a0',
    fontSize: 11,
    textAlign: 'center',
    paddingVertical: 4,
    backgroundColor: 'rgba(120,80,0,0.25)',
  },
  scroll: { padding: 16, gap: 10 },
  section: {
    color: '#9fc0e6',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 6,
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 10,
    padding: 12,
    gap: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardTitle: { color: '#f2f8ff', fontSize: 15, fontWeight: '600' },
  hint: { color: '#9db8d6', fontSize: 11, marginTop: 2 },
  flex: { flex: 1, paddingRight: 12 },
  keyInput: {
    color: '#ffffff',
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
  },
  empty: { color: '#9db8d6', fontSize: 13, fontStyle: 'italic' },
  setupBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(120,170,235,0.6)',
  },
  setupBtnText: { color: '#ffffff', fontWeight: '700', fontSize: 13 },
});

export default MveSettingsScreen;
