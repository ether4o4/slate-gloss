/**
 * Swarm's "command sandbox": a fixed, safe vocabulary of launcher actions the
 * AI can invoke via OpenAI-style tool calls. No arbitrary code — every command
 * maps to a vetted handler in App.tsx.
 */

export interface ThemeDef {
  name: string;
  colors: string[];
}

/** Themes you can ONLY unlock by asking Swarm (not in the Personalize picker). */
export const AI_THEMES: ThemeDef[] = [
  {name: 'Midnight Aurora', colors: ['rgba(26,42,108,0.88)', 'rgba(76,20,110,0.92)']},
  {name: 'Vaporwave', colors: ['rgba(255,110,199,0.78)', 'rgba(110,90,255,0.86)']},
  {name: 'Matrix', colors: ['rgba(12,46,18,0.9)', 'rgba(0,14,5,0.96)']},
  {name: 'Inferno', colors: ['rgba(158,32,20,0.88)', 'rgba(40,8,4,0.96)']},
  {name: 'Cotton Candy', colors: ['rgba(255,170,210,0.8)', 'rgba(150,190,255,0.82)']},
  {name: 'Gold Rush', colors: ['rgba(160,126,30,0.88)', 'rgba(60,44,8,0.96)']},
  {name: 'Deep Sea', colors: ['rgba(10,64,86,0.88)', 'rgba(2,20,35,0.96)']},
  {name: 'Synthwave Sunset', colors: ['rgba(255,94,98,0.82)', 'rgba(60,20,90,0.9)']},
  {name: 'Ghost', colors: ['rgba(180,190,200,0.45)', 'rgba(40,46,54,0.7)']},
];

/** OpenAI/Groq-compatible tool schema sent with each Swarm request. */
export const SWARM_TOOLS = [
  {
    type: 'function',
    function: {
      name: 'apply_theme',
      description:
        'Apply a named taskbar theme (recolors the taskbar). Includes secret AI-only themes.',
      parameters: {
        type: 'object',
        properties: {name: {type: 'string', description: 'Theme name, e.g. "Matrix"'}},
        required: ['name'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_themes',
      description: 'List all theme names that can be applied (including secret AI-only ones).',
      parameters: {type: 'object', properties: {}},
    },
  },
  {
    type: 'function',
    function: {
      name: 'launch_app',
      description: 'Open an installed app by (partial) name.',
      parameters: {
        type: 'object',
        properties: {name: {type: 'string', description: 'App name, e.g. "camera"'}},
        required: ['name'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'pin_app',
      description: 'Pin an app to the Start menu / taskbar by name.',
      parameters: {
        type: 'object',
        properties: {name: {type: 'string'}},
        required: ['name'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'add_to_desktop',
      description: 'Add an app shortcut to the desktop by name.',
      parameters: {
        type: 'object',
        properties: {name: {type: 'string'}},
        required: ['name'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'toggle_widget',
      description:
        'Show or hide a widget in the calendar/notification panel. Valid ids: calendar, notifications, weather, battery, system, notes.',
      parameters: {
        type: 'object',
        properties: {id: {type: 'string'}},
        required: ['id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'open_wallpaper_picker',
      description: 'Open the system image picker so the user can choose a wallpaper.',
      parameters: {type: 'object', properties: {}},
    },
  },
  {
    type: 'function',
    function: {
      name: 'open_start_icon_picker',
      description: 'Open the image picker to set a custom Start-button image.',
      parameters: {type: 'object', properties: {}},
    },
  },
  {
    type: 'function',
    function: {
      name: 'set_default_launcher',
      description: 'Prompt the user to set NeverSoft OS as the default home app.',
      parameters: {type: 'object', properties: {}},
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_status',
      description: 'Get device status: time, battery, RAM, storage, and number of installed apps.',
      parameters: {type: 'object', properties: {}},
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_commands',
      description: 'List everything you can do for the user (themes, apps, widgets, device).',
      parameters: {type: 'object', properties: {}},
    },
  },
];

/** Copy-paste-friendly cheat sheet of example things to ask Swarm. */
export const SWARM_CHEATSHEET: {category: string; items: string[]}[] = [
  {
    category: 'Themes & looks',
    items: [
      'Make the taskbar matrix',
      'Give me a secret theme',
      'List all themes',
      'Change my wallpaper',
      'Let me set a custom start button',
    ],
  },
  {
    category: 'Apps',
    items: ['Open the camera', 'Pin Chrome', 'Add Maps to my desktop', 'Launch Spotify'],
  },
  {
    category: 'Widgets',
    items: [
      'Turn on the weather widget',
      'Turn off the notifications widget',
      'Show the system widget',
    ],
  },
  {
    category: 'Device',
    items: [
      "What's my battery and RAM?",
      'What time is it?',
      'Set NeverSoft as my default launcher',
    ],
  },
];

/** Flat text version (used by the list_commands tool). */
export const cheatsheetText = (): string =>
  SWARM_CHEATSHEET.map(c => `${c.category}:\n` + c.items.map(i => `• ${i}`).join('\n')).join('\n\n');
