/**
 * Vista Launcher Animations
 * Fluid 120fps animations using React Native Reanimated 3
 * 
 * @module animations
 */

// Spring configurations
export {
  SPRING_CONFIG_DEFAULT,
  SPRING_CONFIG_SNAPPY,
  SPRING_CONFIG_GENTLE,
  SPRING_CONFIG_BOUNCE,
  SPRING_CONFIG_MORPH,
  DURATION,
  EASING,
} from './springConfigs';

// Window animations
export {
  useWindowAnimation,
  useWindowController,
  openWindowWorklet,
  closeWindowWorklet,
  type WindowAnimationState,
  type WindowAnimationOptions,
} from './useWindowAnimation';

// Minimize animations
export {
  useMinimizeAnimation,
  useMinimizeController,
  minimizeWindowWorklet,
  restoreWindowWorklet,
  type MinimizeAnimationState,
  type MinimizeAnimationOptions,
} from './useMinimizeAnimation';

// Start menu animations
export {
  useStartMenuAnimation,
  useStartMenuController,
  openStartMenuWorklet,
  closeStartMenuWorklet,
  type StartMenuAnimationState,
  type StartMenuAnimationOptions,
  type StartMenuItemAnimation,
} from './useStartMenuAnimation';

// Drag physics
export {
  useDragPhysics,
  useDragController,
  onDragStartWorklet,
  onDragUpdateWorklet,
  onDragEndWorklet,
  type DragPhysicsState,
  type DragPhysicsOptions,
} from './useDragPhysics';

// Glass shimmer
export {
  useGlassShimmer,
  useHoverShimmer,
  getGlassGradient,
  type GlassShimmerState,
  type GlassShimmerOptions,
} from './useGlassShimmer';

// Button hover
export {
  useButtonHover,
  useButtonController,
  onButtonHoverInWorklet,
  onButtonHoverOutWorklet,
  onButtonPressWorklet,
  type ButtonHoverState,
  type ButtonHoverOptions,
} from './useButtonHover';

// Taskbar bounce
export {
  useTaskbarBounce,
  useTaskbarController,
  notifyBounceWorklet,
  urgentNotificationWorklet,
  stopNotificationWorklet,
  attentionGrabWorklet,
  type TaskbarBounceState,
  type TaskbarBounceOptions,
} from './useTaskbarBounce';

// Shared transitions
export {
  WindowSharedTransition,
  ModalSharedTransition,
  TaskbarToWindowTransition,
  CardExpandTransition,
  ListItemTransition,
  SharedTransitionPresets,
  TransitionSpecs,
  LayoutAnimationPresets,
  getSharedTransition,
  type SharedTransitionPreset,
} from './SharedTransitions';
