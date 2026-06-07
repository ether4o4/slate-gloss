import AsyncStorage from '@react-native-async-storage/async-storage';
import {DEFAULT_DEEPSEEK_API_KEY} from '../config';

const API_KEY_STORAGE = '@vista_swarm_api_key';

/** Returns the saved DeepSeek API key, falling back to any build-time default. */
export const getApiKey = async (): Promise<string> => {
  try {
    const saved = await AsyncStorage.getItem(API_KEY_STORAGE);
    return (saved ?? '').trim() || DEFAULT_DEEPSEEK_API_KEY;
  } catch {
    return DEFAULT_DEEPSEEK_API_KEY;
  }
};

/** Persists (or clears) the user's DeepSeek API key. */
export const setApiKey = async (key: string): Promise<void> => {
  const trimmed = key.trim();
  if (trimmed) {
    await AsyncStorage.setItem(API_KEY_STORAGE, trimmed);
  } else {
    await AsyncStorage.removeItem(API_KEY_STORAGE);
  }
};

export const hasApiKey = async (): Promise<boolean> => {
  const key = await getApiKey();
  return key.length > 0;
};
