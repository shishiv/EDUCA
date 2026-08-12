'use client'

import { supabase, type Inserts } from '@/lib/supabase'
import { openSessionAction } from '@/app/actions/attendance/open-session'
import { markAttendanceBatchAction } from '@/app/actions/attendance/mark-attendance-batch'
import { closeSessionAction } from '@/app/actions/attendance/close-session'
import { createAttendanceModule } from '@/lib/services/attendance-module'
import {
  createAttendanceReopenService,
  type AttendanceReopenRequest,
} from '@/lib/services/attendance-reopen'

/**
 * Browser adapter for the canonical Attendance session module.
 *
 * This file owns only UI-friendly translations. It does not own attendance
 * queries, status rules, date rules, authorization, or writes.
 */

export interface AttendanceSession {
  id: string
  turma_id: string
  professor_id: string
  escola_id: string
  data_aula: string
  conteudo_programatico: string
  metodologia?: string | null
  recursos_utilizados?: string | null
  observacoes?: string | null
  duracao_minutos: number
  status: 'PLANEJADA' | 'ABERTA' | 'FECHADA' | 'CANCELADA' | 'planejada' | 'aberta' | 'fechada' | 'cancelada'
  inicio_aula: string
  aberta_em: string | null
  fechada_em: string | null
  fim_aula?: string | null
  created_at: string
  updated_at?: string | null
}

export interface AttendanceRecord {
  id: string
  sessao_id: string
  matricula_id: string
  data_aula: string
  status_presenca: 'P' | 'F' | 'J' | 'A' | 'NAO_MARCADO' | 'presente' | 'falta' | 'justificada' | 'atestado'
  observacoes?: string | null
  presente: boolean
  created_at: string | null
}

export interface AttendanceWithDetails extends AttendanceRecord {
  aluno?: {
    id: string
    nome_completo: string
    data_nascimento?: string
  }
  sessao?: AttendanceSession
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

export class AttendanceApiService {
  private readonly canonicalAttendance = createAttendanceModule(supabase)

  async createSession(
    sessionData: Omit<AttendanceSession, 'id' | 'created_at' | 'updated_at'> & { escola_id?: string }
  ): Promise<AttendanceSession> {
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

  async closeSession(sessionId: string): Promise<AttendanceSession> {
    const result = await closeSessionAction({ session_id: sessionId })
    if (!result.success || !result.session) {
      throw new Error(result.error || 'Não foi possível fechar a chamada')
    }
    return result.session as unknown as AttendanceSession
  }

  async getSessionByDate(turmaId: string, date: string): Promise<AttendanceSession | null> {
    const sessions = await this.getSessionsForChamada(turmaId, date)
    const session = sessions.find(value => value.status === 'ABERTA') ?? sessions[sessions.length - 1]
    return session ?? null
  }

  async getSessionsForChamada(
    turmaId: string,
    date: string,
    requestedSessionId?: string | null
  ): Promise<AttendanceSession[]> {
    return (await this.canonicalAttendance.getSessionsForChamada(
      turmaId,
      date,
      requestedSessionId
    )) as unknown as AttendanceSession[]
  }

  async getStudentsForChamada(turmaId: string): Promise<{
    id: string
    nome: string
    matriculaId: string
    frequencia: number
  }[]> {
    return this.canonicalAttendance.getStudentsForChamada(turmaId)
  }

  async getAttendanceReopenRequest(sessionId: string): Promise<AttendanceReopenRequest | null> {
    return createAttendanceReopenService(supabase).getRequestForSession(sessionId)
  }

  async getAttendanceForSession(sessionId: string): Promise<Map<string, {
    status: 'P' | 'F' | 'J' | null
    justificativa: string | null
  }>> {
    const records = await this.canonicalAttendance.getAttendanceForSession(sessionId)
    const result = new Map<string, { status: 'P' | 'F' | 'J' | null; justificativa: string | null }>()

    for (const [matriculaId, record] of records) {
      result.set(matriculaId, {
        status: record.status === 'A' ? 'J' : record.status === 'NAO_MARCADO' ? null : record.status,
        justificativa: record.justificativa,
      })
    }

    return result
  }

  async getAttendanceForDate(turmaId: string, date: string): Promise<{
    sessionId: string | null
    sessionStatus: string | null
    records: Map<string, { status: string | null; justificativa: string | null }>
  }> {
    const sessions = await this.getSessionsForChamada(turmaId, date)
    const session = sessions.find(value => value.status === 'ABERTA') ?? sessions[sessions.length - 1]
    if (!session) {
      return { sessionId: null, sessionStatus: null, records: new Map() }
    }

    const records = await this.getAttendanceForSession(session.id)
    return {
      sessionId: session.id,
      sessionStatus: session.status,
      records,
    }
  }

  async saveChamada(
    turmaId: string,
    date: string,
    sessionId: string | null,
    attendanceRecords: Map<string, { status: string | null; justificativa: string | null }>
  ): Promise<string> {
    let currentSessionId = sessionId

    if (!currentSessionId) {
      const opened = await openSessionAction({
        turma_id: turmaId,
        data_aula: date,
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
            : record.status === 'A'
              ? 'A' as const
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
