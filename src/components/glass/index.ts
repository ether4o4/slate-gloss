// ============================================
// Windows Vista Aero Glassmorphism Components
// ============================================
// 
// A collection of React Native components using @shopify/react-native-skia
// to recreate the iconic Windows Vista Aero glass effect.
//
// Features:
// - Real-time Gaussian blur using Skia shaders
// - Glassmorphism with inner glow and border highlights
// - Chromatic aberration effects on edges
// - Subtle noise texture for realism
// - Smooth hover/active animations via Reanimated
//
// Installation Requirements:
// - @shopify/react-native-skia
// - react-native-reanimated
// - react-native-gesture-handler
//
// ============================================

export { GlassPanel } from './GlassPanel';
export { GlassButton } from './GlassButton';
export { StartOrb } from './StartOrb';
export { WindowFrame } from './WindowFrame';
export { Taskbar } from './Taskbar';

// Re-export types
export type { GlassPanelProps } from './GlassPanel';
export type { GlassButtonProps } from './GlassButton';
export type { StartOrbProps } from './StartOrb';
export type { WindowFrameProps } from './WindowFrame';
export type { TaskbarProps } from './Taskbar';

// Export shaders for custom implementations (as strings for RuntimeEffect.Make)
export {
  blurShader,
  glassPanelShader,
  chromaticAberrationShader,
  startOrbShader,
  taskbarShader,
  windowButtonShader,
} from './shaders';

// Re-export Skia utilities
export { Skia, vec } from '@shopify/react-native-skia';
