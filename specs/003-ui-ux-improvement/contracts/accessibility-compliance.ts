/**
 * Accessibility Compliance Contracts for Brazilian Educational System
 * WCAG 2.1 Level AA compliance with Brazilian Portuguese localization
 * Brazilian Law for Inclusion (LBI 13.146/2015) compliance specifications
 */

// =============================================================================
// WCAG 2.1 Level AA Compliance Specifications
// =============================================================================

/**
 * WCAG 2.1 Level AA compliance configuration
 * Ensures accessibility for Brazilian educational institutions
 */
export interface WCAGComplianceConfig {
  /** Compliance level (AA for Brazilian legal requirement) */
  level: 'A' | 'AA' | 'AAA'
  /** Language and localization */
  locale: 'pt-BR'
  /** Specific guideline implementations */
  guidelines: WCAGGuidelineImplementation[]
  /** Testing and validation rules */
  validation: AccessibilityValidationRules
}

/**
 * WCAG guideline implementation specification
 */
export interface WCAGGuidelineImplementation {
  /** WCAG guideline identifier (e.g., '1.1.1', '2.1.1') */
  guidelineId: string
  /** Guideline title in Portuguese */
  title: string
  /** Implementation status */
  status: 'implemented' | 'partial' | 'planned' | 'not-applicable'
  /** Implementation details */
  implementation: GuidelineImplementationDetails
  /** Testing criteria */
  testCriteria: AccessibilityTestCriteria[]
}

/**
 * Guideline implementation details
 */
export interface GuidelineImplementationDetails {
  /** Implementation method */
  method: 'aria' | 'semantic-html' | 'css' | 'javascript' | 'design-pattern'
  /** Specific techniques used */
  techniques: WCAGTechnique[]
  /** Code examples or references */
  codeExamples?: CodeExample[]
  /** Known limitations */
  limitations?: string[]
}

/**
 * WCAG technique implementation
 */
export interface WCAGTechnique {
  /** Technique ID (e.g., 'ARIA1', 'H1') */
  techniqueId: string
  /** Technique description in Portuguese */
  description: string
  /** Implementation code or configuration */
  implementation: string
}

/**
 * Code example for accessibility implementation
 */
export interface CodeExample {
  /** Example title */
  title: string
  /** Code snippet */
  code: string
  /** Programming language */
  language: 'html' | 'css' | 'typescript' | 'jsx'
  /** Explanation of the example */
  explanation: string
}

// =============================================================================
// Color Contrast and Visual Accessibility
// =============================================================================

/**
 * Color contrast requirements for educational content
 * Exceeds WCAG AA requirements for better educational accessibility
 */
export interface ColorContrastRequirements {
  /** Normal text contrast ratio (WCAG AA: 4.5:1, Enhanced: 5:1) */
  normalText: {
    minimum: number
    target: number
    current: number
  }
  /** Large text contrast ratio (WCAG AA: 3:1, Enhanced: 4:1) */
  largeText: {
    minimum: number
    target: number
    current: number
  }
  /** Interactive elements contrast */
  interactive: {
    minimum: number
    target: number
    current: number
  }
  /** Educational status indicators (attendance, grades) */
  statusIndicators: {
    minimum: number
    target: number
    current: number
  }
}

/**
 * High contrast mode configuration
 * Support for users with visual impairments
 */
export interface HighContrastConfig {
  /** Enable high contrast mode */
  enabled: boolean
  /** Contrast multiplier factor */
  contrastMultiplier: number
  /** Color scheme for high contrast */
  colorScheme: HighContrastColorScheme
  /** Force contrast for specific elements */
  forceContrast: ElementContrastOverride[]
}

/**
 * High contrast color scheme
 */
export interface HighContrastColorScheme {
  background: string
  foreground: string
  accent: string
  error: string
  success: string
  warning: string
  info: string
}

/**
 * Element-specific contrast override
 */
export interface ElementContrastOverride {
  /** CSS selector */
  selector: string
  /** Background color override */
  backgroundColor?: string
  /** Text color override */
  color?: string
  /** Border color override */
  borderColor?: string
}

/**
 * Visual impairment support configuration
 */
export interface VisualImpairmentSupport {
  /** Color blindness support */
  colorBlindness: ColorBlindnessSupport
  /** Low vision support */
  lowVision: LowVisionSupport
  /** Motion sensitivity support */
  motionSensitivity: MotionSensitivitySupport
}

/**
 * Color blindness accessibility support
 */
export interface ColorBlindnessSupport {
  /** Alternative indicators for color-coded information */
  alternativeIndicators: boolean
  /** Pattern/texture support for graphs and charts */
  patternSupport: boolean
  /** Text labels for color-coded elements */
  textLabels: boolean
  /** Color blindness simulation for testing */
  simulationModes: ColorBlindnessType[]
}

/**
 * Color blindness types for testing
 */
export type ColorBlindnessType =
  | 'protanopia'    // Red blindness
  | 'deuteranopia'  // Green blindness
  | 'tritanopia'    // Blue blindness
  | 'achromatopsia' // Complete color blindness

/**
 * Low vision support features
 */
export interface LowVisionSupport {
  /** Text scaling support (up to 200%) */
  textScaling: {
    maxScale: number
    preserveLayout: boolean
    reflow: boolean
  }
  /** Magnification compatibility */
  magnificationCompatible: boolean
  /** High contrast themes */
  highContrastThemes: string[]
  /** Font customization options */
  fontCustomization: FontCustomizationOptions
}

/**
 * Font customization for accessibility
 */
export interface FontCustomizationOptions {
  /** Font family options (dyslexia-friendly fonts) */
  fontFamilies: string[]
  /** Letter spacing adjustments */
  letterSpacing: {
    min: number
    max: number
    default: number
  }
  /** Line height adjustments */
  lineHeight: {
    min: number
    max: number
    default: number
  }
  /** Word spacing adjustments */
  wordSpacing: {
    min: number
    max: number
    default: number
  }
}

/**
 * Motion sensitivity support
 */
export interface MotionSensitivitySupport {
  /** Respect prefers-reduced-motion */
  respectReducedMotion: boolean
  /** Alternative to animations */
  animationAlternatives: AnimationAlternative[]
  /** Parallax effect disable */
  disableParallax: boolean
  /** Auto-playing content controls */
  autoPlayControls: boolean
}

/**
 * Animation alternative for motion sensitivity
 */
export interface AnimationAlternative {
  /** Original animation selector */
  originalSelector: string
  /** Alternative transition */
  alternative: 'fade' | 'slide' | 'none'
  /** Transition duration (reduced) */
  duration: string
}

// =============================================================================
// Screen Reader and Assistive Technology Support
// =============================================================================

/**
 * Screen reader optimization configuration
 * Optimized for Brazilian Portuguese and educational content
 */
export interface ScreenReaderConfig {
  /** Language and dialect specification */
  language: 'pt-BR'
  /** Pronunciation customizations for educational terms */
  pronunciationGuide: PronunciationGuide[]
  /** ARIA implementation strategy */
  ariaStrategy: ARIAImplementationStrategy
  /** Live region management */
  liveRegions: LiveRegionManagement
  /** Navigation optimization */
  navigation: ScreenReaderNavigation
}

/**
 * Pronunciation guide for educational terms in Portuguese
 */
export interface PronunciationGuide {
  /** Term or phrase */
  term: string
  /** Phonetic pronunciation */
  pronunciation: string
  /** Context where the term is used */
  context: 'educational' | 'administrative' | 'academic' | 'general'
}

/**
 * ARIA implementation strategy
 */
export interface ARIAImplementationStrategy {
  /** Labeling strategy for form controls */
  formLabeling: 'explicit' | 'descriptive' | 'contextual'
  /** Landmark usage pattern */
  landmarks: ARIALandmarkUsage
  /** State and property management */
  stateManagement: ARIAStateManagement
  /** Error handling and announcements */
  errorHandling: ARIAErrorHandling
}

/**
 * ARIA landmark usage configuration
 */
export interface ARIALandmarkUsage {
  /** Main content identification */
  main: boolean
  /** Navigation landmark usage */
  navigation: boolean
  /** Complementary content landmarks */
  complementary: boolean
  /** Form landmarks for educational forms */
  form: boolean
  /** Search landmarks */
  search: boolean
}

/**
 * ARIA state management configuration
 */
export interface ARIAStateManagement {
  /** Dynamic content state tracking */
  dynamicStates: boolean
  /** Form validation state announcements */
  validationStates: boolean
  /** Loading and busy state management */
  loadingStates: boolean
  /** Expanded/collapsed state tracking */
  expansionStates: boolean
}

/**
 * ARIA error handling configuration
 */
export interface ARIAErrorHandling {
  /** Error announcement strategy */
  errorAnnouncement: 'immediate' | 'on-focus' | 'on-submit'
  /** Error description association */
  errorDescriptions: boolean
  /** Validation message timing */
  validationTiming: 'real-time' | 'on-blur' | 'on-submit'
  /** Error recovery guidance */
  recoveryGuidance: boolean
}

/**
 * Live region management for dynamic content
 */
export interface LiveRegionManagement {
  /** Attendance marking announcements */
  attendanceUpdates: LiveRegionConfig
  /** Form validation announcements */
  formValidation: LiveRegionConfig
  /** System notifications */
  systemNotifications: LiveRegionConfig
  /** Real-time data updates */
  dataUpdates: LiveRegionConfig
}

/**
 * Live region configuration
 */
export interface LiveRegionConfig {
  /** Politeness level */
  politeness: 'off' | 'polite' | 'assertive'
  /** Update frequency control */
  debounceMs: number
  /** Message batching */
  batchUpdates: boolean
  /** Message priority */
  priority: 'low' | 'medium' | 'high'
}

/**
 * Screen reader navigation optimization
 */
export interface ScreenReaderNavigation {
  /** Heading structure optimization */
  headingStructure: HeadingStructureConfig
  /** Skip link implementation */
  skipLinks: SkipLinkConfig[]
  /** Table navigation enhancement */
  tableNavigation: TableNavigationConfig
  /** Form navigation optimization */
  formNavigation: FormNavigationConfig
}

/**
 * Heading structure configuration for screen readers
 */
export interface HeadingStructureConfig {
  /** Enforce hierarchical heading structure */
  enforceHierarchy: boolean
  /** Maximum heading level depth */
  maxDepth: number
  /** Section identification strategy */
  sectionIdentification: 'headings' | 'landmarks' | 'both'
}

/**
 * Skip link configuration
 */
export interface SkipLinkConfig {
  /** Skip link text */
  text: string
  /** Target element selector */
  target: string
  /** Positioning strategy */
  position: 'top-left' | 'top-center' | 'top-right'
  /** Show on focus only */
  showOnFocus: boolean
}

/**
 * Table navigation enhancement
 */
export interface TableNavigationConfig {
  /** Caption requirement */
  requireCaptions: boolean
  /** Header association strategy */
  headerAssociation: 'scope' | 'headers-id' | 'both'
  /** Summary provision for complex tables */
  provideSummaries: boolean
}

/**
 * Form navigation optimization
 */
export interface FormNavigationConfig {
  /** Fieldset and legend usage */
  useFieldsets: boolean
  /** Label association strategy */
  labelAssociation: 'explicit' | 'implicit' | 'both'
  /** Error association method */
  errorAssociation: 'describedby' | 'invalid' | 'both'
  /** Required field indication */
  requiredIndication: 'aria-required' | 'asterisk' | 'both'
}

// =============================================================================
// Motor Accessibility and Input Support
// =============================================================================

/**
 * Motor accessibility configuration for diverse input needs
 */
export interface MotorAccessibilityConfig {
  /** Enhanced touch targets for motor impairments */
  enhancedTouchTargets: EnhancedTouchTargetConfig
  /** Alternative input method support */
  alternativeInputs: AlternativeInputMethod[]
  /** Timing adjustments */
  timingAdjustments: TimingAdjustmentConfig
  /** Gesture alternatives */
  gestureAlternatives: GestureAlternativeConfig
}

/**
 * Enhanced touch target configuration
 */
export interface EnhancedTouchTargetConfig {
  /** Minimum touch target size (44px WCAG, 56px educational) */
  minimumSize: {
    width: number
    height: number
  }
  /** Spacing between touch targets */
  spacing: {
    minimum: number
    recommended: number
  }
  /** Target expansion on focus/hover */
  expandOnFocus: boolean
  /** Visual feedback for interactions */
  visualFeedback: TouchFeedbackConfig
}

/**
 * Touch feedback configuration
 */
export interface TouchFeedbackConfig {
  /** Visual press feedback */
  pressedState: boolean
  /** Hover feedback (when supported) */
  hoverState: boolean
  /** Focus indicators */
  focusIndicators: FocusIndicatorConfig
  /** Loading states */
  loadingStates: boolean
}

/**
 * Focus indicator configuration
 */
export interface FocusIndicatorConfig {
  /** Focus ring visibility */
  visible: boolean
  /** Focus ring color (high contrast) */
  color: string
  /** Focus ring width */
  width: number
  /** Focus ring style */
  style: 'solid' | 'dashed' | 'dotted'
  /** Animation on focus */
  animated: boolean
}

/**
 * Alternative input method support
 */
export interface AlternativeInputMethod {
  /** Input method type */
  type: 'keyboard-only' | 'switch-control' | 'voice-control' | 'eye-tracking'
  /** Support level */
  supportLevel: 'basic' | 'enhanced' | 'full'
  /** Configuration options */
  configuration: AlternativeInputConfig
}

/**
 * Alternative input configuration
 */
export interface AlternativeInputConfig {
  /** Keyboard navigation enhancements */
  keyboardNavigation?: KeyboardNavigationEnhancement
  /** Switch control adaptations */
  switchControl?: SwitchControlConfig
  /** Voice control optimizations */
  voiceControl?: VoiceControlConfig
  /** Eye tracking support */
  eyeTracking?: EyeTrackingConfig
}

/**
 * Keyboard navigation enhancement
 */
export interface KeyboardNavigationEnhancement {
  /** Tab order customization */
  customTabOrder: boolean
  /** Arrow key navigation */
  arrowKeyNavigation: boolean
  /** Shortcut key support */
  shortcutKeys: KeyboardShortcut[]
  /** Modal and overlay handling */
  modalHandling: ModalKeyboardHandling
}

/**
 * Modal keyboard handling configuration
 */
export interface ModalKeyboardHandling {
  /** Focus trap in modals */
  focusTrap: boolean
  /** Return focus to trigger */
  returnFocus: boolean
  /** Escape key to close */
  escapeToClose: boolean
}

/**
 * Switch control configuration
 */
export interface SwitchControlConfig {
  /** Switch scanning support */
  scanningSupport: boolean
  /** Adjustable scan timing */
  scanTiming: {
    min: number
    max: number
    default: number
  }
  /** Switch action mapping */
  actionMapping: SwitchActionMap[]
}

/**
 * Switch action mapping
 */
export interface SwitchActionMap {
  /** Switch identifier */
  switchId: string
  /** Action to perform */
  action: 'select' | 'next' | 'previous' | 'activate'
  /** Context where action applies */
  context: 'global' | 'form' | 'navigation' | 'content'
}

/**
 * Voice control optimization
 */
export interface VoiceControlConfig {
  /** Voice command recognition */
  commandRecognition: boolean
  /** Custom voice commands */
  customCommands: VoiceCommand[]
  /** Voice feedback */
  voiceFeedback: boolean
}

/**
 * Voice command definition
 */
export interface VoiceCommand {
  /** Command phrase */
  phrase: string
  /** Action to perform */
  action: string
  /** Context sensitivity */
  contextSensitive: boolean
}

/**
 * Eye tracking support configuration
 */
export interface EyeTrackingConfig {
  /** Gaze-based interaction */
  gazeInteraction: boolean
  /** Dwell time for activation */
  dwellTime: number
  /** Gaze prediction */
  gazePrediction: boolean
}

/**
 * Timing adjustment configuration
 */
export interface TimingAdjustmentConfig {
  /** Session timeout extensions */
  sessionTimeouts: {
    defaultExtension: number
    maxExtension: number
    warningTime: number
  }
  /** Form completion time extensions */
  formTimeouts: {
    enabled: boolean
    extensionAmount: number
  }
  /** Auto-advancing content control */
  autoAdvancing: {
    pauseControl: boolean
    extendControl: boolean
    skipControl: boolean
  }
}

/**
 * Gesture alternative configuration
 */
export interface GestureAlternativeConfig {
  /** Swipe gesture alternatives */
  swipeAlternatives: GestureAlternative[]
  /** Pinch gesture alternatives */
  pinchAlternatives: GestureAlternative[]
  /** Drag and drop alternatives */
  dragDropAlternatives: GestureAlternative[]
}

/**
 * Gesture alternative specification
 */
export interface GestureAlternative {
  /** Original gesture */
  originalGesture: 'swipe' | 'pinch' | 'drag' | 'longpress'
  /** Alternative method */
  alternative: 'button' | 'keyboard' | 'menu' | 'toggle'
  /** Alternative implementation */
  implementation: string
}

// =============================================================================
// Accessibility Testing and Validation
// =============================================================================

/**
 * Accessibility validation rules for automated testing
 */
export interface AccessibilityValidationRules {
  /** WCAG guideline validation */
  wcagValidation: WCAGValidationRule[]
  /** Brazilian specific validation */
  brazilianCompliance: BrazilianComplianceRule[]
  /** Educational context validation */
  educationalValidation: EducationalAccessibilityRule[]
  /** Performance impact validation */
  performanceValidation: AccessibilityPerformanceRule[]
}

/**
 * WCAG validation rule specification
 */
export interface WCAGValidationRule {
  /** WCAG success criterion */
  criterion: string
  /** Validation method */
  method: 'automated' | 'manual' | 'semi-automated'
  /** Testing tools */
  tools: string[]
  /** Pass/fail criteria */
  passCriteria: ValidationCriteria
}

/**
 * Validation criteria specification
 */
export interface ValidationCriteria {
  /** Threshold values */
  thresholds: Record<string, number>
  /** Required attributes */
  requiredAttributes: string[]
  /** Forbidden patterns */
  forbiddenPatterns: string[]
  /** Compliance percentage */
  compliancePercentage: number
}

/**
 * Brazilian compliance rule (LBI 13.146/2015)
 */
export interface BrazilianComplianceRule {
  /** Legal requirement reference */
  legalReference: string
  /** Compliance description */
  description: string
  /** Implementation requirements */
  requirements: string[]
  /** Validation method */
  validationMethod: string
}

/**
 * Educational accessibility rule
 */
export interface EducationalAccessibilityRule {
  /** Rule category */
  category: 'content' | 'navigation' | 'interaction' | 'feedback'
  /** Rule description */
  description: string
  /** Educational context */
  context: 'attendance' | 'grades' | 'communication' | 'general'
  /** Age group considerations */
  ageGroup: 'early-childhood' | 'elementary' | 'all'
}

/**
 * Accessibility performance rule
 */
export interface AccessibilityPerformanceRule {
  /** Performance metric */
  metric: 'screen-reader-performance' | 'keyboard-navigation-speed' | 'color-processing'
  /** Target performance */
  target: number
  /** Maximum acceptable value */
  threshold: number
  /** Measurement method */
  measurementMethod: string
}