#!/usr/bin/env tsx
/**
 * Seed the isolated synthetic pilot capacity contract into a local Supabase stack.
 *
 * Safety: the shared pilot gate rejects every non-loopback Supabase URL. The
 * database transaction writes only the fixed capacity-contract entity IDs.
 */
import { Client } from 'pg'
import { createClient } from '@supabase/supabase-js'
import { assertSyntheticPilotSafety } from '../lib/pilot/pilot-safety-gate'
import {
  PILOT_CAPACITY_AUTH_PASSWORD,
  PILOT_CAPACITY_CONFIG_ANCHOR_ID,
  PILOT_CAPACITY_CONFIG_MARKER_ID,
  PILOT_CAPACITY_CONTRACT,
  PILOT_CAPACITY_DIRECTOR_EMAIL,
  PILOT_CAPACITY_SCHOOL_ID,
  PILOT_CAPACITY_SEED_ANCHOR_DATE,
  PILOT_CAPACITY_SEED_CREATED_AT,
  PILOT_CAPACITY_SEED_MARKER,
  pilotCapacityAttendanceId,
  pilotCapacityClassId,
  pilotCapacityEnrollmentId,
  pilotCapacityGuardianEmail,
  pilotCapacityGuardianId,
  pilotCapacityGuardianName,
  pilotCapacityGuardianPhone,
  pilotCapacityLinkId,
  pilotCapacitySchoolDays,
  pilotCapacitySessionId,
  pilotCapacityStudentId,
  pilotCapacityStudentName,
  pilotCapacityStudentPresent,
  pilotCapacityTeacherEmail,
  pilotCapacityTeacherIndexForClass,
  pilotCapacityTeacherName,
} from '../../supabase/seed-pilot-capacity/pilot-capacity-contract'

assertSyntheticPilotSafety('seed')

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const SUPABASE_DB_URL = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL || ''
const PILOT_CAPACITY_DIRECTOR_NAME = 'Diretor Capacidade'
const PILOT_CAPACITY_CLASS_CREATED_AT = PILOT_CAPACITY_SEED_CREATED_AT
const PILOT_CAPACITY_YEAR = 2026

type SeedValue = string | number | boolean | null

type AuthAccount = {
  email: string
  name: string
  role: 'diretor' | 'professor'
}

const TEACHER_ACCOUNTS: AuthAccount[] = Array.from(
  { length: PILOT_CAPACITY_CONTRACT.teacherOwnerCount },
  (_, index) => {
    const teacherIndex = index + 1
    return {
      email: pilotCapacityTeacherEmail(teacherIndex),
      name: pilotCapacityTeacherName(teacherIndex),
      role: 'professor' as const,
    }
  }
)

const CAPACITY_ACCOUNTS: AuthAccount[] = [
  { email: PILOT_CAPACITY_DIRECTOR_EMAIL, name: PILOT_CAPACITY_DIRECTOR_NAME, role: 'diretor' },
  ...TEACHER_ACCOUNTS,
]

const service = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

function assertCapacitySeedEnvironment(): void {
  if (!SUPABASE_SERVICE_ROLE_KEY.startsWith('sb_secret_')) {
    throw new Error('PILOT_CAPACITY_SEED_SERVICE_KEY_REQUIRED: local sb_secret key is required')
  }
  if (!SUPABASE_DB_URL) {
    throw new Error('PILOT_CAPACITY_SEED_DB_URL_REQUIRED: SUPABASE_DB_URL or DATABASE_URL is required')
  }
}

async function ensureCapacityAuthUser(account: AuthAccount): Promise<string> {
  const { data: listed, error: listError } = await service.auth.admin.listUsers({ page: 1, perPage: 1000 })
  if (listError) throw new Error(`PILOT_CAPACITY_SEED_AUTH_LIST_FAILED: ${listError.message}`)

  const existing = listed.users.find(user => user.email?.toLowerCase() === account.email.toLowerCase())
  if (existing) {
    const { data, error } = await service.auth.admin.updateUserById(existing.id, {
      password: PILOT_CAPACITY_AUTH_PASSWORD,
      email_confirm: true,
      user_metadata: { nome: account.name, tipo_usuario: account.role, synthetic: true },
    })
    if (error || !data.user) {
      throw new Error(`PILOT_CAPACITY_SEED_AUTH_UPDATE_FAILED: ${account.email}`)
    }
    return data.user.id
  }

  const { data, error } = await service.auth.admin.createUser({
    email: account.email,
    password: PILOT_CAPACITY_AUTH_PASSWORD,
    email_confirm: true,
    user_metadata: { nome: account.name, tipo_usuario: account.role, synthetic: true },
  })
  if (error || !data.user) {
    throw new Error(`PILOT_CAPACITY_SEED_AUTH_CREATE_FAILED: ${account.email}`)
  }
  return data.user.id
}

function buildInsertQuery(
  table: string,
  columns: string[],
  rows: SeedValue[][],
  conflictColumns: string[] = ['id']
): { text: string; values: SeedValue[] } {
  if (rows.length === 0) throw new Error(`PILOT_CAPACITY_SEED_EMPTY_ROWS: ${table}`)
  const values = rows.flat()
  const placeholders = rows.map((row, rowIndex) => {
    if (row.length !== columns.length) {
      throw new Error(`PILOT_CAPACITY_SEED_COLUMN_MISMATCH: ${table}`)
    }
    return `(${row.map((_, columnIndex) => `$${rowIndex * columns.length + columnIndex + 1}`).join(', ')})`
  })
  const updates = columns
    .filter(column => !conflictColumns.includes(column))
    .map(column => `${column} = EXCLUDED.${column}`)
    .join(', ')

  return {
    text: `INSERT INTO public.${table} (${columns.join(', ')}) VALUES ${placeholders.join(', ')} ON CONFLICT (${conflictColumns.join(', ')}) DO UPDATE SET ${updates}`,
    values,
  }
}

async function insertCapacityRows(
  client: Client,
  table: string,
  columns: string[],
  rows: SeedValue[][],
  conflictColumns: string[] = ['id']
): Promise<void> {
  const query = buildInsertQuery(table, columns, rows, conflictColumns)
  await client.query(query.text, query.values)
}

function isoDateOffset(offset: number): string {
  const date = new Date('2017-01-01T00:00:00.000Z')
  date.setUTCDate(date.getUTCDate() + offset)
  return date.toISOString().slice(0, 10)
}

function accountId(accountIds: Map<string, string>, email: string): string {
  const id = accountIds.get(email)
  if (!id) throw new Error(`PILOT_CAPACITY_SEED_ACCOUNT_ID_MISSING: ${email}`)
  return id
}

async function writeCapacityContract(client: Client, accountIds: Map<string, string>): Promise<void> {
  const directorId = accountId(accountIds, PILOT_CAPACITY_DIRECTOR_EMAIL)
  const teacherIds = new Map(
    TEACHER_ACCOUNTS.map((account, index) => [index + 1, accountId(accountIds, account.email)])
  )
  const schoolDays = pilotCapacitySchoolDays()

  await client.query('BEGIN')

  try {
    await insertCapacityRows(client, 'escolas', [
      'id', 'codigo', 'nome', 'tipo', 'ativo', 'diretor_id', 'created_at',
    ], [[
      PILOT_CAPACITY_SCHOOL_ID,
      'PILOT-CAPACITY',
      'Escola Piloto Capacidade',
      'fundamental',
      true,
      null,
      PILOT_CAPACITY_SEED_CREATED_AT,
    ]])

    await insertCapacityRows(client, 'users', [
      'id', 'nome', 'email', 'tipo_usuario', 'escola_id', 'ativo',
      'primeiro_login', 'senha_padrao', 'created_at',
    ], CAPACITY_ACCOUNTS.map(account => [
      accountId(accountIds, account.email),
      account.name,
      account.email,
      account.role,
      PILOT_CAPACITY_SCHOOL_ID,
      true,
      false,
      false,
      PILOT_CAPACITY_SEED_CREATED_AT,
    ]))

    await client.query(
      'UPDATE public.escolas SET diretor_id = $1 WHERE id = $2',
      [directorId, PILOT_CAPACITY_SCHOOL_ID]
    )

    await insertCapacityRows(client, 'turmas', [
      'id', 'import_source_id', 'nome', 'serie', 'turno', 'ano_letivo', 'capacidade',
      'escola_id', 'professor_id', 'ativo', 'created_at',
    ], Array.from({ length: PILOT_CAPACITY_CONTRACT.classCount }, (_, index) => {
      const classIndex = index + 1
      return [
        pilotCapacityClassId(classIndex),
        `pilot-capacity:class:${classIndex.toString().padStart(2, '0')}`,
        `Turma Capacidade ${classIndex.toString().padStart(2, '0')}`,
        '1 ano',
        classIndex % 2 === 0 ? 'vespertino' : 'matutino',
        PILOT_CAPACITY_YEAR,
        PILOT_CAPACITY_CONTRACT.studentsPerClass,
        PILOT_CAPACITY_SCHOOL_ID,
        teacherIds.get(pilotCapacityTeacherIndexForClass(classIndex)) || null,
        true,
        PILOT_CAPACITY_CLASS_CREATED_AT,
      ]
    }))

    await insertCapacityRows(client, 'responsaveis', [
      'id', 'escola_id', 'import_source_id', 'nome', 'cpf', 'parentesco',
      'telefone', 'email', 'ativo', 'created_at',
    ], Array.from({ length: PILOT_CAPACITY_CONTRACT.guardianCount }, (_, index) => {
      const guardianIndex = index + 1
      return [
        pilotCapacityGuardianId(guardianIndex),
        PILOT_CAPACITY_SCHOOL_ID,
        `pilot-capacity:guardian:${guardianIndex.toString().padStart(3, '0')}`,
        pilotCapacityGuardianName(guardianIndex),
        null,
        guardianIndex % 2 === 0 ? 'pai' : 'mae',
        pilotCapacityGuardianPhone(guardianIndex),
        pilotCapacityGuardianEmail(guardianIndex),
        true,
        PILOT_CAPACITY_SEED_CREATED_AT,
      ]
    }))

    await insertCapacityRows(client, 'alunos', [
      'id', 'escola_id', 'import_source_id', 'nome_completo', 'data_nascimento',
      'sexo', 'responsavel_id', 'ativo', 'created_at',
    ], Array.from({ length: PILOT_CAPACITY_CONTRACT.activeStudentCount }, (_, index) => {
      const studentIndex = index + 1
      return [
        pilotCapacityStudentId(studentIndex),
        PILOT_CAPACITY_SCHOOL_ID,
        `pilot-capacity:student:${studentIndex.toString().padStart(3, '0')}`,
        pilotCapacityStudentName(studentIndex),
        isoDateOffset(studentIndex - 1),
        studentIndex % 2 === 0 ? 'F' : 'M',
        pilotCapacityGuardianId(studentIndex),
        true,
        PILOT_CAPACITY_SEED_CREATED_AT,
      ]
    }))

    await insertCapacityRows(client, 'aluno_responsaveis', [
      'id', 'aluno_id', 'responsavel_id', 'tipo_responsabilidade', 'prioridade',
      'pode_autorizar_saida', 'pode_receber_comunicados', 'ativo', 'created_at',
    ], Array.from({ length: PILOT_CAPACITY_CONTRACT.activeStudentCount }, (_, index) => {
      const studentIndex = index + 1
      return [
        pilotCapacityLinkId(studentIndex),
        pilotCapacityStudentId(studentIndex),
        pilotCapacityGuardianId(studentIndex),
        studentIndex % 2 === 0 ? 'pai' : 'mae',
        1,
        true,
        true,
        true,
        PILOT_CAPACITY_SEED_CREATED_AT,
      ]
    }))

    for (let classIndex = 1; classIndex <= PILOT_CAPACITY_CONTRACT.classCount; classIndex += 1) {
      const enrollmentRows = Array.from(
        { length: PILOT_CAPACITY_CONTRACT.studentsPerClass },
        (_, offset) => {
          const studentIndex = (classIndex - 1) * PILOT_CAPACITY_CONTRACT.studentsPerClass + offset + 1
          return [
            pilotCapacityEnrollmentId(studentIndex),
            pilotCapacityStudentId(studentIndex),
            pilotCapacityClassId(classIndex),
            PILOT_CAPACITY_YEAR,
            '2026-02-02',
            'ativa',
            'pilot capacity contract',
            PILOT_CAPACITY_SEED_CREATED_AT,
          ]
        }
      )
      await insertCapacityRows(client, 'matriculas', [
        'id', 'aluno_id', 'turma_id', 'ano_letivo', 'data_matricula',
        'situacao', 'observacoes', 'created_at',
      ], enrollmentRows)
    }

    const sessionRows: SeedValue[][] = []
    let sessionIndex = 0
    for (let classIndex = 1; classIndex <= PILOT_CAPACITY_CONTRACT.classCount; classIndex += 1) {
      for (const schoolDay of schoolDays) {
        sessionIndex += 1
        sessionRows.push([
          pilotCapacitySessionId(sessionIndex),
          pilotCapacityClassId(classIndex),
          PILOT_CAPACITY_SCHOOL_ID,
          teacherIds.get(classIndex) || null,
          schoolDay,
          '08:00:00',
          '08:50:00',
          50,
          'Números e operações',
          'Resolver situações de adição',
          'Aprendizagem baseada em problemas',
          'Material dourado',
          'FECHADA',
          false,
          `${schoolDay}T12:00:00.000Z`,
          `${schoolDay}T13:00:00.000Z`,
          `${schoolDay}T13:00:00.000Z`,
          PILOT_CAPACITY_SEED_CREATED_AT,
          PILOT_CAPACITY_SEED_CREATED_AT,
        ])
      }
    }
    await insertCapacityRows(client, 'sessoes_aula', [
      'id', 'turma_id', 'escola_id', 'professor_id', 'data_aula', 'inicio_aula',
      'fim_aula', 'duracao_minutos', 'conteudo_programatico', 'objetivos_aprendizagem',
      'metodologia', 'recursos_utilizados', 'status', 'documento_oficial',
      'aberta_em', 'fechada_em', 'travada_em', 'created_at', 'updated_at',
    ], sessionRows)

    const attendanceRows: SeedValue[][] = []
    let attendanceIndex = 0
    for (let classIndex = 1; classIndex <= PILOT_CAPACITY_CONTRACT.classCount; classIndex += 1) {
      for (let schoolDayIndex = 0; schoolDayIndex < schoolDays.length; schoolDayIndex += 1) {
        const sessionIndexForClass = (classIndex - 1) * schoolDays.length + schoolDayIndex + 1
        for (let studentOffset = 0; studentOffset < PILOT_CAPACITY_CONTRACT.studentsPerClass; studentOffset += 1) {
          const studentIndex = (classIndex - 1) * PILOT_CAPACITY_CONTRACT.studentsPerClass + studentOffset + 1
          attendanceIndex += 1
          const present = pilotCapacityStudentPresent(studentIndex, schoolDayIndex)
          attendanceRows.push([
            pilotCapacityAttendanceId(attendanceIndex),
            pilotCapacityEnrollmentId(studentIndex),
            schoolDays[schoolDayIndex],
            present,
            present ? 'P' : 'F',
            null,
            null,
            pilotCapacitySessionId(sessionIndexForClass),
            teacherIds.get(classIndex) || null,
            teacherIds.get(classIndex) || null,
            `${schoolDays[schoolDayIndex]}T18:00:00.000Z`,
            PILOT_CAPACITY_SEED_CREATED_AT,
          ])
        }
      }
    }
    await insertCapacityRows(client, 'frequencia', [
      'id', 'matricula_id', 'data_aula', 'presente', 'status_presenca',
      'justificativa', 'observacoes', 'sessao_id', 'professor_id', 'marcado_por',
      'marcado_em', 'created_at',
    ], attendanceRows)

    await insertCapacityRows(client, 'configs', [
      'id', 'chave', 'valor', 'categoria', 'descricao', 'tipo_valor',
      'valor_padrao', 'ativo', 'created_at',
    ], [
      [
        PILOT_CAPACITY_CONFIG_MARKER_ID,
        'pilot_capacity_synthetic_marker',
        PILOT_CAPACITY_SEED_MARKER,
        'pilot',
        'Marker for the isolated synthetic capacity contract',
        'string',
        PILOT_CAPACITY_SEED_MARKER,
        true,
        PILOT_CAPACITY_SEED_CREATED_AT,
      ],
      [
        PILOT_CAPACITY_CONFIG_ANCHOR_ID,
        'pilot_capacity_seed_anchor_date',
        PILOT_CAPACITY_SEED_ANCHOR_DATE,
        'pilot',
        'Anchor date for the deterministic school-day window',
        'string',
        PILOT_CAPACITY_SEED_ANCHOR_DATE,
        true,
        PILOT_CAPACITY_SEED_CREATED_AT,
      ],
    ])

    await client.query('COMMIT')
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  }
}

async function readCapacitySeedReceipt(client: Client, accountIds: Map<string, string>): Promise<Record<string, number>> {
  const teacherIds = TEACHER_ACCOUNTS.map(account => accountId(accountIds, account.email))
  const result = await client.query(`
    SELECT
      (SELECT count(*) FROM public.escolas WHERE id = $1) AS schools,
      (SELECT count(*) FROM public.turmas WHERE escola_id = $1 AND import_source_id LIKE 'pilot-capacity:%') AS classes,
      (SELECT count(*) FROM public.alunos WHERE escola_id = $1 AND import_source_id LIKE 'pilot-capacity:%' AND ativo = true) AS active_students,
      (SELECT count(*) FROM public.matriculas m JOIN public.alunos a ON a.id = m.aluno_id WHERE a.escola_id = $1 AND m.observacoes = 'pilot capacity contract' AND m.situacao = 'ativa') AS enrollments,
      (SELECT count(*) FROM public.responsaveis WHERE escola_id = $1 AND import_source_id LIKE 'pilot-capacity:%') AS guardians,
      (SELECT count(*) FROM public.users WHERE id = ANY($2::uuid[]) AND tipo_usuario = 'professor' AND ativo = true) AS teacher_owners,
      (SELECT count(*) FROM public.users WHERE id = $3 AND tipo_usuario = 'diretor' AND ativo = true) AS directors,
      (SELECT count(*) FROM public.sessoes_aula WHERE escola_id = $1 AND turma_id IN (SELECT id FROM public.turmas WHERE import_source_id LIKE 'pilot-capacity:%')) AS sessions,
      (SELECT count(*) FROM public.frequencia WHERE sessao_id IN (SELECT id FROM public.sessoes_aula WHERE escola_id = $1 AND turma_id IN (SELECT id FROM public.turmas WHERE import_source_id LIKE 'pilot-capacity:%'))) AS attendance
  `, [PILOT_CAPACITY_SCHOOL_ID, teacherIds, accountId(accountIds, PILOT_CAPACITY_DIRECTOR_EMAIL)])

  const row = result.rows[0] as Record<string, string>
  return Object.fromEntries(Object.entries(row).map(([key, value]) => [key, Number(value)]))
}

export async function seedPilotCapacity(): Promise<void> {
  assertCapacitySeedEnvironment()

  const accountIds = new Map<string, string>()
  for (const account of CAPACITY_ACCOUNTS) {
    accountIds.set(account.email, await ensureCapacityAuthUser(account))
  }

  const client = new Client({ connectionString: SUPABASE_DB_URL })
  await client.connect()
  try {
    await writeCapacityContract(client, accountIds)
    const receipt = await readCapacitySeedReceipt(client, accountIds)
    console.info(`PILOT_CAPACITY_SEED_COMPLETE: ${JSON.stringify(receipt)}`)
    console.info(`PILOT_CAPACITY_SEED_RECEIPT: ${JSON.stringify({
      marker: PILOT_CAPACITY_SEED_MARKER,
      anchorDate: PILOT_CAPACITY_SEED_ANCHOR_DATE,
      schoolDays: pilotCapacitySchoolDays(),
      teacherEmails: CAPACITY_ACCOUNTS.map(account => account.email),
      expected: PILOT_CAPACITY_CONTRACT,
    })}`)
  } finally {
    await client.end()
  }
}

if (require.main === module) {
  seedPilotCapacity().catch(error => {
    console.error(error instanceof Error ? error.message : error)
    process.exit(1)
  })
}
