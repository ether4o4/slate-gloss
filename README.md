# NeverSoft Services — Windows Vista-style Android launcher

A glossy Windows Vista–style **home-screen launcher** for Android by
**NeverSoft Services**, built with React Native. A wallpaper desktop with
placeable icons, an operational Recycle Bin, gadgets, a two-pane Start menu, a
taskbar with a calendar/notification flyout, and **Swarm** — a built-in AI
assistant (free Groq by default).

## 📥 Download the APK

**Rolling link (always the newest build):**

➡️ **https://github.com/ether4o4/slate-gloss/releases/latest/download/vista-launcher.apk**

> Public repo — the link downloads directly on any device, no login required.

Every push to `main` / `claude/**` rebuilds the APK and republishes it to that
same URL, so it stays current automatically.

### Install
1. Open the link above on your Android phone and download the APK.
2. Tap it and allow **“install from unknown sources.”**
3. Open the app, then **Start ▸ “Set as default launcher”** to use it as home.
4. For Swarm AI, tap **⚙** in the Swarm panel and paste a **free Groq API key**
   (console.groq.com/keys) — stored only on your device, never committed.
5. Optional: grant **Notification access** (from the taskbar clock popup) to
   mirror notifications, and pick a **wallpaper** from Start ▸ Wallpaper.

---

## ✨ Features

- **Real home-screen launcher** — registers the `HOME` intent, requests the
  default-home role, and lets your wallpaper show through.
- **Desktop** with **placeable, draggable icons** and an **operational Recycle
  Bin** (drag an icon onto it; restore / empty / uninstall).
- **Two-pane Start menu** (resizable) — scrollable programs on the left,
  **Pinned + Recent** on the right, with search.
- **Gadgets** — clock + battery, Vista-sidebar style.
- **Taskbar** with Start orb, pinned quick-launch, and a clock that opens a
  **calendar + notifications** flyout.
- **Changeable wallpaper** (system wallpaper picker).
- **Swarm AI** reachable from the taskbar / Start menu, on-device chat history,
  pluggable OpenAI-compatible provider (free **Groq** by default).
- Native Kotlin bridge for app list/launch, battery, wallpaper, default-launcher
  role, and notification mirroring — no third-party native dependency.

### Built for low battery / heat
The “glass” is **translucent gradients + a static sheen**, not per-frame blur,
so there’s no continuous GPU cost. Animations use the **native driver** and only
fire on interaction; nothing animates while idle, and the clock ticks once a
minute.

---

## 🧱 Tech stack

- React Native **0.73** (old architecture — chosen for build reliability)
- `react-native-linear-gradient` for the gloss
- `@react-native-async-storage/async-storage` for layout, history, API key
- `axios` for the OpenAI-compatible chat API
- Kotlin `LauncherModule` + `NotificationService` for native launcher features

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

_Updated automatically on every build. Public repo → downloads on any device,
no login._
