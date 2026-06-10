# NeverSoft OS

**NeverSoft OS** (NSOS) — a glossy glassmorphism **home-screen launcher**
for Android by **NeverSoft Services**, built with React Native. A wallpaper
desktop with placeable icons, an operational Recycle Bin, gadgets, a two-pane
Start menu, a taskbar with a calendar/notification flyout — all running on top
of **MVE**, the engine underneath NeverSoft (chat, tasks, memory and a Linux
sandbox), summoned with a swipe from the left edge or the ◎ taskbar button.

## 📥 Download the APK

[![Download the APK](https://img.shields.io/badge/⬇%20DOWNLOAD-NSOS%20APK-e2574c?style=for-the-badge&logo=android&logoColor=white)](https://github.com/ether4o4/NeverSoft-OS/releases/latest/download/neversoft-os.apk)

**Rolling link (always the newest build):**

➡️ **https://github.com/ether4o4/NeverSoft-OS/releases/latest/download/neversoft-os.apk**

> Public repo — the link downloads directly on any device, no login required.
> Open it in a browser (not an in-app webview) so it downloads cleanly.

Every push to `main` / `claude/**` rebuilds the APK and republishes it to that
same URL, so it stays current automatically.

### Install
1. Open the link above on your Android phone and download the APK.
2. Tap it and allow **“install from unknown sources.”**
3. Open the app, then **Start ▸ “Set as default launcher”** to use it as home.
4. For AI, open **Start ▸ MVE Settings** and add a provider API key — stored
   only on your device (in the MVE engine), never committed.
5. Optional: grant **Notification access** (from the taskbar clock popup) to
   mirror notifications, and pick a **wallpaper** from Start ▸ Wallpaper.

---

## ✨ Features

- **Real home-screen launcher** — registers the `HOME` intent, requests the
  default-home role, and lets your wallpaper show through.
- **Desktop** with **placeable, draggable icons** and an **operational Recycle
  Bin** (drag an icon onto it; restore / empty / uninstall).
- **Two-pane Start menu** (resizable) — scrollable programs on the left,
  **Pinned + Recent** on the right, with search and type-to-launch.
- **Widget panel** in the taskbar-clock flyout, with a picker to toggle:
  **calendar, notifications, weather, battery, system (RAM/storage), notes**.
- **Taskbar** with Start orb, pinned quick-launch, and a clock that opens the
  widget/notification flyout. **Customizable taskbar colors** + **custom Start
  button image** via the Personalize panel.
- **Changeable wallpaper** (system wallpaper picker).
- **MVE engine** — summoned from anywhere with a right-swipe from the left
  edge, or via the ◎ taskbar button (which badges the count of open tasks).
  Context-first chat that records the **intent** behind every message so tasks
  can be resumed, a **Linux sandbox terminal**, and provider/key management in
  **MVE Settings**. The engine itself lives in the MorsVitaEst backend and is
  reached over a native bridge; without it linked, a built-in mock keeps the
  UI fully interactive.
- Native Kotlin bridge for app list/launch, battery, wallpaper, default-launcher
  role, system info, and notification mirroring — no third-party native dependency.

### Built for low battery / heat
The “glass” is **translucent gradients + a static sheen**, not per-frame blur,
so there’s no continuous GPU cost. Animations use the **native driver** and only
fire on interaction; nothing animates while idle, and the clock ticks once a
minute.

---

## 🧱 Tech stack

- React Native **0.81**
- `react-native-linear-gradient` for the gloss
- `react-native-gesture-handler` + `react-native-reanimated` for the MVE summon gesture
- `@react-native-async-storage/async-storage` for layout and launcher state
- Kotlin `LauncherModule` + `NotificationService` for native launcher features
- Kotlin `MveBridgeModule` for the MVE engine bridge

## 📁 Project structure

```
NeverSoft-OS/
├── android/                      # Android native project (RN 0.81 template)
│   └── app/src/main/java/com/neversoftos/
│       ├── MainActivity.kt
│       ├── MainApplication.kt
│       ├── LauncherModule.kt      # list/launch apps, default-launcher control
│       ├── LauncherPackage.kt
│       └── mve/                   # native bridge to the MVE engine
├── src/
│   ├── components/ui/          # Taskbar, StartOrb, StartMenu, Desktop, Personalize, …
│   ├── mve/                    # MveScreen, MveChat, MveSettings, ActionRegistry, bridge
│   ├── api/Weather.ts
│   ├── db/LauncherStore.ts
│   ├── native/Launcher.ts
│   └── theme.ts
├── App.tsx
└── .github/workflows/build-apk.yml
```

---

## 🛠 Building

### GitHub Actions (recommended)
Push to `main` or any `claude/**` branch. CI builds the APK and republishes it to
the rolling release URL above (it also uploads a `neversoft-os-apk` artifact on
every run, including PRs).

### Local build
**Prerequisites:** Android SDK (Platform 36, Build Tools 36.0.0), Java 17,
Node 20+.

```bash
npm install
cd android && ./gradlew assembleRelease
# APK: android/app/build/outputs/apk/release/app-release.apk
```

> Use `assembleRelease` for a **standalone** APK — it bundles the JS into the
> app. A plain `assembleDebug` build expects a running Metro dev server and will
> show “Unable to load script” if installed on its own.

### Signing
CI publishes a **release** build signed with the standard debug keystore, so it
installs on any device. For a Play-ready upload, swap in your own keystore and
wire the signing secrets in `android/app/build.gradle` and the CI workflow.

---

## 🔒 Security note
AI provider API keys are **not** stored in source control. You enter them in
**MVE Settings** and they are saved on-device only, inside the MVE engine.
Anything bundled into an APK can be extracted by decompiling it, so for a public
release route requests through a backend proxy rather than shipping a key
on-device.

---

## ⬇️ Download NeverSoft OS (always the latest build)

[![Download the APK](https://img.shields.io/badge/⬇%20DOWNLOAD-NSOS%20APK-e2574c?style=for-the-badge&logo=android&logoColor=white)](https://github.com/ether4o4/NeverSoft-OS/releases/latest/download/neversoft-os.apk)
&nbsp;
[![Latest build](https://img.shields.io/github/v/release/ether4o4/NeverSoft-OS?style=for-the-badge&label=build&color=222)](https://github.com/ether4o4/NeverSoft-OS/releases/latest)

**Direct link (auto-updates to the newest build):**
👉 https://github.com/ether4o4/NeverSoft-OS/releases/latest/download/neversoft-os.apk

**How to install on Android:**
1. Open the link above **in a browser** (Chrome), not an in-app webview.
2. Tap the download notification → **Install** (allow “unknown sources”).
3. Open it → **Start ▸ Set as default launcher**.

_The link never changes — every push rebuilds the APK and repoints it here, so
this is always the freshest version._

