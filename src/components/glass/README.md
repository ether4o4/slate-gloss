# Windows Vista Aero Glassmorphism Components

A collection of React Native components that recreate the iconic Windows Vista Aero glass effect using `@shopify/react-native-skia`.

![Vista Aero Glass](https://upload.wikimedia.org/wikipedia/en/a/a9/Windows_Vista_Aero.png)

## Features

- ✨ **Real-time Gaussian blur** using Skia shaders
- 🪟 **Glassmorphism effects** with inner glow and border highlights
- 🌈 **Chromatic aberration** on edges for visual polish
- 🎨 **Subtle noise texture** for realistic glass appearance
- 🎬 **Smooth animations** via React Native Reanimated
- 🖱️ **Gesture support** for hover, press, and drag interactions
- 📱 **Fully typed** with TypeScript

## Installation

```bash
npm install @shopify/react-native-skia react-native-reanimated react-native-gesture-handler
```

For iOS, run:
```bash
cd ios && pod install
```

## Components

### 1. GlassPanel

A translucent panel with blur, inner glow, and border highlights.

```tsx
import { GlassPanel } from './components/glass';

<GlassPanel
  width={300}
  height={200}
  cornerRadius={12}
  blurRadius={25}
  opacity={0.9}
  onPress={() => console.log('Panel pressed')}
>
  <Text>Your content here</Text>
</GlassPanel>
```

**Props:**
- `width`, `height` (number) - Dimensions
- `cornerRadius` (number) - Border radius (default: 8)
- `blurRadius` (number) - Gaussian blur amount (default: 20)
- `opacity` (number) - Base opacity 0-1 (default: 1)
- `onPress`, `onHoverIn`, `onHoverOut` (function) - Interaction callbacks

### 2. GlassButton

A glass-styled button with hover and active states.

```tsx
import { GlassButton } from './components/glass';

<GlassButton
  title="Click Me"
  onPress={() => console.log('Button pressed')}
  width={140}
  height={42}
  disabled={false}
/>
```

**Props:**
- `title` (string) - Button text
- `onPress` (function) - Press callback
- `width`, `height` (number) - Dimensions
- `disabled` (boolean) - Disabled state
- `icon` (ReactNode) - Optional icon component

### 3. StartOrb

The iconic Windows Vista start button with pulsing glow animation.

```tsx
import { StartOrb } from './components/glass';

<StartOrb
  size={60}
  onPress={() => setMenuOpen(true)}
  onLongPress={() => console.log('Long pressed')}
  pulseOnIdle={true}
/>
```

**Props:**
- `size` (number) - Diameter of the orb (default: 60)
- `onPress`, `onLongPress` (function) - Interaction callbacks
- `pulseOnIdle` (boolean) - Enable idle pulse animation

### 4. WindowFrame

A draggable window with glass title bar and window controls.

```tsx
import { WindowFrame } from './components/glass';

<WindowFrame
  title="My Window"
  width={400}
  height={300}
  x={50}
  y={50}
  onClose={() => setClosed(true)}
  onMinimize={() => console.log('Minimized')}
  onMaximize={() => setMaximized(true)}
  onRestore={() => setMaximized(false)}
  isMaximized={false}
  draggable={true}
>
  <View>{/* Window content */}</View>
</WindowFrame>
```

**Props:**
- `title` (string) - Window title
- `width`, `height`, `x`, `y` (number) - Position and size
- `onClose`, `onMinimize`, `onMaximize`, `onRestore` (function) - Control callbacks
- `isMaximized`, `isMinimized` (boolean) - Window state
- `draggable` (boolean) - Enable dragging
- `resizable` (boolean) - Enable resizing

### 5. Taskbar

Bottom taskbar with glass effect, start orb, window buttons, and system tray.

```tsx
import { Taskbar, StartOrb } from './components/glass';

<Taskbar
  height={42}
  startOrbComponent={<StartOrb size={44} onPress={toggleMenu} />}
  quickLaunchItems={[<Icon1 />, <Icon2 />]}
  windowButtons={[<WindowButton1 />, <WindowButton2 />]}
  systemTray={<CustomTray />}
  showClock={true}
  clockFormat="12h"
/>
```

**Props:**
- `height` (number) - Taskbar height
- `startOrbComponent` (ReactNode) - Start button component
- `quickLaunchItems` (ReactNode[]) - Quick launch icons
- `windowButtons` (ReactNode[]) - Active window buttons
- `systemTray` (ReactNode) - Custom system tray
- `showClock` (boolean) - Show built-in clock
- `clockFormat` ('12h' | '24h') - Clock format

## Design Reference

The components are based on the authentic Windows Vista Aero design:

| Element | Specification |
|---------|---------------|
| **Glass Base** | rgba(255, 255, 255, 0.15-0.25) |
| **Blur Radius** | 20-40px Gaussian |
| **Border Highlight** | rgba(255, 255, 255, 0.3-0.5) |
| **Reflection** | Top-to-bottom gradient |
| **Noise** | 0.5-1% opacity texture |

## Shader Effects

All components use custom Skia Runtime Shaders for:

1. **Gaussian Blur** - 2-pass blur for performance
2. **Noise Texture** - Simplex noise for glass realism
3. **Inner Glow** - Distance-field based highlights
4. **Chromatic Aberration** - RGB channel separation at edges

## Animation Timing

- **Hover**: 150ms ease-out
- **Active/Press**: 50ms instant
- **Window Open**: 200ms ease-out scale+fade
- **Start Orb Pulse**: 2s infinite ease-in-out

## Usage Example

See `examples.tsx` for complete implementation examples:

```tsx
import { CompleteVistaDesktop } from './components/glass/examples';

export default function App() {
  return <CompleteVistaDesktop />;
}
```

## File Structure

```
src/components/glass/
├── index.ts           # Main exports
├── shaders.ts         # Skia shader definitions
├── GlassPanel.tsx     # Glass panel component
├── GlassButton.tsx    # Glass button component
├── StartOrb.tsx       # Start button component
├── WindowFrame.tsx    # Window frame component
├── Taskbar.tsx        # Taskbar component
├── examples.tsx       # Usage examples
└── README.md          # This file
```

## License

MIT

## Credits

Inspired by the Windows Vista Aero interface design by Microsoft.
