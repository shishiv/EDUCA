/**
 * WhatsApp attendance notification service - the caller-facing entry point.
 *
 * Callers (attendance flows, API routes) pass only domain identifiers:
 * guardian, student, class date, notification type. Everything else - phone
 * lookup, opt-in check, school scoping, idempotent enqueue, immediate
 * delivery attempt, masked receipts - happens here. Meta request details
 * never surface.
 */

import { z } from 'zod'
import { normalizeBrazilianPhoneToE164 } from './whatsapp-notification-payload'
import type { WhatsAppDeliveryDependencies } from './whatsapp-delivery-service'
import type { WhatsAppSupabase } from './whatsapp-database'
import {
  attemptWhatsAppMessageDelivery,
  enqueueWhatsAppNotification,
  type DueMessageRow,
} from './whatsapp-delivery-service'
import { getGuardianWhatsAppOptIn } from './whatsapp-optin-service'
import { formatWhatsAppReceipt } from './whatsapp-receipts'

export const notifyGuardianAttendanceAlertSchema = z.object({
  responsavelId: z.string().uuid(),
  alunoId: z.string().uuid(),
  dataAula: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'data deve estar em YYYY-MM-DD'),
  tipo: z.enum(['presenca_falta', 'presenca_presente']).optional().default('presenca_falta'),
  criadoPor: z.string().uuid().optional(),
})

export type NotifyGuardianAttendanceAlertInput = z.input<typeof notifyGuardianAttendanceAlertSchema>

export interface NotifyGuardianAttendanceAlertResult {
  outcome: 'delivered' | 'queued' | 'blocked' | 'failed' | 'duplicate'
  messageId: string
  receipt: string
  duplicated: boolean
}

/**
 * Sends (or records the decision not to send) one attendance alert.
 *
 * Fast paths: a guardian without consent or without a valid Brazilian phone
 * gets a blocked row with a masked receipt instead of a send. Repeated calls
 * with the same identifiers are idempotent and return the first decision.
 */
export async function notifyGuardianAttendanceAlert(
  supabase: WhatsAppSupabase,
  deps: WhatsAppDeliveryDependencies,
  input: NotifyGuardianAttendanceAlertInput
): Promise<NotifyGuardianAttendanceAlertResult> {
  const parsed = notifyGuardianAttendanceAlertSchema.parse(input)
  const now = deps.now?.() ?? new Date()
  const attemptedAt = now.toISOString()

  const { data: guardian, error: guardianError } = await supabase
    .from('responsaveis')
    .select('id, telefone, escola_id')
    .eq('id', parsed.responsavelId)
    .maybeSingle()
  if (guardianError) throw guardianError
  if (!guardian?.escola_id) {
    throw new Error('PILOT_NOTIFICATION_SCHOOL_DENIED: guardian not visible to actor')
  }

  const { data: student, error: studentError } = await supabase
    .from('alunos')
    .select('id, escola_id')
    .eq('id', parsed.alunoId)
    .maybeSingle()
  if (studentError) throw studentError
  if (!student) {
    throw new Error('PILOT_NOTIFICATION_SCHOOL_DENIED: student not visible to actor')
  }

  const { data: link, error: linkError } = await supabase
    .from('aluno_responsaveis')
    .select('id')
    .eq('aluno_id', parsed.alunoId)
    .eq('responsavel_id', parsed.responsavelId)
    .eq('ativo', true)
    .maybeSingle()
  if (linkError) throw linkError

  const escolaId = guardian.escola_id
  const guardianOptedIn = await getGuardianWhatsAppOptIn(supabase, parsed.responsavelId)
  const phone = normalizeBrazilianPhoneToE164(guardian.telefone)

  const blockedBeforeEnqueue: 'opt_out' | 'recipient_missing' | null =
    !guardianOptedIn
      ? 'opt_out'
      : !phone
        ? 'recipient_missing'
        : !link
          ? 'recipient_missing'
          : student.escola_id !== escolaId
            ? 'recipient_missing'
            : null

  if (blockedBeforeEnqueue) {
    const { messageId, duplicated } = await enqueueBlockedDecision(
      supabase,
      parsed,
      escolaId,
      blockedBeforeEnqueue,
      attemptedAt
    )
    return {
      outcome: 'blocked',
      messageId,
      duplicated,
      receipt: formatWhatsAppReceipt({
        gateway: deps.gateway.identity(),
        notificationType: parsed.tipo,
        outcome: 'blocked',
        blockReason: blockedBeforeEnqueue,
        guardianRef: parsed.responsavelId.slice(0, 8),
      }),
    }
  }

  const enqueued = await enqueueWhatsAppNotification(supabase, {
    responsavelId: parsed.responsavelId,
    alunoId: parsed.alunoId,
    escolaId,
    tipo: parsed.tipo,
    dataAula: parsed.dataAula,
    criadoPor: parsed.criadoPor,
  })

  if (enqueued.duplicated) {
    return {
      outcome: 'duplicate',
      messageId: enqueued.messageId,
      duplicated: true,
      receipt: formatWhatsAppReceipt({
        gateway: deps.gateway.identity(),
        notificationType: parsed.tipo,
        outcome: 'duplicate',
        guardianRef: parsed.responsavelId.slice(0, 8),
      }),
    }
  }

  const dueMessage: DueMessageRow = {
    id: enqueued.messageId,
    status: 'queued',
    tentativas: 0,
    responsavel_id: parsed.responsavelId,
    aluno_id: parsed.alunoId,
    escola_id: escolaId,
    tipo: parsed.tipo,
    data_aula: parsed.dataAula,
  }
  const attempt = await attemptWhatsAppMessageDelivery(supabase, deps, dueMessage)

  const finalStatus = await readMessageStatus(supabase, enqueued.messageId)
  const outcome: NotifyGuardianAttendanceAlertResult['outcome'] =
    finalStatus === 'delivered'
      ? 'delivered'
      : finalStatus === 'blocked'
        ? 'blocked'
        : finalStatus === 'failed'
          ? 'failed'
          : 'queued'
  return {
    outcome,
    messageId: enqueued.messageId,
    duplicated: false,
    receipt: attempt.receipt ?? '',
  }
}

async function enqueueBlockedDecision(
  supabase: WhatsAppSupabase,
  parsed: z.infer<typeof notifyGuardianAttendanceAlertSchema>,
  escolaId: string,
  motivo: 'opt_out' | 'recipient_missing',
  attemptedAt: string
): Promise<{ messageId: string; duplicated: boolean }> {
  const enqueued = await enqueueWhatsAppNotification(supabase, {
    responsavelId: parsed.responsavelId,
    alunoId: parsed.alunoId,
    escolaId,
    tipo: parsed.tipo,
    dataAula: parsed.dataAula,
    criadoPor: parsed.criadoPor,
  })
  if (enqueued.duplicated) return { messageId: enqueued.messageId, duplicated: true }

  const { error } = await supabase
    .from('whatsapp_notification_messages')
    .update({
      status: 'blocked',
      bloqueado_motivo: motivo,
      bloqueado_em: attemptedAt,
      updated_at: attemptedAt,
    })
    .eq('id', enqueued.messageId)
  if (error) throw error
  return { messageId: enqueued.messageId, duplicated: false }
}

async function readMessageStatus(
  supabase: WhatsAppSupabase,
  messageId: string
): Promise<string> {
  const { data, error } = await supabase
    .from('whatsapp_notification_messages')
    .select('status')
    .eq('id', messageId)
    .maybeSingle()
  if (error) throw error
  return data?.status ?? 'queued'
}
