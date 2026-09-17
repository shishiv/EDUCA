import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

export const CLASS_DEFAULT_CAPACITY_CONFIG_KEY = 'class_default_capacity'

type ClassCapacityConfigClient = Pick<SupabaseClient<Database>, 'from'>
type CapacityConfigRow = {
  escola_id: string | null
  valor: string
}

function parseCapacity(value: string): number | null {
  if (!/^[0-9]{1,2}$/.test(value)) return null
  const capacity = Number(value)
  return capacity >= 1 && capacity <= 50 ? capacity : null
}

export function resolveClassDefaultCapacity(
  schoolConfig: CapacityConfigRow | null,
  globalConfig: CapacityConfigRow | null,
): number {
  const capacity = parseCapacity(schoolConfig?.valor ?? '') ?? parseCapacity(globalConfig?.valor ?? '')
  if (capacity === null) throw new Error('CLASS_CAPACITY_CONFIG_INVALID')
  return capacity
}

/** Resolves the school override first, then the persisted municipal default. */
export async function getClassDefaultCapacity(
  client: ClassCapacityConfigClient,
  schoolId: string,
): Promise<number> {
  const [schoolResult, globalResult] = await Promise.all([
    client
      .from('configs')
      .select('escola_id, valor')
      .eq('chave', CLASS_DEFAULT_CAPACITY_CONFIG_KEY)
      .eq('escola_id', schoolId)
      .eq('ativo', true)
      .maybeSingle(),
    client
      .from('configs')
      .select('escola_id, valor')
      .eq('chave', CLASS_DEFAULT_CAPACITY_CONFIG_KEY)
      .is('escola_id', null)
      .eq('ativo', true)
      .maybeSingle(),
  ])

  if (schoolResult.error) throw new Error(schoolResult.error.message)
  if (globalResult.error) throw new Error(globalResult.error.message)

  return resolveClassDefaultCapacity(schoolResult.data, globalResult.data)
}
