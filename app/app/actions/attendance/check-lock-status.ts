/**
 * Server adapter for canonical attendance lock-state reads.
 *
 * Session status, São Paulo date semantics, and the database editability RPC
 * are owned by the canonical Attendance session module.
 */

'use server'

import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import {
  createAttendanceModule,
  type CheckLockStatusResult,
} from '@/lib/services/attendance-module'

export type { CheckLockStatusResult }

export async function checkLockStatusAction(
  sessionIdOrTurmaId: string,
  date?: string
): Promise<CheckLockStatusResult> {
  try {
    const supabase = await createClient()
    return await createAttendanceModule(supabase).checkLockStatus({
      sessionIdOrTurmaId,
      date,
    })
  } catch (error) {
    logger.error('ATTENDANCE_SESSION_LOCK_ADAPTER_FAILED', error as Error, {
      metadata: { sessionIdOrTurmaId, date },
    })
    return {
      success: false,
      isLocked: false,
      code: 'SESSION_READ_FAILED',
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    }
  }
}
