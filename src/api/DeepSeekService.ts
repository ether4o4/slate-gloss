import axios from 'axios';
import {CHAT_BASE_URL, CHAT_MODEL, SYSTEM_PROMPT} from '../config';
import {getApiKey} from '../db/Settings';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/** Raised when no API key has been configured yet. */
export class MissingApiKeyError extends Error {
  constructor() {
    super('Add your API key in Swarm settings to start chatting.');
    this.name = 'MissingApiKeyError';
  }
}

const client = axios.create({
  baseURL: CHAT_BASE_URL,
  timeout: 60000,
  headers: {'Content-Type': 'application/json'},
});

/**
 * Sends the conversation to the configured (OpenAI-compatible) provider and
 * returns the assistant's reply. The API key is read from on-device storage per
 * request, so nothing secret is bundled into the app.
 */
export const sendMessageToDeepSeek = async (
  messages: ChatMessage[],
): Promise<ChatMessage> => {
  const apiKey = await getApiKey();
  if (!apiKey) {
    throw new MissingApiKeyError();
  }

  try {
    const payload = {
      model: CHAT_MODEL,
      messages: [
        {role: 'system', content: SYSTEM_PROMPT},
        ...messages.map(({role, content}) => ({role, content})),
      ],
      stream: false,
    };

    const response = await client.post('/chat/completions', payload, {
      headers: {Authorization: `Bearer ${apiKey}`},
    });
    const reply = response.data?.choices?.[0]?.message;

    if (!reply || typeof reply.content !== 'string') {
      throw new Error('Empty response from the AI provider');
    }

    return {role: 'assistant', content: reply.content};
  } catch (error) {
    let message = 'Something went wrong talking to Swarm. Please try again.';

    if (axios.isAxiosError(error)) {
      if (error.code === 'ECONNABORTED') {
        message = 'Request timed out. Check your connection and try again.';
      } else if (error.response?.status === 401) {
        message = 'Authentication failed — check your API key in settings.';
      } else if (error.response?.status === 429) {
        message = 'Rate limit reached. Please wait a moment and try again.';
      } else if (error.response?.data?.error?.message) {
        message = String(error.response.data.error.message);
      } else if (!error.response) {
        message = 'No network connection. Check your internet and try again.';
      }
    }

    console.error('AI provider error:', error);
    throw new Error(message);
  }
};
