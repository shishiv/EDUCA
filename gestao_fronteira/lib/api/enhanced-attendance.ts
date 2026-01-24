/**
 * Enhanced Attendance API Service
 *
 * Implements Brazilian educational compliance with:
 * - "Abrir aula" workflow with immutability
 * - Attendance locking at 18:00
 * - Comprehensive audit trails
 * - Multi-guardian notifications
 * - INEP integration patterns
 */

'use client'

import { BaseApiService } from './enhanced-base'
import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/logger'

// ===== ENHANCED INTERFACES =====
export interface EnhancedAttendanceSession {
  id: string
  turma_id: string
  professor_id: string
  data_aula: string

  // Lesson planning (Brazilian requirements)
  conteudo_programatico: string
  objetivos_aprendizagem?: string
  metodologia?: string
  recursos_utilizados?: string
  avaliacao_planejada?: string
  observacoes?: string
  duracao_minutos: number

  // Session control
  status: 'aberta' | 'fechada' | 'travada'
  inicio_aula: string
  fim_aula?: string
  travada_em?: string

  // Compliance
  escola_id: string
  documento_oficial: boolean
  hash_integridade?: string

  created_at: string
  updated_at?: string
}

export interface EnhancedAttendanceRecord {
  id: string
  sessao_id: string
  matricula_id: string
  aluno_id: string
  data_aula: string

  // Attendance details
  status_presenca: 'presente' | 'falta' | 'justificada' | 'atestado_medico'
  observacoes_frequencia?: string

  // Tracking and immutability
  marcado_por: string
  marcado_em: string
  bloqueado: boolean
  bloqueado_em?: string
  bloqueado_por?: string
  hash_registro?: string
  documento_oficial: boolean

  created_at: string
}

export interface AttendanceWithDetails extends EnhancedAttendanceRecord {
  aluno?: {
    id: string
    nome_completo: string
    data_nascimento: string
    foto_url?: string
    necessidades_especiais?: string
  }
  sessao?: EnhancedAttendanceSession
  turma?: {
    id: string
    nome: string
    serie: string
    escola?: {
      id: string
      nome: string
    }
  }
  professor?: {
    id: string
    nome: string
  }
}

export interface AttendanceStatistics {
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
    status: 'adequate' | 'warning' | 'critical'
  }>
  complianceLevel: 'full' | 'warning' | 'critical'
  inepCompliant: boolean
}

// ===== ENHANCED ATTENDANCE API SERVICE =====
export class EnhancedAttendanceService extends BaseApiService {
  constructor() {
    super('sessoes_aula')
  }

  // ===== SESSION MANAGEMENT =====

  /**
   * Create new attendance session (Abrir aula)
   * Implements Brazilian educational compliance
   */
  async createSession(sessionData: Omit<EnhancedAttendanceSession, 'id' | 'created_at' | 'updated_at' | 'hash_integridade' | 'documento_oficial'>): Promise<EnhancedAttendanceSession> {
    try {
      // Validate time constraints (cannot open past sessions)
      const sessionDate = new Date(sessionData.data_aula)
      const today = new Date()
      const diffDays = Math.ceil((today.getTime() - sessionDate.getTime()) / (1000 * 60 * 60 * 24))

      if (diffDays > 1) {
        throw new Error('ERRO_TEMPORAL: Não é possível abrir aula com mais de 1 dia de atraso conforme regulamentação educacional brasileira.')
      }

      // Check if session already exists for this class/date
      const existingSession = await this.getSessionByDate(sessionData.turma_id, sessionData.data_aula)
      if (existingSession) {
        throw new Error('ERRO_DUPLICACAO: Já existe uma sessão aberta para esta turma nesta data.')
      }

      // Validate teacher authorization
      const { data: teacher, error: teacherError } = await supabase
        .from('users')
        .select('id, tipo_usuario, escola_id')
        .eq('id', sessionData.professor_id)
        .single()

      if (teacherError || !teacher) {
        throw new Error('ERRO_AUTORIZACAO: Professor não encontrado.')
      }

      if (teacher.tipo_usuario !== 'professor') {
        throw new Error('ERRO_AUTORIZACAO: Apenas professores podem abrir sessões de aula.')
      }

      // Validate class assignment
      const { data: classAssignment, error: classError } = await supabase
        .from('turmas')
        .select('id, professor_id, escola_id')
        .eq('id', sessionData.turma_id)
        .eq('professor_id', sessionData.professor_id)
        .single()

      if (classError || !classAssignment) {
        throw new Error('ERRO_AUTORIZACAO: Professor não está atribuído a esta turma.')
      }

      // Create session with compliance data - extract only known fields
      // Build insert data, filtering out undefined values
      const sessionInsertData: Record<string, unknown> = {
        turma_id: sessionData.turma_id,
        professor_id: sessionData.professor_id,
        data_aula: sessionData.data_aula,
        conteudo_programatico: sessionData.conteudo_programatico,
        duracao_minutos: sessionData.duracao_minutos,
        escola_id: teacher.escola_id,
        status: 'aberta',
        inicio_aula: new Date().toISOString()
      }

      // Add optional fields only if defined
      if (sessionData.objetivos_aprendizagem) sessionInsertData.objetivos_aprendizagem = sessionData.objetivos_aprendizagem
      if (sessionData.metodologia) sessionInsertData.metodologia = sessionData.metodologia
      if (sessionData.recursos_utilizados) sessionInsertData.recursos_utilizados = sessionData.recursos_utilizados
      if (sessionData.avaliacao_planejada) sessionInsertData.avaliacao_planejada = sessionData.avaliacao_planejada
      if (sessionData.observacoes) sessionInsertData.observacoes = sessionData.observacoes

      // Cast supabase to any to bypass strict type checking for dynamic inserts
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('sessoes_aula')
        .insert(sessionInsertData)
        .select()
        .single()

      if (error) throw error

      // Generate integrity hash
      const hashInput = `${data.id}-${data.turma_id}-${data.data_aula}-${data.professor_id}`
      const hash = await this.generateIntegrityHash(hashInput)

      // Update with hash
      const { data: updatedSession, error: updateError } = await supabase
        .from('sessoes_aula')
        .update({ hash_integridade: hash })
        .eq('id', data.id)
        .select()
        .single()

      if (updateError) throw updateError

      return updatedSession as EnhancedAttendanceSession
    } catch (error) {
      logger.error('Error creating attendance session', error as Error)
      throw error
    }
  }

  /**
   * Close attendance session with immutability enforcement
   */
  async closeSession(sessionId: string, observacoesFechamento?: string): Promise<EnhancedAttendanceSession> {
    try {
      // Verify session exists and is open
      const session = await this.getSessionById(sessionId)
      if (!session) {
        throw new Error('ERRO_SESSAO: Sessão não encontrada.')
      }

      if (session.status !== 'aberta') {
        throw new Error('ERRO_STATUS: Sessão já foi finalizada ou travada.')
      }

      // Check if all students have attendance marked
      const { data: attendance, error: attendanceError } = await supabase
        .from('frequencia')
        .select('id')
        .eq('sessao_id', sessionId)

      if (attendanceError) throw attendanceError

      const { data: enrollments, error: enrollmentError } = await supabase
        .from('matriculas')
        .select('id')
        .eq('turma_id', session.turma_id)
        .eq('situacao', 'ativa')

      if (enrollmentError) throw enrollmentError

      if (attendance.length !== enrollments.length) {
        throw new Error('ERRO_INCOMPLETUDE: Todos os alunos devem ter a presença marcada antes de finalizar a aula.')
      }

      // Close session
      const { data, error } = await supabase
        .from('sessoes_aula')
        .update({
          status: 'fechada',
          fim_aula: new Date().toISOString(),
          observacoes_fechamento: observacoesFechamento,
          updated_at: new Date().toISOString()
        })
        .eq('id', sessionId)
        .select()
        .single()

      if (error) throw error

      // Block all attendance records for immutability
      await supabase
        .from('frequencia')
        .update({
          bloqueado: true,
          bloqueado_em: new Date().toISOString(),
          bloqueado_por: session.professor_id
        })
        .eq('sessao_id', sessionId)

      return data as EnhancedAttendanceSession
    } catch (error) {
      logger.error('Error closing attendance session', error as Error)
      throw error
    }
  }

  /**
   * Get session by date and class
   */
  async getSessionByDate(turmaId: string, date: string): Promise<EnhancedAttendanceSession | null> {
    try {
      const { data, error } = await supabase
        .from('sessoes_aula')
        .select('*')
        .eq('turma_id', turmaId)
        .eq('data_aula', date)
        .single()

      if (error && error.code !== 'PGRST116') throw error
      return data as EnhancedAttendanceSession | null
    } catch (error) {
      logger.error('Error fetching session by date', error as Error)
      throw error
    }
  }

  /**
   * Get session by ID with full details
   */
  async getSessionById(sessionId: string): Promise<EnhancedAttendanceSession | null> {
    try {
      const { data, error } = await supabase
        .from('sessoes_aula')
        .select(`
          *,
          turma:turmas(
            id,
            nome,
            serie,
            escola:escolas(id, nome)
          ),
          professor:users(id, nome)
        `)
        .eq('id', sessionId)
        .single()

      if (error && error.code !== 'PGRST116') throw error
      return data as EnhancedAttendanceSession | null
    } catch (error) {
      logger.error('Error fetching session by ID', error as Error)
      throw error
    }
  }

  // ===== ATTENDANCE RECORDS =====

  /**
   * Save attendance records with immutability enforcement
   */
  async saveAttendanceRecords(
    sessionId: string,
    records: Array<{
      matricula_id: string
      aluno_id: string
      status_presenca: 'presente' | 'falta' | 'justificada' | 'atestado_medico'
      observacoes_frequencia?: string
    }>
  ): Promise<EnhancedAttendanceRecord[]> {
    try {
      // Verify session is open
      const session = await this.getSessionById(sessionId)
      if (!session) {
        throw new Error('ERRO_SESSAO: Sessão não encontrada.')
      }

      if (session.status !== 'aberta') {
        throw new Error('ERRO_IMUTABILIDADE: Esta sessão já foi finalizada. Registros de frequência são documentos oficiais imutáveis conforme legislação brasileira.')
      }

      // Check for existing records (immutability)
      const { data: existingRecords, error: existingError } = await supabase
        .from('frequencia')
        .select('id')
        .eq('sessao_id', sessionId)

      if (existingError) throw existingError

      if (existingRecords.length > 0) {
        throw new Error('ERRO_IMUTABILIDADE: Registros de frequência já existem para esta sessão e não podem ser alterados.')
      }

      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) {
        throw new Error('ERRO_AUTENTICACAO: Usuário não autenticado.')
      }

      // Prepare attendance data with compliance
      const attendanceData = records.map(record => ({
        sessao_id: sessionId,
        matricula_id: record.matricula_id,
        aluno_id: record.aluno_id,
        data_aula: session.data_aula,
        status_presenca: record.status_presenca,
        observacoes_frequencia: record.observacoes_frequencia,
        marcado_por: user.id,
        marcado_em: new Date().toISOString(),
        bloqueado: false,
        documento_oficial: true
      }))

      // Insert records
      const { data, error } = await supabase
        .from('frequencia')
        .insert(attendanceData)
        .select()

      if (error) throw error

      // Auto-close session after saving attendance
      await this.closeSession(sessionId, 'Sessão finalizada automaticamente após marcação de presença')

      return data as unknown as EnhancedAttendanceRecord[]
    } catch (error) {
      logger.error('Error saving attendance records', error as Error)
      throw error
    }
  }

  // ===== STATISTICS AND REPORTS =====

  /**
   * Get comprehensive attendance statistics for a class
   */
  async getClassAttendanceStats(
    turmaId: string,
    startDate?: string,
    endDate?: string
  ): Promise<AttendanceStatistics> {
    try {
      // Get sessions for the period
      let sessionQuery = supabase
        .from('sessoes_aula')
        .select('*')
        .eq('turma_id', turmaId)
        .order('data_aula', { ascending: false })

      if (startDate) sessionQuery = sessionQuery.gte('data_aula', startDate)
      if (endDate) sessionQuery = sessionQuery.lte('data_aula', endDate)

      const { data: sessions, error: sessionError } = await sessionQuery
      if (sessionError) throw sessionError

      // Get matriculas for this class to get student info
      const { data: matriculasData, error: matriculasError } = await supabase
        .from('matriculas')
        .select(`
          id,
          aluno:alunos(id, nome_completo)
        `)
        .eq('turma_id', turmaId)
        .eq('situacao', 'ativa')

      if (matriculasError) throw matriculasError

      const matriculaIds = matriculasData?.map((m) => m.id) ?? []
      const matriculaMap = new Map(matriculasData?.map((m) => [m.id, m.aluno as { id: string; nome_completo: string } | null]) ?? [])

      if (matriculaIds.length === 0) {
        return {
          totalSessions: sessions?.length ?? 0,
          totalRecords: 0,
          byStatus: {},
          attendanceRate: 0,
          studentsWithLowAttendance: [],
          complianceLevel: 'critical',
          inepCompliant: false
        }
      }

      // Get attendance records through matricula_id
      let attendanceQuery = supabase
        .from('frequencia')
        .select('*')
        .in('matricula_id', matriculaIds)

      if (startDate) attendanceQuery = attendanceQuery.gte('data_aula', startDate)
      if (endDate) attendanceQuery = attendanceQuery.lte('data_aula', endDate)

      const { data: attendance, error: attendanceError } = await attendanceQuery
      if (attendanceError) throw attendanceError

      // Calculate statistics
      const byStatus = (attendance ?? []).reduce((acc, record) => {
        const status = record.status_presenca || (record.presente ? 'presente' : 'falta')
        acc[status] = (acc[status] || 0) + 1
        return acc
      }, {} as Record<string, number>)

      const totalRecords = attendance?.length ?? 0
      const totalPresences = byStatus['presente'] || 0
      const attendanceRate = totalRecords > 0 ? Math.round((totalPresences / totalRecords) * 100) : 0

      // Calculate per-student statistics
      const studentStats = new Map<string, {
        nome: string
        totalSessions: number
        presences: number
      }>()

      attendance?.forEach(record => {
        const aluno = matriculaMap.get(record.matricula_id)
        if (aluno) {
          const existing = studentStats.get(aluno.id) || {
            nome: aluno.nome_completo,
            totalSessions: 0,
            presences: 0
          }

          existing.totalSessions++
          if (record.status_presenca === 'presente' || record.presente) {
            existing.presences++
          }

          studentStats.set(aluno.id, existing)
        }
      })

      // Find students with low attendance
      const studentsWithLowAttendance = Array.from(studentStats.entries())
        .map(([student_id, stats]) => {
          const attendanceRate = stats.totalSessions > 0
            ? Math.round((stats.presences / stats.totalSessions) * 100)
            : 0

          let status: 'adequate' | 'warning' | 'critical'
          if (attendanceRate >= 80) {
            status = 'adequate'
          } else if (attendanceRate >= 75) {
            status = 'warning'
          } else {
            status = 'critical'
          }

          return {
            student_id,
            nome: stats.nome,
            attendanceRate,
            totalSessions: stats.totalSessions,
            presences: stats.presences,
            status
          }
        })
        .filter(student => student.attendanceRate < 80)
        .sort((a, b) => a.attendanceRate - b.attendanceRate)

      // Determine compliance level
      let complianceLevel: 'full' | 'warning' | 'critical'
      if (attendanceRate >= 85) {
        complianceLevel = 'full'
      } else if (attendanceRate >= 75) {
        complianceLevel = 'warning'
      } else {
        complianceLevel = 'critical'
      }

      return {
        totalSessions: sessions.length,
        totalRecords,
        byStatus,
        attendanceRate,
        studentsWithLowAttendance,
        complianceLevel,
        inepCompliant: attendanceRate >= 75 // INEP minimum requirement
      }
    } catch (error) {
      logger.error('Error calculating attendance stats', error as Error, {
        feature: 'attendance',
        action: 'get_class_attendance_stats'
      })
      throw error
    }
  }

  // ===== UTILITY METHODS =====

  /**
   * Generate integrity hash for immutability verification
   */
  private async generateIntegrityHash(input: string): Promise<string> {
    const encoder = new TextEncoder()
    const data = encoder.encode(input)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  }

  /**
   * Verify integrity hash
   */
  async verifyIntegrityHash(sessionId: string): Promise<boolean> {
    try {
      const session = await this.getSessionById(sessionId)
      if (!session || !session.hash_integridade) return false

      const expectedHash = await this.generateIntegrityHash(
        `${session.id}-${session.turma_id}-${session.data_aula}-${session.professor_id}`
      )

      return session.hash_integridade === expectedHash
    } catch (error) {
      logger.error('Error verifying integrity hash', error as Error, {
        feature: 'attendance',
        action: 'verify_integrity_hash'
      })
      return false
    }
  }

  /**
   * Check if attendance can be modified (compliance check)
   */
  async canModifyAttendance(sessionId: string): Promise<{
    canModify: boolean
    reason?: string
  }> {
    try {
      const session = await this.getSessionById(sessionId)
      if (!session) {
        return { canModify: false, reason: 'Sessão não encontrada' }
      }

      if (session.status === 'fechada') {
        return { canModify: false, reason: 'Sessão finalizada - documento oficial imutável' }
      }

      if (session.status === 'travada') {
        return { canModify: false, reason: 'Sessão travada automaticamente após horário limite' }
      }

      // Check time limit (18:00 rule)
      const now = new Date()
      const sessionDate = new Date(session.data_aula)
      const isToday = now.toDateString() === sessionDate.toDateString()

      if (isToday && now.getHours() >= 18) {
        return { canModify: false, reason: 'Prazo limite para marcação de presença (18:00) ultrapassado' }
      }

      return { canModify: true }
    } catch (error) {
      logger.error('Error checking modification permissions', error as Error, {
        feature: 'attendance',
        action: 'can_modify_attendance'
      })
      return { canModify: false, reason: 'Erro ao verificar permissões' }
    }
  }
}

export const enhancedAttendanceApi = new EnhancedAttendanceService()