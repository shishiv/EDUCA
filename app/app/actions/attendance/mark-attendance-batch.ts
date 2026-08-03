/**
 * Records a batch of canonical attendance statuses for one session.
 *
 * The action validates every enrollment before writing. It derives the date,
 * titular teacher, school, and audit actor from server-side session data.
 */

'use server'

import { revalidatePath } from 'next/cache'
import type { Inserts } from '@/lib/supabase'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import {
  assertCanRecordAttendance,
  assertMatriculaInTurma,
  assertSessionWriteAccess,
  AttendanceAuthError,
  requireAttendanceActor,
} from '@/lib/services/attendance-auth'
import type { AttendanceStatusCode } from './mark-attendance'

export interface BatchAttendanceRecord {
  matricula_id: string
  status: AttendanceStatusCode
  justificativa?: string | null
}

export interface MarkAttendanceBatchParams {
  sessao_id: string
  records: BatchAttendanceRecord[]
}

export interface MarkAttendanceBatchResult {
  success: boolean
  processed_count: number
  error?: string
  code?: string
}

function presenceFromStatus(status: AttendanceStatusCode): boolean {
  return status === 'P' || status === 'J'
}

export async function markAttendanceBatchAction(
  params: MarkAttendanceBatchParams
): Promise<MarkAttendanceBatchResult> {
  try {
    if (!params || !params.sessao_id || !Array.isArray(params.records) || params.records.length === 0) {
      return {
        success: false,
        processed_count: 0,
        code: 'INPUT_REQUIRED',
        error: 'Sessão e pelo menos uma matrícula são obrigatórias',
      }
    }

    for (const record of params.records) {
      if (!record || typeof record.matricula_id !== 'string' || !['P', 'F', 'J', null].includes(record.status)) {
        return {
          success: false,
          processed_count: 0,
          code: 'STATUS_INVALID',
          error: 'Status de presença inválido',
        }
      }

      if (record.status === 'J' && !record.justificativa?.trim()) {
        return {
          success: false,
          processed_count: 0,
          code: 'JUSTIFICATION_REQUIRED',
          error: 'A presença justificada exige um motivo',
        }
      }
    }

    const matriculaIds = params.records.map(record => record.matricula_id)
    if (new Set(matriculaIds).size !== matriculaIds.length) {
      return {
        success: false,
        processed_count: 0,
        code: 'DUPLICATE_ENROLLMENT',
        error: 'Cada matrícula pode aparecer uma vez por lote',
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
      return {
        success: false,
        processed_count: 0,
        code: 'SESSION_NOT_FOUND',
        error: 'Sessão de aula não encontrada',
      }
    }

    const { data: turma } = await supabase
      .from('turmas')
      .select('id, professor_id, escola_id, ativo')
      .eq('id', session.turma_id)
      .single()

    if (!turma) {
      return {
        success: false,
        processed_count: 0,
        code: 'TURMA_NOT_FOUND',
        error: 'Turma da sessão não encontrada',
      }
    }

    assertSessionWriteAccess(actor, session, turma)

    const { data: isEditable, error: editableError } = await supabase.rpc(
      'is_session_editable',
      { session_id: session.id }
    )

    if (editableError) {
      return {
        success: false,
        processed_count: 0,
        code: 'SESSION_LOCK_CHECK_FAILED',
        error: `Erro ao verificar o fechamento da sessão: ${editableError.message}`,
      }
    }

    if (!isEditable) {
      return {
        success: false,
        processed_count: 0,
        code: 'SESSION_CLOSED',
        error: 'A sessão está fechada ou bloqueada e não aceita alterações',
      }
    }

    const timestamp = new Date().toISOString()
    const upsertRecords: Inserts<'frequencia'>[] = []

    for (const record of params.records) {
      const { data: matricula } = await supabase
        .from('matriculas')
        .select('id, turma_id, situacao')
        .eq('id', record.matricula_id)
        .single()

      if (!matricula) {
        return {
          success: false,
          processed_count: 0,
          code: 'MATRICULA_NOT_FOUND',
          error: 'Uma matrícula da chamada não foi encontrada',
        }
      }

      assertMatriculaInTurma(matricula, session.turma_id)

      const status = record.status ?? 'NAO_MARCADO'
      upsertRecords.push({
        sessao_id: session.id,
        matricula_id: matricula.id,
        data_aula: session.data_aula,
        status_presenca: status,
        presente: presenceFromStatus(record.status),
        justificativa: record.status === 'J' ? record.justificativa!.trim() : null,
        professor_id: session.professor_id,
        marcado_por: actor.userId,
        marcado_em: timestamp,
      })
    }

    const { error: upsertError } = await supabase
      .from('frequencia')
      .upsert(upsertRecords, { onConflict: 'sessao_id,matricula_id' })

    if (upsertError) {
      logger.error('ATTENDANCE_BATCH_WRITE_FAILED', upsertError, {
        metadata: { sessionId: session.id, recordCount: upsertRecords.length },
      })
      return {
        success: false,
        processed_count: 0,
        code: 'ATTENDANCE_WRITE_FAILED',
        error: upsertError.message,
      }
    }

    revalidatePath(`/dashboard/turmas/${session.turma_id}/chamada`)
    revalidatePath(`/dashboard/turmas/${session.turma_id}`)

    return {
      success: true,
      processed_count: upsertRecords.length,
    }
  } catch (error) {
    if (error instanceof AttendanceAuthError) {
      return {
        success: false,
        processed_count: 0,
        code: error.code,
        error: error.message,
      }
    }

    logger.error('ATTENDANCE_BATCH_WRITE_UNEXPECTED', error as Error, {
      metadata: {
        sessionId: params?.sessao_id,
        recordCount: Array.isArray(params?.records) ? params.records.length : 0,
      },
    })

    return {
      success: false,
      processed_count: 0,
      code: 'ATTENDANCE_WRITE_FAILED',
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    }
  }
}
