import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '@/app/api/frequencia/marcar/route'

/**
 * Regression coverage for issue #33 (duplicate evidence: issue #32).
 *
 * The route used to select `role` from `users`, but the schema column is
 * `tipo_usuario`. The old select returned no row (or an undefined role),
 * so every teacher - authorized or not - hit the 403 gate. These tests pin
 * the corrected behavior: the users lookup must use `tipo_usuario`, and the
 * gate must admit only roles that can record attendance (professor, diretor).
 */

const mocks = vi.hoisted(() => {
  type Row = Record<string, unknown> | null
  type QueryResult = { data: Row[]; error: null }
  type SingleResult = { data: Row; error: null }

  interface ChainQuery {
    select: (columns: string) => ChainQuery
    eq: () => ChainQuery
    in: () => ChainQuery
    or: () => ChainQuery
    single: () => Promise<SingleResult>
    then: (
      onfulfilled?: ((value: QueryResult) => QueryResult | PromiseLike<QueryResult>) | null | undefined
    ) => Promise<QueryResult>
  }

  const state = {
    user: null as { id: string } | null,
    profile: null as Row,
    session: null as Row,
    matriculas: [] as Row[],
    frequencia: [] as Row[],
    rpcError: null as Error | null,
    usersSelectCalls: [] as string[],
  }

  const chainFor = (table: string): ChainQuery => {
    const q: ChainQuery = {
      select(columns: string) {
        if (table === 'users') state.usersSelectCalls.push(columns)
        return q
      },
      eq: () => q,
      in: () => q,
      or: () => q,
      single: async () => {
        const row =
          table === 'users'
            ? state.profile
            : table === 'sessoes_aula' || table === 'aulas_abertas'
              ? state.session
              : null
        return { data: row, error: null }
      },
      then(
        onfulfilled?: ((value: QueryResult) => QueryResult | PromiseLike<QueryResult>) | null | undefined
      ) {
        const rows =
          table === 'matriculas'
            ? state.matriculas
            : table === 'frequencia'
              ? state.frequencia
              : []
        const result: QueryResult = { data: rows, error: null }
        return Promise.resolve(onfulfilled ? onfulfilled(result) : result)
      },
    }
    return q
  }

  const fakeClient = {
    auth: {
      getUser: vi.fn(async () => ({ data: { user: state.user }, error: null })),
    },
    from: vi.fn((table: string) => chainFor(table)),
    rpc: vi.fn(async () =>
      state.rpcError
        ? { data: null, error: state.rpcError }
        : { data: { ok: true }, error: null }
    ),
  }

  return { state, fakeClient }
})

vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(() => mocks.fakeClient),
}))

const PROFESSOR_ID = '11111111-1111-4111-8111-111111111111'
const DIRETOR_ID = '22222222-2222-4222-8222-222222222222'
const ALUNO_ID = '33333333-3333-4333-8333-333333333333'
const SESSAO_ID = '44444444-4444-4444-8444-444444444444'
const AULA_ID = '55555555-5555-4555-8555-555555555555'
const ESCOLA_A = 'escola-a'
const ESCOLA_B = 'escola-b'

function buildSession(overrides: Record<string, unknown> = {}) {
  return {
    id: SESSAO_ID,
    status: 'ABERTA',
    professor_id: PROFESSOR_ID,
    turma_id: 'turma-1',
    escola_id: ESCOLA_A,
    fechada_em: null,
    turmas: { escola_id: ESCOLA_A },
    ...overrides,
  }
}

function postMarcar(body: unknown) {
  return POST(
    new NextRequest('http://localhost/api/frequencia/marcar', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    })
  )
}

async function responseBody(response: Response): Promise<Record<string, unknown>> {
  return response.json() as Promise<Record<string, unknown>>
}

function errorCode(body: Record<string, unknown>): string | undefined {
  const error = body.error as Record<string, unknown> | undefined
  return typeof error?.code === 'string' ? error.code : undefined
}

describe('POST /api/frequencia/marcar', () => {
  beforeEach(() => {
    mocks.state.user = { id: PROFESSOR_ID }
    mocks.state.profile = { tipo_usuario: 'professor', escola_id: ESCOLA_A }
    mocks.state.session = buildSession()
    mocks.state.matriculas = [{ aluno_id: ALUNO_ID }]
    mocks.state.frequencia = [{ presente: true }, { presente: false }]
    mocks.state.rpcError = null
    mocks.state.usersSelectCalls = []
    mocks.fakeClient.auth.getUser.mockClear()
    mocks.fakeClient.from.mockClear()
    mocks.fakeClient.rpc.mockClear()
  })

  it('deve marcar frequência para professor autorizado da mesma escola', async () => {
    const response = await postMarcar({
      sessao_id: SESSAO_ID,
      frequencias: [{ aluno_id: ALUNO_ID, presente: true }],
    })

    expect(response.status).toBe(200)
    const body = await responseBody(response)
    expect(body.success).toBe(true)
    expect(mocks.fakeClient.rpc).toHaveBeenCalledTimes(1)
  })

  it('deve permitir que diretor passe a checagem de permissão', async () => {
    mocks.state.user = { id: DIRETOR_ID }
    mocks.state.profile = { tipo_usuario: 'diretor', escola_id: ESCOLA_A }
    // Sem sessão: se o diretor passou a primeira checagem, a resposta é 404
    // (sessão não encontrada) em vez de 403 de permissão.
    mocks.state.session = null

    const response = await postMarcar({
      sessao_id: SESSAO_ID,
      frequencias: [{ aluno_id: ALUNO_ID, presente: true }],
    })

    expect(response.status).toBe(404)
    const body = await responseBody(response)
    expect(errorCode(body)).toBe('SESSION_NOT_FOUND')
    expect(mocks.fakeClient.rpc).not.toHaveBeenCalled()
  })

  it('deve negar usuário sem perfil na tabela users', async () => {
    mocks.state.profile = null

    const response = await postMarcar({
      sessao_id: SESSAO_ID,
      frequencias: [{ aluno_id: ALUNO_ID, presente: true }],
    })

    expect(response.status).toBe(403)
    const body = await responseBody(response)
    expect(errorCode(body)).toBe('INSUFFICIENT_PERMISSIONS')
    expect(mocks.fakeClient.rpc).not.toHaveBeenCalled()
  })

  it('deve negar perfil que não pode registrar frequência (secretario)', async () => {
    mocks.state.profile = { tipo_usuario: 'secretario', escola_id: ESCOLA_A }

    const response = await postMarcar({
      sessao_id: SESSAO_ID,
      frequencias: [{ aluno_id: ALUNO_ID, presente: true }],
    })

    expect(response.status).toBe(403)
    const body = await responseBody(response)
    expect(errorCode(body)).toBe('INSUFFICIENT_PERMISSIONS')
    expect(mocks.fakeClient.rpc).not.toHaveBeenCalled()
  })

  it('deve negar professor de escola diferente da sessão', async () => {
    mocks.state.profile = { tipo_usuario: 'professor', escola_id: ESCOLA_B }

    const response = await postMarcar({
      sessao_id: SESSAO_ID,
      frequencias: [{ aluno_id: ALUNO_ID, presente: true }],
    })

    expect(response.status).toBe(403)
    const body = await responseBody(response)
    expect(errorCode(body)).toBe('INSUFFICIENT_PERMISSIONS')
    expect(mocks.fakeClient.rpc).not.toHaveBeenCalled()
  })

  it('deve exigir autenticação antes da checagem de permissão', async () => {
    mocks.state.user = null

    const response = await postMarcar({
      sessao_id: SESSAO_ID,
      frequencias: [{ aluno_id: ALUNO_ID, presente: true }],
    })

    expect(response.status).toBe(401)
    const body = await responseBody(response)
    expect(errorCode(body)).toBe('AUTH_REQUIRED')
  })

  it('deve consultar a coluna tipo_usuario e nunca role na tabela users', async () => {
    await postMarcar({
      sessao_id: SESSAO_ID,
      frequencias: [{ aluno_id: ALUNO_ID, presente: true }],
    })

    expect(mocks.state.usersSelectCalls).toHaveLength(1)
    const usersSelect = mocks.state.usersSelectCalls[0]
    expect(usersSelect).toContain('tipo_usuario')
    expect(usersSelect).not.toContain('role')
  })

  it('deve aceitar o caminho legado via aula_id com a mesma checagem de permissão', async () => {
    mocks.state.session = {
      id: AULA_ID,
      status: 'aberta',
      professor_id: PROFESSOR_ID,
      turma_id: 'turma-1',
      fechada_em: null,
      tempo_limite_minutos: 60,
      turmas: { escola_id: ESCOLA_A },
    }

    const response = await postMarcar({
      aula_id: AULA_ID,
      frequencias: [{ aluno_id: ALUNO_ID, presente: true }],
    })

    expect(response.status).toBe(200)
    const body = await responseBody(response)
    expect(body.success).toBe(true)
    expect(mocks.fakeClient.rpc).toHaveBeenCalledTimes(1)
  })
})
