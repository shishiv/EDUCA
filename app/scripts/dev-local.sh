#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
REPO_ROOT="$(cd "$APP_DIR/.." && pwd)"
source "$SCRIPT_DIR/pilot-port-range-lease.sh"
source "$SCRIPT_DIR/pilot-supabase-cleanup.sh"

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
  if [[ -n "$APP_PID" ]]; then
    kill -TERM -- "-$APP_PID" 2>/dev/null || kill -TERM "$APP_PID" 2>/dev/null || true
    wait "$APP_PID" 2>/dev/null || true
  fi
  if [[ "$SUPABASE_STARTED" == true && -n "$ISOLATED_PROJECT_DIR" ]]; then
    pilot_supabase_stop_project "$ISOLATED_PROJECT_DIR" "$SUPABASE_PROJECT_ID" >/dev/null 2>&1 || CLEANUP_FAILED=true
  fi
  [[ -z "$ISOLATED_PROJECT_DIR" ]] || rm -rf "$ISOLATED_PROJECT_DIR"
  pilot_port_range_lease_release >/dev/null 2>&1 || CLEANUP_FAILED=true
  if [[ "$CLEANUP_FAILED" == true && "$exit_code" -eq 0 ]]; then
    exit_code=1
  fi
  printf '\nLocal EDUCA environment removed.\n'
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
mkdir -p "$SUPABASE_CONFIG_DIR"
cp "$REPO_ROOT/supabase/config.toml" "$SUPABASE_CONFIG_DIR/config.toml"
ln -s "$REPO_ROOT/supabase/migrations" "$SUPABASE_CONFIG_DIR/migrations"
sed -i \
  -e "0,/port = 54321/s//port = $PORT_BASE/" \
  -e "0,/port = 54322/s//port = $((PORT_BASE + 1))/" \
  -e "0,/port = 54323/s//port = $((PORT_BASE + 2))/" \
  -e "0,/port = 54324/s//port = $((PORT_BASE + 3))/" \
  -e "0,/port = 54327/s//port = $((PORT_BASE + 6))/" \
  -e "0,/vector_port = 54328/s//vector_port = $((PORT_BASE + 7))/" \
  -e "0,/port = 54329/s//port = $((PORT_BASE + 8))/" \
  -e "s#site_url = \"http://127.0.0.1:3000\"#site_url = \"$APP_ORIGIN\"#" \
  -e "s#additional_redirect_urls = \[\"http://127.0.0.1:3000\"\]#additional_redirect_urls = [\"$APP_ORIGIN\"]#" \
  "$SUPABASE_CONFIG_DIR/config.toml"

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
  'Synthetic secretariat: secretaria@synthetic.invalid' \
  'Password: Synthetic-Only-2026!' \
  'Smoke route: sign in, open /dashboard, open the user menu, choose Sair do Sistema.' \
  'Cleanup: press Ctrl-C in this terminal.' \
  ''

set +e
wait "$APP_PID"
APP_EXIT=$?
set -e
APP_PID=''
exit "$APP_EXIT"
