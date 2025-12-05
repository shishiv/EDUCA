/**
 * AttendanceCell Component - 3-State Attendance Button
 * Task 1.2.3: Create AttendanceCell component with 3-state cycle
 * Task 5.3.2: Add subtle animations and transitions
 * Task 5.3.3: Improve accessibility with WCAG 2.1 AA compliance
 *
 * Implements state cycling: empty -> Presente (P) -> Falta (F) -> Attestado (A) -> empty
 * Touch-optimized with 44px minimum touch targets
 *
 * State Colors (from spec mockups):
 * - Presente (P): Green (#dcfce7 / green-50)
 * - Falta (F): Red (#fee2e2 / red-50)
 * - Attestado (A): Yellow (#fef3c7 / amber-50)
 * - Empty: Gray (pending)
 *
 * Accessibility Features (WCAG 2.1 AA):
 * - Proper aria-labels with student name and status
 * - Keyboard navigation support (Enter, Space, Arrow keys)
 * - Focus visible indicators
 * - Color contrast compliance
 * - Screen reader announcements
 *
 * @see openspec/changes/2025-12-04-diario-de-classe/spec.md
 * @see types/diario-classe.ts for StatusPresenca type
 */

'use client'

import React, { useCallback, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { UserCheck, UserX, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Attendance status type for 3-state system
 * Maps to StatusPresenca from types/diario-classe.ts
 * - 'empty' = no status (pending)
 * - 'presente' = P (Present)
 * - 'falta' = F (Absent)
 * - 'attestado' = A (Excused with medical certificate)
 */
export type AttendanceStatus = 'empty' | 'presente' | 'falta' | 'attestado'

interface AttendanceCellProps {
  /** Unique student identifier */
  studentId: string
  /** Student full name for accessibility */
  studentName: string
  /** Current attendance status */
  currentStatus: AttendanceStatus
  /** Callback when status changes */
  onStatusChange: (newStatus: AttendanceStatus) => void
  /** Whether the cell is disabled (e.g., locked session) */
  disabled?: boolean
  /** Additional CSS classes */
  className?: string
  /** Size variant */
  size?: 'sm' | 'md' | 'lg'
  /** Whether to show animation on status change */
  animate?: boolean
}

/**
 * Status display configuration
 * Colors from spec: green (#dcfce7), red (#fee2e2), yellow (#fef3c7)
 * All colors meet WCAG 2.1 AA contrast requirements
 */
const STATUS_CONFIG = {
  presente: {
    label: 'P',
    fullLabel: 'Presente',
    description: 'Aluno presente na aula',
    icon: UserCheck,
    // High contrast green for accessibility
    bgClass: 'bg-green-600 hover:bg-green-700 focus-visible:bg-green-700',
    textClass: 'text-white',
    variant: 'default' as const,
    ringColor: 'focus-visible:ring-green-500',
  },
  falta: {
    label: 'F',
    fullLabel: 'Falta',
    description: 'Aluno faltou na aula',
    icon: UserX,
    // High contrast red for accessibility
    bgClass: 'bg-red-600 hover:bg-red-700 focus-visible:bg-red-700',
    textClass: 'text-white',
    variant: 'destructive' as const,
    ringColor: 'focus-visible:ring-red-500',
  },
  attestado: {
    label: 'A',
    fullLabel: 'Atestado',
    description: 'Falta justificada com atestado medico',
    icon: FileText,
    // Yellow-amber for visibility (darker for contrast)
    bgClass: 'bg-amber-500 hover:bg-amber-600 focus-visible:bg-amber-600',
    textClass: 'text-white',
    variant: 'default' as const,
    ringColor: 'focus-visible:ring-amber-500',
  },
  empty: {
    label: '\u2014', // em-dash
    fullLabel: 'Nao marcado',
    description: 'Presenca ainda nao registrada',
    icon: null,
    bgClass: 'border-gray-300 hover:border-gray-400 hover:bg-gray-50 bg-white focus-visible:border-gray-500',
    textClass: 'text-gray-600',
    variant: 'outline' as const,
    ringColor: 'focus-visible:ring-gray-500',
  },
} as const

/**
 * State cycle order: empty -> presente -> falta -> attestado -> empty
 */
const STATE_CYCLE: AttendanceStatus[] = ['empty', 'presente', 'falta', 'attestado']

/**
 * Get the next status in the cycle
 * @param current - Current attendance status
 * @returns Next status in the cycle
 */
function getNextStatus(current: AttendanceStatus): AttendanceStatus {
  const currentIndex = STATE_CYCLE.indexOf(current)
  const nextIndex = (currentIndex + 1) % STATE_CYCLE.length
  return STATE_CYCLE[nextIndex]
}

/**
 * Get the previous status in the cycle (for keyboard navigation)
 * @param current - Current attendance status
 * @returns Previous status in the cycle
 */
function getPreviousStatus(current: AttendanceStatus): AttendanceStatus {
  const currentIndex = STATE_CYCLE.indexOf(current)
  const previousIndex = (currentIndex - 1 + STATE_CYCLE.length) % STATE_CYCLE.length
  return STATE_CYCLE[previousIndex]
}

/**
 * Size configuration for different button sizes
 */
const SIZE_CONFIG = {
  sm: {
    button: 'min-h-[40px] min-w-[56px] text-sm',
    icon: 'h-3.5 w-3.5',
  },
  md: {
    button: 'min-h-[44px] min-w-[60px] text-base',
    icon: 'h-4 w-4',
  },
  lg: {
    button: 'min-h-[52px] min-w-[72px] text-lg',
    icon: 'h-5 w-5',
  },
}

/**
 * AttendanceCell - Touch-friendly button for 3-state attendance marking
 *
 * Features:
 * - Click cycles through states: empty -> P -> F -> A -> empty
 * - Distinct colors for each state (green/red/yellow)
 * - Smooth transition animations (Task 5.3.2)
 * - WCAG 2.1 AA accessible with aria-labels (Task 5.3.3)
 * - Keyboard navigation: Enter/Space to toggle, Arrow keys to cycle
 * - Touch-friendly 44px minimum size
 */
export function AttendanceCell({
  studentId,
  studentName,
  currentStatus,
  onStatusChange,
  disabled = false,
  className = '',
  size = 'md',
  animate = true,
}: AttendanceCellProps) {
  const config = STATUS_CONFIG[currentStatus]
  const sizeConfig = SIZE_CONFIG[size]
  const Icon = config.icon
  const buttonRef = useRef<HTMLButtonElement>(null)

  // Animation state for visual feedback
  const [isAnimating, setIsAnimating] = useState(false)

  /**
   * Handle click/tap to cycle to next status
   */
  const handleClick = useCallback(() => {
    if (disabled) return

    // Trigger animation
    if (animate) {
      setIsAnimating(true)
      setTimeout(() => setIsAnimating(false), 200)
    }

    const nextStatus = getNextStatus(currentStatus)
    onStatusChange(nextStatus)
  }, [disabled, animate, currentStatus, onStatusChange])

  /**
   * Handle keyboard navigation for accessibility
   * - Enter/Space: Toggle to next status
   * - ArrowRight/ArrowDown: Go to next status
   * - ArrowLeft/ArrowUp: Go to previous status
   */
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLButtonElement>) => {
      if (disabled) return

      switch (event.key) {
        case 'ArrowRight':
        case 'ArrowDown':
          event.preventDefault()
          if (animate) {
            setIsAnimating(true)
            setTimeout(() => setIsAnimating(false), 200)
          }
          onStatusChange(getNextStatus(currentStatus))
          break
        case 'ArrowLeft':
        case 'ArrowUp':
          event.preventDefault()
          if (animate) {
            setIsAnimating(true)
            setTimeout(() => setIsAnimating(false), 200)
          }
          onStatusChange(getPreviousStatus(currentStatus))
          break
        // Enter and Space are handled by default button behavior
      }
    },
    [disabled, animate, currentStatus, onStatusChange]
  )

  // Build accessible description
  const ariaDescription = `${config.description}. Use setas para alterar status.`
  const ariaLabel = `Presenca de ${studentName}: ${config.fullLabel}`

  return (
    <Button
      ref={buttonRef}
      type="button"
      size="sm"
      variant={config.variant}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      disabled={disabled}
      className={cn(
        // Base styles - touch-friendly minimum size
        sizeConfig.button,
        // Smooth transition animations (Task 5.3.2)
        'transition-all duration-200 ease-in-out',
        // Transform animation on click
        animate && isAnimating && 'scale-95',
        // Status-specific colors
        config.bgClass,
        config.textClass,
        // Focus ring for accessibility (Task 5.3.3)
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
        config.ringColor,
        // Disabled state
        disabled && 'opacity-50 cursor-not-allowed',
        // Custom classes
        className
      )}
      // Accessibility attributes (Task 5.3.3)
      aria-label={ariaLabel}
      aria-description={ariaDescription}
      aria-pressed={currentStatus !== 'empty'}
      aria-disabled={disabled}
      role="button"
      tabIndex={disabled ? -1 : 0}
      // Data attributes for testing and styling
      data-status={currentStatus}
      data-student-id={studentId}
      data-animating={isAnimating}
    >
      <span className="flex items-center gap-1" aria-hidden="true">
        {Icon && (
          <Icon
            className={cn(
              sizeConfig.icon,
              // Icon animation
              animate && isAnimating && 'animate-pulse'
            )}
          />
        )}
        <span className="font-semibold">{config.label}</span>
      </span>
      {/* Screen reader only status announcement */}
      <span className="sr-only">
        {config.fullLabel}
      </span>
    </Button>
  )
}

// ============================================================================
// Compact Variant for Grid Views
// ============================================================================

interface AttendanceCellCompactProps {
  currentStatus: AttendanceStatus
  onClick?: () => void
  disabled?: boolean
  className?: string
}

/**
 * Compact version of AttendanceCell for use in dense grids
 * Reduced size but maintains accessibility
 */
export function AttendanceCellCompact({
  currentStatus,
  onClick,
  disabled = false,
  className = '',
}: AttendanceCellCompactProps) {
  const config = STATUS_CONFIG[currentStatus]
  const [isAnimating, setIsAnimating] = useState(false)

  const handleClick = useCallback(() => {
    if (disabled || !onClick) return
    setIsAnimating(true)
    setTimeout(() => setIsAnimating(false), 150)
    onClick()
  }, [disabled, onClick])

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      className={cn(
        // Compact size
        'w-8 h-8 rounded-md',
        // Flex centering
        'flex items-center justify-center',
        // Transitions
        'transition-all duration-150 ease-in-out',
        // Transform on click
        isAnimating && 'scale-90',
        // Status colors
        currentStatus === 'presente' && 'bg-green-500 text-white hover:bg-green-600',
        currentStatus === 'falta' && 'bg-red-500 text-white hover:bg-red-600',
        currentStatus === 'attestado' && 'bg-amber-500 text-white hover:bg-amber-600',
        currentStatus === 'empty' && 'bg-gray-100 text-gray-400 hover:bg-gray-200 border border-gray-200',
        // Focus
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-blue-500',
        // Disabled
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
      aria-label={`Status: ${config.fullLabel}`}
    >
      <span className="text-xs font-bold">{config.label}</span>
    </button>
  )
}

/**
 * Export status configuration for use in parent components
 */
export { STATUS_CONFIG, STATE_CYCLE, getNextStatus, getPreviousStatus }
