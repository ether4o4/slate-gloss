import AsyncStorage from '@react-native-async-storage/async-storage';
import type {ChatMessage} from '../api/DeepSeekService';

const STORAGE_KEY = '@vista_swarm_chat_history';

export interface StoredMessage extends ChatMessage {
  timestamp: number;
}

/**
 * Loads the full chat history (oldest first). Returns an empty array on first
 * launch or if the stored data is unreadable.
 */
export const getMessages = async (): Promise<StoredMessage[]> => {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error('Failed to load chat history:', error);
    return [];
  }
};

/** Persists the entire conversation. */
export const saveMessages = async (
  messages: StoredMessage[],
): Promise<void> => {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
  } catch (error) {
    console.error('Failed to save chat history:', error);
  }
};

/** Appends a single message and persists, returning the updated list. */
export const appendMessage = async (
  current: StoredMessage[],
  role: ChatMessage['role'],
  content: string,
): Promise<StoredMessage[]> => {
  const next = [...current, {role, content, timestamp: Date.now()}];
  await saveMessages(next);
  return next;
};

/** Clears the stored conversation. */
export const clearHistory = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear chat history:', error);
  }
};
