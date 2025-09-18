/**
 * UI Hooks for Brazilian Educational Applications
 *
 * This module provides specialized hooks for device detection, orientation
 * management, and viewport optimization for Brazilian educational contexts,
 * especially for tablet and mobile-based attendance systems.
 */

// Orientation Detection
export {
  useOrientation,
  type OrientationType,
  type OrientationState,
  type UseOrientationOptions
} from './use-orientation';

// Viewport and Device Detection
export {
  useViewport,
  useBreakpoint,
  useOptimizedSizes,
  type BreakpointSize,
  type DeviceCapabilities,
  type ViewportState,
  type UseViewportOptions
} from './use-viewport';

export default useViewport;