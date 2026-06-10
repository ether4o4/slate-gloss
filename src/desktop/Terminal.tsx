/**
 * Terminal — the legit NeverSoft shell (the "cmd" desktop icon).
 *
 * This is NOT a shell-icon stub: every command is executed for real through
 * the MVE engine's sandboxed `/system/bin/sh` (MveBridge.run). The assistant
 * uses the exact same path — `$ <command>` in chat runs here too.
 *
 * Readability upgrades over the old terminal tab:
 *   • block-based output — each command renders as a prompt header line with
 *     its output indented beneath, and clear spacing between blocks, so it is
 *     always obvious where a command starts and ends and where you are;
 *   • roomier line height, dimmed-vs-bright output styling, error tinting;
 *   • `clear` wipes the screen, `find: <keyword>` searches sandbox files.
 */
import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { MveBridge } from '../mve/MveBridge';

export const SHELL_PROMPT = 'user@neversoft:~$';

interface Block {
  id: number;
  cmd: string;
  output: string;
  error?: boolean;
  running?: boolean;
}

let nextBlockId = 1;

/** Run a command through the sandbox shell — shared with the assistant. */
export async function runShell(cmd: string): Promise<string> {
  if (cmd.startsWith('find:')) {
    const keyword = cmd.slice('find:'.length).trim();
    const hits = await MveBridge.searchFilenames('/root', keyword);
    return hits.length ? hits.join('\n') : '(no matching files)';
  }
  return MveBridge.run(cmd);
}

const Terminal: React.FC = () => {
  const [blocks, setBlocks] = useState<Block[]>([
    {
      id: 0,
      cmd: '',
      output:
        'NeverSoft Shell — sandboxed /system/bin/sh via the MVE engine.\n' +
        'Type a command. `find: <keyword>` searches files, `clear` resets.',
    },
  ]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const listRef = useRef<FlatList<Block>>(null);

  const scrollToEnd = useCallback(() => {
    requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
  }, []);

  const submit = useCallback(async () => {
    const cmd = input.trim();
    if (!cmd || busy) return;
    setInput('');

    if (cmd === 'clear') {
      setBlocks([]);
      return;
    }

    const id = nextBlockId++;
    setBlocks(prev => [...prev, { id, cmd, output: '', running: true }]);
    setBusy(true);
    scrollToEnd();
    try {
      const out = await runShell(cmd);
      setBlocks(prev =>
        prev.map(b => (b.id === id ? { ...b, output: out || '(no output)', running: false } : b)),
      );
    } catch (e) {
      setBlocks(prev =>
        prev.map(b =>
          b.id === id ? { ...b, output: String(e), error: true, running: false } : b,
        ),
      );
    } finally {
      setBusy(false);
      scrollToEnd();
    }
  }, [input, busy, scrollToEnd]);

  return (
    <View style={styles.body}>
      <FlatList
        ref={listRef}
        data={blocks}
        keyExtractor={b => String(b.id)}
        contentContainerStyle={styles.content}
        onContentSizeChange={scrollToEnd}
        renderItem={({ item }) => (
          <View style={styles.block}>
            {item.cmd ? (
              <Text style={styles.promptLine}>
                <Text style={styles.promptUser}>{SHELL_PROMPT} </Text>
                <Text style={styles.promptCmd}>{item.cmd}</Text>
              </Text>
            ) : null}
            {item.running ? (
              <Text style={styles.outputDim}>…</Text>
            ) : item.output ? (
              <Text style={[styles.output, item.error && styles.outputError]}>
                {item.output}
              </Text>
            ) : null}
          </View>
        )}
      />
      {busy && <ActivityIndicator color="#9fe0a0" style={styles.spinner} />}
      <View style={styles.inputRow}>
        <Text style={styles.inputPrompt}>{SHELL_PROMPT}</Text>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="ls -la"
          placeholderTextColor="#5f7e63"
          autoCapitalize="none"
          autoCorrect={false}
          onSubmitEditing={submit}
          blurOnSubmit={false}
        />
        <TouchableOpacity style={styles.runBtn} onPress={submit} disabled={busy}>
          <Text style={styles.runBtnText}>↵</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const MONO = Platform.OS === 'ios' ? 'Menlo' : 'monospace';

const styles = StyleSheet.create({
  body: { flex: 1, backgroundColor: 'rgba(4,10,6,0.92)' },
  content: { padding: 14, gap: 14 },
  block: { gap: 4 },
  promptLine: { fontFamily: MONO, fontSize: 13, lineHeight: 20 },
  promptUser: { color: '#7dd87f', fontWeight: '700' },
  promptCmd: { color: '#eaffea', fontWeight: '600' },
  output: {
    color: '#bdf0be',
    fontFamily: MONO,
    fontSize: 12.5,
    lineHeight: 19,
    paddingLeft: 10,
    borderLeftWidth: 2,
    borderLeftColor: 'rgba(125,216,127,0.25)',
  },
  outputDim: { color: 'rgba(189,240,190,0.5)', fontFamily: MONO, paddingLeft: 10 },
  outputError: { color: '#ff9d9d', borderLeftColor: 'rgba(255,120,120,0.4)' },
  spinner: { marginVertical: 4 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(125,216,127,0.25)',
  },
  inputPrompt: { color: '#7dd87f', fontFamily: MONO, fontSize: 12, fontWeight: '700' },
  input: {
    flex: 1,
    color: '#eaffea',
    backgroundColor: 'rgba(125,216,127,0.08)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    fontFamily: MONO,
  },
  runBtn: {
    width: 38,
    height: 38,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(125,216,127,0.3)',
  },
  runBtnText: { color: '#eaffea', fontSize: 16, fontWeight: '700' },
});

export default Terminal;
