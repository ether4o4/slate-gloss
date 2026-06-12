/**
 * Play Store wiring for the desktop shell icons.
 *
 * Every "shell" icon on the home screen deep-links straight to its app on the
 * Play Store (market:// first, https fallback), or launches the app itself
 * when it's already installed (openAppOrStore).
 */
import { type ImageSourcePropType, Linking } from 'react-native';

export interface StoreApp {
  label: string;
  icon: string;
  pkg: string;
  /** Custom image icon (wins over everything when set). */
  image?: ImageSourcePropType;
  /** Glossy macOS-style tile: brand gradient + glyph. */
  tile?: { colors: [string, string]; glyph: string };
  /** Optional note shown in pickers ("rare find", etc.). */
  note?: string;
}

const ART = {
  gmail: require('../assets/icons/gmail.png'),
  youtube: require('../assets/icons/youtube.png'),
};

export async function openPlayStore(pkg: string): Promise<void> {
  const market = `market://details?id=${pkg}`;
  const web = `https://play.google.com/store/apps/details?id=${pkg}`;
  try {
    await Linking.openURL(market);
  } catch {
    Linking.openURL(web).catch(() => {});
  }
}

export async function openPlayStoreSearch(query: string): Promise<void> {
  const market = `market://search?q=${encodeURIComponent(query)}`;
  const web = `https://play.google.com/store/search?q=${encodeURIComponent(query)}&c=apps`;
  try {
    await Linking.openURL(market);
  } catch {
    Linking.openURL(web).catch(() => {});
  }
}

/**
 * Launch an installed app by package, falling back to its store page
 * (or a custom URL such as a GitHub APK release) when it isn't installed.
 */
export async function openAppOrStore(pkg: string, fallbackUrl?: string): Promise<void> {
  try {
    // Android intent scheme — resolves to the app's launcher activity if installed.
    await Linking.openURL(`intent://#Intent;package=${pkg};end`);
  } catch {
    if (fallbackUrl) {
      Linking.openURL(fallbackUrl).catch(() => openPlayStore(pkg));
    } else {
      openPlayStore(pkg);
    }
  }
}

/** The real NeverSoft (Ghost Key) file explorer. */
export const GHOST_KEY_PKG = 'com.ether4o4.ghostkeyfileexplorer';
export const GHOST_KEY_APK_URL =
  'https://github.com/ether4o4/Ghost-key-file-explorer/releases/download/android-preview/neversoft-services-file-explorer.apk';

/**
 * The NeverSoft Services GitHub — opened by the permanent NeverSoft
 * home-screen icon.
 */
export const NEVERSOFT_GITHUB_URL = 'https://github.com/ether4o4';

export async function openUrl(url: string): Promise<void> {
  Linking.openURL(url).catch(() => {});
}

/** Browser picker — rarer browsers first, mainstream after. */
export const BROWSERS: StoreApp[] = [
  { label: 'Kiwi Browser', icon: '🥝', pkg: 'com.kiwibrowser.browser', note: 'rare find — Chrome extensions on mobile' },
  { label: 'Firefox Nightly', icon: '🦊', pkg: 'org.mozilla.fenix', note: 'rare find — bleeding edge builds' },
  { label: 'Brave', icon: '🦁', pkg: 'com.brave.browser', note: 'ad-block built in' },
  { label: 'DuckDuckGo', icon: '🦆', pkg: 'com.duckduckgo.mobile.android', note: 'privacy first' },
  { label: 'Opera GX', icon: '🎮', pkg: 'com.opera.gx', note: 'the gaming browser' },
  { label: 'Firefox', icon: '🔥', pkg: 'org.mozilla.firefox' },
  { label: 'Chrome', icon: '🌀', pkg: 'com.android.chrome', tile: { colors: ['#57c065', '#2f7bf6'], glyph: 'C' }, },
];

export const GOOGLE_APPS: StoreApp[] = [
  { label: 'Google', icon: '🔍', pkg: 'com.google.android.googlequicksearchbox', tile: { colors: ['#5b8def', '#1a73e8'], glyph: 'G' }, },
  { label: 'Gemini', icon: '✨', pkg: 'com.google.android.apps.bard', tile: { colors: ['#9b8cff', '#4e8df5'], glyph: '✦' }, },
  { label: 'Chrome', icon: '🌀', pkg: 'com.android.chrome', tile: { colors: ['#57c065', '#2f7bf6'], glyph: 'C' } },
  { label: 'Gmail', icon: '✉️', image: ART.gmail, pkg: 'com.google.android.gm' },
  { label: 'Drive', icon: '🔺', pkg: 'com.google.android.apps.docs', tile: { colors: ['#ffd54f', '#34a853'], glyph: '▲' }, },
  { label: 'Google One', icon: '🟡', pkg: 'com.google.android.apps.subscriptions.red', tile: { colors: ['#fbbc04', '#ea4335'], glyph: '1' }, },
  { label: 'Maps', icon: '🗺️', pkg: 'com.google.android.apps.maps', tile: { colors: ['#34a853', '#1a73e8'], glyph: '◆' }, },
  { label: 'YouTube', icon: '▶️', image: ART.youtube, pkg: 'com.google.android.youtube' },
  { label: 'Photos', icon: '🌈', pkg: 'com.google.android.apps.photos', tile: { colors: ['#ff8a80', '#fbbc04'], glyph: '✿' }, },
  { label: 'Meet', icon: '📹', pkg: 'com.google.android.apps.tachyon', tile: { colors: ['#26c6a2', '#0f9d58'], glyph: 'M' }, },
  { label: 'Calendar', icon: '📅', pkg: 'com.google.android.calendar', tile: { colors: ['#4d90fe', '#1a5dc8'], glyph: '31' }, },
  { label: 'Keep', icon: '📝', pkg: 'com.google.android.keep', tile: { colors: ['#ffe066', '#f9ab00'], glyph: 'K' }, },
  { label: 'Files', icon: '🗂️', pkg: 'com.google.android.apps.nbu.files', tile: { colors: ['#42a5f5', '#0b8043'], glyph: 'F' }, },
  { label: 'Play Store', icon: '🛍️', pkg: 'com.android.vending', tile: { colors: ['#34d2eb', '#34a853'], glyph: '▶' }, },
  { label: 'Wallet', icon: '💳', pkg: 'com.google.android.apps.walletnfcrel', tile: { colors: ['#6ea8ff', '#34a853'], glyph: 'W' }, },
  { label: 'Translate', icon: '🌐', pkg: 'com.google.android.apps.translate', tile: { colors: ['#7bb4ff', '#2e7d32'], glyph: '文' }, },
];

export const MICROSOFT_APPS: StoreApp[] = [
  { label: 'Microsoft 365', icon: '🅾️', pkg: 'com.microsoft.office.officehubrow', tile: { colors: ['#ff7a59', '#d83b01'], glyph: '365' }, },
  { label: 'Outlook', icon: '📨', pkg: 'com.microsoft.office.outlook', tile: { colors: ['#41a4e6', '#0f6cbd'], glyph: 'O' }, },
  { label: 'OneDrive', icon: '☁️', pkg: 'com.microsoft.skydrive', tile: { colors: ['#54b4ef', '#0364b8'], glyph: '☁' }, },
  { label: 'Word', icon: '🟦', pkg: 'com.microsoft.office.word', tile: { colors: ['#5b9bd5', '#185abd'], glyph: 'W' }, },
  { label: 'Excel', icon: '🟩', pkg: 'com.microsoft.office.excel', tile: { colors: ['#4ec07a', '#107c41'], glyph: 'X' }, },
  { label: 'PowerPoint', icon: '🟧', pkg: 'com.microsoft.office.powerpoint', tile: { colors: ['#ff8f6b', '#c43e1c'], glyph: 'P' }, },
  { label: 'OneNote', icon: '🗒️', pkg: 'com.microsoft.office.onenote', tile: { colors: ['#b06ad4', '#7719aa'], glyph: 'N' }, },
  { label: 'Teams', icon: '👥', pkg: 'com.microsoft.teams', tile: { colors: ['#8b93f8', '#4b53bc'], glyph: 'T' }, },
  { label: 'Edge', icon: '🌊', pkg: 'com.microsoft.emmx', tile: { colors: ['#49d2c5', '#0c59a4'], glyph: 'e' }, },
  { label: 'Copilot', icon: '🤖', pkg: 'com.microsoft.copilot', tile: { colors: ['#9fc4ff', '#7a5af8'], glyph: '◈' }, },
  { label: 'To Do', icon: '✅', pkg: 'com.microsoft.todos', tile: { colors: ['#79a7ff', '#2564cf'], glyph: '✓' }, },
  { label: 'Authenticator', icon: '🔐', pkg: 'com.azure.authenticator', tile: { colors: ['#5fa8e8', '#005a9e'], glyph: 'A' }, },
];
