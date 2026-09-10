import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

/** Uses the persisted bootstrap default, matching assign_school_municipality. */
export async function resolveSeedMunicipalityId(client: SupabaseClient<Database>): Promise<string> {
  const { data, error } = await client.from('pilot_municipality_config')
    .select('id').order('created_at', { ascending: true }).order('id', { ascending: true }).limit(1).single()
  if (error) throw new Error(`SEED_MUNICIPALITY_REQUIRED: ${error.message}`)
  return data.id
}
