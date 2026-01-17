/**
 * ChamadaStatusButtons Component
 * P/F/J toggle buttons for attendance marking
 *
 * Toggle behavior: clicking the active button deselects (returns to null)
 * J button triggers modal via callback for mandatory justification
 *
 * @see .planning/phases/04-turmas-chamada/04-02-PLAN.md
 */

'use client'

import { cn } from '@/lib/utils'
import { Lock } from 'lucide-react'

// ============================================================================
// Types
// ============================================================================

export type AttendanceStatus = 'P' | 'F' | 'J' | null

export interface ChamadaStatusButtonsProps {
  status: AttendanceStatus
  onChange: (status: AttendanceStatus, justificativa?: string) => void
  onJustificationNeeded?: () => void
  disabled?: boolean
  size?: 'sm' | 'md'
}

// ============================================================================
// Constants
// ============================================================================

const STATUS_CONFIG = {
  P: {
    label: 'Presente',
    activeClass: 'bg-green-500 text-white border-green-600 hover:bg-green-600',
    inactiveClass: 'bg-white text-green-700 border-green-300 hover:bg-green-50',
  },
  F: {
    label: 'Falta',
    activeClass: 'bg-red-500 text-white border-red-600 hover:bg-red-600',
    inactiveClass: 'bg-white text-red-700 border-red-300 hover:bg-red-50',
  },
  J: {
    label: 'Justificada',
    activeClass: 'bg-amber-500 text-white border-amber-600 hover:bg-amber-600',
    inactiveClass: 'bg-white text-amber-700 border-amber-300 hover:bg-amber-50',
  },
}

const SIZE_CLASSES = {
  sm: 'min-w-[36px] min-h-[36px] w-9 h-9 text-xs',
  md: 'min-w-[44px] min-h-[44px] w-11 h-11 text-sm', // WCAG 44px touch target
}

// ============================================================================
// Component
// ============================================================================

export function ChamadaStatusButtons({
  status,
  onChange,
  onJustificationNeeded,
  disabled = false,
  size = 'md',
}: ChamadaStatusButtonsProps) {
  const handleClick = (buttonStatus: 'P' | 'F' | 'J') => {
    if (disabled) return

    // Toggle behavior: clicking active button deselects
    if (status === buttonStatus) {
      onChange(null)
      return
    }

    // J button needs justification modal
    if (buttonStatus === 'J') {
      if (onJustificationNeeded) {
        onJustificationNeeded()
      }
      return
    }

    // P and F can be set directly
    onChange(buttonStatus)
  }

  return (
    <div className="flex items-center gap-1">
      {(['P', 'F', 'J'] as const).map((buttonStatus) => {
        const config = STATUS_CONFIG[buttonStatus]
        const isActive = status === buttonStatus

        return (
          <button
            key={buttonStatus}
            type="button"
            onClick={() => handleClick(buttonStatus)}
            disabled={disabled}
            aria-label={config.label}
            aria-pressed={isActive}
            className={cn(
              'flex items-center justify-center',
              'border-2 rounded-lg font-semibold',
              'transition-all duration-150 ease-in-out',
              'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
              'select-none touch-manipulation',
              SIZE_CLASSES[size],
              isActive ? config.activeClass : config.inactiveClass,
              disabled && 'opacity-50 cursor-not-allowed',
              !disabled && 'cursor-pointer active:scale-95'
            )}
          >
            {buttonStatus}
          </button>
        )
      })}

      {disabled && (
        <Lock className="h-4 w-4 text-muted-foreground ml-1" />
      )}
    </div>
  )
}

export default ChamadaStatusButtons
