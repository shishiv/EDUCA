/**
 * Closes a canonical attendance session.
 *
 * Closing is a one-way server-side transition. Database triggers create the
 * legal hash and reject later changes to the session or its attendance rows.
 */

'use server'

import { revalidatePath } from 'next/cache'
import type { Tables } from '@/lib/supabase'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import {
  assertCanRecordAttendance,
  assertSessionWriteAccess,
  AttendanceAuthError,
  requireAttendanceActor,
} from '@/lib/services/attendance-auth'

interface CloseSessionParams {
  session_id: string
  observacoes?: string
}

interface CloseSessionResult {
  success: boolean
  session?: Tables<'sessoes_aula'>
  error?: string
  code?: string
}

export async function closeSessionAction(
  params: CloseSessionParams
): Promise<CloseSessionResult> {
  try {
    if (!params || !params.session_id) {
      return { success: false, code: 'SESSION_REQUIRED', error: 'ID da sessão é obrigatório' }
    }

    const supabase = await createClient()
    const actor = await requireAttendanceActor(supabase)
    assertCanRecordAttendance(actor)

    const { data: session, error: sessionError } = await supabase
      .from('sessoes_aula')
      .select('id, turma_id, professor_id, escola_id, status, data_aula, travada_em, fechada_em')
      .eq('id', params.session_id)
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

    const { data: isEditable, error: editableError } = await supabase.rpc(
      'is_session_editable',
      { session_id: session.id }
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
        error: 'A sessão já está fechada ou bloqueada e não pode ser alterada',
      }
    }

    const { data: closedSession, error: updateError } = await supabase
      .from('sessoes_aula')
      .update({
        status: 'FECHADA',
        fechada_em: new Date().toISOString(),
        observacoes_fechamento: params.observacoes?.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', session.id)
      .select()
      .single()

    if (updateError || !closedSession) {
      logger.error('ATTENDANCE_SESSION_CLOSE_FAILED', updateError ?? new Error('Sessão não retornada'), {
        metadata: { sessionId: session.id },
      })
      return {
        success: false,
        code: 'SESSION_CLOSE_FAILED',
        error: updateError?.message || 'Não foi possível fechar a chamada',
      }
    }

    revalidatePath(`/dashboard/turmas/${session.turma_id}/chamada`)
    revalidatePath(`/dashboard/turmas/${session.turma_id}`)

    return { success: true, session: closedSession }
  } catch (error) {
    if (error instanceof AttendanceAuthError) {
      return { success: false, code: error.code, error: error.message }
    }

    logger.error('ATTENDANCE_SESSION_CLOSE_UNEXPECTED', error as Error, {
      metadata: { sessionId: params?.session_id },
    })

    return {
      success: false,
      code: 'SESSION_CLOSE_FAILED',
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    }
  }
}
