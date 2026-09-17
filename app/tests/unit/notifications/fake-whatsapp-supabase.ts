import { createHash, randomUUID } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'
import type {
  WhatsAppDatabase,
  WhatsAppGuardianRow,
  WhatsAppNotificationMessageRow,
  WhatsAppNotificationOptInRow,
  WhatsAppSchoolRow,
  WhatsAppStudentGuardianLinkRow,
  WhatsAppStudentRow,
  WhatsAppSupabase,
} from '@/lib/notifications/whatsapp-database'
import type { ParsedWhatsAppDeliveryStatus } from '@/lib/notifications/whatsapp-webhook-payload'

const messageInsertSchema = z.object({
  responsavel_id: z.string(),
  aluno_id: z.string(),
  escola_id: z.string(),
  tipo: z.enum(['presenca_falta', 'presenca_presente']),
  data_aula: z.string(),
  idempotency_key: z.string(),
  status: z.literal('queued'),
  tentativas: z.number(),
  proxima_tentativa: z.string().optional(),
  criado_por: z.string().nullable(),
})

const claimArgsSchema = z.object({
  p_claim_token: z.string(),
  p_max_attempts: z.number(),
  p_limit: z.number(),
  p_message_id: z.string().nullable(),
  p_lease_seconds: z.number(),
})

const enqueueArgsSchema = z.object({
  p_responsavel_id: z.string(),
  p_aluno_id: z.string(),
  p_tipo: z.enum(['presenca_falta', 'presenca_presente']),
  p_data_aula: z.string(),
  p_criado_por: z.string(),
})

const completionArgsSchema = z.object({
  p_message_id: z.string(),
  p_claim_token: z.string(),
  p_outcome: z.enum(['accepted', 'delivered', 'blocked', 'failed', 'retry', 'indeterminate']),
  p_external_message_id: z.string().nullable(),
  p_block_reason: z.enum([
    'pilot_mode', 'missing_credentials', 'not_enabled', 'opt_out',
    'recipient_missing', 'template_pending',
  ]).nullable(),
  p_failure_code: z.string().nullable(),
  p_retry_delay_seconds: z.number().nullable(),
})

const optInArgsSchema = z.object({
  p_responsavel_id: z.string(),
  p_opt_in: z.boolean(),
  p_registrado_por: z.string(),
})

const deliveryStatusArgsSchema = z.object({
  p_external_message_id: z.string(),
  p_status: z.enum(['sent', 'delivered', 'read', 'failed']),
  p_timestamp: z.string(),
  p_error_code: z.string().nullable(),
})

export class FakeTable<Row extends { id: string }> {
  readonly rows: Row[] = []
}

export interface FakeAuditEvent {
  p_event_type: 'whatsapp_optin_changed' | 'whatsapp_notification_enqueued' | 'whatsapp_notification_enqueue_replayed'
  p_entity_type: 'responsavel' | 'whatsapp_notification_message'
  p_entity_id: string
  p_escola_id: string
  p_metadata:
    | { canal: 'whatsapp'; opt_in: boolean }
    | { notification_type: 'presenca_falta' | 'presenca_presente'; attendance_date: string; duplicate: boolean }
  receiptId: string
}

export interface FakeAttendanceContextRow {
  id: string
  aluno_id: string
  escola_id: string
  data_aula: string
  status_presenca: 'P' | 'F' | 'J' | 'A' | 'NAO_MARCADO'
}

export interface FakeTables {
  whatsapp_notification_messages: FakeTable<WhatsAppNotificationMessageRow>
  whatsapp_notification_optins: FakeTable<WhatsAppNotificationOptInRow>
  responsaveis: FakeTable<WhatsAppGuardianRow>
  alunos: FakeTable<WhatsAppStudentRow>
  aluno_responsaveis: FakeTable<WhatsAppStudentGuardianLinkRow>
  escolas: FakeTable<WhatsAppSchoolRow>
  attendance_contexts: FakeTable<FakeAttendanceContextRow>
}

export interface FakeSupabaseOptions {
  failOptInAudit?: boolean
  failEnqueueAudit?: boolean
  actorId?: string
}

export interface FakeWhatsAppSupabase {
  supabase: WhatsAppSupabase
  tables: FakeTables
  auditEvents: FakeAuditEvent[]
  setDatabaseNow: (value: Date | string) => void
}

function json<Value>(value: Value, status = 200): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function postgrestError(message: string, code: string, status = 400): Response {
  return json({ message, code, details: null, hint: null }, status)
}

function eqValue(url: URL, key: string): string | null {
  const value = url.searchParams.get(key)
  return value?.startsWith('eq.') ? value.slice(3) : null
}

function messageRow(
  input: z.infer<typeof messageInsertSchema>,
  now = new Date().toISOString(),
): WhatsAppNotificationMessageRow {
  return {
    id: randomUUID(),
    responsavel_id: input.responsavel_id,
    aluno_id: input.aluno_id,
    escola_id: input.escola_id,
    tipo: input.tipo,
    data_aula: input.data_aula,
    status: input.status,
    external_message_id: null,
    idempotency_key: input.idempotency_key,
    tentativas: input.tentativas,
    proxima_tentativa: input.proxima_tentativa ?? now,
    ultimo_erro_codigo: null,
    bloqueado_motivo: null,
    entregue_em: null,
    lido_em: null,
    falhou_em: null,
    bloqueado_em: null,
    ultimo_status_em: null,
    claim_token: null,
    claim_expires_at: null,
    reconciliation_required_at: null,
    criado_por: input.criado_por,
    created_at: now,
    updated_at: now,
  }
}

async function insertMessage(request: Request, tables: FakeTables, now: string): Promise<Response> {
  const input = messageInsertSchema.parse(await request.json())
  const duplicate = tables.whatsapp_notification_messages.rows.find(
    row => row.idempotency_key === input.idempotency_key,
  )
  if (duplicate) return postgrestError('duplicate idempotency key', '23505', 409)
  const row = messageRow(input, now)
  tables.whatsapp_notification_messages.rows.push(row)
  return json(row, 201)
}

function readMessage(request: Request, tables: FakeTables): Response {
  const url = new URL(request.url)
  const id = eqValue(url, 'id')
  const idempotencyKey = eqValue(url, 'idempotency_key')
  const row = tables.whatsapp_notification_messages.rows.find(candidate => (
    (!id || candidate.id === id) && (!idempotencyKey || candidate.idempotency_key === idempotencyKey)
  ))
  return json(row ?? null)
}

function readOptIn(request: Request, tables: FakeTables): Response {
  const responsavelId = eqValue(new URL(request.url), 'responsavel_id')
  const row = tables.whatsapp_notification_optins.rows.find(
    candidate => candidate.responsavel_id === responsavelId && candidate.canal === 'whatsapp',
  )
  return json(row ?? null)
}

function readGuardian(request: Request, tables: FakeTables): Response {
  const id = eqValue(new URL(request.url), 'id')
  return json(tables.responsaveis.rows.find(row => row.id === id) ?? null)
}

function readStudent(request: Request, tables: FakeTables): Response {
  const id = eqValue(new URL(request.url), 'id')
  return json(tables.alunos.rows.find(row => row.id === id) ?? null)
}

function readSchool(request: Request, tables: FakeTables): Response {
  const id = eqValue(new URL(request.url), 'id')
  return json(tables.escolas.rows.find(row => row.id === id) ?? null)
}

function readStudentGuardianLink(request: Request, tables: FakeTables): Response {
  const url = new URL(request.url)
  const alunoId = eqValue(url, 'aluno_id')
  const responsavelId = eqValue(url, 'responsavel_id')
  const active = eqValue(url, 'ativo')
  const row = tables.aluno_responsaveis.rows.find(link => (
    link.aluno_id === alunoId
    && link.responsavel_id === responsavelId
    && (active !== 'true' || link.ativo)
  ))
  return json(row ?? null)
}

function isClaimable(row: WhatsAppNotificationMessageRow, now: string): boolean {
  return row.status === 'queued' && row.proxima_tentativa <= now
}

function matchesMessageId(
  row: WhatsAppNotificationMessageRow,
  messageId: string | null,
): boolean {
  return !messageId || row.id === messageId
}

function holdExpiredClaimForReconciliation(
  row: WhatsAppNotificationMessageRow,
  messageId: string | null,
  now: string,
): boolean {
  if (!matchesMessageId(row, messageId)
    || row.status !== 'processing'
    || !row.claim_expires_at
    || row.claim_expires_at > now) {
    return false
  }
  row.status = 'delivery_unknown'
  row.ultimo_erro_codigo = null
  row.reconciliation_required_at = now
  clearClaim(row)
  row.updated_at = now
  return true
}

function failExhaustedMessage(
  row: WhatsAppNotificationMessageRow,
  messageId: string | null,
  maxAttempts: number,
  now: string,
): void {
  if (!matchesMessageId(row, messageId)
    || row.tentativas < maxAttempts
    || !isClaimable(row, now)) {
    return
  }
  row.status = 'failed'
  row.falhou_em = now
  row.ultimo_erro_codigo = 'tentativas_esgotadas'
  clearClaim(row)
  row.updated_at = now
}

function claimMessages(
  args: z.infer<typeof claimArgsSchema>,
  tables: FakeTables,
  now: string,
): WhatsAppNotificationMessageRow[] {
  const maxAttempts = Math.min(Math.max(args.p_max_attempts, 1), 5)
  for (const row of tables.whatsapp_notification_messages.rows) {
    if (holdExpiredClaimForReconciliation(row, args.p_message_id, now)) continue
    failExhaustedMessage(row, args.p_message_id, maxAttempts, now)
  }
  const claimed = tables.whatsapp_notification_messages.rows
    .filter(row => matchesMessageId(row, args.p_message_id))
    .filter(row => row.tentativas < maxAttempts)
    .filter(row => isClaimable(row, now))
    .toSorted((left, right) => left.proxima_tentativa.localeCompare(right.proxima_tentativa))
    .slice(0, Math.min(Math.max(args.p_limit, 1), 50))
  const expiresAt = new Date(
    Date.parse(now) + Math.min(Math.max(args.p_lease_seconds, 30), 900) * 1000,
  ).toISOString()
  for (const row of claimed) {
    row.status = 'processing'
    row.claim_token = args.p_claim_token
    row.claim_expires_at = expiresAt
    row.tentativas += 1
    row.updated_at = now
  }
  return claimed
}

function clearClaim(row: WhatsAppNotificationMessageRow): void {
  row.claim_token = null
  row.claim_expires_at = null
}

function completeClaim(
  args: z.infer<typeof completionArgsSchema>,
  tables: FakeTables,
  now: string,
): boolean {
  const row = tables.whatsapp_notification_messages.rows.find(
    candidate => candidate.id === args.p_message_id
      && candidate.status === 'processing'
      && candidate.claim_token === args.p_claim_token,
  )
  if (!row || !row.claim_expires_at || row.claim_expires_at <= now) return false

  if (!applyCompletionOutcome(row, args, now)) return false
  clearClaim(row)
  row.updated_at = now
  return true
}

function applyCompletionOutcome(
  row: WhatsAppNotificationMessageRow,
  args: z.infer<typeof completionArgsSchema>,
  now: string,
): boolean {
  switch (args.p_outcome) {
    case 'retry':
      return applyRetryCompletion(row, args.p_retry_delay_seconds, now)
    case 'accepted':
      if (!args.p_external_message_id) return false
      row.status = 'accepted'
      row.external_message_id = args.p_external_message_id
      row.ultimo_status_em = now
      return true
    case 'delivered':
      row.status = 'delivered'
      row.external_message_id = args.p_external_message_id
      row.entregue_em = now
      row.ultimo_status_em = now
      return true
    case 'blocked':
      if (!args.p_block_reason) return false
      row.status = 'blocked'
      row.bloqueado_motivo = args.p_block_reason
      row.bloqueado_em = now
      return true
    case 'failed':
      row.status = 'failed'
      row.falhou_em = now
      row.ultimo_erro_codigo = args.p_failure_code ?? 'permanent_failure'
      return true
    case 'indeterminate':
      row.status = 'delivery_unknown'
      row.ultimo_erro_codigo = null
      row.reconciliation_required_at = now
      return true
  }
}

function applyRetryCompletion(
  row: WhatsAppNotificationMessageRow,
  retryDelaySeconds: number | null,
  now: string,
): boolean {
  if (!retryDelaySeconds || retryDelaySeconds <= 0 || row.tentativas >= 5) return false
  row.status = 'queued'
  row.proxima_tentativa = new Date(
    Date.parse(now) + Math.min(retryDelaySeconds, 86_400) * 1000,
  ).toISOString()
  row.ultimo_erro_codigo = null
  return true
}

function buildOptInRow(
  args: z.infer<typeof optInArgsSchema>,
  schoolId: string,
  existing: WhatsAppNotificationOptInRow | undefined,
  now: string,
): WhatsAppNotificationOptInRow {
  return {
    id: existing?.id ?? randomUUID(),
    responsavel_id: args.p_responsavel_id,
    escola_id: schoolId,
    canal: 'whatsapp',
    opt_in: args.p_opt_in,
    consentido_em: args.p_opt_in ? now : null,
    cancelado_em: args.p_opt_in ? null : now,
    registrado_por: args.p_registrado_por,
    created_at: existing?.created_at ?? now,
    updated_at: now,
  }
}

function setOptIn(
  args: z.infer<typeof optInArgsSchema>,
  tables: FakeTables,
  auditEvents: FakeAuditEvent[],
  options: FakeSupabaseOptions,
  now: string,
): Response {
  const guardian = tables.responsaveis.rows.find(row => row.id === args.p_responsavel_id)
  if (!guardian?.escola_id) {
    return postgrestError('PILOT_NOTIFICATION_SCHOOL_DENIED: guardian not visible to actor', '42501')
  }
  if (options.failOptInAudit) {
    return postgrestError('PILOT_AUDIT_WRITE_FAILED: synthetic failure', 'P0001')
  }

  const existing = tables.whatsapp_notification_optins.rows.find(
    row => row.responsavel_id === args.p_responsavel_id && row.canal === 'whatsapp',
  )
  const row = buildOptInRow(args, guardian.escola_id, existing, now)
  if (existing) Object.assign(existing, row)
  else tables.whatsapp_notification_optins.rows.push(row)

  const receiptId = randomUUID()
  auditEvents.push({
    p_event_type: 'whatsapp_optin_changed',
    p_entity_type: 'responsavel',
    p_entity_id: args.p_responsavel_id,
    p_escola_id: guardian.escola_id,
    p_metadata: { canal: 'whatsapp', opt_in: args.p_opt_in },
    receiptId,
  })
  return json([{
    responsavel_id: row.responsavel_id,
    opt_in: row.opt_in,
    consentido_em: row.consentido_em,
    cancelado_em: row.cancelado_em,
    audit_id: receiptId,
  }])
}

function governedEnqueueSchoolId(
  args: z.infer<typeof enqueueArgsSchema>,
  tables: FakeTables,
): string | null {
  const guardian = tables.responsaveis.rows.find(row => row.id === args.p_responsavel_id)
  const student = tables.alunos.rows.find(row => row.id === args.p_aluno_id)
  if (!guardian?.escola_id || !student?.escola_id || guardian.escola_id !== student.escola_id) {
    return null
  }
  const linked = tables.aluno_responsaveis.rows.some(row => (
    row.aluno_id === args.p_aluno_id
    && row.responsavel_id === args.p_responsavel_id
    && row.ativo
  ))
  const expectedStatus = args.p_tipo === 'presenca_falta' ? 'F' : 'P'
  const matchingAttendance = tables.attendance_contexts.rows.some(row => (
    row.aluno_id === args.p_aluno_id
    && row.escola_id === student.escola_id
    && row.data_aula === args.p_data_aula
    && row.status_presenca === expectedStatus
  ))
  return linked && matchingAttendance ? student.escola_id : null
}

interface NotificationDecision {
  row: WhatsAppNotificationMessageRow
  duplicated: boolean
}

function notificationDecision(
  args: z.infer<typeof enqueueArgsSchema>,
  tables: FakeTables,
  schoolId: string,
  now: string,
): NotificationDecision {
  const idempotencyKey = createHash('sha256')
    .update(`${args.p_responsavel_id}|${args.p_aluno_id}|${args.p_tipo}|${args.p_data_aula}`, 'utf8')
    .digest('hex')
  const existing = tables.whatsapp_notification_messages.rows.find(
    candidate => candidate.idempotency_key === idempotencyKey,
  )
  if (existing) return { row: existing, duplicated: true }
  return {
    row: messageRow({
      responsavel_id: args.p_responsavel_id,
      aluno_id: args.p_aluno_id,
      escola_id: schoolId,
      tipo: args.p_tipo,
      data_aula: args.p_data_aula,
      idempotency_key: idempotencyKey,
      status: 'queued',
      tentativas: 0,
      criado_por: args.p_criado_por,
    }, now),
    duplicated: false,
  }
}

function enqueueNotification(
  args: z.infer<typeof enqueueArgsSchema>,
  tables: FakeTables,
  auditEvents: FakeAuditEvent[],
  options: FakeSupabaseOptions,
  now: string,
): Response {
  const actorId = options.actorId ?? args.p_criado_por
  if (args.p_criado_por !== actorId) {
    return postgrestError('WHATSAPP_ENQUEUE_ACTOR_DENIED: authenticated actor must own the request', '42501')
  }
  const schoolId = governedEnqueueSchoolId(args, tables)
  if (!schoolId) {
    return postgrestError('WHATSAPP_ENQUEUE_CONTEXT_DENIED: active relationship and matching attendance are required', '42501')
  }

  const { row, duplicated } = notificationDecision(args, tables, schoolId, now)
  if (options.failEnqueueAudit) {
    return postgrestError('PILOT_AUDIT_WRITE_FAILED: synthetic failure', 'P0001')
  }
  if (!duplicated) tables.whatsapp_notification_messages.rows.push(row)

  const receiptId = randomUUID()
  auditEvents.push({
    p_event_type: duplicated ? 'whatsapp_notification_enqueue_replayed' : 'whatsapp_notification_enqueued',
    p_entity_type: 'whatsapp_notification_message',
    p_entity_id: row.id,
    p_escola_id: schoolId,
    p_metadata: {
      notification_type: args.p_tipo,
      attendance_date: args.p_data_aula,
      duplicate: duplicated,
    },
    receiptId,
  })
  return json([{
    message_id: row.id,
    status: row.status,
    duplicated,
    audit_id: receiptId,
  }])
}

function statusRank(status: WhatsAppNotificationMessageRow['status']): number {
  if (status === 'accepted') return 0
  if (status === 'sent') return 1
  if (status === 'delivered') return 2
  if (status === 'read') return 3
  return -1
}

function canApplyStatus(current: WhatsAppNotificationMessageRow['status'], next: z.infer<typeof deliveryStatusArgsSchema>['p_status']): boolean {
  if (current === 'failed' || current === 'blocked' || current === 'read') return false
  if (next === 'failed') return current === 'accepted' || current === 'sent'
  return statusRank(next) > statusRank(current)
}

function applyDeliveryStatus(
  args: z.infer<typeof deliveryStatusArgsSchema>,
  tables: FakeTables,
): boolean {
  const row = tables.whatsapp_notification_messages.rows.find(
    candidate => candidate.external_message_id === args.p_external_message_id,
  )
  if (!row || !canApplyStatus(row.status, args.p_status)) return false
  row.status = args.p_status
  row.ultimo_status_em = args.p_timestamp
  if (args.p_status === 'delivered') row.entregue_em = args.p_timestamp
  if (args.p_status === 'read') row.lido_em = args.p_timestamp
  if (args.p_status === 'failed') {
    row.falhou_em = args.p_timestamp
    row.ultimo_erro_codigo = args.p_error_code
  }
  return true
}

async function authorizedGuardians(request: Request, tables: FakeTables): Promise<Response> {
  const args = z.object({ p_guardian_id: z.string().nullable() }).parse(await request.json())
  return json(tables.responsaveis.rows.filter(row => !args.p_guardian_id || row.id === args.p_guardian_id))
}

async function rpcResponse(
  request: Request,
  path: string,
  tables: FakeTables,
  auditEvents: FakeAuditEvent[],
  options: FakeSupabaseOptions,
  databaseNow: () => string,
): Promise<Response> {
  if (path === '/rest/v1/rpc/get_authorized_guardian_profiles') {
    return authorizedGuardians(request, tables)
  }
  if (path === '/rest/v1/rpc/enqueue_guardian_whatsapp_attendance_notification') {
    return enqueueNotification(enqueueArgsSchema.parse(await request.json()), tables, auditEvents, options, databaseNow())
  }
  if (path === '/rest/v1/rpc/claim_whatsapp_notifications') {
    return json(claimMessages(claimArgsSchema.parse(await request.json()), tables, databaseNow()))
  }
  if (path === '/rest/v1/rpc/complete_whatsapp_notification_delivery') {
    return json(completeClaim(completionArgsSchema.parse(await request.json()), tables, databaseNow()))
  }
  if (path === '/rest/v1/rpc/set_guardian_whatsapp_opt_in') {
    return setOptIn(optInArgsSchema.parse(await request.json()), tables, auditEvents, options, databaseNow())
  }
  if (path === '/rest/v1/rpc/apply_whatsapp_delivery_status') {
    return json(applyDeliveryStatus(deliveryStatusArgsSchema.parse(await request.json()), tables))
  }
  return postgrestError(`rpc ${path} not implemented`, 'P0001')
}

function tableResponse(
  request: Request,
  path: string,
  tables: FakeTables,
  databaseNow: () => string,
): Promise<Response> | Response {
  if (path === '/rest/v1/whatsapp_notification_messages') {
    return request.method === 'POST'
      ? insertMessage(request, tables, databaseNow())
      : readMessage(request, tables)
  }
  if (path === '/rest/v1/whatsapp_notification_optins') return readOptIn(request, tables)
  if (path === '/rest/v1/responsaveis') return readGuardian(request, tables)
  if (path === '/rest/v1/alunos') return readStudent(request, tables)
  if (path === '/rest/v1/aluno_responsaveis') return readStudentGuardianLink(request, tables)
  if (path === '/rest/v1/escolas') return readSchool(request, tables)
  return postgrestError(`table ${path} not implemented`, 'P0001')
}

export function createFakeWhatsAppSupabase(
  options: FakeSupabaseOptions = {},
): FakeWhatsAppSupabase {
  const tables: FakeTables = {
    whatsapp_notification_messages: new FakeTable(),
    whatsapp_notification_optins: new FakeTable(),
    responsaveis: new FakeTable(),
    alunos: new FakeTable(),
    aluno_responsaveis: new FakeTable(),
    escolas: new FakeTable(),
    attendance_contexts: new FakeTable(),
  }
  const auditEvents: FakeAuditEvent[] = []
  let databaseNow = new Date().toISOString()
  const supabase = createClient<WhatsAppDatabase>('http://127.0.0.1:54321', 'synthetic-key', {
    auth: { autoRefreshToken: false, persistSession: false },
    global: {
      fetch: async (input, init) => {
        const request = new Request(input, init)
        const path = new URL(request.url).pathname
        return path.startsWith('/rest/v1/rpc/')
          ? rpcResponse(request, path, tables, auditEvents, options, () => databaseNow)
          : tableResponse(request, path, tables, () => databaseNow)
      },
    },
  })
  return {
    supabase,
    tables,
    auditEvents,
    setDatabaseNow: value => {
      databaseNow = new Date(value).toISOString()
    },
  }
}

export function asDeliveryStatus(
  overrides: Partial<ParsedWhatsAppDeliveryStatus>,
): ParsedWhatsAppDeliveryStatus {
  return {
    externalMessageId: 'wamid.test.1',
    status: 'delivered',
    timestampSeconds: '1750000000',
    ...overrides,
  }
}
