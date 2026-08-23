/**
 * Enhanced Attendance - legacy UI adapter retained for compile-time compatibility.  Use api/attendance for active code paths.
 */
'use client'

import type { Inserts } from '@/lib/supabase'
import { openSessionAction } from '@/app/actions/attendance/open-session'
import { closeSessionAction } from '@/app/actions/attendance/close-session'

/**
 * UI adapter for the canonical Attendance session module.
 *
 * The historical enhanced facade used to carry a second session, status,
 * locking, and statistics implementation. The active UI only needs the
 * opening and closing adapters below; canonical reads and writes belong to
 * attendance-module.
 */

export interface EnhancedAttendanceSession {
  id: string
  turma_id: string
  professor_id: string
  data_aula: string
  conteudo_programatico: string
  objetivos_aprendizagem?: string
  metodologia?: string
  recursos_utilizados?: string
  avaliacao_planejada?: string
  observacoes?: string
  duracao_minutos: number
  status: 'ABERTA' | 'FECHADA' | 'CANCELADA' | 'aberta' | 'fechada' | 'cancelada'
  inicio_aula: string
  fim_aula?: string
  travada_em?: string
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
  status_presenca: 'P' | 'F' | 'J' | 'A' | 'presente' | 'falta' | 'justificada' | 'atestado_medico'
  observacoes_frequencia?: string
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

/**
 * @deprecated Use openSessionAction. This helper remains only for compile-time
 * payload regression coverage.
 */
export function buildSessionInsert(
  sessionData: Omit<EnhancedAttendanceSession, 'id' | 'created_at' | 'updated_at' | 'hash_integridade' | 'documento_oficial'>,
  teacherEscolaId: string
): Inserts<'sessoes_aula'> {
  const insertData: Inserts<'sessoes_aula'> = {
    turma_id: sessionData.turma_id,
    professor_id: sessionData.professor_id,
    data_aula: sessionData.data_aula,
    conteudo_programatico: sessionData.conteudo_programatico,
    duracao_minutos: sessionData.duracao_minutos,
    escola_id: teacherEscolaId,
    status: 'ABERTA',
    inicio_aula: new Date().toISOString(),
  }

  if (sessionData.objetivos_aprendizagem) insertData.objetivos_aprendizagem = sessionData.objetivos_aprendizagem
  if (sessionData.metodologia) insertData.metodologia = sessionData.metodologia
  if (sessionData.recursos_utilizados) insertData.recursos_utilizados = sessionData.recursos_utilizados
  if (sessionData.avaliacao_planejada) insertData.avaliacao_planejada = sessionData.avaliacao_planejada
  if (sessionData.observacoes) insertData.observacoes = sessionData.observacoes

  return insertData
}

export class EnhancedAttendanceService {
  async createSession(
    sessionData: Omit<EnhancedAttendanceSession, 'id' | 'created_at' | 'updated_at' | 'hash_integridade' | 'documento_oficial'>
  ): Promise<EnhancedAttendanceSession> {
    const result = await openSessionAction({
      turma_id: sessionData.turma_id,
      data_aula: sessionData.data_aula,
      conteudo_programatico: sessionData.conteudo_programatico || 'Chamada',
      professor_id: sessionData.professor_id,
      escola_id: sessionData.escola_id,
    })
    if (!result.success || !result.session) {
      throw new Error(result.error || result.code || 'SESSION_OPEN_FAILED')
    }
    return result.session as unknown as EnhancedAttendanceSession
  }

  async closeSession(sessionId: string, observacoesFechamento?: string): Promise<EnhancedAttendanceSession> {
    const result = await closeSessionAction({
      session_id: sessionId,
      observacoes: observacoesFechamento,
    })
    if (!result.success || !result.session) {
      throw new Error(result.error || result.code || 'SESSION_CLOSE_FAILED')
    }
    return result.session as unknown as EnhancedAttendanceSession
  }
}

export const enhancedAttendanceApi = new EnhancedAttendanceService()
