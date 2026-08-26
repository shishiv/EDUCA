/** Exact R3-T1 legacy pilot manifest: six shared specs and one shared setup. */
export const LEGACY_PILOT_SETUP_FILE = 'auth.setup.ts' as const

/** Shared synthetic browser specs included by the legacy pilot runner. */
export const LEGACY_PILOT_SPEC_FILES = Object.freeze([
  'pilot/core-scope.spec.ts',
  'pilot/csv-import.spec.ts',
  'pilot/deployed-isolation.spec.ts',
  'pilot/invalid-refresh-token.spec.ts',
  'pilot/invitation-first-access.spec.ts',
  'pilot/security-hardening.spec.ts',
] as const)

/** Capacity, descriptive, and R1 canonical contracts excluded from R3-T1. */
export const LEGACY_PILOT_EXCLUDED_FILES = Object.freeze([
  'pilot/capacity-contract.spec.ts',
  'pilot/capacity-auth.setup.ts',
  'pilot-descriptive/descriptive-emission.spec.ts',
  'pilot-descriptive/descriptive-auth.setup.ts',
  'pilot/canonical-pilot.spec.ts',
  'pilot/canonical-auth.setup.ts',
  'playwright.pilot-canonical.config.ts',
  'scripts/run-pilot-canonical-e2e.sh',
] as const)

/** The measured shared legacy slice size, excluding its setup test. */
export const LEGACY_PILOT_EXPECTED_TEST_COUNT = 17 as const

/** Named local app route used by the legacy pilot runner. */
export const LEGACY_PILOT_APP_NAME = 'educa-r3-legacy-pilot' as const
