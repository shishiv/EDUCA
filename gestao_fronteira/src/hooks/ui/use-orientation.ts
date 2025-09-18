"use client";

import { useState, useEffect, useCallback } from "react";

export type OrientationType = 'portrait' | 'landscape';

export interface OrientationState {
  /** Current device orientation */
  orientation: OrientationType;
  /** Screen angle in degrees (0, 90, 180, 270) */
  angle: number;
  /** Whether orientation is currently changing */
  isChanging: boolean;
  /** Whether the device supports orientation changes */
  isSupported: boolean;
}

export interface UseOrientationOptions {
  /** Debounce delay for orientation changes in milliseconds */
  debounceMs?: number;
  /** Enable orientation lock detection */
  detectLock?: boolean;
  /** Callback when orientation changes */
  onChange?: (state: OrientationState) => void;
}

/**
 * Hook for detecting and managing device orientation changes
 *
 * Features:
 * - Real-time orientation detection (portrait/landscape)
 * - Screen angle measurement (0°, 90°, 180°, 270°)
 * - Debounced orientation changes to prevent rapid firing
 * - Orientation lock detection
 * - Cross-browser compatibility
 * - Educational tablet/mobile optimization
 *
 * @example
 * ```tsx
 * // Basic usage
 * const { orientation, angle } = useOrientation();
 *
 * // With callback and debouncing
 * const orientationState = useOrientation({
 *   debounceMs: 300,
 *   onChange: (state) => {
 *     // console.log('Orientation changed to:', state.orientation);
 *   }
 * });
 *
 * // Conditional rendering based on orientation
 * return (
 *   <div className={`${orientation === 'landscape' ? 'grid-cols-2' : 'grid-cols-1'}`}>
 *     {orientation === 'portrait' ? <VerticalLayout /> : <HorizontalLayout />}
 *   </div>
 * );
 * ```
 */
export function useOrientation(options: UseOrientationOptions = {}): OrientationState {
  const { debounceMs = 150, detectLock = true, onChange } = options;

  // Initialize state with current orientation
  const [state, setState] = useState<OrientationState>(() => {
    if (typeof window === 'undefined') {
      return {
        orientation: 'portrait',
        angle: 0,
        isChanging: false,
        isSupported: false,
      };
    }

    const initialOrientation = getOrientationFromWindow();
    const initialAngle = getScreenAngle();

    return {
      orientation: initialOrientation,
      angle: initialAngle,
      isChanging: false,
      isSupported: isOrientationSupported(),
    };
  });

  /**
   * Get orientation from window dimensions
   */
  function getOrientationFromWindow(): OrientationType {
    if (typeof window === 'undefined') return 'portrait';

    // Use screen.orientation API if available
    if (screen.orientation) {
      return screen.orientation.type.includes('portrait') ? 'portrait' : 'landscape';
    }

    // Fallback to window dimensions
    return window.innerHeight > window.innerWidth ? 'portrait' : 'landscape';
  }

  /**
   * Get screen angle from orientation API
   */
  function getScreenAngle(): number {
    if (typeof window === 'undefined') return 0;

    // Modern API
    if (screen.orientation) {
      return screen.orientation.angle;
    }

    // Legacy API
    if ('orientation' in window) {
      return Math.abs(window.orientation as number);
    }

    return 0;
  }

  /**
   * Check if orientation detection is supported
   */
  function isOrientationSupported(): boolean {
    if (typeof window === 'undefined') return false;

    return !!(
      screen.orientation ||
      'orientation' in window ||
      'onorientationchange' in window
    );
  }

  /**
   * Handle orientation change with debouncing
   */
  const handleOrientationChange = useCallback(() => {
    setState(prevState => ({ ...prevState, isChanging: true }));

    // Debounce the actual state update
    const timeoutId = setTimeout(() => {
      const newOrientation = getOrientationFromWindow();
      const newAngle = getScreenAngle();

      const newState: OrientationState = {
        orientation: newOrientation,
        angle: newAngle,
        isChanging: false,
        isSupported: isOrientationSupported(),
      };

      setState(newState);
      onChange?.(newState);
    }, debounceMs);

    return () => clearTimeout(timeoutId);
  }, [debounceMs, onChange]);

  /**
   * Handle window resize as fallback for orientation detection
   */
  const handleResize = useCallback(() => {
    // Only trigger on significant dimension changes that indicate orientation change
    const newOrientation = getOrientationFromWindow();

    setState(prevState => {
      if (prevState.orientation !== newOrientation) {
        const newState: OrientationState = {
          orientation: newOrientation,
          angle: getScreenAngle(),
          isChanging: false,
          isSupported: prevState.isSupported,
        };

        // Delayed callback to allow for animation completion
        setTimeout(() => onChange?.(newState), 100);

        return newState;
      }
      return prevState;
    });
  }, [onChange]);

  /**
   * Set up event listeners for orientation changes
   */
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const cleanupFunctions: (() => void)[] = [];

    // Modern orientation API
    if (screen.orientation) {
      const handleChange = () => handleOrientationChange();
      screen.orientation.addEventListener('change', handleChange);
      cleanupFunctions.push(() => {
        screen.orientation.removeEventListener('change', handleChange);
      });
    }

    // Legacy orientation change event
    if ('onorientationchange' in window) {
      const handleChange = () => handleOrientationChange();
      window.addEventListener('orientationchange', handleChange);
      cleanupFunctions.push(() => {
        window.removeEventListener('orientationchange', handleChange);
      });
    }

    // Fallback to resize event
    window.addEventListener('resize', handleResize);
    cleanupFunctions.push(() => {
      window.removeEventListener('resize', handleResize);
    });

    // Cleanup function
    return () => {
      cleanupFunctions.forEach(cleanup => cleanup());
    };
  }, [handleOrientationChange, handleResize]);

  /**
   * Handle visibility change to re-detect orientation when app becomes visible
   * This helps with iOS Safari where orientation might change while app is backgrounded
   */
  useEffect(() => {
    if (typeof document === 'undefined') return;

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        // Re-detect orientation when app becomes visible
        setTimeout(() => {
          const currentOrientation = getOrientationFromWindow();
          const currentAngle = getScreenAngle();

          setState(prevState => {
            if (prevState.orientation !== currentOrientation || prevState.angle !== currentAngle) {
              const newState: OrientationState = {
                orientation: currentOrientation,
                angle: currentAngle,
                isChanging: false,
                isSupported: prevState.isSupported,
              };

              onChange?.(newState);
              return newState;
            }
            return prevState;
          });
        }, 100);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [onChange]);

  return state;
}

export default useOrientation;