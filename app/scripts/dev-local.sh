#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
REPO_ROOT="$(cd "$APP_DIR/.." && pwd)"
source "$SCRIPT_DIR/pilot-port-range-lease.sh"
source "$SCRIPT_DIR/pilot-supabase-cleanup.sh"
source "$SCRIPT_DIR/pilot-local-runtime.sh"

for arg in "$@"; do
  case "$arg" in
    --reset) ;;
    --help|-h)
      printf '%s\n' \
        'Usage: pnpm dev:local [--reset]' \
        '' \
        'Starts an isolated local Supabase stack, loads deterministic synthetic pilot data,' \
        'starts EDUCA at a named .localhost URL, and removes the stack on exit.' \
        '' \
        'Prerequisites: Node.js 20+, pnpm 9+, Docker, and a running portless proxy.' \
        'Cleanup: press Ctrl-C in the same terminal.'
      exit 0
      ;;
    *)
      echo "ERROR: Unknown argument: $arg" >&2
      exit 1
      ;;
  esac
done

for command in docker pnpm portless curl ss setsid node psql; do
  command -v "$command" >/dev/null || {
    echo "ERROR: Missing prerequisite: $command" >&2
    exit 1
  }
done

docker info >/dev/null 2>&1 || {
  echo 'ERROR: Docker is not running or not accessible.' >&2
  exit 1
}
portless doctor 2>/dev/null | grep -q 'Proxy is responding' || {
  echo 'ERROR: portless proxy is not running. Start it with: portless proxy start' >&2
  exit 1
}

APP_NAME="educa-dev-local-$$"
APP_ORIGIN=$(cd "$APP_DIR" && portless get "$APP_NAME")
ISOLATED_PROJECT_DIR=''
SUPABASE_PROJECT_ID=''
SUPABASE_STARTED=false
APP_PID=''
CLEANUP_FAILED=false

cleanup() {
  local exit_code=$?
  trap - EXIT INT TERM
  set +e
  pilot_stop_app_process_group "$APP_PID" || CLEANUP_FAILED=true
  if [[ -n "$APP_PID" ]]; then
    pilot_verify_app_route_removed portless "$APP_NAME" || CLEANUP_FAILED=true
  fi
  if [[ "$SUPABASE_STARTED" == true && -n "$ISOLATED_PROJECT_DIR" ]]; then
    pilot_supabase_stop_project "$ISOLATED_PROJECT_DIR" "$SUPABASE_PROJECT_ID" >/dev/null 2>&1 || CLEANUP_FAILED=true
  fi
  [[ -z "$ISOLATED_PROJECT_DIR" ]] || rm -rf "$ISOLATED_PROJECT_DIR"
  pilot_port_range_lease_release >/dev/null 2>&1 || CLEANUP_FAILED=true
  if [[ "$CLEANUP_FAILED" == true && "$exit_code" -eq 0 ]]; then
    exit_code=1
  fi
  if [[ "$CLEANUP_FAILED" == true ]]; then
    printf '\nLocal EDUCA cleanup failed; inspect remaining project resources.\n' >&2
  else
    printf '\nLocal EDUCA environment removed.\n'
  fi
  exit "$exit_code"
}

trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

pilot_port_range_lease_acquire
PORT_BASE="$PILOT_E2E_PORT_BASE"
ISOLATED_PROJECT_DIR=$(mktemp -d "${TMPDIR:-/tmp}/educa-dev-local.XXXXXX")
SUPABASE_PROJECT_ID=$(basename "$ISOLATED_PROJECT_DIR")
SUPABASE_CONFIG_DIR="$ISOLATED_PROJECT_DIR/supabase"
pilot_local_project_init "$REPO_ROOT" "$ISOLATED_PROJECT_DIR" "$PORT_BASE" "$APP_ORIGIN"

unset NEXT_PUBLIC_SUPABASE_URL NEXT_PUBLIC_SUPABASE_ANON_KEY SUPABASE_SERVICE_ROLE_KEY
unset SUPABASE_DEMO_URL SUPABASE_DEMO_SERVICE_KEY SUPABASE_DEMO_DB_URL
unset SUPABASE_PROJECT_REF SUPABASE_ACCESS_TOKEN SUPABASE_DB_PASSWORD

SUPABASE_STARTED=true
if ! pnpm exec supabase --workdir "$ISOLATED_PROJECT_DIR" start >"$ISOLATED_PROJECT_DIR/start.log" 2>&1; then
  echo 'ERROR: isolated Supabase stack failed to start.' >&2
  exit 1
fi
STATUS_ENV=$(pnpm exec supabase --workdir "$ISOLATED_PROJECT_DIR" status -o env)
eval "$(printf '%s\n' "$STATUS_ENV" | grep -E '^(API_URL|DB_URL|PUBLISHABLE_KEY|SECRET_KEY)=')"
node - "$API_URL" "$DB_URL" <<'NODE'
const [api, database] = process.argv.slice(2).map(value => new URL(value))
const local = new Set(['127.0.0.1', 'localhost', '::1'])
if (!local.has(api.hostname) || !local.has(database.hostname)) process.exit(1)
NODE

export NEXT_PUBLIC_SUPABASE_URL="$API_URL"
export NEXT_PUBLIC_SUPABASE_ANON_KEY="$PUBLISHABLE_KEY"
export SUPABASE_SERVICE_ROLE_KEY="$SECRET_KEY"
export SUPABASE_DB_URL="$DB_URL"
export NEXT_PUBLIC_APP_URL="$APP_ORIGIN"
export NEXT_PUBLIC_DEMO_SANDBOX=false
export DEMO_SANDBOX=false
export NEXT_PUBLIC_PILOT_MODE=true
export PILOT_MODE=true
export PILOT_SYNTHETIC_DATA_ONLY=true
export PILOT_EXTERNAL_DEPLOY_APPROVED=false
export PILOT_LEGAL_APPROVAL_STATUS=not_approved
PILOT_IMPORT_ENCRYPTION_KEY="$(printf 'synthetic-pilot-encryption-key!!' | base64 -w0)"
export PILOT_IMPORT_ENCRYPTION_KEY
export PILOT_IMPORT_ENCRYPTION_KEY_ID=synthetic-local-v1

pnpm exec supabase --workdir "$ISOLATED_PROJECT_DIR" db reset --local
pnpm exec tsx scripts/pilot-safety-gate.ts seed
psql "$DB_URL" -X -v ON_ERROR_STOP=1 -f "$REPO_ROOT/supabase/pilot/provision-pilot-module-gate.sql"
pnpm exec tsx scripts/seed-pilot-synthetic.ts
pnpm exec tsx scripts/validate-pilot-canonical.ts

setsid portless run --name "$APP_NAME" pnpm dev >"$ISOLATED_PROJECT_DIR/app.log" 2>&1 &
APP_PID=$!
BASE_URL=''
for _ in $(seq 1 90); do
  BASE_URL=$(portless get "$APP_NAME" 2>/dev/null || true)
  if [[ -n "$BASE_URL" ]] && curl --silent --show-error --insecure --fail "$BASE_URL/login" >/dev/null 2>&1; then
    break
  fi
  sleep 1
done
if [[ -z "$BASE_URL" ]] || ! curl --silent --show-error --insecure --fail "$BASE_URL/login" >/dev/null 2>&1; then
  echo 'ERROR: EDUCA did not become ready.' >&2
  exit 1
fi

printf '%s\n' \
  '' \
  "EDUCA: $BASE_URL/login" \
  'Synthetic admin: admin@synthetic.invalid' \
  'Synthetic secretariat: secretaria@synthetic.invalid' \
  'Password: Synthetic-Only-2026!' \
  'Smoke route: sign in, open /dashboard, open the user menu, choose Sair do Sistema.' \
  'Cleanup: press Ctrl-C in this terminal.' \
  ''

set +e
wait "$APP_PID"
APP_EXIT=$?
set -e
exit "$APP_EXIT"
