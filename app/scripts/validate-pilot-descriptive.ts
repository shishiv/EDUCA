#!/usr/bin/env tsx
/**
 * Independently validates the bounded descriptive-report rehearsal against the
 * real isolated PostgreSQL database and emits durable provenance receipts.
 */
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { Client } from 'pg'
import { z } from 'zod'
import { narrativeSnapshotSchema } from '../lib/reports/narrative-sources'
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

const countSchema = z.union([
  z.number().int().nonnegative(),
  z.string().regex(/^\d+$/).transform(Number),
])
const descriptiveReceiptSchema = z.object({
  schools: countSchema,
  classes: countSchema,
  students: countSchema,
  enrollments: countSchema,
  reports: countSchema,
  sessions: countSchema,
  canonical_content: countSchema,
  snapshot: narrativeSnapshotSchema,
  snapshot_fingerprint_valid: z.boolean(),
  snapshot_scope_valid: z.boolean(),
  marker: z.string().nullable(),
  release_revision: z.string().nullable(),
  rehearsal_environment: z.string().nullable(),
  canonical_source: z.string().nullable(),
  canonical_content_fingerprint: z.string().nullable(),
  descriptive_report_fingerprint: z.string().nullable(),
  school_scope: z.object({ id: z.string(), name: z.string(), code: z.string() }),
  class_scope: z.object({ id: z.string(), name: z.string(), serie: z.string(), schoolId: z.string() }),
  reporting_period: z.object({ year: z.number(), semester: z.string(), start: z.string(), end: z.string() }),
  issuer_context: z.object({
    reportId: z.string(), reportProfessorId: z.string(), actorId: z.string(),
    name: z.string(), email: z.string(), role: z.string(), authEmail: z.string(),
  }),
})
type DescriptiveReceipt = z.infer<typeof descriptiveReceiptSchema>

async function writePilotDescriptiveValidationReceipt(
  actual: DescriptiveReceipt
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
      fingerprintAlgorithm: actual.snapshot.algoritmo,
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

function recordCountChecks(actual: DescriptiveReceipt): void {
  const expectedCounts = {
    schools: PILOT_DESCRIPTIVE_EXPECTED_COUNTS.schools,
    classes: PILOT_DESCRIPTIVE_EXPECTED_COUNTS.classes,
    students: PILOT_DESCRIPTIVE_EXPECTED_COUNTS.students,
    enrollments: PILOT_DESCRIPTIVE_EXPECTED_COUNTS.enrollments,
    reports: PILOT_DESCRIPTIVE_EXPECTED_COUNTS.reports,
    sessions: PILOT_DESCRIPTIVE_EXPECTED_COUNTS.sessions,
    canonical_content: PILOT_DESCRIPTIVE_EXPECTED_COUNTS.canonicalContent,
  }

  const counts = new Map(Object.entries(actual))
  for (const [name, expectedCount] of Object.entries(expectedCounts)) {
    const count = counts.get(name)
    recordPilotDescriptiveCheck(`count_${name}`, count === expectedCount, `${count} == ${expectedCount}`)
  }
}

function recordContractChecks(actual: DescriptiveReceipt): void {
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

function recordScopeChecks(actual: DescriptiveReceipt): void {
  const schoolScope = actual.school_scope
  recordPilotDescriptiveCheck(
    'scope_school',
    schoolScope.id === PILOT_DESCRIPTIVE_SCHOOL_ID && schoolScope.name === PILOT_DESCRIPTIVE_EXPECTED_SCOPE.schoolName,
    `${schoolScope.name ?? '(missing)'} / ${schoolScope.id ?? '(missing)'}`
  )
  const classScope = actual.class_scope
  recordPilotDescriptiveCheck(
    'scope_class',
    classScope.id === PILOT_DESCRIPTIVE_CLASS_ID &&
      classScope.name === PILOT_DESCRIPTIVE_EXPECTED_SCOPE.className &&
      classScope.serie === PILOT_DESCRIPTIVE_EXPECTED_SCOPE.classSeries &&
      classScope.schoolId === PILOT_DESCRIPTIVE_SCHOOL_ID,
    `${classScope.name ?? '(missing)'} / ${classScope.id ?? '(missing)'}`
  )

}

function recordSnapshotChecks(actual: DescriptiveReceipt): void {
  recordPilotDescriptiveCheck('snapshot_count', actual.snapshot.fontes.length === 1, String(actual.snapshot.fontes.length))
  recordPilotDescriptiveCheck('snapshot_fingerprint', actual.snapshot_fingerprint_valid, actual.snapshot.fingerprint)
  recordPilotDescriptiveCheck('snapshot_scope', actual.snapshot_scope_valid, actual.snapshot.versao)
}

function recordPeriodAndIssuerChecks(actual: DescriptiveReceipt): void {
  const reportingPeriod = actual.reporting_period
  recordPilotDescriptiveCheck(
    'reporting_period',
    reportingPeriod.year === PILOT_DESCRIPTIVE_EXPECTED_REPORT_PERIOD.year &&
      reportingPeriod.semester === PILOT_DESCRIPTIVE_EXPECTED_REPORT_PERIOD.semester &&
      reportingPeriod.start === PILOT_DESCRIPTIVE_EXPECTED_REPORT_PERIOD.start &&
      reportingPeriod.end === PILOT_DESCRIPTIVE_EXPECTED_REPORT_PERIOD.end,
    JSON.stringify(reportingPeriod)
  )

  const issuer = actual.issuer_context
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
        (SELECT fontes_snapshot FROM public.relatorios_descritivos WHERE id=$5) AS snapshot,
        (SELECT fontes_snapshot->>'fingerprint' = encode(sha256(convert_to(jsonb_build_object(
          'periodo',fontes_snapshot->'periodo','fontes',fontes_snapshot->'fontes')::text,'UTF8')),'hex')
          FROM public.relatorios_descritivos WHERE id=$5) AS snapshot_fingerprint_valid,
        (SELECT fontes_snapshot->>'capturado_por'=r.finalizado_por::text
          AND fontes_snapshot->'periodo'->>'escola_id'=$1::text
          AND NOT EXISTS (SELECT 1 FROM jsonb_array_elements(r.fontes_snapshot->'fontes') v
            WHERE v->>'matricula_id'<>r.matricula_id::text OR v->>'turma_id'<>r.turma_id::text
              OR v->>'aluno_id'<>$3::text OR v->>'escola_id'<>$1::text)
          FROM public.relatorios_descritivos r WHERE r.id=$5) AS snapshot_scope_valid,
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
          'start', report.fontes_snapshot->'periodo'->>'data_inicio',
          'end', report.fontes_snapshot->'periodo'->>'data_fim'
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

    const actual = descriptiveReceiptSchema.parse(rows[0])
    recordCountChecks(actual)
    recordContractChecks(actual)
    recordScopeChecks(actual)
    recordSnapshotChecks(actual)
    recordPeriodAndIssuerChecks(actual)

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
