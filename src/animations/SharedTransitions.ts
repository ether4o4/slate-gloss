/**
 * Shared Element Transitions for Vista Launcher
 * Reanimated 3 shared transition presets
 */

import {
  SharedTransition,
  withSpring,
  withTiming,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { SPRING_CONFIG_DEFAULT, SPRING_CONFIG_SNAPPY, DURATION } from './springConfigs';

// Reanimated 4 removed SharedTransition.custom; fall back to a no-op builder so
// this preset module can still evaluate (the presets are inert until used).
const customTransition: (factory: (values: any) => any) => any =
  (SharedTransition as any)?.custom?.bind(SharedTransition) ?? (() => undefined);

// Window shared transition - scale and fade
export const WindowSharedTransition = customTransition((values: any) => {
  'worklet';
  
  const progress = withSpring(1, SPRING_CONFIG_DEFAULT);
  
  return {
    height: withSpring(values.targetHeight, SPRING_CONFIG_DEFAULT),
    width: withSpring(values.targetWidth, SPRING_CONFIG_DEFAULT),
    originX: withSpring(values.targetOriginX, SPRING_CONFIG_DEFAULT),
    originY: withSpring(values.targetOriginY, SPRING_CONFIG_DEFAULT),
  };
});

// Modal shared transition - slide up with fade
export const ModalSharedTransition = customTransition((values: any) => {
  'worklet';
  
  return {
    height: withSpring(values.targetHeight, SPRING_CONFIG_DEFAULT),
    width: withSpring(values.targetWidth, SPRING_CONFIG_DEFAULT),
    originX: withSpring(values.targetOriginX, SPRING_CONFIG_DEFAULT),
    originY: withTiming(values.targetOriginY, { 
      duration: DURATION.NORMAL,
    }),
  };
});

// Taskbar icon shared transition - morph to window
export const TaskbarToWindowTransition = customTransition((values: any) => {
  'worklet';
  
  const progress = withSpring(1, SPRING_CONFIG_SNAPPY);
  
  return {
    height: withSpring(values.targetHeight, SPRING_CONFIG_SNAPPY),
    width: withSpring(values.targetWidth, SPRING_CONFIG_SNAPPY),
    originX: withSpring(values.targetOriginX, SPRING_CONFIG_SNAPPY),
    originY: withSpring(values.targetOriginY, SPRING_CONFIG_SNAPPY),
  };
});

// Card expand transition
export const CardExpandTransition = customTransition((values: any) => {
  'worklet';
  
  return {
    height: withSpring(values.targetHeight, SPRING_CONFIG_DEFAULT),
    width: withSpring(values.targetWidth, SPRING_CONFIG_DEFAULT),
    originX: withSpring(values.targetOriginX, SPRING_CONFIG_DEFAULT),
    originY: withSpring(values.targetOriginY, SPRING_CONFIG_DEFAULT),
  };
});

// Quick fade transition for lists
export const ListItemTransition = customTransition((values: any) => {
  'worklet';
  
  return {
    height: withTiming(values.targetHeight, { duration: DURATION.FAST }),
    width: withTiming(values.targetWidth, { duration: DURATION.FAST }),
    originX: withTiming(values.targetOriginX, { duration: DURATION.FAST }),
    originY: withTiming(values.targetOriginY, { duration: DURATION.FAST }),
  };
});

// Transition presets object for easy access
export const SharedTransitionPresets = {
  window: WindowSharedTransition,
  modal: ModalSharedTransition,
  taskbarToWindow: TaskbarToWindowTransition,
  cardExpand: CardExpandTransition,
  listItem: ListItemTransition,
} as const;

// Type for transition names
export type SharedTransitionPreset = keyof typeof SharedTransitionPresets;

// Helper to get transition by name
export function getSharedTransition(preset: SharedTransitionPreset) {
  'worklet';
  return SharedTransitionPresets[preset];
}

// Default transition specs for manual animations
export const TransitionSpecs = {
  // Fade transition spec
  fade: {
    in: (value: number) => 
      withTiming(value, { duration: DURATION.NORMAL }),
    out: (value: number) => 
      withTiming(value, { duration: DURATION.FAST }),
  },
  
  // Scale transition spec
  scale: {
    in: (value: number) => 
      withSpring(value, SPRING_CONFIG_DEFAULT),
    out: (value: number) => 
      withSpring(value, SPRING_CONFIG_SNAPPY),
  },
  
  // Slide transition spec
  slide: {
    in: (value: number) => 
      withSpring(value, SPRING_CONFIG_DEFAULT),
    out: (value: number) => 
      withTiming(value, { duration: DURATION.NORMAL }),
  },
} as const;

// Layout animation presets
export const LayoutAnimationPresets = {
  // Spring-based layout animation
  spring: {
    duration: undefined,
    damping: SPRING_CONFIG_DEFAULT.damping,
    stiffness: SPRING_CONFIG_DEFAULT.stiffness,
    mass: SPRING_CONFIG_DEFAULT.mass,
  },
  
  // Snappy layout animation
  snappy: {
    duration: undefined,
    damping: SPRING_CONFIG_SNAPPY.damping,
    stiffness: SPRING_CONFIG_SNAPPY.stiffness,
    mass: SPRING_CONFIG_SNAPPY.mass,
  },
} as const;
