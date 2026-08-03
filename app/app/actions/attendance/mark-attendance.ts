/**
 * Marks one canonical attendance row for one enrollment and session.
 *
 * The session supplies the date and titular teacher. The actor supplies the
 * audit user. The client never supplies a school, teacher, or trusted date.
 */

'use server'

import { revalidatePath } from 'next/cache'
import type { Tables } from '@/lib/supabase'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import {
  assertCanRecordAttendance,
  assertMatriculaInTurma,
  assertSessionWriteAccess,
  AttendanceAuthError,
  requireAttendanceActor,
} from '@/lib/services/attendance-auth'

export type AttendanceStatusCode = 'P' | 'F' | 'J' | null

interface MarkAttendanceParams {
  sessao_id: string
  matricula_id: string
  /** Preferred canonical status. */
  status?: AttendanceStatusCode
  /** @deprecated Use status. Kept for old callers and normalized server-side. */
  presente?: boolean
  justificativa?: string | null
  /** Optional compatibility check. The write always uses the session date. */
  data_aula?: string
}

interface MarkAttendanceResult {
  success: boolean
  record?: Tables<'frequencia'>
  error?: string
  code?: string
}

function statusFromParams(params: MarkAttendanceParams): AttendanceStatusCode | 'INVALID' {
  if (params.status !== undefined) return params.status
  if (params.presente === undefined) return 'INVALID'
  return params.presente ? 'P' : 'F'
}

function presenceFromStatus(status: Exclude<AttendanceStatusCode, null>): boolean {
  return status === 'P' || status === 'J'
}

export async function markAttendanceAction(
  params: MarkAttendanceParams
): Promise<MarkAttendanceResult> {
  try {
    if (!params || !params.sessao_id || !params.matricula_id) {
      return { success: false, code: 'INPUT_REQUIRED', error: 'Sessão e matrícula são obrigatórias' }
    }

    const status = statusFromParams(params)
    if (status === 'INVALID' || !['P', 'F', 'J', null].includes(status)) {
      return { success: false, code: 'STATUS_REQUIRED', error: 'Status da presença é obrigatório' }
    }

    if (status === 'J' && !params.justificativa?.trim()) {
      return {
        success: false,
        code: 'JUSTIFICATION_REQUIRED',
        error: 'A presença justificada exige um motivo',
      }
    }

    const supabase = await createClient()
    const actor = await requireAttendanceActor(supabase)
    assertCanRecordAttendance(actor)

    const { data: session, error: sessionError } = await supabase
      .from('sessoes_aula')
      .select('id, turma_id, professor_id, escola_id, status, data_aula, travada_em, fechada_em')
      .eq('id', params.sessao_id)
      .single()

    if (sessionError || !session) {
      return { success: false, code: 'SESSION_NOT_FOUND', error: 'Sessão de aula não encontrada' }
    }

    const { data: turma } = await supabase
      .from('turmas')
      .select('id, professor_id, escola_id, ativo')
      .eq('id', session.turma_id)
      .single()

    if (!turma) {
      return { success: false, code: 'TURMA_NOT_FOUND', error: 'Turma da sessão não encontrada' }
    }

    assertSessionWriteAccess(actor, session, turma)

    const { data: matricula } = await supabase
      .from('matriculas')
      .select('id, turma_id, situacao')
      .eq('id', params.matricula_id)
      .single()

    if (!matricula) {
      return { success: false, code: 'MATRICULA_NOT_FOUND', error: 'Matrícula não encontrada' }
    }

    assertMatriculaInTurma(matricula, session.turma_id)

    if (params.data_aula && params.data_aula !== session.data_aula) {
      return {
        success: false,
        code: 'DATA_MISMATCH',
        error: 'A data da frequência deve ser a data da sessão de aula',
      }
    }

    const { data: isEditable, error: editableError } = await supabase.rpc(
      'is_session_editable',
      { session_id: params.sessao_id }
    )

    if (editableError) {
      return {
        success: false,
        code: 'SESSION_LOCK_CHECK_FAILED',
        error: `Erro ao verificar o fechamento da sessão: ${editableError.message}`,
      }
    }

    if (!isEditable) {
      return {
        success: false,
        code: 'SESSION_CLOSED',
        error: 'A sessão está fechada ou bloqueada e não aceita alterações',
      }
    }

    const dbStatus = status ?? 'NAO_MARCADO'
    const { data: attendanceRecord, error: upsertError } = await supabase
      .from('frequencia')
      .upsert(
        {
          sessao_id: session.id,
          matricula_id: matricula.id,
          data_aula: session.data_aula,
          status_presenca: dbStatus,
          presente: status ? presenceFromStatus(status) : false,
          justificativa: status === 'J' ? params.justificativa!.trim() : null,
          professor_id: session.professor_id,
          marcado_por: actor.userId,
          marcado_em: new Date().toISOString(),
        },
        { onConflict: 'sessao_id,matricula_id' }
      )
      .select()
      .single()

    if (upsertError || !attendanceRecord) {
      logger.error('ATTENDANCE_RECORD_WRITE_FAILED', upsertError ?? new Error('Registro não retornado'), {
        metadata: { sessionId: session.id, matriculaId: matricula.id },
      })
      return {
        success: false,
        code: 'ATTENDANCE_WRITE_FAILED',
        error: upsertError?.message || 'Não foi possível salvar a frequência',
      }
    }

    revalidatePath(`/dashboard/turmas/${session.turma_id}/chamada`)
    revalidatePath(`/dashboard/turmas/${session.turma_id}`)

    return { success: true, record: attendanceRecord }
  } catch (error) {
    if (error instanceof AttendanceAuthError) {
      return { success: false, code: error.code, error: error.message }
    }

    logger.error('ATTENDANCE_RECORD_WRITE_UNEXPECTED', error as Error, {
      metadata: { sessionId: params?.sessao_id, matriculaId: params?.matricula_id },
    })

    return {
      success: false,
      code: 'ATTENDANCE_WRITE_FAILED',
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    }
  }
}
