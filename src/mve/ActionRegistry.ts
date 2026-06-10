/**
 * ActionRegistry — context-first memory for the MVE shell.
 *
 * NeverSoft-MVE is a *context-first* interface, not a chat-first one. Where the
 * old Swarm chat just persisted raw messages, the registry records the **intent**
 * behind what the user asked — a small, structured note of "what they were trying
 * to get done" — so MVE can resume or proactively finish tasks started earlier.
 *
 * Today the registry lives in the shell and keeps intents in memory. The store is
 * deliberately behind an interface so it can be delegated to the MVE engine's own
 * memory (via {@link MveBridge}) once the native module is linked — mirroring how
 * the bridge falls back to a mock when the engine isn't present.
 */

export type IntentStatus = 'open' | 'in_progress' | 'done' | 'dropped';

export interface Intent {
  id: string;
  /** The user's original phrasing that produced this intent. */
  text: string;
  /** Short, normalized one-line description of what they want done. */
  summary: string;
  /** Inferred action verb, e.g. "find", "build", "remind", "ask". */
  verb: string;
  createdMs: number;
  updatedMs: number;
  status: IntentStatus;
}

/** Verbs we recognize as task-like; the first match wins. */
const KNOWN_VERBS = [
  'find',
  'search',
  'open',
  'build',
  'make',
  'create',
  'write',
  'edit',
  'delete',
  'remove',
  'install',
  'run',
  'play',
  'remind',
  'schedule',
  'summarize',
  'explain',
  'fix',
  'show',
  'list',
];

/**
 * Cheap, deterministic intent inference. This is intentionally simple — the
 * engine will do the real understanding once linked; this just gives the shell
 * enough structure to surface "open" intents back to the user.
 */
export function inferIntent(text: string): { verb: string; summary: string } {
  const trimmed = text.trim();
  const firstWord = trimmed.toLowerCase().split(/\s+/)[0] ?? '';
  const verb = KNOWN_VERBS.includes(firstWord) ? firstWord : 'ask';
  const summary = trimmed.length > 80 ? `${trimmed.slice(0, 77)}…` : trimmed;
  return { verb, summary };
}

type Listener = (intents: Intent[]) => void;

class ActionRegistryStore {
  private intents: Intent[] = [];
  private listeners = new Set<Listener>();

  /** Record a new intent inferred from a user message. */
  capture(text: string): Intent {
    const { verb, summary } = inferIntent(text);
    const now = Date.now();
    const intent: Intent = {
      id: `${now}-${Math.random().toString(36).slice(2, 8)}`,
      text,
      summary,
      verb,
      createdMs: now,
      updatedMs: now,
      status: 'open',
    };
    this.intents = [intent, ...this.intents];
    this.emit();
    return intent;
  }

  setStatus(id: string, status: IntentStatus): void {
    this.intents = this.intents.map(it =>
      it.id === id ? { ...it, status, updatedMs: Date.now() } : it,
    );
    this.emit();
  }

  /** All intents, newest first. */
  all(): Intent[] {
    return [...this.intents];
  }

  /** Intents still awaiting completion — the "context" MVE can act on. */
  open(): Intent[] {
    return this.intents.filter(it => it.status === 'open' || it.status === 'in_progress');
  }

  clear(): void {
    this.intents = [];
    this.emit();
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.all());
    return () => this.listeners.delete(listener);
  }

  private emit(): void {
    const snapshot = this.all();
    this.listeners.forEach(l => l(snapshot));
  }
}

/** Process-wide registry. Swap the backing store for a bridge-backed one later. */
export const ActionRegistry = new ActionRegistryStore();
