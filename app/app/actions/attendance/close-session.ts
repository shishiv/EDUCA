/**
 * Server adapter for closing a canonical attendance session.
 *
 * The canonical Attendance session module owns the one-way transition and the
 * final lock/date checks. Database triggers create the legal hash and protect
 * the immutable history.
 */

'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import {
  createAttendanceModule,
  type CloseSessionParams,
  type CloseSessionResult,
} from '@/lib/services/attendance-module'

export type { CloseSessionParams, CloseSessionResult }

export async function closeSessionAction(
  params: CloseSessionParams
): Promise<CloseSessionResult> {
  try {
    const supabase = await createClient()
    const result = await createAttendanceModule(supabase).closeSession(params)

    if (result.success && result.session) {
      revalidatePath(`/dashboard/turmas/${result.session.turma_id}/chamada`)
      revalidatePath(`/dashboard/turmas/${result.session.turma_id}`)
    }

    return result
  } catch (error) {
    logger.error('ATTENDANCE_SESSION_CLOSE_ADAPTER_FAILED', error as Error, {
      metadata: { sessionId: params?.session_id },
    })
    return {
      success: false,
      code: 'SESSION_CLOSE_FAILED',
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    }
  }
}
