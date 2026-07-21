/**
 * Close Attendance Session - Server Action
 *
 * Manually closes an open session (manual completion by teacher).
 * Sets status to FECHADA, records fechada_em timestamp.
 * Database trigger generates legal compliance hash (hash_legal).
 *
 * Brazilian Compliance: Makes session immutable - "não existe o esquecer"
 * Security: Only session owner (professor) can close via RLS policies
 */

'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { logger } from '@/lib/logger'

interface CloseSessionParams {
  session_id: string
  observacoes?: string
}

interface CloseSessionResult {
  success: boolean
  session?: any
  error?: string
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
    revalidatePath('/diario/frequencia')

    return {
      success: true,
      session: closedSession,
    }
  } catch (error) {
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