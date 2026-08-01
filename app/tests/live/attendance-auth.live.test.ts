/**
 * LIVE exploit reproduction + regression contract for issue #30.
 *
 * Runs against a REAL local Supabase stack with the pilot provisioner applied
 * and the synthetic seed loaded (see scripts/run-pilot-e2e.sh). The actions
 * execute their real code with real authenticated sessions; only the
 * next/headers request context is stubbed, and the SSR client factory is
 * pointed at a real supabase-js client signed in as the scenario actor.
 *
 * Skipped unless EDUCA_LIVE_SUPABASE=1 plus NEXT_PUBLIC_SUPABASE_URL /
 * NEXT_PUBLIC_SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY are set.
 *
 * Usage (from app/):
 *   EDUCA_LIVE_SUPABASE=1 NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321 \
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY=... SUPABASE_SERVICE_ROLE_KEY=... \
 *   pnpm vitest run tests/live/attendance-auth.live.test.ts
 *
 * Expected outcomes BEFORE the fix (divergence evidence):
 *   - secretario CAN mark attendance (role rule violated)
 *   - diretor CAN mark into another escola's session (school rule violated)
 *   - diretor CAN attribute a session to a forged professor_id
 *   - valid professor CANNOT mark at all (RLS denies: professor_id never set)
 * Expected outcomes AFTER the fix: every case below passes.
 */

import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { markAttendanceAction } from '@/app/actions/attendance/mark-attendance'
import { openSessionAction } from '@/app/actions/attendance/open-session'
import { closeSessionAction } from '@/app/actions/attendance/close-session'
import { checkLockStatusAction } from '@/app/actions/attendance/check-lock-status'

const LIVE = process.env.EDUCA_LIVE_SUPABASE === '1'
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

const PASSWORD = 'Synthetic-Only-2026!'

const SCHOOL_A = '10000000-0000-0000-0000-000000000001'
const SCHOOL_B = '10000000-0000-0000-0000-000000000002'
const TURMA_A = '30000000-0000-0000-0000-000000000001'
const TURMA_B = '30000000-0000-0000-0000-000000000002'
const MATRICULA_A = '50000000-0000-0000-0000-000000000001'

/** Secretaria user id: resolved lazily because it exists only after seeding. */
let SECRETARIA_ID = '00000000-0000-0000-0000-000000000000'

const run = LIVE
  ? describe
  : describe.skip

// ---------------------------------------------------------------------------
// SSR client factory stub: hands the action under test a REAL supabase-js
// client authenticated as the current scenario actor.
// ---------------------------------------------------------------------------

const { setActorClient, getActorClient } = vi.hoisted(() => {
  let client: unknown = null
  return {
    setActorClient(c: unknown) {
      client = c
    },
    getActorClient() {
      return client
    },
  }
})

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => getActorClient()),
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

let admin: SupabaseClient | null = null

/**
 * When EDUCA_LIVE_REPORT=1, log every scenario outcome as a structured line
 * (used to capture before/after divergence evidence, see the issue #30 PR).
 */
function report(label: string, result: { success: boolean; code?: string; error?: string; session?: Record<string, unknown> | null }) {
  if (process.env.EDUCA_LIVE_REPORT === '1') {
    // eslint-disable-next-line no-console
    console.log(`[LIVE-REPORT] ${label} -> ${JSON.stringify({ success: result.success, code: result.code, error: result.error, sessionId: result.session?.id, sessionProfessorId: result.session?.professor_id, sessionEscolaId: result.session?.escola_id })}`)
  }
}

/** Create an auth user + users row (synthetic), returns the user id. */
async function createSyntheticUser(
  email: string,
  nome: string,
  tipo_usuario: string,
  escola_id: string | null
): Promise<string> {
  const { data: authUser, error: authError } = await admin!.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { synthetic: true },
  })
  if (authError || !authUser.user) throw authError || new Error(`createUser failed: ${email}`)
  const { error: profileError } = await admin!.from('users').insert({
    id: authUser.user.id,
    nome,
    email,
    tipo_usuario,
    escola_id,
    ativo: true,
    primeiro_login: false,
    senha_padrao: false,
  })
  if (profileError) throw profileError
  return authUser.user.id
}

async function actorClient(email: string): Promise<SupabaseClient> {
  const client = createClient(URL!, ANON_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  })
  const { data, error } = await client.auth.signInWithPassword({ email, password: PASSWORD })
  if (error || !data.session) {
    throw new Error(`login failed for ${email}: ${error?.message ?? 'no session'}`)
  }
  return client
}

async function wipeTestData() {
  // Remove every session and attendance row created by these tests.
  await admin!.from('frequencia').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  await admin!.from('sessoes_aula').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  // Remove synthetic aux users (professor.b) and their turmas/auth identities.
  const { data: auxUsers } = await admin!.from('users')
    .select('id').eq('email', 'professor.b@synthetic.invalid')
  for (const user of auxUsers ?? []) {
    await admin!.from('turmas').delete().eq('professor_id', user.id)
    await admin!.from('users').delete().eq('id', user.id)
    try {
      await admin!.auth.admin.deleteUser(user.id)
    } catch {
      // identity may already be gone
    }
  }
}

run('attendance server actions - live authz (issue #30)', () => {
  beforeAll(async () => {
    if (!URL || !ANON_KEY || !SERVICE_ROLE_KEY) {
      throw new Error('live test requires NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY')
    }
    admin = createClient(URL, SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
    })
    const { data: secretaria } = await admin.from('users')
      .select('id').eq('email', 'secretaria@synthetic.invalid').single()
    SECRETARIA_ID = secretaria?.id ?? SECRETARIA_ID
    await wipeTestData()
  })

  afterAll(async () => {
    if (admin) await wipeTestData()
  })

  beforeEach(async () => {
    await wipeTestData()
  })

  async function openSessionAs(email: string, turmaId: string, date: string, extra: Record<string, unknown> = {}) {
    setActorClient(await actorClient(email))
    // Realistic client: sends its own user id. Exploit scenarios override
    // professor_id/escola_id below; the server must ignore those overrides.
    const { data: actorRow } = await admin!.from('users').select('id').eq('email', email).single()
    const result = await openSessionAction({
      turma_id: turmaId,
      data_aula: date,
      conteudo_programatico: 'Conteudo sintetico',
      professor_id: actorRow?.id ?? SECRETARIA_ID,
      escola_id: SCHOOL_A,
      ...extra,
    })
    return result
  }

  async function markAs(email: string, sessaoId: string, matriculaId: string, date: string) {
    setActorClient(await actorClient(email))
    return markAttendanceAction({ sessao_id: sessaoId, matricula_id: matriculaId, presente: true, data_aula: date })
  }

  describe('markAttendanceAction', () => {
    it('valid teacher opens own class session and marks attendance (happy path)', async () => {
      const opened = await openSessionAs('professora.a@synthetic.invalid', TURMA_A, '2026-08-03')
      expect(opened.success).toBe(true)

      const marked = await markAs('professora.a@synthetic.invalid', opened.session!.id, MATRICULA_A, '2026-08-03')
      report('mark: valid teacher happy path', marked)
      expect(marked.success).toBe(true)
      expect(marked.record?.professor_id).toBeTruthy()
      expect(marked.record?.marcado_por).toBeTruthy()
    })

    it('secretario (view-only role) cannot mark attendance', async () => {
      const opened = await openSessionAs('professora.a@synthetic.invalid', TURMA_A, '2026-08-03')
      expect(opened.success).toBe(true)

      const marked = await markAs('secretaria@synthetic.invalid', opened.session!.id, MATRICULA_A, '2026-08-03')
      report('mark: secretario role violation', marked)
      expect(marked.success).toBe(false)
      expect(marked.code).toBe('FORBIDDEN_ROLE')
    })

    it('professor cannot mark into another professor session (session ownership)', async () => {
      const opened = await openSessionAs('professora.a@synthetic.invalid', TURMA_A, '2026-08-03')
      expect(opened.success).toBe(true)

      // A second professor owns a different turma: create the user synthetically.
      const profBId = await createSyntheticUser(
        'professor.b@synthetic.invalid', 'Professor B Sintetico', 'professor', SCHOOL_A
      )
      const { data: turmaC } = await admin!.from('turmas').insert({
        nome: 'Turma Sintetica C', serie: '2 ano', turno: 'matutino', ano_letivo: 2026,
        escola_id: SCHOOL_A, professor_id: profBId, ativo: true,
      }).select('id').single()
      expect(turmaC).toBeTruthy()

      const openedB = await openSessionAs('professor.b@synthetic.invalid', turmaC!.id, '2026-08-03')
      expect(openedB.success).toBe(true)

      // professora.a tries to mark into professor B's session using her own
      // class matricula: must be rejected at the application layer.
      const marked = await markAs('professora.a@synthetic.invalid', openedB.session!.id, MATRICULA_A, '2026-08-03')
      expect(marked.success).toBe(false)
      expect(marked.code).toBe('SESSION_NOT_OWNED')
    })

    it('diretor cannot mark into a session of another escola (school ownership)', async () => {
      const opened = await openSessionAs('professora.a@synthetic.invalid', TURMA_A, '2026-08-03')
      expect(opened.success).toBe(true)

      const marked = await markAs('diretora.b@synthetic.invalid', opened.session!.id, MATRICULA_A, '2026-08-03')
      report('mark: cross-school (diretor B into escola A session)', marked)
      expect(marked.success).toBe(false)
      // RLS hides the foreign session first (SESSION_NOT_FOUND) or the app
      // ownership check fires (SCHOOL_MISMATCH): either way it is denied.
      expect(['SESSION_NOT_FOUND', 'SCHOOL_MISMATCH']).toContain(marked.code)
    })

    it('diretor cannot mark a matricula outside the session turma (class ownership)', async () => {
      const opened = await openSessionAs('professora.a@synthetic.invalid', TURMA_A, '2026-08-03')
      expect(opened.success).toBe(true)

      // A second turma in the SAME escola with its own matricula: marking that
      // matricula into turma A's session must be rejected.
      const profBId = await createSyntheticUser(
        'professor.b@synthetic.invalid', 'Professor B Sintetico', 'professor', SCHOOL_A
      )
      const { data: turmaC } = await admin!.from('turmas').insert({
        nome: 'Turma Sintetica C', serie: '2 ano', turno: 'matutino', ano_letivo: 2026,
        escola_id: SCHOOL_A, professor_id: profBId, ativo: true,
      }).select('id').single()
      const { data: matriculaC } = await admin!.from('matriculas').insert({
        aluno_id: '40000000-0000-0000-0000-000000000001', turma_id: turmaC!.id, ano_letivo: 2026, situacao: 'ativa',
      }).select('id').single()

      const marked = await markAs('diretora.a@synthetic.invalid', opened.session!.id, matriculaC!.id, '2026-08-03')
      report('mark: matricula outside session turma', marked)
      expect(marked.success).toBe(false)
      expect(marked.code).toBe('MATRICULA_NOT_IN_TURMA')
    })

    it('unauthenticated caller cannot mark attendance', async () => {
      setActorClient(createClient(URL!, ANON_KEY!, {
        auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
      }))
      const marked = await markAttendanceAction({
        sessao_id: '31000000-0000-0000-0000-000000000099',
        matricula_id: MATRICULA_A,
        presente: true,
        data_aula: '2026-08-03',
      })
      expect(marked.success).toBe(false)
      expect(marked.code).toBe('UNAUTHENTICATED')
    })
  })

  describe('openSessionAction', () => {
    it('client cannot forge professor_id when a professor opens', async () => {
      const { data: other } = await admin!.from('users')
        .select('id').eq('email', 'diretora.a@synthetic.invalid').single()

      const result = await openSessionAs('professora.a@synthetic.invalid', TURMA_A, '2026-08-04', {
        professor_id: other!.id,
        escola_id: SCHOOL_B,
      })
      report('open: forged professor_id (professor actor)', result)
      expect(result.success).toBe(true)
      expect(result.session!.professor_id).toBe(await admin!.from('users').select('id').eq('email', 'professora.a@synthetic.invalid').single().then(r => r.data!.id))
      expect(result.session!.escola_id).toBe(SCHOOL_A)
    })

    it('client cannot forge professor_id when a diretor opens', async () => {
      const { data: secretaria } = await admin!.from('users')
        .select('id').eq('email', 'secretaria@synthetic.invalid').single()

      const result = await openSessionAs('diretora.a@synthetic.invalid', TURMA_A, '2026-08-04', {
        professor_id: secretaria!.id,
        escola_id: SCHOOL_A,
      })
      report('open: forged professor_id (diretor actor)', result)
      expect(result.success).toBe(true)
      // Session must be attributed to the turma's assigned professor.
      const { data: prof } = await admin!.from('turmas').select('professor_id').eq('id', TURMA_A).single()
      expect(result.session!.professor_id).toBe(prof!.professor_id)
      expect(result.session!.escola_id).toBe(SCHOOL_A)
    })

    it('diretor cannot open a session for a turma of another escola', async () => {
      // Client also tries to forge identities: they must be ignored/denied.
      const result = await openSessionAs('diretora.b@synthetic.invalid', TURMA_A, '2026-08-04', {
        professor_id: SECRETARIA_ID,
        escola_id: SCHOOL_A,
      })
      report('open cross-school', result)
      expect(result.success).toBe(false)
      // RLS hides the foreign turma first (TURMA_NOT_FOUND) or the app
      // ownership check fires (SCHOOL_MISMATCH): either way it is denied.
      expect(['TURMA_NOT_FOUND', 'SCHOOL_MISMATCH']).toContain(result.code)
    })

    it('secretario (view-only role) cannot open a session', async () => {
      const result = await openSessionAs('secretaria@synthetic.invalid', TURMA_A, '2026-08-04', {
        professor_id: SECRETARIA_ID,
        escola_id: SCHOOL_A,
      })
      report('open secretario', result)
      expect(result.success).toBe(false)
      expect(result.code).toBe('FORBIDDEN_ROLE')
    })

    it('professor cannot open a session for a turma they do not own', async () => {
      // TURMA_B has no assigned professor and lives in escola B.
      const result = await openSessionAs('professora.a@synthetic.invalid', TURMA_B, '2026-08-04', {
        professor_id: SECRETARIA_ID,
        escola_id: SCHOOL_B,
      })
      report('open turma not owned', result)
      expect(result.success).toBe(false)
      // RLS hides the foreign turma first (TURMA_NOT_FOUND) or the app
      // ownership check fires (TURMA_NOT_OWNED): either way it is denied.
      expect(['TURMA_NOT_FOUND', 'TURMA_NOT_OWNED']).toContain(result.code)
    })
  })

  describe('closeSessionAction', () => {
    it('valid teacher closes own session', async () => {
      const opened = await openSessionAs('professora.a@synthetic.invalid', TURMA_A, '2026-08-03')
      expect(opened.success).toBe(true)

      setActorClient(await actorClient('professora.a@synthetic.invalid'))
      const closed = await closeSessionAction({ session_id: opened.session!.id })
      report('close: valid teacher closes own session', closed)
      expect(closed.success).toBe(true)
      expect(closed.session!.status).toBe('FECHADA')
    })

    it('diretor cannot close a session of another escola', async () => {
      const opened = await openSessionAs('professora.a@synthetic.invalid', TURMA_A, '2026-08-03')
      expect(opened.success).toBe(true)

      setActorClient(await actorClient('diretora.b@synthetic.invalid'))
      const closed = await closeSessionAction({ session_id: opened.session!.id })
      report('close: cross-school (diretor B)', closed)
      expect(closed.success).toBe(false)
      // RLS hides the foreign session first (SESSION_NOT_FOUND) or the app
      // ownership check fires (SCHOOL_MISMATCH): either way it is denied.
      expect(['SESSION_NOT_FOUND', 'SCHOOL_MISMATCH']).toContain(closed.code)
    })

    it('professor cannot close another professor session', async () => {
      const profBId = await createSyntheticUser(
        'professor.b@synthetic.invalid', 'Professor B Sintetico', 'professor', SCHOOL_A
      )
      const { data: turmaC } = await admin!.from('turmas').insert({
        nome: 'Turma Sintetica C', serie: '2 ano', turno: 'matutino', ano_letivo: 2026,
        escola_id: SCHOOL_A, professor_id: profBId, ativo: true,
      }).select('id').single()

      const openedB = await openSessionAs('professor.b@synthetic.invalid', turmaC!.id, '2026-08-03')
      expect(openedB.success).toBe(true)

      setActorClient(await actorClient('professora.a@synthetic.invalid'))
      const closed = await closeSessionAction({ session_id: openedB.session!.id })
      report('close: professor cannot close another professor session', closed)
      expect(closed.success).toBe(false)
      expect(closed.code).toBe('SESSION_NOT_OWNED')
    })
  })

  describe('checkLockStatusAction', () => {
    it('valid teacher checks own session', async () => {
      const opened = await openSessionAs('professora.a@synthetic.invalid', TURMA_A, '2026-08-03')
      expect(opened.success).toBe(true)

      setActorClient(await actorClient('professora.a@synthetic.invalid'))
      const checked = await checkLockStatusAction(opened.session!.id)
      expect(checked.success).toBe(true)
      expect(checked.isLocked).toBe(false)
    })

    it('professor cannot check another professor session', async () => {
      const opened = await openSessionAs('professora.a@synthetic.invalid', TURMA_A, '2026-08-03')
      expect(opened.success).toBe(true)

      const profBId = await createSyntheticUser(
        'professor.b@synthetic.invalid', 'Professor B Sintetico', 'professor', SCHOOL_A
      )
      const { data: turmaC } = await admin!.from('turmas').insert({
        nome: 'Turma Sintetica C', serie: '2 ano', turno: 'matutino', ano_letivo: 2026,
        escola_id: SCHOOL_A, professor_id: profBId, ativo: true,
      }).select('id').single()

      const openedB = await openSessionAs('professor.b@synthetic.invalid', turmaC!.id, '2026-08-03')
      expect(openedB.success).toBe(true)

      setActorClient(await actorClient('professora.a@synthetic.invalid'))
      const checked = await checkLockStatusAction(openedB.session!.id)
      expect(checked.success).toBe(false)
      expect(checked.code).toBe('SESSION_NOT_OWNED')
    })

    it('secretario (view-only) can read lock status', async () => {
      const opened = await openSessionAs('professora.a@synthetic.invalid', TURMA_A, '2026-08-03')
      expect(opened.success).toBe(true)

      setActorClient(await actorClient('secretaria@synthetic.invalid'))
      const checked = await checkLockStatusAction(opened.session!.id)
      expect(checked.success).toBe(true)
    })
  })
})
