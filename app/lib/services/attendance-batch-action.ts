/** Server-side composition seam for batch attendance and cache invalidation. */
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { logger } from '@/lib/logger'
import { createAttendanceModule, type MarkAttendanceBatchParams, type MarkAttendanceBatchResult } from './attendance-module'

type MarkAttendanceBatchDependencies = {
  createClient: () => Promise<SupabaseClient<Database>>
  revalidatePath: (path: string) => void
}

export function createMarkAttendanceBatchAction(
  dependencies: MarkAttendanceBatchDependencies
) {
  return async function markAttendanceBatchAction(
  params: MarkAttendanceBatchParams
): Promise<MarkAttendanceBatchResult> {
  try {
    const supabase = await dependencies.createClient()
    const result = await createAttendanceModule(supabase).markAttendanceBatch(params)

    if (result.success && result.turma_id) {
      dependencies.revalidatePath(`/dashboard/turmas/${result.turma_id}/chamada`)
      dependencies.revalidatePath(`/dashboard/turmas/${result.turma_id}`)
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
    logger.error('ATTENDANCE_BATCH_ADAPTER_FAILED', error instanceof Error ? error : new Error('Erro desconhecido'), {
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
}
