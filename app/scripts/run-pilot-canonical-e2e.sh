#!/usr/bin/env bash
set -euo pipefail

APP_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
ROOT_DIR=$(cd "$APP_DIR/.." && pwd)
cd "$APP_DIR"
source "$APP_DIR/scripts/pilot-local-runtime.sh"
source "$APP_DIR/scripts/pilot-supabase-cleanup.sh"
source "$APP_DIR/scripts/pilot-port-range-lease.sh"
PILOT_RUNTIME_FAILURE_PREFIX=PILOT_CANONICAL_E2E_FAILED
ISOLATED_PROJECT_DIR=$(mktemp -d "$ROOT_DIR/.pilot-r1-canonical-supabase.XXXXXX")
SUPABASE_CONFIG_DIR="$ISOLATED_PROJECT_DIR/supabase"
AUTH_DIR="$ISOLATED_PROJECT_DIR/auth"
AUTH_STATE_PATH="$AUTH_DIR/teacher.json"
RECEIPT_DIR="$ROOT_DIR/.pilot-evidence"
RUN_ID="$(date -u +%Y%m%dT%H%M%SZ)-$$"
RECEIPT_STEM="$RECEIPT_DIR/r1-canonical-pilot-e2e-$RUN_ID"
FINAL_RECEIPT="$RECEIPT_STEM.json"
TEST_OUTPUT_EVIDENCE="$RECEIPT_STEM.test-output.txt"
DATABASE_EVIDENCE="$RECEIPT_STEM.database.json"
AUTH_EVIDENCE="$RECEIPT_STEM.identity.json"
BROWSER_EVIDENCE="$RECEIPT_STEM.browser.json"
SUPABASE_PROJECT_ID=$(basename "$ISOLATED_PROJECT_DIR")
SUPABASE_PROJECT_ID="${SUPABASE_PROJECT_ID#.}"
SUPABASE_STARTED=false
SUPABASE_READY=false
PILOT_GATE_APPLIED=false
SYNTHETIC_SEED_APPLIED=false
APP_NAME="educa-r1-canonical-$$"
APP_SERVER_MODE=portless
APP_ROUTE_REMOVED=false
AUTH_STATE_REMOVED=false
CLEANUP_FAILED=false
PORT_LEASE_RELEASE_FAILED=false
APP_PID=''
BASE_URL=''
RESULT='failed'
TEST_EXIT=1
APP_STOPPED=false
DATABASE_STOPPED=false
TEMP_REMOVED=false
AUTH_REMOVED=false
APP_LOG=''
DELIBERATE_BREAK=${PILOT_CANONICAL_DELIBERATE_BREAK:-none}

mkdir -p "$RECEIPT_DIR"

cleanup() {
  local exit_code=$?
  trap - EXIT INT TERM
  set +e

  pilot_cleanup_services
  AUTH_REMOVED="$AUTH_STATE_REMOVED"

  if [[ -f "$ISOLATED_PROJECT_DIR/database-receipt.json" ]]; then
    cp "$ISOLATED_PROJECT_DIR/database-receipt.json" "$DATABASE_EVIDENCE"
  fi
  if [[ -f "$ISOLATED_PROJECT_DIR/auth-receipt.json" ]]; then
    cp "$ISOLATED_PROJECT_DIR/auth-receipt.json" "$AUTH_EVIDENCE"
  fi
  if [[ -f "$ISOLATED_PROJECT_DIR/browser-receipt.json" ]]; then
    cp "$ISOLATED_PROJECT_DIR/browser-receipt.json" "$BROWSER_EVIDENCE"
  fi
  if [[ -f "$ISOLATED_PROJECT_DIR/playwright-output.log" ]]; then
    redact_file "$ISOLATED_PROJECT_DIR/playwright-output.log" "$TEST_OUTPUT_EVIDENCE"
  fi
  if [[ "$exit_code" -ne 0 && -n "$APP_LOG" && -f "$APP_LOG" ]]; then
    redact_file "$APP_LOG" "$RECEIPT_STEM.app-log.txt"
  fi

  pilot_cleanup_project
  if [[ "$CLEANUP_FAILED" == true ]]; then
    RESULT=failed
    if [[ "$exit_code" -eq 0 ]]; then exit_code=1; fi
  fi

  SUPABASE_READY="$SUPABASE_READY" PILOT_GATE_APPLIED="$PILOT_GATE_APPLIED" SYNTHETIC_SEED_APPLIED="$SYNTHETIC_SEED_APPLIED" node - "$FINAL_RECEIPT" "$DATABASE_EVIDENCE" "$AUTH_EVIDENCE" "$BROWSER_EVIDENCE" "$TEST_OUTPUT_EVIDENCE" "$exit_code" "$RESULT" "$APP_STOPPED" "$DATABASE_STOPPED" "$TEMP_REMOVED" "$AUTH_REMOVED" "$BASE_URL" "$DELIBERATE_BREAK" "$APP_ROUTE_REMOVED" "$PILOT_E2E_PORT_LEASE_RELEASED" <<'NODE'
const fs = require('node:fs')
const path = require('node:path')

const [receiptPath, databasePath, authPath, browserPath, testOutputPath, exitCode, result, appStopped, databaseStopped, tempRemoved, authRemoved, baseUrl, deliberateBreak, routeRemoved, leaseReleased] = process.argv.slice(2)
const readJson = file => fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : null
const lineCount = file => fs.existsSync(file) ? fs.readFileSync(file, 'utf8').split(/\r?\n/).filter(Boolean).length : 0
const relative = file => path.relative(process.cwd(), file)
const parsedBaseUrl = baseUrl ? new URL(baseUrl) : null

const receipt = {
  contract: 'R1 bounded canonical pilot E2E',
  result,
  exitCode: Number(exitCode),
  command: 'cd app && pnpm test:e2e:pilot:canonical',
  setup: {
    isolatedLocalSupabase: process.env.SUPABASE_READY === 'true',
    pilotGateApplied: process.env.PILOT_GATE_APPLIED === 'true',
    syntheticSeedApplied: process.env.SYNTHETIC_SEED_APPLIED === 'true',
    publicDemoUsed: false,
    externalCredentialsUsed: false,
    appServer: 'portless',
    namedBaseUrl: baseUrl || null,
    numberedUrl: parsedBaseUrl ? parsedBaseUrl.port !== '' : false,
  },
  database: readJson(databasePath),
  syntheticIdentity: readJson(authPath),
  browser: readJson(browserPath),
  testOutput: {
    path: fs.existsSync(testOutputPath) ? relative(testOutputPath) : null,
    lines: lineCount(testOutputPath),
  },
  cleanup: {
    appStopped: appStopped === 'true',
    namedRouteRemoved: routeRemoved === 'true',
    portRangeLeaseReleased: leaseReleased === 'true',
    databaseStopped: databaseStopped === 'true',
    isolatedDirectoryRemoved: tempRemoved === 'true',
    syntheticAuthStateRemoved: authRemoved === 'true',
  },
  deliberateBreak: deliberateBreak === 'none' ? null : deliberateBreak,
  followUp: {
    legacyPilotRunner: 'R3: app/scripts/run-pilot-e2e.sh remains broader and is not repaired by R1',
  },
}
fs.writeFileSync(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`, 'utf8')
NODE

  printf 'PILOT_CANONICAL_CLEANUP_RECEIPT: app_stopped=%s database_stopped=%s isolated_removed=%s auth_state_removed=%s receipt=%s\n' \
    "$APP_STOPPED" "$DATABASE_STOPPED" "$TEMP_REMOVED" "$AUTH_REMOVED" "$FINAL_RECEIPT"
  exit "$exit_code"
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

for command in ss docker pnpm psql portless curl node setsid; do
  command -v "$command" >/dev/null || {
    echo "PILOT_CANONICAL_E2E_PREREQUISITE_MISSING: $command" >&2
    exit 1
  }
done

# R1 owns a separate lease and lifecycle from the aggregate.
pilot_port_range_lease_acquire
PORT_BASE="$PILOT_E2E_PORT_BASE"
API_PORT=$PORT_BASE
DB_PORT=$((PORT_BASE + 1))
STUDIO_PORT=$((PORT_BASE + 2))
MAILPIT_PORT=$((PORT_BASE + 3))
ANALYTICS_PORT=$((PORT_BASE + 6))
VECTOR_PORT=$((PORT_BASE + 7))
POOLER_PORT=$((PORT_BASE + 8))
CANONICAL_DATE=$(TZ=America/Sao_Paulo date +%F)

APP_ORIGIN=$(portless get "$APP_NAME")
pilot_local_project_init "$ROOT_DIR" "$ISOLATED_PROJECT_DIR" "$PORT_BASE" "$APP_ORIGIN"

SUPABASE_LOG="$ISOLATED_PROJECT_DIR/supabase-start.log"
STATUS_LOG="$ISOLATED_PROJECT_DIR/supabase-status.log"
DB_RESET_LOG="$ISOLATED_PROJECT_DIR/db-reset.log"
GATE_LOG="$ISOLATED_PROJECT_DIR/pilot-gate.log"
GATE_SQL_LOG="$ISOLATED_PROJECT_DIR/pilot-gate-sql.log"
SEED_LOG="$ISOLATED_PROJECT_DIR/seed.log"
VALIDATE_LOG="$ISOLATED_PROJECT_DIR/validate.log"
BUILD_LOG="$ISOLATED_PROJECT_DIR/build.log"
APP_LOG="$ISOLATED_PROJECT_DIR/next.log"

export NO_COLOR=1
SUPABASE_STARTED=true
run_captured 'supabase_start' "$SUPABASE_LOG" pnpm exec supabase --workdir "$ISOLATED_PROJECT_DIR" start
SUPABASE_READY=true

STATUS_ENV=$(pnpm exec supabase --workdir "$ISOLATED_PROJECT_DIR" status -o env 2>"$STATUS_LOG") || {
  echo 'PILOT_CANONICAL_E2E_FAILED: phase=supabase_status' >&2
  show_log_on_failure "$STATUS_LOG"
  exit 1
}
eval "$(printf '%s\n' "$STATUS_ENV" | grep -E '^(API_URL|PUBLISHABLE_KEY|SECRET_KEY|ANON_KEY|SERVICE_ROLE_KEY|DB_URL)=')"

export NEXT_PUBLIC_SUPABASE_URL="$API_URL"
export NEXT_PUBLIC_SUPABASE_ANON_KEY="${PUBLISHABLE_KEY:-${ANON_KEY:-}}"
export SUPABASE_SERVICE_ROLE_KEY="${SECRET_KEY:-${SERVICE_ROLE_KEY:-}}"
export SUPABASE_DB_URL="$DB_URL"
export NEXT_PUBLIC_APP_URL="$APP_ORIGIN"
export NEXT_PUBLIC_PILOT_MODE=true
export PILOT_MODE=true
export PILOT_SYNTHETIC_DATA_ONLY=true
export PILOT_EXTERNAL_DEPLOY_APPROVED=false
export PILOT_LEGAL_APPROVAL_STATUS=not_approved
export PILOT_IMPORT_ENCRYPTION_KEY="$(printf 'synthetic-pilot-encryption-key!!' | base64 -w0)"
export PILOT_IMPORT_ENCRYPTION_KEY_ID=synthetic-local-v1
export EDUCA_E2E_MODE=true
export NEXT_PUBLIC_EDUCA_E2E_MODE=true
export NEXT_PUBLIC_DEMO_SANDBOX=false
export DEMO_SANDBOX=false
export PILOT_CANONICAL_DATE="$CANONICAL_DATE"
export PILOT_CANONICAL_AUTH_STATE_PATH="$AUTH_STATE_PATH"
export PILOT_CANONICAL_AUTH_RECEIPT_PATH="$ISOLATED_PROJECT_DIR/auth-receipt.json"
export PILOT_CANONICAL_DATABASE_RECEIPT_PATH="$ISOLATED_PROJECT_DIR/database-receipt.json"
export PILOT_CANONICAL_BROWSER_RECEIPT_PATH="$ISOLATED_PROJECT_DIR/browser-receipt.json"
export PILOT_CANONICAL_OUTPUT_DIR="$ISOLATED_PROJECT_DIR/playwright-output"

run_captured 'db_reset' "$DB_RESET_LOG" pnpm exec supabase --workdir "$ISOLATED_PROJECT_DIR" db reset
run_captured 'pilot_safety_gate' "$GATE_LOG" pnpm exec tsx scripts/pilot-safety-gate.ts seed
run_captured 'pilot_module_gate_sql' "$GATE_SQL_LOG" psql "$DB_URL" -X -v ON_ERROR_STOP=1 -f "$ROOT_DIR/supabase/pilot/provision-pilot-module-gate.sql"
PILOT_GATE_APPLIED=true
run_captured 'synthetic_seed' "$SEED_LOG" pnpm exec tsx scripts/seed-pilot-synthetic.ts
SYNTHETIC_SEED_APPLIED=true
if [[ "$DELIBERATE_BREAK" == 'security' ]]; then
  psql "$DB_URL" -X -v ON_ERROR_STOP=1 -c 'DROP POLICY pilot_frequencia_insert ON public.frequencia' >>"$SEED_LOG" 2>&1
  printf 'PILOT_CANONICAL_DELIBERATE_BREAK: target=security expected=red\n'
elif [[ "$DELIBERATE_BREAK" != 'none' ]]; then
  echo 'PILOT_CANONICAL_DELIBERATE_BREAK_INVALID: expected security or unset' >&2
  exit 1
fi
run_captured 'canonical_database_validation' "$VALIDATE_LOG" pnpm exec tsx scripts/validate-pilot-canonical.ts
grep '^PILOT_CANONICAL_' "$VALIDATE_LOG" || true

run_captured 'build' "$BUILD_LOG" pnpm build
printf 'PILOT_CANONICAL_BUILD_RECEIPT: status=pass\n'

setsid portless run --name "$APP_NAME" pnpm start >"$APP_LOG" 2>&1 &
APP_PID=$!

for _ in $(seq 1 60); do
  BASE_URL=$(cd "$APP_DIR" && portless get "$APP_NAME" 2>/dev/null || true)
  if [[ -n "$BASE_URL" ]] && curl --silent --show-error --insecure --fail "$BASE_URL/login" >/dev/null 2>&1; then
    break
  fi
  sleep 1
done
if [[ -z "$BASE_URL" ]] || ! curl --silent --show-error --insecure --fail "$BASE_URL/login" >/dev/null 2>&1; then
  echo 'PILOT_CANONICAL_E2E_SERVER_FAILED: named portless app did not become ready' >&2
  show_log_on_failure "$APP_LOG"
  exit 1
fi

export PLAYWRIGHT_BASE_URL="$BASE_URL"
export PILOT_CANONICAL_SERVER_MANAGED=true
unset NODE_EXTRA_CA_CERTS
PORTLESS_CA_PATH="${PORTLESS_STATE_DIR:-$HOME/.portless}/ca.pem"
if [[ -f "$PORTLESS_CA_PATH" ]]; then
  export NODE_EXTRA_CA_CERTS="$PORTLESS_CA_PATH"
fi
NUMBERED_URL=false
if node -e 'process.exit(new URL(process.argv[1]).port ? 0 : 1)' "$BASE_URL"; then
  NUMBERED_URL=true
fi
printf 'PILOT_CANONICAL_SETUP_RECEIPT: isolated_local_supabase=true pilot_gate=applied synthetic_seed=applied named_url_ready=true numbered_url=%s\n' "$NUMBERED_URL"
printf 'PILOT_CANONICAL_COMMAND_RECEIPT: cd app && pnpm test:e2e:pilot:canonical\n'

set +e
pnpm exec playwright test --config playwright.pilot-canonical.config.ts 2>&1 | tee "$ISOLATED_PROJECT_DIR/playwright-output.log"
TEST_EXIT=${PIPESTATUS[0]}
set -e
if [[ "$TEST_EXIT" -ne 0 ]]; then
  echo "PILOT_CANONICAL_E2E_FAILED: phase=browser status=$TEST_EXIT" >&2
  exit "$TEST_EXIT"
fi

RESULT='passed'
TEST_EXIT=0
printf 'PILOT_CANONICAL_TEST_OUTPUT_RECEIPT: status=pass lines=%s\n' "$(wc -l < "$ISOLATED_PROJECT_DIR/playwright-output.log")"
exit 0
