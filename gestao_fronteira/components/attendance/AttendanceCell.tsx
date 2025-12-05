/**
 * AttendanceCell Component - 3-State Attendance Button
 *
 * Implements state cycling: empty -> Presente (P) -> Falta (F) -> Attestado (A) -> empty
 * Touch-optimized with 44px minimum touch targets
 *
 * State Colors (from mockups):
 * - Presente (P): Green (#dcfce7 / green-50)
 * - Falta (F): Red (#fee2e2 / red-50)
 * - Attestado (A): Yellow (#fef3c7 / yellow-50)
 * - Empty: Gray (pending)
 */

'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { UserCheck, UserX, FileText } from 'lucide-react'

export type AttendanceStatus = 'empty' | 'presente' | 'falta' | 'attestado'

interface AttendanceCellProps {
  studentId: string
  studentName: string
  currentStatus: AttendanceStatus
  onStatusChange: (newStatus: AttendanceStatus) => void
  disabled?: boolean
  className?: string
}

/**
 * Get next status in the cycle
 * empty -> presente -> falta -> attestado -> empty
 */
function getNextStatus(current: AttendanceStatus): AttendanceStatus {
  const cycle: AttendanceStatus[] = ['empty', 'presente', 'falta', 'attestado']
  const currentIndex = cycle.indexOf(current)
  const nextIndex = (currentIndex + 1) % cycle.length
  return cycle[nextIndex]
}

/**
 * Get button variant and styling based on status
 */
function getButtonStyle(status: AttendanceStatus) {
  switch (status) {
    case 'presente':
      return {
        variant: 'default' as const,
        className: 'bg-green-600 hover:bg-green-700 text-white',
        icon: <UserCheck className="h-4 w-4" />,
        label: 'P',
        ariaLabel: 'Presente'
      }
    case 'falta':
      return {
        variant: 'destructive' as const,
        className: 'bg-red-600 hover:bg-red-700 text-white',
        icon: <UserX className="h-4 w-4" />,
        label: 'F',
        ariaLabel: 'Falta'
      }
    case 'attestado':
      return {
        variant: 'default' as const,
        className: 'bg-yellow-500 hover:bg-yellow-600 text-white',
        icon: <FileText className="h-4 w-4" />,
        label: 'A',
        ariaLabel: 'Attestado'
      }
    case 'empty':
    default:
      return {
        variant: 'outline' as const,
        className: 'border-gray-300 hover:border-gray-400 text-gray-600',
        icon: null,
        label: '—',
        ariaLabel: 'Não marcado'
      }
  }
}

export function AttendanceCell({
  studentId,
  studentName,
  currentStatus,
  onStatusChange,
  disabled = false,
  className = ''
}: AttendanceCellProps) {
  const handleClick = () => {
    if (disabled) return
    const nextStatus = getNextStatus(currentStatus)
    onStatusChange(nextStatus)
  }

  const style = getButtonStyle(currentStatus)

  return (
    <Button
      size="sm"
      variant={style.variant}
      onClick={handleClick}
      disabled={disabled}
      className={`
        min-h-[44px] min-w-[60px]
        transition-all duration-200 ease-in-out
        ${style.className}
        ${className}
      `}
      aria-label={`${studentName}: ${style.ariaLabel}`}
      data-status={currentStatus}
      data-student-id={studentId}
    >
      <span className="flex items-center space-x-1">
        {style.icon}
        <span className="font-semibold">{style.label}</span>
      </span>
    </Button>
  )
}
