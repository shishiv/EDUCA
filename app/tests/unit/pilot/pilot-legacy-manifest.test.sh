#!/usr/bin/env bash
set -euo pipefail

APP_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)
WORK_DIR=$(mktemp -d)
MANIFEST_LOG="$WORK_DIR/manifest.log"
trap 'rm -rf "$WORK_DIR"' EXIT

read -r EXPECTED_SPECS EXPECTED_SETUP EXPECTED_RUN < <(
  cd "$APP_DIR"
  pnpm exec tsx -e "import { LEGACY_PILOT_EXPECTED_RUN_TEST_COUNT, LEGACY_PILOT_EXPECTED_SETUP_TEST_COUNT, LEGACY_PILOT_EXPECTED_TEST_COUNT } from './tests/e2e/pilot/legacy-pilot-manifest'; console.log([LEGACY_PILOT_EXPECTED_TEST_COUNT, LEGACY_PILOT_EXPECTED_SETUP_TEST_COUNT, LEGACY_PILOT_EXPECTED_RUN_TEST_COUNT].join(' '))"
)

(
  cd "$APP_DIR"
  PILOT_MODE=true \
  PILOT_AUTH_STATE_PATH="$WORK_DIR/auth.json" \
  PILOT_LEGACY_SERVER_MANAGED=true \
  pnpm exec playwright test --config playwright.pilot-legacy.config.ts --list --reporter=line >"$MANIFEST_LOG"
)

observed_specs=$(grep -Ec '^[[:space:]]+\[chromium-legacy\] ' "$MANIFEST_LOG" || true)
observed_setup=$(grep -Ec '^[[:space:]]+\[legacy-setup\] ' "$MANIFEST_LOG" || true)
observed_run=$((observed_specs + observed_setup))

[[ "$observed_specs" -eq "$EXPECTED_SPECS" ]]
[[ "$observed_setup" -eq "$EXPECTED_SETUP" ]]
[[ "$observed_run" -eq "$EXPECTED_RUN" ]]
grep -Fq 'rejects atomically and retains encrypted source until raw expiry' "$MANIFEST_LOG"
grep -Fq 'pilot/attendance-reopen.spec.ts' "$MANIFEST_LOG"
grep -Fq 'pilot/canonical-lesson.spec.ts' "$MANIFEST_LOG"

PILOT_LEGACY_MANIFEST_LIST_PATH="$MANIFEST_LOG" \
  pnpm --dir "$APP_DIR" exec tsx -e "import { readFileSync } from 'node:fs'; import { assertLegacyPilotManifestListing, legacyPilotManifestReceiptPath } from './tests/e2e/pilot/legacy-pilot-manifest'; const listPath = process.env.PILOT_LEGACY_MANIFEST_LIST_PATH; if (!listPath) throw new Error('PILOT_LEGACY_MANIFEST_LIST_PATH_REQUIRED'); assertLegacyPilotManifestListing(readFileSync(listPath, 'utf8')); const receiptExclusions = ['pilot/capacity-contract.spec.ts', 'playwright.pilot-canonical.config.ts', 'scripts/run-pilot-canonical-e2e.sh'].map(legacyPilotManifestReceiptPath); if (receiptExclusions.join(',') !== 'tests/e2e/pilot/capacity-contract.spec.ts,playwright.pilot-canonical.config.ts,scripts/run-pilot-canonical-e2e.sh') throw new Error('manifest receipt path mapping is incorrect')"

NEGATIVE_MANIFEST_LOG="$WORK_DIR/manifest-substituted.log"
sed 's#pilot/attendance-reopen\.spec\.ts#pilot/capacity-contract.spec.ts#g' "$MANIFEST_LOG" >"$NEGATIVE_MANIFEST_LOG"
[[ "$(grep -Ec '^[[:space:]]+\[chromium-legacy\] ' "$NEGATIVE_MANIFEST_LOG" || true)" -eq "$observed_specs" ]]
if PILOT_LEGACY_MANIFEST_LIST_PATH="$NEGATIVE_MANIFEST_LOG" \
  pnpm --dir "$APP_DIR" exec tsx -e "import { readFileSync } from 'node:fs'; import { assertLegacyPilotManifestListing } from './tests/e2e/pilot/legacy-pilot-manifest'; const listPath = process.env.PILOT_LEGACY_MANIFEST_LIST_PATH; if (!listPath) throw new Error('PILOT_LEGACY_MANIFEST_LIST_PATH_REQUIRED'); assertLegacyPilotManifestListing(readFileSync(listPath, 'utf8'))" 2>"$WORK_DIR/manifest-substituted-error.log"; then
  echo 'PILOT_LEGACY_MANIFEST_TEST_RED: same-count substituted spec was accepted' >&2
  exit 1
fi
grep -Fq 'PILOT_LEGACY_MANIFEST_SPEC_MISMATCH' "$WORK_DIR/manifest-substituted-error.log"

for excluded_file in \
  'pilot/capacity-contract.spec.ts' \
  'pilot-descriptive/descriptive-emission.spec.ts' \
  'pilot/canonical-pilot.spec.ts' \
  'pilot/canonical-auth.setup.ts'; do
  ! grep -Fq "$excluded_file" "$MANIFEST_LOG"
done

printf 'PILOT_LEGACY_MANIFEST_TESTS_PASSED: specs=%s setup=%s run=%s\n' "$observed_specs" "$observed_setup" "$observed_run"
