import { revalidatePath as revalidateNextPath } from 'next/cache'
import type { AttendanceActionDependencies } from '@/lib/services/attendance-actions'
import { createClient as createServerClient } from '@/lib/supabase/server'

export const productionAttendanceActionDependencies: AttendanceActionDependencies = {
  createClient: createServerClient,
  revalidatePath: revalidateNextPath,
}
