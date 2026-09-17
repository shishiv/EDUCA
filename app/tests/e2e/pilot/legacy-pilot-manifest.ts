/** Exact R3-T1 legacy pilot manifest: eight shared specs and one shared setup. */
export const LEGACY_PILOT_SETUP_FILE = 'auth.setup.ts' as const

/** Shared synthetic browser specs included by the legacy pilot runner. */
export const LEGACY_PILOT_SPEC_FILES = Object.freeze([
  'pilot/attendance-reopen.spec.ts',
  'pilot/canonical-lesson.spec.ts',
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

/** The measured shared legacy slice size, excluding its pilot setup test. */
export const LEGACY_PILOT_EXPECTED_TEST_COUNT = 25 as const

/** The pilot-mode auth setup has one deterministic secretariat login. */
export const LEGACY_PILOT_EXPECTED_SETUP_TEST_COUNT = 1 as const

/** Selected legacy specs plus the pilot-mode auth setup. */
export const LEGACY_PILOT_EXPECTED_RUN_TEST_COUNT = 26 as const

export function legacyPilotSpecFilesFromPlaywrightList(listing: string): string[] {
  return [...listing.matchAll(/\[chromium-legacy\]\s+›\s+([^:]+\.spec\.ts):\d+:\d+/g)]
    .map(([, spec]) => spec)
}

export function assertLegacyPilotManifestListing(listing: string) {
  const selectedSpecs = [...new Set(legacyPilotSpecFilesFromPlaywrightList(listing))].sort()
  const expectedSpecs = [...LEGACY_PILOT_SPEC_FILES].sort()
  if (JSON.stringify(selectedSpecs) !== JSON.stringify(expectedSpecs)) {
    throw new Error(`PILOT_LEGACY_MANIFEST_SPEC_MISMATCH: expected=${expectedSpecs.join(',')} observed=${selectedSpecs.join(',')}`)
  }
}

export function legacyPilotManifestReceiptPath(file: string): string {
  return file.endsWith('.spec.ts') || file.endsWith('.setup.ts') ? `tests/e2e/${file}` : file
}

/** Named local app route used by the legacy pilot runner. */
export const LEGACY_PILOT_APP_NAME = 'educa-r3-legacy-pilot' as const
