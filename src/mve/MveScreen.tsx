/**
 * MveScreen — the page to the left of the NeverSoft home desktop.
 *
 * It hosts the two things the user drives directly against the MVE engine:
 *   • Chat   — talk to whichever provider/model MVE is configured for
 *   • Terminal — the embedded Linux sandbox shell, plus a keyword file search
 *
 * All data comes from the MVE engine via {@link MveBridge}; this screen holds no
 * intelligence of its own. When the native engine isn't linked, the bridge's
 * mock keeps everything interactive and a banner says so.
 */
import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { MveBridge, isNative } from './MveBridge';
import MveChat from './MveChat';

type Tab = 'chat' | 'terminal';

const MveScreen: React.FC = () => {
  const [tab, setTab] = useState<Tab>('chat');

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>MVE</Text>
        <View style={styles.tabRow}>
          <TabChip label="Chat" active={tab === 'chat'} onPress={() => setTab('chat')} />
          <TabChip
            label="Terminal"
            active={tab === 'terminal'}
            onPress={() => setTab('terminal')}
          />
        </View>
      </View>

      {!isNative && (
        <Text style={styles.mockBanner}>
          Engine not linked — showing mock data
        </Text>
      )}

      {tab === 'chat' ? <MveChat /> : <TerminalView />}
    </KeyboardAvoidingView>
  );
};

const TabChip: React.FC<{ label: string; active: boolean; onPress: () => void }> = ({
  label,
  active,
  onPress,
}) => (
  <TouchableOpacity
    onPress={onPress}
    style={[styles.chip, active && styles.chipActive]}
    activeOpacity={0.8}>
    <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
  </TouchableOpacity>
);

const TerminalView: React.FC = () => {
  const [lines, setLines] = useState<string[]>([
    'MVE Linux sandbox. Type a command, or use "find: <keyword>" to search files.',
  ]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const listRef = useRef<FlatList<string>>(null);

  const append = useCallback((...rows: string[]) => {
    setLines(prev => [...prev, ...rows]);
    requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
  }, []);

  const submit = useCallback(async () => {
    const cmd = input.trim();
    if (!cmd || busy) return;
    setInput('');
    setBusy(true);
    try {
      if (cmd.startsWith('find:')) {
        const keyword = cmd.slice('find:'.length).trim();
        append(`$ search "${keyword}" in /root`);
        const hits = await MveBridge.searchFilenames('/root', keyword);
        append(hits.length ? hits.join('\n') : '(no matching files)');
      } else {
        append(`$ ${cmd}`);
        const out = await MveBridge.run(cmd);
        if (out) append(out);
      }
    } catch (e) {
      append(`error: ${String(e)}`);
    } finally {
      setBusy(false);
    }
  }, [input, busy, append]);

  return (
    <View style={styles.body}>
      <FlatList
        ref={listRef}
        data={lines}
        keyExtractor={(_, i) => String(i)}
        contentContainerStyle={styles.termContent}
        renderItem={({ item }) => <Text style={styles.termLine}>{item}</Text>}
      />
      {busy && <ActivityIndicator color="#9fe0a0" style={styles.spinner} />}
      <View style={styles.inputRow}>
        <Text style={styles.prompt}>$</Text>
        <TextInput
          style={[styles.input, styles.termInput]}
          value={input}
          onChangeText={setInput}
          placeholder='ls -la   |   find: report'
          placeholderTextColor="#5f7e63"
          autoCapitalize="none"
          autoCorrect={false}
          onSubmitEditing={submit}
        />
        <TouchableOpacity style={styles.sendBtn} onPress={submit} disabled={busy}>
          <Text style={styles.sendBtnText}>Run</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    color: '#eaf4ff',
    fontSize: 22,
    fontWeight: '700',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  tabRow: { flexDirection: 'row', gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  chipActive: { backgroundColor: 'rgba(150,200,255,0.35)' },
  chipText: { color: '#cfe0f2', fontSize: 13, fontWeight: '600' },
  chipTextActive: { color: '#ffffff' },
  mockBanner: {
    color: '#ffd9a0',
    fontSize: 11,
    textAlign: 'center',
    paddingVertical: 4,
    backgroundColor: 'rgba(120,80,0,0.25)',
  },
  body: { flex: 1 },
  listContent: { padding: 16, gap: 8 },
  bubble: { padding: 12, borderRadius: 10, maxWidth: '85%' },
  userBubble: { alignSelf: 'flex-end', backgroundColor: 'rgba(120,170,235,0.45)' },
  aiBubble: { alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.14)' },
  bubbleText: { color: '#f2f8ff', fontSize: 14, lineHeight: 20 },
  empty: { color: '#9db8d6', textAlign: 'center', marginTop: 32, fontSize: 13 },
  spinner: { marginVertical: 4 },
  termContent: { padding: 12, gap: 2 },
  termLine: {
    color: '#bdf0be',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 12,
    lineHeight: 16,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.18)',
  },
  prompt: { color: '#9fe0a0', fontSize: 16, fontWeight: '700' },
  input: {
    flex: 1,
    color: '#ffffff',
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
  },
  termInput: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    color: '#dffbe0',
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  iconBtnText: { color: '#eaf4ff', fontSize: 20, lineHeight: 22 },
  sendBtn: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: 'rgba(120,170,235,0.6)',
  },
  sendBtnText: { color: '#ffffff', fontWeight: '700', fontSize: 14 },
});

export default MveScreen;
