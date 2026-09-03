import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import type { GlobalSearchActor } from '@/lib/global-search'

const { actorMock, clientMock, authorizedStudentsMock } = vi.hoisted(() => ({
  actorMock: vi.fn(),
  clientMock: vi.fn(),
  authorizedStudentsMock: vi.fn(),
}))

vi.mock('@/lib/pilot/pilot-server-auth', () => ({ requirePilotActor: actorMock }))
vi.mock('@/lib/supabase/server', () => ({ createClient: clientMock }))
vi.mock('@/lib/sensitive-family-access', () => ({ getAuthorizedStudentProfiles: authorizedStudentsMock }))

import { GET } from '@/app/api/search/route'

type Row = Record<string, unknown>
type QueryResult = { data: Row[]; error: null }

class Query implements PromiseLike<QueryResult> {
  private readonly filters: Array<(row: Row) => boolean> = []

  constructor(private readonly rows: Row[]) {}

  select() {
    return this
  }

  eq(column: string, value: unknown) {
    this.filters.push(row => row[column] === value)
    return this
  }

  in(column: string, values: unknown[]) {
    this.filters.push(row => values.includes(row[column]))
    return this
  }

  then<TResult1 = QueryResult, TResult2 = never>(
    onfulfilled?: ((value: QueryResult) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    const data = this.rows.filter(row => this.filters.every(filter => filter(row)))
    return Promise.resolve({ data, error: null }).then(onfulfilled, onrejected)
  }
}

function clientFor(tables: Record<string, Row[]>) {
  return {
    from(table: string) {
      return new Query(tables[table] ?? [])
    },
  } as unknown as Parameters<typeof import('@/lib/global-search').searchGlobal>[0]
}

function request(params: Record<string, string> = {}) {
  const search = new URLSearchParams({ query: 'ana', ...params })
  return new NextRequest(`http://test/api/search?${search}`)
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

const tables: Record<string, Row[]> = {
  escolas: [
    { id: schoolA, nome: 'Escola Sintética A', codigo: 'SYN-A', ativo: true },
    { id: schoolB, nome: 'Escola Sintética B', codigo: 'SYN-B', ativo: true },
  ],
  users: [
    { id: 'teacher-a', nome: 'Ana Professora', email: 'ana@synthetic.invalid', escola_id: schoolA, tipo_usuario: 'professor', ativo: true, created_at: '2026-01-02T00:00:00Z' },
    { id: 'teacher-b', nome: 'Ana Outra', email: 'outra@synthetic.invalid', escola_id: schoolB, tipo_usuario: 'professor', ativo: true, created_at: '2026-01-03T00:00:00Z' },
  ],
  turmas: [
    { id: 'class-a', nome: 'Ana Turma', serie: '1 ano', turno: 'matutino', escola_id: schoolA, professor_id: 'teacher-a', ativo: true, created_at: '2026-01-04T00:00:00Z' },
  ],
  matriculas: [{ aluno_id: studentA.id, turma_id: 'class-a', situacao: 'ativa' }],
}

function setActor(actor: GlobalSearchActor) {
  actorMock.mockResolvedValue(actor)
  clientMock.mockResolvedValue(clientFor(tables))
}

describe('global search route', () => {
  beforeEach(() => {
    actorMock.mockReset()
    clientMock.mockReset()
    authorizedStudentsMock.mockReset()
    authorizedStudentsMock.mockResolvedValue([studentA])
  })

  it('denies public callers without a result body', async () => {
    actorMock.mockRejectedValue(new Error('PILOT_AUTH_REQUIRED'))

    const response = await GET(request())

    expect(response.status).toBe(401)
    expect(await response.json()).toEqual({ results: [] })
    expect(clientMock).not.toHaveBeenCalled()
  })

  it('denies unauthorized roles without reading search data', async () => {
    actorMock.mockRejectedValue(new Error('PILOT_ROLE_DENIED'))

    const response = await GET(request())

    expect(response.status).toBe(403)
    expect(await response.json()).toEqual({ results: [] })
    expect(clientMock).not.toHaveBeenCalled()
  })

  it('keeps ranking, pagination, and entity filtering deterministic', async () => {
    setActor({ id: 'admin', role: 'admin', schoolId: null })

    const firstPage = await GET(request({ type: 'all', limit: '1' }))
    const secondPage = await GET(request({ type: 'all', limit: '1', offset: '1' }))
    const teachersOnly = await GET(request({ type: 'teacher', limit: '10' }))

    expect((await firstPage.json()).results[0]).toMatchObject({ id: 'teacher-b', type: 'teacher', relevanceScore: 0.94 })
    expect((await secondPage.json()).results[0].id).toBe('teacher-a')
    expect((await teachersOnly.json()).results.every((result: { type: string }) => result.type === 'teacher')).toBe(true)
  })

  it('returns sensitive student fields only to the governed family roles', async () => {
    setActor({ id: 'director', role: 'diretor', schoolId: schoolA })
    const allowed = await GET(request({ type: 'student', query: studentA.cpf }))
    const allowedBody = await allowed.json()

    setActor({ id: 'teacher-a', role: 'professor', schoolId: schoolA })
    authorizedStudentsMock.mockResolvedValue([])
    clientMock.mockResolvedValue(clientFor({
      ...tables,
      alunos: [{ id: studentA.id, nome_completo: studentA.nome_completo, escola_id: schoolA, ativo: true, created_at: studentA.created_at }],
    }))
    const denied = await GET(request({ type: 'student' }))
    const deniedBody = await denied.json()

    expect(allowedBody.results[0].data).toMatchObject({ cpf: studentA.cpf, endereco: studentA.endereco, telefone: studentA.telefone })
    expect(authorizedStudentsMock).toHaveBeenCalledTimes(1)
    expect(deniedBody.results[0].data).not.toHaveProperty('cpf')
    expect(deniedBody.results[0].data).not.toHaveProperty('endereco')
    expect(deniedBody.results[0].data).not.toHaveProperty('telefone')
    expect(JSON.stringify(deniedBody)).not.toContain(studentA.cpf)
    expect(JSON.stringify(deniedBody)).not.toContain(studentA.endereco)
    expect(JSON.stringify(deniedBody)).not.toContain(studentA.telefone)
  })

  it('keeps a school-scoped actor away from another school', async () => {
    setActor({ id: 'director-a', role: 'diretor', schoolId: schoolA })
    authorizedStudentsMock.mockResolvedValue([
      studentA,
      { ...studentA, id: 'student-b', nome_completo: 'Ana Escola B', escola_id: schoolB, cpf: '00000000272' },
    ])

    const response = await GET(request({ type: 'student' }))
    const body = await response.json()

    expect(body.results).toHaveLength(1)
    expect(body.results[0].data.escola).toBe('Escola Sintética A')
  })

  it('does not expose raw query data in failures', async () => {
    setActor({ id: 'admin', role: 'admin', schoolId: null })
    clientMock.mockRejectedValue(new Error('Rua Sintética A'))

    const response = await GET(request({ query: studentA.endereco }))

    expect(response.status).toBe(500)
    expect(JSON.stringify(await response.json())).not.toContain(studentA.endereco)
  })
})
