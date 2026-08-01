// @vitest-environment node
import { describe, it, expect, afterAll } from 'vitest'

const savedEnv = {
  url: process.env.NEXT_PUBLIC_SUPABASE_URL,
  anon: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
}

// Restore env for other test files sharing the worker process.
afterAll(() => {
  if (savedEnv.url === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL
  else process.env.NEXT_PUBLIC_SUPABASE_URL = savedEnv.url
  if (savedEnv.anon === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  else process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = savedEnv.anon
})

/**
 * Server-side import safety for attendance services.
 *
 * Before this refactor, importing any attendance service module executed
 * createBrowserClient from '@/lib/supabase' at module scope. In a server
 * runtime that either threw at import (missing env vars) or silently masked
 * the authenticated session (no cookie access). This test proves the
 * regression is gone: the modules load in a plain Node environment and no
 * browser client is constructed.
 */
describe('attendance services in a server runtime', () => {
  it('imports without constructing a browser client', async () => {
    // Ensure we are in a non-browser runtime and no Supabase env vars leak in.
    delete process.env.NEXT_PUBLIC_SUPABASE_URL
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    const immutability = await import('@/lib/services/attendance-immutability')
    const locking = await import('@/lib/services/attendance-locking')
    const workflow = await import('@/lib/services/attendance-workflow')
    const attendance = await import('@/lib/services/attendance-module')

    expect(typeof immutability.AttendanceImmutabilityService).toBe('function')
    expect(typeof locking.AttendanceLockingService).toBe('function')
    expect(typeof workflow.createAttendanceWorkflow).toBe('function')
    expect(typeof attendance.createAttendanceModule).toBe('function')
  })

  it('creates a module from an injected client without touching the browser client', async () => {
    // A minimal authenticated-persistence stand-in: the production adapter is
    // createClient() from '@/lib/supabase/server', the test adapter is the
    // mock client. Neither is a browser client constructed by the services.
    const fakeClient = {
      from: () => ({
        select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: null, error: null }) }) }),
      }),
      rpc: () => Promise.resolve({ data: null, error: null }),
      auth: { getUser: () => Promise.resolve({ data: { user: null }, error: null }) },
    }

    const { createAttendanceModule } = await import('@/lib/services/attendance-module')
    const attendance = createAttendanceModule(fakeClient as never)

    expect(attendance.immutability).toBeDefined()
    expect(attendance.locking).toBeDefined()
  })
})
