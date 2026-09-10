import { describe, expect, it } from 'vitest'
import { WhatsAppLocalAdapter } from '@/lib/notifications/whatsapp-local-adapter'
import { WhatsAppTransientDeliveryError, type WhatsAppNotificationGateway } from '@/lib/notifications/whatsapp-gateway'
import {
  applyWhatsAppDeliveryStatus,
  buildWhatsAppIdempotencyKey,
  claimWhatsAppNotificationById,
  clampMaxAttempts,
  deliverDueWhatsAppNotifications,
  enqueueWhatsAppNotification,
  whatsAppRetryBackoffMs,
} from '@/lib/notifications/whatsapp-delivery-service'
import { createFakeWhatsAppSupabase, asDeliveryStatus, type FakeTables } from './fake-whatsapp-supabase'

const ACTOR_ID = '90000000-0000-0000-0000-000000000001'

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
  tables.aluno_responsaveis.rows.push({
    id: 'link-1',
    aluno_id: '20000000-0000-0000-0000-000000000001',
    responsavel_id: '10000000-0000-0000-0000-000000000001',
    ativo: true,
  })
  tables.attendance_contexts.rows.push({
    id: 'attendance-1',
    aluno_id: '20000000-0000-0000-0000-000000000001',
    escola_id: '50000000-0000-0000-0000-000000000001',
    data_aula: '2026-08-01',
    status_presenca: 'F',
  })
  tables.whatsapp_notification_optins.rows.push({
    id: 'optin-1',
    responsavel_id: '10000000-0000-0000-0000-000000000001',
    escola_id: '50000000-0000-0000-0000-000000000001',
    canal: 'whatsapp',
    opt_in: true,
    consentido_em: '2026-08-01T10:00:00Z',
    cancelado_em: null,
    registrado_por: 'director-1',
    created_at: '2026-08-01T10:00:00Z',
    updated_at: '2026-08-01T10:00:00Z',
  })
}

const ENQUEUE_INPUT = {
  responsavelId: '10000000-0000-0000-0000-000000000001',
  alunoId: '20000000-0000-0000-0000-000000000001',
  tipo: 'presenca_falta' as const,
  dataAula: '2026-08-01',
  criadoPor: ACTOR_ID,
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
    const { supabase, tables, auditEvents } = createFakeWhatsAppSupabase({ actorId: ACTOR_ID })
    seedGuardianEnvironment(tables)
    const first = await enqueueWhatsAppNotification(supabase, ENQUEUE_INPUT)
    const second = await enqueueWhatsAppNotification(supabase, ENQUEUE_INPUT)

    expect(first.duplicated).toBe(false)
    expect(second.duplicated).toBe(true)
    expect(second.messageId).toBe(first.messageId)
    expect(tables.whatsapp_notification_messages.rows).toHaveLength(1)
    expect(first.auditReceiptId).toMatch(/^[0-9a-f-]{36}$/)
    expect(second.auditReceiptId).toMatch(/^[0-9a-f-]{36}$/)
    expect(auditEvents.map(event => event.p_event_type)).toEqual([
      'whatsapp_notification_enqueued',
      'whatsapp_notification_enqueue_replayed',
    ])
  })

  it('stores no message body and no phone on the row', async () => {
    const { supabase, tables } = createFakeWhatsAppSupabase({ actorId: ACTOR_ID })
    seedGuardianEnvironment(tables)
    await enqueueWhatsAppNotification(supabase, ENQUEUE_INPUT)
    const row = tables.whatsapp_notification_messages.rows[0]
    expect(Object.keys(row)).not.toContain('telefone')
    expect(Object.keys(row)).not.toContain('corpo')
  })

  it('rejects enqueue without an active guardian relationship and attendance context', async () => {
    const { supabase, tables } = createFakeWhatsAppSupabase({ actorId: ACTOR_ID })
    seedGuardianEnvironment(tables)
    tables.aluno_responsaveis.rows.length = 0

    await expect(enqueueWhatsAppNotification(supabase, ENQUEUE_INPUT)).rejects.toThrow(
      'WHATSAPP_ENQUEUE_CONTEXT_DENIED',
    )
    expect(tables.whatsapp_notification_messages.rows).toEqual([])
  })

  it('rolls back enqueue when its audit receipt cannot be stored', async () => {
    const { supabase, tables } = createFakeWhatsAppSupabase({ actorId: ACTOR_ID, failEnqueueAudit: true })
    seedGuardianEnvironment(tables)

    await expect(enqueueWhatsAppNotification(supabase, ENQUEUE_INPUT)).rejects.toThrow('PILOT_AUDIT_WRITE_FAILED')
    expect(tables.whatsapp_notification_messages.rows).toEqual([])
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
    const { supabase, tables, setDatabaseNow } = createFakeWhatsAppSupabase()
    seedGuardianEnvironment(tables)
    await enqueueWhatsAppNotification(supabase, ENQUEUE_INPUT)
    markMessagesDue(tables)

    const now = new Date('2026-08-01T12:00:00Z')
    setDatabaseNow(now)
    const gateway = new WhatsAppLocalAdapter({ mode: 'fail' })
    await deliverDueWhatsAppNotifications(supabase, { gateway, retryBaseDelayMs: 1000 })

    const row = tables.whatsapp_notification_messages.rows[0]
    expect(row.status).toBe('queued')
    expect(row.tentativas).toBe(1)
    expect(row.proxima_tentativa).toBe(new Date('2026-08-01T12:00:01Z').toISOString())
  })

  it('marks failed after exhausting all attempts', async () => {
    const { supabase, tables, setDatabaseNow } = createFakeWhatsAppSupabase()
    seedGuardianEnvironment(tables)
    await enqueueWhatsAppNotification(supabase, ENQUEUE_INPUT)
    markMessagesDue(tables)

    const now = new Date('2026-08-01T12:00:00Z')
    setDatabaseNow(now)
    const gateway = new WhatsAppLocalAdapter({ mode: 'fail' })
    const deps = { gateway, maxAttempts: 2, retryBaseDelayMs: 1000 }

    await deliverDueWhatsAppNotifications(supabase, deps)
    const rowAfterFirst = tables.whatsapp_notification_messages.rows[0]
    // Second attempt happens after the backoff elapses.
    const secondNow = new Date(rowAfterFirst.proxima_tentativa)
    setDatabaseNow(secondNow)
    const secondAttempt = await deliverDueWhatsAppNotifications(supabase, deps)

    expect(secondAttempt.attempted).toBe(1)
    const row = tables.whatsapp_notification_messages.rows[0]
    expect(row.status).toBe('failed')
    expect(row.ultimo_erro_codigo).toBe('tentativas_esgotadas')
    expect(row.falhou_em).toBeTruthy()
  })

  it('recovers after a transient failure when the next attempt succeeds', async () => {
    const { supabase, tables, setDatabaseNow } = createFakeWhatsAppSupabase()
    seedGuardianEnvironment(tables)
    await enqueueWhatsAppNotification(supabase, ENQUEUE_INPUT)
    markMessagesDue(tables)

    const now = new Date('2026-08-01T12:00:00Z')
    setDatabaseNow(now)
    const deps = { maxAttempts: 3, retryBaseDelayMs: 1000 }
    await deliverDueWhatsAppNotifications(supabase, { ...deps, gateway: new WhatsAppLocalAdapter({ mode: 'fail' }) })

    const rowAfterFirst = tables.whatsapp_notification_messages.rows[0]
    const secondNow = new Date(rowAfterFirst.proxima_tentativa)
    setDatabaseNow(secondNow)
    const recovery = await deliverDueWhatsAppNotifications(supabase, {
      ...deps,
      gateway: new WhatsAppLocalAdapter({ mode: 'deliver' }),
    })

    expect(recovery.attempted).toBe(1)
    expect(tables.whatsapp_notification_messages.rows[0].status).toBe('delivered')
  })

  it('claims a due row once across concurrent drainers', async () => {
    const { supabase, tables } = createFakeWhatsAppSupabase()
    seedGuardianEnvironment(tables)
    await enqueueWhatsAppNotification(supabase, ENQUEUE_INPUT)
    markMessagesDue(tables)
    let sends = 0
    const gateway: WhatsAppNotificationGateway = {
      sendAttendanceNotification: async () => {
        sends += 1
        return { outcome: 'delivered', externalMessageId: 'wamid.concurrent', receipt: 'delivered' }
      },
      verifyWebhookSignature: () => false,
      verifyWebhookVerifyToken: () => false,
      identity: () => ({ adapterName: 'local-fake', mode: 'concurrency-test', pilotForced: true }),
    }

    const [first, second] = await Promise.all([
      deliverDueWhatsAppNotifications(supabase, { gateway }),
      deliverDueWhatsAppNotifications(supabase, { gateway }),
    ])

    expect(first.attempted + second.attempted).toBe(1)
    expect(sends).toBe(1)
    expect(tables.whatsapp_notification_messages.rows[0].status).toBe('delivered')
  })

  it('marks an expired claim indeterminate without sending it again', async () => {
    const { supabase, tables, setDatabaseNow } = createFakeWhatsAppSupabase()
    seedGuardianEnvironment(tables)
    setDatabaseNow('2026-08-01T12:00:00Z')
    const enqueued = await enqueueWhatsAppNotification(supabase, ENQUEUE_INPUT)
    const claim = await claimWhatsAppNotificationById(supabase, enqueued.messageId, 3)
    if (!claim) throw new Error('Expected the row to be claimed')

    setDatabaseNow('2026-08-01T12:05:01Z')
    const expiredCompletion = await supabase.rpc('complete_whatsapp_notification_delivery', {
      p_message_id: claim.id,
      p_claim_token: claim.claim_token,
      p_outcome: 'delivered',
      p_external_message_id: 'wamid.expired',
      p_block_reason: null,
      p_failure_code: null,
      p_retry_delay_seconds: null,
    })
    expect(expiredCompletion.error).toBeNull()
    expect(expiredCompletion.data).toBe(false)

    let sends = 0
    const gateway: WhatsAppNotificationGateway = {
      sendAttendanceNotification: async () => {
        sends += 1
        return { outcome: 'delivered', externalMessageId: 'wamid.duplicate', receipt: 'delivered' }
      },
      verifyWebhookSignature: () => false,
      verifyWebhookVerifyToken: () => false,
      identity: () => ({ adapterName: 'local-fake', mode: 'lease-test', pilotForced: true }),
    }
    const recovered = await deliverDueWhatsAppNotifications(supabase, { gateway })
    expect(recovered.attempted).toBe(0)
    expect(sends).toBe(0)
    expect(tables.whatsapp_notification_messages.rows[0].status).toBe('delivery_unknown')
    expect(tables.whatsapp_notification_messages.rows[0].ultimo_erro_codigo).toBeNull()
    expect(tables.whatsapp_notification_messages.rows[0].reconciliation_required_at).toBeTruthy()
  })

  it('holds an ambiguous gateway failure for reconciliation instead of retrying', async () => {
    const { supabase, tables } = createFakeWhatsAppSupabase({ actorId: ACTOR_ID })
    seedGuardianEnvironment(tables)
    await enqueueWhatsAppNotification(supabase, ENQUEUE_INPUT)
    const gateway: WhatsAppNotificationGateway = {
      sendAttendanceNotification: async () => {
        throw new WhatsAppTransientDeliveryError('network response lost')
      },
      verifyWebhookSignature: () => false,
      verifyWebhookVerifyToken: () => false,
      identity: () => ({ adapterName: 'meta', mode: 'meta', pilotForced: false }),
    }

    const result = await deliverDueWhatsAppNotifications(supabase, { gateway })

    expect(result.attempted).toBe(1)
    expect(result.receipts[0]).toContain('outcome=delivery_unknown')
    expect(tables.whatsapp_notification_messages.rows[0].status).toBe('delivery_unknown')
  })

  it('holds even an expired final claim for reconciliation', async () => {
    const { supabase, tables, setDatabaseNow } = createFakeWhatsAppSupabase()
    seedGuardianEnvironment(tables)
    setDatabaseNow('2026-08-01T12:00:00Z')
    await enqueueWhatsAppNotification(supabase, ENQUEUE_INPUT)
    const row = tables.whatsapp_notification_messages.rows[0]
    row.status = 'processing'
    row.tentativas = 5
    row.claim_token = 'expired-final-claim'
    row.claim_expires_at = '2026-08-01T11:59:59Z'

    const result = await deliverDueWhatsAppNotifications(supabase, {
      gateway: new WhatsAppLocalAdapter({}),
      maxAttempts: 5,
    })

    expect(result.attempted).toBe(0)
    expect(row.status).toBe('delivery_unknown')
    expect(row.ultimo_erro_codigo).toBeNull()
    expect(row.reconciliation_required_at).toBeTruthy()
    expect(row.claim_token).toBeNull()
    expect(row.claim_expires_at).toBeNull()
  })

  it('keeps permanent failures terminal and out of later drains', async () => {
    const { supabase, tables } = createFakeWhatsAppSupabase()
    seedGuardianEnvironment(tables)
    await enqueueWhatsAppNotification(supabase, ENQUEUE_INPUT)
    markMessagesDue(tables)

    const first = await deliverDueWhatsAppNotifications(supabase, {
      gateway: new WhatsAppLocalAdapter({ mode: 'reject' }),
    })
    const second = await deliverDueWhatsAppNotifications(supabase, {
      gateway: new WhatsAppLocalAdapter({ mode: 'deliver' }),
    })

    expect(first.attempted).toBe(1)
    expect(second.attempted).toBe(0)
    expect(tables.whatsapp_notification_messages.rows[0].status).toBe('failed')
    expect(tables.whatsapp_notification_messages.rows[0].ultimo_erro_codigo).toBe('meta_rejected')
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
    const wamid = requireExternalMessageId(tables.whatsapp_notification_messages.rows[0].external_message_id)

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
    const wamid = requireExternalMessageId(tables.whatsapp_notification_messages.rows[0].external_message_id)

    expect(await applyWhatsAppDeliveryStatus(supabase, asDeliveryStatus({ externalMessageId: wamid, status: 'delivered' }))).toBe(true)
    expect(await applyWhatsAppDeliveryStatus(supabase, asDeliveryStatus({ externalMessageId: wamid, status: 'delivered' }))).toBe(false)
    expect(await applyWhatsAppDeliveryStatus(supabase, asDeliveryStatus({ externalMessageId: wamid, status: 'sent' }))).toBe(false)
  })

  it('never regresses read delivery to failed', async () => {
    const { supabase, tables } = await acceptedRow()
    const wamid = requireExternalMessageId(tables.whatsapp_notification_messages.rows[0].external_message_id)

    expect(await applyWhatsAppDeliveryStatus(supabase, asDeliveryStatus({ externalMessageId: wamid, status: 'read' }))).toBe(true)
    expect(await applyWhatsAppDeliveryStatus(supabase, asDeliveryStatus({ externalMessageId: wamid, status: 'failed', errorCode: 131026 }))).toBe(false)
    expect(tables.whatsapp_notification_messages.rows[0].status).toBe('read')
    expect(tables.whatsapp_notification_messages.rows[0].ultimo_erro_codigo).toBeNull()
  })

  it('records failed receipts with the error code and becomes terminal', async () => {
    const { supabase, tables } = await acceptedRow()
    const wamid = requireExternalMessageId(tables.whatsapp_notification_messages.rows[0].external_message_id)

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

function requireExternalMessageId(value: string | null): string {
  if (!value) throw new Error('Expected an external message id')
  return value
}
