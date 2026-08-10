#!/usr/bin/env tsx
/**
 * Validate the isolated synthetic pilot capacity contract against real Postgres.
 *
 * The validator uses direct SQL for the database oracle. It does not reuse the
 * seed's row arrays, so a wrong insert or relationship fails independently.
 */
import { Client } from 'pg'
import { createClient } from '@supabase/supabase-js'
import { assertSyntheticPilotSafety } from '../lib/pilot/pilot-safety-gate'
import {
  PILOT_CAPACITY_CONFIG_ANCHOR_ID,
  PILOT_CAPACITY_CONFIG_MARKER_ID,
  PILOT_CAPACITY_CONTACT_DOMAIN,
  PILOT_CAPACITY_DIRECTOR_EMAIL,
  PILOT_CAPACITY_SCHOOL_ID,
  PILOT_CAPACITY_SEED_ANCHOR_DATE,
  PILOT_CAPACITY_SEED_MARKER,
  pilotCapacityClassId,
  pilotCapacitySchoolDays,
  pilotCapacityStudentId,
  pilotCapacityTeacherEmail,
} from '../../supabase/seed-pilot-capacity/pilot-capacity-contract'

assertSyntheticPilotSafety('seed')

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const SUPABASE_DB_URL = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL || ''

// Independent oracle receipt: these values come from the pilot-capacity brief,
// not from the seed's generated row arrays.
const EXPECTED_CAPACITY_COUNTS = Object.freeze({
  schools: 1,
  classes: 5,
  activeStudents: 100,
  enrollments: 100,
  guardians: 100,
  teacherOwners: 5,
  directors: 1,
  guardianLinks: 100,
  schoolDays: 20,
  sessions: 100,
  attendance: 2000,
  studentsPerClass: 20,
  lowAttendanceStudentIndex: 1,
  lowAttendancePresent: 15,
  lowAttendanceAbsent: 5,
  lowAttendancePercent: 75,
  attendanceThresholdPercent: 80,
})

// Independent fingerprint receipt captured from the executed seed query.
const EXPECTED_CAPACITY_FINGERPRINTS = Object.freeze({
  school: '24cd1e672defd0e402dccd7de7608f35',
  users: '971feedbd5bb722fcf9cf14ba7b6fede',
  classes: 'e53f130e92bcfa6d85e3c328628891c5',
  guardians: 'f5ef84f759e20fe89d331881015ba742',
  students: '38971d3d6c277765d3ecdddc05b9f0e6',
  enrollments: '9d081e533a7de989678e7db2588b214d',
  sessions: '9e6edf5c1337c17e90c51a1ff8f6a744',
  attendance: 'a455c1d8d249640ecfe2f90a7563ab18',
})

interface CapacityCheck {
  name: string
  ok: boolean
  detail: string
}

const checks: CapacityCheck[] = []

function recordCapacityCheck(name: string, ok: boolean, detail: string): void {
  checks.push({ name, ok, detail })
}

function countValue(value: unknown): number {
  return Number(value)
}

function expectedTeacherEmails(): string[] {
  return Array.from(
    { length: EXPECTED_CAPACITY_COUNTS.teacherOwners },
    (_, index) => pilotCapacityTeacherEmail(index + 1)
  )
}

function expectedSchoolDays(): string[] {
  const days = pilotCapacitySchoolDays()
  if (days.length !== EXPECTED_CAPACITY_COUNTS.schoolDays) {
    throw new Error('PILOT_CAPACITY_VALIDATE_DATE_RECEIPT_INVALID: school-day generator count changed')
  }
  return days
}

async function checkCapacityCounts(client: Client): Promise<void> {
  const teachers = expectedTeacherEmails()
  const result = await client.query(`
    SELECT
      (SELECT count(*) FROM public.escolas WHERE id = $1) AS schools,
      (SELECT count(*) FROM public.turmas WHERE escola_id = $1 AND import_source_id LIKE 'pilot-capacity:%') AS classes,
      (SELECT count(*) FROM public.alunos WHERE escola_id = $1 AND import_source_id LIKE 'pilot-capacity:%' AND ativo = true) AS active_students,
      (SELECT count(*) FROM public.matriculas m JOIN public.alunos a ON a.id = m.aluno_id WHERE a.escola_id = $1 AND m.observacoes = 'pilot capacity contract' AND m.situacao = 'ativa') AS enrollments,
      (SELECT count(*) FROM public.responsaveis WHERE escola_id = $1 AND import_source_id LIKE 'pilot-capacity:%') AS guardians,
      (SELECT count(*) FROM public.users WHERE escola_id = $1 AND tipo_usuario = 'professor' AND ativo = true AND email = ANY($2::text[])) AS teacher_owners,
      (SELECT count(*) FROM public.users WHERE escola_id = $1 AND tipo_usuario = 'diretor' AND ativo = true AND email = $3) AS directors,
      (SELECT count(*) FROM public.aluno_responsaveis ar JOIN public.alunos a ON a.id = ar.aluno_id WHERE a.escola_id = $1 AND a.import_source_id LIKE 'pilot-capacity:student:%') AS guardian_links,
      (SELECT count(*) FROM public.sessoes_aula WHERE escola_id = $1 AND turma_id IN (SELECT id FROM public.turmas WHERE escola_id = $1 AND import_source_id LIKE 'pilot-capacity:%')) AS sessions,
      (SELECT count(*) FROM public.frequencia WHERE sessao_id IN (SELECT id FROM public.sessoes_aula WHERE escola_id = $1 AND turma_id IN (SELECT id FROM public.turmas WHERE escola_id = $1 AND import_source_id LIKE 'pilot-capacity:%'))) AS attendance
  `, [PILOT_CAPACITY_SCHOOL_ID, teachers, PILOT_CAPACITY_DIRECTOR_EMAIL])

  const row = result.rows[0] as Record<string, unknown>
  const expectedCounts: Record<string, number> = {
    schools: EXPECTED_CAPACITY_COUNTS.schools,
    classes: EXPECTED_CAPACITY_COUNTS.classes,
    active_students: EXPECTED_CAPACITY_COUNTS.activeStudents,
    enrollments: EXPECTED_CAPACITY_COUNTS.enrollments,
    guardians: EXPECTED_CAPACITY_COUNTS.guardians,
    teacher_owners: EXPECTED_CAPACITY_COUNTS.teacherOwners,
    directors: EXPECTED_CAPACITY_COUNTS.directors,
    guardian_links: EXPECTED_CAPACITY_COUNTS.guardianLinks,
    sessions: EXPECTED_CAPACITY_COUNTS.sessions,
    attendance: EXPECTED_CAPACITY_COUNTS.attendance,
  }

  for (const [name, expected] of Object.entries(expectedCounts)) {
    const actual = countValue(row[name])
    recordCapacityCheck(`count_${name}`, actual === expected, `${actual} == ${expected}`)
  }
}

async function checkCapacityMarker(client: Client): Promise<void> {
  const marker = await client.query(
    `SELECT valor FROM public.configs WHERE id = $1 AND chave = 'pilot_capacity_synthetic_marker'`,
    [PILOT_CAPACITY_CONFIG_MARKER_ID]
  )
  const anchor = await client.query(
    `SELECT valor FROM public.configs WHERE id = $1 AND chave = 'pilot_capacity_seed_anchor_date'`,
    [PILOT_CAPACITY_CONFIG_ANCHOR_ID]
  )
  const markerValue = marker.rows[0]?.valor as string | undefined
  const anchorValue = anchor.rows[0]?.valor as string | undefined
  recordCapacityCheck(
    'marker_synthetic',
    markerValue === PILOT_CAPACITY_SEED_MARKER,
    `${markerValue ?? '(missing)'} == ${PILOT_CAPACITY_SEED_MARKER}`
  )
  recordCapacityCheck(
    'marker_anchor',
    anchorValue === PILOT_CAPACITY_SEED_ANCHOR_DATE,
    `${anchorValue ?? '(missing)'} == ${PILOT_CAPACITY_SEED_ANCHOR_DATE}`
  )
}

async function checkCapacityRelationships(client: Client): Promise<void> {
  const teacherEmails = expectedTeacherEmails()
  const schoolDays = expectedSchoolDays()
  const classIds = Array.from(
    { length: EXPECTED_CAPACITY_COUNTS.classes },
    (_, index) => pilotCapacityClassId(index + 1)
  )

  const schoolDirector = await client.query(`
    SELECT count(*) AS invalid
    FROM public.escolas e
    LEFT JOIN public.users u ON u.id = e.diretor_id
    WHERE e.id = $1
      AND (u.id IS NULL OR u.tipo_usuario <> 'diretor' OR u.email <> $2 OR u.escola_id <> e.id)
  `, [PILOT_CAPACITY_SCHOOL_ID, PILOT_CAPACITY_DIRECTOR_EMAIL])
  recordCapacityCheck('rel_school_director', countValue(schoolDirector.rows[0].invalid) === 0, `${schoolDirector.rows[0].invalid} invalid director links`)

  const classOwners = await client.query(`
    SELECT count(*) AS invalid
    FROM public.turmas t
    LEFT JOIN public.users u ON u.id = t.professor_id
    WHERE t.id = ANY($1::uuid[])
      AND (
        t.escola_id IS DISTINCT FROM $2
        OR t.capacidade IS DISTINCT FROM $3
        OR u.tipo_usuario IS DISTINCT FROM 'professor'
        OR u.email IS NULL
        OR NOT (u.email = ANY($4::text[]))
      )
  `, [classIds, PILOT_CAPACITY_SCHOOL_ID, EXPECTED_CAPACITY_COUNTS.studentsPerClass, teacherEmails])
  recordCapacityCheck('rel_class_school_and_owner', countValue(classOwners.rows[0].invalid) === 0, `${classOwners.rows[0].invalid} invalid class school/owner links`)

  const oneClassPerTeacher = await client.query(`
    SELECT count(*) AS invalid
    FROM (
      SELECT u.email
      FROM public.turmas t
      JOIN public.users u ON u.id = t.professor_id
      WHERE t.id = ANY($1::uuid[])
      GROUP BY u.email
      HAVING count(*) <> 1
    ) owners
  `, [classIds])
  recordCapacityCheck('rel_one_class_per_teacher', countValue(oneClassPerTeacher.rows[0].invalid) === 0, `${oneClassPerTeacher.rows[0].invalid} teachers do not own one class`)

  const studentSchool = await client.query(`
    SELECT count(*) AS invalid
    FROM public.alunos a
    JOIN public.matriculas m ON m.aluno_id = a.id
    JOIN public.turmas t ON t.id = m.turma_id
    WHERE a.import_source_id LIKE 'pilot-capacity:student:%'
      AND (
        a.escola_id IS DISTINCT FROM $1
        OR t.escola_id IS DISTINCT FROM $1
        OR a.escola_id IS DISTINCT FROM t.escola_id
        OR m.situacao IS DISTINCT FROM 'ativa'
      )
  `, [PILOT_CAPACITY_SCHOOL_ID])
  recordCapacityCheck('rel_student_enrollment_school', countValue(studentSchool.rows[0].invalid) === 0, `${studentSchool.rows[0].invalid} invalid student/enrollment school links`)

  const oneEnrollment = await client.query(`
    SELECT count(*) AS invalid
    FROM (
      SELECT a.id
      FROM public.alunos a
      LEFT JOIN public.matriculas m ON m.aluno_id = a.id AND m.situacao = 'ativa'
      WHERE a.import_source_id LIKE 'pilot-capacity:student:%'
      GROUP BY a.id
      HAVING count(m.id) <> 1
    ) students
  `)
  recordCapacityCheck('rel_one_active_enrollment_per_student', countValue(oneEnrollment.rows[0].invalid) === 0, `${oneEnrollment.rows[0].invalid} students do not have one active enrollment`)

  const classOccupancy = await client.query(`
    SELECT count(*) AS invalid
    FROM (
      SELECT t.id
      FROM public.turmas t
      LEFT JOIN public.matriculas m ON m.turma_id = t.id AND m.situacao = 'ativa'
      WHERE t.id = ANY($1::uuid[])
      GROUP BY t.id, t.capacidade
      HAVING count(m.id) <> $2 OR count(m.id) > t.capacidade
    ) classes
  `, [classIds, EXPECTED_CAPACITY_COUNTS.studentsPerClass])
  recordCapacityCheck('rel_class_occupancy', countValue(classOccupancy.rows[0].invalid) === 0, `${classOccupancy.rows[0].invalid} classes have an invalid active occupancy`)

  const guardians = await client.query(`
    SELECT count(*) AS invalid
    FROM public.alunos a
    LEFT JOIN public.responsaveis r ON r.id = a.responsavel_id
    LEFT JOIN public.aluno_responsaveis ar ON ar.aluno_id = a.id AND ar.responsavel_id = r.id
    WHERE a.import_source_id LIKE 'pilot-capacity:student:%'
      AND (r.id IS NULL OR r.escola_id IS DISTINCT FROM $1 OR ar.id IS NULL)
  `, [PILOT_CAPACITY_SCHOOL_ID])
  recordCapacityCheck('rel_student_guardian', countValue(guardians.rows[0].invalid) === 0, `${guardians.rows[0].invalid} invalid student/guardian links`)

  const sessionIdentity = await client.query(`
    SELECT count(*) AS invalid
    FROM public.sessoes_aula s
    JOIN public.turmas t ON t.id = s.turma_id
    LEFT JOIN public.users u ON u.id = s.professor_id
    WHERE s.escola_id = $1
      AND t.import_source_id LIKE 'pilot-capacity:%'
      AND (
        t.escola_id IS DISTINCT FROM s.escola_id
        OR t.professor_id IS DISTINCT FROM s.professor_id
        OR s.status IS DISTINCT FROM 'FECHADA'
        OR s.data_aula IS NULL
        OR u.tipo_usuario IS DISTINCT FROM 'professor'
      )
  `, [PILOT_CAPACITY_SCHOOL_ID])
  recordCapacityCheck('rel_canonical_session_identity', countValue(sessionIdentity.rows[0].invalid) === 0, `${sessionIdentity.rows[0].invalid} invalid canonical session identities`)

  const sessionDates = await client.query(`
    SELECT DISTINCT s.data_aula::text AS data_aula
    FROM public.sessoes_aula s
    JOIN public.turmas t ON t.id = s.turma_id
    WHERE s.escola_id = $1 AND t.import_source_id LIKE 'pilot-capacity:%'
    ORDER BY data_aula
  `, [PILOT_CAPACITY_SCHOOL_ID])
  const actualDates = sessionDates.rows.map(row => row.data_aula as string)
  recordCapacityCheck('rel_school_day_window', JSON.stringify(actualDates) === JSON.stringify(schoolDays), `${actualDates.join(',')} == ${schoolDays.join(',')}`)

  const attendanceLinks = await client.query(`
    SELECT count(*) AS invalid
    FROM public.frequencia f
    LEFT JOIN public.matriculas m ON m.id = f.matricula_id
    LEFT JOIN public.sessoes_aula s ON s.id = f.sessao_id
    WHERE f.id::text LIKE '17000000-0000-0000-0000-%'
      AND (
        s.id IS NULL
        OR m.id IS NULL
        OR f.aula_id IS NOT NULL
        OR s.turma_id IS DISTINCT FROM m.turma_id
        OR f.data_aula IS DISTINCT FROM s.data_aula
        OR f.status_presenca IS NULL
        OR f.status_presenca NOT IN ('P', 'F', 'J', 'A', 'NAO_MARCADO')
        OR f.presente IS DISTINCT FROM (f.status_presenca IN ('P', 'J', 'A'))
      )
  `)
  recordCapacityCheck('rel_attendance_session_enrollment', countValue(attendanceLinks.rows[0].invalid) === 0, `${attendanceLinks.rows[0].invalid} invalid canonical attendance links`)

  const attendanceCoverage = await client.query(`
    SELECT count(*) AS invalid
    FROM (
      SELECT m.id
      FROM public.matriculas m
      JOIN public.alunos a ON a.id = m.aluno_id
      LEFT JOIN public.frequencia f ON f.matricula_id = m.id
      WHERE a.import_source_id LIKE 'pilot-capacity:student:%'
      GROUP BY m.id
      HAVING count(f.id) <> $1
    ) enrollments
  `, [EXPECTED_CAPACITY_COUNTS.schoolDays])
  recordCapacityCheck('rel_attendance_coverage', countValue(attendanceCoverage.rows[0].invalid) === 0, `${attendanceCoverage.rows[0].invalid} enrollments without ${EXPECTED_CAPACITY_COUNTS.schoolDays} attendance rows`)
}

async function checkSyntheticContacts(client: Client): Promise<void> {
  const teacherEmails = expectedTeacherEmails()
  const contacts = await client.query(`
    SELECT
      (SELECT count(*) FROM public.users WHERE escola_id = $1 AND email = ANY($2::text[]) AND email !~ $3) AS invalid_teacher_emails,
      (SELECT count(*) FROM public.users WHERE escola_id = $1 AND email = $4 AND email !~ $3) AS invalid_director_email,
      (SELECT count(*) FROM public.responsaveis WHERE escola_id = $1 AND import_source_id LIKE 'pilot-capacity:guardian:%' AND (email IS NULL OR email !~ $3 OR telefone IS NULL OR telefone !~ '^\\+55 00 90000-[0-9]{4}$')) AS invalid_guardian_contacts
  `, [PILOT_CAPACITY_SCHOOL_ID, teacherEmails, `@${PILOT_CAPACITY_CONTACT_DOMAIN}$`, PILOT_CAPACITY_DIRECTOR_EMAIL])
  const row = contacts.rows[0] as Record<string, unknown>
  recordCapacityCheck('synthetic_teacher_contacts', countValue(row.invalid_teacher_emails) === 0, `${row.invalid_teacher_emails} teacher contacts outside .invalid`)
  recordCapacityCheck('synthetic_director_contact', countValue(row.invalid_director_email) === 0, `${row.invalid_director_email} director contacts outside .invalid`)
  recordCapacityCheck('synthetic_guardian_contacts', countValue(row.invalid_guardian_contacts) === 0, `${row.invalid_guardian_contacts} guardian contacts outside the synthetic phone/email patterns`)
}

async function checkLowAttendanceCase(client: Client): Promise<void> {
  const result = await client.query(`
    SELECT
      count(*) AS total,
      count(*) FILTER (WHERE f.presente) AS present,
      count(*) FILTER (WHERE NOT f.presente) AS absent,
      round(100.0 * count(*) FILTER (WHERE f.presente) / NULLIF(count(*), 0), 2) AS percentage
    FROM public.frequencia f
    JOIN public.matriculas m ON m.id = f.matricula_id
    JOIN public.alunos a ON a.id = m.aluno_id
    WHERE a.id = $1
  `, [pilotCapacityStudentId(EXPECTED_CAPACITY_COUNTS.lowAttendanceStudentIndex)])
  const row = result.rows[0] as Record<string, unknown>
  const ok = countValue(row.total) === EXPECTED_CAPACITY_COUNTS.schoolDays
    && countValue(row.present) === EXPECTED_CAPACITY_COUNTS.lowAttendancePresent
    && countValue(row.absent) === EXPECTED_CAPACITY_COUNTS.lowAttendanceAbsent
    && countValue(row.percentage) === EXPECTED_CAPACITY_COUNTS.lowAttendancePercent
    && countValue(row.percentage) < EXPECTED_CAPACITY_COUNTS.attendanceThresholdPercent
  recordCapacityCheck('low_attendance_designated_case', ok, `${row.present}/${row.total} = ${row.percentage}% (threshold ${EXPECTED_CAPACITY_COUNTS.attendanceThresholdPercent}%)`)
}

function fingerprintSql(table: string): string {
  const expressions: Record<string, string> = {
    school: "concat_ws('|', e.id::text, e.codigo, e.nome, e.tipo, e.ativo::text)",
    users: "concat_ws('|', u.email, u.nome, u.tipo_usuario, u.escola_id::text, u.ativo::text)",
    classes: "concat_ws('|', t.id::text, t.import_source_id, t.nome, t.serie, t.turno, t.ano_letivo::text, t.capacidade::text, t.escola_id::text, t.ativo::text)",
    guardians: "concat_ws('|', r.id::text, r.import_source_id, r.nome, r.parentesco, r.telefone, r.email, r.escola_id::text, r.ativo::text)",
    students: "concat_ws('|', a.id::text, a.import_source_id, a.nome_completo, a.data_nascimento::text, a.sexo, a.responsavel_id::text, a.escola_id::text, a.ativo::text)",
    enrollments: "concat_ws('|', m.id::text, m.aluno_id::text, m.turma_id::text, m.ano_letivo::text, m.data_matricula::text, m.situacao, m.observacoes)",
    sessions: "concat_ws('|', s.id::text, s.turma_id::text, s.escola_id::text, s.data_aula::text, s.inicio_aula::text, s.fim_aula::text, s.status, s.conteudo_programatico)",
    attendance: "concat_ws('|', f.id::text, f.matricula_id::text, f.sessao_id::text, f.data_aula::text, f.presente::text, f.status_presenca)",
  }
  const from: Record<string, string> = {
    school: 'public.escolas e',
    users: 'public.users u',
    classes: 'public.turmas t',
    guardians: 'public.responsaveis r',
    students: 'public.alunos a',
    enrollments: 'public.matriculas m JOIN public.alunos a ON a.id = m.aluno_id',
    sessions: 'public.sessoes_aula s JOIN public.turmas t ON t.id = s.turma_id',
    attendance: 'public.frequencia f JOIN public.sessoes_aula s ON s.id = f.sessao_id',
  }
  const where: Record<string, string> = {
    school: 'e.id = $1',
    users: "u.escola_id = $1 AND (u.email = ANY($2::text[]) OR u.email = $3)",
    classes: "t.escola_id = $1 AND t.import_source_id LIKE 'pilot-capacity:%'",
    guardians: "r.escola_id = $1 AND r.import_source_id LIKE 'pilot-capacity:%'",
    students: "a.escola_id = $1 AND a.import_source_id LIKE 'pilot-capacity:%'",
    enrollments: "a.escola_id = $1 AND m.observacoes = 'pilot capacity contract'",
    sessions: "s.escola_id = $1 AND t.import_source_id LIKE 'pilot-capacity:%'",
    attendance: "s.escola_id = $1 AND s.turma_id IN (SELECT id FROM public.turmas WHERE import_source_id LIKE 'pilot-capacity:%')",
  }
  return `SELECT md5(string_agg(md5(line), '|' ORDER BY line)) AS fingerprint FROM (SELECT ${expressions[table]} AS line FROM ${from[table]} WHERE ${where[table]}) rows`
}

async function checkCapacityFingerprints(client: Client): Promise<void> {
  const teachers = expectedTeacherEmails()
  const fingerprints: Record<string, string> = {}
  for (const table of ['school', 'users', 'classes', 'guardians', 'students', 'enrollments', 'sessions', 'attendance']) {
    const params = table === 'users'
      ? [PILOT_CAPACITY_SCHOOL_ID, teachers, PILOT_CAPACITY_DIRECTOR_EMAIL]
      : [PILOT_CAPACITY_SCHOOL_ID]
    const result = await client.query(fingerprintSql(table), params)
    const fingerprint = result.rows[0]?.fingerprint as string | null
    fingerprints[table] = fingerprint || ''
    const expectedFingerprint = EXPECTED_CAPACITY_FINGERPRINTS[table as keyof typeof EXPECTED_CAPACITY_FINGERPRINTS]
    recordCapacityCheck(
      `fingerprint_${table}`,
      fingerprint === expectedFingerprint,
      `${fingerprint || '(missing)'} == ${expectedFingerprint}`
    )
  }
  console.info(`PILOT_CAPACITY_FINGERPRINTS: ${JSON.stringify(fingerprints)}`)
}

async function checkCapacityAuthUsers(): Promise<void> {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    recordCapacityCheck('auth_capacity_users', true, 'skipped: Auth API credentials not configured')
    return
  }
  const auth = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { data, error } = await auth.auth.admin.listUsers({ page: 1, perPage: 1000 })
  const expectedEmails = [PILOT_CAPACITY_DIRECTOR_EMAIL, ...expectedTeacherEmails()]
  const actualEmails = (data?.users ?? []).map(user => user.email?.toLowerCase()).filter(Boolean)
  const missing = expectedEmails.filter(email => !actualEmails.includes(email.toLowerCase()))
  recordCapacityCheck('auth_capacity_users', !error && missing.length === 0, missing.length === 0 ? `${expectedEmails.length} synthetic Auth users present` : `missing: ${missing.join(', ')}`)
}

async function validatePilotCapacity(): Promise<void> {
  if (!SUPABASE_DB_URL) throw new Error('PILOT_CAPACITY_VALIDATE_DB_URL_REQUIRED: SUPABASE_DB_URL or DATABASE_URL is required')
  const client = new Client({ connectionString: SUPABASE_DB_URL })
  await client.connect()
  try {
    await checkCapacityMarker(client)
    await checkCapacityCounts(client)
    await checkCapacityRelationships(client)
    await checkSyntheticContacts(client)
    await checkLowAttendanceCase(client)
    await checkCapacityFingerprints(client)
    await checkCapacityAuthUsers()

    console.info('PILOT_CAPACITY_VALIDATION_RECEIPT:')
    for (const check of checks) {
      console.info(`  [${check.ok ? 'PASS' : 'FAIL'}] ${check.name}: ${check.detail}`)
    }

    const failed = checks.filter(check => !check.ok)
    if (failed.length > 0) {
      throw new Error(`PILOT_CAPACITY_VALIDATION_FAILED: ${failed.length} checks failed`)
    }
    console.info(`PILOT_CAPACITY_VALIDATION_OK: ${checks.length} checks passed`)
  } finally {
    await client.end()
  }
}

if (require.main === module) {
  validatePilotCapacity().catch(error => {
    console.error(error instanceof Error ? error.message : error)
    process.exit(1)
  })
}
