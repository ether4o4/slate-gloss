/**
 * Glass Shimmer Animation Hook
 * Subtle light reflection movement on glass surfaces
 */

import { useEffect, useCallback } from 'react';
import {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  withDelay,
  interpolate,
  Extrapolation,
  Easing,
  runOnUI,
  cancelAnimation,
  type SharedValue,
  type AnimatedStyle,
} from 'react-native-reanimated';
import { DURATION } from './springConfigs';

export interface GlassShimmerState {
  shimmerPosition: SharedValue<number>;
  shimmerOpacity: SharedValue<number>;
  gradientRotation: SharedValue<number>;
  animatedStyle: AnimatedStyle<any>;
}

export interface GlassShimmerOptions {
  duration?: number;
  delay?: number;
  intensity?: number;
  angle?: number;
  autoStart?: boolean;
  repeatDelay?: number;
}

// Default shimmer configuration
const DEFAULT_SHIMMER_DURATION = 4000;
const DEFAULT_SHIMMER_DELAY = 500;
const DEFAULT_INTENSITY = 0.3;

export function useGlassShimmer(options: GlassShimmerOptions = {}): GlassShimmerState {
  const {
    duration = DEFAULT_SHIMMER_DURATION,
    delay = DEFAULT_SHIMMER_DELAY,
    intensity = DEFAULT_INTENSITY,
    angle = 45,
    autoStart = true,
    repeatDelay = 2000,
  } = options;

  const shimmerPosition = useSharedValue(-1);
  const shimmerOpacity = useSharedValue(0);
  const gradientRotation = useSharedValue(angle);

  const animatedStyle = useAnimatedStyle(() => {
    // Calculate shimmer progress (0 to 1)
    const progress = shimmerPosition.value;
    
    // Create smooth gradient movement
    const translateX = interpolate(
      progress,
      [-1, 0, 1],
      [-200, 0, 200],
      Extrapolation.CLAMP
    );
    
    // Opacity follows the shimmer
    const currentOpacity = interpolate(
      progress,
      [-0.5, 0, 0.5],
      [0, intensity, 0],
      Extrapolation.CLAMP
    );

    // Subtle rotation animation
    const rotation = gradientRotation.value + 
      interpolate(progress, [-1, 1], [-5, 5], Extrapolation.CLAMP);

    return {
      opacity: currentOpacity,
      transform: [
        { translateX },
        { rotate: `${rotation}deg` },
      ],
    };
  });

  // Start shimmer animation
  const startShimmer = useCallback(() => {
    runOnUI(() => {
      'worklet';
      
      // Initial delay before shimmer
      shimmerOpacity.value = withDelay(
        delay,
        withTiming(intensity, { duration: DURATION.FAST })
      );
      
      // Continuous shimmer loop
      shimmerPosition.value = withDelay(
        delay,
        withRepeat(
          withSequence(
            // Shimmer sweep from left to right
            withTiming(1, {
              duration: duration,
              easing: Easing.inOut(Easing.ease),
            }),
            // Pause at end
            withTiming(1, { duration: repeatDelay / 2 }),
            // Reset
            withTiming(-1, { duration: 0 }),
            // Pause before repeat
            withTiming(-1, { duration: repeatDelay / 2 })
          ),
          -1, // Infinite repeat
          false // Don't reverse
        )
      );
    })();
  }, [delay, duration, intensity, repeatDelay, shimmerOpacity, shimmerPosition]);

  const stopShimmer = useCallback(() => {
    runOnUI(() => {
      'worklet';
      cancelAnimation(shimmerPosition);
      cancelAnimation(shimmerOpacity);
      shimmerOpacity.value = withTiming(0, { duration: DURATION.FAST });
    })();
  }, [shimmerOpacity, shimmerPosition]);

  // Auto-start on mount
  useEffect(() => {
    if (autoStart) {
      startShimmer();
    }
    
    return () => {
      stopShimmer();
    };
  }, [autoStart, startShimmer, stopShimmer]);

  return {
    shimmerPosition,
    shimmerOpacity,
    gradientRotation,
    animatedStyle,
  };
}

// Hook for hover-triggered shimmer
export function useHoverShimmer(options: Omit<GlassShimmerOptions, 'autoStart'> = {}) {
  const shimmer = useGlassShimmer({ ...options, autoStart: false });

  const onHoverIn = useCallback(() => {
    runOnUI(() => {
      'worklet';
      shimmer.shimmerOpacity.value = withTiming(options.intensity ?? DEFAULT_INTENSITY, {
        duration: DURATION.FAST,
      });
      shimmer.shimmerPosition.value = withRepeat(
        withTiming(1, {
          duration: options.duration ?? DEFAULT_SHIMMER_DURATION,
          easing: Easing.inOut(Easing.ease),
        }),
        -1,
        true // Reverse for continuous flow
      );
    })();
  }, [shimmer, options.intensity, options.duration]);

  const onHoverOut = useCallback(() => {
    runOnUI(() => {
      'worklet';
      cancelAnimation(shimmer.shimmerPosition);
      shimmer.shimmerOpacity.value = withTiming(0, { duration: DURATION.FAST });
    })();
  }, [shimmer]);

  return {
    ...shimmer,
    onHoverIn,
    onHoverOut,
  };
}

// CSS-style gradient for glass effect (to be used with the animated values)
export function getGlassGradient(
  shimmerPosition: SharedValue<number>,
  baseColor: string = 'rgba(255, 255, 255, 0.1)',
  shimmerColor: string = 'rgba(255, 255, 255, 0.3)'
) {
  'worklet';
  
  const progress = shimmerPosition.value;
  
  // Dynamic gradient based on shimmer position
  return {
    background: `linear-gradient(
      ${45 + progress * 10}deg,
      ${baseColor} 0%,
      ${baseColor} ${30 + progress * 20}%,
      ${shimmerColor} ${40 + progress * 20}%,
      ${baseColor} ${50 + progress * 20}%,
      ${baseColor} 100%
    )`,
  };
}
