"use client";

import { useState, useEffect, useCallback } from "react";

export type BreakpointSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

export interface DeviceCapabilities {
  /** Touch input capability */
  hasTouch: boolean;
  /** Hover capability (mouse/trackpad) */
  hasHover: boolean;
  /** High DPI display (retina) */
  isHighDPI: boolean;
  /** Mobile device detection */
  isMobile: boolean;
  /** Tablet device detection */
  isTablet: boolean;
  /** Desktop device detection */
  isDesktop: boolean;
  /** Network connection information */
  connection?: {
    type: string;
    effectiveType: string;
    downlink: number;
    saveData: boolean;
  };
}

export interface ViewportState {
  /** Current viewport width in pixels */
  width: number;
  /** Current viewport height in pixels */
  height: number;
  /** Current breakpoint size */
  breakpoint: BreakpointSize;
  /** Device capabilities */
  capabilities: DeviceCapabilities;
  /** Whether viewport is currently resizing */
  isResizing: boolean;
  /** Aspect ratio (width / height) */
  aspectRatio: number;
}

export interface UseViewportOptions {
  /** Debounce delay for resize events in milliseconds */
  debounceMs?: number;
  /** Custom breakpoints (defaults to Tailwind CSS breakpoints) */
  breakpoints?: Record<BreakpointSize, number>;
  /** Enable network connection monitoring */
  enableNetworkMonitoring?: boolean;
  /** Callback when viewport changes */
  onChange?: (state: ViewportState) => void;
}

/**
 * Hook for viewport and device capability detection
 *
 * Features:
 * - Real-time viewport size tracking
 * - Tailwind CSS breakpoint detection
 * - Device capability detection (touch, hover, high DPI)
 * - Mobile/tablet/desktop classification
 * - Network connection monitoring (when available)
 * - Brazilian educational context optimization
 * - Debounced resize events for performance
 *
 * @example
 * ```tsx
 * // Basic usage
 * const { width, height, breakpoint } = useViewport();
 *
 * // With custom breakpoints and callbacks
 * const viewport = useViewport({
 *   debounceMs: 250,
 *   enableNetworkMonitoring: true,
 *   onChange: (state) => {
 *     // console.log('Viewport changed:', state.breakpoint);
 *   }
 * });
 *
 * // Responsive rendering
 * return (
 *   <div>
 *     {viewport.capabilities.isMobile ? (
 *       <MobileAttendanceGrid />
 *     ) : viewport.capabilities.isTablet ? (
 *       <TabletAttendanceGrid />
 *     ) : (
 *       <DesktopAttendanceGrid />
 *     )}
 *   </div>
 * );
 *
 * // Touch-optimized components
 * const buttonSize = viewport.capabilities.hasTouch ? 'touch' : 'default';
 * ```
 */
export function useViewport(options: UseViewportOptions = {}): ViewportState {
  const {
    debounceMs = 150,
    breakpoints = {
      xs: 0,
      sm: 640,
      md: 768,
      lg: 1024,
      xl: 1280,
      '2xl': 1536,
    },
    enableNetworkMonitoring = true,
    onChange
  } = options;

  // Initialize state
  const [state, setState] = useState<ViewportState>(() => {
    if (typeof window === 'undefined') {
      return {
        width: 1024,
        height: 768,
        breakpoint: 'lg',
        capabilities: {
          hasTouch: false,
          hasHover: true,
          isHighDPI: false,
          isMobile: false,
          isTablet: false,
          isDesktop: true,
        },
        isResizing: false,
        aspectRatio: 1.33,
      };
    }

    const initialWidth = window.innerWidth;
    const initialHeight = window.innerHeight;

    return {
      width: initialWidth,
      height: initialHeight,
      breakpoint: getBreakpoint(initialWidth, breakpoints),
      capabilities: getDeviceCapabilities(),
      isResizing: false,
      aspectRatio: initialWidth / initialHeight,
    };
  });

  /**
   * Determine current breakpoint based on width
   */
  function getBreakpoint(width: number, bps: Record<BreakpointSize, number>): BreakpointSize {
    if (width >= bps['2xl']) return '2xl';
    if (width >= bps.xl) return 'xl';
    if (width >= bps.lg) return 'lg';
    if (width >= bps.md) return 'md';
    if (width >= bps.sm) return 'sm';
    return 'xs';
  }

  /**
   * Detect device capabilities for educational context optimization
   */
  function getDeviceCapabilities(): DeviceCapabilities {
    if (typeof window === 'undefined') {
      return {
        hasTouch: false,
        hasHover: true,
        isHighDPI: false,
        isMobile: false,
        isTablet: false,
        isDesktop: true,
      };
    }

    // Touch capability detection
    const hasTouch = (
      'ontouchstart' in window ||
      navigator.maxTouchPoints > 0 ||
      (navigator as any).msMaxTouchPoints > 0
    );

    // Hover capability detection
    const hasHover = window.matchMedia('(hover: hover)').matches;

    // High DPI detection
    const isHighDPI = window.devicePixelRatio > 1.5;

    // Device classification based on screen size and capabilities
    const screenWidth = window.screen.width;
    const screenHeight = window.screen.height;
    const maxDimension = Math.max(screenWidth, screenHeight);
    const minDimension = Math.min(screenWidth, screenHeight);

    // Brazilian educational context: Common device sizes in schools
    const isMobile = (
      hasTouch &&
      maxDimension <= 896 && // iPhone Plus/Max sized devices
      minDimension <= 414
    );

    const isTablet = (
      hasTouch &&
      !isMobile &&
      maxDimension >= 800 && // Typical tablet minimum
      maxDimension <= 1366 && // Large tablet/small laptop
      minDimension >= 600
    );

    const isDesktop = !isMobile && !isTablet;

    // Network connection information (when available)
    let connection: DeviceCapabilities['connection'];
    if (enableNetworkMonitoring && 'connection' in navigator) {
      const nav = navigator as any;
      connection = {
        type: nav.connection.type || 'unknown',
        effectiveType: nav.connection.effectiveType || 'unknown',
        downlink: nav.connection.downlink || 0,
        saveData: nav.connection.saveData || false,
      };
    }

    return {
      hasTouch,
      hasHover,
      isHighDPI,
      isMobile,
      isTablet,
      isDesktop,
      connection,
    };
  }

  /**
   * Handle viewport resize with debouncing
   */
  const handleResize = useCallback(() => {
    setState(prevState => ({ ...prevState, isResizing: true }));

    const timeoutId = setTimeout(() => {
      const newWidth = window.innerWidth;
      const newHeight = window.innerHeight;
      const newBreakpoint = getBreakpoint(newWidth, breakpoints);
      const newAspectRatio = newWidth / newHeight;

      // Update capabilities on resize (orientation changes might affect device classification)
      const newCapabilities = getDeviceCapabilities();

      const newState: ViewportState = {
        width: newWidth,
        height: newHeight,
        breakpoint: newBreakpoint,
        capabilities: newCapabilities,
        isResizing: false,
        aspectRatio: newAspectRatio,
      };

      setState(newState);
      onChange?.(newState);
    }, debounceMs);

    return () => clearTimeout(timeoutId);
  }, [debounceMs, breakpoints, onChange]);

  /**
   * Set up resize listener
   */
  useEffect(() => {
    if (typeof window === 'undefined') return;

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [handleResize]);

  /**
   * Monitor network connection changes (if supported and enabled)
   */
  useEffect(() => {
    if (typeof navigator === 'undefined' || !enableNetworkMonitoring || !('connection' in navigator)) {
      return;
    }

    const handleConnectionChange = () => {
      setState(prevState => ({
        ...prevState,
        capabilities: {
          ...prevState.capabilities,
          connection: getDeviceCapabilities().connection,
        },
      }));
    };

    const connection = (navigator as any).connection;
    connection.addEventListener('change', handleConnectionChange);

    return () => {
      connection.removeEventListener('change', handleConnectionChange);
    };
  }, [enableNetworkMonitoring]);

  /**
   * Handle media query changes for hover capability
   */
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const hoverQuery = window.matchMedia('(hover: hover)');

    const handleHoverChange = () => {
      setState(prevState => ({
        ...prevState,
        capabilities: {
          ...prevState.capabilities,
          hasHover: hoverQuery.matches,
        },
      }));
    };

    // Modern browsers
    if (hoverQuery.addEventListener) {
      hoverQuery.addEventListener('change', handleHoverChange);
      return () => hoverQuery.removeEventListener('change', handleHoverChange);
    }

    // Legacy browsers
    if (hoverQuery.addListener) {
      hoverQuery.addListener(handleHoverChange);
      return () => hoverQuery.removeListener(handleHoverChange);
    }
  }, []);

  return state;
}

/**
 * Utility function to check if current viewport matches a breakpoint
 */
export function useBreakpoint(breakpoint: BreakpointSize): boolean {
  const { breakpoint: currentBreakpoint } = useViewport();

  const breakpointOrder: BreakpointSize[] = ['xs', 'sm', 'md', 'lg', 'xl', '2xl'];
  const currentIndex = breakpointOrder.indexOf(currentBreakpoint);
  const targetIndex = breakpointOrder.indexOf(breakpoint);

  return currentIndex >= targetIndex;
}

/**
 * Utility function to get optimized component sizes based on device capabilities
 */
export function useOptimizedSizes() {
  const { capabilities } = useViewport();

  return {
    // Button sizes optimized for Brazilian educational tablets/mobile
    buttonSize: capabilities.hasTouch ? (capabilities.isMobile ? 'lg' : 'touch') : 'default',
    // Input sizes for better accessibility
    inputSize: capabilities.hasTouch ? 'lg' : 'default',
    // Grid spacing for attendance grids
    gridSpacing: capabilities.isMobile ? 2 : capabilities.isTablet ? 3 : 4,
    // Touch target minimum size (Brazilian accessibility guidelines)
    minTouchTarget: capabilities.hasTouch ? 44 : 32, // pixels
  };
}

export default useViewport;