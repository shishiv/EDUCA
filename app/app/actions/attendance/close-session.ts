'use server'

import { createCloseSessionAction } from '@/lib/services/attendance-actions'
import type { CloseSessionParams, CloseSessionResult } from '@/lib/services/attendance-module'
import { productionAttendanceActionDependencies } from './attendance-action-dependencies'

export type { CloseSessionParams, CloseSessionResult }

// Next.js requires an async export at the server boundary.
export async function closeSessionAction(params: CloseSessionParams): Promise<CloseSessionResult> {
  return createCloseSessionAction(productionAttendanceActionDependencies)(params)
}
