/**
 * Swarm AI provider configuration.
 *
 * Defaults to Groq's free, fast, OpenAI-compatible API. Grab a free key at
 * https://console.groq.com/keys and paste it in-app (Swarm → ⚙). The key is
 * stored on-device only and is never committed to source control.
 *
 * Because the endpoint is OpenAI-compatible you can repoint this at any
 * compatible provider (OpenRouter, DeepSeek, a local server, …) by editing the
 * three constants below.
 */

export const PROVIDER_NAME = 'Groq';
export const PROVIDER_KEY_URL = 'console.groq.com/keys';

export const CHAT_BASE_URL = 'https://api.groq.com/openai/v1';
export const CHAT_MODEL = 'llama-3.3-70b-versatile';

// Optional build-time default key (empty unless a private secrets file provides one).
let bakedKey = '';
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  bakedKey = require('./secrets').DEFAULT_API_KEY ?? '';
} catch {
  bakedKey = '';
}
export const DEFAULT_API_KEY = bakedKey;

// Personality / behaviour of the assistant.
export const SYSTEM_PROMPT =
  'You are Swarm, a fast and helpful AI assistant built into NeverSoft OS, a ' +
  'Windows Vista-style Android launcher. Keep answers clear and concise unless ' +
  'asked to elaborate.';
