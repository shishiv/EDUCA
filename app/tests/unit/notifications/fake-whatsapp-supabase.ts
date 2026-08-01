/**
 * In-memory fake Supabase client for WhatsApp notification service tests.
 *
 * Mirrors the small supabase-js surface the module uses (from/insert/update/
 * upsert/rpc with eq/or/lte/lt/order/limit/single/maybeSingle), enforces
 * unique constraints with Postgres error codes, and ships a TS re-implementation
 * of apply_whatsapp_delivery_status so the webhook path is testable without a
 * database. This is a test double - the real SQL semantics are covered by
 * supabase/tests/database/whatsapp_notifications.test.sql.
 */

import { randomUUID } from 'node:crypto'
import type { WhatsAppSupabase } from '@/lib/notifications/whatsapp-database'
import type { ParsedWhatsAppDeliveryStatus } from '@/lib/notifications/whatsapp-webhook-payload'

export interface FakeRow {
  id: string
  [key: string]: unknown
}

interface FakeQueryOptions {
  forcedRowId?: string
}

type Filter = { kind: 'eq'; key: string; value: unknown } | { kind: 'lte'; key: string; value: string } | { kind: 'lt'; key: string; value: number } | { kind: 'or'; clause: string } | { kind: 'order'; key: string; ascending: boolean }

function applyOrClause(row: FakeRow, clause: string): boolean {
  // Supports the single pattern used: status.eq.queued,status.eq.failed
  return clause.split(',').some((part) => {
    const [key, op, value] = part.split('.')
    if (op !== 'eq') return false
    return String(row[key]) === value
  })
}

export type FakeTables = Record<string, FakeTable>

export class FakeTable {
  rows: FakeRow[] = []
  uniqueKeys: string[][] = []

  constructor(private readonly tableName: string) {}

  insert(values: Record<string, unknown>): FakeInsertBuilder {
    for (const key of this.uniqueKeys) {
      const existing = this.rows.find((row) => key.every((col) => row[col] === values[col]))
      if (existing) {
        return new FakeInsertBuilder(this, {
          error: { code: '23505', message: `duplicate key on ${key.join(',')}` },
        })
      }
    }
    const row: FakeRow = { id: randomUUID(), ...values, created_at: new Date().toISOString() }
    this.rows.push(row)
    return new FakeInsertBuilder(this, { data: row })
  }

  upsert(values: Record<string, unknown>, options: { onConflict: string }): FakeInsertBuilder {
    const conflictCols = options.onConflict.split(',')
    const existing = this.rows.find((row) => conflictCols.every((col) => row[col] === values[col]))
    if (existing) {
      Object.assign(existing, values, { updated_at: new Date().toISOString() })
      return new FakeInsertBuilder(this, { data: existing })
    }
    return this.insert(values)
  }

  update(patch: Record<string, unknown>): FakeUpdateBuilder {
    return new FakeUpdateBuilder(this, patch)
  }

  query(filters: Filter[], options: FakeQueryOptions = {}): FakeRow[] {
    let rows = this.rows.slice()
    for (const filter of filters) {
      switch (filter.kind) {
        case 'eq':
          rows = rows.filter((row) => row[filter.key] === filter.value)
          break
        case 'lte':
          rows = rows.filter((row) => String(row[filter.key] ?? '') <= String(filter.value))
          break
        case 'lt':
          rows = rows.filter((row) => Number(row[filter.key] ?? 0) < Number(filter.value))
          break
        case 'or':
          rows = rows.filter((row) => applyOrClause(row, filter.clause))
          break
        case 'order':
          rows = rows.sort((a, b) => {
            const av = a[filter.key] as string
            const bv = b[filter.key] as string
            return filter.ascending ? av.localeCompare(bv) : bv.localeCompare(av)
          })
          break
      }
    }
    if (options.forcedRowId) rows = rows.filter((row) => row.id === options.forcedRowId)
    return rows
  }
}

export class FakeQuery {
  private filters: Filter[] = []

  constructor(
    private readonly table: FakeTable,
    private readonly options: FakeQueryOptions = {},
    private readonly insertError?: { code: string; message: string }
  ) {}

  eq(key: string, value: unknown): this {
    this.filters.push({ kind: 'eq', key, value })
    return this
  }

  lte(key: string, value: string): this {
    this.filters.push({ kind: 'lte', key, value })
    return this
  }

  lt(key: string, value: number): this {
    this.filters.push({ kind: 'lt', key, value })
    return this
  }

  or(clause: string): this {
    this.filters.push({ kind: 'or', clause })
    return this
  }

  order(key: string, options: { ascending: boolean }): this {
    this.filters.push({ kind: 'order', key, ascending: options.ascending })
    return this
  }

  maybeSingle(): Promise<{ data: FakeRow | null; error: { message: string } | null }> {
    if (this.insertError) return Promise.resolve({ data: null, error: this.insertError })
    const rows = this.table.query(this.filters, this.options)
    return Promise.resolve({ data: rows[0] ?? null, error: null })
  }

  single(): Promise<{ data: FakeRow | null; error: { message: string } | null }> {
    if (this.insertError) return Promise.resolve({ data: null, error: this.insertError })
    const rows = this.table.query(this.filters, this.options)
    if (rows.length === 0) return Promise.resolve({ data: null, error: { message: 'row not found' } })
    if (rows.length > 1) return Promise.resolve({ data: null, error: { message: 'multiple rows' } })
    return Promise.resolve({ data: rows[0], error: null })
  }

  limit(count: number): Promise<{ data: FakeRow[]; error: null }> {
    const rows = this.table.query(this.filters, this.options)
    return Promise.resolve({ data: rows.slice(0, count), error: null })
  }
}

class FakeInsertBuilder {
  constructor(
    private readonly table: FakeTable,
    private readonly result: { data?: FakeRow; error?: { code: string; message: string } }
  ) {}

  select(_columns: string): FakeQuery {
    return new FakeQuery(
      this.table,
      { forcedRowId: this.result.data?.id },
      this.result.error
    )
  }
}

class FakeUpdateBuilder {
  constructor(
    private readonly table: FakeTable,
    private readonly patch: Record<string, unknown>
  ) {}

  eq(key: string, value: unknown): Promise<{ data: null; error: null }> {
    for (const row of this.table.rows) {
      if (row[key] === value) Object.assign(row, this.patch)
    }
    return Promise.resolve({ data: null, error: null })
  }
}

export interface FakeSupabaseOptions {
  /** Replacement RPC implementations; defaults to the TS delivery-status mirror. */
  rpc?: Record<string, (args: Record<string, unknown>) => Promise<{ data: unknown; error: null }>>
}

/**
 * Builds the fake client. Seed rows per table before calling service functions.
 */
export function createFakeWhatsAppSupabase(options: FakeSupabaseOptions = {}): {
  supabase: WhatsAppSupabase
  tables: Record<string, FakeTable>
  auditEvents: Array<Record<string, unknown>>
} {
  const tables: Record<string, FakeTable> = {
    whatsapp_notification_messages: new FakeTable('whatsapp_notification_messages'),
    whatsapp_notification_optins: new FakeTable('whatsapp_notification_optins'),
    responsaveis: new FakeTable('responsaveis'),
    alunos: new FakeTable('alunos'),
    aluno_responsaveis: new FakeTable('aluno_responsaveis'),
    escolas: new FakeTable('escolas'),
  }
  tables.whatsapp_notification_messages.uniqueKeys = [['idempotency_key']]
  tables.whatsapp_notification_optins.uniqueKeys = [['responsavel_id', 'canal']]

  // Mirror the DB school-sync trigger: opt-in rows inherit the guardian's
  // escola_id, so callers can never opt a guardian into another school.
  const optinsTable = tables.whatsapp_notification_optins
  const originalOptinsInsert = optinsTable.insert.bind(optinsTable)
  const originalOptinsUpsert = optinsTable.upsert.bind(optinsTable)
  optinsTable.insert = (values: Record<string, unknown>) => {
    const guardian = tables.responsaveis.rows.find((row) => row.id === values.responsavel_id)
    if (!guardian?.escola_id) {
      return new FakeInsertBuilder(optinsTable, {
        error: { code: 'P0001', message: 'PILOT_SAFETY_GATE: guardian has no escola_id, whatsapp opt-in rejected' },
      })
    }
    return originalOptinsInsert({ ...values, escola_id: guardian.escola_id })
  }
  optinsTable.upsert = (values: Record<string, unknown>, opts: { onConflict: string }) => {
    const guardian = tables.responsaveis.rows.find((row) => row.id === values.responsavel_id)
    if (!guardian?.escola_id) {
      return new FakeInsertBuilder(optinsTable, {
        error: { code: 'P0001', message: 'PILOT_SAFETY_GATE: guardian has no escola_id, whatsapp opt-in rejected' },
      })
    }
    return originalOptinsUpsert({ ...values, escola_id: guardian.escola_id }, opts)
  }

  const auditEvents: Array<Record<string, unknown>> = []
  const defaultRpc = {
    write_pilot_audit_event: async (args: Record<string, unknown>) => {
      auditEvents.push(args)
      return { data: randomUUID(), error: null }
    },
    apply_whatsapp_delivery_status: async (args: Record<string, unknown>) => {
      const applied = applyDeliveryStatusTs(tables.whatsapp_notification_messages.rows, args)
      return { data: applied, error: null }
    },
  }

  const supabase = {
    from(tableName: string) {
      const table = tables[tableName]
      return {
        insert: (values: Record<string, unknown>) => table.insert(values),
        upsert: (values: Record<string, unknown>, opts: { onConflict: string }) =>
          table.upsert(values, opts),
        update: (patch: Record<string, unknown>) => table.update(patch),
        select: (_columns: string) => new FakeQuery(table),
        rpc: undefined,
      }
    },
    rpc: (name: string, args: Record<string, unknown>) => {
      const implementation = { ...defaultRpc, ...options.rpc }[name]
      if (!implementation) {
        return Promise.resolve({ data: null, error: { message: `rpc ${name} not implemented` } })
      }
      return implementation(args)
    },
  } as unknown as WhatsAppSupabase

  return { supabase, tables, auditEvents }
}

const STATUS_RANK: Record<string, number> = {
  sent: 1,
  delivered: 2,
  read: 3,
  failed: 4,
}

/** TS mirror of the SQL apply_whatsapp_delivery_status semantics. */
export function applyDeliveryStatusTs(
  rows: FakeRow[],
  args: Record<string, unknown>
): boolean {
  const row = rows.find((candidate) => candidate.external_message_id === args.p_external_message_id)
  if (!row) return false
  const currentStatus = row.status as string
  if (currentStatus === 'failed' || currentStatus === 'blocked') return false
  const newRank = STATUS_RANK[args.p_status as string] ?? 0
  const currentRank = STATUS_RANK[currentStatus] ?? 0
  if (newRank === 0 || newRank <= currentRank) return false
  row.status = args.p_status
  row.ultimo_status_em = args.p_timestamp
  if (args.p_status === 'delivered') row.entregue_em = args.p_timestamp
  if (args.p_status === 'read') row.lido_em = args.p_timestamp
  if (args.p_status === 'failed') {
    row.falhou_em = args.p_timestamp
    row.ultimo_erro_codigo = args.p_error_code ?? null
  }
  return true
}

export function asDeliveryStatus(overrides: Partial<ParsedWhatsAppDeliveryStatus>): ParsedWhatsAppDeliveryStatus {
  return {
    externalMessageId: 'wamid.test.1',
    status: 'delivered',
    timestampSeconds: '1750000000',
    ...overrides,
  }
}
