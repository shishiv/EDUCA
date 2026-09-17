/** Public Server Action for canonical batch attendance writes. */
'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createMarkAttendanceBatchAction } from '@/lib/services/attendance-batch-action'
import type { MarkAttendanceBatchParams, MarkAttendanceBatchResult } from '@/lib/services/attendance-module'

export type { BatchAttendanceRecord, MarkAttendanceBatchParams, MarkAttendanceBatchResult } from '@/lib/services/attendance-module'

export async function markAttendanceBatchAction(params: MarkAttendanceBatchParams): Promise<MarkAttendanceBatchResult> {
  return createMarkAttendanceBatchAction({ createClient, revalidatePath })(params)
}
