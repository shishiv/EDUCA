import {
  PILOT_DESCRIPTIVE_SEED_MARKER,
  PILOT_DESCRIPTIVE_SEED_MARKER_CONFIG_KEY,
} from '../../app/lib/pilot/descriptive-report-demo-contract'

/**
 * Fixed synthetic facts for the bounded descriptive-report PDF rehearsal.
 * The runner applies these only to an isolated local Supabase project.
 */
export {
  PILOT_DESCRIPTIVE_SEED_MARKER,
  PILOT_DESCRIPTIVE_SEED_MARKER_CONFIG_KEY,
}
export const PILOT_DESCRIPTIVE_SEED_CREATED_AT = '2026-08-10T12:00:00.000Z'
export const PILOT_DESCRIPTIVE_AUTH_EMAIL = 'professora.descritivo@synthetic.invalid'
export const PILOT_DESCRIPTIVE_AUTH_PASSWORD = 'Synthetic-Only-2026!'
export const PILOT_DESCRIPTIVE_SCHOOL_ID = '21000000-0000-0000-0000-000000000001'
export const PILOT_DESCRIPTIVE_CLASS_ID = '22000000-0000-0000-0000-000000000001'
export const PILOT_DESCRIPTIVE_STUDENT_ID = '23000000-0000-0000-0000-000000000001'
export const PILOT_DESCRIPTIVE_ENROLLMENT_ID = '24000000-0000-0000-0000-000000000001'
export const PILOT_DESCRIPTIVE_DISCIPLINE_ID = '25000000-0000-0000-0000-000000000001'
export const PILOT_DESCRIPTIVE_SESSION_IDS = [
  '26000000-0000-0000-0000-000000000001',
  '26000000-0000-0000-0000-000000000002',
] as const
export const PILOT_DESCRIPTIVE_CONTENT_IDS = [
  '27000000-0000-0000-0000-000000000001',
  '27000000-0000-0000-0000-000000000002',
] as const
export const PILOT_DESCRIPTIVE_REPORT_ID = '28000000-0000-0000-0000-000000000001'
export const PILOT_DESCRIPTIVE_MARKER_CONFIG_ID = '29000000-0000-0000-0000-000000000001'

/** Counts independently checked against the real isolated PostgreSQL seed. */
export const PILOT_DESCRIPTIVE_EXPECTED_COUNTS = Object.freeze({
  schools: 1,
  classes: 1,
  students: 1,
  enrollments: 1,
  reports: 1,
  sessions: 2,
  canonicalContent: 2,
})

/** Fingerprints captured from the real isolated PostgreSQL seed receipt. */
export const PILOT_DESCRIPTIVE_EXPECTED_FINGERPRINTS = Object.freeze({
  canonicalContent: 'a17534aab486d50c38f2a2500bc4de39',
  descriptiveReport: '57332b4709130f4616f0bb6c3e8ce66d',
})
