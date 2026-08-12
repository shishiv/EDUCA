/** Server adapter for a teacher's canonical attendance reopen request. */

'use server'

import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import {
  createAttendanceReopenService,
  type AttendanceReopenResult,
  type RequestAttendanceReopenParams,
} from '@/lib/services/attendance-reopen'

export type { AttendanceReopenResult, RequestAttendanceReopenParams }

export async function requestAttendanceReopenAction(
  params: RequestAttendanceReopenParams
): Promise<AttendanceReopenResult> {
  try {
    const supabase = await createClient()
    const result = await createAttendanceReopenService(supabase).request(params)

    return result
  } catch (error) {
    logger.error('ATTENDANCE_REOPEN_REQUEST_ADAPTER_FAILED', error as Error, {
      metadata: { sessionId: params?.session_id },
    })
    return {
      success: false,
      code: 'REOPEN_FAILED',
      error: error instanceof Error ? error.message : 'Não foi possível solicitar a reabertura',
    }
  }
}
