#!/usr/bin/env tsx
/**
 * Writes the database receipt for the isolated R3-T1 legacy pilot rehearsal.
 * The query runs against real local PostgreSQL, never a mock or a public project.
 */
import { Client } from 'pg'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { assertSyntheticPilotSafety } from '../lib/pilot/pilot-safety-gate'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const DATABASE_URL = process.env.SUPABASE_DB_URL || ''
const RECEIPT_PATH = process.env.PILOT_LEGACY_DATABASE_RECEIPT_PATH || ''
const SYNTHETIC_ADMIN_ID = '20000000-0000-0000-0000-000000000001'
const SYNTHETIC_ADMIN_EMAIL = 'admin@synthetic.invalid'

const EXPECTED_COUNTS = Object.freeze({
  schools: 2,
  users: 5,
  syntheticAdmins: 1,
  classes: 2,
  students: 2,
  guardians: 2,
  guardianLinks: 2,
  enrollments: 2,
  sessions: 1,
  attendance: 1,
  metricEvents: 4,
  tombstones: 1,
})

type PilotMarkerRow = {
  municipality_slug: string
  data_classification: string
  external_deploy_allowed: boolean
  legal_approval_status: string
}

type PilotCountRow = {
  schools: number
  users: number
  synthetic_admins: number
  classes: number
  students: number
  guardians: number
  guardian_links: number
  enrollments: number
  sessions: number
  attendance: number
  metric_events: number
  tombstones: number
  non_synthetic_users: number
}

function assertLocalDatabaseEnvironment(): void {
  if (!SUPABASE_URL || !DATABASE_URL || !RECEIPT_PATH) {
    throw new Error('PILOT_LEGACY_DATABASE_RECEIPT_ENV_REQUIRED')
  }

  const apiHost = new URL(SUPABASE_URL).hostname
  const databaseHost = new URL(DATABASE_URL).hostname
  if (!['127.0.0.1', 'localhost'].includes(apiHost) || !['127.0.0.1', 'localhost'].includes(databaseHost)) {
    throw new Error('PILOT_LEGACY_DATABASE_LOCAL_BOUNDARY_REQUIRED')
  }

  if (!process.env.PUBLISHABLE_KEY?.startsWith('sb_publishable_')) {
    throw new Error('PILOT_LEGACY_DATABASE_PUBLISHABLE_ALIAS_REQUIRED')
  }
  if (!process.env.SECRET_KEY?.startsWith('sb_secret_')) {
    throw new Error('PILOT_LEGACY_DATABASE_SECRET_ALIAS_REQUIRED')
  }
}

function assertExpectedCount(name: keyof typeof EXPECTED_COUNTS, actual: number): void {
  const expected = EXPECTED_COUNTS[name]
  if (actual !== expected) {
    throw new Error(`PILOT_LEGACY_DATABASE_COUNT_MISMATCH: ${name} expected=${expected} actual=${actual}`)
  }
}

async function writePilotLegacyDatabaseReceipt(): Promise<void> {
  assertSyntheticPilotSafety('seed')
  assertLocalDatabaseEnvironment()

  const database = new Client({ connectionString: DATABASE_URL })
  await database.connect()
  try {
    const markerResult = await database.query<PilotMarkerRow>(`
      SELECT municipality_slug, data_classification, external_deploy_allowed, legal_approval_status
      FROM public.pilot_municipality_config
      WHERE municipality_slug = 'synthetic-municipality'
    `)
    if (markerResult.rows.length !== 1) {
      throw new Error('PILOT_LEGACY_DATABASE_MARKER_REQUIRED')
    }

    const marker = markerResult.rows[0]
    if (
      marker.data_classification !== 'synthetic_only' ||
      marker.external_deploy_allowed !== false ||
      marker.legal_approval_status !== 'not_approved'
    ) {
      throw new Error('PILOT_LEGACY_DATABASE_SAFETY_MARKER_INVALID')
    }

    const countsResult = await database.query<PilotCountRow>(`
      SELECT
        (SELECT count(*)::int FROM public.escolas) AS schools,
        (SELECT count(*)::int FROM public.users) AS users,
        (SELECT count(*)::int FROM public.users WHERE id = $1::uuid AND email = $2 AND tipo_usuario = 'admin' AND escola_id IS NULL) AS synthetic_admins,
        (SELECT count(*)::int FROM public.turmas) AS classes,
        (SELECT count(*)::int FROM public.alunos) AS students,
        (SELECT count(*)::int FROM public.responsaveis) AS guardians,
        (SELECT count(*)::int FROM public.aluno_responsaveis) AS guardian_links,
        (SELECT count(*)::int FROM public.matriculas) AS enrollments,
        (SELECT count(*)::int FROM public.sessoes_aula) AS sessions,
        (SELECT count(*)::int FROM public.frequencia) AS attendance,
        (SELECT count(*)::int FROM public.pilot_metric_events) AS metric_events,
        (SELECT count(*)::int FROM public.pilot_data_tombstones) AS tombstones,
        (SELECT count(*)::int FROM public.users WHERE email NOT LIKE '%@synthetic.invalid') AS non_synthetic_users
    `, [SYNTHETIC_ADMIN_ID, SYNTHETIC_ADMIN_EMAIL])
    const counts = countsResult.rows[0]
    const countMap = {
      schools: Number(counts.schools),
      users: Number(counts.users),
      syntheticAdmins: Number(counts.synthetic_admins),
      classes: Number(counts.classes),
      students: Number(counts.students),
      guardians: Number(counts.guardians),
      guardianLinks: Number(counts.guardian_links),
      enrollments: Number(counts.enrollments),
      sessions: Number(counts.sessions),
      attendance: Number(counts.attendance),
      metricEvents: Number(counts.metric_events),
      tombstones: Number(counts.tombstones),
    }

    for (const [name, actual] of Object.entries(countMap) as Array<[keyof typeof EXPECTED_COUNTS, number]>) {
      assertExpectedCount(name, actual)
    }
    if (Number(counts.non_synthetic_users) !== 0) {
      throw new Error(`PILOT_LEGACY_DATABASE_NON_SYNTHETIC_USERS: count=${counts.non_synthetic_users}`)
    }

    const receipt = {
      result: 'pass',
      boundary: 'real-postgresql',
      localSupabase: {
        apiHost: new URL(SUPABASE_URL).hostname,
        databaseHost: new URL(DATABASE_URL).hostname,
        externalProject: false,
      },
      safetyMarker: {
        municipality: marker.municipality_slug,
        dataClassification: marker.data_classification,
        externalDeployAllowed: marker.external_deploy_allowed,
        legalApprovalStatus: marker.legal_approval_status,
      },
      syntheticOnly: {
        nonSyntheticUsers: Number(counts.non_synthetic_users),
        identitiesUseSyntheticDomain: true,
      },
      counts: countMap,
      expectedCounts: EXPECTED_COUNTS,
    }

    mkdirSync(dirname(RECEIPT_PATH), { recursive: true })
    writeFileSync(RECEIPT_PATH, `${JSON.stringify(receipt, null, 2)}\n`, 'utf8')
    console.info('PILOT_LEGACY_DATABASE_RECEIPT: result=pass boundary=real-postgresql marker=synthetic-only')
  } finally {
    await database.end()
  }
}

writePilotLegacyDatabaseReceipt().catch(error => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
