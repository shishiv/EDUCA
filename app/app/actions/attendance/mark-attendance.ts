/**
 * Server adapter for one canonical attendance write.
 *
 * The canonical Attendance session module owns authorization, enrollment
 * membership, lock/date checks, normalization, and the upsert.
 */

'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import {
  createAttendanceModule,
  type AttendanceStatusInput,
  type MarkAttendanceParams,
  type MarkAttendanceResult,
} from '@/lib/services/attendance-module'

export type { MarkAttendanceParams, MarkAttendanceResult }
export type AttendanceStatusCode = AttendanceStatusInput

export async function markAttendanceAction(
  params: MarkAttendanceParams
): Promise<MarkAttendanceResult> {
  try {
    const supabase = await createClient()
    const result = await createAttendanceModule(supabase).markAttendance(params)

    if (result.success && result.turma_id) {
      revalidatePath(`/dashboard/turmas/${result.turma_id}/chamada`)
      revalidatePath(`/dashboard/turmas/${result.turma_id}`)
    }

    if (result.success) {
      return { success: true, record: result.record }
    }

    return {
      success: false,
      error: result.error,
      code: result.code,
    }
  } catch (error) {
    logger.error('ATTENDANCE_RECORD_ADAPTER_FAILED', error as Error, {
      metadata: { sessionId: params?.sessao_id, matriculaId: params?.matricula_id },
    })
    return {
      success: false,
      code: 'ATTENDANCE_WRITE_FAILED',
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    }
  }
}
