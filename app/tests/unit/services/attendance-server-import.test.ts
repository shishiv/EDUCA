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

    expect(attendance).toMatchObject({
      createAttendanceModule: expect.any(Function),
      normalizeSessionStatus: expect.any(Function),
      normalizeAttendanceStatus: expect.any(Function),
    })
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
    // SAFETY: this import-only contract never executes a query; the fake supplies every client method exposed by the factory boundary.
    const attendance = createAttendanceModule(fakeClient as never)

    expect(attendance).toMatchObject({
      openSession: expect.any(Function),
      markAttendance: expect.any(Function),
      markAttendanceBatch: expect.any(Function),
      closeSession: expect.any(Function),
      checkLockStatus: expect.any(Function),
      getStudentsForChamada: expect.any(Function),
      getAttendanceForSession: expect.any(Function),
    })
  })
})
