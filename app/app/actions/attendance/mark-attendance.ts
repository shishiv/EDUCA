'use server'

import { createMarkAttendanceAction } from '@/lib/services/attendance-actions'
import type { MarkAttendanceParams, MarkAttendanceResult } from '@/lib/services/attendance-module'
import { productionAttendanceActionDependencies } from './attendance-action-dependencies'

export type { MarkAttendanceParams, MarkAttendanceResult }
export type { AttendanceStatusInput as AttendanceStatusCode } from '@/lib/services/attendance-module'

// Next.js requires an async export at the server boundary.
export async function markAttendanceAction(params: MarkAttendanceParams): Promise<MarkAttendanceResult> {
  return createMarkAttendanceAction(productionAttendanceActionDependencies)(params)
}
