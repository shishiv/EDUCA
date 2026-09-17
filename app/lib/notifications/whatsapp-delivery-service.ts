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
 *   queued -> processing -> accepted -> sent -> delivered -> read
 *   queued -> processing -> delivered                    (local fake path)
 *   queued -> processing -> blocked | failed             (policy / permanent)
 *   queued -> processing -> queued at a later due time    (transient failure)
 */

import { createHash, randomUUID } from 'node:crypto'
import type { WhatsAppNotificationMessageRow, WhatsAppSupabase } from './whatsapp-database'
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
  tipo: AttendanceNotificationType
  dataAula: string
  criadoPor: string
}

export interface EnqueueWhatsAppNotificationResult {
  messageId: string
  status: string
  duplicated: boolean
  auditReceiptId: string
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
  const { data, error } = await supabase.rpc('enqueue_guardian_whatsapp_attendance_notification', {
    p_responsavel_id: input.responsavelId,
    p_aluno_id: input.alunoId,
    p_tipo: input.tipo,
    p_data_aula: input.dataAula,
    p_criado_por: input.criadoPor,
  })
  if (error) throw error
  const result = data?.[0]
  if (!result?.audit_id) throw new Error('WHATSAPP_ENQUEUE_AUDIT_RECEIPT_MISSING')
  return {
    messageId: result.message_id,
    status: result.status,
    duplicated: result.duplicated,
    auditReceiptId: result.audit_id,
  }
}

export type DueMessageRow = Pick<
  WhatsAppNotificationMessageRow,
  'id' | 'status' | 'tentativas' | 'responsavel_id' | 'aluno_id' | 'escola_id' | 'tipo' | 'data_aula'
> & { claim_token: string }

export interface DeliverDueWhatsAppResult {
  attempted: number
  receipts: string[]
}

/**
 * Claims and delivers due messages. The database claim uses row locks and a
 * lease, so concurrent drainers cannot send the same row.
 */
export async function deliverDueWhatsAppNotifications(
  supabase: WhatsAppSupabase,
  deps: WhatsAppDeliveryDependencies
): Promise<DeliverDueWhatsAppResult> {
  const maxAttempts = clampMaxAttempts(deps.maxAttempts)
  const due = await claimWhatsAppNotifications(supabase, maxAttempts)

  const receipts: string[] = []
  for (const message of due) {
    const result = await attemptWhatsAppMessageDelivery(supabase, deps, message)
    if (result.receipt) receipts.push(result.receipt)
  }
  return { attempted: due.length, receipts }
}

export async function claimWhatsAppNotificationById(
  supabase: WhatsAppSupabase,
  messageId: string,
  maxAttempts: number,
): Promise<DueMessageRow | null> {
  const [message] = await claimWhatsAppNotifications(supabase, maxAttempts, messageId, 1)
  return message ?? null
}

async function claimWhatsAppNotifications(
  supabase: WhatsAppSupabase,
  maxAttempts: number,
  messageId: string | null = null,
  limit = 50,
): Promise<DueMessageRow[]> {
  const claimToken = randomUUID()
  const { data, error } = await supabase.rpc('claim_whatsapp_notifications', {
    p_claim_token: claimToken,
    p_max_attempts: maxAttempts,
    p_limit: limit,
    p_message_id: messageId,
    p_lease_seconds: 300,
  })
  if (error) throw error
  return (data ?? []).map(message => ({
    id: message.id,
    status: message.status,
    tentativas: message.tentativas,
    responsavel_id: message.responsavel_id,
    aluno_id: message.aluno_id,
    escola_id: message.escola_id,
    tipo: message.tipo,
    data_aula: message.data_aula,
    claim_token: claimToken,
  }))
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
  const maxAttempts = clampMaxAttempts(deps.maxAttempts)

  const optedIn = await getGuardianWhatsAppOptIn(supabase, message.responsavel_id)
  if (!optedIn) {
    return await persistPolicyBlock(supabase, deps, message, 'opt_out')
  }

  const payload = await buildLivePayload(supabase, message)
  if (!payload) {
    return await persistPolicyBlock(supabase, deps, message, 'recipient_missing')
  }

  let result: WhatsAppSendResult
  try {
    result = await deps.gateway.sendAttendanceNotification(payload)
  } catch (error) {
    if (error instanceof WhatsAppTransientDeliveryError) {
      return error.retrySafe
        ? await persistTransientFailure(supabase, deps, message, maxAttempts)
        : await persistIndeterminateFailure(supabase, deps, message)
    }
    return await persistPermanentFailure(supabase, deps, message, 'gateway_exception')
  }

  await persistGatewayResult(supabase, message, result)
  return { receipt: result.receipt }
}

async function persistGatewayResult(
  supabase: WhatsAppSupabase,
  message: DueMessageRow,
  result: WhatsAppSendResult,
): Promise<void> {
  switch (result.outcome) {
    case 'accepted':
      await completeMessage(supabase, message, 'accepted', {
        externalMessageId: result.externalMessageId ?? null,
      })
      break
    case 'delivered':
      await completeMessage(supabase, message, 'delivered', {
        externalMessageId: result.externalMessageId ?? null,
      })
      break
    case 'blocked':
      await completeMessage(supabase, message, 'blocked', {
        blockReason: result.blockReason ?? 'not_enabled',
      })
      break
    case 'failed':
      await completeMessage(supabase, message, 'failed', {
        failureCode: result.failureCode ?? 'permanent_failure',
      })
      break
  }
}

async function persistPolicyBlock(
  supabase: WhatsAppSupabase,
  deps: WhatsAppDeliveryDependencies,
  message: DueMessageRow,
  motivo: WhatsAppBlockReason,
): Promise<{ receipt?: string }> {
  await completeMessage(supabase, message, 'blocked', { blockReason: motivo })
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
  maxAttempts: number,
): Promise<{ receipt?: string }> {
  if (message.tentativas >= maxAttempts) {
    return persistPermanentFailure(supabase, deps, message, 'tentativas_esgotadas')
  }
  const baseDelay = deps.retryBaseDelayMs ?? WHATSAPP_DEFAULT_RETRY_BASE_DELAY_MS
  const multiplier = deps.retryMultiplier ?? WHATSAPP_DEFAULT_RETRY_MULTIPLIER
  const backoffMs = whatsAppRetryBackoffMs(message.tentativas, baseDelay, multiplier)
  await completeMessage(supabase, message, 'retry', {
    retryDelaySeconds: Math.max(1, Math.ceil(backoffMs / 1000)),
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

async function persistPermanentFailure(
  supabase: WhatsAppSupabase,
  deps: WhatsAppDeliveryDependencies,
  message: DueMessageRow,
  failureCode: string,
): Promise<{ receipt?: string }> {
  await completeMessage(supabase, message, 'failed', { failureCode })
  return {
    receipt: formatWhatsAppReceipt({
      gateway: deps.gateway.identity(),
      notificationType: message.tipo,
      outcome: 'failed',
      failureCode,
      guardianRef: message.responsavel_id.slice(0, 8),
    }),
  }
}

async function persistIndeterminateFailure(
  supabase: WhatsAppSupabase,
  deps: WhatsAppDeliveryDependencies,
  message: DueMessageRow,
): Promise<{ receipt?: string }> {
  await completeMessage(supabase, message, 'indeterminate', {
    failureCode: 'delivery_outcome_unknown',
  })
  return {
    receipt: formatWhatsAppReceipt({
      gateway: deps.gateway.identity(),
      notificationType: message.tipo,
      outcome: 'delivery_unknown',
      failureCode: 'delivery_outcome_unknown',
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

  const type = attendanceNotificationPayloadSchema.shape.type.safeParse(message.tipo)
  if (!type.success) return null
  const payload: AttendanceNotificationPayload = {
    type: type.data,
    studentName: student.nome_completo,
    date: message.data_aula,
    schoolName: school?.nome ?? undefined,
    guardianPhoneE164: phone,
  }
  return attendanceNotificationPayloadSchema.safeParse(payload).success ? payload : null
}

type CompletionFields = {
  externalMessageId?: string | null
  blockReason?: WhatsAppBlockReason | null
  failureCode?: string | null
  retryDelaySeconds?: number | null
}

async function completeMessage(
  supabase: WhatsAppSupabase,
  message: DueMessageRow,
  outcome: 'accepted' | 'delivered' | 'blocked' | 'failed' | 'retry' | 'indeterminate',
  fields: CompletionFields = {},
): Promise<void> {
  const { data, error } = await supabase.rpc('complete_whatsapp_notification_delivery', {
    p_message_id: message.id,
    p_claim_token: message.claim_token,
    p_outcome: outcome,
    p_external_message_id: fields.externalMessageId ?? null,
    p_block_reason: fields.blockReason ?? null,
    p_failure_code: fields.failureCode ?? null,
    p_retry_delay_seconds: fields.retryDelaySeconds ?? null,
  })
  if (error) throw error
  if (!data) throw new Error('WHATSAPP_DELIVERY_CLAIM_LOST')
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
