#!/usr/bin/env tsx
/**
 * Independently validates the bounded descriptive-report rehearsal against the
 * real isolated PostgreSQL database and emits count and fingerprint receipts.
 */
import { Client } from 'pg'
import { assertPilotDescriptiveReportDemoSafety } from '../lib/pilot/descriptive-report-demo-safety'
import {
  PILOT_DESCRIPTIVE_CLASS_ID,
  PILOT_DESCRIPTIVE_CONTENT_IDS,
  PILOT_DESCRIPTIVE_ENROLLMENT_ID,
  PILOT_DESCRIPTIVE_EXPECTED_COUNTS,
  PILOT_DESCRIPTIVE_EXPECTED_FINGERPRINTS,
  PILOT_DESCRIPTIVE_MARKER_CONFIG_ID,
  PILOT_DESCRIPTIVE_REPORT_ID,
  PILOT_DESCRIPTIVE_SCHOOL_ID,
  PILOT_DESCRIPTIVE_SEED_MARKER,
  PILOT_DESCRIPTIVE_SEED_MARKER_CONFIG_KEY,
  PILOT_DESCRIPTIVE_SESSION_IDS,
  PILOT_DESCRIPTIVE_STUDENT_ID,
} from '../../supabase/seed-pilot-descriptive/pilot-descriptive-contract'

assertPilotDescriptiveReportDemoSafety()

const SUPABASE_DB_URL = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL || ''

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
        (SELECT count(*) FROM public.sessoes_aula WHERE id = ANY($6::uuid[])) AS sessions,
        (SELECT count(*) FROM public.conteudo_aula WHERE id = ANY($7::uuid[])) AS canonical_content,
        (SELECT valor FROM public.configs WHERE id = $8 AND chave = $9) AS marker,
        (SELECT md5(string_agg(line, '|' ORDER BY line)) FROM (
          SELECT concat_ws('|', c.id::text, c.sessao_id::text, c.tema, c.objetivo, array_to_string(c.habilidades_bncc, ',')) AS line
          FROM public.conteudo_aula c WHERE c.id = ANY($7::uuid[])
        ) content_rows) AS canonical_content_fingerprint,
        (SELECT md5(string_agg(line, '|' ORDER BY line)) FROM (
          SELECT concat_ws('|', r.id::text, r.matricula_id::text, r.turma_id::text, r.status, r.ano_letivo::text, r.semestre) AS line
          FROM public.relatorios_descritivos r WHERE r.id = $5
        ) report_rows) AS descriptive_report_fingerprint`,
      [
        PILOT_DESCRIPTIVE_SCHOOL_ID,
        PILOT_DESCRIPTIVE_CLASS_ID,
        PILOT_DESCRIPTIVE_STUDENT_ID,
        PILOT_DESCRIPTIVE_ENROLLMENT_ID,
        PILOT_DESCRIPTIVE_REPORT_ID,
        PILOT_DESCRIPTIVE_SESSION_IDS,
        PILOT_DESCRIPTIVE_CONTENT_IDS,
        PILOT_DESCRIPTIVE_MARKER_CONFIG_ID,
        PILOT_DESCRIPTIVE_SEED_MARKER_CONFIG_KEY,
      ]
    )

    const receipt = rows[0] as Record<string, unknown>
    const expected: Record<string, number> = {
      schools: PILOT_DESCRIPTIVE_EXPECTED_COUNTS.schools,
      classes: PILOT_DESCRIPTIVE_EXPECTED_COUNTS.classes,
      students: PILOT_DESCRIPTIVE_EXPECTED_COUNTS.students,
      enrollments: PILOT_DESCRIPTIVE_EXPECTED_COUNTS.enrollments,
      reports: PILOT_DESCRIPTIVE_EXPECTED_COUNTS.reports,
      sessions: PILOT_DESCRIPTIVE_EXPECTED_COUNTS.sessions,
      canonical_content: PILOT_DESCRIPTIVE_EXPECTED_COUNTS.canonicalContent,
    }

    for (const [name, expectedCount] of Object.entries(expected)) {
      const actual = asNumber(receipt[name])
      recordPilotDescriptiveCheck(`count_${name}`, actual === expectedCount, `${actual} == ${expectedCount}`)
    }

    recordPilotDescriptiveCheck(
      'marker_synthetic',
      receipt.marker === PILOT_DESCRIPTIVE_SEED_MARKER,
      `${receipt.marker ?? '(missing)'} == ${PILOT_DESCRIPTIVE_SEED_MARKER}`
    )
    recordPilotDescriptiveCheck(
      'fingerprint_canonical_content',
      receipt.canonical_content_fingerprint === PILOT_DESCRIPTIVE_EXPECTED_FINGERPRINTS.canonicalContent,
      `${receipt.canonical_content_fingerprint ?? '(missing)'} == ${PILOT_DESCRIPTIVE_EXPECTED_FINGERPRINTS.canonicalContent}`
    )
    recordPilotDescriptiveCheck(
      'fingerprint_descriptive_report',
      receipt.descriptive_report_fingerprint === PILOT_DESCRIPTIVE_EXPECTED_FINGERPRINTS.descriptiveReport,
      `${receipt.descriptive_report_fingerprint ?? '(missing)'} == ${PILOT_DESCRIPTIVE_EXPECTED_FINGERPRINTS.descriptiveReport}`
    )

    console.info(`PILOT_DESCRIPTIVE_VALIDATION_RECEIPT: ${JSON.stringify(receipt)}`)
    for (const check of checks) {
      console.info(`  [${check.ok ? 'PASS' : 'FAIL'}] ${check.name}: ${check.detail}`)
    }

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
