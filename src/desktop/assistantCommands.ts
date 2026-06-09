/**
 * assistantCommands — things the NeverSoft Service Assistant handles itself,
 * before a message ever reaches the LLM engine:
 *
 *   themes                      → list the full pre-configured design catalog
 *   theme <name>                → switch the whole OS to that design
 *   call you / your name is <x> → rename the assistant
 *   $ <command>                 → run it in the real sandbox shell
 *
 * Returns the assistant's reply when a message is handled locally, or null to
 * pass the message through to the engine.
 */
import { THEMES, ThemeStore } from '../theme/themes';
import { SHELL_PROMPT } from './Terminal';
import { runShell } from './ShellBridge';

export async function handleAssistantCommand(text: string): Promise<string | null> {
  const trimmed = text.trim();
  const lower = trimmed.toLowerCase();

  // ── Real shell access: "$ ls -la" or "sh ls -la" ──
  if (trimmed.startsWith('$ ') || lower.startsWith('sh ')) {
    const cmd = trimmed.startsWith('$ ') ? trimmed.slice(2) : trimmed.slice(3);
    try {
      const out = await runShell(cmd.trim());
      return `${SHELL_PROMPT} ${cmd.trim()}\n\n${out || '(no output)'}`;
    } catch (e) {
      return `${SHELL_PROMPT} ${cmd.trim()}\n\nerror: ${String(e)}`;
    }
  }

  // ── Theme catalog ──
  if (
    lower === 'themes' ||
    lower === 'theme' ||
    lower === 'list themes' ||
    lower === 'show themes' ||
    lower === 'designs' ||
    lower === 'show designs'
  ) {
    const current = ThemeStore.theme().id;
    const lines = THEMES.map(
      t => `${t.id === current ? '●' : '○'} ${t.name} — ${t.tagline}`,
    );
    return (
      `Here's the design catalog (${THEMES.length} pre-configured themes):\n\n` +
      lines.join('\n') +
      `\n\nSay "theme <name>" to switch — or use the Aesthetic Quickswitch in the clock popup.`
    );
  }

  // ── Theme switching: "theme royale noir", "switch to bubblegum", "set theme frost" ──
  const themeMatch =
    lower.match(/^(?:set\s+)?theme\s+(.+)$/) ??
    lower.match(/^switch\s+(?:theme\s+)?to\s+(.+)$/) ??
    lower.match(/^change\s+(?:the\s+)?(?:theme|design|background)\s+to\s+(.+)$/);
  if (themeMatch) {
    const switched = ThemeStore.setThemeByName(themeMatch[1]);
    if (switched) {
      return `Done — switched to ${switched.name}. ${switched.tagline}`;
    }
    return `I don't have a theme matching "${themeMatch[1]}". Say "themes" to see the catalog.`;
  }

  // ── Assistant rename: "call you Ava", "your name is Ava", "rename assistant to Ava" ──
  const nameMatch =
    trimmed.match(/^(?:i(?:'| wi)ll )?call you ([\w .'-]{1,40})$/i) ??
    trimmed.match(/^your name is ([\w .'-]{1,40})$/i) ??
    trimmed.match(/^rename (?:the )?assistant (?:to )?([\w .'-]{1,40})$/i);
  if (nameMatch) {
    ThemeStore.setAssistantName(nameMatch[1]);
    return `From now on I'm ${nameMatch[1].trim()}. What's next?`;
  }
  if (lower === 'what is your name' || lower === "what's your name") {
    return `I'm ${ThemeStore.get().assistantName}. You can rename me — just say "call you <name>".`;
  }

  return null;
}
