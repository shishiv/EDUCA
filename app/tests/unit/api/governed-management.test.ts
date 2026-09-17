import { createClient } from '@supabase/supabase-js'
import { describe, expect, it } from 'vitest'
import { updateGovernedSchool } from '@/lib/api/governed-management'
import type { Database } from '@/types/database'

describe('governed management client', () => {
  it('sends school fields and director identity through one governed RPC', async () => {
    const requests: Request[] = []
    const client = createClient<Database>('http://127.0.0.1:54321', 'synthetic-anon', {
      auth: {
        autoRefreshToken: false,
        detectSessionInUrl: false,
        persistSession: false,
        storageKey: crypto.randomUUID(),
      },
      global: {
        fetch: async (input, init) => {
          const request = new Request(input, init)
          requests.push(request.clone())
          return Response.json([{ school_id: 'school-a', audit_id: 'school-update-receipt' }])
        },
      },
    })

    await expect(updateGovernedSchool(client, 'school-a', {
      nome: 'Escola Atualizada',
      diretor_id: 'director-b',
    })).resolves.toEqual({ school_id: 'school-a', audit_id: 'school-update-receipt' })

    expect(requests).toHaveLength(1)
    expect(new URL(requests[0].url).pathname).toBe('/rest/v1/rpc/update_governed_school')
    expect(await requests[0].json()).toEqual({
      p_school_id: 'school-a',
      p_changes: {
        nome: 'Escola Atualizada',
        diretor_id: 'director-b',
      },
    })
  })
})
