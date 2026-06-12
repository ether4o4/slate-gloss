# NeverSoft OS — project brief

> Read this first. It exists so no session ever loses the plot. Keep it
> updated when the architecture or current-state sections change.

## The idea

NeverSoft OS (NSOS) is an Android **home-screen launcher** that feels like a
classic PC desktop — old-school icons, taskbar, draggable glass windows — with
**MVE** (the MorsVitaEst engine, sibling repo `ether4o4/MorsVitaEst`) as the
intelligence underneath. MorsVitaEst is the backend/engine; NSOS is the shell
on top. The old "Swarm" assistant was fully removed and replaced by MVE.

The owner (gredsavage) directs by feel: sends icon art as images (glass/chrome
3D style) to be background-stripped and wired, and iterates fast via the
rolling APK. Finishing touches are the current phase — do not start grand
rewrites.

## Architecture map

- **Pager**: the MVE wall (news feed + NeverSoft Service Assistant) is a page
  LEFT of the home desktop. Right-fling from the left edge or taskbar robot
  summons things.
- **Home desktop**: classic icon grid (2-wide, far left): Internet (top-left),
  Recycle Bin, Calculator, Notepad, Google folder, Microsoft folder. That's
  the full set on purpose — owner wants only the main generic ones. App grid
  (real installed apps, draggable) sits right of the column. Real Android
  widget hosting.
- **Taskbar** (permanent, never hidden, 64px): Start orb · Phone · Messages ·
  Camera (jelly/chrome icon art) · pinned apps · the robot (AI chat button,
  intent-count badge) · clock (opens notification/widget flyout — calendar
  card deliberately removed from it).
- **Windows**: draggable/resizable glass `WindowFrame`s above the desktop,
  always clamped above the taskbar (cmd terminal, Calculator, Notepad,
  Google/Microsoft folders, Settings=theme picker).
- **Persistent chat**: taskbar robot opens `ChatWindow` — floating, shown over
  everything, minimize / half / full / close. Conversation lives in the native
  bridge so it survives hide/show.
- **The robot**: flat black robot sprite = the face of MVE. First-run "Meet
  your robot" paint setup (8 tints, stored in AsyncStorage). Planned next:
  pose-frame animation system + "abilities" (walking the screen, thinking
  pose while the agent works, time-loop/undo effect, glitch teleport). Pose
  art spec was given to the owner; frames may arrive any time.
- **Sandbox**: a real bundled Linux — proot + Alpine minirootfs, downloaded on
  first Setup (MVE Settings), `apk` package manager, persistent shell (bash
  when installed, busybox sh otherwise). proot binaries ship as jniLibs and
  run from nativeLibraryDir (`useLegacyPackaging`). Termux-class on purpose.
- **Agent loop**: `MveBridgeModule.sendMessage` runs Observe→Execute→Verify:
  the provider LLM emits `RUN: <cmd>` lines, the bridge executes them in the
  sandbox, feeds real output back, loops (cap 6), then returns the report.
  The system prompt is the owner's MVE directive + an execution protocol.
  Never let the assistant pretend to run things it didn't.
- **Themes**: `ThemeStore` catalog drives the backdrop; default "My Wallpaper"
  keeps the Android wallpaper visible. Assistant can switch themes from chat
  ("theme royale noir") via local command handling.

## Key files

| Area | Files |
| --- | --- |
| Shell layout, classic icons, windows, pager | `App.tsx` |
| Taskbar (device buttons, robot) | `src/components/ui/Taskbar.tsx` |
| Floating chat | `src/desktop/ChatWindow.tsx`, `src/desktop/AssistantChat.tsx` |
| Wall (feed + assistant) | `src/desktop/AssistantWall.tsx`, `src/desktop/newsFeed.ts` |
| Robot | `src/desktop/RobotSetup.tsx`, `src/assets/icons/robot.png` |
| Windows content | `src/desktop/{Terminal,Calculator,Notepad,FolderWindow,ThemePicker,BrowserPicker}.tsx` |
| Themes | `src/theme/themes.ts` (catalog + store) |
| Local assistant commands | `src/mve/assistantCommands.ts` |
| JS↔engine bridge | `src/mve/MveBridge.ts` (mock when native missing) |
| Native bridge + agent loop | `android/.../mve/MveBridgeModule.kt` |
| Sandbox | `android/.../mve/sandbox/*` (manager, proot executor, persistent shell, rootfs downloader) |
| Launcher native (apps, widgets, cache clear) | `android/.../LauncherModule.kt` |
| Icon art (bg-stripped transparent PNGs) | `src/assets/icons/` |

## Workflow

- Branch: `claude/happy-cray-qsncxb`. PR #4 (draft) → main. Companion:
  MorsVitaEst PR #20 (engine bridge + sandbox bash fix), also draft.
- Every push CI-builds and republishes the rolling APK:
  https://github.com/ether4o4/NeverSoft-OS/releases/latest/download/neversoft-os.apk
  The owner tests from that link — pushing = shipping to their phone.
- Icon art arrives as images on any background; strip via border-color
  flood-fill (gradient-tolerant region grow for hard cases), despeckle,
  square-pad to 256px transparent PNG, render bare (no box/border).
- Verify before pushing: `npx tsc --noEmit` and `npx eslint` (4 pre-existing
  inline-style warnings are known). Kotlin compiles only on CI (no local SDK).

## Open threads

- Robot pose frames (tiers spec'd: 4 core / 8 personality / ~14 full) and the
  ability/animation system that consumes them.
- `facebook.png` is in assets but intentionally unwired (owner: desktop keeps
  only the main generic icons).
- Internet / Recycle Bin / Notepad desktop icons still emoji — owner may send
  matching art.
- fermat's Full-OS-MVE desktop port commit (`fc8d363` on
  `claude/confident-fermat-cvtlvb`) remains deliberately unmerged — it would
  double up the desktop.
- Both PRs still drafts; owner says when to merge.
