/**
 * Taskbar Icon Bounce Animation Hook
 * Notification bounce animation
 */

import { useCallback, useRef } from 'react';
import {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  withRepeat,
  withDelay,
  interpolate,
  Extrapolation,
  runOnUI,
  cancelAnimation,
  type SharedValue,
  type AnimatedStyle,
} from 'react-native-reanimated';
import { SPRING_CONFIG_BOUNCE, SPRING_CONFIG_SNAPPY, DURATION } from './springConfigs';

export interface TaskbarBounceState {
  translateY: SharedValue<number>;
  scale: SharedValue<number>;
  rotateZ: SharedValue<number>;
  glowIntensity: SharedValue<number>;
  badgeScale: SharedValue<number>;
  badgeOpacity: SharedValue<number>;
  animatedStyle: AnimatedStyle<any>;
  badgeStyle: AnimatedStyle<any>;
  glowStyle: AnimatedStyle<any>;
}

export interface TaskbarBounceOptions {
  bounceHeight?: number;
  bounceCount?: number;
  badgeCount?: number;
  glowColor?: string;
  onBounceComplete?: () => void;
}

// Default bounce configuration
const DEFAULT_BOUNCE_HEIGHT = -20;
const DEFAULT_BOUNCE_COUNT = 3;
const BADGE_PULSE_DURATION = 600;

export function useTaskbarBounce(options: TaskbarBounceOptions = {}): TaskbarBounceState {
  const {
    bounceHeight = DEFAULT_BOUNCE_HEIGHT,
    glowColor = '#4facfe',
  } = options;

  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);
  const rotateZ = useSharedValue(0);
  const glowIntensity = useSharedValue(0);
  const badgeScale = useSharedValue(0);
  const badgeOpacity = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => {
    // Combine all transforms
    const rotation = interpolate(
      translateY.value,
      [bounceHeight, 0],
      [-5, 0],
      Extrapolation.CLAMP
    );

    return {
      transform: [
        { translateY: translateY.value },
        { scale: scale.value },
        { rotateZ: `${rotation}deg` },
      ],
    };
  });

  const badgeStyle = useAnimatedStyle(() => ({
    transform: [{ scale: badgeScale.value }],
    opacity: badgeOpacity.value,
  }));

  const glowStyle = useAnimatedStyle(() => {
    const glowScale = interpolate(
      glowIntensity.value,
      [0, 1],
      [1, 1.5],
      Extrapolation.CLAMP
    );

    const glowOpacity = interpolate(
      glowIntensity.value,
      [0, 1],
      [0, 0.6],
      Extrapolation.CLAMP
    );

    return {
      transform: [{ scale: glowScale }],
      opacity: glowOpacity,
    };
  });

  return {
    translateY,
    scale,
    rotateZ,
    glowIntensity,
    badgeScale,
    badgeOpacity,
    animatedStyle,
    badgeStyle,
    glowStyle,
  };
}

// Worklet for notification bounce
export function notifyBounceWorklet(
  translateY: SharedValue<number>,
  scale: SharedValue<number>,
  glowIntensity: SharedValue<number>,
  badgeScale: SharedValue<number>,
  badgeOpacity: SharedValue<number>,
  bounceHeight: number,
  bounceCount: number,
  onComplete?: () => void
): void {
  'worklet';
  
  // Create bounce sequence
  const bounces: (ReturnType<typeof withSpring> | ReturnType<typeof withTiming>)[] = [];
  
  for (let i = 0; i < bounceCount; i++) {
    // Up
    bounces.push(
      withTiming(bounceHeight * (1 - i * 0.2), { duration: 150 })
    );
    // Down with spring
    bounces.push(
      withSpring(0, SPRING_CONFIG_BOUNCE)
    );
  }
  
  // Execute bounce sequence
  translateY.value = withSequence(...bounces, withTiming(0, { duration: 0 }, (finished?: boolean) => {
    if (finished && onComplete) {
      runOnUI(onComplete)();
    }
  })) as number;
  
  // Subtle scale pulse during bounce
  scale.value = withSequence(
    withTiming(1.1, { duration: 100 }),
    withSpring(1, SPRING_CONFIG_SNAPPY)
  );
  
  // Glow effect
  glowIntensity.value = withSequence(
    withTiming(1, { duration: 200 }),
    withDelay(500, withTiming(0, { duration: 300 }))
  );
  
  // Badge animation
  badgeScale.value = withSpring(1, SPRING_CONFIG_BOUNCE);
  badgeOpacity.value = withTiming(1, { duration: 200 });
}

// Worklet for continuous urgent notification
export function urgentNotificationWorklet(
  translateY: SharedValue<number>,
  glowIntensity: SharedValue<number>,
  badgeScale: SharedValue<number>,
  bounceHeight: number
): void {
  'worklet';
  
  // Continuous subtle bounce
  translateY.value = withRepeat(
    withSequence(
      withTiming(bounceHeight * 0.3, { duration: 300 }),
      withTiming(0, { duration: 300 })
    ),
    -1, // Infinite
    true // Reverse
  );
  
  // Pulsing glow
  glowIntensity.value = withRepeat(
    withSequence(
      withTiming(1, { duration: 500 }),
      withTiming(0.3, { duration: 500 })
    ),
    -1,
    true
  );
  
  // Badge pulse
  badgeScale.value = withRepeat(
    withSequence(
      withTiming(1.2, { duration: BADGE_PULSE_DURATION / 2 }),
      withTiming(1, { duration: BADGE_PULSE_DURATION / 2 })
    ),
    -1,
    true
  );
}

// Worklet for stopping notification
export function stopNotificationWorklet(
  translateY: SharedValue<number>,
  scale: SharedValue<number>,
  glowIntensity: SharedValue<number>,
  badgeScale: SharedValue<number>,
  badgeOpacity: SharedValue<number>,
  clearBadge: boolean = false
): void {
  'worklet';
  
  cancelAnimation(translateY);
  cancelAnimation(glowIntensity);
  cancelAnimation(badgeScale);
  
  translateY.value = withSpring(0, SPRING_CONFIG_SNAPPY);
  scale.value = withSpring(1, SPRING_CONFIG_SNAPPY);
  glowIntensity.value = withTiming(0, { duration: DURATION.FAST });
  
  if (clearBadge) {
    badgeOpacity.value = withTiming(0, { duration: DURATION.FAST });
    badgeScale.value = withTiming(0, { duration: DURATION.FAST });
  } else {
    badgeScale.value = withSpring(1, SPRING_CONFIG_SNAPPY);
  }
}

// Worklet for single attention grab
export function attentionGrabWorklet(
  translateY: SharedValue<number>,
  rotateZ: SharedValue<number>,
  scale: SharedValue<number>
): void {
  'worklet';
  
  // Quick wiggle
  rotateZ.value = withSequence(
    withTiming(-10, { duration: 50 }),
    withTiming(10, { duration: 100 }),
    withTiming(-10, { duration: 100 }),
    withTiming(10, { duration: 100 }),
    withSpring(0, SPRING_CONFIG_SNAPPY)
  );
  
  // Slight scale pulse
  scale.value = withSequence(
    withTiming(1.15, { duration: 100 }),
    withSpring(1, SPRING_CONFIG_BOUNCE)
  );
  
  // Small hop
  translateY.value = withSequence(
    withTiming(-5, { duration: 100 }),
    withSpring(0, SPRING_CONFIG_BOUNCE)
  );
}

// Hook for controlling taskbar bounce
export function useTaskbarController(options: TaskbarBounceOptions = {}) {
  const {
    bounceHeight = DEFAULT_BOUNCE_HEIGHT,
    bounceCount = DEFAULT_BOUNCE_COUNT,
    onBounceComplete,
  } = options;

  const animation = useTaskbarBounce(options);
  const isUrgent = useRef(false);

  const notify = useCallback((urgent: boolean = false) => {
    if (urgent) {
      isUrgent.current = true;
      runOnUI(() => {
        'worklet';
        urgentNotificationWorklet(
          animation.translateY,
          animation.glowIntensity,
          animation.badgeScale,
          bounceHeight
        );
      })();
    } else {
      runOnUI(() => {
        'worklet';
        notifyBounceWorklet(
          animation.translateY,
          animation.scale,
          animation.glowIntensity,
          animation.badgeScale,
          animation.badgeOpacity,
          bounceHeight,
          bounceCount,
          onBounceComplete
        );
      })();
    }
  }, [animation, bounceHeight, bounceCount, onBounceComplete]);

  const grabAttention = useCallback(() => {
    runOnUI(() => {
      'worklet';
      attentionGrabWorklet(animation.translateY, animation.rotateZ, animation.scale);
    })();
  }, [animation]);

  const stop = useCallback((clearBadge: boolean = false) => {
    isUrgent.current = false;
    runOnUI(() => {
      'worklet';
      stopNotificationWorklet(
        animation.translateY,
        animation.scale,
        animation.glowIntensity,
        animation.badgeScale,
        animation.badgeOpacity,
        clearBadge
      );
    })();
  }, [animation]);

  const clear = useCallback(() => {
    runOnUI(() => {
      'worklet';
      stopNotificationWorklet(
        animation.translateY,
        animation.scale,
        animation.glowIntensity,
        animation.badgeScale,
        animation.badgeOpacity,
        true
      );
    })();
  }, [animation]);

  return {
    ...animation,
    notify,
    grabAttention,
    stop,
    clear,
    isUrgent: () => isUrgent.current,
  };
}

