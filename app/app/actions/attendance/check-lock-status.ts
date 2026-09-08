'use server'

import { createCheckLockStatusAction } from '@/lib/services/attendance-actions'
import type { CheckLockStatusResult } from '@/lib/services/attendance-module'
import { productionAttendanceActionDependencies } from './attendance-action-dependencies'

export type { CheckLockStatusResult }

// Next.js requires an async export at the server boundary.
export async function checkLockStatusAction(sessionIdOrTurmaId: string, date?: string): Promise<CheckLockStatusResult> {
  return createCheckLockStatusAction(productionAttendanceActionDependencies)(sessionIdOrTurmaId, date)
}
