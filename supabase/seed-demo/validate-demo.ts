#!/usr/bin/env tsx
/**
 * validate-demo.ts
 *
 * Validacao do sandbox publico do EDUCA (issue #23). Prova, com consultas
 * contra o proprio banco do demo:
 *
 *  1. Contagens do contrato: 3 escolas, 5 turmas, 10 professores + 1 admin,
 *     50 alunos, 50 responsaveis, 50 vinculos, 50 matriculas, 300 notas,
 *     15 eventos de calendario, 11 configs, e a frequencia/aulas geradas
 *     para a janela ancorada (20 dias letivos).
 *  2. Relacionamentos: integridade referencial e consistencia escola -> turma
 *     -> matricula -> frequencia; cada aluno em exatamente uma turma da sua
 *     escola; frequencia sempre vinculada a uma aula da turma certa.
 *  3. Marcadores synthetic-only: configs.demo_synthetic_marker =
 *     'SYNTHETIC-EDUCA-DEMO'; dominios de contato reservados; identidades
 *     fake.
 *  4. Caso de alerta: existe aluno com bolsa_familia=true e frequencia
 *     < 80% (matricula 401, receita issue #23 e app BOLSA_FAMILIA_THRESHOLD).
 *  5. Determinismo/repetibilidade: as contagens e a presenca por aluno
 *     conferem exatamente com o que attendance-generator.ts produz para a
 *     data de ancoragem registrada (demo_seed_anchor_date), e um fingerprint
 *     md5 por tabela e impresso - dois resets com a mesma ancora produzem
 *     fingerprints identicos (ver `pnpm demo:reset-check`).
 *
 * Variaveis:
 *   SUPABASE_DEMO_DB_URL       - obrigatoria (string de conexao Postgres)
 *   SUPABASE_DEMO_URL          - opcional (verifica o usuario de auth)
 *   SUPABASE_DEMO_SERVICE_KEY  - opcional (verifica o usuario de auth)
 *
 * Uso:
 *   pnpm demo:validate
 */

import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import type { Client as PgClient } from 'pg'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const requireFromApp = createRequire(join(__dirname, '..', '..', 'app', 'package.json'))
const { Client } = requireFromApp('pg') as { Client: new (opts: { connectionString: string }) => PgClient }
const { createClient } = requireFromApp('@supabase/supabase-js') as {
  createClient: (url: string, key: string, opts?: unknown) => { auth: { admin: { listUsers: (opts: unknown) => Promise<{ data: { users?: Array<{ email?: string | null }> } | null; error: { message: string } | null }> } } }
}
import {
  MATRICULAS,
  TURMAS,
  schoolDaysEndingOn,
  DEMO_SCHOOL_DAYS,
  isPresentOn,
  LOW_ATTENDANCE_MATRICULA_ID,
} from './attendance-generator'

const DB_URL = process.env.SUPABASE_DEMO_DB_URL || ''
const API_URL = process.env.SUPABASE_DEMO_URL || ''
const API_KEY = process.env.SUPABASE_DEMO_SERVICE_KEY || ''

// Receipts from the static seed (supabase/seed-demo/seed-demo.sql).
const STATIC_COUNTS: Record<string, number> = {
  escolas: 3,
  users: 11, // 1 admin + 10 professores (issue #23)
  turmas: 5,
  disciplinas: 15,
  responsaveis: 50,
  alunos: 50,
  aluno_responsaveis: 50,
  matriculas: 50,
  notas: 300,
  calendario_escolar: 15,
  configs: 12, // 8 configs + 3 marcadores (960/961/962) + demo_seed_anchor_date (963) gravado pelo reset
}

const EXPECTED_SYNTHETIC_MARKER = 'SYNTHETIC-EDUCA-DEMO'
const ALERT_THRESHOLD = 80

interface CheckResult {
  name: string
  ok: boolean
  detail: string
}

const checks: CheckResult[] = []

function record(name: string, ok: boolean, detail: string): void {
  checks.push({ name, ok, detail })
}

async function run(): Promise<void> {
  if (!DB_URL) {
    console.error('ERRO: SUPABASE_DEMO_DB_URL e obrigatoria para a validacao.')
    process.exit(2)
  }

  const client = new Client({ connectionString: DB_URL })
  try {
    await client.connect()
  } catch {
    console.error('DEMO_VALIDATE_FAILED: phase=database_connect')
    process.exit(1)
  }

  let phase = 'database_checks'
  try {
    // ---------------------------------------------------------------------
    // 0. Marcador e ancora
    // ---------------------------------------------------------------------
    const marker = await client.query(
      `SELECT valor FROM configs WHERE chave = 'demo_synthetic_marker'`
    )
    const anchor = await client.query(
      `SELECT valor FROM configs WHERE chave = 'demo_seed_anchor_date'`
    )
    const markerValue = marker.rows[0]?.valor as string | undefined
    const anchorDate = anchor.rows[0]?.valor as string | undefined
    record(
      'marker_synthetic',
      markerValue === EXPECTED_SYNTHETIC_MARKER,
      markerValue === EXPECTED_SYNTHETIC_MARKER ? 'marcador synthetic esperado presente' : 'marcador synthetic ausente ou divergente'
    )
    record('marker_anchor', typeof anchorDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(anchorDate), `demo_seed_anchor_date = ${anchorDate ?? '(ausente)'}`)
    if (!anchorDate) {
      console.error('ERRO: banco sem demo_seed_anchor_date - rode `pnpm seed:demo` primeiro.')
      process.exit(2)
    }

    const schoolDays = schoolDaysEndingOn(anchorDate, DEMO_SCHOOL_DAYS)
    const expectedAulas = TURMAS.length * schoolDays.length
    const expectedFrequencia = MATRICULAS.length * schoolDays.length

    // ---------------------------------------------------------------------
    // 1. Contagens
    // ---------------------------------------------------------------------
    const countQuery = `
      SELECT
        (SELECT count(*) FROM escolas) AS escolas,
        (SELECT count(*) FROM users) AS users,
        (SELECT count(*) FROM turmas) AS turmas,
        (SELECT count(*) FROM disciplinas) AS disciplinas,
        (SELECT count(*) FROM responsaveis) AS responsaveis,
        (SELECT count(*) FROM alunos) AS alunos,
        (SELECT count(*) FROM aluno_responsaveis) AS aluno_responsaveis,
        (SELECT count(*) FROM matriculas) AS matriculas,
        (SELECT count(*) FROM notas) AS notas,
        (SELECT count(*) FROM calendario_escolar) AS calendario_escolar,
        (SELECT count(*) FROM configs) AS configs,
        (SELECT count(*) FROM sessoes_aula) AS sessoes_aula,
        (SELECT count(*) FROM frequencia) AS frequencia
    `
    const counts = (await client.query(countQuery)).rows[0] as Record<string, number>
    for (const [table, expected] of Object.entries(STATIC_COUNTS)) {
      const actual = Number(counts[table])
      record(`count_${table}`, actual === expected, `${actual} == ${expected}`)
    }
    record('count_sessoes_aula', Number(counts.sessoes_aula) === expectedAulas, `${counts.sessoes_aula} == ${expectedAulas} (${TURMAS.length} turmas x ${schoolDays.length} dias)`)
    record('count_frequencia', Number(counts.frequencia) === expectedFrequencia, `${counts.frequencia} == ${expectedFrequencia} (${MATRICULAS.length} matriculas x ${schoolDays.length} dias)`)

    // ---------------------------------------------------------------------
    // 2. Relacionamentos
    // ---------------------------------------------------------------------
    const orphanTurma = await client.query(`
      SELECT count(*) AS n FROM turmas t LEFT JOIN escolas e ON e.id = t.escola_id WHERE e.id IS NULL
    `)
    record('rel_turma_escola', Number(orphanTurma.rows[0].n) === 0, `${orphanTurma.rows[0].n} turmas sem escola`)

    const schoolMismatch = await client.query(`
      SELECT count(*) AS n
      FROM matriculas m
      JOIN alunos a ON a.id = m.aluno_id
      JOIN turmas t ON t.id = m.turma_id
      WHERE a.escola_id IS DISTINCT FROM t.escola_id
    `)
    record('rel_aluno_escola_igual_turma', Number(schoolMismatch.rows[0].n) === 0, `${schoolMismatch.rows[0].n} alunos em escola divergente da turma`)

    const multipleEnrollments = await client.query(`
      SELECT count(*) AS n FROM (
        SELECT aluno_id FROM matriculas GROUP BY aluno_id HAVING count(*) <> 1
      ) x
    `)
    record('rel_um_aluno_uma_matricula', Number(multipleEnrollments.rows[0].n) === 0, `${multipleEnrollments.rows[0].n} alunos com != 1 matricula`)

    const frequenciaOrphan = await client.query(`
      SELECT count(*) AS n FROM frequencia f
      LEFT JOIN matriculas m ON m.id = f.matricula_id
      LEFT JOIN sessoes_aula s ON s.id = f.sessao_id
      WHERE m.id IS NULL OR s.id IS NULL
    `)
    record('rel_frequencia_vinculos', Number(frequenciaOrphan.rows[0].n) === 0, `${frequenciaOrphan.rows[0].n} frequencias sem matricula/sessao`)

    const frequenciaAulaTurmaMismatch = await client.query(`
      SELECT count(*) AS n
      FROM frequencia f
      JOIN matriculas m ON m.id = f.matricula_id
      JOIN sessoes_aula s ON s.id = f.sessao_id
      WHERE s.turma_id <> m.turma_id OR s.data_aula <> f.data_aula
    `)
    record('rel_frequencia_sessao_da_turma', Number(frequenciaAulaTurmaMismatch.rows[0].n) === 0, `${frequenciaAulaTurmaMismatch.rows[0].n} frequencias em sessão de outra turma/data`)

    const perMatriculaCoverage = await client.query(`
      SELECT count(*) AS n FROM (
        SELECT m.id
        FROM matriculas m
        LEFT JOIN frequencia f ON f.matricula_id = m.id
        GROUP BY m.id
        HAVING count(f.id) <> $1
      ) x
    `, [schoolDays.length])
    record('rel_cobertura_frequencia', Number(perMatriculaCoverage.rows[0].n) === 0, `${perMatriculaCoverage.rows[0].n} matriculas sem ${schoolDays.length} registros de frequencia`)

    const vinculoOrphan = await client.query(`
      SELECT count(*) AS n FROM aluno_responsaveis ar
      LEFT JOIN alunos a ON a.id = ar.aluno_id
      LEFT JOIN responsaveis r ON r.id = ar.responsavel_id
      WHERE a.id IS NULL OR r.id IS NULL
    `)
    record('rel_aluno_responsavel', Number(vinculoOrphan.rows[0].n) === 0, `${vinculoOrphan.rows[0].n} vinculos orfaos`)

    // ---------------------------------------------------------------------
    // 3. Marcadores synthetic-only
    // ---------------------------------------------------------------------
    const badContactDomains = await client.query(`
      SELECT
        (SELECT count(*) FROM users WHERE email NOT LIKE '%@educa.app.br') AS users_email,
        (SELECT count(*) FROM responsaveis WHERE email NOT LIKE '%@example.com') AS guardian_email,
        (SELECT count(*) FROM responsaveis WHERE email LIKE '%@email.com') AS legacy_email
    `)
    const domains = badContactDomains.rows[0] as Record<string, number>
    record('synthetic_users_email', Number(domains.users_email) === 0, `${domains.users_email} users fora de @educa.app.br`)
    record('synthetic_guardian_email', Number(domains.guardian_email) === 0, `${domains.guardian_email} responsaveis fora de @example.com`)
    record('synthetic_legacy_email', Number(domains.legacy_email) === 0, `${domains.legacy_email} emails @email.com remanescentes`)

    // ---------------------------------------------------------------------
    // 4. Caso de alerta Bolsa Familia (< 80%)
    // ---------------------------------------------------------------------
    const alertCase = await client.query(`
      SELECT m.id AS matricula_id,
             round(100.0 * count(*) FILTER (WHERE f.presente) / count(*), 2) AS percentual
      FROM matriculas m
      JOIN alunos a ON a.id = m.aluno_id
      JOIN frequencia f ON f.matricula_id = m.id
      WHERE a.bolsa_familia = true
      GROUP BY m.id
      HAVING 100.0 * count(*) FILTER (WHERE f.presente) / count(*) < $1
      ORDER BY percentual
      LIMIT 5
    `, [ALERT_THRESHOLD])
    record(
      'alerta_bolsa_familia',
      alertCase.rows.length >= 1,
      alertCase.rows.length >= 1
        ? `${alertCase.rows.length} caso(s) synthetic de frequencia abaixo de ${ALERT_THRESHOLD}%`
        : `nenhum caso synthetic abaixo de ${ALERT_THRESHOLD}%`
    )
    const alertIsDesignated = alertCase.rows.some(r => r.matricula_id === LOW_ATTENDANCE_MATRICULA_ID)
    record('alerta_caso_designado', alertIsDesignated, alertIsDesignated ? 'caso de alerta designado presente' : 'caso de alerta designado ausente')

    // ---------------------------------------------------------------------
    // 5. Determinismo: presenca por aluno == gerador para a ancora registrada
    // ---------------------------------------------------------------------
    const dbAttendance = await client.query(`
      SELECT matricula_id,
             count(*) FILTER (WHERE presente) AS presencas,
             count(*) AS total
      FROM frequencia
      GROUP BY matricula_id
      ORDER BY matricula_id
    `)
    let attendanceMismatches = 0
    for (const row of dbAttendance.rows as Array<{ matricula_id: string; presencas: string; total: string }>) {
      let expectedPresent = 0
      schoolDays.forEach((day, dayIndex) => {
        if (isPresentOn(row.matricula_id, day, dayIndex)) expectedPresent += 1
      })
      if (Number(row.presencas) !== expectedPresent) attendanceMismatches += 1
    }
    record('determinismo_presenca_por_aluno', attendanceMismatches === 0, `${attendanceMismatches} matriculas com presenca divergente do gerador`)

    // Fingerprints (order-independent md5 over the business columns). Two
    // resets with the same anchor produce identical fingerprints. Auth creates
    // a new external id for the demo user, so that non-business id is excluded.
    const fingerprintTables = ['escolas', 'users', 'turmas', 'matriculas', 'sessoes_aula', 'frequencia']
    const fingerprints: Record<string, string> = {}
    for (const table of fingerprintTables) {
      const fingerprintValue = table === 'users' ? "(to_jsonb(t) - 'id')::text" : 't::text'
      const fp = await client.query(
        `SELECT md5(string_agg(t.line, '|' ORDER BY t.line)) AS fp FROM (
           SELECT md5(${fingerprintValue}) AS line FROM ${table} t
         ) t`
      )
      fingerprints[table] = (fp.rows[0]?.fp as string) ?? '(vazio)'
    }

    // ---------------------------------------------------------------------
    // 6. Usuario de auth (opcional - requer API URL + key)
    // ---------------------------------------------------------------------
    phase = 'auth_check'
    let authOk: boolean | null = null
    let authDetail = 'pulado: credenciais de Auth nao configuradas'
    if (API_URL && API_KEY) {
      const supabase = createClient(API_URL, API_KEY, { auth: { autoRefreshToken: false, persistSession: false } })
      const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 })
      const demo = (data?.users ?? []).find(u => u.email?.toLowerCase() === 'demo@educa.app.br')
      authOk = !error && !!demo
      authDetail = authOk ? 'usuario demo de Auth presente' : 'usuario demo ausente ou Auth indisponivel'
    }
    if (authOk !== null) record('auth_demo_user', authOk, authDetail)

    // ---------------------------------------------------------------------
    // Relatorio
    // ---------------------------------------------------------------------
    const failed = checks.filter(c => !c.ok)
    console.log('')
    console.log('='.repeat(64))
    console.log('  EDUCA - Validacao do sandbox publico (issue #23)')
    console.log('='.repeat(64))
    console.log(`  Anchor date:  ${anchorDate} (${schoolDays.length} dias letivos)`)
    console.log(`  Frequencia:   ${counts.frequencia} registros | Sessoes: ${counts.sessoes_aula}`)
    console.log('')
    for (const c of checks) {
      console.log(`  [${c.ok ? 'PASS' : 'FAIL'}] ${c.name}: ${c.detail}`)
    }
    console.log('')
    console.log('  Fingerprints md5 (resets com a mesma ancora sao identicos):')
    for (const table of fingerprintTables) {
      console.log(`    ${table.padEnd(16)} ${fingerprints[table]}`)
    }
    console.log('')
    if (failed.length > 0) {
      console.error(`VALIDACAO FALHOU: ${failed.length} checagem(ns)`)
      process.exit(1)
    }
    console.log('VALIDACAO OK - dataset determinístico e synthetic-only conforme o contrato.')
  } catch {
    console.error(`DEMO_VALIDATE_FAILED: phase=${phase}`)
    process.exit(1)
  } finally {
    await client.end().catch(() => undefined)
  }
}

run()
