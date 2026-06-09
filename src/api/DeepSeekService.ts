import axios from 'axios';
import { CHAT_BASE_URL, CHAT_MODEL, SYSTEM_PROMPT } from '../config';
import { getApiKey } from '../db/Settings';
import { SWARM_TOOLS, AI_THEMES } from '../ai/tools';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ToolCallRecord {
  name: string;
  args: Record<string, any>;
  result: string;
}

export type ToolExecutor = (
  name: string,
  args: Record<string, any>,
) => Promise<string>;

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
  headers: { 'Content-Type': 'application/json' },
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
        { role: 'system', content: SYSTEM_PROMPT },
        ...messages.map(({ role, content }) => ({ role, content })),
      ],
      stream: false,
    };

    const response = await client.post('/chat/completions', payload, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    const reply = response.data?.choices?.[0]?.message;

    if (!reply || typeof reply.content !== 'string') {
      throw new Error('Empty response from the AI provider');
    }

    return { role: 'assistant', content: reply.content };
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

const friendlyError = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    if (error.code === 'ECONNABORTED') {
      return 'Request timed out. Try again.';
    }
    if (error.response?.status === 401) {
      return 'Auth failed — check your API key in settings.';
    }
    if (error.response?.status === 429) {
      return 'Rate limit reached. Wait a moment and retry.';
    }
    if (error.response?.data?.error?.message) {
      return String(error.response.data.error.message);
    }
    if (!error.response) {
      return 'No network connection.';
    }
  }
  return 'Something went wrong talking to Swarm. Please try again.';
};

const AGENT_SYSTEM = `${SYSTEM_PROMPT}

You can control the NeverSoft OS by calling the provided tools (a safe command
sandbox). Use them when the user asks to change the look or do something on the
device — e.g. apply themes, open/pin apps, toggle widgets, change wallpaper, or
report status. Prefer doing the action over describing it. Keep replies short.
Secret AI-only themes you can apply: ${AI_THEMES.map(t => t.name).join(', ')}.`;

/**
 * Agentic Swarm turn: sends the conversation with tools enabled, executes any
 * tool calls via `execute`, and loops until the model returns a final message.
 */
export const sendSwarm = async (
  history: ChatMessage[],
  execute: ToolExecutor,
): Promise<{ content: string; calls: ToolCallRecord[] }> => {
  const apiKey = await getApiKey();
  if (!apiKey) {
    throw new MissingApiKeyError();
  }

  const msgs: any[] = [
    { role: 'system', content: AGENT_SYSTEM },
    ...history.map(({ role, content }) => ({ role, content })),
  ];
  const calls: ToolCallRecord[] = [];

  try {
    for (let step = 0; step < 5; step++) {
      const resp = await client.post(
        '/chat/completions',
        {
          model: CHAT_MODEL,
          messages: msgs,
          tools: SWARM_TOOLS,
          tool_choice: 'auto',
        },
        { headers: { Authorization: `Bearer ${apiKey}` } },
      );
      const m = resp.data?.choices?.[0]?.message;
      if (!m) {
        throw new Error('Empty response from the AI provider');
      }
      msgs.push(m);

      const toolCalls = m.tool_calls;
      if (Array.isArray(toolCalls) && toolCalls.length > 0) {
        for (const tc of toolCalls) {
          const name = tc.function?.name ?? 'unknown';
          let args: Record<string, any> = {};
          try {
            args = JSON.parse(tc.function?.arguments || '{}');
          } catch {
            args = {};
          }
          let result = '';
          try {
            result = await execute(name, args);
          } catch (e: any) {
            result = `error: ${e?.message ?? e}`;
          }
          calls.push({ name, args, result });
          msgs.push({ role: 'tool', tool_call_id: tc.id, content: result });
        }
        continue; // let the model react to the tool results
      }

      return { content: typeof m.content === 'string' ? m.content : '', calls };
    }
    return { content: 'Done.', calls };
  } catch (error) {
    console.error('Swarm agent error:', error);
    throw new Error(friendlyError(error));
  }
};
