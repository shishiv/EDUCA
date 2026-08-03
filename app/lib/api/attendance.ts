'use client'

import { BaseApiService } from './base'
import { supabase, Tables, Inserts } from '@/lib/supabase'
import { AttendanceImmutabilityService } from '@/lib/services/attendance-immutability'
import { logger } from '@/lib/logger'
import { openSessionAction } from '@/app/actions/attendance/open-session'
import { markAttendanceBatchAction } from '@/app/actions/attendance/mark-attendance-batch'
import { closeSessionAction } from '@/app/actions/attendance/close-session'

// Browser-side adapter for the attendance immutability service: this module
// is 'use client', so it binds the browser client (authenticated via cookies
// in the user's browser). Server-side attendance paths use createAttendanceModule
// from '@/lib/services/attendance-module' with createClient() from '@/lib/supabase/server'.
const attendanceImmutability = new AttendanceImmutabilityService(supabase)

export interface AttendanceSession {
  id: string
  turma_id: string
  professor_id: string
  data_aula: string
  conteudo_programatico: string
  metodologia?: string
  recursos_utilizados?: string
  observacoes?: string
  duracao_minutos: number
  status: 'ABERTA' | 'FECHADA' | 'aberta' | 'fechada'
  inicio_aula: string
  fim_aula?: string
  created_at: string
  updated_at?: string
}

export interface AttendanceRecord {
  id: string
  sessao_id: string
  matricula_id: string
  data_aula: string
  status_presenca: 'P' | 'F' | 'J' | 'A' | 'NAO_MARCADO' | 'presente' | 'falta' | 'justificada' | 'atestado'
  observacoes?: string
  presente: boolean
  created_at: string
}

export interface AttendanceWithDetails extends AttendanceRecord {
  aluno?: {
    id: string
    nome_completo: string
    data_nascimento?: string
  }
  sessao?: AttendanceSession
  turma?: Tables<'turmas'>
}

/**
 * @deprecated Use openSessionAction. This helper does not authorize a write.
 * It remains only for the compile-time payload regression test.
 */
export function buildChamadaSessionInsert(params: {
  turmaId: string
  dateStr: string
  professorId: string
  escolaId: string
}): Inserts<'sessoes_aula'> {
  return {
    turma_id: params.turmaId,
    data_aula: params.dateStr,
    status: 'ABERTA',
    professor_id: params.professorId,
    escola_id: params.escolaId,
    conteudo_programatico: 'Chamada',
  }
}

export class AttendanceApiService extends BaseApiService {
  constructor() {
    super('sessoes_aula') // Using sessions table as primary
  }

  // Create a session through the canonical server action.
  async createSession(sessionData: Omit<AttendanceSession, 'id' | 'created_at' | 'updated_at'> & { escola_id?: string }): Promise<AttendanceSession> {
    const result = await openSessionAction({
      turma_id: sessionData.turma_id,
      data_aula: sessionData.data_aula,
      conteudo_programatico: sessionData.conteudo_programatico,
    })
    if (!result.success || !result.session) {
      throw new Error(result.error || 'Não foi possível abrir a chamada')
    }
    return result.session as unknown as AttendanceSession
  }

  // Close a session through the canonical server action.
  async closeSession(sessionId: string): Promise<AttendanceSession> {
    const result = await closeSessionAction({ session_id: sessionId })
    if (!result.success || !result.session) {
      throw new Error(result.error || 'Não foi possível fechar a chamada')
    }
    return result.session as unknown as AttendanceSession
  }

  // Get session by date and class
  async getSessionByDate(turmaId: string, date: string): Promise<AttendanceSession | null> {
    try {
      const { data, error } = await supabase
        .from('sessoes_aula')
        .select('*')
        .eq('turma_id', turmaId)
        .eq('data_aula', date)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (error && error.code !== 'PGRST116') throw error // PGRST116 = not found
      return data as AttendanceSession | null
    } catch (error) {
      throw error
    }
  }

  // Get sessions by class and period
  async getSessionsByClass(
    turmaId: string,
    startDate?: string,
    endDate?: string
  ): Promise<AttendanceSession[]> {
    try {
      let query = supabase
        .from('sessoes_aula')
        .select('*')
        .eq('turma_id', turmaId)
        .order('data_aula', { ascending: false })

      if (startDate) {
        query = query.gte('data_aula', startDate)
      }
      if (endDate) {
        query = query.lte('data_aula', endDate)
      }

      const { data, error } = await query

      if (error) throw error
      return data as AttendanceSession[]
    } catch (error) {
      throw error
    }
  }

  // Save attendance through the canonical server-side batch action.
  async saveAttendanceRecords(
    sessionId: string,
    turmaId: string,
    date: string,
    records: { student_id: string; status: 'presente' | 'falta' | 'justificada' | 'atestado'; observacoes?: string }[]
  ): Promise<AttendanceRecord[]> {
    try {
      const { data: matriculas, error: matriculaError } = await supabase
        .from('matriculas')
        .select('id, aluno_id')
        .eq('turma_id', turmaId)
        .eq('situacao', 'ativa')
        .in('aluno_id', records.map(record => record.student_id))

      if (matriculaError) throw matriculaError

      const matriculaByAluno = new Map((matriculas ?? []).map(matricula => [matricula.aluno_id, matricula.id]))
      const batchRecords = records.flatMap(record => {
        const matriculaId = matriculaByAluno.get(record.student_id)
        if (!matriculaId) return []
        const status = record.status === 'presente'
          ? 'P' as const
          : record.status === 'falta'
            ? 'F' as const
            : 'J' as const
        return [{
          matricula_id: matriculaId,
          status,
          justificativa: status === 'J' ? record.observacoes || 'Justificativa registrada' : null,
        }]
      })

      const result = await markAttendanceBatchAction({ sessao_id: sessionId, records: batchRecords })
      if (!result.success) throw new Error(result.error || 'Não foi possível salvar a frequência')
      return this.getAttendanceBySession(sessionId)
    } catch (error) {
      logger.error('ATTENDANCE_SAVE_ACTION_FAILED', error as Error, {
        metadata: { sessionId, turmaId, date, recordCount: records.length },
      })
      throw error
    }
  }

  // Get attendance records by session
  async getAttendanceBySession(sessionId: string): Promise<AttendanceWithDetails[]> {
    try {
      // First get frequencia records
      const { data: frequenciaData, error: frequenciaError } = await supabase
        .from('frequencia')
        .select(`
          *,
          sessao:sessoes_aula(
            id,
            data_aula,
            conteudo_programatico,
            status
          )
        `)
        .eq('sessao_id', sessionId)

      if (frequenciaError) throw frequenciaError

      if (!frequenciaData || frequenciaData.length === 0) {
        return []
      }

      // Get matricula IDs to fetch student info
      const matriculaIds = frequenciaData.map((f) => f.matricula_id)

      // Fetch student info through matriculas
      const { data: matriculasData, error: matriculasError } = await supabase
        .from('matriculas')
        .select(`
          id,
          aluno:alunos(
            id,
            nome_completo,
            data_nascimento
          ),
          turma:turmas(
            id,
            nome,
            serie
          )
        `)
        .in('id', matriculaIds)

      if (matriculasError) throw matriculasError

      // Create a map for quick lookup
      const matriculaMap = new Map(matriculasData?.map((m) => [m.id, m]) ?? [])

      // Combine data
      const result = frequenciaData.map((f) => {
        const matricula = matriculaMap.get(f.matricula_id)
        return {
          ...f,
          aluno: matricula?.aluno as { id: string; nome_completo: string; data_nascimento?: string } | undefined,
          turma: matricula?.turma as Tables<'turmas'> | undefined,
        }
      })

      // Sort by student name
      result.sort((a, b) => {
        const nameA = a.aluno?.nome_completo ?? ''
        const nameB = b.aluno?.nome_completo ?? ''
        return nameA.localeCompare(nameB)
      })

      return result as unknown as AttendanceWithDetails[]
    } catch (error) {
      throw error
    }
  }

  // Get attendance records by student and period
  async getAttendanceByStudent(
    studentId: string,
    startDate?: string,
    endDate?: string
  ): Promise<AttendanceWithDetails[]> {
    try {
      // First get matricula IDs for this student
      const { data: matriculas, error: matriculasError } = await supabase
        .from('matriculas')
        .select('id')
        .eq('aluno_id', studentId)

      if (matriculasError) throw matriculasError
      if (!matriculas || matriculas.length === 0) return []

      const matriculaIds = matriculas.map((m) => m.id)

      let query = supabase
        .from('frequencia')
        .select(`
          *,
          sessao:sessoes_aula(
            id,
            data_aula,
            conteudo_programatico,
            status
          )
        `)
        .in('matricula_id', matriculaIds)
        .order('data_aula', { ascending: false })

      if (startDate) {
        query = query.gte('data_aula', startDate)
      }
      if (endDate) {
        query = query.lte('data_aula', endDate)
      }

      const { data, error } = await query

      if (error) throw error
      return data as unknown as AttendanceWithDetails[]
    } catch (error) {
      throw error
    }
  }

  // Get attendance statistics for a class
  async getClassAttendanceStats(
    turmaId: string,
    startDate?: string,
    endDate?: string
  ): Promise<{
    totalSessions: number
    totalRecords: number
    byStatus: Record<string, number>
    attendanceRate: number
    studentsWithLowAttendance: Array<{
      student_id: string
      nome: string
      attendanceRate: number
      totalSessions: number
      presences: number
    }>
  }> {
    try {
      // Get sessions for the period
      const sessions = await this.getSessionsByClass(turmaId, startDate, endDate)

      // Get matriculas for this turma
      const { data: matriculas, error: matriculasError } = await supabase
        .from('matriculas')
        .select('id, aluno:alunos(id, nome_completo)')
        .eq('turma_id', turmaId)

      if (matriculasError) throw matriculasError
      if (!matriculas || matriculas.length === 0) {
        return {
          totalSessions: sessions.length,
          totalRecords: 0,
          byStatus: {},
          attendanceRate: 0,
          studentsWithLowAttendance: []
        }
      }

      const matriculaIds = matriculas.map((m) => m.id)
      const matriculaMap = new Map(matriculas.map((m) => [m.id, m.aluno as { id: string; nome_completo: string } | null]))

      // Get all attendance records for the period
      let query = supabase
        .from('frequencia')
        .select('*')
        .in('matricula_id', matriculaIds)

      if (startDate) {
        query = query.gte('data_aula', startDate)
      }
      if (endDate) {
        query = query.lte('data_aula', endDate)
      }

      const { data: attendanceData, error } = await query

      if (error) throw error

      const records = (attendanceData ?? []).filter(record => record.status_presenca !== 'NAO_MARCADO')

      // Calculate statistics
      const byStatus = records.reduce((acc, record) => {
        const status = record.status_presenca || (record.presente ? 'presente' : 'falta')
        acc[status] = (acc[status] || 0) + 1
        return acc
      }, {} as Record<string, number>)

      const totalRecords = records.length
      const totalPresences = records.filter(record =>
        record.presente || ['presente', 'P', 'justificada', 'J', 'atestado', 'A'].includes(record.status_presenca)
      ).length
      const attendanceRate = totalRecords > 0 ? Math.round((totalPresences / totalRecords) * 100) : 0

      // Calculate per-student statistics
      const studentStats = new Map<string, {
        nome: string
        totalSessions: number
        presences: number
      }>()

      records.forEach(record => {
        const aluno = matriculaMap.get(record.matricula_id)
        if (aluno) {
          const existing = studentStats.get(aluno.id) || {
            nome: aluno.nome_completo,
            totalSessions: 0,
            presences: 0
          }

          existing.totalSessions++
          if (record.presente || ['presente', 'P', 'justificada', 'J', 'atestado', 'A'].includes(record.status_presenca)) {
            existing.presences++
          }

          studentStats.set(aluno.id, existing)
        }
      })

      // Find students with attendance below 80%
      const studentsWithLowAttendance = Array.from(studentStats.entries())
        .map(([student_id, stats]) => ({
          student_id,
          nome: stats.nome,
          attendanceRate: stats.totalSessions > 0
            ? Math.round((stats.presences / stats.totalSessions) * 100)
            : 0,
          totalSessions: stats.totalSessions,
          presences: stats.presences
        }))
        .filter(student => student.attendanceRate < 80)
        .sort((a, b) => a.attendanceRate - b.attendanceRate)

      return {
        totalSessions: sessions.length,
        totalRecords,
        byStatus,
        attendanceRate,
        studentsWithLowAttendance
      }
    } catch (error) {
      throw error
    }
  }

  // Get attendance summary for a student
  async getStudentAttendanceSummary(
    studentId: string,
    startDate?: string,
    endDate?: string
  ): Promise<{
    totalSessions: number
    presences: number
    absences: number
    justifiedAbsences: number
    medicalCertificates: number
    attendanceRate: number
    status: 'adequate' | 'warning' | 'critical'
  }> {
    try {
      const records = (await this.getAttendanceByStudent(studentId, startDate, endDate))
        .filter(record => record.status_presenca !== 'NAO_MARCADO')

      const summary: {
        totalSessions: number
        presences: number
        absences: number
        justifiedAbsences: number
        medicalCertificates: number
        attendanceRate: number
        status: 'adequate' | 'warning' | 'critical'
      } = {
        totalSessions: records.length,
        presences: records.filter(r => r.presente || ['presente', 'P', 'justificada', 'J', 'atestado', 'A'].includes(r.status_presenca)).length,
        absences: records.filter(r => !r.presente && ['falta', 'F'].includes(r.status_presenca)).length,
        justifiedAbsences: records.filter(r => ['justificada', 'J'].includes(r.status_presenca)).length,
        medicalCertificates: records.filter(r => ['atestado', 'atestado_medico', 'A'].includes(r.status_presenca)).length,
        attendanceRate: 0,
        status: 'critical'
      }

      if (summary.totalSessions > 0) {
        summary.attendanceRate = Math.round((summary.presences / summary.totalSessions) * 100)
      }

      // Determine status based on Brazilian educational requirements
      if (summary.attendanceRate >= 80) {
        summary.status = 'adequate'
      } else if (summary.attendanceRate >= 75) {
        summary.status = 'warning'
      } else {
        summary.status = 'critical'
      }

      return summary
    } catch (error) {
      throw error
    }
  }

  // Get attendance records for multiple classes (for reports)
  async getAttendanceByDateRange(
    schoolId?: string,
    startDate?: string,
    endDate?: string,
    classIds?: string[]
  ): Promise<AttendanceWithDetails[]> {
    try {
      // Get matriculas for the classes if provided, or all
      let matriculaQuery = supabase
        .from('matriculas')
        .select(`
          id,
          turma_id,
          aluno:alunos(id, nome_completo, data_nascimento),
          turma:turmas(id, nome, serie, escola_id)
        `)

      if (classIds && classIds.length > 0) {
        matriculaQuery = matriculaQuery.in('turma_id', classIds)
      }

      const { data: matriculas, error: matriculasError } = await matriculaQuery

      if (matriculasError) throw matriculasError
      if (!matriculas || matriculas.length === 0) return []

      // Filter by school if needed
      let filteredMatriculas = matriculas
      if (schoolId) {
        filteredMatriculas = matriculas.filter((m) => {
          const turma = m.turma as { escola_id?: string } | null
          return turma?.escola_id === schoolId
        })
      }

      if (filteredMatriculas.length === 0) return []

      const matriculaIds = filteredMatriculas.map((m) => m.id)
      const matriculaMap = new Map(filteredMatriculas.map((m) => [m.id, m]))

      let query = supabase
        .from('frequencia')
        .select(`
          *,
          sessao:sessoes_aula(
            id,
            data_aula,
            conteudo_programatico
          )
        `)
        .in('matricula_id', matriculaIds)
        .order('data_aula', { ascending: false })

      if (startDate) {
        query = query.gte('data_aula', startDate)
      }
      if (endDate) {
        query = query.lte('data_aula', endDate)
      }

      const { data, error } = await query

      if (error) throw error

      // Combine data
      const result = (data ?? []).map((f) => {
        const matricula = matriculaMap.get(f.matricula_id)
        return {
          ...f,
          aluno: matricula?.aluno as { id: string; nome_completo: string; data_nascimento?: string } | undefined,
          turma: matricula?.turma as Tables<'turmas'> | undefined,
        }
      })

      return result as unknown as AttendanceWithDetails[]
    } catch (error) {
      throw error
    }
  }

  // Get legal compliance report for a session
  async getLegalComplianceReport(sessionId: string) {
    try {
      return await attendanceImmutability.generateLegalComplianceReport(sessionId)
    } catch (error) {
      logger.error('Error generating legal compliance report', error as Error, {
        feature: 'attendance',
        action: 'generate_compliance_report',
        metadata: { sessionId }
      })
      throw error
    }
  }

  // Get audit trail for a session
  async getSessionAuditTrail(sessionId: string) {
    try {
      return await attendanceImmutability.getSessionAuditTrail(sessionId)
    } catch (error) {
      logger.error('Error fetching session audit trail', error as Error, {
        feature: 'attendance',
        action: 'fetch_audit_trail',
        metadata: { sessionId }
      })
      throw error
    }
  }

  // Verify record integrity
  async verifyAttendanceIntegrity(recordId: string) {
    try {
      return await attendanceImmutability.verifyRecordIntegrity(recordId, 'attendance')
    } catch (error) {
      logger.error('Error verifying attendance integrity', error as Error, {
        feature: 'attendance',
        action: 'verify_integrity',
        metadata: { recordId }
      })
      throw error
    }
  }

  // Check if modification is allowed (for UI purposes)
  async canModifyAttendance(sessionId: string) {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const userId = user?.id || 'unknown'

      const permission = await attendanceImmutability.validateModificationPermission(
        sessionId,
        userId,
        'UPDATE'
      )

      return {
        allowed: permission.allowed,
        reason: permission.error?.message || null,
        legalReference: permission.error?.legalReference || null
      }
    } catch (error) {
      return {
        allowed: false,
        reason: 'Erro ao verificar permissões de modificação',
        legalReference: null
      }
    }
  }

  // ============================================================================
  // Frequency Calculation Methods
  // ============================================================================

  /**
   * Calculate attendance frequency for a specific enrollment (matricula)
   * Uses current month as default date range
   *
   * @param matriculaId - The enrollment ID to calculate frequency for
   * @param dateRange - Optional date range { start: 'YYYY-MM-DD', end: 'YYYY-MM-DD' }
   * @returns Attendance percentage (0-100), or 0 if no records
   */
  async calculateFrequency(
    matriculaId: string,
    dateRange?: { start: string; end: string }
  ): Promise<number> {
    try {
      const now = new Date()
      const firstDayOfMonth = dateRange?.start ||
        new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
      const today = dateRange?.end || now.toISOString().split('T')[0]

      const { data: records, error } = await supabase
        .from('frequencia')
        .select('status_presenca')
        .eq('matricula_id', matriculaId)
        .gte('data_aula', firstDayOfMonth)
        .lte('data_aula', today)

      if (error) {
        logger.error('Error calculating frequency', error, {
          feature: 'attendance',
          action: 'calculate_frequency',
          metadata: { matriculaId }
        })
        return 0
      }

      const markedRecords = (records ?? []).filter(record => record.status_presenca !== 'NAO_MARCADO')
      if (markedRecords.length === 0) {
        return 0
      }

      // Count present and justified absences as attended for frequency.
      const presentCount = markedRecords.filter(
        (r) =>
          r.status_presenca === 'presente' ||
          r.status_presenca === 'P' ||
          r.status_presenca === 'justificada' ||
          r.status_presenca === 'J' ||
          r.status_presenca === 'atestado' ||
          r.status_presenca === 'A'
      ).length

      const total = markedRecords.length
      return Math.round((presentCount / total) * 100)
    } catch (error) {
      logger.error('Error in calculateFrequency', error as Error, {
        feature: 'attendance',
        action: 'calculate_frequency',
        metadata: { matriculaId }
      })
      return 0
    }
  }

  /**
   * Calculate attendance frequencies for multiple enrollments in batch
   * More efficient than calling calculateFrequency individually
   *
   * @param matriculaIds - Array of enrollment IDs
   * @param dateRange - Optional date range
   * @returns Map of matriculaId -> frequency percentage
   */
  async calculateFrequenciesBatch(
    matriculaIds: string[],
    dateRange?: { start: string; end: string }
  ): Promise<Map<string, number>> {
    const result = new Map<string, number>()

    if (matriculaIds.length === 0) {
      return result
    }

    try {
      const now = new Date()
      const firstDayOfMonth = dateRange?.start ||
        new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
      const today = dateRange?.end || now.toISOString().split('T')[0]

      const { data: records, error } = await supabase
        .from('frequencia')
        .select('matricula_id, status_presenca')
        .in('matricula_id', matriculaIds)
        .gte('data_aula', firstDayOfMonth)
        .lte('data_aula', today)

      if (error) {
        logger.error('Error calculating frequencies batch', error, {
          feature: 'attendance',
          action: 'calculate_frequencies_batch',
          metadata: { count: matriculaIds.length }
        })
        // Return 0 for all
        matriculaIds.forEach((id) => result.set(id, 0))
        return result
      }

      // Group records by matricula_id
      const statsByMatricula = new Map<string, { total: number; present: number }>()

      records?.filter(record => record.status_presenca !== 'NAO_MARCADO').forEach((r) => {
        const stats = statsByMatricula.get(r.matricula_id) || { total: 0, present: 0 }
        stats.total++
        if (
          r.status_presenca === 'presente' ||
          r.status_presenca === 'P' ||
          r.status_presenca === 'justificada' ||
          r.status_presenca === 'J' ||
          r.status_presenca === 'atestado' ||
          r.status_presenca === 'A'
        ) {
          stats.present++
        }
        statsByMatricula.set(r.matricula_id, stats)
      })

      // Calculate percentages
      matriculaIds.forEach((id) => {
        const stats = statsByMatricula.get(id)
        if (stats && stats.total > 0) {
          result.set(id, Math.round((stats.present / stats.total) * 100))
        } else {
          result.set(id, 0)
        }
      })

      return result
    } catch (error) {
      logger.error('Error in calculateFrequenciesBatch', error as Error, {
        feature: 'attendance',
        action: 'calculate_frequencies_batch',
      })
      matriculaIds.forEach((id) => result.set(id, 0))
      return result
    }
  }

  // ============================================================================
  // Chamada Page Methods
  // ============================================================================

  /**
   * Get enrolled students for a class (chamada use case)
   * Returns active enrollments with their student name and calculated frequency.
   */
  async getStudentsForChamada(turmaId: string): Promise<{
    id: string
    nome: string
    matriculaId: string
    frequencia: number
  }[]> {
    try {
      const { data, error } = await supabase
        .from('matriculas')
        .select(`
          id,
          aluno:alunos(
            id,
            nome_completo
          )
        `)
        .eq('turma_id', turmaId)
        .eq('situacao', 'ativa')

      if (error) {
        logger.error('Error fetching students for chamada', error, {
          feature: 'attendance',
          action: 'get_students_for_chamada',
          metadata: { turmaId }
        })
        throw error
      }

      if (!data || data.length === 0) {
        return []
      }

      // Get all matricula IDs
      const matriculaIds = data.map((m) => m.id)

      // Calculate frequencies in batch for efficiency
      const frequencies = await this.calculateFrequenciesBatch(matriculaIds)

      return data
        .map((m) => ({
          id: m.aluno?.id || '',
          nome: m.aluno?.nome_completo || 'Aluno',
          matriculaId: m.id,
          frequencia: frequencies.get(m.id) ?? 0,
        }))
        .filter((s) => s.id)
        .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
    } catch (error) {
      logger.error('Error in getStudentsForChamada', error as Error, {
        feature: 'attendance',
        action: 'get_students_for_chamada',
        metadata: { turmaId }
      })
      throw error
    }
  }

  /**
   * Get session and attendance records for a specific date (chamada use case)
   */
  async getAttendanceForDate(turmaId: string, dateStr: string): Promise<{
    sessionId: string | null
    sessionStatus: string | null
    records: Map<string, { status: string | null; justificativa: string | null }>
  }> {
    try {
      // Check for existing session
      const { data: session, error: sessionError } = await supabase
        .from('sessoes_aula')
        .select('id, status')
        .eq('turma_id', turmaId)
        .eq('data_aula', dateStr)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (sessionError) {
        logger.error('Error fetching session for date', sessionError, {
          feature: 'attendance',
          action: 'get_attendance_for_date_session',
          metadata: { turmaId, dateStr }
        })
        throw sessionError
      }

      const records = new Map<string, { status: string | null; justificativa: string | null }>()

      if (session) {
        // Load existing attendance records
        const { data: frequencias, error: freqError } = await supabase
          .from('frequencia')
          .select('matricula_id, status_presenca, justificativa')
          .eq('sessao_id', session.id)

        if (freqError) {
          logger.error('Error fetching frequencia records', freqError, {
            feature: 'attendance',
            action: 'get_attendance_for_date_records',
            metadata: { sessionId: session.id }
          })
          throw freqError
        }

        frequencias?.forEach((f) => {
          // Map DB status to component status
          let status: string | null = null
          if (f.status_presenca === 'presente' || f.status_presenca === 'P') status = 'P'
          else if (f.status_presenca === 'falta' || f.status_presenca === 'F') status = 'F'
          else if (f.status_presenca === 'justificada' || f.status_presenca === 'J') status = 'J'

          records.set(f.matricula_id, {
            status,
            justificativa: f.justificativa || null,
          })
        })

        return {
          sessionId: session.id,
          sessionStatus: session.status,
          records
        }
      }

      return {
        sessionId: null,
        sessionStatus: null,
        records
      }
    } catch (error) {
      logger.error('Error in getAttendanceForDate', error as Error, {
        feature: 'attendance',
        action: 'get_attendance_for_date',
        metadata: { turmaId, dateStr }
      })
      throw error
    }
  }

  /**
   * Save a chamada through the canonical open and batch server actions.
   * The server derives identity and date from sessoes_aula.
   */
  async saveChamada(
    turmaId: string,
    dateStr: string,
    sessionId: string | null,
    attendanceRecords: Map<string, { status: string | null; justificativa: string | null }>
  ): Promise<string> {
    let currentSessionId = sessionId

    if (!currentSessionId) {
      const opened = await openSessionAction({
        turma_id: turmaId,
        data_aula: dateStr,
        conteudo_programatico: 'Chamada',
      })
      if (!opened.success || !opened.session) {
        throw new Error(opened.error || 'Não foi possível abrir a chamada')
      }
      currentSessionId = opened.session.id
    }

    const records = Array.from(attendanceRecords.entries()).map(([matriculaId, record]) => ({
      matricula_id: matriculaId,
      status: record.status === 'P'
        ? 'P' as const
        : record.status === 'F'
          ? 'F' as const
          : record.status === 'J'
            ? 'J' as const
            : null,
      justificativa: record.justificativa,
    }))

    const saved = await markAttendanceBatchAction({
      sessao_id: currentSessionId,
      records,
    })
    if (!saved.success) throw new Error(saved.error || 'Não foi possível salvar a chamada')

    return currentSessionId
  }
}

export const attendanceApi = new AttendanceApiService()