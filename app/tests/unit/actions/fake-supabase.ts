/**
 * Typed HTTP transport for attendance tests.
 *
 * Tests exercise the real Supabase client and postgrest-js request builder.
 * This transport supplies deterministic Auth, REST, RPC, state, and write
 * observations without simulating the client API itself.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'
import type { Database } from '@/types/database'

export type FakeUserRow = Pick<Database['public']['Tables']['users']['Row'], 'id' | 'tipo_usuario' | 'escola_id' | 'ativo'>
export type FakeSessionRow = Pick<Database['public']['Tables']['sessoes_aula']['Row'], 'id' | 'turma_id' | 'professor_id' | 'escola_id' | 'status' | 'data_aula'>
  & Partial<Database['public']['Tables']['sessoes_aula']['Row']>
export type FakeTurmaRow = Pick<Database['public']['Tables']['turmas']['Row'], 'id' | 'escola_id' | 'professor_id' | 'ativo'>
export type FakeMatriculaRow = Pick<Database['public']['Tables']['matriculas']['Row'], 'id' | 'turma_id'>
  & Partial<Pick<Database['public']['Tables']['matriculas']['Row'], 'situacao' | 'aluno_id'>>
  & { aluno?: { id: string; nome_completo: string } | null }
export type FakeAttendanceRow = Pick<Database['public']['Tables']['frequencia']['Row'], 'matricula_id' | 'sessao_id'>
  & Partial<Database['public']['Tables']['frequencia']['Row']>

export interface FakeAttendanceDbState {
  /** Session user returned by auth.getUser(); null = unauthenticated. */
  user: { id: string } | null
  users: FakeUserRow[]
  sessions: FakeSessionRow[]
  turmas: FakeTurmaRow[]
  matriculas: FakeMatriculaRow[]
  alunos?: Array<{ id: string; nome_completo: string }>
  attendance?: FakeAttendanceRow[]
  /** Result of the is_session_editable RPC. */
  isEditable: boolean
  /** Database-trigger value returned after inserting a session. */
  insertedSessionDeadline?: string | null
  /** Optional database error returned by a session insert. */
  insertSessionError?: { code: string; message: string }
}

type AttendanceInsert = Pick<
  Database['public']['Tables']['frequencia']['Insert'],
  'sessao_id' | 'matricula_id' | 'data_aula' | 'status_presenca' | 'presente' | 'justificativa' | 'professor_id' | 'marcado_por' | 'marcado_em'
>
type SessionInsert = Pick<
  Database['public']['Tables']['sessoes_aula']['Insert'],
  'turma_id' | 'escola_id' | 'professor_id' | 'data_aula' | 'status' | 'aberta_em' | 'auto_fechamento_agendado' | 'conteudo_programatico'
> & { data_aula: string; status: string }
type SessionUpdate = Database['public']['Tables']['sessoes_aula']['Update']
type InspectableSingleUpsert = AttendanceInsert & { readonly [index: number]: AttendanceInsert }
type InspectableBatchUpsert = AttendanceInsert[] & Partial<AttendanceInsert>
export type FakeWriteCall = InspectableSingleUpsert | InspectableBatchUpsert

export interface FakeWriteCalls {
  upserts: FakeWriteCall[]
  inserts: SessionInsert[]
  updates: SessionUpdate[]
}

export type FakeSupabase = SupabaseClient<Database> & {
  state: FakeAttendanceDbState
  writes: FakeWriteCalls
}

const attendanceInsertSchema = z.object({
  sessao_id: z.string(),
  matricula_id: z.string(),
  data_aula: z.string(),
  status_presenca: z.string().optional(),
  presente: z.boolean().nullable().optional(),
  justificativa: z.string().nullable().optional(),
  professor_id: z.string(),
  marcado_por: z.string().nullable().optional(),
  marcado_em: z.string().nullable().optional(),
})
const attendanceWriteSchema = z.union([attendanceInsertSchema, z.array(attendanceInsertSchema)])
const inspectableWriteSchema = z.custom<FakeWriteCall>(value => attendanceWriteSchema.safeParse(value).success)
const sessionInsertSchema: z.ZodType<SessionInsert> = z.object({
  turma_id: z.string(),
  escola_id: z.string(),
  professor_id: z.string(),
  data_aula: z.string(),
  status: z.string(),
  aberta_em: z.string().nullable().optional(),
  auto_fechamento_agendado: z.string().nullable().optional(),
  conteudo_programatico: z.string(),
})
const sessionUpdateSchema: z.ZodType<SessionUpdate> = z.object({
  status: z.string().optional(),
  fechada_em: z.string().nullable().optional(),
  observacoes_fechamento: z.string().nullable().optional(),
  updated_at: z.string().nullable().optional(),
}).passthrough()

function jsonResponse<T>(body: T, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

function storedSession(state: FakeAttendanceDbState): string | null {
  if (!state.user) return null
  const user = authUser(state.user.id)
  return JSON.stringify({
    access_token: 'synthetic-access-token',
    refresh_token: 'synthetic-refresh-token',
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: 4_102_444_800,
    user,
  })
}

function authUser(id: string) {
  return {
    id,
    aud: 'authenticated',
    role: 'authenticated',
    email: `${id}@synthetic.invalid`,
    app_metadata: { provider: 'email', providers: ['email'] },
    user_metadata: {},
    identities: [],
    created_at: '2026-09-08T00:00:00.000Z',
    updated_at: '2026-09-08T00:00:00.000Z',
  }
}

function filterValue(parameters: URLSearchParams, column: string, operator: string): string | null {
  const expression = parameters.get(column)
  const prefix = `${operator}.`
  return expression?.startsWith(prefix) ? expression.slice(prefix.length) : null
}

function matchesString(value: string | null | undefined, expected: string | null): boolean {
  return expected === null || value === expected
}

function matchesBoolean(value: boolean | null | undefined, expected: string | null): boolean {
  if (expected === null) return true
  return value === (expected === 'true')
}

function inValues(parameters: URLSearchParams, column: string): string[] | null {
  const expression = filterValue(parameters, column, 'in')
  if (!expression?.startsWith('(') || !expression.endsWith(')')) return null
  return expression.slice(1, -1).split(',')
}

function filteredUsers(state: FakeAttendanceDbState, parameters: URLSearchParams) {
  const id = filterValue(parameters, 'id', 'eq')
  return state.users.filter(row => matchesString(row.id, id))
}

function filteredSessions(state: FakeAttendanceDbState, parameters: URLSearchParams) {
  const id = filterValue(parameters, 'id', 'eq')
  const turmaId = filterValue(parameters, 'turma_id', 'eq')
  const dataAula = filterValue(parameters, 'data_aula', 'eq')
  const statuses = inValues(parameters, 'status')
  const rows = state.sessions.filter(row =>
    matchesString(row.id, id)
    && matchesString(row.turma_id, turmaId)
    && matchesString(row.data_aula, dataAula)
    && (!statuses || statuses.includes(row.status)),
  )
  const ordered = parameters.get('order')?.startsWith('created_at.desc') ? rows.toReversed() : rows
  const limit = Number(parameters.get('limit') ?? ordered.length)
  return ordered.slice(0, limit)
}

function filteredTurmas(state: FakeAttendanceDbState, parameters: URLSearchParams) {
  const id = filterValue(parameters, 'id', 'eq')
  const active = filterValue(parameters, 'ativo', 'eq')
  return state.turmas.filter(row => matchesString(row.id, id) && matchesBoolean(row.ativo, active))
}

function filteredMatriculas(state: FakeAttendanceDbState, parameters: URLSearchParams) {
  const id = filterValue(parameters, 'id', 'eq')
  const turmaId = filterValue(parameters, 'turma_id', 'eq')
  const situacao = filterValue(parameters, 'situacao', 'eq')
  return state.matriculas.filter(row =>
    matchesString(row.id, id)
    && matchesString(row.turma_id, turmaId)
    && matchesString(row.situacao, situacao),
  )
}

function filteredAttendance(state: FakeAttendanceDbState, parameters: URLSearchParams) {
  const sessionId = filterValue(parameters, 'sessao_id', 'eq')
  const matriculaIds = inValues(parameters, 'matricula_id')
  const from = filterValue(parameters, 'data_aula', 'gte')
  const to = filterValue(parameters, 'data_aula', 'lte')
  return (state.attendance ?? []).filter(row =>
    matchesString(row.sessao_id, sessionId)
    && (!matriculaIds || matriculaIds.includes(row.matricula_id))
    && (!from || (row.data_aula ?? '') >= from)
    && (!to || (row.data_aula ?? '') <= to),
  )
}

function singleResponse<T>(request: Request, rows: T[]): Response {
  const wantsObject = request.headers.get('accept')?.includes('application/vnd.pgrst.object+json') === true
  if (!wantsObject) return jsonResponse(rows)
  if (rows.length === 1) return jsonResponse(rows[0])
  return jsonResponse({ code: 'PGRST116', details: 'The result contains 0 rows', hint: null, message: 'JSON object requested, multiple (or no) rows returned' }, 406)
}

function readResponse(request: Request, state: FakeAttendanceDbState, table: string, parameters: URLSearchParams) {
  if (table === 'users') return singleResponse(request, filteredUsers(state, parameters))
  if (table === 'sessoes_aula') return singleResponse(request, filteredSessions(state, parameters))
  if (table === 'turmas') return singleResponse(request, filteredTurmas(state, parameters))
  if (table === 'matriculas') return singleResponse(request, filteredMatriculas(state, parameters))
  if (table === 'frequencia') return singleResponse(request, filteredAttendance(state, parameters))
  return jsonResponse([])
}

function nextSessionRow(state: FakeAttendanceDbState, insert: SessionInsert): FakeSessionRow {
  return {
    id: 'new-row-id',
    turma_id: insert.turma_id,
    professor_id: insert.professor_id,
    escola_id: insert.escola_id,
    status: insert.status ?? 'ABERTA',
    data_aula: insert.data_aula,
    aberta_em: insert.aberta_em ?? null,
    auto_fechamento_agendado: state.insertedSessionDeadline ?? null,
    conteudo_programatico: insert.conteudo_programatico ?? null,
    created_at: '2026-09-08T00:00:00.000Z',
    travada_em: null,
    fechada_em: null,
  }
}

async function handleInsert(request: Request, state: FakeAttendanceDbState, writes: FakeWriteCalls, table: string) {
  if (table === 'sessoes_aula') {
    const insert = sessionInsertSchema.parse(await request.json())
    writes.inserts.push(insert)
    if (state.insertSessionError) return jsonResponse(state.insertSessionError, 400)
    const row = nextSessionRow(state, insert)
    state.sessions.push(row)
    return singleResponse(request, [row])
  }

  if (table === 'frequencia') {
    const parsed = attendanceWriteSchema.parse(await request.json())
    writes.upserts.push(inspectableWriteSchema.parse(parsed))
    const rows = Array.isArray(parsed) ? parsed : [parsed]
    state.attendance = [...(state.attendance ?? []), ...rows]
    return singleResponse(request, rows)
  }

  return jsonResponse({ code: 'PGRST204', message: `Unsupported insert table ${table}` }, 400)
}

async function handleUpdate(request: Request, state: FakeAttendanceDbState, writes: FakeWriteCalls, table: string, parameters: URLSearchParams) {
  if (table !== 'sessoes_aula') return jsonResponse({ code: 'PGRST204', message: `Unsupported update table ${table}` }, 400)
  const update = sessionUpdateSchema.parse(await request.json())
  writes.updates.push(update)
  const rows = filteredSessions(state, parameters)
  for (const row of rows) Object.assign(row, update)
  return singleResponse(request, rows)
}

function tableFrom(pathname: string): string {
  return pathname.split('/').at(-1) ?? ''
}

function createTransport(state: FakeAttendanceDbState, writes: FakeWriteCalls) {
  return async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const request = new Request(input, init)
    const url = new URL(request.url)
    if (url.pathname === '/auth/v1/user') {
      return state.user
        ? jsonResponse(authUser(state.user.id))
        : jsonResponse({ code: 401, message: 'not authenticated' }, 401)
    }
    if (url.pathname === '/rest/v1/rpc/is_session_editable') return jsonResponse(state.isEditable)

    const table = tableFrom(url.pathname)
    if (request.method === 'POST') return handleInsert(request, state, writes, table)
    if (request.method === 'PATCH') return handleUpdate(request, state, writes, table, url.searchParams)
    return readResponse(request, state, table, url.searchParams)
  }
}

export function createFakeSupabase(initial: FakeAttendanceDbState): FakeSupabase {
  const state = structuredClone(initial)
  const writes: FakeWriteCalls = { upserts: [], inserts: [], updates: [] }
  const client = createClient<Database>('http://127.0.0.1:54321', 'synthetic-anon-key', {
    auth: {
      persistSession: true,
      autoRefreshToken: false,
      detectSessionInUrl: false,
      storage: {
        getItem: () => storedSession(state),
        setItem: () => undefined,
        removeItem: () => undefined,
      },
    },
    global: { fetch: createTransport(state, writes) },
  })
  return Object.assign(client, { state, writes })
}
