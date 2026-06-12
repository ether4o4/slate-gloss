/**
 * NeverSoft theme system — the catalog of pre-configured designs the
 * NeverSoft Service Assistant offers, plus the live aesthetic state
 * (active theme, assistant name, quick-switch toggles).
 *
 * Module-level store with a subscribe() seam (same pattern as
 * ActionRegistry) so both React surfaces and the assistant's chat
 * command handler can read and switch aesthetics from anywhere.
 */

export interface Theme {
  id: string;
  name: string;
  tagline: string;
  /** Four-stop background gradient, top-left to bottom-right. */
  gradient: [string, string, string, string];
  /** Accent used for pills, active chips, highlights. */
  accent: string;
  /** Glass tint laid over panels (kept inside the Vista .15–.25 band). */
  glassTint: string;
}

export const THEMES: Theme[] = [
  {
    id: 'wallpaper',
    name: 'My Wallpaper',
    tagline: 'Your Android wallpaper showing through, with the launcher vignette.',
    gradient: [
      'rgba(10,22,40,0)',
      'rgba(10,22,40,0.12)',
      'rgba(8,18,33,0.30)',
      'rgba(8,18,33,0.45)',
    ],
    accent: '#2f7bf6',
    glassTint: 'rgba(255,255,255,0.16)',
  },
  {
    id: 'vista-aurora',
    name: 'Vista Aurora',
    tagline: 'The signature NeverSoft blue — Aero glass over deep aurora.',
    gradient: ['#2c5aa0', '#3d7ab8', '#1a3a5c', '#0d2137'],
    accent: '#78aaeb',
    glassTint: 'rgba(255,255,255,0.18)',
  },
  {
    id: 'aero-graphite',
    name: 'Aero Graphite',
    tagline: 'Gunmetal glass — quiet, focused, executive.',
    gradient: ['#3a3f47', '#23272e', '#16191e', '#0a0c0f'],
    accent: '#9fb6cc',
    glassTint: 'rgba(255,255,255,0.15)',
  },
  {
    id: 'emerald-bliss',
    name: 'Emerald Bliss',
    tagline: 'Rolling-hill greens, straight off the classic wallpaper.',
    gradient: ['#1e7d4f', '#2da06b', '#155c3a', '#0a3322'],
    accent: '#7be0a8',
    glassTint: 'rgba(255,255,255,0.18)',
  },
  {
    id: 'royale-noir',
    name: 'Royale Noir',
    tagline: 'The lost purple-black royale, resurrected.',
    gradient: ['#4a3b63', '#2e2440', '#1d1530', '#0e0a18'],
    accent: '#b69fe0',
    glassTint: 'rgba(255,255,255,0.16)',
  },
  {
    id: 'sunset-ultimate',
    name: 'Sunset Ultimate',
    tagline: 'Burnt-orange dusk with molten glass highlights.',
    gradient: ['#c0572e', '#e0784a', '#8a3a1d', '#3a1408'],
    accent: '#ffb27d',
    glassTint: 'rgba(255,255,255,0.20)',
  },
  {
    id: 'longhorn-sky',
    name: 'Longhorn Sky',
    tagline: 'Daylight build — bright skies and soft cloud glass.',
    gradient: ['#3f8fc4', '#6fb3dd', '#2a6a99', '#123349'],
    accent: '#a8d8f0',
    glassTint: 'rgba(255,255,255,0.22)',
  },
  {
    id: 'bubblegum-pop',
    name: 'Bubblegum Pop',
    tagline: 'Hot pink Aero — maximum personality.',
    gradient: ['#c45a9e', '#e07ab8', '#933a74', '#3f1631'],
    accent: '#ffaad9',
    glassTint: 'rgba(255,255,255,0.20)',
  },
  {
    id: 'midnight-neon',
    name: 'Midnight Neon',
    tagline: 'Near-black canvas, electric cyan edge light.',
    gradient: ['#0f1b2e', '#15233c', '#0a1322', '#05080f'],
    accent: '#00d4ff',
    glassTint: 'rgba(255,255,255,0.15)',
  },
  {
    id: 'citrus-burst',
    name: 'Citrus Burst',
    tagline: 'Golden hour glass — warm, loud, awake.',
    gradient: ['#b28a1f', '#d9ab32', '#8a6a14', '#3d2e07'],
    accent: '#ffe27d',
    glassTint: 'rgba(255,255,255,0.20)',
  },
  {
    id: 'arctic-frost',
    name: 'Arctic Frost',
    tagline: 'Pale ice blues — the lightest glass in the catalog.',
    gradient: ['#7fa8c9', '#a8c8e0', '#5c84a8', '#2e4a66'],
    accent: '#e8f4ff',
    glassTint: 'rgba(255,255,255,0.25)',
  },
];

export interface AestheticState {
  themeId: string;
  assistantName: string;
  /** Quick-switch toggles surfaced in the notification-center widget box. */
  transparency: boolean;
  pulseAnimations: boolean;
}

type Listener = () => void;

const state: AestheticState = {
  themeId: THEMES[0].id,
  assistantName: 'NeverSoft Service Assistant',
  transparency: true,
  pulseAnimations: true,
};

const listeners = new Set<Listener>();

function emit() {
  listeners.forEach(fn => fn());
}

export const ThemeStore = {
  subscribe(fn: Listener): () => void {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },

  get(): AestheticState {
    return { ...state };
  },

  theme(): Theme {
    return THEMES.find(t => t.id === state.themeId) ?? THEMES[0];
  },

  setTheme(id: string): boolean {
    const found = THEMES.find(t => t.id === id);
    if (!found) return false;
    state.themeId = found.id;
    emit();
    return true;
  },

  /** Fuzzy switch by user-typed name — "theme royale", "bubblegum", etc. */
  setThemeByName(query: string): Theme | null {
    const q = query.trim().toLowerCase();
    if (!q) return null;
    const found =
      THEMES.find(t => t.name.toLowerCase() === q || t.id === q) ??
      THEMES.find(
        t => t.name.toLowerCase().includes(q) || t.id.includes(q.replace(/\s+/g, '-')),
      );
    if (!found) return null;
    state.themeId = found.id;
    emit();
    return found;
  },

  setAssistantName(name: string) {
    const clean = name.trim();
    if (!clean) return;
    state.assistantName = clean;
    emit();
  },

  setTransparency(on: boolean) {
    state.transparency = on;
    emit();
  },

  setPulseAnimations(on: boolean) {
    state.pulseAnimations = on;
    emit();
  },
};
