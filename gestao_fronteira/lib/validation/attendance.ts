/**
 * Attendance validation utilities for Brazilian educational management
 * Handles attendance marking rules, time validation, and compliance checks
 */

import { z } from 'zod'

export type AttendanceStatus = 'presente' | 'falta' | 'atraso' | 'justificada'

/**
 * Validates attendance marking time
 * Attendance can only be marked during school hours
 */
export function validateAttendanceTime(markingTime: Date = new Date()): boolean {
  const hour = markingTime.getHours()
  const minute = markingTime.getMinutes()

  // School hours: 7:00 AM to 6:00 PM
  const startHour = 7
  const endHour = 18

  return hour >= startHour && hour < endHour
}

/**
 * Validates if attendance can be marked for a specific date
 * Cannot mark attendance for future dates or weekends
 */
export function validateAttendanceDate(attendanceDate: Date): boolean {
  const today = new Date()
  const dayOfWeek = attendanceDate.getDay()

  // Cannot mark attendance for future dates
  if (attendanceDate > today) return false

  // Cannot mark attendance for weekends (0 = Sunday, 6 = Saturday)
  if (dayOfWeek === 0 || dayOfWeek === 6) return false

  // Cannot mark attendance for dates more than 30 days old (compliance)
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(today.getDate() - 30)

  return attendanceDate >= thirtyDaysAgo
}

/**
 * Validates attendance status change
 * Once saved, attendance becomes immutable (Brazilian compliance)
 */
export function validateAttendanceChange(
  currentStatus: AttendanceStatus | null,
  newStatus: AttendanceStatus,
  isSaved: boolean = false
): { valid: boolean; reason?: string } {
  // If already saved, no changes allowed
  if (isSaved && currentStatus !== null) {
    return {
      valid: false,
      reason: 'Frequência salva não pode ser alterada (compliance brasileira)'
    }
  }

  // If not saved yet, any change is allowed
  if (!isSaved) {
    return { valid: true }
  }

  return { valid: true }
}

/**
 * Calculates late arrival threshold
 * Students arriving after 15 minutes are marked as late
 */
export function isLateArrival(arrivalTime: Date, classStartTime: Date): boolean {
  const timeDiffMs = arrivalTime.getTime() - classStartTime.getTime()
  const timeDiffMinutes = timeDiffMs / (1000 * 60)

  return timeDiffMinutes > 15
}

/**
 * Validates class session state for attendance marking
 * Class must be "opened" before marking attendance
 */
export function validateClassSession(
  isSessionOpen: boolean,
  sessionDate: Date
): { valid: boolean; reason?: string } {
  if (!isSessionOpen) {
    return {
      valid: false,
      reason: 'Aula deve ser aberta antes de marcar frequência'
    }
  }

  if (!validateAttendanceDate(sessionDate)) {
    return {
      valid: false,
      reason: 'Data da aula inválida para marcação de frequência'
    }
  }

  return { valid: true }
}

/**
 * Calculates attendance statistics for a student
 */
export function calculateAttendanceStats(attendanceRecords: Array<{
  status: AttendanceStatus
  data: Date
}>) {
  const total = attendanceRecords.length
  const present = attendanceRecords.filter(r => r.status === 'presente').length
  const absent = attendanceRecords.filter(r => r.status === 'falta').length
  const late = attendanceRecords.filter(r => r.status === 'atraso').length
  const justified = attendanceRecords.filter(r => r.status === 'justificada').length

  const attendanceRate = total > 0 ? Math.round((present / total) * 100) : 0
  const effectiveAttendanceRate = total > 0 ? Math.round(((present + justified) / total) * 100) : 0

  return {
    total,
    present,
    absent,
    late,
    justified,
    attendanceRate,
    effectiveAttendanceRate,
    isAtRisk: effectiveAttendanceRate < 80,
    isCritical: effectiveAttendanceRate < 75
  }
}

// Zod schemas for attendance validation

export const attendanceStatusSchema = z.enum(['presente', 'falta', 'atraso', 'justificada'], {
  message: 'Status de frequência inválido'
})

export const attendanceMarkingSchema = z.object({
  aluno_id: z.string().uuid({ message: 'ID do aluno inválido' }),
  status: attendanceStatusSchema,
  data: z.coerce.date(),
  hora_chegada: z.coerce.date().optional(),
  observacoes: z.string().max(500, { message: 'Observações não podem exceder 500 caracteres' }).optional(),
  justificativa: z.string().max(500, { message: 'Justificativa não pode exceder 500 caracteres' }).optional()
})

export const classSessionSchema = z.object({
  turma_id: z.string().uuid({ message: 'ID da turma inválido' }),
  data: z.coerce.date(),
  hora_inicio: z.coerce.date(),
  hora_fim: z.coerce.date().optional(),
  conteudo: z.string().min(1, { message: 'Conteúdo da aula é obrigatório' }),
  professor_id: z.string().uuid({ message: 'ID do professor inválido' }),
  observacoes: z.string().max(1000, { message: 'Observações não podem exceder 1000 caracteres' }).optional()
})

export const attendanceBulkUpdateSchema = z.array(z.object({
  aluno_id: z.string().uuid(),
  status: attendanceStatusSchema,
  observacoes: z.string().optional()
}))

export type AttendanceMarkingData = z.infer<typeof attendanceMarkingSchema>
export type ClassSessionData = z.infer<typeof classSessionSchema>
export type AttendanceBulkUpdateData = z.infer<typeof attendanceBulkUpdateSchema>