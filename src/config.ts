/**
 * App configuration.
 *
 * The DeepSeek API key is NOT stored in source control. The user enters it once
 * inside the app (Swarm → settings) and it is saved on-device via AsyncStorage.
 * This keeps the key out of git/the public repo. If you ever want to bake a key
 * into a private build you can put one in a gitignored `src/secrets.ts` exporting
 * `DEFAULT_DEEPSEEK_API_KEY`, but be aware anything bundled into an APK can be
 * extracted by decompiling it.
 */

export const DEEPSEEK_BASE_URL = 'https://api.deepseek.com/v1';
export const DEEPSEEK_MODEL = 'deepseek-chat';

// Optional build-time default (empty unless a private secrets file provides one).
let bakedKey = '';
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  bakedKey = require('./secrets').DEFAULT_DEEPSEEK_API_KEY ?? '';
} catch {
  bakedKey = '';
}
export const DEFAULT_DEEPSEEK_API_KEY = bakedKey;

// Personality / behaviour of the assistant.
export const SYSTEM_PROMPT =
  'You are Swarm, a fast and helpful AI assistant living inside the Vista ' +
  'Launcher. Keep answers clear and concise unless asked to elaborate.';
