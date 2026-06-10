/**
 * AssistantWall — the page to the LEFT of the home desktop.
 *
 * One full-height glass box, top → bottom:
 *   • News feed   — posts the user creates, with embedded (tappable) links
 *   • Assistant   — the NeverSoft Service Assistant's message log + input, at
 *                   the bottom (local commands run before the engine)
 *   • APK link    — a pinned download bar dropped at the very bottom
 *
 * The sandbox shell that used to live here as a tab now has its own home-screen
 * icon (cmd), so this page is purely the wall.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Linking,
  Platform,
  ScrollView,
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
import { NewsFeed, NewsPost } from './newsFeed';

const URL_SPLIT_RE = /(https?:\/\/[^\s]+)/gi;
const IS_URL_RE = /^https?:\/\//i;

/** Renders text with any embedded URLs as tappable links. */
const LinkText: React.FC<{ text: string }> = ({ text }) => {
  const parts = text.split(URL_SPLIT_RE);
  return (
    <Text style={styles.postText}>
      {parts.map((part, i) =>
        IS_URL_RE.test(part) ? (
          <Text key={i} style={styles.link} onPress={() => Linking.openURL(part).catch(() => {})}>
            {part}
          </Text>
        ) : (
          <Text key={i}>{part}</Text>
        ),
      )}
    </Text>
  );
};

function timeAgo(ms: number): string {
  const s = Math.floor((Date.now() - ms) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

const AssistantWall: React.FC = () => {
  const [assistantName, setAssistantName] = useState(() => ThemeStore.get().assistantName);
  const [posts, setPosts] = useState<NewsPost[]>(() => NewsFeed.all());
  const [draft, setDraft] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [chatCollapsed, setChatCollapsed] = useState(false);
  const msgRef = useRef<FlatList<ChatMessage>>(null);

  useEffect(() => ThemeStore.subscribe(() => setAssistantName(ThemeStore.get().assistantName)), []);
  useEffect(() => NewsFeed.subscribe(() => setPosts(NewsFeed.all())), []);
  useEffect(() => {
    MveBridge.getHistory().then(setMessages).catch(() => {});
  }, []);

  const post = useCallback(() => {
    if (NewsFeed.add(draft)) setDraft('');
  }, [draft]);

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
      setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${String(e)}` }]);
    } finally {
      setSending(false);
      scrollMsgs();
    }
  }, [input, sending, scrollMsgs]);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.page}>
      <View style={styles.glass}>
        <Text style={styles.heading} numberOfLines={1}>
          {assistantName}
        </Text>
        {!isNative && <Text style={styles.mockBanner}>Engine not linked — showing mock data</Text>}

        {/* ── News feed (top, scrollable) ── */}
        <View style={styles.composer}>
          <TextInput
            style={styles.composerInput}
            value={draft}
            onChangeText={setDraft}
            placeholder="Post to your feed — paste a link to embed it…"
            placeholderTextColor="#8aa6c8"
            multiline
          />
          <TouchableOpacity style={styles.postBtn} onPress={post} disabled={!draft.trim()}>
            <Text style={styles.postBtnText}>Post</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.feed} contentContainerStyle={styles.feedContent}>
          {posts.length === 0 ? (
            <Text style={styles.feedEmpty}>
              Your news feed is empty. Share an update or a link to get started.
            </Text>
          ) : (
            posts.map(p => (
              <View key={p.id} style={styles.postCard}>
                <View style={styles.postHeader}>
                  <Text style={styles.postTime}>{timeAgo(p.createdAt)}</Text>
                  <TouchableOpacity onPress={() => NewsFeed.remove(p.id)} hitSlop={8}>
                    <Text style={styles.postRemove}>✕</Text>
                  </TouchableOpacity>
                </View>
                <LinkText text={p.text} />
                {p.links.length > 0 && (
                  <View style={styles.linkRow}>
                    {p.links.map(l => (
                      <TouchableOpacity
                        key={l}
                        style={styles.linkChip}
                        onPress={() => Linking.openURL(l).catch(() => {})}>
                        <Text style={styles.linkChipText} numberOfLines={1}>
                          🔗 {l.replace(/^https?:\/\//, '')}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            ))
          )}
        </ScrollView>

        {/* ── Assistant messages (bottom, collapsible) ── */}
        {chatCollapsed ? (
          <TouchableOpacity
            style={styles.collapsedBar}
            activeOpacity={0.8}
            onPress={() => setChatCollapsed(false)}
          >
            <Text style={styles.collapsedText}>▴ {assistantName}</Text>
          </TouchableOpacity>
        ) : (
        <View style={styles.assistantPanel}>
          <View style={styles.panelHeader}>
            <Text style={styles.sectionLabel}>{assistantName}</Text>
            <TouchableOpacity
              onPress={() => {
                Keyboard.dismiss();
                setChatCollapsed(true);
              }}
              hitSlop={10}
              style={styles.collapseBtn}
            >
              <Text style={styles.collapseGlyph}>—</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            ref={msgRef}
            data={messages}
            keyExtractor={(_, i) => String(i)}
            contentContainerStyle={styles.msgContent}
            onContentSizeChange={scrollMsgs}
            renderItem={({ item }) => (
              <View
                style={[styles.bubble, item.role === 'user' ? styles.userBubble : styles.aiBubble]}>
                <Text style={styles.bubbleText}>{item.content}</Text>
              </View>
            )}
            ListEmptyComponent={
              <Text style={styles.msgEmpty}>Message the assistant — try “themes”.</Text>
            }
          />
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
            <TouchableOpacity style={styles.sendBtn} onPress={send} disabled={sending}>
              <Text style={styles.sendBtnText}>Send</Text>
            </TouchableOpacity>
          </View>
        </View>
        )}
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  page: { flex: 1, padding: 8 },
  glass: {
    flex: 1,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
    overflow: 'hidden',
  },
  heading: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '700',
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 6,
    textShadowColor: 'rgba(0,0,0,0.45)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  mockBanner: {
    color: '#ffd9a0',
    fontSize: 11,
    textAlign: 'center',
    paddingVertical: 3,
    backgroundColor: 'rgba(120,80,0,0.25)',
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  composerInput: {
    flex: 1,
    color: '#ffffff',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    maxHeight: 90,
  },
  postBtn: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: 'rgba(120,170,235,0.6)',
  },
  postBtnText: { color: '#ffffff', fontWeight: '700', fontSize: 13 },
  feed: { flex: 1 },
  feedContent: { padding: 12, gap: 10 },
  feedEmpty: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 16,
  },
  postCard: {
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    gap: 6,
  },
  postHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  postTime: { color: 'rgba(255,255,255,0.55)', fontSize: 11 },
  postRemove: { color: 'rgba(255,255,255,0.5)', fontSize: 13, fontWeight: '700' },
  postText: { color: '#eaf4ff', fontSize: 14, lineHeight: 20 },
  link: { color: '#9ed0ff', textDecorationLine: 'underline' },
  linkRow: { gap: 6, marginTop: 2 },
  linkChip: {
    backgroundColor: 'rgba(120,170,235,0.22)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(150,200,255,0.35)',
  },
  linkChipText: { color: '#cfe6ff', fontSize: 12 },
  assistantPanel: {
    maxHeight: '40%',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.22)',
    backgroundColor: 'rgba(20,34,52,0.35)',
  },
  sectionLabel: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    paddingHorizontal: 14,
    paddingTop: 8,
  },
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  collapseBtn: {
    paddingHorizontal: 14,
    paddingTop: 8,
  },
  collapseGlyph: { color: 'rgba(255,255,255,0.8)', fontSize: 14, fontWeight: '900' },
  collapsedBar: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.22)',
    backgroundColor: 'rgba(20,34,52,0.35)',
    paddingVertical: 9,
    alignItems: 'center',
  },
  collapsedText: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  msgContent: { padding: 12, gap: 6 },
  bubble: { padding: 10, borderRadius: 10, maxWidth: '88%' },
  userBubble: { alignSelf: 'flex-end', backgroundColor: 'rgba(120,170,235,0.45)' },
  aiBubble: { alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.14)' },
  bubbleText: { color: '#f2f8ff', fontSize: 13, lineHeight: 19 },
  msgEmpty: { color: '#9db8d6', textAlign: 'center', marginTop: 10, fontSize: 12 },
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

export default AssistantWall;
