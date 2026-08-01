import { describe, expect, it } from 'vitest'
import {
  getGuardianWhatsAppOptIn,
  setGuardianWhatsAppOptIn,
} from '@/lib/notifications/whatsapp-optin-service'
import { createFakeWhatsAppSupabase, type FakeTables } from './fake-whatsapp-supabase'

const GUARDIAN_ID = '10000000-0000-0000-0000-000000000001'
const SCHOOL_ID = '50000000-0000-0000-0000-000000000001'

function seedGuardian(tables: FakeTables) {
  tables.responsaveis.rows.push({
    id: GUARDIAN_ID,
    telefone: '(31) 99999-8888',
    escola_id: SCHOOL_ID,
  })
}

describe('whatsapp opt-in service', () => {
  it('records explicit consent with timestamps and an audit event', async () => {
    const { supabase, tables, auditEvents } = createFakeWhatsAppSupabase()
    seedGuardian(tables)

    const state = await setGuardianWhatsAppOptIn(supabase, { id: 'actor-1' }, { responsavelId: GUARDIAN_ID, optIn: true })

    expect(state.optIn).toBe(true)
    expect(state.consentidoEm).toBeTruthy()
    expect(state.canceladoEm).toBeNull()
    expect(tables.whatsapp_notification_optins.rows[0].escola_id).toBe(SCHOOL_ID)
    expect(auditEvents).toHaveLength(1)
    expect(auditEvents[0].p_event_type).toBe('whatsapp_optin_changed')
    expect(auditEvents[0].p_metadata).toEqual({ canal: 'whatsapp', opt_in: true })
    expect(JSON.stringify(auditEvents)).not.toContain('telefone')
  })

  it('withdraws consent keeping the consent history', async () => {
    const { supabase, tables } = createFakeWhatsAppSupabase()
    seedGuardian(tables)
    await setGuardianWhatsAppOptIn(supabase, { id: 'actor-1' }, { responsavelId: GUARDIAN_ID, optIn: true })

    const state = await setGuardianWhatsAppOptIn(supabase, { id: 'actor-1' }, { responsavelId: GUARDIAN_ID, optIn: false })

    expect(state.optIn).toBe(false)
    expect(state.canceladoEm).toBeTruthy()
    expect(tables.whatsapp_notification_optins.rows).toHaveLength(1)
  })

  it('rejects guardians outside the actor scope', async () => {
    const { supabase, tables } = createFakeWhatsAppSupabase()
    seedGuardian(tables)
    await expect(
      setGuardianWhatsAppOptIn(
        supabase,
        { id: 'actor-1' },
        { responsavelId: '99999999-0000-0000-0000-000000000099', optIn: true }
      )
    ).rejects.toThrow('PILOT_NOTIFICATION_SCHOOL_DENIED')
  })

  it('defaults to no consent when no row exists', async () => {
    const { supabase, tables } = createFakeWhatsAppSupabase()
    seedGuardian(tables)
    expect(await getGuardianWhatsAppOptIn(supabase, GUARDIAN_ID)).toBe(false)
  })

  it('reports false after explicit withdrawal', async () => {
    const { supabase, tables } = createFakeWhatsAppSupabase()
    seedGuardian(tables)
    await setGuardianWhatsAppOptIn(supabase, { id: 'actor-1' }, { responsavelId: GUARDIAN_ID, optIn: true })
    await setGuardianWhatsAppOptIn(supabase, { id: 'actor-1' }, { responsavelId: GUARDIAN_ID, optIn: false })
    expect(await getGuardianWhatsAppOptIn(supabase, GUARDIAN_ID)).toBe(false)
  })
})
