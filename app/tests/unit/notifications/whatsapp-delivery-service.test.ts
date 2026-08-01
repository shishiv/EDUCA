import { describe, expect, it } from 'vitest'
import { WhatsAppLocalAdapter } from '@/lib/notifications/whatsapp-local-adapter'
import type { WhatsAppNotificationGateway } from '@/lib/notifications/whatsapp-gateway'
import {
  applyWhatsAppDeliveryStatus,
  buildWhatsAppIdempotencyKey,
  clampMaxAttempts,
  deliverDueWhatsAppNotifications,
  enqueueWhatsAppNotification,
  whatsAppRetryBackoffMs,
} from '@/lib/notifications/whatsapp-delivery-service'
import { createFakeWhatsAppSupabase, asDeliveryStatus, type FakeTables } from './fake-whatsapp-supabase'

function seedGuardianEnvironment(tables: FakeTables) {
  tables.responsaveis.rows.push({
    id: '10000000-0000-0000-0000-000000000001',
    telefone: '(31) 99999-8888',
    escola_id: '50000000-0000-0000-0000-000000000001',
  })
  tables.alunos.rows.push({
    id: '20000000-0000-0000-0000-000000000001',
    nome_completo: 'Aluno Sintetico',
    escola_id: '50000000-0000-0000-0000-000000000001',
  })
  tables.escolas.rows.push({
    id: '50000000-0000-0000-0000-000000000001',
    nome: 'Escola Sintetica',
  })
  tables.whatsapp_notification_optins.rows.push({
    id: 'optin-1',
    responsavel_id: '10000000-0000-0000-0000-000000000001',
    escola_id: '50000000-0000-0000-0000-000000000001',
    canal: 'whatsapp',
    opt_in: true,
    consentido_em: '2026-08-01T10:00:00Z',
    cancelado_em: null,
  })
}

const ENQUEUE_INPUT = {
  responsavelId: '10000000-0000-0000-0000-000000000001',
  alunoId: '20000000-0000-0000-0000-000000000001',
  escolaId: '50000000-0000-0000-0000-000000000001',
  tipo: 'presenca_falta' as const,
  dataAula: '2026-08-01',
}

/** Makes every queued row due before the frozen test clock. */
function markMessagesDue(tables: FakeTables) {
  for (const row of tables.whatsapp_notification_messages.rows) {
    row.proxima_tentativa = '2026-08-01T11:00:00.000Z'
  }
}

describe('whatsapp idempotency and backoff helpers', () => {
  it('builds stable idempotency keys per guardian/student/type/date', () => {
    const a = buildWhatsAppIdempotencyKey(ENQUEUE_INPUT)
    const b = buildWhatsAppIdempotencyKey({ ...ENQUEUE_INPUT, dataAula: '2026-08-02' })
    expect(a).toMatch(/^[0-9a-f]{64}$/)
    expect(a).not.toBe(b)
  })

  it('computes exponential backoff capped at 24h', () => {
    expect(whatsAppRetryBackoffMs(1, 1000, 5)).toBe(1000)
    expect(whatsAppRetryBackoffMs(2, 1000, 5)).toBe(5000)
    expect(whatsAppRetryBackoffMs(3, 1000, 5)).toBe(25000)
    expect(whatsAppRetryBackoffMs(99, 1000, 5)).toBe(24 * 60 * 60 * 1000)
  })

  it('clamps max attempts to the 1..5 tripwire', () => {
    expect(clampMaxAttempts(undefined)).toBe(3)
    expect(clampMaxAttempts(0)).toBe(1)
    expect(clampMaxAttempts(99)).toBe(5)
  })
})

describe('whatsapp enqueue idempotency', () => {
  it('dedupes repeated enqueues by idempotency key', async () => {
    const { supabase, tables } = createFakeWhatsAppSupabase()
    const first = await enqueueWhatsAppNotification(supabase, ENQUEUE_INPUT)
    const second = await enqueueWhatsAppNotification(supabase, ENQUEUE_INPUT)

    expect(first.duplicated).toBe(false)
    expect(second.duplicated).toBe(true)
    expect(second.messageId).toBe(first.messageId)
    expect(tables.whatsapp_notification_messages.rows).toHaveLength(1)
  })

  it('stores no message body and no phone on the row', async () => {
    const { supabase, tables } = createFakeWhatsAppSupabase()
    await enqueueWhatsAppNotification(supabase, ENQUEUE_INPUT)
    const row = tables.whatsapp_notification_messages.rows[0]
    expect(Object.keys(row)).not.toContain('telefone')
    expect(Object.keys(row)).not.toContain('corpo')
  })
})

describe('whatsapp delivery with the local fake', () => {
  it('delivers due messages end to end and records masked receipts', async () => {
    const { supabase, tables } = createFakeWhatsAppSupabase()
    seedGuardianEnvironment(tables)
    await enqueueWhatsAppNotification(supabase, ENQUEUE_INPUT)

    const result = await deliverDueWhatsAppNotifications(supabase, {
      gateway: new WhatsAppLocalAdapter({}),
    })

    expect(result.attempted).toBe(1)
    expect(result.receipts).toHaveLength(1)
    expect(result.receipts[0]).toContain('outcome=delivered')
    expect(result.receipts[0]).not.toContain('5531999998888')

    const row = tables.whatsapp_notification_messages.rows[0]
    expect(row.status).toBe('delivered')
    expect(row.entregue_em).toBeTruthy()
    expect(row.external_message_id).toMatch(/^wamid\.fake\./)
  })

  it('blocks delivery when the guardian withdrew consent mid-queue', async () => {
    const { supabase, tables } = createFakeWhatsAppSupabase()
    seedGuardianEnvironment(tables)
    await enqueueWhatsAppNotification(supabase, ENQUEUE_INPUT)
    tables.whatsapp_notification_optins.rows[0].opt_in = false

    const result = await deliverDueWhatsAppNotifications(supabase, {
      gateway: new WhatsAppLocalAdapter({}),
    })

    expect(result.receipts[0]).toContain('motivo=opt_out')
    expect(tables.whatsapp_notification_messages.rows[0].status).toBe('blocked')
    expect(tables.whatsapp_notification_messages.rows[0].bloqueado_motivo).toBe('opt_out')
  })

  it('blocks delivery when the guardian has no valid phone', async () => {
    const { supabase, tables } = createFakeWhatsAppSupabase()
    seedGuardianEnvironment(tables)
    tables.responsaveis.rows[0].telefone = '123'
    await enqueueWhatsAppNotification(supabase, ENQUEUE_INPUT)

    const result = await deliverDueWhatsAppNotifications(supabase, {
      gateway: new WhatsAppLocalAdapter({}),
    })

    expect(result.receipts[0]).toContain('motivo=recipient_missing')
    expect(tables.whatsapp_notification_messages.rows[0].bloqueado_motivo).toBe('recipient_missing')
  })

  it('schedules a retry with backoff on transient failures', async () => {
    const { supabase, tables } = createFakeWhatsAppSupabase()
    seedGuardianEnvironment(tables)
    await enqueueWhatsAppNotification(supabase, ENQUEUE_INPUT)
    markMessagesDue(tables)

    const now = new Date('2026-08-01T12:00:00Z')
    const gateway = new WhatsAppLocalAdapter({ mode: 'fail' })
    await deliverDueWhatsAppNotifications(supabase, { gateway, now: () => now, retryBaseDelayMs: 1000 })

    const row = tables.whatsapp_notification_messages.rows[0]
    expect(row.status).toBe('queued')
    expect(row.tentativas).toBe(1)
    expect(row.proxima_tentativa).toBe(new Date('2026-08-01T12:00:01Z').toISOString())
  })

  it('marks failed after exhausting all attempts', async () => {
    const { supabase, tables } = createFakeWhatsAppSupabase()
    seedGuardianEnvironment(tables)
    await enqueueWhatsAppNotification(supabase, ENQUEUE_INPUT)
    markMessagesDue(tables)

    const now = new Date('2026-08-01T12:00:00Z')
    const gateway = new WhatsAppLocalAdapter({ mode: 'fail' })
    const deps = { gateway, now: () => now, maxAttempts: 2, retryBaseDelayMs: 1000 }

    await deliverDueWhatsAppNotifications(supabase, deps)
    const rowAfterFirst = tables.whatsapp_notification_messages.rows[0]
    // Second attempt happens after the backoff elapses.
    const secondNow = new Date(rowAfterFirst.proxima_tentativa as string)
    const secondAttempt = await deliverDueWhatsAppNotifications(supabase, {
      ...deps,
      now: () => secondNow,
    })

    expect(secondAttempt.attempted).toBe(1)
    const row = tables.whatsapp_notification_messages.rows[0]
    expect(row.status).toBe('failed')
    expect(row.ultimo_erro_codigo).toBe('tentativas_esgotadas')
    expect(row.falhou_em).toBeTruthy()
  })

  it('recovers after a transient failure when the next attempt succeeds', async () => {
    const { supabase, tables } = createFakeWhatsAppSupabase()
    seedGuardianEnvironment(tables)
    await enqueueWhatsAppNotification(supabase, ENQUEUE_INPUT)
    markMessagesDue(tables)

    const now = new Date('2026-08-01T12:00:00Z')
    const deps = { now: () => now, maxAttempts: 3, retryBaseDelayMs: 1000 }
    await deliverDueWhatsAppNotifications(supabase, { ...deps, gateway: new WhatsAppLocalAdapter({ mode: 'fail' }) })

    const rowAfterFirst = tables.whatsapp_notification_messages.rows[0]
    const secondNow = new Date(rowAfterFirst.proxima_tentativa as string)
    const recovery = await deliverDueWhatsAppNotifications(supabase, {
      ...deps,
      now: () => secondNow,
      gateway: new WhatsAppLocalAdapter({ mode: 'deliver' }),
    })

    expect(recovery.attempted).toBe(1)
    expect(tables.whatsapp_notification_messages.rows[0].status).toBe('delivered')
  })
})

describe('whatsapp delivery status webhook application', () => {
  const acceptingGateway: WhatsAppNotificationGateway = {
    sendAttendanceNotification: async () => ({
      outcome: 'accepted',
      externalMessageId: 'wamid.meta.test.1',
      receipt: '[whatsapp:meta] accepted',
    }),
    verifyWebhookSignature: () => false,
    verifyWebhookVerifyToken: () => false,
    identity: () => ({ adapterName: 'meta', mode: 'meta', pilotForced: false }),
  }

  async function acceptedRow() {
    const { supabase, tables } = createFakeWhatsAppSupabase()
    seedGuardianEnvironment(tables)
    await enqueueWhatsAppNotification(supabase, ENQUEUE_INPUT)
    await deliverDueWhatsAppNotifications(supabase, { gateway: acceptingGateway })
    return { supabase, tables }
  }

  it('applies sent -> delivered -> read monotonically', async () => {
    const { supabase, tables } = await acceptedRow()
    const wamid = tables.whatsapp_notification_messages.rows[0].external_message_id as string

    expect(await applyWhatsAppDeliveryStatus(supabase, asDeliveryStatus({ externalMessageId: wamid, status: 'sent' }))).toBe(true)
    expect(await applyWhatsAppDeliveryStatus(supabase, asDeliveryStatus({ externalMessageId: wamid, status: 'delivered' }))).toBe(true)
    expect(await applyWhatsAppDeliveryStatus(supabase, asDeliveryStatus({ externalMessageId: wamid, status: 'read' }))).toBe(true)

    const row = tables.whatsapp_notification_messages.rows[0]
    expect(row.status).toBe('read')
    expect(row.entregue_em).toBeTruthy()
    expect(row.lido_em).toBeTruthy()
  })

  it('ignores duplicates and regressions', async () => {
    const { supabase, tables } = await acceptedRow()
    const wamid = tables.whatsapp_notification_messages.rows[0].external_message_id as string

    expect(await applyWhatsAppDeliveryStatus(supabase, asDeliveryStatus({ externalMessageId: wamid, status: 'delivered' }))).toBe(true)
    expect(await applyWhatsAppDeliveryStatus(supabase, asDeliveryStatus({ externalMessageId: wamid, status: 'delivered' }))).toBe(false)
    expect(await applyWhatsAppDeliveryStatus(supabase, asDeliveryStatus({ externalMessageId: wamid, status: 'sent' }))).toBe(false)
  })

  it('records failed receipts with the error code and becomes terminal', async () => {
    const { supabase, tables } = await acceptedRow()
    const wamid = tables.whatsapp_notification_messages.rows[0].external_message_id as string

    expect(await applyWhatsAppDeliveryStatus(supabase, asDeliveryStatus({ externalMessageId: wamid, status: 'failed', errorCode: 131026 }))).toBe(true)
    expect(await applyWhatsAppDeliveryStatus(supabase, asDeliveryStatus({ externalMessageId: wamid, status: 'delivered' }))).toBe(false)

    const row = tables.whatsapp_notification_messages.rows[0]
    expect(row.status).toBe('failed')
    expect(row.ultimo_erro_codigo).toBe('131026')
  })

  it('ignores receipts for messages it never sent', async () => {
    const { supabase } = await acceptedRow()
    expect(await applyWhatsAppDeliveryStatus(supabase, asDeliveryStatus({ externalMessageId: 'wamid.desconhecido' }))).toBe(false)
  })
})
