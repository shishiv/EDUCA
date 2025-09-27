'use client'

import { BaseApiService } from './base'
import { supabase, Tables } from '@/lib/supabase'
import { attendanceImmutability } from '@/lib/services/attendance-immutability'

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
  status: 'aberta' | 'fechada'
  inicio_aula: string
  fim_aula?: string
  created_at: string
  updated_at?: string
}

export interface AttendanceRecord {
  id: string
  sessao_id: string
  aluno_id: string
  turma_id: string
  data: string
  status: 'presente' | 'falta' | 'justificada' | 'atestado'
  observacoes?: string
  created_at: string
}

export interface AttendanceWithDetails extends AttendanceRecord {
  aluno?: Tables<'alunos'>
  sessao?: AttendanceSession
  turma?: Tables<'turmas'>
}

export class AttendanceApiService extends BaseApiService {
  constructor() {
    super('sessoes_aula') // Using sessions table as primary
  }

  // Create new attendance session (Abrir aula)
  async createSession(sessionData: Omit<AttendanceSession, 'id' | 'created_at' | 'updated_at'>): Promise<AttendanceSession> {
    try {
      const { data, error } = await supabase
        .from('sessoes_aula')
        .insert({
          ...sessionData,
          created_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) throw error
      return data as AttendanceSession
    } catch (error) {
      // console.error('Error creating attendance session:', error)
      throw error
    }
  }

  // Close attendance session
  async closeSession(sessionId: string): Promise<AttendanceSession> {
    try {
      const { data, error } = await supabase
        .from('sessoes_aula')
        .update({
          status: 'fechada',
          fim_aula: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', sessionId)
        .select()
        .single()

      if (error) throw error
      return data as AttendanceSession
    } catch (error) {
      // console.error('Error closing attendance session:', error)
      throw error
    }
  }

  // Get session by date and class
  async getSessionByDate(turmaId: string, date: string): Promise<AttendanceSession | null> {
    try {
      const { data, error } = await supabase
        .from('sessoes_aula')
        .select('*')
        .eq('turma_id', turmaId)
        .eq('data_aula', date)
        .single()

      if (error && error.code !== 'PGRST116') throw error // PGRST116 = not found
      return data as AttendanceSession | null
    } catch (error) {
      // console.error('Error fetching session by date:', error)
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
      // console.error('Error fetching sessions by class:', error)
      throw error
    }
  }

  // Save attendance records for a session with enhanced immutability
  async saveAttendanceRecords(
    sessionId: string,
    turmaId: string,
    date: string,
    records: { student_id: string; status: 'presente' | 'falta' | 'justificada' | 'atestado'; observacoes?: string }[]
  ): Promise<AttendanceRecord[]> {
    try {
      // Get current user for audit trail (in a real app, this would come from auth context)
      const { data: { user } } = await supabase.auth.getUser()
      const userId = user?.id || 'unknown'

      // Use enhanced immutability service
      const result = await attendanceImmutability.createImmutableAttendanceRecords(
        sessionId,
        records,
        userId
      )

      if (!result.success) {
        // Transform immutability error into standard error format
        const error = result.error!
        throw new Error(`${error.code}: ${error.message}`)
      }

      return result.data!
    } catch (error) {
      // Enhanced error logging for legal compliance
      console.error('Attendance save error:', {
        sessionId,
        turmaId,
        date,
        recordCount: records.length,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString()
      })

      throw error
    }
  }

  // Get attendance records by session
  async getAttendanceBySession(sessionId: string): Promise<AttendanceWithDetails[]> {
    try {
      const { data, error } = await supabase
        .from('frequencia')
        .select(`
          *,
          aluno:alunos(
            id,
            nome_completo,
            foto_url,
            data_nascimento
          ),
          sessao:sessoes_aula(
            id,
            data_aula,
            conteudo_programatico,
            status
          ),
          turma:turmas(
            id,
            nome,
            serie
          )
        `)
        .eq('sessao_id', sessionId)
        .order('aluno.nome_completo', { ascending: true })

      if (error) throw error
      return data as AttendanceWithDetails[]
    } catch (error) {
      // console.error('Error fetching attendance by session:', error)
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
      let query = supabase
        .from('frequencia')
        .select(`
          *,
          sessao:sessoes_aula(
            id,
            data_aula,
            conteudo_programatico,
            status
          ),
          turma:turmas(
            id,
            nome,
            serie,
            escola:escolas(
              id,
              nome
            )
          )
        `)
        .eq('aluno_id', studentId)
        .order('data', { ascending: false })

      if (startDate) {
        query = query.gte('data', startDate)
      }
      if (endDate) {
        query = query.lte('data', endDate)
      }

      const { data, error } = await query

      if (error) throw error
      return data as AttendanceWithDetails[]
    } catch (error) {
      // console.error('Error fetching attendance by student:', error)
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

      // Get all attendance records for the period
      let query = supabase
        .from('frequencia')
        .select(`
          *,
          aluno:alunos(id, nome_completo)
        `)
        .eq('turma_id', turmaId)

      if (startDate) {
        query = query.gte('data', startDate)
      }
      if (endDate) {
        query = query.lte('data', endDate)
      }

      const { data: attendanceData, error } = await query

      if (error) throw error

      const records = attendanceData as AttendanceWithDetails[]

      // Calculate statistics
      const byStatus = records.reduce((acc, record) => {
        acc[record.status] = (acc[record.status] || 0) + 1
        return acc
      }, {} as Record<string, number>)

      const totalRecords = records.length
      const totalPresences = byStatus['presente'] || 0
      const attendanceRate = totalRecords > 0 ? Math.round((totalPresences / totalRecords) * 100) : 0

      // Calculate per-student statistics
      const studentStats = new Map<string, {
        nome: string
        totalSessions: number
        presences: number
      }>()

      records.forEach(record => {
        if (record.aluno) {
          const existing = studentStats.get(record.aluno.id) || {
            nome: record.aluno.nome_completo,
            totalSessions: 0,
            presences: 0
          }

          existing.totalSessions++
          if (record.status === 'presente') {
            existing.presences++
          }

          studentStats.set(record.aluno.id, existing)
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
      // console.error('Error calculating attendance stats:', error)
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
      const records = await this.getAttendanceByStudent(studentId, startDate, endDate)

      const summary = {
        totalSessions: records.length,
        presences: records.filter(r => r.status === 'presente').length,
        absences: records.filter(r => r.status === 'falta').length,
        justifiedAbsences: records.filter(r => r.status === 'justificada').length,
        medicalCertificates: records.filter(r => r.status === 'atestado').length,
        attendanceRate: 0,
        status: 'critical' as const
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
      // console.error('Error calculating student attendance summary:', error)
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
      let query = supabase
        .from('frequencia')
        .select(`
          *,
          aluno:alunos(
            id,
            nome_completo,
            data_nascimento
          ),
          sessao:sessoes_aula(
            id,
            data_aula,
            conteudo_programatico
          ),
          turma:turmas(
            id,
            nome,
            serie,
            escola:escolas(
              id,
              nome,
              codigo
            )
          )
        `)
        .order('data', { ascending: false })

      if (startDate) {
        query = query.gte('data', startDate)
      }
      if (endDate) {
        query = query.lte('data', endDate)
      }
      if (classIds && classIds.length > 0) {
        query = query.in('turma_id', classIds)
      }
      if (schoolId) {
        query = query.eq('turma.escola_id', schoolId)
      }

      const { data, error } = await query

      if (error) throw error
      return data as AttendanceWithDetails[]
    } catch (error) {
      // console.error('Error fetching attendance by date range:', error)
      throw error
    }
  }

  // Get legal compliance report for a session
  async getLegalComplianceReport(sessionId: string) {
    try {
      return await attendanceImmutability.generateLegalComplianceReport(sessionId)
    } catch (error) {
      console.error('Error generating legal compliance report:', error)
      throw error
    }
  }

  // Get audit trail for a session
  async getSessionAuditTrail(sessionId: string) {
    try {
      return await attendanceImmutability.getSessionAuditTrail(sessionId)
    } catch (error) {
      console.error('Error fetching session audit trail:', error)
      throw error
    }
  }

  // Verify record integrity
  async verifyAttendanceIntegrity(recordId: string) {
    try {
      return await attendanceImmutability.verifyRecordIntegrity(recordId, 'attendance')
    } catch (error) {
      console.error('Error verifying attendance integrity:', error)
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
}

export const attendanceApi = new AttendanceApiService()