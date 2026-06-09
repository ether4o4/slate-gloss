/**
 * Start Menu Animation Hook
 * Slide up with staggered item reveal
 */

import { useCallback, useMemo } from 'react';
import {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  withDelay,
  interpolate,
  Extrapolation,
  runOnUI,
  type SharedValue,
  type AnimatedStyle,
} from 'react-native-reanimated';
import { SPRING_CONFIG_DEFAULT, SPRING_CONFIG_SNAPPY, DURATION } from './springConfigs';

export interface StartMenuItemAnimation {
  opacity: SharedValue<number>;
  translateY: SharedValue<number>;
  scale: SharedValue<number>;
  animatedStyle: AnimatedStyle<any>;
}

export interface StartMenuAnimationState {
  menuOpacity: SharedValue<number>;
  menuTranslateY: SharedValue<number>;
  menuScale: SharedValue<number>;
  menuAnimatedStyle: AnimatedStyle<any>;
  itemAnimations: StartMenuItemAnimation[];
  isOpen: SharedValue<boolean>;
}

export interface StartMenuAnimationOptions {
  itemCount?: number;
  staggerDelay?: number;
  onOpenComplete?: () => void;
  onCloseComplete?: () => void;
}

// Create single item animation
function createItemAnimation(): StartMenuItemAnimation {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(20);
  const scale = useSharedValue(0.9);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  return { opacity, translateY, scale, animatedStyle };
}

export function useStartMenuAnimation(options: StartMenuAnimationOptions = {}): StartMenuAnimationState {
  const { itemCount = 10, staggerDelay = DURATION.STAGGER_DELAY } = options;

  const menuOpacity = useSharedValue(0);
  const menuTranslateY = useSharedValue(50);
  const menuScale = useSharedValue(0.95);
  const isOpen = useSharedValue(false);

  // Create item animations array
  const itemAnimations = useMemo(() => {
    return Array.from({ length: itemCount }, () => ({
      opacity: useSharedValue(0),
      translateY: useSharedValue(20),
      scale: useSharedValue(0.9),
    }));
  }, [itemCount]);

  // Create animated styles for items
  const itemAnimatedStyles = itemAnimations.map((item) => {
    return useAnimatedStyle(() => ({
      opacity: item.opacity.value,
      transform: [
        { translateY: item.translateY.value },
        { scale: item.scale.value },
      ],
    }));
  });

  // Wrap items with their animated styles
  const itemsWithStyles: StartMenuItemAnimation[] = itemAnimations.map((item, index) => ({
    ...item,
    animatedStyle: itemAnimatedStyles[index],
  }));

  const menuAnimatedStyle = useAnimatedStyle(() => {
    // Add subtle blur fade effect
    const blurProgress = interpolate(
      menuOpacity.value,
      [0, 1],
      [0, 1],
      Extrapolation.CLAMP
    );

    return {
      opacity: menuOpacity.value,
      transform: [
        { translateY: menuTranslateY.value },
        { scale: menuScale.value },
      ],
    };
  });

  return {
    menuOpacity,
    menuTranslateY,
    menuScale,
    menuAnimatedStyle,
    itemAnimations: itemsWithStyles,
    isOpen,
  };
}

// Worklet for opening start menu with stagger
export function openStartMenuWorklet(
  menuOpacity: SharedValue<number>,
  menuTranslateY: SharedValue<number>,
  menuScale: SharedValue<number>,
  itemAnimations: Array<{ opacity: SharedValue<number>; translateY: SharedValue<number>; scale: SharedValue<number> }>,
  isOpen: SharedValue<boolean>,
  staggerDelay: number = DURATION.STAGGER_DELAY,
  onComplete?: () => void
): void {
  'worklet';
  
  isOpen.value = true;
  
  // Animate menu container first
  menuOpacity.value = withTiming(1, { duration: DURATION.FAST });
  menuTranslateY.value = withSpring(0, SPRING_CONFIG_DEFAULT);
  menuScale.value = withSpring(1, SPRING_CONFIG_DEFAULT);
  
  // Staggered item reveal from bottom to top
  const reversedItems = [...itemAnimations].reverse();
  reversedItems.forEach((item, index) => {
    const delay = index * staggerDelay;
    
    item.opacity.value = withDelay(
      delay,
      withTiming(1, { duration: DURATION.FAST })
    );
    item.translateY.value = withDelay(
      delay,
      withSpring(0, SPRING_CONFIG_SNAPPY)
    );
    item.scale.value = withDelay(
      delay,
      withSpring(1, SPRING_CONFIG_SNAPPY, index === reversedItems.length - 1 && onComplete
        ? () => { runOnUI(onComplete)(); }
        : undefined
      )
    );
  });
}

// Worklet for closing start menu (reverse stagger)
export function closeStartMenuWorklet(
  menuOpacity: SharedValue<number>,
  menuTranslateY: SharedValue<number>,
  menuScale: SharedValue<number>,
  itemAnimations: Array<{ opacity: SharedValue<number>; translateY: SharedValue<number>; scale: SharedValue<number> }>,
  isOpen: SharedValue<boolean>,
  staggerDelay: number = DURATION.STAGGER_DELAY / 2, // Faster close
  onComplete?: () => void
): void {
  'worklet';
  
  isOpen.value = false;
  
  // Reverse stagger - items disappear first
  itemAnimations.forEach((item, index) => {
    const delay = index * staggerDelay;
    
    item.scale.value = withDelay(delay, withTiming(0.9, { duration: DURATION.FAST }));
    item.translateY.value = withDelay(delay, withTiming(10, { duration: DURATION.FAST }));
    item.opacity.value = withDelay(delay, withTiming(0, { duration: DURATION.FAST }));
  });
  
  // Then menu container
  const totalItemsDelay = itemAnimations.length * staggerDelay;
  
  menuScale.value = withDelay(totalItemsDelay, withSpring(0.95, SPRING_CONFIG_DEFAULT));
  menuTranslateY.value = withDelay(totalItemsDelay, withSpring(50, SPRING_CONFIG_DEFAULT));
  menuOpacity.value = withDelay(
    totalItemsDelay,
    withTiming(0, { duration: DURATION.FAST }, (finished) => {
      if (finished && onComplete) {
        runOnUI(onComplete)();
      }
    })
  );
}

// Hook for controlling start menu
export function useStartMenuController(options: StartMenuAnimationOptions = {}) {
  const { onOpenComplete, onCloseComplete } = options;
  const animation = useStartMenuAnimation(options);

  const open = useCallback(() => {
    runOnUI(() => {
      'worklet';
      openStartMenuWorklet(
        animation.menuOpacity,
        animation.menuTranslateY,
        animation.menuScale,
        animation.itemAnimations,
        animation.isOpen,
        options.staggerDelay,
        onOpenComplete
      );
    })();
  }, [animation, options.staggerDelay, onOpenComplete]);

  const close = useCallback(() => {
    runOnUI(() => {
      'worklet';
      closeStartMenuWorklet(
        animation.menuOpacity,
        animation.menuTranslateY,
        animation.menuScale,
        animation.itemAnimations,
        animation.isOpen,
        options.staggerDelay ? options.staggerDelay / 2 : undefined,
        onCloseComplete
      );
    })();
  }, [animation, options.staggerDelay, onCloseComplete]);

  const toggle = useCallback(() => {
    if (animation.isOpen.value) {
      close();
    } else {
      open();
    }
  }, [animation.isOpen, open, close]);

  return {
    ...animation,
    open,
    close,
    toggle,
  };
}
