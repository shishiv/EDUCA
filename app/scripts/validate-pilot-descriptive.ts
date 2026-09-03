#!/usr/bin/env tsx
/**
 * Independently validates the bounded descriptive-report rehearsal against the
 * real isolated PostgreSQL database and emits durable provenance receipts.
 */
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { Client } from 'pg'
import { assertPilotDescriptiveReportDemoSafety } from '../lib/pilot/descriptive-report-demo-safety'
import {
  PILOT_DESCRIPTIVE_CANONICAL_SOURCE,
  PILOT_DESCRIPTIVE_CANONICAL_SOURCE_CONFIG_KEY,
  PILOT_DESCRIPTIVE_ENVIRONMENT_CONFIG_KEY,
  PILOT_DESCRIPTIVE_EXPECTED_ISSUER,
  PILOT_DESCRIPTIVE_EXPECTED_REPORT_PERIOD,
  PILOT_DESCRIPTIVE_EXPECTED_SCOPE,
  PILOT_DESCRIPTIVE_FINGERPRINT_ALGORITHM,
  PILOT_DESCRIPTIVE_NON_LEGAL_BOUNDARY,
  PILOT_DESCRIPTIVE_REHEARSAL_ENVIRONMENT,
  PILOT_DESCRIPTIVE_RELEASE_REVISION_CONFIG_KEY,
  PILOT_DESCRIPTIVE_REPORT_ID,
  PILOT_DESCRIPTIVE_SCHOOL_ID,
  PILOT_DESCRIPTIVE_SEED_MARKER,
  PILOT_DESCRIPTIVE_SEED_MARKER_CONFIG_KEY,
  PILOT_DESCRIPTIVE_STUDENT_ID,
  PILOT_DESCRIPTIVE_CLASS_ID,
  PILOT_DESCRIPTIVE_ENROLLMENT_ID,
  PILOT_DESCRIPTIVE_EXPECTED_COUNTS,
  PILOT_DESCRIPTIVE_EXPECTED_FINGERPRINTS,
  PILOT_DESCRIPTIVE_MARKER_CONFIG_ID,
  requirePilotDescriptiveReleaseRevision,
} from '../../supabase/seed-pilot-descriptive/pilot-descriptive-contract'

assertPilotDescriptiveReportDemoSafety()

const SUPABASE_DB_URL = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL || ''
const RELEASE_REVISION = requirePilotDescriptiveReleaseRevision()

interface PilotDescriptiveCheck {
  name: string
  ok: boolean
  detail: string
}

const checks: PilotDescriptiveCheck[] = []

function recordPilotDescriptiveCheck(name: string, ok: boolean, detail: string): void {
  checks.push({ name, ok, detail })
}

function asNumber(value: unknown): number {
  return Number(value)
}

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? value as Record<string, unknown> : {}
}

function normalizeReceipt(receipt: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(receipt).map(([key, value]) => [
      key,
      typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : value,
    ])
  )
}

async function writePilotDescriptiveValidationReceipt(
  actual: Record<string, unknown>
): Promise<void> {
  const evidenceDirectory = path.join(process.cwd(), '.pilot-evidence')
  await mkdir(evidenceDirectory, { recursive: true })
  await writeFile(
    path.join(evidenceDirectory, 'descriptive-report-validation.json'),
    `${JSON.stringify({
      status: checks.some(check => !check.ok) ? 'FAIL' : 'PASS',
      releaseRevision: RELEASE_REVISION,
      environment: PILOT_DESCRIPTIVE_REHEARSAL_ENVIRONMENT,
      boundedScope: {
        schoolId: PILOT_DESCRIPTIVE_SCHOOL_ID,
        classId: PILOT_DESCRIPTIVE_CLASS_ID,
        studentId: PILOT_DESCRIPTIVE_STUDENT_ID,
      },
      reportingPeriod: PILOT_DESCRIPTIVE_EXPECTED_REPORT_PERIOD,
      canonicalSource: PILOT_DESCRIPTIVE_CANONICAL_SOURCE,
      fingerprintAlgorithm: PILOT_DESCRIPTIVE_FINGERPRINT_ALGORITHM,
      nonLegalBoundary: PILOT_DESCRIPTIVE_NON_LEGAL_BOUNDARY,
      expected: {
        counts: PILOT_DESCRIPTIVE_EXPECTED_COUNTS,
        canonicalContentFingerprint: PILOT_DESCRIPTIVE_EXPECTED_FINGERPRINTS.canonicalContent,
      },
      actual,
      checks,
    }, null, 2)}\n`,
    'utf8'
  )
}

function recordCountChecks(actual: Record<string, unknown>): void {
  const expectedCounts: Record<string, number> = {
    schools: PILOT_DESCRIPTIVE_EXPECTED_COUNTS.schools,
    classes: PILOT_DESCRIPTIVE_EXPECTED_COUNTS.classes,
    students: PILOT_DESCRIPTIVE_EXPECTED_COUNTS.students,
    enrollments: PILOT_DESCRIPTIVE_EXPECTED_COUNTS.enrollments,
    reports: PILOT_DESCRIPTIVE_EXPECTED_COUNTS.reports,
    sessions: PILOT_DESCRIPTIVE_EXPECTED_COUNTS.sessions,
    canonical_content: PILOT_DESCRIPTIVE_EXPECTED_COUNTS.canonicalContent,
  }

  for (const [name, expectedCount] of Object.entries(expectedCounts)) {
    const count = asNumber(actual[name])
    recordPilotDescriptiveCheck(`count_${name}`, count === expectedCount, `${count} == ${expectedCount}`)
  }
}

function recordContractChecks(actual: Record<string, unknown>): void {
  recordPilotDescriptiveCheck(
    'marker_synthetic',
    actual.marker === PILOT_DESCRIPTIVE_SEED_MARKER,
    `${actual.marker ?? '(missing)'} == ${PILOT_DESCRIPTIVE_SEED_MARKER}`
  )
  recordPilotDescriptiveCheck(
    'release_revision',
    actual.release_revision === RELEASE_REVISION,
    `${actual.release_revision ?? '(missing)'} == ${RELEASE_REVISION}`
  )
  recordPilotDescriptiveCheck(
    'environment_local_synthetic',
    actual.rehearsal_environment === PILOT_DESCRIPTIVE_REHEARSAL_ENVIRONMENT,
    `${actual.rehearsal_environment ?? '(missing)'} == ${PILOT_DESCRIPTIVE_REHEARSAL_ENVIRONMENT}`
  )
  recordPilotDescriptiveCheck(
    'canonical_source',
    actual.canonical_source === PILOT_DESCRIPTIVE_CANONICAL_SOURCE,
    `${actual.canonical_source ?? '(missing)'} == ${PILOT_DESCRIPTIVE_CANONICAL_SOURCE}`
  )
  recordPilotDescriptiveCheck(
    'fingerprint_algorithm',
    PILOT_DESCRIPTIVE_FINGERPRINT_ALGORITHM === 'MD5',
    PILOT_DESCRIPTIVE_FINGERPRINT_ALGORITHM
  )
  recordPilotDescriptiveCheck(
    'fingerprint_canonical_content',
    actual.canonical_content_fingerprint === PILOT_DESCRIPTIVE_EXPECTED_FINGERPRINTS.canonicalContent,
    `${actual.canonical_content_fingerprint ?? '(missing)'} == ${PILOT_DESCRIPTIVE_EXPECTED_FINGERPRINTS.canonicalContent}`
  )
  recordPilotDescriptiveCheck(
    'fingerprint_descriptive_report',
    actual.descriptive_report_fingerprint === PILOT_DESCRIPTIVE_EXPECTED_FINGERPRINTS.descriptiveReport,
    `${actual.descriptive_report_fingerprint ?? '(missing)'} == ${PILOT_DESCRIPTIVE_EXPECTED_FINGERPRINTS.descriptiveReport}`
  )
}

function recordScopeChecks(actual: Record<string, unknown>): void {
  const schoolScope = asObject(actual.school_scope)
  recordPilotDescriptiveCheck(
    'scope_school',
    schoolScope.id === PILOT_DESCRIPTIVE_SCHOOL_ID && schoolScope.name === PILOT_DESCRIPTIVE_EXPECTED_SCOPE.schoolName,
    `${schoolScope.name ?? '(missing)'} / ${schoolScope.id ?? '(missing)'}`
  )
  const classScope = asObject(actual.class_scope)
  recordPilotDescriptiveCheck(
    'scope_class',
    classScope.id === PILOT_DESCRIPTIVE_CLASS_ID &&
      classScope.name === PILOT_DESCRIPTIVE_EXPECTED_SCOPE.className &&
      classScope.serie === PILOT_DESCRIPTIVE_EXPECTED_SCOPE.classSeries &&
      classScope.schoolId === PILOT_DESCRIPTIVE_SCHOOL_ID,
    `${classScope.name ?? '(missing)'} / ${classScope.id ?? '(missing)'}`
  )

  const reportingPeriod = asObject(actual.reporting_period)
  recordPilotDescriptiveCheck(
    'reporting_period',
    reportingPeriod.year === PILOT_DESCRIPTIVE_EXPECTED_REPORT_PERIOD.year &&
      reportingPeriod.semester === PILOT_DESCRIPTIVE_EXPECTED_REPORT_PERIOD.semester &&
      reportingPeriod.start === PILOT_DESCRIPTIVE_EXPECTED_REPORT_PERIOD.start &&
      reportingPeriod.end === PILOT_DESCRIPTIVE_EXPECTED_REPORT_PERIOD.end,
    JSON.stringify(reportingPeriod)
  )

  const issuer = asObject(actual.issuer_context)
  recordPilotDescriptiveCheck(
    'issuer_authenticated_synthetic',
    issuer.reportId === PILOT_DESCRIPTIVE_REPORT_ID &&
      issuer.actorId === issuer.reportProfessorId &&
      issuer.name === PILOT_DESCRIPTIVE_EXPECTED_ISSUER.name &&
      issuer.email === PILOT_DESCRIPTIVE_EXPECTED_ISSUER.email &&
      issuer.authEmail === PILOT_DESCRIPTIVE_EXPECTED_ISSUER.email &&
      issuer.role === PILOT_DESCRIPTIVE_EXPECTED_ISSUER.role,
    JSON.stringify(issuer)
  )
}

async function validatePilotDescriptive(): Promise<void> {
  if (!SUPABASE_DB_URL) {
    throw new Error('PILOT_DESCRIPTIVE_VALIDATE_DB_URL_REQUIRED: SUPABASE_DB_URL or DATABASE_URL is required')
  }

  const client = new Client({ connectionString: SUPABASE_DB_URL })
  await client.connect()

  try {
    const { rows } = await client.query(
      `SELECT
        (SELECT count(*) FROM public.escolas WHERE id = $1) AS schools,
        (SELECT count(*) FROM public.turmas WHERE id = $2) AS classes,
        (SELECT count(*) FROM public.alunos WHERE id = $3) AS students,
        (SELECT count(*) FROM public.matriculas WHERE id = $4) AS enrollments,
        (SELECT count(*) FROM public.relatorios_descritivos WHERE id = $5 AND status = 'finalizado') AS reports,
        (SELECT count(*) FROM public.sessoes_aula
          WHERE turma_id = $2 AND data_aula >= $11::date AND data_aula <= $12::date) AS sessions,
        (SELECT count(*) FROM public.conteudo_aula c
          JOIN public.sessoes_aula s ON s.id = c.sessao_id
          WHERE s.turma_id = $2 AND s.data_aula >= $11::date AND s.data_aula <= $12::date) AS canonical_content,
        (SELECT valor FROM public.configs WHERE id = $6 AND chave = $7) AS marker,
        (SELECT valor FROM public.configs WHERE chave = $8) AS release_revision,
        (SELECT valor FROM public.configs WHERE chave = $9) AS rehearsal_environment,
        (SELECT valor FROM public.configs WHERE chave = $10) AS canonical_source,
        (SELECT md5(string_agg(line, '|' ORDER BY line)) FROM (
          SELECT concat_ws('|', c.id::text, c.sessao_id::text, s.data_aula::text, c.tema, c.objetivo,
            array_to_string(c.habilidades_bncc, ','), COALESCE(c.metodologia, ''),
            COALESCE(c.recursos, ''), COALESCE(c.observacoes, '')) AS line
          FROM public.conteudo_aula c
          JOIN public.sessoes_aula s ON s.id = c.sessao_id
          WHERE s.turma_id = $2 AND s.data_aula >= $11::date AND s.data_aula <= $12::date
        ) canonical_rows) AS canonical_content_fingerprint,
        (SELECT md5(string_agg(line, '|' ORDER BY line)) FROM (
          SELECT concat_ws('|', r.id::text, r.matricula_id::text, r.turma_id::text, r.status, r.ano_letivo::text, r.semestre) AS line
          FROM public.relatorios_descritivos r WHERE r.id = $5
        ) report_rows) AS descriptive_report_fingerprint,
        (SELECT json_build_object('id', school.id, 'name', school.nome, 'code', school.codigo)
          FROM public.escolas school WHERE school.id = $1) AS school_scope,
        (SELECT json_build_object('id', class.id, 'name', class.nome, 'serie', class.serie, 'schoolId', class.escola_id)
          FROM public.turmas class WHERE class.id = $2) AS class_scope,
        (SELECT json_build_object(
          'year', report.ano_letivo,
          'semester', report.semestre,
          'start', $11::text,
          'end', $12::text
        ) FROM public.relatorios_descritivos report WHERE report.id = $5) AS reporting_period,
        (SELECT json_build_object(
          'reportId', report.id,
          'reportProfessorId', report.professor_id,
          'actorId', profile.id,
          'name', profile.nome,
          'email', profile.email,
          'role', profile.tipo_usuario,
          'authEmail', auth_user.email
        )
          FROM public.relatorios_descritivos report
          JOIN public.users profile ON profile.id = report.professor_id
          LEFT JOIN auth.users auth_user ON auth_user.id = report.professor_id
          WHERE report.id = $5) AS issuer_context`,
      [
        PILOT_DESCRIPTIVE_SCHOOL_ID,
        PILOT_DESCRIPTIVE_CLASS_ID,
        PILOT_DESCRIPTIVE_STUDENT_ID,
        PILOT_DESCRIPTIVE_ENROLLMENT_ID,
        PILOT_DESCRIPTIVE_REPORT_ID,
        PILOT_DESCRIPTIVE_MARKER_CONFIG_ID,
        PILOT_DESCRIPTIVE_SEED_MARKER_CONFIG_KEY,
        PILOT_DESCRIPTIVE_RELEASE_REVISION_CONFIG_KEY,
        PILOT_DESCRIPTIVE_ENVIRONMENT_CONFIG_KEY,
        PILOT_DESCRIPTIVE_CANONICAL_SOURCE_CONFIG_KEY,
        PILOT_DESCRIPTIVE_EXPECTED_REPORT_PERIOD.start,
        PILOT_DESCRIPTIVE_EXPECTED_REPORT_PERIOD.end,
      ]
    )

    const actual = normalizeReceipt((rows[0] ?? {}) as Record<string, unknown>)
    recordCountChecks(actual)
    recordContractChecks(actual)
    recordScopeChecks(actual)

    console.info(`PILOT_DESCRIPTIVE_VALIDATION_RECEIPT: ${JSON.stringify(actual)}`)
    for (const check of checks) {
      console.info(`  [${check.ok ? 'PASS' : 'FAIL'}] ${check.name}: ${check.detail}`)
    }

    await writePilotDescriptiveValidationReceipt(actual)

    const failed = checks.filter(check => !check.ok)
    if (failed.length > 0) {
      throw new Error(`PILOT_DESCRIPTIVE_VALIDATION_FAILED: ${failed.length} checks failed`)
    }
  } finally {
    await client.end()
  }
}

if (require.main === module) {
  validatePilotDescriptive().catch(error => {
    console.error(error instanceof Error ? error.message : error)
    process.exit(1)
  })
}
