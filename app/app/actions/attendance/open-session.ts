/**
 * Server adapter for opening a canonical attendance session.
 *
 * Authorization, identity derivation, date validation, duplicate detection, and
 * the database write live in the canonical Attendance session module.
 */

'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import {
  createAttendanceModule,
  type OpenSessionParams,
  type OpenSessionResult,
} from '@/lib/services/attendance-module'

export type { OpenSessionParams, OpenSessionResult }

export async function openSessionAction(
  params: OpenSessionParams
): Promise<OpenSessionResult> {
  try {
    const supabase = await createClient()
    const result = await createAttendanceModule(supabase).openSession(params)

    if (result.success && result.session) {
      revalidatePath(`/dashboard/turmas/${result.session.turma_id}/chamada`)
      revalidatePath(`/dashboard/turmas/${result.session.turma_id}`)
    }

    return result
  } catch (error) {
    logger.error('ATTENDANCE_SESSION_OPEN_ADAPTER_FAILED', error as Error, {
      metadata: { turmaId: params?.turma_id, date: params?.data_aula },
    })
    return {
      success: false,
      code: 'SESSION_OPEN_FAILED',
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    }
  }
}
