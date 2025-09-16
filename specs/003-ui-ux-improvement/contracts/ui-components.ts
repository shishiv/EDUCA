/**
 * UI Component Contracts for SRE Educational Management System
 * UI/UX Design System Enhancement - Phase 1
 *
 * TypeScript interface definitions for enhanced educational components
 */

import { ButtonProps, InputProps, LabelProps } from '@/components/ui'
import { Student, AttendanceRecord } from '@/types/database'

// =============================================================================
// Base Component Extensions
// =============================================================================

/**
 * Enhanced label component for Brazilian educational contexts
 * Extends shadcn/ui Label with educational-specific features
 */
export interface EducationalLabelProps extends LabelProps {
  /** Mark field as required with visual indicator */
  required?: boolean
  /** Apply educational context styling (blue accent) */
  educational?: boolean
  /** Tooltip text for additional field guidance */
  tooltip?: string
}

/**
 * Brazilian CPF input component with real-time validation
 * Handles 11-digit CPF numbers with check digit algorithm
 */
export interface CPFInputProps extends Omit<InputProps, 'onChange'> {
  /** Current CPF value (formatted: 000.000.000-00) */
  value?: string
  /** Callback for CPF value changes (receives formatted value) */
  onChange?: (value: string) => void
  /** Show real-time validation indicators */
  showValidation?: boolean
}

/**
 * Brazilian phone number input with regional formatting
 * Supports both mobile (11 digits) and landline (10 digits)
 */
export interface PhoneInputProps extends Omit<InputProps, 'onChange'> {
  /** Current phone value (formatted: (34) 99999-9999) */
  value?: string
  /** Callback for phone value changes (receives formatted value) */
  onChange?: (value: string) => void
  /** Phone type for validation (mobile: 11 digits, landline: 10) */
  region?: 'mobile' | 'landline'
}

/**
 * Touch-optimized attendance status button for mobile interfaces
 * Includes visual feedback and confirmation states
 */
export interface AttendanceStatusButtonProps extends ButtonProps {
  /** Current attendance status */
  status: AttendanceStatus
  /** Student identifier for tracking changes */
  studentId: string
  /** Callback for status changes */
  onStatusChange: (studentId: string, status: AttendanceStatus) => void
  /** Enable mobile touch optimizations (56px minimum target) */
  touchOptimized?: boolean
  /** Show confirmation animation on press */
  showConfirmation?: boolean
}

// =============================================================================
// Composite Educational Components
// =============================================================================

/**
 * Enhanced student registration form with progressive disclosure
 * Multi-section form with Brazilian compliance validation
 */
export interface EnhancedStudentFormProps {
  /** Initial form data for edit mode */
  initialData?: Partial<StudentFormData>
  /** Form submission handler */
  onSubmit: (data: StudentFormData) => Promise<void>
  /** Form operation mode */
  mode: 'create' | 'edit'
  /** Show step-by-step progress indicator */
  showProgressIndicator?: boolean
  /** Enable auto-save functionality */
  autoSave?: boolean
}

/**
 * Complete student form data structure
 * Includes personal, educational, and guardian information
 */
export interface StudentFormData {
  // Personal Information Section
  nome_completo: string
  cpf?: string  // Optional for students under 16
  data_nascimento: Date
  telefone?: string
  sexo: 'M' | 'F'
  necessidades_especiais?: string
  observacoes?: string

  // Educational Information Section
  nivel_educacional: EducationalLevel
  turma_id?: string
  numero_matricula?: string

  // Guardian Information Section
  responsavel_principal: ResponsavelData
  responsavel_secundario?: ResponsavelData
}

/**
 * Guardian/responsible person data structure
 */
export interface ResponsavelData {
  nome_completo: string
  cpf: string
  telefone: string
  email?: string
  parentesco: 'pai' | 'mae' | 'avo' | 'ava' | 'tutor' | 'outro'
  endereco?: EnderecoData
}

/**
 * Address data structure following Brazilian postal format
 */
export interface EnderecoData {
  cep: string
  logradouro: string
  numero: string
  complemento?: string
  bairro: string
  cidade: string
  estado: string
}

/**
 * Responsive attendance grid with orientation adaptation
 * Optimized for tablet use in portrait and landscape modes
 */
export interface ResponsiveAttendanceGridProps {
  /** List of students with current attendance data */
  students: StudentWithAttendance[]
  /** Class/turma identifier */
  turmaId: string
  /** Date for attendance marking */
  date: Date
  /** Callback for attendance status changes */
  onAttendanceChange: (studentId: string, status: AttendanceStatus) => void
  /** Display mode preference */
  viewMode: 'grid' | 'list'
  /** Current device orientation */
  orientation: 'portrait' | 'landscape'
  /** Enable real-time synchronization */
  realtimeSync?: boolean
  /** Show attendance summary statistics */
  showSummary?: boolean
}

/**
 * Student data with current attendance status
 */
export interface StudentWithAttendance extends Student {
  currentAttendance?: AttendanceRecord
  attendancePercentage?: number
  lastAttendanceUpdate?: Date
}

// =============================================================================
// Theme and Layout Configuration
// =============================================================================

/**
 * Responsive theme configuration for educational interfaces
 * Includes accessibility and performance optimizations
 */
export interface ResponsiveThemeConfig {
  /** Breakpoint definitions for responsive design */
  breakpoints: ResponsiveBreakpoints
  /** Color scheme for educational contexts */
  colors: EducationalColorScheme
  /** Spacing scale for educational forms and layouts */
  spacing: EducationalSpacingScale
  /** Typography scale for educational content */
  typography: EducationalTypographyScale
  /** Accessibility enhancement settings */
  accessibility: AccessibilityConfig
}

/**
 * Responsive breakpoint definitions optimized for Brazilian educational devices
 */
export interface ResponsiveBreakpoints {
  /** Mobile phones (320px - 479px) */
  mobile: string
  /** Small tablets and large phones (480px - 767px) */
  'mobile-lg': string
  /** Tablets portrait (768px - 1023px) */
  tablet: string
  /** Tablets landscape (1024px - 1365px) */
  'tablet-lg': string
  /** Desktop and large tablets (1366px+) */
  desktop: string
}

/**
 * Educational color schemes with WCAG compliance
 */
export interface EducationalColorScheme {
  /** Attendance status colors */
  attendance: AttendanceColorScheme
  /** Academic performance indicators */
  performance: PerformanceColorScheme
  /** Educational level identification */
  educational_level: EducationalLevelColorScheme
}

/**
 * Attendance status color mapping with accessibility compliance
 */
export interface AttendanceColorScheme {
  present: string      // Green - 4.5:1 contrast ratio minimum
  absent: string       // Red - 4.5:1 contrast ratio minimum
  late: string         // Yellow - 4.5:1 contrast ratio minimum
  justified: string    // Blue - 4.5:1 contrast ratio minimum
}

/**
 * Academic performance color indicators
 */
export interface PerformanceColorScheme {
  excellent: string       // 90-100%
  good: string           // 80-89%
  satisfactory: string   // 70-79%
  needs_improvement: string // Below 70%
}

/**
 * Brazilian educational level color coding
 */
export interface EducationalLevelColorScheme {
  creche: string         // Daycare (0-3 years)
  pre_escola: string     // Pre-school (4-5 years)
  fundamental: string    // Elementary (6-14 years)
}

/**
 * Educational spacing scale for forms and layouts
 */
export interface EducationalSpacingScale {
  'form-section': string   // 2rem - Between major form sections
  'field-group': string    // 1.5rem - Between related field groups
  'form-field': string     // 1rem - Between individual form fields
}

/**
 * Typography scale for educational content
 */
export interface EducationalTypographyScale {
  'attendance-mark': string  // 1.125rem - Clear visibility for attendance
  'student-card': string     // 0.75rem - Compact student information
  'official-doc': string     // 0.875rem - Official document compliance
}

/**
 * Accessibility configuration settings
 */
export interface AccessibilityConfig {
  /** Enable high contrast mode */
  highContrast: boolean
  /** Respect reduced motion preferences */
  reducedMotion: boolean
  /** Optimize for screen readers */
  screenReaderOptimized: boolean
  /** Font size multiplier for vision accessibility */
  fontSizeMultiplier: number
}

// =============================================================================
// User Interface and Role Management
// =============================================================================

/**
 * Role-based interface configuration
 * Customizes UI based on user role and permissions
 */
export interface RoleBasedInterface {
  /** User role identifier */
  role: UserRole
  /** Available permissions for the role */
  permissions: UserPermission[]
  /** Dashboard layout configuration */
  dashboardLayout: DashboardLayoutConfig
  /** Navigation items visible to the role */
  navigationItems: NavigationItemConfig[]
  /** Default view configurations */
  defaultViews: ViewConfiguration[]
}

/**
 * Dashboard layout configuration with responsive adaptations
 */
export interface DashboardLayoutConfig {
  /** Layout type preference */
  layout: 'grid' | 'list' | 'cards'
  /** Widget arrangement */
  widgets: DashboardWidget[]
  /** Responsive behavior settings */
  responsive: ResponsiveDashboardConfig
}

/**
 * Responsive dashboard configuration
 */
export interface ResponsiveDashboardConfig {
  mobile: DashboardLayout
  tablet: DashboardLayout
  desktop: DashboardLayout
}

/**
 * Individual dashboard layout definition
 */
export interface DashboardLayout {
  columns: number
  widgetSize: 'small' | 'medium' | 'large'
  showSidebar: boolean
}

/**
 * Dashboard widget configuration
 */
export interface DashboardWidget {
  id: string
  type: 'attendance-summary' | 'student-count' | 'recent-activity' | 'performance-metrics'
  position: { x: number; y: number }
  size: { width: number; height: number }
  config: Record<string, any>
}

/**
 * Navigation item configuration
 */
export interface NavigationItemConfig {
  label: string
  href: string
  icon: string
  permissions: UserPermission[]
  badge?: NavigationBadge
}

/**
 * Navigation badge for notifications or counts
 */
export interface NavigationBadge {
  content: string | number
  variant: 'default' | 'destructive' | 'outline'
}

/**
 * View configuration for different screen sizes
 */
export interface ViewConfiguration {
  component: string
  props: Record<string, any>
  responsive: ResponsiveViewConfig
}

/**
 * Responsive view configuration
 */
export interface ResponsiveViewConfig {
  mobile: ComponentLayout
  tablet: ComponentLayout
  desktop: ComponentLayout
}

/**
 * Component layout definition
 */
export interface ComponentLayout {
  columns: number
  spacing: string
  showLabels: boolean
  compactMode: boolean
}

// =============================================================================
// Type Definitions and Enums
// =============================================================================

/**
 * Attendance status enumeration
 */
export type AttendanceStatus = 'present' | 'absent' | 'late' | 'justified'

/**
 * Educational level enumeration following Brazilian system
 */
export type EducationalLevel = 'creche' | 'pre_escola' | 'fundamental'

/**
 * User role enumeration for educational system
 */
export type UserRole = 'admin' | 'diretor' | 'secretario' | 'professor' | 'responsavel'

/**
 * User permission enumeration
 */
export type UserPermission =
  | 'view_students'
  | 'edit_students'
  | 'mark_attendance'
  | 'view_reports'
  | 'manage_users'
  | 'system_admin'

/**
 * Form validation state
 */
export type ValidationState = 'idle' | 'validating' | 'valid' | 'invalid' | 'error'

/**
 * Component size variants
 */
export type ComponentSize = 'sm' | 'md' | 'lg' | 'xl'

/**
 * Touch interaction states
 */
export type TouchState = 'idle' | 'pressed' | 'confirmed' | 'synced'

/**
 * Orientation detection
 */
export type DeviceOrientation = 'portrait' | 'landscape'

/**
 * Connection status for real-time features
 */
export type ConnectionStatus = 'online' | 'offline' | 'syncing' | 'error'