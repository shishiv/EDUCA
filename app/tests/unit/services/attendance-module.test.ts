import { describe, it, expect } from 'vitest'
import { createAttendanceModule } from '@/lib/services/attendance-module'
import { createMockSupabaseClient } from './mock-supabase-client'

describe('AttendanceModule seam', () => {
  it('routes attendance database calls through the injected client', async () => {
    // The injected client is the production adapter's stand-in: createClient()
    // from '@/lib/supabase/server' carries the authenticated session cookies.
    // If the services constructed their own browser client, this spy would
    // never be reached.
    const client = createMockSupabaseClient()
    const attendance = createAttendanceModule(client)

    await attendance.immutability.validateModificationPermission('sessao-1', 'user-1', 'UPDATE')

    expect(client.from).toHaveBeenCalledWith('sessoes_aula')
  })

  it('routes locking status queries through the injected client', async () => {
    const client = createMockSupabaseClient()
    const attendance = createAttendanceModule(client)

    await attendance.locking.getSessionLockingStatus('sessao-1').catch(() => undefined)

    expect(client.from).toHaveBeenCalledWith('sessoes_aula')
  })

  it('binds workflow sessions to the injected client', async () => {
    const client = createMockSupabaseClient()
    const attendance = createAttendanceModule(client)
    const workflow = attendance.createWorkflow('turma-1', 'professor-1', '2026-01-19')

    await workflow.executeTransition('open_session')

    // validateOpeningPrerequisites queries sessoes_aula and turmas
    expect(client.from).toHaveBeenCalledWith('sessoes_aula')
    expect(client.from).toHaveBeenCalledWith('turmas')
  })

  it('shares one client across all three services', () => {
    const client = createMockSupabaseClient()
    const attendance = createAttendanceModule(client)

    expect(attendance.immutability).toBeDefined()
    expect(attendance.locking).toBeDefined()
    expect(typeof attendance.createWorkflow).toBe('function')
  })
})
