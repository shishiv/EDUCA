/**
 * WhatsApp delivery service - queue, retries, idempotency, and receipts.
 *
 * One row per notification decision (idempotency_key = sha256 of guardian +
 * student + type + class date), so repeated triggers never double-send.
 * Delivery attempts resolve the recipient from live data (phone, opt-in,
 * student name) at send time: bodies are never persisted, withdrawal is
 * respected mid-queue, and renamed students get current names.
 *
 * Status machine (DB CHECKs and the SECURITY DEFINER RPC enforce the same
 * rules server-side):
 *   queued -> accepted -> sent -> delivered -> read   (Meta webhook, monotonic)
 *   queued -> delivered                                (local fake path)
 *   queued/failed -> blocked | failed                  (policy / permanent)
 *   queued/failed -> retry with later proxima_tentativa (transient failure)
 */

import { createHash } from 'node:crypto'
import type { WhatsAppNotificationMessageUpdate, WhatsAppSupabase } from './whatsapp-database'
import {
  attendanceNotificationPayloadSchema,
  normalizeBrazilianPhoneToE164,
  type AttendanceNotificationPayload,
  type AttendanceNotificationType,
} from './whatsapp-notification-payload'
import {
  WhatsAppTransientDeliveryError,
  type WhatsAppBlockReason,
  type WhatsAppNotificationGateway,
  type WhatsAppSendResult,
} from './whatsapp-gateway'
import { getGuardianWhatsAppOptIn } from './whatsapp-optin-service'
import { formatWhatsAppReceipt } from './whatsapp-receipts'
import type { ParsedWhatsAppDeliveryStatus } from './whatsapp-webhook-payload'

export const WHATSAPP_DEFAULT_MAX_ATTEMPTS = 3
export const WHATSAPP_MAX_ATTEMPTS_LIMIT = 5
export const WHATSAPP_DEFAULT_RETRY_BASE_DELAY_MS = 60_000
export const WHATSAPP_DEFAULT_RETRY_MULTIPLIER = 5
export const WHATSAPP_RETRY_DELAY_CAP_MS = 24 * 60 * 60 * 1000

export interface WhatsAppDeliveryDependencies {
  gateway: WhatsAppNotificationGateway
  now?: () => Date
  /** Attempts per message, clamped to 1..5. Default 3. */
  maxAttempts?: number
  /** Backoff base in ms. Default 60000. */
  retryBaseDelayMs?: number
  /** Backoff multiplier per attempt. Default 5. */
  retryMultiplier?: number
}

export interface EnqueueWhatsAppNotificationInput {
  responsavelId: string
  alunoId: string
  escolaId: string
  tipo: AttendanceNotificationType
  dataAula: string
  criadoPor?: string
}

export interface EnqueueWhatsAppNotificationResult {
  messageId: string
  status: string
  duplicated: boolean
}

/** Pure backoff: base * multiplier^(attempt-1), capped at 24h. */
export function whatsAppRetryBackoffMs(
  attempt: number,
  baseDelayMs: number = WHATSAPP_DEFAULT_RETRY_BASE_DELAY_MS,
  multiplier: number = WHATSAPP_DEFAULT_RETRY_MULTIPLIER
): number {
  const raw = baseDelayMs * multiplier ** Math.max(0, attempt - 1)
  return Math.min(Math.max(1, Math.floor(raw)), WHATSAPP_RETRY_DELAY_CAP_MS)
}

export function clampMaxAttempts(maxAttempts: number | undefined): number {
  const resolved = maxAttempts ?? WHATSAPP_DEFAULT_MAX_ATTEMPTS
  return Math.min(Math.max(1, Math.floor(resolved)), WHATSAPP_MAX_ATTEMPTS_LIMIT)
}

/** Idempotency key: one notification decision per guardian/student/type/date. */
export function buildWhatsAppIdempotencyKey(input: {
  responsavelId: string
  alunoId: string
  tipo: AttendanceNotificationType
  dataAula: string
}): string {
  return createHash('sha256')
    .update(`${input.responsavelId}|${input.alunoId}|${input.tipo}|${input.dataAula}`, 'utf8')
    .digest('hex')
}

/**
 * Records a notification decision. Duplicates (same idempotency key) return
 * the existing row without sending anything.
 */
export async function enqueueWhatsAppNotification(
  supabase: WhatsAppSupabase,
  input: EnqueueWhatsAppNotificationInput
): Promise<EnqueueWhatsAppNotificationResult> {
  const idempotencyKey = buildWhatsAppIdempotencyKey(input)
  const { data, error } = await supabase
    .from('whatsapp_notification_messages')
    .insert({
      responsavel_id: input.responsavelId,
      aluno_id: input.alunoId,
      escola_id: input.escolaId,
      tipo: input.tipo,
      data_aula: input.dataAula,
      idempotency_key: idempotencyKey,
      status: 'queued',
      tentativas: 0,
      proxima_tentativa: new Date().toISOString(),
      criado_por: input.criadoPor ?? null,
    })
    .select('id, status')
    .single()

  if (error) {
    if (error.code === '23505') {
      const { data: existing, error: existingError } = await supabase
        .from('whatsapp_notification_messages')
        .select('id, status')
        .eq('idempotency_key', idempotencyKey)
        .maybeSingle()
      if (existingError) throw existingError
      if (existing) return { messageId: existing.id, status: existing.status, duplicated: true }
    }
    throw error
  }

  return { messageId: data.id, status: data.status, duplicated: false }
}

export interface DueMessageRow {
  id: string
  status: string
  tentativas: number
  responsavel_id: string
  aluno_id: string
  escola_id: string
  tipo: string
  data_aula: string
}

export interface DeliverDueWhatsAppResult {
  attempted: number
  receipts: string[]
}

/**
 * Delivers every due message (queued or failed, backoff elapsed, attempts
 * left). Sequential runs are idempotent: each attempt updates its row before
 * returning, so repeated calls never re-send a terminal message. Concurrent
 * workers are out of MVP scope (single worker path); a claim-with-lock
 * transition is the documented follow-up if a second worker ever appears.
 */
export async function deliverDueWhatsAppNotifications(
  supabase: WhatsAppSupabase,
  deps: WhatsAppDeliveryDependencies
): Promise<DeliverDueWhatsAppResult> {
  const now = deps.now?.() ?? new Date()
  const maxAttempts = clampMaxAttempts(deps.maxAttempts)

  const { data: due, error } = await supabase
    .from('whatsapp_notification_messages')
    .select('id, status, tentativas, responsavel_id, aluno_id, escola_id, tipo, data_aula')
    .or('status.eq.queued,status.eq.failed')
    .lte('proxima_tentativa', now.toISOString())
    .lt('tentativas', maxAttempts)
    .order('proxima_tentativa', { ascending: true })
    .limit(50)
  if (error) throw error

  const receipts: string[] = []
  for (const message of due ?? []) {
    const result = await attemptWhatsAppMessageDelivery(supabase, deps, message)
    if (result.receipt) receipts.push(result.receipt)
  }
  return { attempted: due?.length ?? 0, receipts }
}

/**
 * One delivery attempt for one message row. Re-resolves the recipient from
 * live data, applies opt-in and phone policy, persists the outcome, and
 * returns a masked receipt for every path.
 */
export async function attemptWhatsAppMessageDelivery(
  supabase: WhatsAppSupabase,
  deps: WhatsAppDeliveryDependencies,
  message: DueMessageRow
): Promise<{ receipt?: string }> {
  const now = deps.now?.() ?? new Date()
  const attemptedAt = now.toISOString()
  const maxAttempts = clampMaxAttempts(deps.maxAttempts)

  const optedIn = await getGuardianWhatsAppOptIn(supabase, message.responsavel_id)
  if (!optedIn) {
    return await persistPolicyBlock(supabase, deps, message, 'opt_out', attemptedAt)
  }

  const payload = await buildLivePayload(supabase, message)
  if (!payload) {
    return await persistPolicyBlock(supabase, deps, message, 'recipient_missing', attemptedAt)
  }

  let result: WhatsAppSendResult
  try {
    result = await deps.gateway.sendAttendanceNotification(payload)
  } catch (error) {
    if (error instanceof WhatsAppTransientDeliveryError) {
      return await persistTransientFailure(supabase, deps, message, attemptedAt, maxAttempts, now)
    }
    return await persistTransientFailure(supabase, deps, message, attemptedAt, maxAttempts, now)
  }

  switch (result.outcome) {
    case 'accepted':
      await updateMessage(supabase, message.id, {
        status: 'accepted',
        external_message_id: result.externalMessageId ?? null,
        tentativas: message.tentativas + 1,
        ultimo_status_em: attemptedAt,
      })
      break
    case 'delivered':
      await updateMessage(supabase, message.id, {
        status: 'delivered',
        external_message_id: result.externalMessageId ?? null,
        tentativas: message.tentativas + 1,
        entregue_em: attemptedAt,
        ultimo_status_em: attemptedAt,
      })
      break
    case 'blocked':
      await updateMessage(supabase, message.id, {
        status: 'blocked',
        bloqueado_motivo: result.blockReason ?? null,
        tentativas: message.tentativas + 1,
        bloqueado_em: attemptedAt,
      })
      break
    case 'failed':
      await updateMessage(supabase, message.id, {
        status: 'failed',
        tentativas: message.tentativas + 1,
        falhou_em: attemptedAt,
        ultimo_erro_codigo: result.failureCode ?? null,
      })
      break
  }
  return { receipt: result.receipt }
}

async function persistPolicyBlock(
  supabase: WhatsAppSupabase,
  deps: WhatsAppDeliveryDependencies,
  message: DueMessageRow,
  motivo: WhatsAppBlockReason,
  attemptedAt: string
): Promise<{ receipt?: string }> {
  await updateMessage(supabase, message.id, {
    status: 'blocked',
    bloqueado_motivo: motivo,
    bloqueado_em: attemptedAt,
    tentativas: message.tentativas + 1,
  })
  return {
    receipt: formatWhatsAppReceipt({
      gateway: deps.gateway.identity(),
      notificationType: message.tipo,
      outcome: 'blocked',
      blockReason: motivo,
      guardianRef: message.responsavel_id.slice(0, 8),
    }),
  }
}

async function persistTransientFailure(
  supabase: WhatsAppSupabase,
  deps: WhatsAppDeliveryDependencies,
  message: DueMessageRow,
  attemptedAt: string,
  maxAttempts: number,
  now: Date
): Promise<{ receipt?: string }> {
  const nextAttempt = message.tentativas + 1
  if (nextAttempt >= maxAttempts) {
    await updateMessage(supabase, message.id, {
      status: 'failed',
      tentativas: nextAttempt,
      falhou_em: attemptedAt,
      ultimo_erro_codigo: 'tentativas_esgotadas',
    })
    return {
      receipt: formatWhatsAppReceipt({
        gateway: deps.gateway.identity(),
        notificationType: message.tipo,
        outcome: 'failed',
        failureCode: 'tentativas_esgotadas',
        guardianRef: message.responsavel_id.slice(0, 8),
      }),
    }
  }
  const baseDelay = deps.retryBaseDelayMs ?? WHATSAPP_DEFAULT_RETRY_BASE_DELAY_MS
  const multiplier = deps.retryMultiplier ?? WHATSAPP_DEFAULT_RETRY_MULTIPLIER
  const backoffMs = whatsAppRetryBackoffMs(nextAttempt, baseDelay, multiplier)
  await updateMessage(supabase, message.id, {
    tentativas: nextAttempt,
    proxima_tentativa: new Date(now.getTime() + backoffMs).toISOString(),
  })
  return {
    receipt: formatWhatsAppReceipt({
      gateway: deps.gateway.identity(),
      notificationType: message.tipo,
      outcome: 'failed',
      failureCode: 'transient_retry_scheduled',
      guardianRef: message.responsavel_id.slice(0, 8),
    }),
  }
}

/** Rebuilds the domain payload from live rows; null when the phone is invalid. */
async function buildLivePayload(
  supabase: WhatsAppSupabase,
  message: DueMessageRow
): Promise<AttendanceNotificationPayload | null> {
  const [{ data: guardian }, { data: student }, { data: school }] = await Promise.all([
    supabase.from('responsaveis').select('telefone').eq('id', message.responsavel_id).maybeSingle(),
    supabase.from('alunos').select('nome_completo').eq('id', message.aluno_id).maybeSingle(),
    supabase.from('escolas').select('nome').eq('id', message.escola_id).maybeSingle(),
  ])

  const phone = normalizeBrazilianPhoneToE164(guardian?.telefone)
  if (!phone || !student?.nome_completo) return null

  const payload: AttendanceNotificationPayload = {
    type: message.tipo as AttendanceNotificationType,
    studentName: student.nome_completo,
    date: message.data_aula,
    schoolName: school?.nome ?? undefined,
    guardianPhoneE164: phone,
  }
  return attendanceNotificationPayloadSchema.safeParse(payload).success ? payload : null
}

async function updateMessage(supabase: WhatsAppSupabase, id: string, patch: WhatsAppNotificationMessageUpdate): Promise<void> {
  const { error } = await supabase
    .from('whatsapp_notification_messages')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}

/**
 * Applies one Meta delivery receipt (webhook statuses array) through the
 * SECURITY DEFINER RPC, which enforces monotonic ordering and idempotency at
 * the database. The webhook route calls this with the service-role client
 * after signature validation.
 */
export async function applyWhatsAppDeliveryStatus(
  supabase: WhatsAppSupabase,
  status: ParsedWhatsAppDeliveryStatus
): Promise<boolean> {
  const timestampSeconds = Number(status.timestampSeconds)
  const timestamp = Number.isFinite(timestampSeconds)
    ? new Date(timestampSeconds * 1000).toISOString()
    : new Date(0).toISOString()

  const { data, error } = await supabase.rpc('apply_whatsapp_delivery_status', {
    p_external_message_id: status.externalMessageId,
    p_status: status.status,
    p_timestamp: timestamp,
    // Explicit null keeps PostgREST matching the four-parameter function.
    p_error_code: status.errorCode !== undefined ? String(status.errorCode) : null,
  })
  if (error) throw error
  return data ?? false
}
