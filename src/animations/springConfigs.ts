/**
 * Shared spring/timing tokens for the Vista glass animation system.
 *
 * This module went missing in the original seed even though every animation
 * hook imports from it — restored here. DURATION follows the Aero interaction
 * spec: 50ms press, 150ms hover, 200ms open/close.
 */
import { Easing } from 'react-native-reanimated';

export const SPRING_CONFIG_DEFAULT = { damping: 15, stiffness: 150, mass: 1 };
export const SPRING_CONFIG_SNAPPY = { damping: 18, stiffness: 250, mass: 0.8 };
export const SPRING_CONFIG_GENTLE = { damping: 20, stiffness: 90, mass: 1 };
export const SPRING_CONFIG_BOUNCE = { damping: 9, stiffness: 180, mass: 1 };
export const SPRING_CONFIG_MORPH = { damping: 16, stiffness: 120, mass: 1 };

export const DURATION = {
  INSTANT: 50,
  FAST: 150,
  NORMAL: 200,
  SLOW: 350,
  GLACIAL: 600,
  STAGGER_DELAY: 30,
} as const;

export const EASING = {
  standard: Easing.bezier(0.4, 0, 0.2, 1),
  decelerate: Easing.out(Easing.cubic),
  accelerate: Easing.in(Easing.cubic),
} as const;
