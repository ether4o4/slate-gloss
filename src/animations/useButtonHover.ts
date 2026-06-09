/**
 * Button Hover Animation Hook
 * Scale + glow intensity change
 */

import { useCallback } from 'react';
import {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
  interpolateColor,
  Extrapolation,
  runOnUI,
  type SharedValue,
  type AnimatedStyle,
} from 'react-native-reanimated';
import { SPRING_CONFIG_DEFAULT, SPRING_CONFIG_SNAPPY, DURATION } from './springConfigs';

export interface ButtonHoverState {
  scale: SharedValue<number>;
  glowIntensity: SharedValue<number>;
  shadowRadius: SharedValue<number>;
  shadowOpacity: SharedValue<number>;
  backgroundColor: SharedValue<number>;
  isHovered: SharedValue<boolean>;
  animatedStyle: AnimatedStyle<any>;
  glowStyle: AnimatedStyle<any>;
}

export interface ButtonHoverOptions {
  hoverScale?: number;
  glowColor?: string;
  glowIntensity?: number;
  shadowColor?: string;
  shadowRadius?: number;
  springConfig?: typeof SPRING_CONFIG_DEFAULT;
  onHoverIn?: () => void;
  onHoverOut?: () => void;
  onPress?: () => void;
}

// Default button hover configuration
const DEFAULT_HOVER_SCALE = 1.05;
const DEFAULT_GLOW_INTENSITY = 0.6;
const DEFAULT_SHADOW_RADIUS = 15;

export function useButtonHover(options: ButtonHoverOptions = {}): ButtonHoverState {
  const {
    hoverScale = DEFAULT_HOVER_SCALE,
    glowIntensity: maxGlowIntensity = DEFAULT_GLOW_INTENSITY,
    shadowRadius: maxShadowRadius = DEFAULT_SHADOW_RADIUS,
    springConfig = SPRING_CONFIG_DEFAULT,
    glowColor = '#ffffff',
    shadowColor = '#000000',
  } = options;

  const scale = useSharedValue(1);
  const glowIntensity = useSharedValue(0);
  const shadowRadius = useSharedValue(4);
  const shadowOpacity = useSharedValue(0.2);
  const backgroundColor = useSharedValue(0);
  const isHovered = useSharedValue(false);

  // Main button animated style
  const animatedStyle = useAnimatedStyle(() => {
    // Calculate shadow based on hover state
    const currentShadowRadius = interpolate(
      glowIntensity.value,
      [0, 1],
      [4, maxShadowRadius],
      Extrapolation.CLAMP
    );
    
    const currentShadowOpacity = interpolate(
      glowIntensity.value,
      [0, 1],
      [0.2, 0.4],
      Extrapolation.CLAMP
    );

    // Background brightness increases on hover
    const brightness = interpolate(
      glowIntensity.value,
      [0, 1],
      [1, 1.1],
      Extrapolation.CLAMP
    );

    return {
      transform: [{ scale: scale.value }],
      shadowRadius: currentShadowRadius,
      shadowOpacity: currentShadowOpacity,
      shadowColor,
      shadowOffset: {
        width: 0,
        height: interpolate(glowIntensity.value, [0, 1], [2, 4], Extrapolation.CLAMP),
      },
    };
  });

  // Separate glow layer for more control
  const glowStyle = useAnimatedStyle(() => {
    // Glow ring effect
    const ringScale = interpolate(
      glowIntensity.value,
      [0, 1],
      [1, 1.2],
      Extrapolation.CLAMP
    );

    const ringOpacity = interpolate(
      glowIntensity.value,
      [0, 1],
      [0, maxGlowIntensity * 0.5],
      Extrapolation.CLAMP
    );

    return {
      opacity: ringOpacity,
      transform: [{ scale: ringScale }],
    };
  });

  return {
    scale,
    glowIntensity,
    shadowRadius,
    shadowOpacity,
    backgroundColor,
    isHovered,
    animatedStyle,
    glowStyle,
  };
}

// Worklet for hover in
export function onButtonHoverInWorklet(
  scale: SharedValue<number>,
  glowIntensity: SharedValue<number>,
  shadowRadius: SharedValue<number>,
  shadowOpacity: SharedValue<number>,
  isHovered: SharedValue<boolean>,
  hoverScale: number,
  maxShadowRadius: number,
  springConfig: typeof SPRING_CONFIG_DEFAULT,
  onHoverIn?: () => void
): void {
  'worklet';
  
  isHovered.value = true;
  
  // Smooth scale up with spring
  scale.value = withSpring(hoverScale, springConfig);
  
  // Glow intensifies
  glowIntensity.value = withSpring(1, springConfig);
  
  // Shadow grows
  shadowRadius.value = withSpring(maxShadowRadius, springConfig);
  shadowOpacity.value = withTiming(0.4, { duration: DURATION.FAST });
  
  if (onHoverIn) {
    runOnUI(onHoverIn)();
  }
}

// Worklet for hover out
export function onButtonHoverOutWorklet(
  scale: SharedValue<number>,
  glowIntensity: SharedValue<number>,
  shadowRadius: SharedValue<number>,
  shadowOpacity: SharedValue<number>,
  isHovered: SharedValue<boolean>,
  springConfig: typeof SPRING_CONFIG_DEFAULT,
  onHoverOut?: () => void
): void {
  'worklet';
  
  isHovered.value = false;
  
  // Return to normal state
  scale.value = withSpring(1, springConfig);
  glowIntensity.value = withSpring(0, springConfig);
  shadowRadius.value = withSpring(4, springConfig);
  shadowOpacity.value = withTiming(0.2, { duration: DURATION.FAST });
  
  if (onHoverOut) {
    runOnUI(onHoverOut)();
  }
}

// Worklet for button press
export function onButtonPressWorklet(
  scale: SharedValue<number>,
  springConfig: typeof SPRING_CONFIG_DEFAULT,
  onPress?: () => void
): void {
  'worklet';
  
  // Quick scale down then back up for tactile feel
  scale.value = withSequence(
    withTiming(0.95, { duration: 50 }),
    withSpring(1, SPRING_CONFIG_SNAPPY)
  );
  
  if (onPress) {
    runOnUI(onPress)();
  }
}

// Hook for complete button control
export function useButtonController(options: ButtonHoverOptions = {}) {
  const {
    hoverScale = DEFAULT_HOVER_SCALE,
    glowIntensity: maxGlowIntensity = DEFAULT_GLOW_INTENSITY,
    shadowRadius: maxShadowRadius = DEFAULT_SHADOW_RADIUS,
    springConfig = SPRING_CONFIG_DEFAULT,
    onHoverIn,
    onHoverOut,
    onPress,
  } = options;

  const animation = useButtonHover(options);

  const handleHoverIn = useCallback(() => {
    runOnUI(() => {
      'worklet';
      onButtonHoverInWorklet(
        animation.scale,
        animation.glowIntensity,
        animation.shadowRadius,
        animation.shadowOpacity,
        animation.isHovered,
        hoverScale,
        maxShadowRadius,
        springConfig,
        onHoverIn
      );
    })();
  }, [animation, hoverScale, maxShadowRadius, springConfig, onHoverIn]);

  const handleHoverOut = useCallback(() => {
    runOnUI(() => {
      'worklet';
      onButtonHoverOutWorklet(
        animation.scale,
        animation.glowIntensity,
        animation.shadowRadius,
        animation.shadowOpacity,
        animation.isHovered,
        springConfig,
        onHoverOut
      );
    })();
  }, [animation, springConfig, onHoverOut]);

  const handlePress = useCallback(() => {
    runOnUI(() => {
      'worklet';
      onButtonPressWorklet(animation.scale, springConfig, onPress);
    })();
  }, [animation.scale, springConfig, onPress]);

  return {
    ...animation,
    handleHoverIn,
    handleHoverOut,
    handlePress,
  };
}

// Import for withSequence
import { withSequence } from 'react-native-reanimated';
