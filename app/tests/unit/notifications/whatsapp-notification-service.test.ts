/**
 * Local end-to-end path for WhatsApp attendance notifications.
 *
 * Drives the real module stack - opt-in service, notification service,
 * idempotent enqueue, local fake delivery, webhook signature verification,
 * delivery status application - without any network or real credentials.
 * This is the deterministic rehearsal for the production Meta path.
 */

import { createHmac } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { WhatsAppLocalAdapter, WHATSAPP_LOCAL_APP_SECRET } from '@/lib/notifications/whatsapp-local-adapter'
import { setGuardianWhatsAppOptIn } from '@/lib/notifications/whatsapp-optin-service'
import { notifyGuardianAttendanceAlert } from '@/lib/notifications/whatsapp-notification-service'
import { applyWhatsAppDeliveryStatus } from '@/lib/notifications/whatsapp-delivery-service'
import {
  verifyWhatsAppWebhookSignature,
  whatsappWebhookEnvelopeSchema,
  extractWhatsAppDeliveryStatuses,
} from '@/lib/notifications/whatsapp-webhook-payload'
import { createFakeWhatsAppSupabase, asDeliveryStatus, type FakeTables } from './fake-whatsapp-supabase'

const GUARDIAN_ID = '10000000-0000-0000-0000-000000000001'
const STUDENT_ID = '20000000-0000-0000-0000-000000000001'
const SCHOOL_ID = '50000000-0000-0000-0000-000000000001'

function seedSchool(tables: FakeTables) {
  tables.escolas.rows.push({ id: SCHOOL_ID, nome: 'Escola Sintetica' })
  tables.responsaveis.rows.push({
    id: GUARDIAN_ID,
    telefone: '(31) 99999-8888',
    escola_id: SCHOOL_ID,
  })
  tables.alunos.rows.push({
    id: STUDENT_ID,
    nome_completo: 'Aluno Sintetico',
    escola_id: SCHOOL_ID,
  })
  tables.aluno_responsaveis.rows.push({
    id: 'link-1',
    aluno_id: STUDENT_ID,
    responsavel_id: GUARDIAN_ID,
    ativo: true,
  })
}

function signedEnvelope(body: unknown): { rawBody: string; signature: string } {
  const rawBody = JSON.stringify(body)
  const signature = `sha256=${createHmac('sha256', WHATSAPP_LOCAL_APP_SECRET).update(rawBody, 'utf8').digest('hex')}`
  return { rawBody, signature }
}

describe('whatsapp notification local end-to-end path', () => {
  it('consent -> notify -> fake delivery -> webhook receipts -> final state', async () => {
    const { supabase, tables } = createFakeWhatsAppSupabase()
    seedSchool(tables)
    const gateway = new WhatsAppLocalAdapter({})
    const deps = { gateway }

    // 1. Explicit guardian opt-in.
    await setGuardianWhatsAppOptIn(supabase, { id: 'actor-1' }, { responsavelId: GUARDIAN_ID, optIn: true })

    // 2. Attendance alert trigger (pilot staff).
    const result = await notifyGuardianAttendanceAlert(supabase, deps, {
      responsavelId: GUARDIAN_ID,
      alunoId: STUDENT_ID,
      dataAula: '2026-08-03',
    })

    expect(result.outcome).toBe('delivered')
    expect(result.receipt).toContain('outcome=delivered')
    expect(result.receipt).not.toContain('5531999998888')
    expect(result.receipt).not.toContain('Aluno Sintetico')

    const row = tables.whatsapp_notification_messages.rows[0]
    expect(row.status).toBe('delivered')
    const wamid = row.external_message_id as string

    // 3. Webhook signature validation rejects tampering.
    const envelope = {
      object: 'whatsapp_business_account',
      entry: [
        {
          id: 'wba-1',
          changes: [
            {
              field: 'messages',
              value: {
                messaging_product: 'whatsapp',
                metadata: { display_phone_number: '5531999998888', phone_number_id: '106540352242922' },
                statuses: [
                  {
                    id: wamid,
                    status: 'read',
                    timestamp: '1750000000',
                    recipient_id: '5531999998888',
                  },
                ],
              },
            },
          ],
        },
      ],
    }
    const { rawBody, signature } = signedEnvelope(envelope)
    expect(verifyWhatsAppWebhookSignature(rawBody, signature, WHATSAPP_LOCAL_APP_SECRET)).toBe(true)
    expect(verifyWhatsAppWebhookSignature(rawBody, 'sha256=0'.repeat(64), WHATSAPP_LOCAL_APP_SECRET)).toBe(false)

    // 4. Webhook status application (route handler does this with admin client).
    const parsed = whatsappWebhookEnvelopeSchema.parse(JSON.parse(rawBody))
    const statuses = extractWhatsAppDeliveryStatuses(parsed)
    expect(statuses).toHaveLength(1)
    for (const status of statuses) {
      await applyWhatsAppDeliveryStatus(supabase, status)
    }

    // 5. Final state: read, with timestamps, and still no phone/body persisted.
    const finalRow = tables.whatsapp_notification_messages.rows[0]
    expect(finalRow.status).toBe('read')
    expect(finalRow.lido_em).toBeTruthy()
    expect(Object.keys(finalRow)).not.toContain('telefone')
    expect(Object.keys(finalRow)).not.toContain('corpo')
  })

  it('blocks before any send when the guardian never consented', async () => {
    const { supabase, tables } = createFakeWhatsAppSupabase()
    seedSchool(tables)
    const gateway = new WhatsAppLocalAdapter({})

    const result = await notifyGuardianAttendanceAlert(supabase, { gateway }, {
      responsavelId: GUARDIAN_ID,
      alunoId: STUDENT_ID,
      dataAula: '2026-08-03',
    })

    expect(result.outcome).toBe('blocked')
    expect(result.receipt).toContain('motivo=opt_out')
    expect(tables.whatsapp_notification_messages.rows[0].status).toBe('blocked')
    expect(tables.whatsapp_notification_messages.rows[0].bloqueado_motivo).toBe('opt_out')
  })

  it('is idempotent: a second trigger never double-sends', async () => {
    const { supabase, tables } = createFakeWhatsAppSupabase()
    seedSchool(tables)
    const gateway = new WhatsAppLocalAdapter({})
    await setGuardianWhatsAppOptIn(supabase, { id: 'actor-1' }, { responsavelId: GUARDIAN_ID, optIn: true })

    const first = await notifyGuardianAttendanceAlert(supabase, { gateway }, {
      responsavelId: GUARDIAN_ID,
      alunoId: STUDENT_ID,
      dataAula: '2026-08-04',
    })
    const second = await notifyGuardianAttendanceAlert(supabase, { gateway }, {
      responsavelId: GUARDIAN_ID,
      alunoId: STUDENT_ID,
      dataAula: '2026-08-04',
    })

    expect(first.outcome).toBe('delivered')
    expect(second.outcome).toBe('duplicate')
    expect(tables.whatsapp_notification_messages.rows).toHaveLength(1)
    expect(second.receipt).toContain('outcome=duplicate')
  })

  it('recovers after transient failure: retry delivers, webhook completes the cycle', async () => {
    const { supabase, tables } = createFakeWhatsAppSupabase()
    seedSchool(tables)
    const gateway = new WhatsAppLocalAdapter({})
    await setGuardianWhatsAppOptIn(supabase, { id: 'actor-1' }, { responsavelId: GUARDIAN_ID, optIn: true })

    const now = new Date('2026-08-01T12:00:00Z')
    const failingDeps = { gateway: new WhatsAppLocalAdapter({ mode: 'fail' }), now: () => now, maxAttempts: 3, retryBaseDelayMs: 1000 }
    const failed = await notifyGuardianAttendanceAlert(supabase, failingDeps, {
      responsavelId: GUARDIAN_ID,
      alunoId: STUDENT_ID,
      dataAula: '2026-08-05',
    })
    expect(failed.outcome).toBe('queued')
    expect(tables.whatsapp_notification_messages.rows[0].status).toBe('queued')
    expect(tables.whatsapp_notification_messages.rows[0].proxima_tentativa).toBe(
      new Date('2026-08-01T12:00:01Z').toISOString()
    )

    // Backoff elapses; the same message recovers on the retry worker path.
    const { deliverDueWhatsAppNotifications } = await import('@/lib/notifications/whatsapp-delivery-service')
    const recovery = await deliverDueWhatsAppNotifications(supabase, {
      gateway,
      now: () => new Date('2026-08-01T12:00:06Z'),
    })
    expect(recovery.attempted).toBe(1)
    expect(tables.whatsapp_notification_messages.rows[0].status).toBe('delivered')

    const wamid = tables.whatsapp_notification_messages.rows[0].external_message_id as string
    expect(
      await applyWhatsAppDeliveryStatus(supabase, asDeliveryStatus({ externalMessageId: wamid, status: 'delivered' }))
    ).toBe(false) // duplicate receipt is a no-op
    expect(
      await applyWhatsAppDeliveryStatus(supabase, asDeliveryStatus({ externalMessageId: wamid, status: 'read' }))
    ).toBe(true)
  })
})
