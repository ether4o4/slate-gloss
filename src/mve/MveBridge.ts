/**
 * MveBridge — the NeverSoft shell's typed client for the MorsVitaEst engine.
 *
 * MVE runs as the backend "kernel" of the launcher: a headless Kotlin engine
 * (chat, providers, memory, tasks, MCP, and the Linux sandbox) with its own UI
 * stripped away. This module is the TypeScript side of the native bridge that
 * the shell calls into.
 *
 * Every method maps to the Kotlin facade (`MveEngine` in the MVE repo) and is
 * async, because calls cross the React Native bridge into Kotlin.
 *
 * When the native module isn't present yet (JS-only dev, or a build that hasn't
 * linked the engine), a mock implementation takes over so the shell still runs
 * and every screen renders. `MveBridge.isNative` tells the UI which is live.
 */
import { NativeModules } from 'react-native';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ServiceInstance {
  instanceId: string;
  serviceId: string;
  displayName: string;
  enabled: boolean;
}

export interface SandboxFileEntry {
  name: string;
  path: string;
  isDirectory: boolean;
  sizeBytes: number;
  lastModifiedMs: number;
}

export interface SandboxStatus {
  installed: boolean;
  ready: boolean;
  working: boolean;
  statusText: string;
}

export interface ValidationResult {
  saved: boolean;
  output: string;
}

export interface MveBridgeApi {
  // Chat
  sendMessage(text: string): Promise<string>;
  getHistory(): Promise<ChatMessage[]>;
  startNewChat(): Promise<void>;
  clearChat(): Promise<void>;

  // Providers / API keys
  services(): Promise<ServiceInstance[]>;
  getApiKey(instanceId: string): Promise<string>;
  setApiKey(instanceId: string, apiKey: string): Promise<void>;
  setServiceEnabled(instanceId: string, enabled: boolean): Promise<void>;

  // Core toggles
  isSandboxEnabled(): Promise<boolean>;
  setSandboxEnabled(enabled: boolean): Promise<void>;
  isDaemonEnabled(): Promise<boolean>;
  setDaemonEnabled(enabled: boolean): Promise<void>;

  // Sandbox: terminal + files
  sandboxStatus(): Promise<SandboxStatus>;
  setupSandbox(): Promise<void>;
  run(command: string): Promise<string>;
  listDir(path: string): Promise<SandboxFileEntry[]>;
  readFile(path: string): Promise<string | null>;
  writeFile(path: string, content: string): Promise<boolean>;

  // Use-case helpers
  searchFilenames(root: string, keyword: string): Promise<string[]>;
  writeIfValid(
    path: string,
    content: string,
    validateCommand: string,
  ): Promise<ValidationResult>;
}

const native = NativeModules.MveBridge as MveBridgeApi | undefined;

/**
 * In-memory mock used when the native engine isn't linked. It keeps the shell
 * fully interactive in dev and makes it obvious (via banners) that no real
 * engine is attached.
 */
function createMockBridge(): MveBridgeApi {
  const history: ChatMessage[] = [];
  let sandboxEnabled = true;
  let daemonEnabled = false;
  const files: Record<string, string> = {
    '/root/notes.txt': 'MVE engine not linked — this is mock sandbox data.\n',
  };

  const delay = <T>(value: T): Promise<T> =>
    new Promise(resolve => setTimeout(() => resolve(value), 120));

  return {
    async sendMessage(text) {
      history.push({ role: 'user', content: text });
      const reply =
        '[mock engine] Link the MVE native module to get real responses. ' +
        `You said: "${text}"`;
      history.push({ role: 'assistant', content: reply });
      return delay(reply);
    },
    getHistory: () => delay([...history]),
    startNewChat: async () => {
      history.length = 0;
    },
    clearChat: async () => {
      history.length = 0;
    },

    services: () =>
      delay([
        {
          instanceId: 'mock-anthropic',
          serviceId: 'anthropic',
          displayName: 'Anthropic (mock)',
          enabled: true,
        },
        {
          instanceId: 'mock-openrouter',
          serviceId: 'openrouter',
          displayName: 'OpenRouter (mock)',
          enabled: false,
        },
      ]),
    getApiKey: () => delay(''),
    setApiKey: async () => {},
    setServiceEnabled: async () => {},

    isSandboxEnabled: () => delay(sandboxEnabled),
    setSandboxEnabled: async enabled => {
      sandboxEnabled = enabled;
    },
    isDaemonEnabled: () => delay(daemonEnabled),
    setDaemonEnabled: async enabled => {
      daemonEnabled = enabled;
    },

    sandboxStatus: () =>
      delay({
        installed: false,
        ready: false,
        working: false,
        statusText: 'Mock sandbox — engine not linked',
      }),
    setupSandbox: async () => {},
    run: command => delay(`[mock] $ ${command}\n(engine not linked)`),
    listDir: path =>
      delay(
        Object.keys(files)
          .filter(p => p.startsWith(path))
          .map(p => ({
            name: p.split('/').pop() ?? p,
            path: p,
            isDirectory: false,
            sizeBytes: files[p].length,
            lastModifiedMs: Date.now(),
          })),
      ),
    readFile: path => delay(files[path] ?? null),
    writeFile: async (path, content) => {
      files[path] = content;
      return true;
    },

    searchFilenames: (root, keyword) =>
      delay(
        Object.keys(files).filter(
          p =>
            p.startsWith(root) &&
            (p.split('/').pop() ?? '')
              .toLowerCase()
              .includes(keyword.toLowerCase()),
        ),
      ),
    writeIfValid: async (path, content) => {
      files[path] = content;
      return { saved: true, output: '[mock] validation skipped — engine not linked' };
    },
  };
}

/** True when the real Kotlin engine is linked; false when running on the mock. */
export const isNative: boolean = native != null;

/** The active bridge — native engine if linked, otherwise the dev mock. */
export const MveBridge: MveBridgeApi = native ?? createMockBridge();
