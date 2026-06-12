/**
 * AssistantChat — the MVE assistant conversation (message list + input).
 *
 * Self-contained and talks straight to the MVE engine through MveBridge, so it
 * can be hosted anywhere: the floating taskbar chat window, or the left wall.
 * Local commands ("themes", "theme <name>", "$ <cmd>") are handled before the
 * engine; the engine itself runs a real shell agent loop.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { ChatMessage, MveBridge, isNative } from '../mve/MveBridge';
import { handleAssistantCommand } from '../mve/assistantCommands';
import { ActionRegistry } from '../mve/ActionRegistry';
import { ThemeStore } from '../theme/themes';

const AssistantChat: React.FC = () => {
  const [assistantName, setAssistantName] = useState(
    () => ThemeStore.get().assistantName,
  );
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const msgRef = useRef<FlatList<ChatMessage>>(null);

  useEffect(
    () => ThemeStore.subscribe(() => setAssistantName(ThemeStore.get().assistantName)),
    [],
  );
  useEffect(() => {
    MveBridge.getHistory().then(setMessages).catch(() => {});
  }, []);

  const scrollMsgs = useCallback(() => {
    requestAnimationFrame(() => msgRef.current?.scrollToEnd({ animated: true }));
  }, []);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || sending) return;
    setInput('');
    ActionRegistry.capture(text);
    setMessages(prev => [...prev, { role: 'user', content: text }]);
    setSending(true);
    scrollMsgs();
    try {
      const local = await handleAssistantCommand(text);
      const reply = local ?? (await MveBridge.sendMessage(text));
      setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
    } catch (e) {
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: `Error: ${String(e)}` },
      ]);
    } finally {
      setSending(false);
      scrollMsgs();
    }
  }, [input, sending, scrollMsgs]);

  return (
    <View style={styles.root}>
      {!isNative && (
        <Text style={styles.mockBanner}>Engine not linked — showing mock data</Text>
      )}
      <FlatList
        ref={msgRef}
        data={messages}
        keyExtractor={(_, i) => String(i)}
        contentContainerStyle={styles.msgContent}
        onContentSizeChange={scrollMsgs}
        renderItem={({ item }) => (
          <View
            style={[
              styles.bubble,
              item.role === 'user' ? styles.userBubble : styles.aiBubble,
            ]}
          >
            <Text style={styles.bubbleText}>{item.content}</Text>
          </View>
        )}
        ListEmptyComponent={
          <Text style={styles.msgEmpty}>
            Message {assistantName} — try “themes” or “$ uname -a”.
          </Text>
        }
      />
      {sending && (
        <ActivityIndicator color="#9fe0a0" style={styles.spinner} />
      )}
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder={`Message ${assistantName}…`}
          placeholderTextColor="#8aa6c8"
          onSubmitEditing={send}
          returnKeyType="send"
          blurOnSubmit={false}
        />
        <TouchableOpacity
          style={styles.sendBtn}
          onPress={send}
          disabled={sending}
        >
          <Text style={styles.sendBtnText}>Send</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },
  mockBanner: {
    color: '#ffd9a0',
    fontSize: 11,
    textAlign: 'center',
    paddingVertical: 3,
    backgroundColor: 'rgba(120,80,0,0.25)',
  },
  msgContent: { padding: 12, gap: 6 },
  bubble: { padding: 10, borderRadius: 10, maxWidth: '88%' },
  userBubble: { alignSelf: 'flex-end', backgroundColor: 'rgba(120,170,235,0.45)' },
  aiBubble: { alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.14)' },
  bubbleText: { color: '#f2f8ff', fontSize: 13, lineHeight: 19 },
  msgEmpty: { color: '#9db8d6', textAlign: 'center', marginTop: 12, fontSize: 12 },
  spinner: { paddingVertical: 4 },
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
});

export default AssistantChat;
