/**
 * Check Lock Status - Server Action
 *
 * Validates if a session is editable or locked (immutable).
 * Used for real-time polling to detect 18:00 auto-lock.
 * Can query by session_id OR by turma_id + date.
 *
 * Returns:
 * - isLocked: boolean
 * - session: full session data
 * - lockReason: 'manual_close' | 'auto_lock' | null
 *
 * Performance: Optimized with database indexes on (status, travada_em)
 */

'use server'

import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'

interface CheckLockStatusResult {
  success: boolean
  session?: any
  isLocked: boolean
  lockReason?: 'manual_close' | 'auto_lock' | null
  error?: string
}

/**
 * Check session lock status by session_id OR turma_id + date
 *
 * @param sessionIdOrTurmaId - UUID of session OR turma
 * @param date - Optional date (YYYY-MM-DD) when querying by turma_id
 */
export async function checkLockStatusAction(
  sessionIdOrTurmaId: string,
  date?: string
): Promise<CheckLockStatusResult> {
  try {
    if (!sessionIdOrTurmaId) {
      return {
        success: false,
        isLocked: false,
        error: 'ID da sessão ou turma é obrigatório',
      }
    }

    const supabase = await createClient()

    // Build query based on parameters
    let query = supabase.from('sessoes_aula').select('*')

    if (date) {
      // Query by turma_id + date
      query = query
        .eq('turma_id', sessionIdOrTurmaId)
        .eq('data_aula', date)
        .in('status', ['PLANEJADA', 'ABERTA', 'aberta', 'FECHADA', 'fechada', 'travada'])
    } else {
      // Query by session_id
      query = query.eq('id', sessionIdOrTurmaId)
    }

    const { data: session, error: queryError } = await query.single()

    if (queryError) {
      // No session found is not an error - just means no active session
      if (queryError.code === 'PGRST116') {
        return {
          success: true,
          session: null,
          isLocked: false,
          lockReason: null,
        }
      }

      return {
        success: false,
        isLocked: false,
        error: `Erro ao buscar sessão: ${queryError.message}`,
      }
    }

    if (!session) {
      return {
        success: true,
        session: null,
        isLocked: false,
        lockReason: null,
      }
    }

    // Determine lock status and reason
    let isLocked = false
    let lockReason: 'manual_close' | 'auto_lock' | null = null

    // Check manual close (teacher clicked "Encerrar Aula")
    if (
      session.status === 'FECHADA' ||
      session.status === 'fechada' ||
      session.fechada_em
    ) {
      isLocked = true
      lockReason = 'manual_close'
    }

    // Check auto-lock (18:00 cutoff via database trigger)
    if (session.status === 'travada' || session.travada_em) {
      isLocked = true
      lockReason = 'auto_lock'
    }

    // Additional check: verify with database function
    if (!isLocked && session.id) {
      const { data: isEditable, error: rpcError } = await supabase.rpc(
        'is_session_editable',
        {
          session_id: session.id,
        }
      )

      if (!rpcError) {
        isLocked = !isEditable

        // If locked but no explicit reason, check cutoff time
        if (isLocked && !lockReason) {
          const cutoffTime = new Date(session.auto_fechamento_agendado || '')
          const now = new Date()

          if (now > cutoffTime) {
            lockReason = 'auto_lock'
          }
        }
      }
    }

    return {
      success: true,
      session,
      isLocked,
      lockReason,
    }
  } catch (error) {
    logger.error('Erro inesperado ao verificar status de bloqueio', error as Error, {
      metadata: {
        sessionIdOrTurmaId,
        date
      }
    })
    return {
      success: false,
      isLocked: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    }
  }
}