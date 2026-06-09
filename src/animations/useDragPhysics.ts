/**
 * Drag Physics Hook
 * Physics-based window dragging with momentum
 */

import { useCallback, useRef } from 'react';
import {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedReaction,
  withSpring,
  withDecay,
  runOnJS,
  runOnUI,
  type SharedValue,
  type AnimatedStyle,



} from 'react-native-reanimated';
import type {
  GestureStateChangeEvent,
  GestureUpdateEvent,
  PanGestureHandlerEventPayload,
} from 'react-native-gesture-handler';
import { SPRING_CONFIG_DEFAULT, SPRING_CONFIG_GENTLE } from './springConfigs';

export interface DragPhysicsState {
  translateX: SharedValue<number>;
  translateY: SharedValue<number>;
  velocityX: SharedValue<number>;
  velocityY: SharedValue<number>;
  isDragging: SharedValue<boolean>;
  scale: SharedValue<number>;
  animatedStyle: AnimatedStyle<any>;
}

export interface DragPhysicsOptions {
  friction?: number;
  velocityFactor?: number;
  snapToGrid?: number;
  bounds?: {
    minX?: number;
    maxX?: number;
    minY?: number;
    maxY?: number;
  };
  onDragStart?: () => void;
  onDragEnd?: (x: number, y: number) => void;
  onMomentumEnd?: (x: number, y: number) => void;
}

// Physics constants for natural feel
const DEFAULT_FRICTION = 0.95;
const DEFAULT_VELOCITY_FACTOR = 0.8;
const DRAG_SCALE = 1.02; // Subtle scale up while dragging

export function useDragPhysics(options: DragPhysicsOptions = {}): DragPhysicsState {
  const {
    friction = DEFAULT_FRICTION,
    velocityFactor = DEFAULT_VELOCITY_FACTOR,
  } = options;

  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const velocityX = useSharedValue(0);
  const velocityY = useSharedValue(0);
  const isDragging = useSharedValue(false);
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
    zIndex: isDragging.value ? 1000 : 1,
  }));

  return {
    translateX,
    translateY,
    velocityX,
    velocityY,
    isDragging,
    scale,
    animatedStyle,
  };
}

// Clamp helper for bounds
function clamp(value: number, min: number, max: number): number {
  'worklet';
  return Math.min(Math.max(value, min), max);
}

// Worklet for handling drag start
export function onDragStartWorklet(
  isDragging: SharedValue<boolean>,
  scale: SharedValue<number>,
  onDragStart?: () => void
): void {
  'worklet';
  
  isDragging.value = true;
  scale.value = withSpring(DRAG_SCALE, SPRING_CONFIG_DEFAULT);
  
  if (onDragStart) {
    runOnUI(onDragStart)();
  }
}

// Worklet for handling drag update
export function onDragUpdateWorklet(
  translateX: SharedValue<number>,
  translateY: SharedValue<number>,
  velocityX: SharedValue<number>,
  velocityY: SharedValue<number>,
  event: GestureUpdateEvent<PanGestureHandlerEventPayload>,
  bounds?: DragPhysicsOptions['bounds']
): void {
  'worklet';
  
  // Update positions with translation
  let newX = translateX.value + event.translationX;
  let newY = translateY.value + event.translationY;
  
  // Apply bounds if provided
  if (bounds) {
    newX = clamp(newX, bounds.minX ?? -Infinity, bounds.maxX ?? Infinity);
    newY = clamp(newY, bounds.minY ?? -Infinity, bounds.maxY ?? Infinity);
  }
  
  // Apply resistance near bounds for elastic feel
  if (bounds?.minX !== undefined && newX < bounds.minX) {
    const overshoot = bounds.minX - newX;
    newX = bounds.minX - overshoot * 0.3; // 30% resistance
  }
  if (bounds?.maxX !== undefined && newX > bounds.maxX) {
    const overshoot = newX - bounds.maxX;
    newX = bounds.maxX + overshoot * 0.3;
  }
  if (bounds?.minY !== undefined && newY < bounds.minY) {
    const overshoot = bounds.minY - newY;
    newY = bounds.minY - overshoot * 0.3;
  }
  if (bounds?.maxY !== undefined && newY > bounds.maxY) {
    const overshoot = newY - bounds.maxY;
    newY = bounds.maxY + overshoot * 0.3;
  }
  
  translateX.value = newX;
  translateY.value = newY;
  velocityX.value = event.velocityX;
  velocityY.value = event.velocityY;
}

// Worklet for handling drag end with momentum
export function onDragEndWorklet(
  translateX: SharedValue<number>,
  translateY: SharedValue<number>,
  velocityX: SharedValue<number>,
  velocityY: SharedValue<number>,
  isDragging: SharedValue<boolean>,
  scale: SharedValue<number>,
  velocityFactor: number,
  bounds?: DragPhysicsOptions['bounds'],
  snapToGrid?: number,
  onDragEnd?: (x: number, y: number) => void,
  onMomentumEnd?: (x: number, y: number) => void
): void {
  'worklet';
  
  isDragging.value = false;
  scale.value = withSpring(1, SPRING_CONFIG_DEFAULT);
  
  // Calculate decay config
  const decayConfig = {
    velocity: velocityX.value * velocityFactor,
    deceleration: 0.997, // Natural deceleration
    clamp: bounds ? [bounds.minX ?? -Infinity, bounds.maxX ?? Infinity] : undefined,
  };
  
  const decayConfigY = {
    velocity: velocityY.value * velocityFactor,
    deceleration: 0.997,
    clamp: bounds ? [bounds.minY ?? -Infinity, bounds.maxY ?? Infinity] : undefined,
  };
  
  // Apply momentum decay with snap to grid if specified
  translateX.value = withDecay(decayConfig as any, (finished) => {
    if (finished) {
      // Snap to grid if specified
      if (snapToGrid) {
        const snapped = Math.round(translateX.value / snapToGrid) * snapToGrid;
        translateX.value = withSpring(snapped, SPRING_CONFIG_GENTLE);
      }
      
      if (onMomentumEnd) {
        runOnUI(onMomentumEnd)(translateX.value, translateY.value);
      }
    }
  });
  
  translateY.value = withDecay(decayConfigY as any, (finished) => {
    if (finished && snapToGrid) {
      const snapped = Math.round(translateY.value / snapToGrid) * snapToGrid;
      translateY.value = withSpring(snapped, SPRING_CONFIG_GENTLE);
    }
  });
  
  if (onDragEnd) {
    runOnUI(onDragEnd)(translateX.value, translateY.value);
  }
}

// Hook for complete drag gesture control
export function useDragController(options: DragPhysicsOptions = {}) {
  const {
    friction = DEFAULT_FRICTION,
    velocityFactor = DEFAULT_VELOCITY_FACTOR,
    bounds,
    snapToGrid,
    onDragStart,
    onDragEnd,
    onMomentumEnd,
  } = options;
  
  const animation = useDragPhysics(options);
  const startPosition = useRef({ x: 0, y: 0 });

  const handleDragStart = useCallback(() => {
    startPosition.current = {
      x: animation.translateX.value,
      y: animation.translateY.value,
    };
    
    runOnUI(() => {
      'worklet';
      onDragStartWorklet(animation.isDragging, animation.scale, onDragStart);
    })();
  }, [animation, onDragStart]);

  const handleDragUpdate = useCallback((event: GestureUpdateEvent<PanGestureHandlerEventPayload>) => {
    runOnUI(() => {
      'worklet';
      onDragUpdateWorklet(
        animation.translateX,
        animation.translateY,
        animation.velocityX,
        animation.velocityY,
        event,
        bounds
      );
    })();
  }, [animation, bounds]);

  const handleDragEnd = useCallback(() => {
    runOnUI(() => {
      'worklet';
      onDragEndWorklet(
        animation.translateX,
        animation.translateY,
        animation.velocityX,
        animation.velocityY,
        animation.isDragging,
        animation.scale,
        velocityFactor,
        bounds,
        snapToGrid,
        onDragEnd,
        onMomentumEnd
      );
    })();
  }, [animation, velocityFactor, bounds, snapToGrid, onDragEnd, onMomentumEnd]);

  const setPosition = useCallback((x: number, y: number) => {
    runOnUI(() => {
      'worklet';
      animation.translateX.value = withSpring(x, SPRING_CONFIG_DEFAULT);
      animation.translateY.value = withSpring(y, SPRING_CONFIG_DEFAULT);
    })();
  }, [animation]);

  return {
    ...animation,
    handleDragStart,
    handleDragUpdate,
    handleDragEnd,
    setPosition,
  };
}
