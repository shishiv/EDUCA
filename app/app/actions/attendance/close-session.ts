/**
 * Close Attendance Session - Server Action
 *
 * Manually closes an open session (manual completion by teacher).
 * Sets status to FECHADA, records fechada_em timestamp.
 * Database trigger generates legal compliance hash (hash_legal).
 *
 * Authorization (issue #30):
 * - resolves the authenticated actor from the server session
 * - professor: closes only own sessions
 * - diretor: closes only sessions of the own escola
 *
 * Brazilian Compliance: Makes session immutable - "não existe o esquecer"
 */

'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
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
  session?: any
  error?: string
  code?: string
}

export async function closeSessionAction(
  params: CloseSessionParams
): Promise<CloseSessionResult> {
  try {
    // Validate required parameters
    if (!params.session_id) {
      return {
        success: false,
        error: 'ID da sessão é obrigatório',
      }
    }

    const supabase = await createClient()

    // Resolve the authenticated actor from the server session (issue #30).
    const actor = await requireAttendanceActor(supabase)
    assertCanRecordAttendance(actor)

    // Load the session and assert ownership before closing.
    const { data: session, error: sessionError } = await supabase
      .from('sessoes_aula')
      .select('id, professor_id, escola_id, status')
      .eq('id', params.session_id)
      .single()

    if (sessionError || !session) {
      return {
        success: false,
        code: 'SESSION_NOT_FOUND',
        error: 'Sessão de aula não encontrada',
      }
    }

    assertSessionWriteAccess(actor, {
      id: session.id,
      professor_id: session.professor_id,
      escola_id: session.escola_id,
    })

    // Check if session is editable (not already closed/locked)
    const { data: isEditable, error: checkError } = await supabase.rpc(
      'is_session_editable',
      {
        session_id: params.session_id,
      }
    )

    if (checkError) {
      return {
        success: false,
        error: `Erro ao verificar sessão: ${checkError.message}`,
      }
    }

    if (!isEditable) {
      return {
        success: false,
        error:
          'Aula já encerrada. Documento oficial não pode ser alterado (não existe o esquecer)',
      }
    }

    // Update session to FECHADA status
    const { data: closedSession, error: updateError } = await supabase
      .from('sessoes_aula')
      .update({
        status: 'FECHADA',
        fechada_em: new Date().toISOString(),
        observacoes_fechamento: params.observacoes || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.session_id)
      .select()
      .single()

    if (updateError) {
      logger.error('Erro ao fechar sessão', updateError, {
        metadata: {
          sessionId: params.session_id
        }
      })
      return {
        success: false,
        error: `Erro ao encerrar aula: ${updateError.message}`,
      }
    }

    // Database trigger (fn_enhanced_audit_sessao_aula) automatically:
    // 1. Generates hash_legal (SHA-256 compliance hash)
    // 2. Creates audit trail record
    // 3. Sets tempo_total_aula computed field

    // Revalidate all attendance pages
    revalidatePath('/dashboard/frequencia')

    return {
      success: true,
      session: closedSession,
    }
  } catch (error) {
    // Expected authorization failures are returned to the caller as-is.
    if (error instanceof AttendanceAuthError) {
      return {
        success: false,
        code: error.code,
        error: error.message,
      }
    }

    logger.error('Erro inesperado ao fechar sessão', error as Error, {
      metadata: {
        sessionId: params.session_id
      }
    })
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    }
  }
}
