import { createClient } from '@supabase/supabase-js'
import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import type { Database, Json } from '@/types/database'
import { createDiaryLesson, type DiaryLessonInput } from '@/lib/services/diary-lesson'

const SCHOOL = '10000000-0000-0000-0000-000000000001'
const TEACHER = '20000000-0000-0000-0000-000000000001'
const DIRECTOR = '20000000-0000-0000-0000-000000000002'
const TURMA = '30000000-0000-0000-0000-000000000001'
const SESSION = '40000000-0000-0000-0000-000000000001'
const NOW = new Date('2026-09-08T12:00:00-03:00')

const sessionSchema = z.object({
  id: z.string().default(SESSION),
  turma_id: z.string(),
  escola_id: z.string(),
  professor_id: z.string(),
  data_aula: z.string(),
  status: z.string(),
  aberta_em: z.string(),
  auto_fechamento_agendado: z.string(),
  conteudo_programatico: z.string(),
  travada_em: z.string().nullable().default(null),
  fechada_em: z.string().nullable().default(null),
  created_at: z.string().default(NOW.toISOString()),
})
const sessionInsertSchema = sessionSchema.omit({
  id: true, aberta_em: true, auto_fechamento_agendado: true,
  travada_em: true, fechada_em: true, created_at: true,
}).strict()
const contentSchema = z.object({
  sessao_id: z.string(), created_by: z.string(), tema: z.string(), objetivo: z.string(),
  habilidades_bncc: z.array(z.string()), metodologia: z.string().nullable(),
  recursos: z.string().nullable(), observacoes: z.string().nullable(),
})
type Session = z.output<typeof sessionSchema>
type Content = z.output<typeof contentSchema>
type State = {
  actorId: string | null
  role: string
  schoolId: string
  active: boolean
  editable: boolean
  contentFailure: boolean
  collision: boolean
  databaseNow: Date
  cutoffAt: string
  sessions: Session[]
  content: Content[]
  writes: string[]
}

function session(date = '2026-09-08'): Session {
  return sessionSchema.parse({
    turma_id: TURMA, escola_id: SCHOOL, professor_id: TEACHER, data_aula: date,
    status: 'ABERTA', aberta_em: `${date}T12:00:00-03:00`,
    auto_fechamento_agendado: `${date}T18:00:00-03:00`, conteudo_programatico: 'Aula',
  })
}

function state(overrides: Partial<State> = {}): State {
  return {
    actorId: TEACHER, role: 'professor', schoolId: SCHOOL, active: true,
    editable: true, contentFailure: false, collision: false,
    databaseNow: NOW, cutoffAt: '2026-09-08T21:00:00.000Z',
    sessions: [], content: [], writes: [], ...overrides,
  }
}

function json(data: Json, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } })
}

function readSessions(request: Request, current: State): Response {
  const params = new URL(request.url).searchParams
  let rows = current.sessions.filter(row =>
    ['id', 'turma_id', 'data_aula'].every(key => {
      const value = params.get(key)
      if (!value) return true
      const fields = { id: row.id, turma_id: row.turma_id, data_aula: row.data_aula }
      return Object.entries(fields).some(([field, actual]) => field === key && value === `eq.${actual}`)
    }),
  )
  if (params.has('status')) rows = rows.filter(row => ['ABERTA', 'PLANEJADA'].includes(row.status))
  return request.headers.get('accept')?.includes('vnd.pgrst.object') ? json(rows[0] ?? null) : json(rows)
}

async function sessionRequest(request: Request, current: State): Promise<Response> {
  if (request.method === 'GET') return readSessions(request, current)
  current.writes.push('session')
  if (current.collision) return json({ code: '23505', message: 'open session already exists' }, 409)
  const payload = sessionInsertSchema.parse(await request.json())
  if (current.databaseNow.getTime() >= Date.parse(current.cutoffAt)) {
    return json({ code: 'P0001', message: 'ATTENDANCE_OPEN_CUTOFF_PASSED: opening deadline has expired' }, 400)
  }
  const row = sessionSchema.parse({
    ...payload,
    aberta_em: current.databaseNow.toISOString(),
    auto_fechamento_agendado: current.cutoffAt,
  })
  current.sessions.push(row)
  return json(row, 201)
}

async function contentRequest(request: Request, current: State): Promise<Response> {
  current.writes.push('content')
  if (current.contentFailure) return json({ code: 'XX000', message: 'synthetic content failure' }, 500)
  const row = contentSchema.parse(await request.json())
  if (current.content.some(item => item.sessao_id === row.sessao_id)) {
    return json({ code: '23505', message: 'content already exists' }, 409)
  }
  current.content.push(row)
  return new Response(null, { status: 201 })
}

function client(current: State) {
  return createClient<Database>('http://127.0.0.1:54321', 'synthetic-key', {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      headers: { Authorization: 'Bearer synthetic-session' },
      fetch: async (input, init) => {
        const request = new Request(input, init)
        const path = new URL(request.url).pathname
        switch (path) {
          case '/auth/v1/user':
            return current.actorId ? json({ id: current.actorId, aud: 'authenticated' }) : json({ message: 'not authenticated' }, 401)
          case '/rest/v1/users':
            return json({ id: current.actorId, tipo_usuario: current.role, escola_id: current.schoolId, ativo: current.active })
          case '/rest/v1/turmas':
            return json({ id: TURMA, escola_id: SCHOOL, professor_id: TEACHER, ativo: true })
          case '/rest/v1/sessoes_aula':
            return sessionRequest(request, current)
          case '/rest/v1/conteudo_aula':
            return contentRequest(request, current)
          case '/rest/v1/rpc/is_session_editable':
            return json(current.editable)
          default:
            throw new Error(`Unexpected synthetic request: ${request.method} ${path}`)
        }
      },
    },
  })
}

function input(date = '2026-09-08'): DiaryLessonInput {
  return {
    turmaId: TURMA, date,
    content: {
      tema: 'Explorando frações', objetivo: 'Reconhecer partes de um todo',
      habilidades_bncc_input: 'EF01MA06, EF01MA08', metodologia: ' Materiais concretos ',
      recursos: ' Papel ', observacoes: ' Atividade em grupo ',
    },
  }
}

function create(current: State, values = input(), now = NOW) {
  return createDiaryLesson(client(current), values, { now: () => now })
}

describe('diary lesson through canonical attendance', () => {
  it('derives session identity from the class and receives the database cutoff while preserving content', async () => {
    const current = state({ actorId: DIRECTOR, role: 'diretor' })
    expect(await create(current)).toEqual({ success: true, sessionId: SESSION })
    expect(current.sessions[0]).toMatchObject({
      escola_id: SCHOOL, professor_id: TEACHER, status: 'ABERTA',
      auto_fechamento_agendado: '2026-09-08T21:00:00.000Z',
    })
    expect(current.content[0]).toEqual({
      sessao_id: SESSION, created_by: DIRECTOR, tema: 'Explorando frações',
      objetivo: 'Reconhecer partes de um todo', habilidades_bncc: ['EF01MA06', 'EF01MA08'],
      metodologia: 'Materiais concretos', recursos: 'Papel', observacoes: 'Atividade em grupo',
    })
  })

  it.each([
    { actorId: null }, { active: false }, { role: 'admin' },
    { schoolId: '10000000-0000-0000-0000-000000000002' }, { actorId: DIRECTOR },
  ])('denies unauthorized writers before either write: %j', async overrides => {
    const current = state(overrides)
    expect(await create(current)).toMatchObject({ success: false })
    expect(current.writes).toEqual([])
  })

  it.each(['2026-09-07', '2026-09-09'])('does not create a session on a different date: %s', async date => {
    const current = state()
    expect(await create(current, input(date))).toMatchObject({ success: false, code: 'DATE_NOT_CURRENT' })
    expect(current.writes).toEqual([])
  })

  it('does not create a session after the canonical cutoff', async () => {
    const current = state({ databaseNow: new Date('2026-09-08T18:01:00-03:00') })
    expect(await create(current, input(), current.databaseNow)).toMatchObject({
      success: false, code: 'SESSION_CUTOFF_PASSED',
    })
    expect(current.writes).toEqual(['session'])
    expect(current.sessions).toEqual([])
    expect(current.content).toEqual([])
  })

  it('opens after 18h when the school database policy still permits it', async () => {
    const current = state({
      databaseNow: new Date('2026-09-08T19:00:00-03:00'),
      cutoffAt: '2026-09-08T20:30:00-03:00',
    })
    expect(await create(current, input(), current.databaseNow)).toEqual({ success: true, sessionId: SESSION })
    expect(current.sessions[0]?.auto_fechamento_agendado).toBe(current.cutoffAt)
    expect(current.content).toHaveLength(1)
  })

  it('uses the database decision for an existing session during an audited correction window', async () => {
    const current = state({ sessions: [session('2026-09-07')] })
    expect(await create(current, input('2026-09-07'))).toEqual({ success: true, sessionId: SESSION })
    expect(current.writes).toEqual(['content'])
  })

  it('denies content when the existing session window is expired', async () => {
    const current = state({ sessions: [session('2026-09-07')], editable: false })
    expect(await create(current, input('2026-09-07'))).toMatchObject({ success: false, code: 'SESSION_LOCKED' })
    expect(current.writes).toEqual([])
  })

  it('does not overwrite the content of an existing lesson', async () => {
    const current = state()
    await create(current)
    expect(await create(current)).toMatchObject({ success: false, code: 'LESSON_ALREADY_EXISTS' })
    expect(current.sessions).toHaveLength(1)
    expect(current.content).toHaveLength(1)
  })

  it('allows a content retry on the same session after a failed insert', async () => {
    const current = state({ contentFailure: true })
    expect(await create(current)).toMatchObject({ success: false, code: 'LESSON_CONTENT_FAILED' })
    expect(current.content).toEqual([])
    current.contentFailure = false
    expect(await create(current)).toEqual({ success: true, sessionId: SESSION })
    expect(current.sessions).toHaveLength(1)
  })

  it('stops before content insertion when a concurrent session wins the unique constraint', async () => {
    const current = state({ collision: true })
    expect(await create(current)).toMatchObject({ success: false, code: 'SESSION_ALREADY_OPEN' })
    expect(current.writes).toEqual(['session'])
  })
})
