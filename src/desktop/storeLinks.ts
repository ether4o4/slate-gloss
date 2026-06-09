/**
 * Play Store wiring for the desktop shell icons.
 *
 * Every "shell" icon on the home screen deep-links straight to its app on the
 * Play Store (market:// first, https fallback), or launches the app itself
 * when it's already installed (openAppOrStore).
 */
import { Linking } from 'react-native';

export interface StoreApp {
  label: string;
  icon: string;
  pkg: string;
  /** Optional note shown in pickers ("rare find", etc.). */
  note?: string;
}

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
  { label: 'Chrome', icon: '🌀', pkg: 'com.android.chrome' },
  { label: 'Gmail', icon: '✉️', pkg: 'com.google.android.gm' },
  { label: 'Maps', icon: '🗺️', pkg: 'com.google.android.apps.maps' },
  { label: 'YouTube', icon: '▶️', pkg: 'com.google.android.youtube' },
  { label: 'Drive', icon: '🔺', pkg: 'com.google.android.apps.docs' },
  { label: 'Photos', icon: '🌈', pkg: 'com.google.android.apps.photos' },
  { label: 'Calendar', icon: '📅', pkg: 'com.google.android.calendar' },
  { label: 'Keep', icon: '📝', pkg: 'com.google.android.keep' },
  { label: 'Files', icon: '🗂️', pkg: 'com.google.android.apps.nbu.files' },
  { label: 'Translate', icon: '🌐', pkg: 'com.google.android.apps.translate' },
];

export const MICROSOFT_APPS: StoreApp[] = [
  { label: 'Word', icon: '🟦', pkg: 'com.microsoft.office.word' },
  { label: 'Excel', icon: '🟩', pkg: 'com.microsoft.office.excel' },
  { label: 'PowerPoint', icon: '🟧', pkg: 'com.microsoft.office.powerpoint' },
  { label: 'Outlook', icon: '📨', pkg: 'com.microsoft.office.outlook' },
  { label: 'Teams', icon: '👥', pkg: 'com.microsoft.teams' },
  { label: 'OneDrive', icon: '☁️', pkg: 'com.microsoft.skydrive' },
  { label: 'Edge', icon: '🌊', pkg: 'com.microsoft.emmx' },
  { label: 'Copilot', icon: '🤖', pkg: 'com.microsoft.copilot' },
  { label: 'OneNote', icon: '🗒️', pkg: 'com.microsoft.office.onenote' },
];
