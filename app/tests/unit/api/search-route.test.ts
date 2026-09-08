import { describe, expect, it } from 'vitest'
import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { createSearchRoute } from '@/app/api/search/handler'
import {
  createSupabaseGlobalSearchStore,
  searchGlobal,
  type GlobalSearchActor,
  type GlobalSearchStore,
} from '@/lib/global-search'
import type { Database } from '@/types/database'

type SearchTransportValue = boolean | null | string
type SearchTransportRow = Record<string, SearchTransportValue>
type SearchTransportTables = {
  escolas: SearchTransportRow[]
  alunos: SearchTransportRow[]
  matriculas: SearchTransportRow[]
  turmas: SearchTransportRow[]
  users: SearchTransportRow[]
}

const schoolA = 'school-a'
const schoolB = 'school-b'
const studentA = {
  id: 'student-a',
  nome_completo: 'Ana Sintética Alves',
  escola_id: schoolA,
  ativo: true,
  created_at: '2026-01-01T00:00:00Z',
  cpf: '00000000191',
  endereco: 'Rua Sintética A',
  telefone: '11900000001',
}
const tables: SearchTransportTables = {
  escolas: [
    { id: schoolA, nome: 'Escola Sintética A', codigo: 'SYN-A', ativo: true },
    { id: schoolB, nome: 'Escola Sintética B', codigo: 'SYN-B', ativo: true },
  ],
  alunos: [
    { id: studentA.id, nome_completo: studentA.nome_completo, escola_id: schoolA, ativo: true, created_at: studentA.created_at },
  ],
  matriculas: [{ aluno_id: studentA.id, turma_id: 'class-a', situacao: 'ativa' }],
  turmas: [
    { id: 'class-a', nome: 'Ana Turma', serie: '1 ano', turno: 'matutino', escola_id: schoolA, professor_id: 'teacher-a', ativo: true, created_at: '2026-01-04T00:00:00Z' },
  ],
  users: [
    { id: 'teacher-a', nome: 'Ana Professora', email: 'ana@synthetic.invalid', escola_id: schoolA, tipo_usuario: 'professor', ativo: true, created_at: '2026-01-02T00:00:00Z' },
    { id: 'teacher-b', nome: 'Ana Outra', email: 'outra@synthetic.invalid', escola_id: schoolB, tipo_usuario: 'professor', ativo: true, created_at: '2026-01-03T00:00:00Z' },
  ],
}
const rpcPayloadSchema = z.object({ p_school_id: z.string().nullable().optional() })

class SyntheticSupabaseTransport {
  authorizedProfileCalls = 0
  calls = 0
  private failure: string | null = null

  constructor(
    private readonly source: SearchTransportTables,
    private readonly authorizedProfiles: SearchTransportRow[] = [studentA],
  ) {}

  readonly fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    this.calls += 1
    if (this.failure) return jsonResponse({ message: this.failure }, 500)

    const request = input instanceof Request ? input : new Request(input, init)
    const url = new URL(request.url)
    if (url.pathname.endsWith('/rpc/get_authorized_student_profiles')) {
      return this.authorizedStudentsResponse(request)
    }

    const table = tableFor(url.pathname)
    if (!table) return jsonResponse({ message: 'Synthetic table not found' }, 404)
    return jsonResponse(filterRows(this.source[table], url.searchParams))
  }

  failWith(message: string): void {
    this.failure = message
  }

  private async authorizedStudentsResponse(request: Request): Promise<Response> {
    this.authorizedProfileCalls += 1
    const payload = rpcPayloadSchema.parse(JSON.parse(await request.text()))
    const data = payload.p_school_id
      ? this.authorizedProfiles.filter(profile => profile.escola_id === payload.p_school_id)
      : this.authorizedProfiles
    return jsonResponse(data)
  }
}

function tableFor(pathname: string): keyof SearchTransportTables | null {
  const table = pathname.split('/').at(-1)
  if (table === 'alunos' || table === 'escolas' || table === 'matriculas' || table === 'turmas' || table === 'users') return table
  return null
}

function filterRows(rows: SearchTransportRow[], parameters: URLSearchParams): SearchTransportRow[] {
  return rows.filter(row => Array.from(parameters.entries()).every(([column, expression]) => matchesQuery(row, column, expression)))
}

function matchesQuery(row: SearchTransportRow, column: string, expression: string): boolean {
  if (column === 'select' || column === 'order' || column === 'limit' || column === 'offset') return true
  if (expression.startsWith('eq.')) return String(row[column]) === expression.slice(3)
  if (expression.startsWith('in.(') && expression.endsWith(')')) {
    return expression.slice(4, -1).split(',').includes(String(row[column]))
  }
  return false
}

function jsonResponse(body: SearchTransportRow[] | { message: string }, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

function createProductionStore(transport: SyntheticSupabaseTransport): GlobalSearchStore {
  const client = createClient<Database>('http://127.0.0.1:54321', 'synthetic-anon-key', {
    global: { fetch: transport.fetch },
  })
  return createSupabaseGlobalSearchStore(client)
}

function request(params: Record<string, string> = {}): NextRequest {
  const search = new URLSearchParams({ query: 'ana', ...params })
  return new NextRequest(`http://test/api/search?${search}`)
}

function createActorResolver(actor: GlobalSearchActor | Error) {
  return async (): Promise<GlobalSearchActor> => {
    if (actor instanceof Error) throw actor
    return actor
  }
}

function routeFor(
  actor: GlobalSearchActor | Error,
  transport = new SyntheticSupabaseTransport(tables),
) {
  let storeCreations = 0
  const route = createSearchRoute({
    requireActor: createActorResolver(actor),
    createStore: async () => {
      storeCreations += 1
      return createProductionStore(transport)
    },
    search: searchGlobal,
  })
  return { route, storeCreations: () => storeCreations, transport }
}

describe('global search route', () => {
  it('denies public callers without constructing a search store', async () => {
    const search = routeFor(new Error('PILOT_AUTH_REQUIRED'))

    const response = await search.route(request())

    expect(response.status).toBe(401)
    expect(await response.json()).toEqual({ results: [] })
    expect(search.storeCreations()).toBe(0)
    expect(search.transport.calls).toBe(0)
  })

  it('denies unauthorized roles without reading search data', async () => {
    const search = routeFor(new Error('PILOT_ROLE_DENIED'))

    const response = await search.route(request())

    expect(response.status).toBe(403)
    expect(await response.json()).toEqual({ results: [] })
    expect(search.transport.calls).toBe(0)
  })

  it('keeps ranking, pagination, and entity filtering deterministic through the production store', async () => {
    const search = routeFor({ id: 'admin', role: 'admin', schoolId: null })

    const firstPage = await search.route(request({ type: 'all', limit: '1' }))
    const secondPage = await search.route(request({ type: 'all', limit: '1', offset: '1' }))
    const teachersOnly = await search.route(request({ type: 'teacher', limit: '10' }))

    expect((await firstPage.json()).results[0]).toMatchObject({ id: 'teacher-b', type: 'teacher', relevanceScore: 0.94 })
    expect((await secondPage.json()).results[0]).toMatchObject({ id: 'teacher-a', type: 'teacher' })
    expect((await teachersOnly.json()).results).toEqual([
      expect.objectContaining({ id: 'teacher-b', type: 'teacher' }),
      expect.objectContaining({ id: 'teacher-a', type: 'teacher' }),
    ])
  })

  it('returns sensitive student fields only to governed roles and never emits a blocked destination', async () => {
    const allowed = routeFor({ id: 'director', role: 'diretor', schoolId: schoolA })
    const allowedResponse = await allowed.route(request({ type: 'student', query: studentA.cpf }))
    const allowedBody = await allowedResponse.json()
    const deniedTransport = new SyntheticSupabaseTransport(tables, [])
    const denied = routeFor({ id: 'teacher-a', role: 'professor', schoolId: schoolA }, deniedTransport)
    const deniedResponse = await denied.route(request({ type: 'student' }))
    const deniedBody = await deniedResponse.json()

    expect(allowedBody.results[0].data).toMatchObject({ cpf: studentA.cpf, endereco: studentA.endereco, telefone: studentA.telefone })
    expect(allowed.transport.authorizedProfileCalls).toBe(1)
    expect(deniedBody.results).toEqual([])
    expect(JSON.stringify(deniedBody)).not.toContain(studentA.cpf)
    expect(JSON.stringify(deniedBody)).not.toContain(studentA.endereco)
    expect(JSON.stringify(deniedBody)).not.toContain(studentA.telefone)
  })

  it('keeps a school-scoped actor away from another school', async () => {
    const transport = new SyntheticSupabaseTransport(tables, [
      studentA,
      { ...studentA, id: 'student-b', nome_completo: 'Ana Escola B', escola_id: schoolB, cpf: '00000000272' },
    ])
    const search = routeFor({ id: 'director-a', role: 'diretor', schoolId: schoolA }, transport)

    const response = await search.route(request({ type: 'student' }))
    const body = await response.json()

    expect(body.results).toHaveLength(1)
    expect(body.results[0].data.escola).toBe('Escola Sintética A')
  })

  it('does not expose raw query data in failures', async () => {
    const transport = new SyntheticSupabaseTransport(tables)
    transport.failWith('Rua Sintética A')
    const search = routeFor({ id: 'admin', role: 'admin', schoolId: null }, transport)

    const response = await search.route(request({ query: studentA.endereco }))

    expect(response.status).toBe(500)
    expect(JSON.stringify(await response.json())).not.toContain(studentA.endereco)
  })
})
