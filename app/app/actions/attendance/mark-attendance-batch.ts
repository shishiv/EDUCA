/**
 * Server adapter for canonical batch attendance writes.
 *
 * The canonical Attendance session module validates the whole batch before the
 * single upsert, so individual and batch marking share the same invariants.
 */

'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import {
  createAttendanceModule,
  type BatchAttendanceRecord,
  type MarkAttendanceBatchParams,
  type MarkAttendanceBatchResult,
} from '@/lib/services/attendance-module'

export type { BatchAttendanceRecord, MarkAttendanceBatchParams, MarkAttendanceBatchResult }

export async function markAttendanceBatchAction(
  params: MarkAttendanceBatchParams
): Promise<MarkAttendanceBatchResult> {
  try {
    const supabase = await createClient()
    const result = await createAttendanceModule(supabase).markAttendanceBatch(params)

    if (result.success && result.turma_id) {
      revalidatePath(`/dashboard/turmas/${result.turma_id}/chamada`)
      revalidatePath(`/dashboard/turmas/${result.turma_id}`)
    }

    if (result.success) {
      return { success: true, processed_count: result.processed_count }
    }

    return {
      success: false,
      processed_count: result.processed_count,
      error: result.error,
      code: result.code,
    }
  } catch (error) {
    logger.error('ATTENDANCE_BATCH_ADAPTER_FAILED', error as Error, {
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
