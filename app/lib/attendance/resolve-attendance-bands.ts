import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { asPilotRpcClient } from '@/lib/pilot/pilot-rpc-client'
import { attendanceBandsSchema, type AttendanceBands } from './attendance-policy'

/** The municipal getter owns school authorization and whole-pair override precedence. */
export async function resolveAttendanceBands(
  client: SupabaseClient<Database>,
  schoolId: string | null,
): Promise<AttendanceBands> {
  const { data, error } = await asPilotRpcClient(client).rpc('get_municipal_settings', {
    p_escola_id: schoolId,
    p_ano: new Date().getFullYear(),
  })
  if (error) throw new Error(error.message)
  return attendanceBandsSchema.parse(data?.[0]?.attendance_bands)
}
