# Vista Launcher — Windows Aero for Android

A glossy Windows Vista–style **home-screen launcher** for Android, built with
React Native. It shows your wallpaper through a translucent Aero UI, lists and
launches your installed apps, and includes **Swarm**, a built-in DeepSeek AI
chat.

## 📥 Download the APK

**Rolling link (always the newest build):**

➡️ **https://github.com/ether4o4/slate-gloss/releases/latest/download/vista-launcher.apk**

> This repo is **private**, so the link downloads only when you're signed in to
> GitHub (works in your phone's browser while logged in). Make the repo public
> if you want a no-login link.

Every push to `main` / `claude/**` rebuilds the APK and republishes it to that
same URL, so it stays current automatically.

### Install
1. Open the link above on your Android phone and download the APK.
2. Tap it and allow **“install from unknown sources.”**
3. Open the app, then **Start ▸ “Set as default launcher”** to use it as home.
4. For Swarm AI, tap **⚙** in the Swarm panel and paste your DeepSeek API key
   (stored only on your device — never committed to this repo).

---

## ✨ Features

- **Real home-screen launcher** — registers the `HOME` intent and lets your
  wallpaper show through.
- **Installed-app grid** with live search; tap to launch, long-press for
  *App info* / *Uninstall* (via a small native Kotlin bridge — no third-party
  native dependency).
- **Vista Aero UI** — glossy taskbar, Start pearl + menu, frosted panels.
- **Swarm AI chat** (DeepSeek) reachable from the taskbar / Start menu, with
  on-device chat history.

### Built for low battery / heat
The “glass” is **translucent gradients + a static sheen**, not per-frame blur,
so there’s no continuous GPU cost. Animations use the **native driver** and only
fire on interaction; nothing animates while idle, and the clock ticks once a
minute.

---

## 🧱 Tech stack

- React Native **0.73** (old architecture — chosen for build reliability)
- `react-native-linear-gradient` for the gloss
- `@react-native-async-storage/async-storage` for chat history + API key
- `axios` for the DeepSeek API
- A small Kotlin `LauncherModule` for PackageManager access

## 📁 Project structure

```
slate-gloss/
├── android/                      # Android native project (RN 0.73 template)
│   └── app/src/main/java/com/vistalauncher/
│       ├── MainActivity.kt
│       ├── MainApplication.kt
│       ├── LauncherModule.kt      # list/launch apps, default-launcher control
│       └── LauncherPackage.kt
├── src/
│   ├── components/
│   │   ├── SwarmChatWindow.tsx
│   │   └── vista/                 # Taskbar, StartOrb, StartMenu, AppGrid, …
│   ├── api/DeepSeekService.ts
│   ├── db/{ChatPersistence,Settings}.ts
│   ├── native/Launcher.ts
│   ├── config.ts
│   └── theme.ts
├── App.tsx
└── .github/workflows/build-apk.yml
```

---

## 🛠 Building

### GitHub Actions (recommended)
Push to `main` or any `claude/**` branch. CI builds the APK and republishes it to
the rolling release URL above (it also uploads a `vista-launcher-apk` artifact on
every run, including PRs).

### Local build
**Prerequisites:** Android SDK (Platform 34, Build Tools 34.0.0), Java 17,
Node 18+.

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
wire the signing secrets; see `docs/ANDROID_BUILD_SETUP.md`.

---

## 🔒 Security note
The DeepSeek API key is **not** stored in source control. You enter it in-app and
it is saved on-device only. Anything bundled into an APK can be extracted by
decompiling it, so for a public release route requests through a backend proxy
rather than shipping a key on-device.

---

## ⬇️ APK download (rolling, always latest)

**https://github.com/ether4o4/slate-gloss/releases/latest/download/vista-launcher.apk**

_Updated automatically on every build. Private repo → sign in to GitHub to
download._
