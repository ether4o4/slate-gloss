import AsyncStorage from '@react-native-async-storage/async-storage';

/** A desktop shortcut with a stored grid position. */
export interface DesktopIcon {
  packageName: string;
  /** grid column / row (icons snap to a grid). */
  col: number;
  row: number;
}

export interface RecycleItem {
  packageName: string;
  deletedAt: number;
}

/** A real Android AppWidget placed on the desktop (free position + size in px). */
export interface DesktopWidget {
  widgetId: number;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface LauncherState {
  pinned: string[]; // package names pinned to the Start menu
  desktop: DesktopIcon[]; // shortcuts placed on the desktop
  recents: string[]; // most-recently launched (newest first)
  recycle: RecycleItem[]; // shortcuts sent to the Recycle Bin
  startSize: { width: number; height: number }; // resizable Start menu
  taskbarColors: string[]; // gradient colors for the taskbar
  startIcon: string; // custom Start-button image uri ('' = default pearl)
  widgets: string[]; // enabled widgets in the calendar/notification panel
  notes: string; // contents of the notes widget
  desktopWidgets: DesktopWidget[]; // real hosted AppWidgets on the desktop
}

/** All widgets available in the calendar/notification panel. */
export const WIDGET_CATALOG: { id: string; name: string }[] = [
  { id: 'notifications', name: 'Notifications' },
  { id: 'weather', name: 'Weather' },
  { id: 'battery', name: 'Battery' },
  { id: 'system', name: 'System' },
  { id: 'notes', name: 'Notes' },
];

const KEY = '@nsos_launcher_state_v1';
const MAX_RECENTS = 8;

export const DEFAULT_TASKBAR_COLORS = [
  'rgba(40,73,120,0.78)',
  'rgba(15,36,64,0.92)',
];

const DEFAULT_STATE: LauncherState = {
  pinned: [],
  desktop: [],
  recents: [],
  recycle: [],
  startSize: { width: 0, height: 0 }, // 0 = use default size
  taskbarColors: DEFAULT_TASKBAR_COLORS,
  startIcon: '',
  widgets: ['notifications', 'weather', 'battery'],
  notes: '',
  desktopWidgets: [],
};

export const loadState = async (): Promise<LauncherState> => {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) {
      return { ...DEFAULT_STATE };
    }
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_STATE, ...parsed };
  } catch (e) {
    console.error('loadState failed:', e);
    return { ...DEFAULT_STATE };
  }
};

export const saveState = async (state: LauncherState): Promise<void> => {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(state));
  } catch (e) {
    console.error('saveState failed:', e);
  }
};

export const recordRecent = (
  state: LauncherState,
  pkg: string,
): LauncherState => {
  const recents = [pkg, ...state.recents.filter(p => p !== pkg)].slice(
    0,
    MAX_RECENTS,
  );
  return { ...state, recents };
};

export const togglePin = (state: LauncherState, pkg: string): LauncherState => {
  const pinned = state.pinned.includes(pkg)
    ? state.pinned.filter(p => p !== pkg)
    : [...state.pinned, pkg];
  return { ...state, pinned };
};

/** Adds a shortcut to the first free desktop grid cell (if not already there). */
export const addToDesktop = (
  state: LauncherState,
  pkg: string,
  cols: number,
  rows: number,
): LauncherState => {
  if (state.desktop.some(d => d.packageName === pkg)) {
    return state;
  }
  const taken = new Set(state.desktop.map(d => `${d.col},${d.row}`));
  for (let col = 0; col < cols; col++) {
    for (let row = 0; row < rows; row++) {
      if (!taken.has(`${col},${row}`)) {
        return {
          ...state,
          desktop: [...state.desktop, { packageName: pkg, col, row }],
        };
      }
    }
  }
  // Grid full — stack at 0,0.
  return {
    ...state,
    desktop: [...state.desktop, { packageName: pkg, col: 0, row: 0 }],
  };
};

export const moveDesktopIcon = (
  state: LauncherState,
  pkg: string,
  col: number,
  row: number,
): LauncherState => {
  // If another icon holds the target cell, swap positions.
  const moving = state.desktop.find(d => d.packageName === pkg);
  if (!moving) {
    return state;
  }
  const occupant = state.desktop.find(
    d => d.col === col && d.row === row && d.packageName !== pkg,
  );
  const desktop = state.desktop.map(d => {
    if (d.packageName === pkg) {
      return { ...d, col, row };
    }
    if (occupant && d.packageName === occupant.packageName) {
      return { ...d, col: moving.col, row: moving.row };
    }
    return d;
  });
  return { ...state, desktop };
};

/** Moves a desktop shortcut into the Recycle Bin. */
export const recycleDesktopIcon = (
  state: LauncherState,
  pkg: string,
): LauncherState => ({
  ...state,
  desktop: state.desktop.filter(d => d.packageName !== pkg),
  recycle: [
    { packageName: pkg, deletedAt: Date.now() },
    ...state.recycle.filter(r => r.packageName !== pkg),
  ],
});

export const restoreFromRecycle = (
  state: LauncherState,
  pkg: string,
  cols: number,
  rows: number,
): LauncherState => {
  const without = {
    ...state,
    recycle: state.recycle.filter(r => r.packageName !== pkg),
  };
  return addToDesktop(without, pkg, cols, rows);
};

export const emptyRecycle = (state: LauncherState): LauncherState => ({
  ...state,
  recycle: [],
});

export const setStartSize = (
  state: LauncherState,
  width: number,
  height: number,
): LauncherState => ({ ...state, startSize: { width, height } });

export const setTaskbarColors = (
  state: LauncherState,
  colors: string[],
): LauncherState => ({
  ...state,
  taskbarColors: colors,
});

export const setStartIcon = (
  state: LauncherState,
  uri: string,
): LauncherState => ({
  ...state,
  startIcon: uri,
});

export const toggleWidget = (
  state: LauncherState,
  id: string,
): LauncherState => ({
  ...state,
  widgets: state.widgets.includes(id)
    ? state.widgets.filter(w => w !== id)
    : [...state.widgets, id],
});

export const setNotes = (
  state: LauncherState,
  notes: string,
): LauncherState => ({
  ...state,
  notes,
});

export const addDesktopWidget = (
  state: LauncherState,
  w: DesktopWidget,
): LauncherState => ({
  ...state,
  desktopWidgets: [...state.desktopWidgets, w],
});

export const removeDesktopWidget = (
  state: LauncherState,
  widgetId: number,
): LauncherState => ({
  ...state,
  desktopWidgets: state.desktopWidgets.filter(w => w.widgetId !== widgetId),
});

export const moveDesktopWidget = (
  state: LauncherState,
  widgetId: number,
  x: number,
  y: number,
): LauncherState => ({
  ...state,
  desktopWidgets: state.desktopWidgets.map(w =>
    w.widgetId === widgetId ? { ...w, x, y } : w,
  ),
});
