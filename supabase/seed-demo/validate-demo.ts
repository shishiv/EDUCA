#!/usr/bin/env tsx
/**
 * validate-demo.ts
 *
 * Validacao do sandbox publico do EDUCA (issue #23). Prova, com consultas
 * contra o proprio banco do demo:
 *
 *  1. Contagens do contrato: 3 escolas, 5 turmas, 10 professores + 1 admin,
 *     50 alunos, 50 responsaveis, 50 vinculos, 50 matriculas, 300 notas,
 *     15 eventos de calendario, 13 configs, e a frequencia/aulas/conteudos
 *     gerados para a janela ancorada (20 dias letivos).
 *  2. Contrato descritivo: cada sessao fechada tem um conteudo completo,
 *     distribuido nas cinco disciplinas e conferido por fingerprint fixo.
 *  3. Fonte de certificado: um emissor institucional, uma atividade, sessoes
 *     fechadas, presenca P, carga derivada, fingerprint e hash verificavel.
 *  4. Relacionamentos: integridade referencial e consistencia escola -> turma
 *     -> matricula -> frequencia; cada aluno em exatamente uma turma da sua
 *     escola; frequencia sempre vinculada a uma aula da turma certa.
 *  5. Marcadores synthetic-only: configs.demo_synthetic_marker =
 *     'SYNTHETIC-EDUCA-DEMO'; dominios de contato reservados; identidades
 *     fake.
 *  6. Caso de alerta: existe aluno com bolsa_familia=true e frequencia
 *     < 80% (matricula 401, receita issue #23 e app BOLSA_FAMILIA_THRESHOLD).
 *  7. Determinismo/repetibilidade: as contagens e a presenca por aluno
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
import type { Client as PgClient, ClientConfig, QueryResultRow } from 'pg'
import type { Database } from '../../app/types/database'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const requireFromApp = createRequire(join(__dirname, '..', '..', 'app', 'package.json'))
const pgRuntime: { readonly Client: new (opts?: ClientConfig) => PgClient } = requireFromApp('pg')
const supabaseRuntime: Pick<typeof import('@supabase/supabase-js'), 'createClient'> = requireFromApp('@supabase/supabase-js')
const { Client } = pgRuntime
const { createClient } = supabaseRuntime
import {
  MATRICULAS,
  TURMAS,
  schoolDaysEndingOn,
  DEMO_SCHOOL_DAYS,
  isPresentOn,
  LOW_ATTENDANCE_MATRICULA_ID,
} from './attendance-generator'
import {
  DEMO_CERTIFICATE_ACTIVITY_ID,
  DEMO_CERTIFICATE_EMITTER_ID,
  DEMO_CERTIFICATE_ISSUANCE_ID,
  DEMO_CERTIFICATE_MATRICULA_ID,
} from './certificate-generator'

const DB_URL = process.env.SUPABASE_DEMO_DB_URL || ''
const API_URL = process.env.SUPABASE_DEMO_URL || ''
const API_KEY = process.env.SUPABASE_DEMO_SERVICE_KEY || ''

// Receipts from the static seed (supabase/seed-demo/seed-demo.sql).
const STATIC_COUNTS = {
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
  configs: 13, // 8 configs + 3 marcadores + âncora + faixas gerais persistidas
  certificado_emissores: 1,
  certificado_atividades: 1,
  certificados_emitidos: 1,
}

const EXPECTED_SYNTHETIC_MARKER = 'SYNTHETIC-EDUCA-DEMO'

// Receipt for the five canonical disciplines used by the generated sessions.
// Each discipline owns one seeded turma and therefore one content row per day.
const EXPECTED_CONTENT_DISCIPLINES = [
  '00000000-0000-0000-0000-000000000600',
  '00000000-0000-0000-0000-000000000601',
  '00000000-0000-0000-0000-000000000602',
  '00000000-0000-0000-0000-000000000608',
  '00000000-0000-0000-0000-000000000612',
] as const

// Fixed-content receipt excludes the moving lesson date and created_at fields.
// It catches template drift while the full table fingerprint remains anchor-specific.
const EXPECTED_CONTENT_FINGERPRINT = '888045b03e3eae986b28d6ffc3eb630c'

interface CheckResult {
  name: string
  ok: boolean
  detail: string
}

interface ConfigValueRow extends QueryResultRow {
  readonly valor: string | null
}

interface DemoCountsRow extends QueryResultRow {
  readonly escolas: string
  readonly users: string
  readonly turmas: string
  readonly disciplinas: string
  readonly responsaveis: string
  readonly alunos: string
  readonly aluno_responsaveis: string
  readonly matriculas: string
  readonly notas: string
  readonly calendario_escolar: string
  readonly configs: string
  readonly sessoes_aula: string
  readonly conteudo_aula: string
  readonly frequencia: string
  readonly certificado_emissores: string
  readonly certificado_atividades: string
  readonly certificado_atividade_sessoes: string
  readonly certificados_emitidos: string
}

interface ContentContractRow extends QueryResultRow {
  readonly total: string
  readonly complete: string
  readonly closed: string
}

interface ContentDisciplineRow extends QueryResultRow {
  readonly disciplina_id: string
  readonly content_count: string
}

interface FingerprintRow extends QueryResultRow {
  readonly fingerprint: string | null
}

interface CertificateSessionsRow extends QueryResultRow {
  readonly activity_sessions: string
  readonly qualifying_attendance: string
}

interface CertificateRow extends QueryResultRow {
  readonly demo_identity: string
  readonly unverifiable: string
  readonly source_faults: string
  readonly hash_faults: string
}

interface DomainsRow extends QueryResultRow {
  readonly users_email: string
  readonly guardian_email: string
  readonly legacy_email: string
}

interface AttendanceRow extends QueryResultRow {
  readonly matricula_id: string
  readonly presencas: string
  readonly total: string
}

interface TableFingerprintRow extends QueryResultRow {
  readonly fp: string | null
}

function firstRow<Row extends QueryResultRow>(rows: Row[], queryName: string): Row {
  const row = rows[0]
  if (!row) throw new Error(`DEMO_VALIDATE_ROW_MISSING:${queryName}`)
  return row
}

const checks: CheckResult[] = []

function record(name: string, ok: boolean, detail: string): void {
  checks.push({ name, ok, detail })
}

async function recordAnchorAndCounts(client: PgClient): Promise<{ anchorDate: string; schoolDays: string[]; counts: DemoCountsRow }> {
  // ---------------------------------------------------------------------
  // 0. Marcador e ancora
  // ---------------------------------------------------------------------
  const marker = await client.query<ConfigValueRow>(
    `SELECT valor FROM configs WHERE chave = 'demo_synthetic_marker'`
  )
  const anchor = await client.query<ConfigValueRow>(
    `SELECT valor FROM configs WHERE chave = 'demo_seed_anchor_date'`
  )
  const markerValue = marker.rows[0]?.valor ?? null
  const anchorDate = anchor.rows[0]?.valor ?? null
  record(
    'marker_synthetic',
    markerValue === EXPECTED_SYNTHETIC_MARKER,
    markerValue === EXPECTED_SYNTHETIC_MARKER ? 'marcador synthetic esperado presente' : 'marcador synthetic ausente ou divergente'
  )
  record('marker_anchor', anchorDate !== null && /^\d{4}-\d{2}-\d{2}$/.test(anchorDate), `demo_seed_anchor_date = ${anchorDate ?? '(ausente)'}`)
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
      (SELECT count(*) FROM conteudo_aula) AS conteudo_aula,
      (SELECT count(*) FROM frequencia) AS frequencia,
      (SELECT count(*) FROM certificado_emissores) AS certificado_emissores,
      (SELECT count(*) FROM certificado_atividades) AS certificado_atividades,
      (SELECT count(*) FROM certificado_atividade_sessoes) AS certificado_atividade_sessoes,
      (SELECT count(*) FROM certificados_emitidos) AS certificados_emitidos
  `
  const counts = firstRow((await client.query<DemoCountsRow>(countQuery)).rows, 'counts')
  for (const [table, expected] of Object.entries(STATIC_COUNTS)) {
    const actual = Number(counts[table])
    record(`count_${table}`, actual === expected, `${actual} == ${expected}`)
  }
  record('count_sessoes_aula', Number(counts.sessoes_aula) === expectedAulas, `${counts.sessoes_aula} == ${expectedAulas} (${TURMAS.length} turmas x ${schoolDays.length} dias)`)
  record('count_conteudo_aula', Number(counts.conteudo_aula) === expectedAulas, `${counts.conteudo_aula} == ${expectedAulas} (uma fonte canonica por sessao)`)
  record('count_frequencia', Number(counts.frequencia) === expectedFrequencia, `${counts.frequencia} == ${expectedFrequencia} (${MATRICULAS.length} matriculas x ${schoolDays.length} dias)`)

  return { anchorDate, schoolDays, counts }
}

async function recordContentContract(client: PgClient, schoolDays: string[], expectedAulas: number): Promise<void> {
  const contentContract = await client.query<ContentContractRow>(`
    SELECT
      count(*)::bigint AS total,
      count(*) FILTER (
        WHERE trim(c.tema) <> ''
          AND trim(c.objetivo) <> ''
          AND cardinality(c.habilidades_bncc) > 0
          AND coalesce(trim(c.metodologia), '') <> ''
          AND coalesce(trim(c.recursos), '') <> ''
          AND c.created_by IS NOT NULL
      )::bigint AS complete,
      count(*) FILTER (
        WHERE s.status = 'FECHADA'
          AND s.fechada_em IS NOT NULL
          AND s.travada_em IS NOT NULL
      )::bigint AS closed
    FROM conteudo_aula c
    JOIN sessoes_aula s ON s.id = c.sessao_id
  `)
  const contentContractRow = firstRow(contentContract.rows, 'content_contract')
  record(
    'content_descriptive_contract',
    Number(contentContractRow.total) === expectedAulas
      && Number(contentContractRow.complete) === expectedAulas
      && Number(contentContractRow.closed) === expectedAulas,
    `${contentContractRow.complete}/${contentContractRow.total} conteudos completos em sessoes fechadas (${contentContractRow.closed})`
  )

  const contentByDiscipline = await client.query<ContentDisciplineRow>(`
    SELECT s.disciplina_id, count(*)::bigint AS content_count
    FROM conteudo_aula c
    JOIN sessoes_aula s ON s.id = c.sessao_id
    GROUP BY s.disciplina_id
    ORDER BY s.disciplina_id
  `)
  const disciplineCounts = new Map(
    contentByDiscipline.rows.map(row => [
      row.disciplina_id,
      Number(row.content_count),
    ])
  )
  const contentPerDisciplineOk = EXPECTED_CONTENT_DISCIPLINES.every(
    disciplineId => disciplineCounts.get(disciplineId) === schoolDays.length
  ) && disciplineCounts.size === EXPECTED_CONTENT_DISCIPLINES.length
  record(
    'content_por_disciplina',
    contentPerDisciplineOk,
    EXPECTED_CONTENT_DISCIPLINES.map(disciplineId => `${disciplineId.slice(-3)}=${disciplineCounts.get(disciplineId) ?? 0}`).join(', ')
  )

  const contentFingerprintResult = await client.query<FingerprintRow>(`
    SELECT md5(string_agg(row_hash, '|' ORDER BY row_hash)) AS fingerprint
    FROM (
      SELECT md5(concat_ws('|',
        c.id::text,
        c.sessao_id::text,
        s.disciplina_id::text,
        c.tema,
        c.objetivo,
        array_to_string(c.habilidades_bncc, ','),
        coalesce(c.metodologia, ''),
        coalesce(c.recursos, ''),
        coalesce(c.created_by::text, '')
      )) AS row_hash
      FROM conteudo_aula c
      JOIN sessoes_aula s ON s.id = c.sessao_id
    ) content_rows
  `)
  const contentFingerprint = contentFingerprintResult.rows[0]?.fingerprint ?? null
  record(
    'fingerprint_conteudo_contrato',
    contentFingerprint === EXPECTED_CONTENT_FINGERPRINT,
    `${contentFingerprint ?? '(vazio)'} == ${EXPECTED_CONTENT_FINGERPRINT}`
  )

  const certificateSessionCount = await client.query<CertificateSessionsRow>(`
    SELECT
      (SELECT count(*) FROM certificado_atividade_sessoes) AS activity_sessions,
      (SELECT count(*) FROM frequencia
       WHERE matricula_id = $1 AND status_presenca = 'P') AS qualifying_attendance
  `, [DEMO_CERTIFICATE_MATRICULA_ID])
  const certificateSessions = firstRow(certificateSessionCount.rows, 'certificate_session_count')
  record(
    'count_certificado_atividade_sessoes',
    Number(certificateSessions.activity_sessions) === Number(certificateSessions.qualifying_attendance),
    `${certificateSessions.activity_sessions} sessoes certificadas == ${certificateSessions.qualifying_attendance} presencas P da matricula demo`
  )
}

async function recordRelationshipChecks(client: PgClient, schoolDays: string[]): Promise<void> {
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

  const contentOrphan = await client.query(`
    SELECT count(*) AS n
    FROM conteudo_aula c
    LEFT JOIN sessoes_aula s ON s.id = c.sessao_id
    LEFT JOIN turmas t ON t.id = s.turma_id
    LEFT JOIN escolas e ON e.id = t.escola_id
    LEFT JOIN users u ON u.id = s.professor_id
    LEFT JOIN disciplinas d ON d.id = s.disciplina_id
    WHERE s.id IS NULL OR t.id IS NULL OR e.id IS NULL OR u.id IS NULL OR d.id IS NULL
  `)
  record('rel_conteudo_fonte_canonica', Number(contentOrphan.rows[0].n) === 0, `${contentOrphan.rows[0].n} conteudos sem sessao/turma/escola/professor/disciplina`)

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

  const certificateSource = await client.query<CertificateRow>(`
    SELECT
      (SELECT count(*)
       FROM certificados_emitidos c
       WHERE c.id = $1
         AND c.atividade_id = $2
         AND c.emissor_id = $3
         AND c.matricula_id = $4) AS demo_identity,
      (SELECT count(*)
       FROM certificados_emitidos c
       WHERE NOT public.certificado_verificar_fonte(c.id)) AS unverifiable,
      (SELECT count(*)
       FROM certificados_emitidos c
       JOIN certificado_atividades a ON a.id = c.atividade_id
       JOIN certificado_emissores e ON e.id = c.emissor_id
       JOIN matriculas m ON m.id = c.matricula_id
       JOIN turmas t ON t.id = a.turma_id
       CROSS JOIN LATERAL (
         SELECT
           count(*)::bigint AS session_count,
           coalesce(sum(s.duracao_minutos), 0)::bigint AS workload_minutes,
           count(f.id) FILTER (WHERE f.status_presenca = 'P')::bigint AS attendance_count
         FROM certificado_atividade_sessoes cas
         JOIN sessoes_aula s ON s.id = cas.sessao_id
         LEFT JOIN frequencia f ON f.sessao_id = s.id AND f.matricula_id = c.matricula_id
         WHERE cas.atividade_id = c.atividade_id
       ) source
       WHERE c.aluno_id <> m.aluno_id
          OR c.turma_id <> m.turma_id
          OR c.ano_letivo <> m.ano_letivo
          OR a.turma_id <> m.turma_id
          OR e.escola_id <> t.escola_id
          OR c.carga_horaria_comprovada_minutos <> source.workload_minutes
          OR c.sessoes_comprovadas <> source.session_count
          OR c.frequencias_comprovadas <> source.attendance_count) AS source_faults,
      (SELECT count(*)
       FROM certificados_emitidos c
       WHERE c.hash_verificacao_sha256 IS DISTINCT FROM encode(
         extensions.digest(c.codigo_verificacao || '|' || c.fonte_fingerprint_sha256, 'sha256'),
         'hex'
       )) AS hash_faults
  `, [
    DEMO_CERTIFICATE_ISSUANCE_ID,
    DEMO_CERTIFICATE_ACTIVITY_ID,
    DEMO_CERTIFICATE_EMITTER_ID,
    DEMO_CERTIFICATE_MATRICULA_ID,
  ])
  const certificate = firstRow(certificateSource.rows, 'certificate_source')
  record('rel_certificado_demo_identity', Number(certificate.demo_identity) === 1, `${certificate.demo_identity} emissao demo com ids sinteticos esperados`)
  record('rel_certificado_fonte_completa', Number(certificate.source_faults) === 0, `${certificate.source_faults} receipts de certificado divergentes da fonte canonica`)
  record('rel_certificado_verificavel', Number(certificate.unverifiable) === 0 && Number(certificate.hash_faults) === 0, `${certificate.unverifiable} fontes ou ${certificate.hash_faults} hashes de certificado invalidos`)
}

async function readDemoAlertThreshold(client: PgClient): Promise<number> {
  const result = await client.query<ConfigValueRow>("SELECT valor FROM configs WHERE chave = 'demo_alert_threshold' AND ativo = true")
  const threshold = Number(firstRow(result.rows, 'demo_alert_threshold').valor)
  if (!Number.isFinite(threshold) || threshold <= 0 || threshold > 100) throw new Error('DEMO_ALERT_THRESHOLD_INVALID')
  return threshold
}

async function recordSyntheticChecksAndFingerprints(client: PgClient, schoolDays: string[]): Promise<{ fingerprintTables: string[]; fingerprints: Map<string, string> }> {
  // ---------------------------------------------------------------------
  // 3. Marcadores synthetic-only
  // ---------------------------------------------------------------------
  const badContactDomains = await client.query<DomainsRow>(`
    SELECT
      (SELECT count(*) FROM users WHERE email NOT LIKE '%@educa.app.br') AS users_email,
      (SELECT count(*) FROM responsaveis WHERE email NOT LIKE '%@example.com') AS guardian_email,
      (SELECT count(*) FROM responsaveis WHERE email LIKE '%@email.com') AS legacy_email
  `)
  const domains = firstRow(badContactDomains.rows, 'bad_contact_domains')
  record('synthetic_users_email', Number(domains.users_email) === 0, `${domains.users_email} users fora de @educa.app.br`)
  record('synthetic_guardian_email', Number(domains.guardian_email) === 0, `${domains.guardian_email} responsaveis fora de @example.com`)
  record('synthetic_legacy_email', Number(domains.legacy_email) === 0, `${domains.legacy_email} emails @email.com remanescentes`)

  // ---------------------------------------------------------------------
  // 4. Caso de alerta Bolsa Familia (< 80%)
  // ---------------------------------------------------------------------
  const alertThreshold = await readDemoAlertThreshold(client)
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
  `, [alertThreshold])
  record(
    'alerta_bolsa_familia',
    alertCase.rows.length >= 1,
    alertCase.rows.length >= 1
      ? `${alertCase.rows.length} caso(s) synthetic de frequencia abaixo de ${alertThreshold}%`
      : `nenhum caso synthetic abaixo de ${alertThreshold}%`
  )
  const alertIsDesignated = alertCase.rows.some(r => r.matricula_id === LOW_ATTENDANCE_MATRICULA_ID)
  record('alerta_caso_designado', alertIsDesignated, alertIsDesignated ? 'caso de alerta designado presente' : 'caso de alerta designado ausente')

  // ---------------------------------------------------------------------
  // 5. Determinismo: presenca por aluno == gerador para a ancora registrada
  // ---------------------------------------------------------------------
  const dbAttendance = await client.query<AttendanceRow>(`
    SELECT matricula_id,
           count(*) FILTER (WHERE presente) AS presencas,
           count(*) AS total
    FROM frequencia
    GROUP BY matricula_id
    ORDER BY matricula_id
  `)
  let attendanceMismatches = 0
  for (const row of dbAttendance.rows) {
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
  const fingerprintTables = [
    'escolas',
    'users',
    'turmas',
    'matriculas',
    'sessoes_aula',
    'conteudo_aula',
    'frequencia',
    'certificado_emissores',
    'certificado_atividades',
    'certificado_atividade_sessoes',
    'certificados_emitidos',
  ]
  const fingerprints = new Map<string, string>()
  for (const table of fingerprintTables) {
    const fingerprintValue = table === 'users' ? "(to_jsonb(t) - 'id')::text" : 't::text'
    const fp = await client.query<TableFingerprintRow>(
      `SELECT md5(string_agg(t.line, '|' ORDER BY t.line)) AS fp FROM (
         SELECT md5(${fingerprintValue}) AS line FROM ${table} t
       ) t`
    )
    fingerprints.set(table, fp.rows[0]?.fp ?? '(vazio)')
  }

  return { fingerprintTables, fingerprints }
}

async function recordOptionalAuth(): Promise<void> {
  if (!API_URL || !API_KEY) return

  const supabase = createClient<Database>(API_URL, API_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { data, error } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  })
  const demo = (data?.users ?? []).find(
    user => user.email?.toLowerCase() === 'demo@educa.app.br'
  )
  const authOk = !error && !!demo
  record(
    'auth_demo_user',
    authOk,
    authOk
      ? 'usuario demo de Auth presente'
      : 'usuario demo ausente ou Auth indisponivel'
  )
}

interface ValidationReceipt {
  readonly anchorDate: string
  readonly schoolDays: string[]
  readonly counts: DemoCountsRow
  readonly fingerprintTables: string[]
  readonly fingerprints: Map<string, string>
}

type ValidationPhase = 'database_checks' | 'auth_check'

interface ValidationPhaseState {
  current: ValidationPhase
}

async function collectValidationReceipt(
  client: PgClient,
  phase: ValidationPhaseState
): Promise<ValidationReceipt> {
  const { anchorDate, schoolDays, counts } = await recordAnchorAndCounts(client)
  await recordContentContract(
    client,
    schoolDays,
    TURMAS.length * schoolDays.length
  )
  await recordRelationshipChecks(client, schoolDays)
  const { fingerprintTables, fingerprints } =
    await recordSyntheticChecksAndFingerprints(client, schoolDays)

  phase.current = 'auth_check'
  await recordOptionalAuth()

  return { anchorDate, schoolDays, counts, fingerprintTables, fingerprints }
}

function printValidationReport({
  anchorDate,
  schoolDays,
  counts,
  fingerprintTables,
  fingerprints,
}: ValidationReceipt): void {
  const failed = checks.filter(check => !check.ok)
  console.info('')
  console.info('='.repeat(64))
  console.info('  EDUCA - Validacao do sandbox publico (issue #23)')
  console.info('='.repeat(64))
  console.info(`  Anchor date:  ${anchorDate} (${schoolDays.length} dias letivos)`)
  console.info(
    `  Frequencia:   ${counts.frequencia} registros | Sessoes: ${counts.sessoes_aula}`
  )
  console.info(
    `  Certificados: ${counts.certificados_emitidos} emissao com fonte verificavel`
  )
  console.info('')
  for (const check of checks) {
    console.info(`  [${check.ok ? 'PASS' : 'FAIL'}] ${check.name}: ${check.detail}`)
  }
  console.info('')
  console.info('  Fingerprints md5 (resets com a mesma ancora sao identicos):')
  for (const table of fingerprintTables) {
    console.info(`    ${table.padEnd(16)} ${fingerprints.get(table)}`)
  }
  console.info('')
  if (failed.length > 0) {
    console.error(`VALIDACAO FALHOU: ${failed.length} checagem(ns)`)
    process.exit(1)
  }
  console.info(
    'VALIDACAO OK - dataset determinístico e synthetic-only conforme o contrato.'
  )
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

  const phase: ValidationPhaseState = { current: 'database_checks' }
  try {
    const receipt = await collectValidationReceipt(client, phase)
    printValidationReport(receipt)
  } catch {
    console.error(`DEMO_VALIDATE_FAILED: phase=${phase.current}`)
    process.exit(1)
  } finally {
    await client.end().catch(() => undefined)
  }
}

run()
