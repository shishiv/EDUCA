import { randomUUID } from 'node:crypto'
import type { Client } from 'pg'
import { expect, type APIRequestContext } from '@playwright/test'
import type { AttendanceBands } from '@/lib/attendance/attendance-policy'
import { municipalSettingsSchema } from '@/lib/services/municipal-settings'
import { withLocalDatabase } from '../support/local-database'

/** Uses the authenticated municipal route, not a service-role config write. */
export async function setFixtureAttendanceBands(request: APIRequestContext, schoolId: string, bands: AttendanceBands) {
  const response = await request.get(`/api/school-settings/municipal?schoolId=${schoolId}&year=2026`)
  expect(response.ok()).toBe(true)
  const previous = municipalSettingsSchema.parse((await response.json()).settings)
  const saved = await request.patch('/api/school-settings/municipal', { data: {
    schoolId, municipalityName: previous.municipality_name, educationDepartmentName: previous.education_department_name,
    state: previous.state, contactPhone: previous.contact_phone, dpoEmail: previous.dpo_email,
    dpoAddress: previous.dpo_address, educacensoYear: 2026, educacensoDeadline: previous.educacenso_deadline,
    attendanceBands: bands,
  } })
  expect(saved.ok()).toBe(true)
  expect((await saved.json()).settings.attendance_bands).toEqual(bands)
  return previous.attendance_bands
}

interface SchoolYearSeed {
  schoolId: string
  year: number
  teachers: string[]
  students: number
  attendance: boolean[]
}

async function seedSchoolYear(db: Client, seed: SchoolYearSeed) {
  await db.query(`INSERT INTO anos_letivos (escola_id, ano, data_inicio, data_fim)
    VALUES ($1, $2, $3, $4) ON CONFLICT (escola_id, ano)
    DO UPDATE SET data_inicio = EXCLUDED.data_inicio, data_fim = EXCLUDED.data_fim`,
  [seed.schoolId, seed.year, `${seed.year}-02-01`, `${seed.year}-11-30`])
  const classes: string[] = []
  for (const [index, teacher] of seed.teachers.entries()) {
    const id = randomUUID()
    await db.query(`INSERT INTO turmas (id, escola_id, nome, ano_letivo, serie, turno, professor_id, capacidade)
      VALUES ($1, $2, $3, $4, '1º Ano', 'matutino', $5, 20)`,
    [id, seed.schoolId, `F09 ${seed.year} turma ${index + 1}`, seed.year, teacher])
    classes.push(id)
  }
  const enrollments: string[] = []
  for (let index = 0; index < seed.students; index += 1) {
    const studentId = randomUUID()
    const enrollmentId = randomUUID()
    await db.query(`INSERT INTO alunos (id, escola_id, nome_completo, data_nascimento, sexo)
      VALUES ($1, $2, $3, '2017-04-10', 'F')`, [studentId, seed.schoolId, `F09 ${seed.year} aluno ${index + 1}`])
    await db.query(`INSERT INTO matriculas (id, aluno_id, turma_id, ano_letivo, situacao)
      VALUES ($1, $2, $3, $4, 'ativa')`, [enrollmentId, studentId, classes[index % classes.length], seed.year])
    enrollments.push(enrollmentId)
  }
  // One student can have several canonical facts. Do not average student percentages.
  for (const [index, present] of seed.attendance.entries()) {
    const enrollment = index % enrollments.length
    await seedFact(db, {
      seed, classId: classes[enrollment % classes.length], enrollmentId: enrollments[enrollment],
      teacherId: seed.teachers[enrollment % classes.length],
      date: `${seed.year}-05-${String(index + 1).padStart(2, '0')}`, present,
    })
  }
  await seedFact(db, {
    seed, classId: classes[0], enrollmentId: enrollments[0], teacherId: seed.teachers[0],
    date: `${seed.year}-01-15`, present: true,
  })
  // Decoys protect active-class and active-enrollment filters, plus the academic date range.
  await db.query(`INSERT INTO turmas (escola_id, nome, ano_letivo, serie, turno, ativo)
    VALUES ($1, 'F09 turma inativa', $2, '1º Ano', 'matutino', false)`, [seed.schoolId, seed.year])
  const decoyId = randomUUID()
  await db.query(`INSERT INTO alunos (id, escola_id, nome_completo, data_nascimento, sexo)
    VALUES ($1, $2, 'F09 aluno cancelado', '2017-04-10', 'F')`, [decoyId, seed.schoolId])
  await db.query(`INSERT INTO matriculas (aluno_id, turma_id, ano_letivo, situacao)
    VALUES ($1, $2, $3, 'cancelada')`, [decoyId, classes[0], seed.year])
}

async function seedFact(db: Client, input: {
  seed: SchoolYearSeed; classId: string; enrollmentId: string; teacherId: string; date: string; present: boolean
}) {
  const sessionId = randomUUID()
  await db.query(`INSERT INTO sessoes_aula (id, escola_id, turma_id, professor_id, data_aula, status, conteudo_programatico)
    VALUES ($1, $2, $3, $4, $5, 'ABERTA', 'F09 frequência sintética')`,
  [sessionId, input.seed.schoolId, input.classId, input.teacherId, input.date])
  await db.query(`INSERT INTO frequencia (matricula_id, sessao_id, data_aula, presente, status_presenca)
    VALUES ($1, $2, $3, $4, $5)`,
  [input.enrollmentId, sessionId, input.date, input.present, input.present ? 'P' : 'F'])
}

export async function createDashboardFixture() {
  const schoolA = randomUUID()
  const schoolB = randomUUID()
  const teachers = [randomUUID(), randomUUID(), randomUUID(), randomUUID()]
  const schoolAName = `Escola sintética F09 A ${schoolA}`
  const schoolBName = `Escola sintética F09 B ${schoolB}`
  await withLocalDatabase(async db => {
    await db.query('BEGIN')
    try {
      for (const [index, schoolId] of [schoolA, schoolB].entries()) {
        await db.query(`INSERT INTO escolas (id, nome, codigo, tipo, municipio_id)
          SELECT $1, $2, $3, 'fundamental', id FROM pilot_municipality_config ORDER BY created_at, id LIMIT 1`,
        [schoolId, index === 0 ? schoolAName : schoolBName, schoolId])
      }
      for (const [index, id] of teachers.entries()) {
        await db.query(`INSERT INTO users (id, nome, email, tipo_usuario, escola_id)
          VALUES ($1, $2, $3, 'professor', $4)`,
        [id, `F09 docente ${index}`, `f09-${id}@synthetic.invalid`, index < 2 ? schoolA : schoolB])
      }
      await seedSchoolYear(db, { schoolId: schoolA, year: 2025, teachers: [teachers[0], teachers[0]], students: 3, attendance: [true, true, true, false] })
      await seedSchoolYear(db, { schoolId: schoolA, year: 2026, teachers: [teachers[1]], students: 2, attendance: [true, false, false] })
      await seedSchoolYear(db, { schoolId: schoolB, year: 2025, teachers: [teachers[2]], students: 1, attendance: [true, true] })
      await seedSchoolYear(db, { schoolId: schoolB, year: 2026, teachers: [teachers[2], teachers[3]], students: 4, attendance: [true, false, false, false, false] })
      await db.query('COMMIT')
    } catch (error) {
      await db.query('ROLLBACK')
      throw error
    }
  })
  return {
    schoolA, schoolB, schoolAName, schoolBName,
    cleanup: () => cleanupDashboardFixture([schoolA, schoolB], teachers),
  }
}

async function cleanupDashboardFixture(schools: string[], teachers: string[]) {
  return withLocalDatabase(async db => {
    const before = await db.query<{ id: string; fingerprint: string }>(
      'SELECT id, md5(to_jsonb(a)::text) AS fingerprint FROM pilot_audit_log a WHERE escola_id = ANY($1::uuid[]) ORDER BY id', [schools],
    )
    await db.query('DELETE FROM frequencia WHERE sessao_id IN (SELECT id FROM sessoes_aula WHERE escola_id = ANY($1::uuid[]))', [schools])
    await db.query('DELETE FROM sessoes_aula WHERE escola_id = ANY($1::uuid[])', [schools])
    await db.query('DELETE FROM matriculas WHERE turma_id IN (SELECT id FROM turmas WHERE escola_id = ANY($1::uuid[]))', [schools])
    await db.query('DELETE FROM alunos WHERE escola_id = ANY($1::uuid[])', [schools])
    await db.query('DELETE FROM turmas WHERE escola_id = ANY($1::uuid[])', [schools])
    await db.query('DELETE FROM users WHERE id = ANY($1::uuid[])', [teachers])
    const remaining = await db.query(`SELECT
      (SELECT count(*)::int FROM alunos WHERE escola_id = ANY($1::uuid[])) AS students,
      (SELECT count(*)::int FROM turmas WHERE escola_id = ANY($1::uuid[])) AS classes,
      (SELECT count(*)::int FROM sessoes_aula WHERE escola_id = ANY($1::uuid[])) AS sessions,
      (SELECT count(*)::int FROM users WHERE id = ANY($2::uuid[])) AS teachers,
      (SELECT count(*)::int FROM escolas WHERE id = ANY($1::uuid[])) AS retained_schools`, [schools, teachers])
    // FK checks remain enabled: deleting classes/sessions also proves no dependent enrollment/fact survives.
    expect(remaining.rows).toEqual([{ students: 0, classes: 0, sessions: 0, teachers: 0, retained_schools: 2 }])
    const after = await db.query<{ id: string; fingerprint: string }>(
      'SELECT id, md5(to_jsonb(a)::text) AS fingerprint FROM pilot_audit_log a WHERE id = ANY($1::uuid[]) ORDER BY id',
      [before.rows.map(row => row.id)],
    )
    expect(after.rows).toEqual(before.rows)
    // Audit and referenced school metadata belong to final disposal of the exclusive local stack.
    return { schools, removed: remaining.rows[0], retainedAudit: after.rows, finalDisposal: 'exclusive Supabase project lifecycle' }
  })
}

/** SQL aggregate is independent of dashboardStatsApi and the browser's PostgREST queries. */
export function readDashboardOracle(schoolId: string, year: number) {
  return withLocalDatabase(async db => (await db.query(`
    WITH classes AS (
      SELECT id, professor_id FROM turmas WHERE escola_id = $1 AND ano_letivo = $2 AND ativo
    ), enrollments AS (
      SELECT m.id, m.aluno_id FROM matriculas m JOIN classes c ON c.id = m.turma_id
      WHERE m.ano_letivo = $2 AND m.situacao = 'ativa'
    ), facts AS (
      SELECT f.presente FROM frequencia f JOIN enrollments m ON m.id = f.matricula_id
      JOIN sessoes_aula s ON s.id = f.sessao_id
      JOIN anos_letivos y ON y.escola_id = $1 AND y.ano = $2
      WHERE s.data_aula BETWEEN y.data_inicio AND y.data_fim
        AND f.status_presenca IS DISTINCT FROM 'NAO_MARCADO'
    ) SELECT
      (SELECT count(DISTINCT aluno_id)::int FROM enrollments) AS students,
      (SELECT count(*)::int FROM classes) AS classes,
      (SELECT count(*)::int FROM users u WHERE u.id IN (SELECT professor_id FROM classes)
        AND u.tipo_usuario = 'professor' AND u.ativo) AS teachers,
      (SELECT count(*)::int FROM facts) AS facts,
      (SELECT count(*)::int FROM facts WHERE presente) AS present,
      (SELECT round(100.0 * count(*) FILTER (WHERE presente) / nullif(count(*), 0), 1)::float FROM facts) AS attendance
  `, [schoolId, year])).rows[0])
}
