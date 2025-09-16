/**
 * Responsive Behavior Contracts for UI/UX Design System
 * Defines responsive behavior specifications and breakpoint management
 */

// =============================================================================
// Viewport and Breakpoint Management
// =============================================================================

/**
 * Viewport state management interface
 * Handles responsive behavior and orientation changes
 */
export interface ViewportState {
  /** Current viewport width in pixels */
  width: number
  /** Current viewport height in pixels */
  height: number
  /** Current breakpoint identifier */
  breakpoint: ResponsiveBreakpoint
  /** Device orientation */
  orientation: DeviceOrientation
  /** Touch capability detection */
  isTouchDevice: boolean
  /** High DPI display detection */
  isHighDPI: boolean
}

/**
 * Responsive breakpoint identifiers
 */
export type ResponsiveBreakpoint = 'mobile' | 'mobile-lg' | 'tablet' | 'tablet-lg' | 'desktop'

/**
 * Breakpoint configuration with pixel values
 */
export interface BreakpointConfig {
  mobile: number      // 320px
  'mobile-lg': number // 480px
  tablet: number      // 768px
  'tablet-lg': number // 1024px
  desktop: number     // 1366px
}

/**
 * Responsive component behavior specification
 */
export interface ResponsiveComponentSpec {
  /** Component identifier */
  componentId: string
  /** Breakpoint-specific configurations */
  breakpoints: {
    [K in ResponsiveBreakpoint]?: ComponentBreakpointConfig
  }
  /** Transition behavior between breakpoints */
  transitions: ResponsiveTransitionConfig
}

/**
 * Configuration for component at specific breakpoint
 */
export interface ComponentBreakpointConfig {
  /** Layout configuration */
  layout: ComponentLayout
  /** Typography adjustments */
  typography: TypographyConfig
  /** Spacing adjustments */
  spacing: SpacingConfig
  /** Interactive behavior changes */
  interaction: InteractionConfig
}

/**
 * Component layout specification
 */
export interface ComponentLayout {
  /** Grid or flex layout properties */
  display: 'grid' | 'flex' | 'block'
  /** Number of columns for grid layouts */
  columns?: number
  /** Gap between items */
  gap: string
  /** Padding adjustments */
  padding: string
  /** Margin adjustments */
  margin: string
  /** Width constraints */
  maxWidth?: string
}

/**
 * Typography configuration for responsive text
 */
export interface TypographyConfig {
  /** Font size adjustment */
  fontSize: string
  /** Line height adjustment */
  lineHeight: string
  /** Font weight changes */
  fontWeight?: number
  /** Letter spacing adjustments */
  letterSpacing?: string
}

/**
 * Spacing configuration for responsive layouts
 */
export interface SpacingConfig {
  /** Spacing between sections */
  sectionSpacing: string
  /** Spacing between field groups */
  fieldGroupSpacing: string
  /** Spacing between individual fields */
  fieldSpacing: string
}

/**
 * Interaction configuration for touch/desktop
 */
export interface InteractionConfig {
  /** Touch target size adjustments */
  touchTargetSize: string
  /** Hover behavior enable/disable */
  enableHover: boolean
  /** Touch gesture support */
  gestureSupport: TouchGestureConfig
  /** Keyboard navigation adjustments */
  keyboardNavigation: KeyboardNavConfig
}

/**
 * Touch gesture configuration
 */
export interface TouchGestureConfig {
  /** Enable swipe gestures */
  enableSwipe: boolean
  /** Enable pinch-to-zoom */
  enablePinch: boolean
  /** Enable long press */
  enableLongPress: boolean
  /** Gesture sensitivity settings */
  sensitivity: 'low' | 'medium' | 'high'
}

/**
 * Keyboard navigation configuration
 */
export interface KeyboardNavConfig {
  /** Tab order adjustments */
  tabOrder: 'natural' | 'optimized'
  /** Keyboard shortcuts */
  shortcuts: KeyboardShortcut[]
  /** Focus management strategy */
  focusStrategy: 'auto' | 'manual'
}

/**
 * Keyboard shortcut definition
 */
export interface KeyboardShortcut {
  /** Key combination (e.g., 'ctrl+s') */
  keys: string
  /** Action to perform */
  action: string
  /** Description for accessibility */
  description: string
}

/**
 * Responsive transition configuration
 */
export interface ResponsiveTransitionConfig {
  /** Transition duration between breakpoints */
  duration: string
  /** Transition easing function */
  easing: string
  /** Properties to transition */
  properties: string[]
  /** Enable reduced motion support */
  respectReducedMotion: boolean
}

// =============================================================================
// Device-Specific Behavior
// =============================================================================

/**
 * Device capability detection interface
 */
export interface DeviceCapabilities {
  /** Touch input support */
  supportsTouch: boolean
  /** Hover capability (mouse or trackpad) */
  supportsHover: boolean
  /** High resolution display */
  isHighDPI: boolean
  /** Viewport manipulation support */
  supportsViewportMeta: boolean
  /** CSS custom properties support */
  supportsCSSCustomProperties: boolean
}

/**
 * Touch-specific behavioral adaptations
 */
export interface TouchBehaviorSpec {
  /** Minimum touch target size (44px WCAG, 56px educational) */
  minTouchTarget: number
  /** Touch target padding */
  touchTargetPadding: number
  /** Prevent accidental touches */
  preventAccidental: boolean
  /** Touch feedback settings */
  hapticFeedback?: HapticFeedbackConfig
}

/**
 * Haptic feedback configuration for supported devices
 */
export interface HapticFeedbackConfig {
  /** Enable haptic feedback */
  enabled: boolean
  /** Feedback intensity */
  intensity: 'light' | 'medium' | 'heavy'
  /** Feedback patterns for different actions */
  patterns: {
    success: HapticPattern
    error: HapticPattern
    warning: HapticPattern
    selection: HapticPattern
  }
}

/**
 * Haptic feedback pattern definition
 */
export interface HapticPattern {
  /** Pattern type */
  type: 'notification' | 'impact' | 'selection'
  /** Duration in milliseconds */
  duration: number
}

// =============================================================================
// Performance and Accessibility Specifications
// =============================================================================

/**
 * Performance requirements for responsive components
 */
export interface PerformanceSpec {
  /** Target frame rate for animations */
  targetFPS: number
  /** Maximum layout shift allowed */
  maxCLS: number
  /** Target interaction response time */
  targetResponseTime: number
  /** Memory usage constraints */
  memoryConstraints: MemoryConstraints
}

/**
 * Memory usage constraints for mobile devices
 */
export interface MemoryConstraints {
  /** Maximum component cache size */
  maxCacheSize: number
  /** Image loading strategy */
  imageLoadingStrategy: 'eager' | 'lazy' | 'progressive'
  /** Component unmounting strategy */
  unmountStrategy: 'aggressive' | 'conservative'
}

/**
 * Accessibility specifications for responsive design
 */
export interface AccessibilitySpec {
  /** WCAG compliance level */
  wcagLevel: 'A' | 'AA' | 'AAA'
  /** Color contrast requirements */
  colorContrast: ColorContrastSpec
  /** Screen reader optimizations */
  screenReader: ScreenReaderSpec
  /** Motor accessibility features */
  motorAccessibility: MotorAccessibilitySpec
}

/**
 * Color contrast specifications
 */
export interface ColorContrastSpec {
  /** Normal text contrast ratio */
  normalText: number // 4.5:1 for AA
  /** Large text contrast ratio */
  largeText: number  // 3:1 for AA
  /** Non-text elements contrast ratio */
  nonTextElements: number // 3:1 for AA
  /** Focus indicators contrast */
  focusIndicators: number
}

/**
 * Screen reader optimization specifications
 */
export interface ScreenReaderSpec {
  /** ARIA labeling strategy */
  ariaStrategy: 'comprehensive' | 'minimal' | 'contextual'
  /** Live region usage */
  liveRegions: LiveRegionConfig[]
  /** Reading order optimization */
  readingOrder: 'DOM' | 'visual' | 'logical'
}

/**
 * Live region configuration for screen readers
 */
export interface LiveRegionConfig {
  /** Region selector */
  selector: string
  /** Politeness level */
  politeness: 'off' | 'polite' | 'assertive'
  /** Update frequency */
  updateFrequency: 'immediate' | 'debounced' | 'batched'
}

/**
 * Motor accessibility specifications
 */
export interface MotorAccessibilitySpec {
  /** Enhanced target sizes */
  enhancedTargets: boolean
  /** Timeout extensions */
  timeoutExtensions: boolean
  /** Alternative input methods */
  alternativeInputs: AlternativeInput[]
  /** Gesture alternatives */
  gestureAlternatives: boolean
}

/**
 * Alternative input method support
 */
export interface AlternativeInput {
  /** Input method type */
  type: 'switch' | 'voice' | 'eye-tracking' | 'keyboard-only'
  /** Support level */
  level: 'basic' | 'full'
  /** Configuration options */
  config: Record<string, any>
}

// =============================================================================
// Animation and Transition Specifications
// =============================================================================

/**
 * Animation specifications with reduced motion support
 */
export interface AnimationSpec {
  /** Default animation settings */
  default: AnimationConfig
  /** Reduced motion alternatives */
  reducedMotion: ReducedMotionConfig
  /** Performance-optimized animations */
  performanceMode: PerformanceAnimationConfig
}

/**
 * Animation configuration
 */
export interface AnimationConfig {
  /** Animation duration */
  duration: string
  /** Easing function */
  easing: string
  /** Delay before animation starts */
  delay: string
  /** Animation fill mode */
  fillMode: 'none' | 'forwards' | 'backwards' | 'both'
}

/**
 * Reduced motion configuration for accessibility
 */
export interface ReducedMotionConfig {
  /** Disable all animations */
  disableAnimations: boolean
  /** Reduce animation duration */
  reduceDuration: boolean
  /** Alternative transition methods */
  alternatives: MotionAlternative[]
}

/**
 * Motion alternative for accessibility
 */
export interface MotionAlternative {
  /** Alternative type */
  type: 'opacity' | 'position' | 'scale' | 'none'
  /** Transition properties */
  transition: string
}

/**
 * Performance-optimized animation configuration
 */
export interface PerformanceAnimationConfig {
  /** Use CSS transforms instead of layout properties */
  useTransforms: boolean
  /** Enable hardware acceleration */
  hardwareAcceleration: boolean
  /** Batch animation updates */
  batchUpdates: boolean
  /** Frame rate throttling */
  throttleFrameRate: boolean
}

// =============================================================================
// Testing and Validation Contracts
// =============================================================================

/**
 * Responsive behavior testing specification
 */
export interface ResponsiveTestSpec {
  /** Breakpoints to test */
  breakpoints: ResponsiveBreakpoint[]
  /** Viewports for testing */
  viewports: ViewportTestConfig[]
  /** Interaction tests */
  interactions: InteractionTest[]
  /** Performance benchmarks */
  performance: PerformanceTest[]
}

/**
 * Viewport configuration for testing
 */
export interface ViewportTestConfig {
  /** Viewport name */
  name: string
  /** Width in pixels */
  width: number
  /** Height in pixels */
  height: number
  /** Device pixel ratio */
  devicePixelRatio: number
  /** User agent string */
  userAgent?: string
}

/**
 * Interaction test specification
 */
export interface InteractionTest {
  /** Test name */
  name: string
  /** Target element selector */
  selector: string
  /** Interaction type */
  interaction: 'click' | 'swipe' | 'pinch' | 'keyboard' | 'focus'
  /** Expected result */
  expectedResult: TestExpectation
  /** Test timeout */
  timeout: number
}

/**
 * Test expectation specification
 */
export interface TestExpectation {
  /** Expected visual change */
  visualChange?: VisualChangeExpectation
  /** Expected state change */
  stateChange?: StateChangeExpectation
  /** Expected accessibility improvement */
  accessibilityChange?: AccessibilityExpectation
}

/**
 * Visual change expectation
 */
export interface VisualChangeExpectation {
  /** Screenshot comparison threshold */
  threshold: number
  /** Ignore regions for comparison */
  ignoreRegions?: RegionSpec[]
  /** Expected element visibility */
  visibility?: ElementVisibilitySpec[]
}

/**
 * State change expectation
 */
export interface StateChangeExpectation {
  /** Expected property changes */
  propertyChanges: PropertyChange[]
  /** Expected event dispatches */
  events?: string[]
}

/**
 * Property change specification
 */
export interface PropertyChange {
  /** Property path */
  property: string
  /** Expected value */
  expectedValue: any
  /** Value comparison type */
  comparisonType: 'exact' | 'partial' | 'regex' | 'type'
}

/**
 * Accessibility expectation
 */
export interface AccessibilityExpectation {
  /** Expected ARIA changes */
  ariaChanges?: ARIAChange[]
  /** Expected contrast improvements */
  contrastImprovements?: ContrastImprovement[]
  /** Expected keyboard navigation changes */
  keyboardChanges?: KeyboardNavigationChange[]
}

/**
 * ARIA attribute change specification
 */
export interface ARIAChange {
  /** Element selector */
  selector: string
  /** ARIA attribute name */
  attribute: string
  /** Expected value */
  expectedValue: string
}

/**
 * Contrast improvement specification
 */
export interface ContrastImprovement {
  /** Element selector */
  selector: string
  /** Expected contrast ratio */
  expectedRatio: number
  /** Color property being tested */
  colorProperty: 'color' | 'background-color' | 'border-color'
}

/**
 * Keyboard navigation change specification
 */
export interface KeyboardNavigationChange {
  /** Navigation action */
  action: 'tab' | 'shift-tab' | 'arrow' | 'enter' | 'space'
  /** Expected focus target */
  expectedFocus: string
}

/**
 * Performance test specification
 */
export interface PerformanceTest {
  /** Test name */
  name: string
  /** Performance metric */
  metric: 'CLS' | 'FID' | 'LCP' | 'FCP' | 'TTFB'
  /** Target value */
  target: number
  /** Maximum allowed value */
  threshold: number
}

/**
 * Region specification for visual testing
 */
export interface RegionSpec {
  /** CSS selector for region */
  selector: string
  /** Region coordinates (if not using selector) */
  coordinates?: {
    x: number
    y: number
    width: number
    height: number
  }
}

/**
 * Element visibility specification
 */
export interface ElementVisibilitySpec {
  /** Element selector */
  selector: string
  /** Expected visibility state */
  visible: boolean
  /** Opacity threshold for visibility */
  opacityThreshold?: number
}