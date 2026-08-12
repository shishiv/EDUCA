#!/usr/bin/env bash
# shellcheck disable=SC2329,SC1091
set -euo pipefail

APP_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
ROOT_DIR=$(cd "$APP_DIR/.." && pwd)
cd "$APP_DIR"
# shellcheck source=pilot-port-range-lease.sh
# shellcheck source=pilot-supabase-cleanup.sh
source "$APP_DIR/scripts/pilot-port-range-lease.sh"
source "$APP_DIR/scripts/pilot-supabase-cleanup.sh"

RECEIPT_DIR="${PILOT_E2E_RECEIPT_DIR:-$ROOT_DIR/.pilot-evidence}"
RUN_ID="$(date -u +%Y%m%dT%H%M%SZ)-$$"
RECEIPT_STEM="$RECEIPT_DIR/r3-t4-descriptive-pilot-e2e-$RUN_ID"
ISOLATED_PROJECT_DIR=''
SUPABASE_PROJECT_ID=''
SUPABASE_STARTED=false
APP_PID=''
APP_STOPPED=false
DATABASE_STOPPED=false
AUTH_STATE_REMOVED=false
TEMP_REMOVED=false
CLEANUP_FAILED=false
PORT_LEASE_RELEASE_FAILED=false
BASE_URL=''
RESULT='failed'
TEST_EXIT=1
SKIPPED=false
DELIBERATE_BREAK="${PILOT_DESCRIPTIVE_DELIBERATE_BREAK:-none}"
APP_NAME='educa-pilot-descriptive'
EXPECTED_TEST_COUNT=3
EXPECTED_SETUP_TEST_COUNT=1
EXPECTED_RUN_TEST_COUNT=4
AUTH_DIR=''
AUTH_STATE_PATH=''
APP_LOG=''

SETUP_RECEIPT_TMP=''
DATABASE_RECEIPT_TMP=''
ROLE_SETUP_RECEIPT_TMP=''
TEST_RECEIPT_TMP=''
PDF_RECEIPT_TMP=''
PRODUCT_BREAK_RECEIPT_TMP=''
DELIBERATE_BREAK_RECEIPT_TMP=''
PLAYWRIGHT_OUTPUT_TMP=''
SETUP_RECEIPT="$RECEIPT_STEM.setup.json"
DATABASE_RECEIPT="$RECEIPT_STEM.database.json"
ROLE_SETUP_RECEIPT="$RECEIPT_STEM.role-setup.json"
TEST_RECEIPT="$RECEIPT_STEM.test.json"
PDF_RECEIPT="$RECEIPT_STEM.pdf.json"
PRODUCT_BREAK_RECEIPT="$RECEIPT_STEM.product-deliberate-break.json"
DELIBERATE_BREAK_RECEIPT="$RECEIPT_STEM.deliberate-break.json"
TEST_OUTPUT_RECEIPT="$RECEIPT_STEM.test-output.txt"
CLEANUP_RECEIPT="$RECEIPT_STEM.cleanup.json"
FINAL_RECEIPT="$RECEIPT_STEM.json"

mkdir -p "$RECEIPT_DIR"

redact_file() {
  local source_file="$1"
  local destination_file="$2"
  if [[ ! -f "$source_file" ]]; then
    return 0
  fi
  sed -E \
    -e 's/sb_(publishable|secret)_[A-Za-z0-9_-]+/[REDACTED_SUPABASE_KEY]/g' \
    -e 's/eyJ[A-Za-z0-9._-]+/[REDACTED_TOKEN]/g' \
    -e 's#(postgresql://[^:@/]+):[^@]+@#\1:[REDACTED]@#g' \
    -e 's#(https?://[^:/[:space:]]+):[0-9]+#\1#g' \
    "$source_file" > "$destination_file"
}

show_log_on_failure() {
  local log_file="$1"
  local redacted_log="${log_file}.redacted"
  redact_file "$log_file" "$redacted_log"
  if [[ -s "$redacted_log" ]]; then
    cat "$redacted_log" >&2
  fi
}

run_captured() {
  local phase="$1"
  local log_file="$2"
  shift 2
  if ! "$@" >"$log_file" 2>&1; then
    echo "PILOT_DESCRIPTIVE_E2E_FAILED: phase=$phase" >&2
    show_log_on_failure "$log_file"
    return 1
  fi
}

choose_port_base() {
  local candidate="${PILOT_E2E_PORT_BASE:-}"
  if [[ ! "$candidate" =~ ^[0-9]+$ ]]; then
    echo 'PILOT_DESCRIPTIVE_E2E_PORT_BASE_INVALID: a leased PILOT_E2E_PORT_BASE is required' >&2
    return 1
  fi
  printf '%s' "$candidate"
}

write_setup_receipt() {
  local status="$1"
  PILOT_DESCRIPTIVE_SETUP_STATUS="$status" node <<'NODE'
const fs = require('node:fs')
const path = require('node:path')

const outputPath = process.env.PILOT_DESCRIPTIVE_SETUP_RECEIPT_PATH
const apiUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const databaseUrl = process.env.SUPABASE_DB_URL || ''
const appUrl = process.env.PILOT_DESCRIPTIVE_NAMED_APP_URL || process.env.NEXT_PUBLIC_APP_URL || ''
const localHosts = new Set(['127.0.0.1', 'localhost'])
const isNamedLocalUrl = value => {
  const url = new URL(value)
  return ['http:', 'https:'].includes(url.protocol) && url.hostname.endsWith('.localhost') && url.port === ''
}

const receipt = {
  result: process.env.PILOT_DESCRIPTIVE_SETUP_STATUS || 'unknown',
  resetBoundary: 'safety proof precedes database reset',
  localSupabase: {
    apiHost: apiUrl ? new URL(apiUrl).hostname : null,
    databaseHost: databaseUrl ? new URL(databaseUrl).hostname : null,
    apiIsLocal: apiUrl ? localHosts.has(new URL(apiUrl).hostname) : false,
    databaseIsLocal: databaseUrl ? localHosts.has(new URL(databaseUrl).hostname) : false,
    externalProjectUsed: false,
  },
  app: {
    url: appUrl || null,
    namedLocalUrl: appUrl ? isNamedLocalUrl(appUrl) : false,
    server: 'portless',
  },
  roleSetup: {
    role: 'professor',
    identity: 'professora.descritivo@synthetic.invalid',
    authStatePath: process.env.PILOT_DESCRIPTIVE_AUTH_STATE_PATH || null,
  },
  seed: {
    command: 'pnpm exec tsx scripts/seed-pilot-descriptive.ts',
    validationCommand: 'pnpm exec tsx scripts/validate-pilot-descriptive.ts',
  },
  flags: {
    nextPublicPilotMode: process.env.NEXT_PUBLIC_PILOT_MODE === 'true',
    pilotMode: process.env.PILOT_MODE === 'true',
    syntheticDataOnly: process.env.PILOT_SYNTHETIC_DATA_ONLY === 'true',
    descriptiveReportDemo: process.env.NEXT_PUBLIC_PILOT_DESCRIPTIVE_REPORT_DEMO === 'true' && process.env.PILOT_DESCRIPTIVE_REPORT_DEMO === 'true',
    externalDeployApproved: process.env.PILOT_EXTERNAL_DEPLOY_APPROVED === 'true',
    legalApprovalStatus: process.env.PILOT_LEGAL_APPROVAL_STATUS || null,
  },
  currentKeyAliases: {
    publishableAliasPresent: process.env.PUBLISHABLE_KEY?.startsWith('sb_publishable_') === true,
    secretAliasPresent: process.env.SECRET_KEY?.startsWith('sb_secret_') === true,
  },
  portRangeLease: {
    base: process.env.PILOT_E2E_PORT_BASE ? Number(process.env.PILOT_E2E_PORT_BASE) : null,
    end: process.env.PILOT_E2E_PORT_BASE ? Number(process.env.PILOT_E2E_PORT_BASE) + 8 : null,
    external: process.env.PILOT_E2E_PORT_LEASE_EXTERNAL === 'true',
    leaseDir: process.env.PILOT_E2E_PORT_LEASE_DIR || null,
  },
  externalCredentialsUsed: false,
  publicDemoUsed: false,
}

fs.mkdirSync(path.dirname(outputPath), { recursive: true })
fs.writeFileSync(outputPath, `${JSON.stringify(receipt, null, 2)}\n`, 'utf8')
NODE
}

write_database_receipt() {
  node <<'NODE'
const fs = require('node:fs')
const path = require('node:path')
const outputPath = process.env.PILOT_DESCRIPTIVE_DATABASE_RECEIPT_PATH
const receipt = {
  result: 'pass',
  boundary: 'real-postgresql',
  seedMarker: 'SYNTHETIC-EDUCA-PILOT-DESCRIPTIVE',
  seedCommand: 'pnpm exec tsx scripts/seed-pilot-descriptive.ts',
  validationCommand: 'pnpm exec tsx scripts/validate-pilot-descriptive.ts',
  localDatabase: true,
  syntheticOnly: true,
}
fs.mkdirSync(path.dirname(outputPath), { recursive: true })
fs.writeFileSync(outputPath, `${JSON.stringify(receipt, null, 2)}\n`, 'utf8')
NODE
}

write_test_receipt() {
  local status="$1"
  PILOT_DESCRIPTIVE_TEST_STATUS="$status" PILOT_DESCRIPTIVE_TEST_EXIT="$TEST_EXIT" node <<'NODE'
const fs = require('node:fs')
const path = require('node:path')

const outputPath = process.env.PILOT_DESCRIPTIVE_TEST_RECEIPT_PATH
const outputFile = process.env.PILOT_DESCRIPTIVE_PLAYWRIGHT_OUTPUT_PATH
const lineCount = fs.existsSync(outputFile)
  ? fs.readFileSync(outputFile, 'utf8').split(/\r?\n/).filter(Boolean).length
  : 0
const receipt = {
  result: process.env.PILOT_DESCRIPTIVE_TEST_STATUS,
  exitCode: Number(process.env.PILOT_DESCRIPTIVE_TEST_EXIT),
  boundary: 'real-playwright-browser-and-pdf-download',
  config: 'playwright.pilot-descriptive.config.ts',
  expectedTestCount: Number(process.env.PILOT_DESCRIPTIVE_EXPECTED_RUN_TEST_COUNT),
  outputLines: lineCount,
  outputRedacted: true,
}
fs.mkdirSync(path.dirname(outputPath), { recursive: true })
fs.writeFileSync(outputPath, `${JSON.stringify(receipt, null, 2)}\n`, 'utf8')
NODE
}

write_deliberate_break_receipt() {
  local target="$1"
  PILOT_DESCRIPTIVE_BREAK_TARGET="$target" node <<'NODE'
const fs = require('node:fs')
const path = require('node:path')
const outputPath = process.env.PILOT_DESCRIPTIVE_LIFECYCLE_BREAK_RECEIPT_PATH
const receipt = {
  result: 'expected-red',
  target: process.env.PILOT_DESCRIPTIVE_BREAK_TARGET,
  contract: 'R3-T4 child lifecycle deliberate break',
  exitNonzeroRequired: true,
}
fs.mkdirSync(path.dirname(outputPath), { recursive: true })
fs.writeFileSync(outputPath, `${JSON.stringify(receipt, null, 2)}\n`, 'utf8')
NODE
}

cleanup() {
  local exit_code=$?
  trap - EXIT INT TERM
  set +e

  if [[ -n "$APP_PID" ]]; then
    kill "$APP_PID" 2>/dev/null || true
    wait "$APP_PID" 2>/dev/null || true
    if kill -0 "$APP_PID" 2>/dev/null; then
      APP_STOPPED=false
      CLEANUP_FAILED=true
    else
      APP_STOPPED=true
    fi
  else
    APP_STOPPED=true
  fi

  if [[ "$SUPABASE_STARTED" == true && -d "$ISOLATED_PROJECT_DIR" ]]; then
    if pilot_supabase_stop_project "$ISOLATED_PROJECT_DIR" "$SUPABASE_PROJECT_ID" >"$ISOLATED_PROJECT_DIR/stop.log" 2>&1; then
      DATABASE_STOPPED=true
    else
      DATABASE_STOPPED=false
      CLEANUP_FAILED=true
      show_log_on_failure "$ISOLATED_PROJECT_DIR/stop.log"
    fi
  else
    DATABASE_STOPPED=true
  fi

  if [[ -n "$AUTH_STATE_PATH" && -e "$AUTH_STATE_PATH" ]]; then
    rm -f "$AUTH_STATE_PATH"
  fi
  if [[ -n "$AUTH_DIR" && -e "$AUTH_DIR" ]]; then
    rm -rf "$AUTH_DIR"
  fi
  if [[ -n "$AUTH_STATE_PATH" && ! -e "$AUTH_STATE_PATH" ]]; then
    AUTH_STATE_REMOVED=true
  fi

  redact_file "$SETUP_RECEIPT_TMP" "$SETUP_RECEIPT"
  redact_file "$DATABASE_RECEIPT_TMP" "$DATABASE_RECEIPT"
  redact_file "$ROLE_SETUP_RECEIPT_TMP" "$ROLE_SETUP_RECEIPT"
  redact_file "$TEST_RECEIPT_TMP" "$TEST_RECEIPT"
  redact_file "$PDF_RECEIPT_TMP" "$PDF_RECEIPT"
  redact_file "$PRODUCT_BREAK_RECEIPT_TMP" "$PRODUCT_BREAK_RECEIPT"
  redact_file "$DELIBERATE_BREAK_RECEIPT_TMP" "$DELIBERATE_BREAK_RECEIPT"
  redact_file "$PLAYWRIGHT_OUTPUT_TMP" "$TEST_OUTPUT_RECEIPT"
  if [[ "$exit_code" -ne 0 && -n "$APP_LOG" && -f "$APP_LOG" ]]; then
    redact_file "$APP_LOG" "${RECEIPT_STEM}.app-log.txt"
  fi

  if [[ -n "$ISOLATED_PROJECT_DIR" && -e "$ISOLATED_PROJECT_DIR" ]]; then
    rm -rf "$ISOLATED_PROJECT_DIR"
  fi
  if [[ -n "$ISOLATED_PROJECT_DIR" && ! -e "$ISOLATED_PROJECT_DIR" ]]; then
    TEMP_REMOVED=true
  else
    TEMP_REMOVED=false
    CLEANUP_FAILED=true
  fi

  if ! pilot_port_range_lease_release; then
    PORT_LEASE_RELEASE_FAILED=true
    CLEANUP_FAILED=true
  fi

  for receipt_path in "$SETUP_RECEIPT" "$DATABASE_RECEIPT" "$ROLE_SETUP_RECEIPT" "$TEST_RECEIPT"; do
    if [[ ! -f "$receipt_path" ]]; then
      printf '%s\n' '{"result":"unavailable","redacted":true}' > "$receipt_path"
    fi
  done

  if [[ "$CLEANUP_FAILED" == true && "$exit_code" -eq 0 ]]; then
    exit_code=1
    RESULT='failed'
  fi

  cat > "$CLEANUP_RECEIPT" <<JSON
{
  "result": "$([[ "$CLEANUP_FAILED" == true ]] && printf failed || printf pass)",
  "appStopped": $APP_STOPPED,
  "databaseStopped": $DATABASE_STOPPED,
  "syntheticAuthStateRemoved": $AUTH_STATE_REMOVED,
  "isolatedDirectoryRemoved": $TEMP_REMOVED,
  "portRangeLeaseExternal": $([[ "$PILOT_E2E_PORT_LEASE_EXTERNAL" == true ]] && printf true || printf false),
  "portRangeLeaseReleased": $([[ "$PILOT_E2E_PORT_LEASE_RELEASED" == true ]] && printf true || printf false),
  "portRangeLeaseReleaseFailed": $PORT_LEASE_RELEASE_FAILED,
  "redacted": true
}
JSON

  PILOT_DESCRIPTIVE_SKIPPED="$SKIPPED" node - "$FINAL_RECEIPT" "$SETUP_RECEIPT" "$DATABASE_RECEIPT" "$ROLE_SETUP_RECEIPT" "$TEST_RECEIPT" "$PDF_RECEIPT" "$PRODUCT_BREAK_RECEIPT" "$DELIBERATE_BREAK_RECEIPT" "$CLEANUP_RECEIPT" "$TEST_OUTPUT_RECEIPT" "$exit_code" "$RESULT" "$BASE_URL" "$DELIBERATE_BREAK" <<'NODE'
const fs = require('node:fs')
const path = require('node:path')

const [finalPath, setupPath, databasePath, rolePath, testPath, pdfPath, productBreakPath, lifecycleBreakPath, cleanupPath, outputPath, exitCode, result, baseUrl, deliberateBreak] = process.argv.slice(2)
const readJson = file => fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : null
const relative = file => path.relative(process.cwd(), file)
const skipped = process.env.PILOT_DESCRIPTIVE_SKIPPED === 'true'
const receipt = {
  contract: 'R3-T4 dedicated descriptive-report pilot E2E',
  result: skipped ? 'skipped' : Number(exitCode) === 0 ? 'passed' : Number(exitCode) === 130 || Number(exitCode) === 143 ? 'interrupted' : 'failed',
  exitCode: Number(exitCode),
  command: 'cd app && pnpm test:e2e:pilot:descriptive',
  selectedManifest: {
    config: 'playwright.pilot-descriptive.config.ts',
    setup: 'tests/e2e/pilot-descriptive/descriptive-auth.setup.ts',
    specs: ['tests/e2e/pilot-descriptive/descriptive-emission.spec.ts'],
    expectedTests: 3,
    expectedSetupTests: 1,
    expectedRunTests: 4,
  },
  setup: readJson(setupPath),
  seed: {
    result: readJson(databasePath)?.result || 'unavailable',
    marker: 'SYNTHETIC-EDUCA-PILOT-DESCRIPTIVE',
    command: 'pnpm exec tsx scripts/seed-pilot-descriptive.ts',
    validationCommand: 'pnpm exec tsx scripts/validate-pilot-descriptive.ts',
  },
  database: readJson(databasePath),
  roleSetup: readJson(rolePath),
  tests: {
    receipt: readJson(testPath),
    outputPath: fs.existsSync(outputPath) ? relative(outputPath) : null,
    outputRedacted: true,
  },
  pdf: readJson(pdfPath),
  productDeliberateBreak: readJson(productBreakPath),
  lifecycleDeliberateBreak: readJson(lifecycleBreakPath),
  portRangeLease: {
    base: process.env.PILOT_E2E_PORT_BASE ? Number(process.env.PILOT_E2E_PORT_BASE) : null,
    end: process.env.PILOT_E2E_PORT_BASE ? Number(process.env.PILOT_E2E_PORT_BASE) + 8 : null,
    external: process.env.PILOT_E2E_PORT_LEASE_EXTERNAL === 'true',
    leaseDir: process.env.PILOT_E2E_PORT_LEASE_DIR || null,
    released: process.env.PILOT_E2E_PORT_LEASE_RELEASED === 'true',
  },
  cleanup: readJson(cleanupPath),
  namedBaseUrl: baseUrl || null,
  deliberateBreak: deliberateBreak === 'none' ? null : deliberateBreak,
  r1Independent: true,
  externalCredentialsUsed: false,
  publicDemoUsed: false,
}
fs.writeFileSync(finalPath, `${JSON.stringify(receipt, null, 2)}\n`, 'utf8')
NODE

  printf 'PILOT_DESCRIPTIVE_CLEANUP_RECEIPT: app_stopped=%s database_stopped=%s auth_state_removed=%s isolated_removed=%s result=%s receipt=%s\n' \
    "$APP_STOPPED" "$DATABASE_STOPPED" "$AUTH_STATE_REMOVED" "$TEMP_REMOVED" "$([[ "$CLEANUP_FAILED" == true ]] && printf failed || printf pass)" "$FINAL_RECEIPT"
  printf 'PILOT_E2E_FINAL_RECEIPT: %s\n' "$FINAL_RECEIPT"
  exit "$exit_code"
}

trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

for command in ss docker pnpm psql portless curl node; do
  command -v "$command" >/dev/null || {
    echo "PILOT_DESCRIPTIVE_E2E_PREREQUISITE_MISSING: $command" >&2
    exit 1
  }
done

case "$DELIBERATE_BREAK" in
  none|selection|safety|cleanup) ;;
  *)
    echo 'PILOT_DESCRIPTIVE_DELIBERATE_BREAK_INVALID: expected none, selection, safety, or cleanup' >&2
    exit 1
    ;;
esac

if ! pilot_port_range_lease_use_external; then
  exit 1
fi
PORT_BASE=$(choose_port_base)
API_PORT=$PORT_BASE
DB_PORT=$((PORT_BASE + 1))
STUDIO_PORT=$((PORT_BASE + 2))
MAILPIT_PORT=$((PORT_BASE + 3))
ANALYTICS_PORT=$((PORT_BASE + 6))
VECTOR_PORT=$((PORT_BASE + 7))
POOLER_PORT=$((PORT_BASE + 8))

ISOLATED_PROJECT_DIR=$(mktemp -d "$ROOT_DIR/.pilot-r3-t4-descriptive-supabase.XXXXXX")
SUPABASE_PROJECT_ID=$(basename "$ISOLATED_PROJECT_DIR")
SUPABASE_PROJECT_ID="${SUPABASE_PROJECT_ID#.}"
SUPABASE_CONFIG_DIR="$ISOLATED_PROJECT_DIR/supabase"
AUTH_DIR="$APP_DIR/playwright/.pilot-descriptive/$RUN_ID"
AUTH_STATE_PATH="$AUTH_DIR/teacher.json"
SETUP_RECEIPT_TMP="$ISOLATED_PROJECT_DIR/setup-receipt.json"
DATABASE_RECEIPT_TMP="$ISOLATED_PROJECT_DIR/database-receipt.json"
ROLE_SETUP_RECEIPT_TMP="$ISOLATED_PROJECT_DIR/role-setup-receipt.json"
TEST_RECEIPT_TMP="$ISOLATED_PROJECT_DIR/test-receipt.json"
PDF_RECEIPT_TMP="$ISOLATED_PROJECT_DIR/pdf-receipt.json"
PRODUCT_BREAK_RECEIPT_TMP="$ISOLATED_PROJECT_DIR/product-deliberate-break-receipt.json"
DELIBERATE_BREAK_RECEIPT_TMP="$ISOLATED_PROJECT_DIR/lifecycle-deliberate-break-receipt.json"
PLAYWRIGHT_OUTPUT_TMP="$ISOLATED_PROJECT_DIR/playwright-output.log"
SUPABASE_LOG="$ISOLATED_PROJECT_DIR/supabase-start.log"
STATUS_LOG="$ISOLATED_PROJECT_DIR/supabase-status.log"
STATUS_ENV_PATH="$ISOLATED_PROJECT_DIR/supabase-status.env"
DB_RESET_LOG="$ISOLATED_PROJECT_DIR/db-reset.log"
GATE_LOG="$ISOLATED_PROJECT_DIR/pilot-safety-gate.log"
GATE_SQL_LOG="$ISOLATED_PROJECT_DIR/pilot-module-gate.log"
DESCRIPTIVE_SQL_LOG="$ISOLATED_PROJECT_DIR/pilot-descriptive-report-demo.log"
SEED_LOG="$ISOLATED_PROJECT_DIR/seed.log"
DATABASE_VALIDATION_LOG="$ISOLATED_PROJECT_DIR/database-validation.log"
MANIFEST_LIST_LOG="$ISOLATED_PROJECT_DIR/manifest-list.log"
BUILD_LOG="$ISOLATED_PROJECT_DIR/build.log"
APP_LOG="$ISOLATED_PROJECT_DIR/next.log"

mkdir -p "$SUPABASE_CONFIG_DIR"
cp "$ROOT_DIR/supabase/config.toml" "$SUPABASE_CONFIG_DIR/config.toml"
ln -s "$ROOT_DIR/supabase/migrations" "$SUPABASE_CONFIG_DIR/migrations"
sed -i \
  -e "0,/port = 54321/s//port = $API_PORT/" \
  -e "0,/port = 54322/s//port = $DB_PORT/" \
  -e "0,/port = 54323/s//port = $STUDIO_PORT/" \
  -e "0,/port = 54324/s//port = $MAILPIT_PORT/" \
  -e "0,/port = 54327/s//port = $ANALYTICS_PORT/" \
  -e "0,/vector_port = 54328/s//vector_port = $VECTOR_PORT/" \
  -e "0,/port = 54329/s//port = $POOLER_PORT/" \
  -e 's#site_url = "http://127.0.0.1:3000"#site_url = "https://educa-pilot-descriptive.localhost"#' \
  -e 's#additional_redirect_urls = \["http://127.0.0.1:3000"\]#additional_redirect_urls = ["https://educa-pilot-descriptive.localhost"]#' \
  "$SUPABASE_CONFIG_DIR/config.toml"

# Do not let inherited remote project settings or credentials influence this run.
unset NEXT_PUBLIC_SUPABASE_URL NEXT_PUBLIC_SUPABASE_ANON_KEY SUPABASE_SERVICE_ROLE_KEY SUPABASE_DB_URL DATABASE_URL
unset SUPABASE_PROJECT_REF SUPABASE_ACCESS_TOKEN SUPABASE_DB_PASSWORD VERCEL_TOKEN
export NO_COLOR=1

SUPABASE_STARTED=true
run_captured 'supabase_start' "$SUPABASE_LOG" pnpm exec supabase --workdir "$ISOLATED_PROJECT_DIR" start

if ! pnpm exec supabase --workdir "$ISOLATED_PROJECT_DIR" status -o env >"$STATUS_ENV_PATH" 2>"$STATUS_LOG"; then
  echo 'PILOT_DESCRIPTIVE_E2E_FAILED: phase=supabase_status' >&2
  show_log_on_failure "$STATUS_LOG"
  exit 1
fi
if ! grep -q '^PUBLISHABLE_KEY=' "$STATUS_ENV_PATH" || ! grep -q '^SECRET_KEY=' "$STATUS_ENV_PATH"; then
  echo 'PILOT_DESCRIPTIVE_E2E_FAILED: phase=supabase_status current key aliases are missing' >&2
  exit 1
fi
eval "$(grep -E '^(API_URL|DB_URL|PUBLISHABLE_KEY|SECRET_KEY)=' "$STATUS_ENV_PATH")"
export API_URL DB_URL PUBLISHABLE_KEY SECRET_KEY

export NEXT_PUBLIC_SUPABASE_URL="$API_URL"
export NEXT_PUBLIC_SUPABASE_ANON_KEY="$PUBLISHABLE_KEY"
export SUPABASE_SERVICE_ROLE_KEY="$SECRET_KEY"
export SUPABASE_DB_URL="$DB_URL"
export NEXT_PUBLIC_APP_URL="https://$APP_NAME.localhost"
export NEXT_PUBLIC_PILOT_MODE=true
export PILOT_MODE=true
export PILOT_SYNTHETIC_DATA_ONLY=true
export PILOT_EXTERNAL_DEPLOY_APPROVED=false
export PILOT_LEGAL_APPROVAL_STATUS=not_approved
export NEXT_PUBLIC_PILOT_DESCRIPTIVE_REPORT_DEMO=true
export PILOT_DESCRIPTIVE_REPORT_DEMO=true
export EDUCA_RELEASE_REVISION="${EDUCA_RELEASE_REVISION:-$(git -C "$ROOT_DIR" rev-parse HEAD)}"
if [[ -z "$EDUCA_RELEASE_REVISION" ]]; then
  echo 'PILOT_DESCRIPTIVE_RELEASE_REVISION_REQUIRED: explicit source revision is required' >&2
  exit 1
fi
export NEXT_PUBLIC_DEMO_SANDBOX=false
export DEMO_SANDBOX=false
export PILOT_DESCRIPTIVE_AUTH_STATE_PATH="$AUTH_STATE_PATH"
export PILOT_DESCRIPTIVE_EXPECTED_RUN_TEST_COUNT="$EXPECTED_RUN_TEST_COUNT"
export PILOT_DESCRIPTIVE_SETUP_RECEIPT_PATH="$SETUP_RECEIPT_TMP"
export PILOT_DESCRIPTIVE_DATABASE_RECEIPT_PATH="$DATABASE_RECEIPT_TMP"
export PILOT_DESCRIPTIVE_ROLE_SETUP_RECEIPT_PATH="$ROLE_SETUP_RECEIPT_TMP"
export PILOT_DESCRIPTIVE_TEST_RECEIPT_PATH="$TEST_RECEIPT_TMP"
export PILOT_DESCRIPTIVE_PDF_RECEIPT_PATH="$PDF_RECEIPT_TMP"
export PILOT_DESCRIPTIVE_PRODUCT_BREAK_RECEIPT_PATH="$PRODUCT_BREAK_RECEIPT_TMP"
export PILOT_DESCRIPTIVE_LIFECYCLE_BREAK_RECEIPT_PATH="$DELIBERATE_BREAK_RECEIPT_TMP"
export PILOT_DESCRIPTIVE_PLAYWRIGHT_OUTPUT_PATH="$PLAYWRIGHT_OUTPUT_TMP"
export PILOT_DESCRIPTIVE_NAMED_APP_URL="$NEXT_PUBLIC_APP_URL"
export PILOT_DESCRIPTIVE_SERVER_MANAGED=true
PILOT_IMPORT_ENCRYPTION_KEY="$(printf 'synthetic-pilot-encryption-key!!' | base64 -w0)"
export PILOT_IMPORT_ENCRYPTION_KEY
export PILOT_IMPORT_ENCRYPTION_KEY_ID=synthetic-local-v1

if [[ "$DELIBERATE_BREAK" == safety ]]; then
  write_deliberate_break_receipt safety
  export PILOT_SYNTHETIC_DATA_ONLY=false
  printf 'PILOT_DESCRIPTIVE_DELIBERATE_BREAK: target=safety expected=red\n'
fi

run_captured 'pre_reset_setup_receipt' "$ISOLATED_PROJECT_DIR/setup-receipt.log" write_setup_receipt pre-reset-proof
run_captured 'pre_reset_safety_assertion' "$ISOLATED_PROJECT_DIR/pre-reset-safety.log" node <<'NODE'
const apiUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const databaseUrl = process.env.SUPABASE_DB_URL || ''
const appUrl = process.env.NEXT_PUBLIC_APP_URL || ''
const localHosts = new Set(['127.0.0.1', 'localhost'])
if (!apiUrl || !localHosts.has(new URL(apiUrl).hostname)) throw new Error('PILOT_DESCRIPTIVE_PRE_RESET_LOCAL_API_REQUIRED')
if (!databaseUrl || !localHosts.has(new URL(databaseUrl).hostname)) throw new Error('PILOT_DESCRIPTIVE_PRE_RESET_LOCAL_DATABASE_REQUIRED')
if (process.env.NEXT_PUBLIC_PILOT_MODE !== 'true' || process.env.PILOT_MODE !== 'true' || process.env.PILOT_SYNTHETIC_DATA_ONLY !== 'true') throw new Error('PILOT_DESCRIPTIVE_PRE_RESET_SYNTHETIC_FLAGS_REQUIRED')
if (process.env.NEXT_PUBLIC_PILOT_DESCRIPTIVE_REPORT_DEMO !== 'true' || process.env.PILOT_DESCRIPTIVE_REPORT_DEMO !== 'true') throw new Error('PILOT_DESCRIPTIVE_PRE_RESET_REPORT_DEMO_FLAGS_REQUIRED')
if (process.env.PILOT_EXTERNAL_DEPLOY_APPROVED !== 'false') throw new Error('PILOT_DESCRIPTIVE_PRE_RESET_EXTERNAL_DEPLOY_MUST_BE_FALSE')
if (process.env.PILOT_LEGAL_APPROVAL_STATUS !== 'not_approved') throw new Error('PILOT_DESCRIPTIVE_PRE_RESET_LEGAL_APPROVAL_MUST_BE_NOT_APPROVED')
if (!process.env.PUBLISHABLE_KEY?.startsWith('sb_publishable_')) throw new Error('PILOT_DESCRIPTIVE_PRE_RESET_PUBLISHABLE_ALIAS_REQUIRED')
if (!process.env.SECRET_KEY?.startsWith('sb_secret_')) throw new Error('PILOT_DESCRIPTIVE_PRE_RESET_SECRET_ALIAS_REQUIRED')
const namedUrl = new URL(appUrl)
if (!namedUrl.hostname.endsWith('.localhost') || namedUrl.port !== '') throw new Error('PILOT_DESCRIPTIVE_PRE_RESET_NAMED_APP_URL_REQUIRED')
console.log('PILOT_DESCRIPTIVE_PRE_RESET_SAFETY_RECEIPT: local=true synthetic_only=true report_demo=true external_deploy=false legal=not_approved current_aliases=true')
NODE
run_captured 'pilot_safety_gate' "$GATE_LOG" pnpm exec tsx scripts/pilot-safety-gate.ts seed
run_captured 'post_gate_setup_receipt' "$ISOLATED_PROJECT_DIR/setup-receipt-after-gate.log" write_setup_receipt pre-reset-proven

run_captured 'db_reset' "$DB_RESET_LOG" pnpm exec supabase --workdir "$ISOLATED_PROJECT_DIR" db reset
run_captured 'pilot_module_gate_sql' "$GATE_SQL_LOG" psql "$DB_URL" -X -v ON_ERROR_STOP=1 -f "$ROOT_DIR/supabase/pilot/provision-pilot-module-gate.sql"
run_captured 'pilot_descriptive_report_demo_sql' "$DESCRIPTIVE_SQL_LOG" psql "$DB_URL" -X -v ON_ERROR_STOP=1 -f "$ROOT_DIR/supabase/pilot/provision-pilot-descriptive-report-demo.sql"
run_captured 'synthetic_seed' "$SEED_LOG" pnpm exec tsx scripts/seed-pilot-descriptive.ts
run_captured 'database_validation' "$DATABASE_VALIDATION_LOG" pnpm exec tsx scripts/validate-pilot-descriptive.ts
write_database_receipt
printf 'PILOT_DESCRIPTIVE_SEED_RECEIPT: seed=pass validation=pass marker=SYNTHETIC-EDUCA-PILOT-DESCRIPTIVE canonical_content=2\n'

run_captured 'build' "$BUILD_LOG" pnpm build
printf 'PILOT_DESCRIPTIVE_BUILD_RECEIPT: status=pass\n'

portless run --name "$APP_NAME" pnpm start >"$APP_LOG" 2>&1 &
APP_PID=$!
for _ in $(seq 1 60); do
  BASE_URL=$(portless get "$APP_NAME" 2>/dev/null || true)
  if [[ -n "$BASE_URL" ]] && curl --silent --show-error --insecure --fail "$BASE_URL/login" >/dev/null 2>&1; then
    break
  fi
  sleep 1
done
if [[ -z "$BASE_URL" ]] || ! curl --silent --show-error --insecure --fail "$BASE_URL/login" >/dev/null 2>&1; then
  echo 'PILOT_DESCRIPTIVE_E2E_SERVER_FAILED: named portless app did not become ready' >&2
  show_log_on_failure "$APP_LOG"
  exit 1
fi
export PLAYWRIGHT_BASE_URL="$BASE_URL"
if [[ -f "$HOME/.portless/ca.pem" ]]; then
  export NODE_EXTRA_CA_CERTS="${NODE_EXTRA_CA_CERTS:-$HOME/.portless/ca.pem}"
fi
export PILOT_DESCRIPTIVE_NAMED_APP_URL="$BASE_URL"
run_captured 'ready_setup_receipt' "$ISOLATED_PROJECT_DIR/ready-setup-receipt.log" write_setup_receipt ready
node <<'NODE'
const value = process.env.PILOT_DESCRIPTIVE_NAMED_APP_URL
if (!value) throw new Error('PILOT_DESCRIPTIVE_NAMED_APP_URL_MISSING')
const url = new URL(value)
if (!['http:', 'https:'].includes(url.protocol) || !url.hostname.endsWith('.localhost') || url.port !== '') {
  throw new Error('PILOT_DESCRIPTIVE_NAMED_APP_URL_INVALID')
}
console.log('PILOT_DESCRIPTIVE_BROWSER_SETUP_RECEIPT: named_url=true numbered_port=false')
NODE

run_captured 'manifest_list' "$MANIFEST_LIST_LOG" pnpm exec playwright test --config playwright.pilot-descriptive.config.ts --list --reporter=line
selected_test_count=$(grep -Ec '^[[:space:]]+\[chromium-descriptive\] ' "$MANIFEST_LIST_LOG" || true)
setup_test_count=$(grep -Ec '^[[:space:]]+\[setup\] ' "$MANIFEST_LIST_LOG" || true)
if [[ "$selected_test_count" -ne "$EXPECTED_TEST_COUNT" || "$setup_test_count" -ne "$EXPECTED_SETUP_TEST_COUNT" ]]; then
  echo "PILOT_DESCRIPTIVE_MANIFEST_RED: expected_tests=$EXPECTED_TEST_COUNT observed_tests=$selected_test_count observed_setup=$setup_test_count" >&2
  exit 1
fi
printf 'PILOT_DESCRIPTIVE_MANIFEST_RECEIPT: setup=1 specs=1 tests=%s pdf=true deliberate_break=true r1_canonical=false\n' "$selected_test_count"

if [[ "$DELIBERATE_BREAK" == selection ]]; then
  write_deliberate_break_receipt selection
  printf 'PILOT_DESCRIPTIVE_DELIBERATE_BREAK: target=selection expected=red\n'
  echo 'PILOT_DESCRIPTIVE_MANIFEST_RED: deliberate selection break' >&2
  exit 1
fi

set +e
pnpm exec playwright test --config playwright.pilot-descriptive.config.ts --reporter=line >"$PLAYWRIGHT_OUTPUT_TMP" 2>&1
TEST_EXIT=$?
set -e
if grep -Eiq '(^|[[:space:]])[0-9]+ skipped([[:space:]]|$)' "$PLAYWRIGHT_OUTPUT_TMP"; then
  SKIPPED=true
  write_test_receipt skipped
  echo 'PILOT_DESCRIPTIVE_E2E_SKIPPED: a selected pilot test was skipped' >&2
  exit 1
fi
if [[ "$TEST_EXIT" -ne 0 ]]; then
  write_test_receipt fail
  echo "PILOT_DESCRIPTIVE_E2E_FAILED: phase=browser status=$TEST_EXIT" >&2
  show_log_on_failure "$PLAYWRIGHT_OUTPUT_TMP"
  exit "$TEST_EXIT"
fi
if ! grep -Eq "[[:space:]]${EXPECTED_RUN_TEST_COUNT} passed([[:space:]]|$)" "$PLAYWRIGHT_OUTPUT_TMP"; then
  write_test_receipt fail
  echo "PILOT_DESCRIPTIVE_E2E_RESULT_COUNT_RED: expected=${EXPECTED_RUN_TEST_COUNT} passed" >&2
  show_log_on_failure "$PLAYWRIGHT_OUTPUT_TMP"
  exit 1
fi
write_test_receipt pass
if [[ ! -s "$PDF_RECEIPT_TMP" ]]; then
  echo 'PILOT_DESCRIPTIVE_PDF_RECEIPT_MISSING: real PDF download receipt was not written' >&2
  exit 1
fi
if [[ ! -s "$PRODUCT_BREAK_RECEIPT_TMP" ]]; then
  echo 'PILOT_DESCRIPTIVE_DELIBERATE_BREAK_RECEIPT_MISSING: browser content-removal break receipt was not written' >&2
  exit 1
fi

if [[ "$DELIBERATE_BREAK" == cleanup ]]; then
  write_deliberate_break_receipt cleanup
  printf 'PILOT_DESCRIPTIVE_DELIBERATE_BREAK: target=cleanup expected=red\n'
  echo 'PILOT_DESCRIPTIVE_CLEANUP_RED: deliberate interruption before successful child completion' >&2
  exit 1
fi

RESULT='passed'
TEST_EXIT=0
printf 'PILOT_DESCRIPTIVE_TEST_RECEIPT: status=pass tests=%s pdf_receipt=true deliberate_break_receipt=true output_redacted=true\n' "$EXPECTED_TEST_COUNT"
exit 0
