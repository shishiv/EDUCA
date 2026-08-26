#!/usr/bin/env tsx
/**
 * Independent database receipt for the bounded canonical pilot rehearsal.
 *
 * This validator runs before the browser. It checks the pilot gate, the exact
 * synthetic dataset, Auth identities, and school-scoped PostgREST behavior
 * against the isolated local Supabase stack.
 */
import { Client } from 'pg'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { assertSyntheticPilotSafety } from '../lib/pilot/pilot-safety-gate'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const SUPABASE_DB_URL = process.env.SUPABASE_DB_URL || ''
const PASSWORD = 'Synthetic-Only-2026!'

const SCHOOL_A = '10000000-0000-0000-0000-000000000001'
const SCHOOL_B = '10000000-0000-0000-0000-000000000002'
const CLASS_A = '30000000-0000-0000-0000-000000000001'
const CLASS_B = '30000000-0000-0000-0000-000000000002'
const STUDENT_A = '40000000-0000-0000-0000-000000000001'
const STUDENT_B = '40000000-0000-0000-0000-000000000002'
const ENROLLMENT_A = '50000000-0000-0000-0000-000000000001'
const SESSION_A = '70000000-0000-0000-0000-000000000010'
const ATTENDANCE_A = '70000000-0000-0000-0000-000000000001'

const ADMIN_EMAIL = 'admin@synthetic.invalid'
const ADMIN_ID = '20000000-0000-0000-0000-000000000001'
const SECRETARIAT_EMAIL = 'secretaria@synthetic.invalid'
const DIRECTOR_A_EMAIL = 'diretora.a@synthetic.invalid'
const TEACHER_A_EMAIL = 'professora.a@synthetic.invalid'
const DIRECTOR_B_EMAIL = 'diretora.b@synthetic.invalid'
const EXPECTED_AUTH_EMAILS = [
  ADMIN_EMAIL,
  SECRETARIAT_EMAIL,
  DIRECTOR_A_EMAIL,
  TEACHER_A_EMAIL,
  DIRECTOR_B_EMAIL,
] as const

interface MarkerRow {
  municipality_slug: string
  data_classification: string
  external_deploy_allowed: boolean
  legal_approval_status: string
}

interface CountRow {
  schools: number
  users: number
  classes: number
  students: number
  guardians: number
  guardian_links: number
  enrollments: number
  sessions: number
  attendance: number
  metric_events: number
  tombstones: number
}

interface ProfileRow {
  email: string
  tipo_usuario: string
  escola_id: string | null
}

function requireEnvironment(): void {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY || !SUPABASE_DB_URL) {
    throw new Error('PILOT_CANONICAL_VALIDATE_ENV_REQUIRED: local Supabase variables are required')
  }

  const host = new URL(SUPABASE_URL).hostname
  if (host !== '127.0.0.1' && host !== 'localhost') {
    throw new Error('PILOT_CANONICAL_VALIDATE_LOCAL_SUPABASE_REQUIRED')
  }
}

function assertCondition(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`PILOT_CANONICAL_VALIDATE_FAILED: ${message}`)
}

function sortedIds(rows: Array<{ id: string }> | null | undefined): string[] {
  return (rows ?? []).map(row => row.id).sort()
}

async function signedInClient(email: string): Promise<SupabaseClient> {
  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  })
  const { data, error } = await client.auth.signInWithPassword({ email, password: PASSWORD })
  if (error || !data.session) throw new Error(`PILOT_CANONICAL_VALIDATE_AUTH_FAILED: ${email}`)
  return client
}

async function checkDatabaseMarker(client: Client): Promise<void> {
  const marker = await client.query<MarkerRow>(`
    SELECT municipality_slug, data_classification, external_deploy_allowed, legal_approval_status
    FROM public.pilot_municipality_config
    WHERE municipality_slug = 'synthetic-municipality'
  `)
  const row = marker.rows[0]
  assertCondition(row, 'synthetic municipality marker is missing')
  assertCondition(row.municipality_slug === 'synthetic-municipality', 'municipality marker is incorrect')
  assertCondition(row.data_classification === 'synthetic_only', 'database is not synthetic-only')
  assertCondition(row.external_deploy_allowed === false, 'external deployment is not blocked')
  assertCondition(row.legal_approval_status === 'not_approved', 'legal approval claim is not blocked')

  const highRiskTrigger = await client.query<{ trigger_count: number }>(`
    SELECT count(*)::int AS trigger_count
    FROM pg_trigger
    WHERE tgrelid = 'public.alunos'::regclass
      AND tgname = 'pilot_high_risk_student_guard'
      AND NOT tgisinternal
  `)
  assertCondition(highRiskTrigger.rows[0]?.trigger_count === 1, 'pilot high-risk field trigger is missing')

  const pilotPolicies = await client.query<{ policy_count: number }>(`
    SELECT count(*)::int AS policy_count
    FROM pg_policies
    WHERE schemaname = 'public'
      AND policyname IN ('pilot_sessoes_select', 'pilot_sessoes_insert', 'pilot_sessoes_update',
                         'pilot_frequencia_select', 'pilot_frequencia_insert', 'pilot_frequencia_update')
  `)
  assertCondition(pilotPolicies.rows[0]?.policy_count === 6, 'canonical attendance policies are incomplete')

  const privileges = await client.query<{ notes_select: boolean; classes_select: boolean; attendance_insert: boolean }>(`
    SELECT
      has_table_privilege('authenticated', 'public.notas', 'SELECT') AS notes_select,
      has_table_privilege('authenticated', 'public.turmas', 'SELECT') AS classes_select,
      has_table_privilege('authenticated', 'public.frequencia', 'INSERT') AS attendance_insert
  `)
  const privilegeRow = privileges.rows[0]
  assertCondition(privilegeRow?.notes_select === false, 'disabled grades table is exposed to browser roles')
  assertCondition(privilegeRow?.classes_select === true, 'canonical classes read grant is missing')
  assertCondition(privilegeRow?.attendance_insert === true, 'canonical attendance write grant is missing')

  const schoolUpdatePolicies = await client.query<{ qual: string; with_check: string }>(`
    SELECT qual, with_check
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'escolas'
      AND cmd = 'UPDATE'
  `)
  assertCondition(schoolUpdatePolicies.rows.length === 1, 'admin-only school update policy is missing')
  const schoolUpdatePolicy = schoolUpdatePolicies.rows[0]
  assertCondition(
    schoolUpdatePolicy.qual.includes('pilot_current_role()') &&
      schoolUpdatePolicy.qual.includes('admin') &&
      schoolUpdatePolicy.with_check.includes('pilot_current_role()') &&
      schoolUpdatePolicy.with_check.includes('admin'),
    'school update policy is not admin-only'
  )

  const schoolUpdatePrivileges = await client.query<{ column_name: string }>(`
    SELECT column_name
    FROM information_schema.column_privileges
    WHERE table_schema = 'public'
      AND table_name = 'escolas'
      AND grantee = 'authenticated'
      AND privilege_type = 'UPDATE'
    ORDER BY column_name
  `)
  assertCondition(
    JSON.stringify(schoolUpdatePrivileges.rows.map(row => row.column_name)) ===
      JSON.stringify(['ativo', 'codigo', 'diretor_id', 'email', 'endereco', 'nome', 'telefone', 'tipo']),
    'school update privileges are broader than the edit form'
  )
}

async function checkSyntheticDataset(client: Client): Promise<CountRow> {
  const counts = await client.query<CountRow>(`
    SELECT
      (SELECT count(*)::int FROM public.escolas WHERE id = ANY($1::uuid[])) AS schools,
      (SELECT count(*)::int FROM public.users WHERE email = ANY($2::text[])) AS users,
      (SELECT count(*)::int FROM public.turmas WHERE id = ANY($3::uuid[])) AS classes,
      (SELECT count(*)::int FROM public.alunos WHERE id = ANY($4::uuid[])) AS students,
      (SELECT count(*)::int FROM public.responsaveis WHERE id = ANY($5::uuid[])) AS guardians,
      (SELECT count(*)::int FROM public.aluno_responsaveis WHERE aluno_id = $6::uuid) AS guardian_links,
      (SELECT count(*)::int FROM public.matriculas WHERE id = $7::uuid) AS enrollments,
      (SELECT count(*)::int FROM public.sessoes_aula WHERE id = $8::uuid) AS sessions,
      (SELECT count(*)::int FROM public.frequencia WHERE id = $9::uuid) AS attendance,
      (SELECT count(*)::int FROM public.pilot_metric_events) AS metric_events,
      (SELECT count(*)::int FROM public.pilot_data_tombstones) AS tombstones
  `, [
    [SCHOOL_A, SCHOOL_B],
    [...EXPECTED_AUTH_EMAILS],
    [CLASS_A, CLASS_B],
    [STUDENT_A, STUDENT_B],
    ['60000000-0000-0000-0000-000000000001', '60000000-0000-0000-0000-000000000002'],
    STUDENT_A,
    ENROLLMENT_A,
    SESSION_A,
    ATTENDANCE_A,
  ])
  const row = counts.rows[0]
  assertCondition(row, 'synthetic dataset count query returned no row')

  const expected: CountRow = {
    schools: 2,
    users: 5,
    classes: 2,
    students: 2,
    guardians: 2,
    guardian_links: 1,
    enrollments: 1,
    sessions: 1,
    attendance: 1,
    metric_events: 4,
    tombstones: 1,
  }
  for (const [name, value] of Object.entries(expected)) {
    assertCondition(row[name as keyof CountRow] === value, `${name} count is ${row[name as keyof CountRow]}, expected ${value}`)
  }

  const profiles = await client.query<ProfileRow>(`
    SELECT email, tipo_usuario, escola_id
    FROM public.users
    WHERE email = ANY($1::text[])
    ORDER BY email
  `, [[...EXPECTED_AUTH_EMAILS]])
  const profileReceipt = profiles.rows
    .map(profile => `${profile.email}|${profile.tipo_usuario}|${profile.escola_id ?? ''}`)
    .sort()
  const expectedProfiles = [
    `${ADMIN_EMAIL}|admin|`,
    `${DIRECTOR_A_EMAIL}|diretor|${SCHOOL_A}`,
    `${DIRECTOR_B_EMAIL}|diretor|${SCHOOL_B}`,
    `${SECRETARIAT_EMAIL}|secretario|`,
    `${TEACHER_A_EMAIL}|professor|${SCHOOL_A}`,
  ].sort()
  assertCondition(JSON.stringify(profileReceipt) === JSON.stringify(expectedProfiles), 'synthetic profile identities are incorrect')

  const auth = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  })
  const { data: authUsers, error: authError } = await auth.auth.admin.listUsers({ page: 1, perPage: 1000 })
  if (authError) throw new Error('PILOT_CANONICAL_VALIDATE_AUTH_LIST_FAILED')
  const actualAuthEmails = (authUsers.users ?? [])
    .map(user => user.email)
    .filter((email): email is string => Boolean(email))
    .sort()
  assertCondition(JSON.stringify(actualAuthEmails) === JSON.stringify([...EXPECTED_AUTH_EMAILS].sort()), 'synthetic Auth identities are incorrect')
  assertCondition(authUsers.users.some(user => user.id === ADMIN_ID && user.email === ADMIN_EMAIL), 'synthetic admin identity is not deterministic')
  assertCondition(actualAuthEmails.every(email => email.endsWith('.invalid')), 'Auth identity escaped the synthetic domain')

  const session = await client.query<{ status: string; data_aula: string; turma_id: string; escola_id: string }>(`
    SELECT status, data_aula::text, turma_id, escola_id
    FROM public.sessoes_aula
    WHERE id = $1
  `, [SESSION_A])
  const sessionRow = session.rows[0]
  assertCondition(sessionRow?.status === 'ABERTA', 'seeded canonical attendance session is not open')
  assertCondition(sessionRow.turma_id === CLASS_A && sessionRow.escola_id === SCHOOL_A, 'seeded session school or class link is incorrect')

  return row
}

async function checkPostgrestAccess(): Promise<void> {
  const [admin, secretariat, directorA, directorB, teacherA] = await Promise.all([
    signedInClient(ADMIN_EMAIL),
    signedInClient(SECRETARIAT_EMAIL),
    signedInClient(DIRECTOR_A_EMAIL),
    signedInClient(DIRECTOR_B_EMAIL),
    signedInClient(TEACHER_A_EMAIL),
  ])

  const [adminSchools, secretariatSchools, directorASchools, directorBSchools, teacherClasses, teacherStudents] = await Promise.all([
    admin.from('escolas').select('id').order('id'),
    secretariat.from('escolas').select('id').order('id'),
    directorA.from('escolas').select('id').order('id'),
    directorB.from('escolas').select('id').order('id'),
    teacherA.from('turmas').select('id,escola_id').order('id'),
    teacherA.from('alunos').select('id').order('id'),
  ])

  assertCondition(!adminSchools.error, 'admin cannot read the municipal school list')
  assertCondition(!secretariatSchools.error, 'secretariat cannot read the municipal school list')
  assertCondition(!directorASchools.error, 'director A cannot read the own school')
  assertCondition(!directorBSchools.error, 'director B cannot read the own school')
  assertCondition(!teacherClasses.error, 'teacher cannot read the assigned class')
  assertCondition(!teacherStudents.error, 'teacher cannot read the assigned students')
  assertCondition(JSON.stringify(sortedIds(adminSchools.data)) === JSON.stringify([SCHOOL_A, SCHOOL_B]), 'admin school scope is incomplete')
  assertCondition(JSON.stringify(sortedIds(secretariatSchools.data)) === JSON.stringify([SCHOOL_A, SCHOOL_B]), 'secretariat school scope is incomplete')
  assertCondition(JSON.stringify(sortedIds(directorASchools.data)) === JSON.stringify([SCHOOL_A]), 'director A school scope is incorrect')
  assertCondition(JSON.stringify(sortedIds(directorBSchools.data)) === JSON.stringify([SCHOOL_B]), 'director B school scope is incorrect')
  assertCondition(JSON.stringify(sortedIds(teacherClasses.data)) === JSON.stringify([CLASS_A]), 'teacher class scope is incorrect')
  assertCondition(JSON.stringify(sortedIds(teacherStudents.data)) === JSON.stringify([STUDENT_A]), 'teacher student scope is incorrect')

  const adminSchoolUpdate = await admin.from('escolas').update({ codigo: '00000001' }).eq('id', SCHOOL_A).select('codigo').single()
  assertCondition(!adminSchoolUpdate.error && adminSchoolUpdate.data.codigo === '00000001', 'admin cannot save the seeded school')
  const adminSchoolReread = await admin.from('escolas').select('codigo').eq('id', SCHOOL_A).single()
  assertCondition(!adminSchoolReread.error && adminSchoolReread.data.codigo === '00000001', 'admin cannot reread the saved school')

  for (const [role, client] of [
    ['secretariat', secretariat],
    ['director', directorA],
    ['teacher', teacherA],
  ] as const) {
    const deniedUpdate = await client.from('escolas').update({ codigo: '00000001' }).eq('id', SCHOOL_A).select('codigo').single()
    assertCondition(Boolean(deniedUpdate.error), `${role} can update schools through PostgREST`)
  }

  const crossSchoolRead = await directorB.from('turmas').select('id').eq('id', CLASS_A)
  assertCondition(!crossSchoolRead.error && crossSchoolRead.data.length === 0, 'director B can read school A class data')

  const teacherWrite = await teacherA.from('alunos').insert({
    id: '40000000-0000-0000-0000-000000000099',
    escola_id: SCHOOL_A,
    nome_completo: 'Aluno Nunca Deve Ser Criado',
    data_nascimento: '2018-01-01',
    sexo: 'M',
    ativo: true,
  })
  assertCondition(Boolean(teacherWrite.error), 'teacher browser write escaped the school management boundary')

  const disabledGrades = await secretariat.from('notas').select('id').limit(1)
  assertCondition(Boolean(disabledGrades.error), 'grades browser boundary is enabled during the pilot')
}

async function validate(): Promise<void> {
  requireEnvironment()
  assertSyntheticPilotSafety('seed')

  const client = new Client({ connectionString: SUPABASE_DB_URL })
  await client.connect()
  try {
    await checkDatabaseMarker(client)
    const counts = await checkSyntheticDataset(client)
    await checkPostgrestAccess()

    const receipt = {
      marker: {
        municipality: 'synthetic-municipality',
        dataClassification: 'synthetic_only',
        externalDeployAllowed: false,
        legalApprovalStatus: 'not_approved',
      },
      dataset: counts,
      identities: {
        authUsers: EXPECTED_AUTH_EMAILS.length,
        domain: 'synthetic.invalid',
        admin: ADMIN_EMAIL,
        teacher: TEACHER_A_EMAIL,
        school: '00000001',
      },
      access: {
        adminSchoolListRead: 'pass',
        adminSchoolUpdate: 'pass',
        nonAdminSchoolUpdateDenied: 'pass',
        schoolIsolation: 'pass',
        teacherOwnClassRead: 'pass',
        teacherStudentWriteDenied: 'pass',
        disabledGrades: 'pass',
      },
    }
    const receiptPath = process.env.PILOT_CANONICAL_DATABASE_RECEIPT_PATH
    if (receiptPath) {
      mkdirSync(path.dirname(receiptPath), { recursive: true })
      writeFileSync(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`, 'utf8')
    }

    console.info(`PILOT_CANONICAL_DATABASE_RECEIPT: marker=synthetic_only schools=${counts.schools} classes=${counts.classes} students=${counts.students} sessions=${counts.sessions} attendance=${counts.attendance} identities=${EXPECTED_AUTH_EMAILS.length} rls=pass`)
    console.info('PILOT_CANONICAL_DATABASE_OK')
  } finally {
    await client.end()
  }
}

validate().catch(error => {
  console.error(error instanceof Error ? error.message : 'PILOT_CANONICAL_VALIDATE_FAILED')
  process.exit(1)
})
