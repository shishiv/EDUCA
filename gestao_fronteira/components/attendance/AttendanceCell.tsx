/**
 * AttendanceCell Component
 * Touch-optimized cell for marking attendance with 3 states
 *
 * States:
 * - P (Presente): Green background, student was present
 * - F (Falta): Red background, student was absent
 * - A (Atestado): Yellow background, justified absence (medical/legal)
 *
 * @see openspec/changes/2025-12-04-diario-de-classe/spec.md
 */

'use client'

import React from 'react'
import { cn } from '@/lib/utils'
import { Check, X, FileText, Lock } from 'lucide-react'

// ============================================================================
// Types
// ============================================================================

export type AttendanceStatus = 'P' | 'F' | 'A' | null

export interface AttendanceCellProps {
  status: AttendanceStatus
  onChange: (status: AttendanceStatus) => void
  disabled?: boolean
  locked?: boolean
  studentName?: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

// ============================================================================
// Constants
// ============================================================================

const STATUS_LABELS: Record<NonNullable<AttendanceStatus>, string> = {
  P: 'Presente',
  F: 'Falta',
  A: 'Atestado',
}

const STATUS_CYCLE: Array<AttendanceStatus> = ['P', 'F', 'A', null]

// ============================================================================
// Component
// ============================================================================

export function AttendanceCell({
  status,
  onChange,
  disabled = false,
  locked = false,
  studentName,
  size = 'md',
  className,
}: AttendanceCellProps) {
  const handleClick = () => {
    if (disabled || locked) return

    // Cycle through statuses: null -> P -> F -> A -> null
    const currentIndex = STATUS_CYCLE.indexOf(status)
    const nextIndex = (currentIndex + 1) % STATUS_CYCLE.length
    onChange(STATUS_CYCLE[nextIndex])
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled || locked) return

    // Allow keyboard navigation
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handleClick()
    } else if (e.key === 'p' || e.key === 'P') {
      e.preventDefault()
      onChange('P')
    } else if (e.key === 'f' || e.key === 'F') {
      e.preventDefault()
      onChange('F')
    } else if (e.key === 'a' || e.key === 'A') {
      e.preventDefault()
      onChange('A')
    } else if (e.key === 'Escape' || e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault()
      onChange(null)
    }
  }

  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-11 h-11 text-sm min-w-[44px] min-h-[44px]', // WCAG 44px touch target
    lg: 'w-14 h-14 text-base',
  }

  const statusClasses: Record<string, string> = {
    P: 'bg-green-100 text-green-800 border-green-300 hover:bg-green-200',
    F: 'bg-red-100 text-red-800 border-red-300 hover:bg-red-200',
    A: 'bg-yellow-100 text-yellow-800 border-yellow-300 hover:bg-yellow-200',
    null: 'bg-gray-50 text-gray-400 border-gray-200 hover:bg-gray-100',
  }

  const getIcon = () => {
    if (locked) return <Lock className="w-4 h-4 opacity-50" />

    switch (status) {
      case 'P':
        return <Check className="w-4 h-4" />
      case 'F':
        return <X className="w-4 h-4" />
      case 'A':
        return <FileText className="w-4 h-4" />
      default:
        return null
    }
  }

  const ariaLabel = locked
    ? `Frequência bloqueada${studentName ? ` para ${studentName}` : ''}: ${status ? STATUS_LABELS[status] : 'Não marcado'}`
    : `Marcar frequência${studentName ? ` para ${studentName}` : ''}: ${status ? STATUS_LABELS[status] : 'Não marcado'}. Clique para alterar.`

  return (
    <button
      type="button"
      role="button"
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      disabled={disabled || locked}
      aria-label={ariaLabel}
      aria-pressed={status !== null}
      title={locked ? 'Sessão bloqueada após 18:00' : status ? STATUS_LABELS[status] : 'Clique para marcar'}
      className={cn(
        'flex items-center justify-center',
        'border-2 rounded-lg font-semibold',
        'transition-all duration-150 ease-in-out',
        'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
        'select-none touch-manipulation',
        sizeClasses[size],
        statusClasses[status ?? 'null'],
        (disabled || locked) && 'opacity-50 cursor-not-allowed',
        !disabled && !locked && 'cursor-pointer active:scale-95',
        className
      )}
    >
      {getIcon()}
      {!getIcon() && size !== 'sm' && (
        <span className="opacity-50">—</span>
      )}
    </button>
  )
}

// ============================================================================
// Compact Row Component (for mobile list view)
// ============================================================================

export interface AttendanceCellRowProps {
  studentName: string
  studentNumber?: number
  status: AttendanceStatus
  onChange: (status: AttendanceStatus) => void
  disabled?: boolean
  locked?: boolean
  className?: string
}

export function AttendanceCellRow({
  studentName,
  studentNumber,
  status,
  onChange,
  disabled = false,
  locked = false,
  className,
}: AttendanceCellRowProps) {
  return (
    <div
      className={cn(
        'flex items-center justify-between p-3 rounded-lg',
        'bg-white border border-gray-100',
        'transition-colors duration-150',
        className
      )}
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {studentNumber !== undefined && (
          <span className="text-sm text-gray-400 font-mono w-6 flex-shrink-0">
            {studentNumber}
          </span>
        )}
        <span className="text-sm font-medium text-gray-900 truncate">
          {studentName}
        </span>
      </div>

      <div className="flex items-center gap-2">
        {['P', 'F', 'A'].map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => !disabled && !locked && onChange(status === s ? null : (s as AttendanceStatus))}
            disabled={disabled || locked}
            aria-label={`Marcar ${STATUS_LABELS[s as keyof typeof STATUS_LABELS]} para ${studentName}`}
            aria-pressed={status === s}
            className={cn(
              'w-10 h-10 min-w-[40px] min-h-[40px]',
              'flex items-center justify-center',
              'border-2 rounded-lg font-semibold text-sm',
              'transition-all duration-150 ease-in-out',
              'focus:outline-none focus:ring-2 focus:ring-blue-500',
              'select-none touch-manipulation',
              status === s
                ? s === 'P'
                  ? 'bg-green-500 text-white border-green-600'
                  : s === 'F'
                  ? 'bg-red-500 text-white border-red-600'
                  : 'bg-yellow-500 text-white border-yellow-600'
                : 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200',
              (disabled || locked) && 'opacity-50 cursor-not-allowed',
              !disabled && !locked && 'cursor-pointer active:scale-95'
            )}
          >
            {s}
          </button>
        ))}
        {locked && (
          <Lock className="w-4 h-4 text-gray-400 ml-1" />
        )}
      </div>
    </div>
  )
}

export default AttendanceCell
