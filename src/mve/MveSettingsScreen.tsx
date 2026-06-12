/**
 * MveSettingsScreen — the full MVE engine control panel.
 *
 * Surfaces every engine setting the old MVE exposed, wired to real on-device
 * persistence through {@link MveBridge}: provider services + keys, the Soul
 * (custom system prompt), Linux sandbox, Heartbeat, Daemon, Memories, MCP
 * servers, Budget (token cap + kill switch), generation params, and settings
 * export/import. Nothing is stored in this component; it reads and writes the
 * bridge, which the agent loop consumes.
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  ScrollView,
  Share,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  MveBridge,
  type Budget,
  type Generation,
  type HeartbeatConfig,
  type Memory,
  type McpServer,
  type SandboxStatus,
  type ServiceInstance,
  isNative,
} from './MveBridge';

const MveSettingsScreen: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  // Services + keys + model overrides
  const [services, setServices] = useState<ServiceInstance[]>([]);
  const [keys, setKeys] = useState<Record<string, string>>({});
  const [models, setModels] = useState<Record<string, string>>({});

  // Core
  const [sandbox, setSandbox] = useState(false);
  const [sbStatus, setSbStatus] = useState<SandboxStatus | null>(null);
  const [daemon, setDaemon] = useState(false);

  // Heartbeat
  const [hbEnabled, setHbEnabled] = useState(false);
  const [hb, setHb] = useState<HeartbeatConfig>({
    intervalMinutes: 60,
    activeStartHour: 8,
    activeEndHour: 22,
  });

  // Soul + generation + budget
  const [soul, setSoul] = useState('');
  const [gen, setGen] = useState<Generation>({
    temperature: 0.7,
    showReasoning: false,
    maxAgentSteps: 6,
  });
  const [budget, setBudget] = useState<Budget>({
    dailyTokenCap: 0,
    tokensUsedToday: 0,
    autonomyPaused: false,
  });

  // Memories + MCP
  const [memories, setMemories] = useState<Memory[]>([]);
  const [memKey, setMemKey] = useState('');
  const [memContent, setMemContent] = useState('');
  const [mcp, setMcp] = useState<McpServer[]>([]);
  const [mcpName, setMcpName] = useState('');
  const [mcpUrl, setMcpUrl] = useState('');

  const refreshSandbox = useCallback(async () => {
    setSbStatus(await MveBridge.sandboxStatus());
  }, []);

  const refreshMemories = useCallback(async () => {
    setMemories(await MveBridge.getMemories());
  }, []);

  const refreshMcp = useCallback(async () => {
    setMcp(await MveBridge.getMcpServers());
  }, []);

  const refreshBudget = useCallback(async () => {
    setBudget(await MveBridge.getBudget());
  }, []);

  const runLongTask = useCallback(
    async (task: () => Promise<void>) => {
      const timer = setInterval(() => {
        refreshSandbox().catch(() => {});
      }, 1000);
      try {
        await task();
      } catch {
        // status line carries the error on the next refresh
      } finally {
        clearInterval(timer);
        await refreshSandbox().catch(() => {});
      }
    },
    [refreshSandbox],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [svc, sb, dm, hbe, hbc, sl, gn, bd, mem, servers] = await Promise.all([
        MveBridge.services(),
        MveBridge.isSandboxEnabled(),
        MveBridge.isDaemonEnabled(),
        MveBridge.isHeartbeatEnabled(),
        MveBridge.getHeartbeatConfig(),
        MveBridge.getSoul(),
        MveBridge.getGeneration(),
        MveBridge.getBudget(),
        MveBridge.getMemories(),
        MveBridge.getMcpServers(),
      ]);
      if (cancelled) return;
      setServices(svc);
      setSandbox(sb);
      setDaemon(dm);
      setHbEnabled(hbe);
      setHb(hbc);
      setSoul(sl);
      setGen(gn);
      setBudget(bd);
      setMemories(mem);
      setMcp(servers);
      const loaded: Record<string, string> = {};
      await Promise.all(
        svc.map(async s => {
          loaded[s.instanceId] = await MveBridge.getApiKey(s.instanceId);
        }),
      );
      setSbStatus(await MveBridge.sandboxStatus());
      if (!cancelled) setKeys(loaded);
    })().catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const addMemory = useCallback(async () => {
    if (!memKey.trim() || !memContent.trim()) return;
    await MveBridge.addMemory(memKey.trim(), memContent.trim(), 'general');
    setMemKey('');
    setMemContent('');
    refreshMemories();
  }, [memKey, memContent, refreshMemories]);

  const addMcp = useCallback(async () => {
    if (!mcpName.trim() || !mcpUrl.trim()) return;
    await MveBridge.addMcpServer(mcpName.trim(), mcpUrl.trim());
    setMcpName('');
    setMcpUrl('');
    refreshMcp();
  }, [mcpName, mcpUrl, refreshMcp]);

  const doExport = useCallback(async () => {
    const json = await MveBridge.exportSettings();
    Share.share({ message: json }).catch(() => {});
  }, []);

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.title}>MVE Settings</Text>
        <TouchableOpacity onPress={onClose} hitSlop={12}>
          <Text style={styles.close}>✕</Text>
        </TouchableOpacity>
      </View>

      {!isNative && (
        <Text style={styles.mockBanner}>
          Engine not linked — settings shown from the mock.
        </Text>
      )}

      <ScrollView contentContainerStyle={styles.content}>
        {/* ── Services ── */}
        <Section label="Providers">
          <Text style={styles.hint}>
            Enable any you have keys for — MVE falls back down the list when
            one fails. Free needs no key.
          </Text>
          {services.map(s => (
            <View key={s.instanceId} style={styles.card}>
              <View style={styles.rowBetween}>
                <View style={styles.flex}>
                  <Text style={styles.cardTitle}>{s.displayName}</Text>
                  {!!s.apiKeyUrl && (
                    <Text style={styles.hint} numberOfLines={1}>
                      keys: {s.apiKeyUrl.replace('https://', '')}
                    </Text>
                  )}
                </View>
                <Switch
                  value={s.enabled}
                  onValueChange={async v => {
                    await MveBridge.setServiceEnabled(s.instanceId, v);
                    setServices(prev =>
                      prev.map(x =>
                        x.instanceId === s.instanceId ? { ...x, enabled: v } : x,
                      ),
                    );
                  }}
                />
              </View>
              {!s.keyless && (
                <TextInput
                  style={styles.input}
                  value={keys[s.instanceId] ?? ''}
                  onChangeText={t => setKeys(k => ({ ...k, [s.instanceId]: t }))}
                  onEndEditing={() =>
                    MveBridge.setApiKey(s.instanceId, keys[s.instanceId] ?? '')
                  }
                  placeholder="API key"
                  placeholderTextColor="#7d97b5"
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              )}
              <TextInput
                style={styles.input}
                value={models[s.instanceId] ?? s.model ?? ''}
                onChangeText={t => setModels(m => ({ ...m, [s.instanceId]: t }))}
                onEndEditing={() =>
                  MveBridge.setServiceModel(
                    s.instanceId,
                    models[s.instanceId] ?? '',
                  )
                }
                placeholder="Model (blank = default)"
                placeholderTextColor="#7d97b5"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          ))}
        </Section>

        {/* ── Soul ── */}
        <Section label="Soul (custom directive)">
          <Text style={styles.hint}>
            Extra instructions prepended to the system prompt on every message.
          </Text>
          <TextInput
            style={[styles.input, styles.multiline]}
            value={soul}
            onChangeText={setSoul}
            onEndEditing={() => MveBridge.setSoul(soul)}
            placeholder="e.g. Always answer concisely. Call me boss."
            placeholderTextColor="#7d97b5"
            multiline
          />
        </Section>

        {/* ── Sandbox ── */}
        <Section label="Linux sandbox">
          <ToggleRow
            label="Linux sandbox"
            hint="Bundled proot + Alpine shell the assistant runs commands in"
            value={sandbox}
            onChange={async v => {
              setSandbox(v);
              await MveBridge.setSandboxEnabled(v);
              await refreshSandbox();
            }}
          />
          {sbStatus && (
            <View style={styles.card}>
              <View style={styles.rowBetween}>
                <View style={styles.flex}>
                  <Text style={styles.cardTitle}>Sandbox status</Text>
                  <Text style={styles.hint}>{sbStatus.statusText}</Text>
                </View>
                {!sbStatus.installed && (
                  <TouchableOpacity
                    style={styles.btn}
                    onPress={() => runLongTask(() => MveBridge.setupSandbox())}
                  >
                    <Text style={styles.btnText}>Setup</Text>
                  </TouchableOpacity>
                )}
              </View>
              {sbStatus.ready && !sbStatus.statusText.includes('full toolset') && (
                <TouchableOpacity
                  style={[styles.btn, styles.btnWide]}
                  onPress={() => runLongTask(() => MveBridge.installSandboxPackages())}
                >
                  <Text style={styles.btnText}>
                    Install full toolset (git, python, node, ssh…)
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </Section>

        {/* ── Heartbeat ── */}
        <Section label="Heartbeat">
          <ToggleRow
            label="Heartbeat self-checks"
            hint="Periodic background review of tasks and memory (needs the daemon on)"
            value={hbEnabled}
            onChange={async v => {
              setHbEnabled(v);
              await MveBridge.setHeartbeatEnabled(v);
            }}
          />
          <Stepper
            label="Interval"
            unit="min"
            value={hb.intervalMinutes}
            step={15}
            min={5}
            max={720}
            onChange={v => {
              const next = { ...hb, intervalMinutes: v };
              setHb(next);
              MveBridge.setHeartbeatConfig(
                next.intervalMinutes,
                next.activeStartHour,
                next.activeEndHour,
              );
            }}
          />
          <Stepper
            label="Active from"
            unit="h"
            value={hb.activeStartHour}
            step={1}
            min={0}
            max={23}
            onChange={v => {
              const next = { ...hb, activeStartHour: v };
              setHb(next);
              MveBridge.setHeartbeatConfig(
                next.intervalMinutes,
                next.activeStartHour,
                next.activeEndHour,
              );
            }}
          />
          <Stepper
            label="Active until"
            unit="h"
            value={hb.activeEndHour}
            step={1}
            min={0}
            max={23}
            onChange={v => {
              const next = { ...hb, activeEndHour: v };
              setHb(next);
              MveBridge.setHeartbeatConfig(
                next.intervalMinutes,
                next.activeStartHour,
                next.activeEndHour,
              );
            }}
          />
        </Section>

        {/* ── Daemon ── */}
        <Section label="Daemon">
          <ToggleRow
            label="Daemon (24/7 background)"
            hint="Keeps the engine running for heartbeat and scheduled tasks"
            value={daemon}
            onChange={async v => {
              setDaemon(v);
              await MveBridge.setDaemonEnabled(v);
            }}
          />
        </Section>

        {/* ── Generation ── */}
        <Section label="Generation">
          <Stepper
            label="Temperature ×100"
            unit=""
            value={Math.round(gen.temperature * 100)}
            step={5}
            min={0}
            max={200}
            onChange={v => {
              const next = { ...gen, temperature: v / 100 };
              setGen(next);
              MveBridge.setGeneration(
                next.temperature,
                next.showReasoning,
                next.maxAgentSteps,
              );
            }}
          />
          <Stepper
            label="Max agent steps"
            unit=""
            value={gen.maxAgentSteps}
            step={1}
            min={1}
            max={12}
            onChange={v => {
              const next = { ...gen, maxAgentSteps: v };
              setGen(next);
              MveBridge.setGeneration(
                next.temperature,
                next.showReasoning,
                next.maxAgentSteps,
              );
            }}
          />
          <ToggleRow
            label="Show reasoning"
            hint="Echo the model's chain-of-thought in chat when available"
            value={gen.showReasoning}
            onChange={v => {
              const next = { ...gen, showReasoning: v };
              setGen(next);
              MveBridge.setGeneration(
                next.temperature,
                next.showReasoning,
                next.maxAgentSteps,
              );
            }}
          />
        </Section>

        {/* ── Budget ── */}
        <Section label="Budget">
          <ToggleRow
            label="Pause all autonomy (kill switch)"
            hint="Stops the assistant from running until turned back off"
            value={budget.autonomyPaused}
            onChange={v => {
              const next = { ...budget, autonomyPaused: v };
              setBudget(next);
              MveBridge.setBudget(next.dailyTokenCap, next.autonomyPaused);
            }}
          />
          <Stepper
            label="Daily token cap (0 = ∞)"
            unit=""
            value={budget.dailyTokenCap}
            step={5000}
            min={0}
            max={1000000}
            onChange={v => {
              const next = { ...budget, dailyTokenCap: v };
              setBudget(next);
              MveBridge.setBudget(next.dailyTokenCap, next.autonomyPaused);
            }}
          />
          <View style={styles.card}>
            <Text style={styles.hint}>
              Used today: {budget.tokensUsedToday.toLocaleString()} tokens
            </Text>
            <TouchableOpacity onPress={refreshBudget}>
              <Text style={styles.linkText}>Refresh</Text>
            </TouchableOpacity>
          </View>
        </Section>

        {/* ── Memories ── */}
        <Section label="Memories">
          <Text style={styles.hint}>
            Facts injected into every system prompt so MVE remembers them.
          </Text>
          {memories.map(m => (
            <View key={m.id} style={styles.card}>
              <View style={styles.rowBetween}>
                <View style={styles.flex}>
                  <Text style={styles.cardTitle}>{m.key}</Text>
                  <Text style={styles.hint}>{m.content}</Text>
                </View>
                <TouchableOpacity
                  onPress={async () => {
                    await MveBridge.deleteMemory(m.id);
                    refreshMemories();
                  }}
                  hitSlop={10}
                >
                  <Text style={styles.del}>✕</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
          <TextInput
            style={styles.input}
            value={memKey}
            onChangeText={setMemKey}
            placeholder="Key (e.g. My name)"
            placeholderTextColor="#7d97b5"
          />
          <TextInput
            style={styles.input}
            value={memContent}
            onChangeText={setMemContent}
            placeholder="Content (e.g. gredsavage)"
            placeholderTextColor="#7d97b5"
          />
          <TouchableOpacity style={[styles.btn, styles.btnWide]} onPress={addMemory}>
            <Text style={styles.btnText}>Add memory</Text>
          </TouchableOpacity>
        </Section>

        {/* ── MCP servers ── */}
        <Section label="MCP servers">
          <Text style={styles.hint}>
            External tool servers (Streamable HTTP) the assistant can use.
          </Text>
          {mcp.map(m => (
            <View key={m.id} style={styles.card}>
              <View style={styles.rowBetween}>
                <View style={styles.flex}>
                  <Text style={styles.cardTitle}>{m.name}</Text>
                  <Text style={styles.hint} numberOfLines={1}>
                    {m.url}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={async () => {
                    await MveBridge.deleteMcpServer(m.id);
                    refreshMcp();
                  }}
                  hitSlop={10}
                >
                  <Text style={styles.del}>✕</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
          <TextInput
            style={styles.input}
            value={mcpName}
            onChangeText={setMcpName}
            placeholder="Name"
            placeholderTextColor="#7d97b5"
          />
          <TextInput
            style={styles.input}
            value={mcpUrl}
            onChangeText={setMcpUrl}
            placeholder="https://server/mcp"
            placeholderTextColor="#7d97b5"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TouchableOpacity style={[styles.btn, styles.btnWide]} onPress={addMcp}>
            <Text style={styles.btnText}>Add server</Text>
          </TouchableOpacity>
        </Section>

        {/* ── Backup ── */}
        <Section label="Backup">
          <TouchableOpacity style={[styles.btn, styles.btnWide]} onPress={doExport}>
            <Text style={styles.btnText}>Export settings (share JSON)</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.btn, styles.btnWide, styles.btnGhost]}
            onPress={() =>
              Alert.prompt?.(
                'Import settings',
                'Paste the exported JSON:',
                async text => {
                  if (text) {
                    await MveBridge.importSettings(text);
                    Alert.alert('Imported', 'Settings applied. Reopen to refresh.');
                  }
                },
              ) ??
              Alert.alert(
                'Import',
                'Paste-import needs the prompt dialog; use export for now.',
              )
            }
          >
            <Text style={styles.btnText}>Import settings</Text>
          </TouchableOpacity>
        </Section>

        <View style={{ height: 30 }} />
      </ScrollView>
    </View>
  );
};

const Section: React.FC<{ label: string; children: React.ReactNode }> = ({
  label,
  children,
}) => (
  <View style={styles.section}>
    <Text style={styles.sectionLabel}>{label}</Text>
    {children}
  </View>
);

const ToggleRow: React.FC<{
  label: string;
  hint: string;
  value: boolean;
  onChange: (v: boolean) => void;
}> = ({ label, hint, value, onChange }) => (
  <View style={styles.card}>
    <View style={styles.rowBetween}>
      <View style={styles.flex}>
        <Text style={styles.cardTitle}>{label}</Text>
        <Text style={styles.hint}>{hint}</Text>
      </View>
      <Switch value={value} onValueChange={onChange} />
    </View>
  </View>
);

const Stepper: React.FC<{
  label: string;
  unit: string;
  value: number;
  step: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}> = ({ label, unit, value, step, min, max, onChange }) => (
  <View style={styles.card}>
    <View style={styles.rowBetween}>
      <Text style={styles.cardTitle}>{label}</Text>
      <View style={styles.stepRow}>
        <TouchableOpacity
          style={styles.stepBtn}
          onPress={() => onChange(Math.max(min, value - step))}
        >
          <Text style={styles.stepText}>−</Text>
        </TouchableOpacity>
        <Text style={styles.stepValue}>
          {value}
          {unit}
        </Text>
        <TouchableOpacity
          style={styles.stepBtn}
          onPress={() => onChange(Math.min(max, value + step))}
        >
          <Text style={styles.stepText}>＋</Text>
        </TouchableOpacity>
      </View>
    </View>
  </View>
);

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: 'rgba(13,33,55,0.98)',
    borderRadius: 16,
    overflow: 'hidden',
    width: '100%',
    maxHeight: '92%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.14)',
  },
  title: { color: '#ffffff', fontSize: 18, fontWeight: '800' },
  close: { color: '#eaf4ff', fontSize: 18, fontWeight: '700' },
  mockBanner: {
    color: '#ffd9a0',
    fontSize: 11,
    textAlign: 'center',
    paddingVertical: 4,
    backgroundColor: 'rgba(120,80,0,0.25)',
  },
  content: { padding: 14, gap: 4 },
  section: { marginBottom: 14 },
  sectionLabel: {
    color: '#9cc2ff',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  flex: { flex: 1, paddingRight: 10 },
  cardTitle: { color: '#ffffff', fontSize: 14, fontWeight: '700' },
  hint: { color: 'rgba(255,255,255,0.6)', fontSize: 12, marginTop: 2 },
  linkText: { color: '#9cc2ff', fontSize: 12, fontWeight: '700', marginTop: 6 },
  input: {
    color: '#ffffff',
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    marginTop: 8,
  },
  multiline: { minHeight: 70, textAlignVertical: 'top' },
  del: { color: '#e2574c', fontSize: 16, fontWeight: '800' },
  btn: {
    backgroundColor: 'rgba(120,170,235,0.6)',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  btnWide: { marginTop: 8, alignSelf: 'stretch' },
  btnGhost: { backgroundColor: 'rgba(255,255,255,0.1)' },
  btnText: { color: '#ffffff', fontWeight: '700', fontSize: 13 },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  stepBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  stepText: { color: '#eaf4ff', fontSize: 18, fontWeight: '800' },
  stepValue: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
    minWidth: 52,
    textAlign: 'center',
  },
});

export default MveSettingsScreen;
