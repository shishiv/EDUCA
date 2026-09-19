import { createClient } from '@supabase/supabase-js'
import { describe, expect, it } from 'vitest'
import type { Database, Json } from '@/types/database'
import { resolveAttendanceBands } from '@/lib/attendance/resolve-attendance-bands'
import { getFrequencyPolicyStatus } from '@/lib/attendance/attendance-policy'

function configuredClient(response: Json, status = 200) {
  return createClient<Database>('http://127.0.0.1:54321', 'synthetic-unit-key', {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: async () => Response.json(response, { status }) },
  })
}

describe('governed attendance boundary', () => {
  it('uses the school-resolved pair rather than restoring application defaults', async () => {
    const client = configuredClient([{ attendance_bands: { reference: 90, attention: 95 } }])
    const bands = await resolveAttendanceBands(client, 'school-a')
    expect([85, 89.99, 90, 94.99, 95].map(value => getFrequencyPolicyStatus(value, bands)))
      .toEqual(['CRITICO', 'CRITICO', 'ATENCAO', 'ATENCAO', 'CONFORME'])
  })

  it.each([
    [], [{}], [{ attendance_bands: null }],
    [{ attendance_bands: { reference: 80 } }],
    [{ attendance_bands: { reference: '80', attention: 85 } }],
    [{ attendance_bands: { reference: 85, attention: 85 } }],
    [{ attendance_bands: { reference: 90, attention: 80 } }],
    [{ attendance_bands: { reference: 0, attention: 85 } }],
    [{ attendance_bands: { reference: 80, attention: 101 } }],
  ].map(response => ({ response })))('rejects missing or invalid database configuration %#', async ({ response }) => {
    await expect(resolveAttendanceBands(configuredClient(response), 'school-a')).rejects.toThrow()
  })

  it('propagates a denied school read instead of falling back to municipal constants', async () => {
    const client = configuredClient({ message: 'PILOT_MUNICIPAL_SETTINGS_SCHOOL_DENIED' }, 403)
    await expect(resolveAttendanceBands(client, 'foreign-school')).rejects.toThrow('PILOT_MUNICIPAL_SETTINGS_SCHOOL_DENIED')
  })
})
