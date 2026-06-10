/**
 * MveChat — the enhanced, context-first chatbox for the MVE engine.
 *
 * This replaces the old Swarm chat window. Beyond a message list it adds a small
 * built-in toolbar (New · Clear · open-intents · Help) and a Help overlay, and it
 * records the intent behind every message in the {@link ActionRegistry} so MVE can
 * resume tasks instead of just remembering text.
 *
 * All intelligence lives in the MVE engine, reached through {@link MveBridge};
 * when the engine isn't linked the bridge mock keeps this fully interactive.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { ChatMessage, MveBridge } from './MveBridge';
import { ActionRegistry, Intent } from './ActionRegistry';

const HELP_TOPICS: { title: string; body: string }[] = [
  {
    title: 'What MVE is',
    body: 'MVE is the engine running underneath NeverSoft — chat, providers, memory, tasks and a Linux sandbox. This box talks to it directly.',
  },
  {
    title: 'Context-first',
    body: 'Every message you send is also recorded as an intent. The ◎ pill shows how many tasks are still open so MVE (and you) can pick them back up later.',
  },
  {
    title: 'Toolbar',
    body: '＋ starts a fresh chat · ⌫ clears it · ◎ shows open intents · ? opens this help.',
  },
  {
    title: 'Tips',
    body: 'Lead with a verb to make an actionable task — e.g. “find my tax pdf”, “remind me to call Sam”, “build the launcher”. Switch to the Terminal tab for the sandbox shell.',
  },
];

const MveChat: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [intentsOpen, setIntentsOpen] = useState(false);
  const [openIntents, setOpenIntents] = useState<Intent[]>([]);
  const listRef = useRef<FlatList<ChatMessage>>(null);

  useEffect(() => {
    MveBridge.getHistory().then(setMessages).catch(() => {});
  }, []);

  useEffect(() => ActionRegistry.subscribe(() => setOpenIntents(ActionRegistry.open())), []);

  const scrollToEnd = useCallback(() => {
    requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
  }, []);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput('');
    ActionRegistry.capture(text);
    setMessages(prev => [...prev, { role: 'user', content: text }]);
    setLoading(true);
    scrollToEnd();
    try {
      const reply = await MveBridge.sendMessage(text);
      setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
    } catch (e) {
      setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${String(e)}` }]);
    } finally {
      setLoading(false);
      scrollToEnd();
    }
  }, [input, loading, scrollToEnd]);

  const newChat = useCallback(async () => {
    await MveBridge.startNewChat();
    setMessages([]);
  }, []);

  const clearChat = useCallback(async () => {
    await MveBridge.clearChat();
    setMessages([]);
  }, []);

  const openCount = openIntents.length;

  const toolbar = useMemo(
    () => (
      <View style={styles.toolbar}>
        <Text style={styles.toolbarTitle}>Chat</Text>
        <View style={styles.toolbarActions}>
          <ToolbarButton label="＋" hint="New chat" onPress={newChat} />
          <ToolbarButton label="⌫" hint="Clear" onPress={clearChat} />
          <ToolbarButton
            label={`◎${openCount ? ` ${openCount}` : ''}`}
            hint="Open intents"
            active={intentsOpen}
            onPress={() => setIntentsOpen(o => !o)}
          />
          <ToolbarButton label="?" hint="Help" onPress={() => setHelpOpen(true)} />
        </View>
      </View>
    ),
    [newChat, clearChat, openCount, intentsOpen],
  );

  return (
    <View style={styles.body}>
      {toolbar}

      {intentsOpen && (
        <View style={styles.intentsPanel}>
          {openCount === 0 ? (
            <Text style={styles.intentsEmpty}>No open intents yet.</Text>
          ) : (
            openIntents.map(it => (
              <View key={it.id} style={styles.intentRow}>
                <Text style={styles.intentVerb}>{it.verb}</Text>
                <Text style={styles.intentSummary} numberOfLines={1}>
                  {it.summary}
                </Text>
                <TouchableOpacity onPress={() => ActionRegistry.setStatus(it.id, 'done')}>
                  <Text style={styles.intentDone}>✓</Text>
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>
      )}

      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(_, i) => String(i)}
        contentContainerStyle={styles.listContent}
        onContentSizeChange={scrollToEnd}
        renderItem={({ item }) => (
          <View
            style={[styles.bubble, item.role === 'user' ? styles.userBubble : styles.aiBubble]}>
            <Text style={styles.bubbleText}>{item.content}</Text>
          </View>
        )}
        ListEmptyComponent={
          <Text style={styles.empty}>Start a conversation with the MVE engine.</Text>
        }
      />

      {loading && <ActivityIndicator color="#cfe3ff" style={styles.spinner} />}

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="Message MVE…"
          placeholderTextColor="#8aa6c8"
          onSubmitEditing={send}
          returnKeyType="send"
        />
        <TouchableOpacity style={styles.sendBtn} onPress={send} disabled={loading}>
          <Text style={styles.sendBtnText}>Send</Text>
        </TouchableOpacity>
      </View>

      <HelpOverlay visible={helpOpen} onClose={() => setHelpOpen(false)} />
    </View>
  );
};

const ToolbarButton: React.FC<{
  label: string;
  hint: string;
  active?: boolean;
  onPress: () => void;
}> = ({ label, hint, active, onPress }) => (
  <TouchableOpacity
    onPress={onPress}
    accessibilityLabel={hint}
    style={[styles.toolBtn, active && styles.toolBtnActive]}
    activeOpacity={0.7}>
    <Text style={styles.toolBtnText}>{label}</Text>
  </TouchableOpacity>
);

const HelpOverlay: React.FC<{ visible: boolean; onClose: () => void }> = ({
  visible,
  onClose,
}) => (
  <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
    <View style={styles.helpBackdrop}>
      <View style={styles.helpCard}>
        <View style={styles.helpHeader}>
          <Text style={styles.helpTitle}>MVE Help</Text>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.helpClose}>✕</Text>
          </TouchableOpacity>
        </View>
        {HELP_TOPICS.map(topic => (
          <View key={topic.title} style={styles.helpTopic}>
            <Text style={styles.helpTopicTitle}>{topic.title}</Text>
            <Text style={styles.helpTopicBody}>{topic.body}</Text>
          </View>
        ))}
      </View>
    </View>
  </Modal>
);

const styles = StyleSheet.create({
  body: { flex: 1 },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.12)',
  },
  toolbarTitle: { color: '#cfe0f2', fontSize: 13, fontWeight: '700' },
  toolbarActions: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  toolBtn: {
    minWidth: 30,
    height: 30,
    paddingHorizontal: 8,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
  },
  toolBtnActive: { backgroundColor: 'rgba(150,200,255,0.4)' },
  toolBtnText: { color: '#eaf4ff', fontSize: 14, fontWeight: '700' },
  intentsPanel: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 6,
    backgroundColor: 'rgba(60,90,140,0.25)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.12)',
  },
  intentsEmpty: { color: '#9db8d6', fontSize: 12, fontStyle: 'italic' },
  intentRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  intentVerb: {
    color: '#bcdcff',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    minWidth: 56,
  },
  intentSummary: { color: '#eaf4ff', fontSize: 13, flex: 1 },
  intentDone: { color: '#9fe0a0', fontSize: 16, fontWeight: '700', paddingHorizontal: 4 },
  listContent: { padding: 16, gap: 8 },
  bubble: { padding: 12, borderRadius: 10, maxWidth: '85%' },
  userBubble: { alignSelf: 'flex-end', backgroundColor: 'rgba(120,170,235,0.45)' },
  aiBubble: { alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.14)' },
  bubbleText: { color: '#f2f8ff', fontSize: 14, lineHeight: 20 },
  empty: { color: '#9db8d6', textAlign: 'center', marginTop: 32, fontSize: 13 },
  spinner: { marginVertical: 4 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.18)',
  },
  input: {
    flex: 1,
    color: '#ffffff',
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
  },
  sendBtn: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: 'rgba(120,170,235,0.6)',
  },
  sendBtnText: { color: '#ffffff', fontWeight: '700', fontSize: 14 },
  helpBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    padding: 24,
  },
  helpCard: {
    backgroundColor: '#152234',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(150,200,255,0.3)',
    gap: 12,
  },
  helpHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  helpTitle: { color: '#eaf4ff', fontSize: 18, fontWeight: '700' },
  helpClose: { color: '#9db8d6', fontSize: 18, fontWeight: '700' },
  helpTopic: { gap: 2 },
  helpTopicTitle: { color: '#bcdcff', fontSize: 13, fontWeight: '700' },
  helpTopicBody: { color: '#d6e6f7', fontSize: 13, lineHeight: 19 },
});

export default MveChat;
