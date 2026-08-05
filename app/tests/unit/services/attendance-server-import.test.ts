// @vitest-environment node
import { describe, it, expect, afterAll } from 'vitest'

const savedEnv = {
  url: process.env.NEXT_PUBLIC_SUPABASE_URL,
  anon: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
}

afterAll(() => {
  if (savedEnv.url === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL
  else process.env.NEXT_PUBLIC_SUPABASE_URL = savedEnv.url
  if (savedEnv.anon === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  else process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = savedEnv.anon
})

describe('canonical Attendance session module in a server runtime', () => {
  it('imports without constructing a browser client', async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    const attendance = await import('@/lib/services/attendance-module')

    expect(typeof attendance.createAttendanceModule).toBe('function')
    expect(typeof attendance.normalizeSessionStatus).toBe('function')
    expect(typeof attendance.normalizeAttendanceStatus).toBe('function')
  })

  it('creates the canonical interface from an injected client', async () => {
    const fakeClient = {
      from: () => ({
        select: () => ({
          eq: () => ({
            single: () => Promise.resolve({ data: null, error: null }),
          }),
        }),
      }),
      rpc: () => Promise.resolve({ data: null, error: null }),
      auth: { getUser: () => Promise.resolve({ data: { user: null }, error: null }) },
    }

    const { createAttendanceModule } = await import('@/lib/services/attendance-module')
    const attendance = createAttendanceModule(fakeClient as never)

    expect(typeof attendance.openSession).toBe('function')
    expect(typeof attendance.markAttendance).toBe('function')
    expect(typeof attendance.markAttendanceBatch).toBe('function')
    expect(typeof attendance.closeSession).toBe('function')
    expect(typeof attendance.checkLockStatus).toBe('function')
    expect(typeof attendance.getStudentsForChamada).toBe('function')
    expect(typeof attendance.getAttendanceForSession).toBe('function')
  })
})
