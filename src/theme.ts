/**
 * glass design tokens. Tuned for a glossy look with cheap rendering:
 * translucent fills + linear gradients instead of per-frame blur, so there is
 * no continuous GPU cost.
 */
const grad = (...colors: string[]): string[] => colors;

export const Theme = {
  // Blue family
  aurora: grad('#3b6ea5', '#27496d', '#0f2440'),
  vignette: grad('rgba(10,22,40,0)', 'rgba(8,18,33,0.45)'),

  // Glass gloss: bright top highlight fading to a darker translucent base.
  glassSheen: grad('rgba(255,255,255,0.35)', 'rgba(255,255,255,0.06)'),
  glassFill: grad('rgba(255,255,255,0.16)', 'rgba(255,255,255,0.04)'),
  taskbar: grad('rgba(40,73,120,0.78)', 'rgba(15,36,64,0.92)'),

  orb: grad('#bfe3ff', '#3a8de0', '#0f4c91'),
  orbActive: grad('#d7f0ff', '#56a6f0', '#1463b8'),

  border: 'rgba(255,255,255,0.30)',
  borderSoft: 'rgba(255,255,255,0.16)',
  text: '#ffffff',
  textDim: '#cdd9e6',
  accent: '#2f7bf6',
  danger: '#e2574c',
};

/** Selectable taskbar gradients for the Personalize panel. */
export const TASKBAR_PRESETS: {name: string; colors: string[]}[] = [
  {name: 'Slate Blue', colors: ['rgba(40,73,120,0.78)', 'rgba(15,36,64,0.92)']},
  {name: 'Graphite', colors: ['rgba(62,64,72,0.85)', 'rgba(20,21,26,0.95)']},
  {name: 'Obsidian', colors: ['rgba(24,24,26,0.9)', 'rgba(0,0,0,0.96)']},
  {name: 'Emerald', colors: ['rgba(22,92,70,0.82)', 'rgba(8,42,30,0.94)']},
  {name: 'Royal', colors: ['rgba(80,52,140,0.82)', 'rgba(30,18,64,0.94)']},
  {name: 'Crimson', colors: ['rgba(124,40,52,0.82)', 'rgba(48,14,20,0.94)']},
  {name: 'Slate Gloss', colors: ['rgba(70,82,98,0.82)', 'rgba(24,30,40,0.94)']},
  {name: 'Sunset', colors: ['rgba(150,86,40,0.82)', 'rgba(60,28,16,0.94)']},
];
