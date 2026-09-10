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

const STATUS_LABELS = {
  P: 'Presente',
  F: 'Falta',
  A: 'Atestado',
} satisfies Record<NonNullable<AttendanceStatus>, string>

const STATUS_CYCLE: readonly AttendanceStatus[] = ['P', 'F', 'A', null]

const STATUS_CLASSES = {
  P: 'bg-green-100 text-green-800 border-green-300 hover:bg-green-200',
  F: 'bg-red-100 text-red-800 border-red-300 hover:bg-red-200',
  A: 'bg-yellow-100 text-yellow-800 border-yellow-300 hover:bg-yellow-200',
  empty: 'bg-gray-50 text-gray-400 border-gray-200 hover:bg-gray-100',
} satisfies Record<NonNullable<AttendanceStatus> | 'empty', string>

const SIZE_CLASSES = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-11 h-11 text-sm min-w-[44px] min-h-[44px]',
  lg: 'w-14 h-14 text-base',
} satisfies Record<NonNullable<AttendanceCellProps['size']>, string>

const KEYBOARD_STATUS = new Map<string, NonNullable<AttendanceStatus>>([
  ['p', 'P'],
  ['f', 'F'],
  ['a', 'A'],
])

const ROW_STATUSES: readonly NonNullable<AttendanceStatus>[] = ['P', 'F', 'A']

function cellIcon(status: AttendanceStatus, locked: boolean) {
  if (locked) return <Lock className="w-4 h-4 opacity-50" />
  if (status === 'P') return <Check className="w-4 h-4" />
  if (status === 'F') return <X className="w-4 h-4" />
  if (status === 'A') return <FileText className="w-4 h-4" />
  return null
}

function cellAriaLabel(status: AttendanceStatus, locked: boolean, studentName?: string): string {
  const student = studentName ? ` para ${studentName}` : ''
  const statusLabel = status ? STATUS_LABELS[status] : 'Não marcado'
  return locked
    ? `Frequência bloqueada${student}: ${statusLabel}`
    : `Marcar frequência${student}: ${statusLabel}. Clique para alterar.`
}

function cellTitle(status: AttendanceStatus, locked: boolean): string {
  if (locked) return 'Sessão bloqueada para edição'
  return status ? STATUS_LABELS[status] : 'Clique para marcar'
}

function rowStatusClass(status: NonNullable<AttendanceStatus>, selected: boolean): string {
  if (!selected) return 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200'
  if (status === 'P') return 'bg-green-500 text-white border-green-600'
  if (status === 'F') return 'bg-red-500 text-white border-red-600'
  return 'bg-yellow-500 text-white border-yellow-600'
}

type AttendanceCellButtonProps = Omit<AttendanceCellProps, 'onChange'> & {
  icon: React.ReactNode
  onClick: () => void
  onKeyDown: (event: React.KeyboardEvent) => void
}

function AttendanceCellButtonContent({
  icon,
  size,
}: Pick<AttendanceCellButtonProps, 'icon' | 'size'>) {
  if (icon || size === 'sm') return icon
  return <span className="opacity-50">-</span>
}

function AttendanceCellButton({
  status,
  disabled = false,
  locked = false,
  studentName,
  size = 'md',
  className,
  icon,
  onClick,
  onKeyDown,
}: AttendanceCellButtonProps) {
  const disabledState = disabled || locked
  return (
    <button
      type="button"
      role="button"
      onClick={onClick}
      onKeyDown={onKeyDown}
      disabled={disabledState}
      aria-label={cellAriaLabel(status, locked, studentName)}
      aria-pressed={status !== null}
      title={cellTitle(status, locked)}
      className={cn(
        'flex items-center justify-center',
        'border-2 rounded-lg font-semibold',
        'transition-all duration-150 ease-in-out',
        'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
        'select-none touch-manipulation',
        SIZE_CLASSES[size],
        STATUS_CLASSES[status ?? 'empty'],
        disabledState && 'opacity-50 cursor-not-allowed',
        !disabledState && 'cursor-pointer active:scale-95',
        className
      )}
    >
      <AttendanceCellButtonContent icon={icon} size={size} />
    </button>
  )
}

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

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (disabled || locked) return

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      handleClick()
      return
    }
    const keyboardStatus = KEYBOARD_STATUS.get(event.key.toLowerCase())
    if (keyboardStatus) {
      event.preventDefault()
      onChange(keyboardStatus)
      return
    }
    if (['Escape', 'Delete', 'Backspace'].includes(event.key)) {
      event.preventDefault()
      onChange(null)
    }
  }

  const icon = cellIcon(status, locked)

  return (
    <AttendanceCellButton
      status={status}
      disabled={disabled}
      locked={locked}
      studentName={studentName}
      size={size}
      className={className}
      icon={icon}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
    />
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
        {ROW_STATUSES.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => !disabled && !locked && onChange(status === s ? null : s)}
            disabled={disabled || locked}
            aria-label={`Marcar ${STATUS_LABELS[s]} para ${studentName}`}
            aria-pressed={status === s}
            className={cn(
              'w-10 h-10 min-w-[40px] min-h-[40px]',
              'flex items-center justify-center',
              'border-2 rounded-lg font-semibold text-sm',
              'transition-all duration-150 ease-in-out',
              'focus:outline-none focus:ring-2 focus:ring-blue-500',
              'select-none touch-manipulation',
              rowStatusClass(s, status === s),
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
