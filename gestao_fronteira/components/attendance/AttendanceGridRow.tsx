/**
 * AttendanceGridRow Component
 * Extracted from AttendanceGrid.tsx (Phase 15-07)
 *
 * Renders a single student row in the attendance grid including:
 * - Selection checkbox (when editable)
 * - Lock icon (when locked)
 * - Student avatar with initials fallback
 * - Student name and age
 * - Attendance marking time
 * - Status indicator dot
 * - AttendanceCell for marking (when editable)
 * - Readonly badge (when locked)
 *
 * @see AttendanceGrid.tsx for main component
 */

'use client'

import React from 'react'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Lock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { AttendanceCell, type AttendanceStatus } from './AttendanceCell'
import type { Student, AttendanceRecord } from './AttendanceGridTypes'

// ============================================================================
// Types
// ============================================================================

export interface AttendanceGridRowProps {
  /** Student data */
  student: Student
  /** Current attendance record for this student */
  record: AttendanceRecord | undefined
  /** Current attendance status */
  attendanceStatus: AttendanceStatus
  /** Whether this student is selected */
  isSelected: boolean
  /** Whether the row is effectively readonly (locked or readonly mode) */
  isEffectivelyReadonly: boolean
  /** Whether this specific record is locked */
  isRecordLocked: boolean
  /** Whether to show student photos */
  showPhotos: boolean
  /** Whether currently saving */
  saving: boolean
  /** Callback when selection changes */
  onSelectionChange: (studentId: string, selected: boolean) => void
  /** Callback when attendance status changes */
  onStatusChange: (studentId: string, status: AttendanceStatus) => void
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get student initials from full name
 */
function getStudentInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map(n => n[0])
    .join('')
    .toUpperCase()
}

/**
 * Calculate age from birth date
 */
function calculateAge(birthDate: string): number {
  const today = new Date()
  const birth = new Date(birthDate)
  let age = today.getFullYear() - birth.getFullYear()
  const monthDiff = today.getMonth() - birth.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--
  }
  return age
}

/**
 * Get row styling based on attendance status
 * Colors from spec: green (#dcfce7), red (#fee2e2), yellow (#fef3c7)
 */
function getRowClassName(status: AttendanceStatus, isSelected: boolean, isLocked: boolean): string {
  return cn(
    'flex items-center justify-between p-3 rounded-lg border-2 transition-all',
    // Status-based colors
    status === 'presente' && 'border-green-200 bg-green-50',
    status === 'falta' && 'border-red-200 bg-red-50',
    status === 'attestado' && 'border-yellow-200 bg-yellow-50',
    status === 'empty' && 'border-gray-200 bg-gray-50',
    // Selection ring
    isSelected && 'ring-2 ring-primary',
    // Locked opacity
    isLocked && 'opacity-70'
  )
}

// ============================================================================
// Component
// ============================================================================

export function AttendanceGridRow({
  student,
  record,
  attendanceStatus,
  isSelected,
  isEffectivelyReadonly,
  isRecordLocked,
  showPhotos,
  saving,
  onSelectionChange,
  onStatusChange,
}: AttendanceGridRowProps) {
  return (
    <div className={getRowClassName(attendanceStatus, isSelected, isRecordLocked)}>
      <div className="flex items-center space-x-3 flex-1">
        {/* Selection checkbox - Only show if not locked */}
        {!isEffectivelyReadonly && !isRecordLocked && (
          <Checkbox
            checked={isSelected}
            onCheckedChange={(checked) => {
              onSelectionChange(student.id, !!checked)
            }}
            className="h-5 w-5"
          />
        )}

        {/* Lock icon for locked records */}
        {isRecordLocked && (
          <Lock className="h-4 w-4 text-orange-500 flex-shrink-0" />
        )}

        {/* Student avatar */}
        {showPhotos && (
          <Avatar className="h-10 w-10">
            <AvatarImage src={student.foto_url} alt={student.nome_completo} />
            <AvatarFallback className="text-xs">
              {getStudentInitials(student.nome_completo)}
            </AvatarFallback>
          </Avatar>
        )}

        {/* Student info */}
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">
            {student.nome_completo}
          </p>
          <p className="text-xs text-muted-foreground">
            {calculateAge(student.data_nascimento)} anos
            {record?.horario_marcacao && (
              <span className="ml-2">
                - Marcado as {new Date(record.horario_marcacao).toLocaleTimeString('pt-BR', {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </span>
            )}
            {isRecordLocked && (
              <span className="ml-2 text-orange-600 font-medium">- Bloqueado</span>
            )}
          </p>
        </div>

        {/* Status indicator dot */}
        <div className="flex items-center">
          {attendanceStatus === 'presente' && (
            <div className="h-3 w-3 bg-green-600 rounded-full" />
          )}
          {attendanceStatus === 'falta' && (
            <div className="h-3 w-3 bg-red-600 rounded-full" />
          )}
          {attendanceStatus === 'attestado' && (
            <div className="h-3 w-3 bg-yellow-500 rounded-full" />
          )}
          {attendanceStatus === 'empty' && (
            <div className="h-3 w-3 bg-gray-400 rounded-full" />
          )}
        </div>
      </div>

      {/* AttendanceCell - 3-state button - Only if not locked */}
      {!isEffectivelyReadonly && !isRecordLocked && (
        <div className="ml-3">
          <AttendanceCell
            studentId={student.id}
            studentName={student.nome_completo}
            currentStatus={attendanceStatus}
            onStatusChange={(newStatus) => onStatusChange(student.id, newStatus)}
            disabled={saving}
          />
        </div>
      )}

      {/* Readonly badge (when locked or readonly) */}
      {(isEffectivelyReadonly || isRecordLocked) && (
        <div className="ml-3 flex items-center space-x-2">
          <Badge
            variant={
              attendanceStatus === 'presente' ? 'default' :
              attendanceStatus === 'falta' ? 'destructive' :
              attendanceStatus === 'attestado' ? 'default' : 'secondary'
            }
            className={cn(
              attendanceStatus === 'presente' && 'bg-green-600',
              attendanceStatus === 'attestado' && 'bg-yellow-500'
            )}
          >
            {attendanceStatus === 'presente' && 'Presente'}
            {attendanceStatus === 'falta' && 'Ausente'}
            {attendanceStatus === 'attestado' && 'Atestado'}
            {attendanceStatus === 'empty' && 'Nao marcado'}
          </Badge>
          {isRecordLocked && (
            <Lock className="h-4 w-4 text-orange-500" />
          )}
        </div>
      )}
    </div>
  )
}
