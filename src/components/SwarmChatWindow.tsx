import React, {useState, useEffect, useRef, useCallback} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {sendMessageToDeepSeek} from '../api/DeepSeekService';
import {
  getMessages,
  appendMessage,
  clearHistory,
  type StoredMessage,
} from '../db/ChatPersistence';
import {getApiKey, setApiKey, hasApiKey} from '../db/Settings';
import {PROVIDER_NAME, PROVIDER_KEY_URL} from '../config';

const SwarmChatWindow = ({onClose}: {onClose: () => void}) => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<StoredMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [keyConfigured, setKeyConfigured] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [keyDraft, setKeyDraft] = useState('');
  const listRef = useRef<FlatList<StoredMessage>>(null);

  const refreshKeyStatus = useCallback(() => {
    hasApiKey().then(setKeyConfigured);
  }, []);

  useEffect(() => {
    getMessages().then(setMessages);
    refreshKeyStatus();
  }, [refreshKeyStatus]);

  const scrollToEnd = useCallback(() => {
    requestAnimationFrame(() => listRef.current?.scrollToEnd({animated: true}));
  }, []);

  const openSettings = useCallback(async () => {
    setKeyDraft(await getApiKey());
    setSettingsOpen(true);
  }, []);

  const saveKey = useCallback(async () => {
    await setApiKey(keyDraft);
    setSettingsOpen(false);
    refreshKeyStatus();
  }, [keyDraft, refreshKeyStatus]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || loading) {
      return;
    }

    if (!keyConfigured) {
      openSettings();
      return;
    }

    setInput('');
    setLoading(true);

    const afterUser = await appendMessage(messages, 'user', text);
    setMessages(afterUser);
    scrollToEnd();

    try {
      const reply = await sendMessageToDeepSeek(
        afterUser.map(({role, content}) => ({role, content})),
      );
      const afterAssistant = await appendMessage(
        afterUser,
        'assistant',
        reply.content,
      );
      setMessages(afterAssistant);
      scrollToEnd();
    } catch (error: any) {
      const msg = error?.message ?? 'Something went wrong. Please try again.';
      const afterError = await appendMessage(afterUser, 'assistant', `⚠️ ${msg}`);
      setMessages(afterError);
      scrollToEnd();
      refreshKeyStatus();
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    if (messages.length === 0) {
      return;
    }
    Alert.alert('Clear chat', 'Delete the entire conversation?', [
      {text: 'Cancel', style: 'cancel'},
      {
        text: 'Clear',
        style: 'destructive',
        onPress: async () => {
          await clearHistory();
          setMessages([]);
        },
      },
    ]);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}>
      <LinearGradient
        colors={['#0d2137', '#102a44', '#0a1a2c']}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={[styles.dot, !keyConfigured && styles.dotOff]} />
          <Text style={styles.headerTitle}>Swarm</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={openSettings} hitSlop={hitSlop}>
            <Text style={styles.headerAction}>⚙</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleClear} hitSlop={hitSlop}>
            <Text style={styles.headerAction}>Clear</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onClose} hitSlop={hitSlop}>
            <Text style={styles.closeButton}>✕</Text>
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(item, index) => `${item.timestamp}-${index}`}
        renderItem={({item}) => (
          <View
            style={[
              styles.messageRow,
              item.role === 'user' ? styles.rowUser : styles.rowAi,
            ]}>
            <View
              style={[
                styles.messageBubble,
                item.role === 'user' ? styles.userBubble : styles.aiBubble,
              ]}>
              <Text style={styles.messageText}>{item.content}</Text>
            </View>
          </View>
        )}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Ask Swarm anything</Text>
            <Text style={styles.emptySubtitle}>
              Powered by {PROVIDER_NAME}. Your chat is saved on this device.
            </Text>
            {!keyConfigured && (
              <TouchableOpacity style={styles.ctaButton} onPress={openSettings}>
                <Text style={styles.ctaText}>Add your DeepSeek API key</Text>
              </TouchableOpacity>
            )}
          </View>
        }
        onContentSizeChange={scrollToEnd}
      />

      {loading && (
        <View style={styles.typingRow}>
          <ActivityIndicator size="small" color="#7fb3ff" />
          <Text style={styles.typingText}>Swarm is thinking…</Text>
        </View>
      )}

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder={keyConfigured ? 'Type a message…' : 'Add an API key to begin…'}
          placeholderTextColor="#7d93ab"
          multiline
          onSubmitEditing={handleSend}
          returnKeyType="send"
          blurOnSubmit
        />
        <TouchableOpacity
          style={[styles.sendButton, (!input.trim() || loading) && styles.sendDisabled]}
          onPress={handleSend}
          disabled={!input.trim() || loading}>
          <Text style={styles.sendButtonText}>Send</Text>
        </TouchableOpacity>
      </View>

      {/* API key settings */}
      <Modal
        visible={settingsOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setSettingsOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{PROVIDER_NAME} API key</Text>
            <Text style={styles.modalSubtitle}>
              Stored only on this device. Get a free key at {PROVIDER_KEY_URL}.
            </Text>
            <TextInput
              style={styles.modalInput}
              value={keyDraft}
              onChangeText={setKeyDraft}
              placeholder="sk-…"
              placeholderTextColor="#7d93ab"
              autoCapitalize="none"
              autoCorrect={false}
              secureTextEntry
            />
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setSettingsOpen(false)}>
                <Text style={styles.modalCancel}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSave} onPress={saveKey}>
                <Text style={styles.modalSaveText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
};

const hitSlop = {top: 12, bottom: 12, left: 12, right: 12};

const styles = StyleSheet.create({
  container: {flex: 1},
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 28 : 14,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.15)',
  },
  headerLeft: {flexDirection: 'row', alignItems: 'center', gap: 10},
  dot: {width: 10, height: 10, borderRadius: 5, backgroundColor: '#4ade80'},
  dotOff: {backgroundColor: '#e2a14c'},
  headerTitle: {color: '#fff', fontSize: 18, fontWeight: '700'},
  headerActions: {flexDirection: 'row', alignItems: 'center', gap: 18},
  headerAction: {color: '#9cc2ff', fontSize: 16, fontWeight: '600'},
  closeButton: {color: '#fff', fontSize: 18, fontWeight: '600'},
  listContent: {padding: 16, flexGrow: 1},
  messageRow: {marginBottom: 10, flexDirection: 'row'},
  rowUser: {justifyContent: 'flex-end'},
  rowAi: {justifyContent: 'flex-start'},
  messageBubble: {paddingVertical: 10, paddingHorizontal: 14, borderRadius: 16, maxWidth: '82%'},
  userBubble: {backgroundColor: '#2f7bf6', borderBottomRightRadius: 4},
  aiBubble: {
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.18)',
    borderBottomLeftRadius: 4,
  },
  messageText: {color: '#fff', fontSize: 15, lineHeight: 21},
  empty: {flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32},
  emptyTitle: {color: '#fff', fontSize: 18, fontWeight: '600', marginBottom: 8},
  emptySubtitle: {color: '#9fb4c9', fontSize: 13, textAlign: 'center', lineHeight: 19},
  ctaButton: {
    marginTop: 18,
    backgroundColor: '#2f7bf6',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
  },
  ctaText: {color: '#fff', fontWeight: '700'},
  typingRow: {flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, paddingBottom: 6},
  typingText: {color: '#9cc2ff', fontSize: 13},
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    gap: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.15)',
  },
  input: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    color: '#fff',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    maxHeight: 120,
    fontSize: 15,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  sendButton: {
    backgroundColor: '#2f7bf6',
    borderRadius: 20,
    paddingHorizontal: 18,
    height: 42,
    justifyContent: 'center',
  },
  sendDisabled: {opacity: 0.45},
  sendButtonText: {color: '#fff', fontWeight: '700', fontSize: 15},
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: '#16314f',
    borderRadius: 18,
    padding: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  modalTitle: {color: '#fff', fontSize: 18, fontWeight: '700'},
  modalSubtitle: {color: '#9fb4c9', fontSize: 13, marginTop: 6, lineHeight: 18},
  modalInput: {
    marginTop: 16,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#fff',
    fontSize: 15,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  modalActions: {flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 24, marginTop: 18},
  modalCancel: {color: '#9cc2ff', fontSize: 15, fontWeight: '600'},
  modalSave: {backgroundColor: '#2f7bf6', paddingHorizontal: 22, paddingVertical: 10, borderRadius: 20},
  modalSaveText: {color: '#fff', fontSize: 15, fontWeight: '700'},
});

export default SwarmChatWindow;
