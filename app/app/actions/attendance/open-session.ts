'use server'

import { createOpenSessionAction } from '@/lib/services/attendance-actions'
import type { OpenSessionParams, OpenSessionResult } from '@/lib/services/attendance-module'
import { productionAttendanceActionDependencies } from './attendance-action-dependencies'

export type { OpenSessionParams, OpenSessionResult }

// Next.js requires an async export at the server boundary.
export async function openSessionAction(params: OpenSessionParams): Promise<OpenSessionResult> {
  return createOpenSessionAction(productionAttendanceActionDependencies)(params)
}
