/** Server adapter for a director's canonical attendance reopen decision. */

'use server'

import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import {
  createAttendanceReopenService,
  type AttendanceReopenResult,
  type DecideAttendanceReopenParams,
} from '@/lib/services/attendance-reopen'

export type { AttendanceReopenResult, DecideAttendanceReopenParams }

export async function decideAttendanceReopenAction(
  params: DecideAttendanceReopenParams
): Promise<AttendanceReopenResult> {
  try {
    const supabase = await createClient()
    const result = await createAttendanceReopenService(supabase).decide(params)

    return result
  } catch (error) {
    logger.error('ATTENDANCE_REOPEN_DECISION_ADAPTER_FAILED', error as Error, {
      metadata: { requestId: params?.request_id, decision: params?.decision },
    })
    return {
      success: false,
      code: 'REOPEN_FAILED',
      error: error instanceof Error ? error.message : 'Não foi possível decidir a reabertura',
    }
  }
}
