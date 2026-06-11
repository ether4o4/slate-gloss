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
  /** Custom image icon (wins over the emoji glyph when set). */
  image?: ImageSourcePropType;
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
  { label: 'Chrome', icon: '🌀', pkg: 'com.android.chrome' },
];

export const GOOGLE_APPS: StoreApp[] = [
  { label: 'Google', icon: '🔍', pkg: 'com.google.android.googlequicksearchbox' },
  { label: 'Gemini', icon: '✨', pkg: 'com.google.android.apps.bard' },
  { label: 'Chrome', icon: '🌀', pkg: 'com.android.chrome' },
  { label: 'Gmail', icon: '✉️', image: ART.gmail, pkg: 'com.google.android.gm' },
  { label: 'Drive', icon: '🔺', pkg: 'com.google.android.apps.docs' },
  { label: 'Google One', icon: '🟡', pkg: 'com.google.android.apps.subscriptions.red' },
  { label: 'Maps', icon: '🗺️', pkg: 'com.google.android.apps.maps' },
  { label: 'YouTube', icon: '▶️', image: ART.youtube, pkg: 'com.google.android.youtube' },
  { label: 'Photos', icon: '🌈', pkg: 'com.google.android.apps.photos' },
  { label: 'Meet', icon: '📹', pkg: 'com.google.android.apps.tachyon' },
  { label: 'Calendar', icon: '📅', pkg: 'com.google.android.calendar' },
  { label: 'Keep', icon: '📝', pkg: 'com.google.android.keep' },
  { label: 'Files', icon: '🗂️', pkg: 'com.google.android.apps.nbu.files' },
  { label: 'Play Store', icon: '🛍️', pkg: 'com.android.vending' },
  { label: 'Wallet', icon: '💳', pkg: 'com.google.android.apps.walletnfcrel' },
  { label: 'Translate', icon: '🌐', pkg: 'com.google.android.apps.translate' },
];

export const MICROSOFT_APPS: StoreApp[] = [
  { label: 'Microsoft 365', icon: '🅾️', pkg: 'com.microsoft.office.officehubrow' },
  { label: 'Outlook', icon: '📨', pkg: 'com.microsoft.office.outlook' },
  { label: 'OneDrive', icon: '☁️', pkg: 'com.microsoft.skydrive' },
  { label: 'Word', icon: '🟦', pkg: 'com.microsoft.office.word' },
  { label: 'Excel', icon: '🟩', pkg: 'com.microsoft.office.excel' },
  { label: 'PowerPoint', icon: '🟧', pkg: 'com.microsoft.office.powerpoint' },
  { label: 'OneNote', icon: '🗒️', pkg: 'com.microsoft.office.onenote' },
  { label: 'Teams', icon: '👥', pkg: 'com.microsoft.teams' },
  { label: 'Edge', icon: '🌊', pkg: 'com.microsoft.emmx' },
  { label: 'Copilot', icon: '🤖', pkg: 'com.microsoft.copilot' },
  { label: 'To Do', icon: '✅', pkg: 'com.microsoft.todos' },
  { label: 'Authenticator', icon: '🔐', pkg: 'com.azure.authenticator' },
];
