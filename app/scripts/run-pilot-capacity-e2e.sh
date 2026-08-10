#!/usr/bin/env bash
set -euo pipefail

APP_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
ROOT_DIR=$(cd "$APP_DIR/.." && pwd)
ISOLATED_PROJECT_DIR="$ROOT_DIR/.pilot-capacity-supabase"
SUPABASE_CONFIG_DIR="$ISOLATED_PROJECT_DIR/supabase"
AUTH_STATE_PATH="$APP_DIR/playwright/.pilot-capacity/director.json"
APP_PID=''

choose_port_base() {
  local candidate=${PILOT_CAPACITY_PORT_BASE:-55321}
  while ss -ltn | awk '{print $4}' | grep -Eq ":($(seq "$candidate" "$((candidate + 8))" | paste -sd'|' -))$"; do
    candidate=$((candidate + 10))
  done
  printf '%s' "$candidate"
}

cleanup() {
  if [[ -n "$APP_PID" ]]; then
    kill "$APP_PID" 2>/dev/null || true
    wait "$APP_PID" 2>/dev/null || true
  fi
  if [[ -d "$ISOLATED_PROJECT_DIR" ]]; then
    pnpm exec supabase --workdir "$ISOLATED_PROJECT_DIR" stop --no-backup >/dev/null 2>&1 || true
  fi
  rm -rf "$ISOLATED_PROJECT_DIR"
  rm -rf "$(dirname "$AUTH_STATE_PATH")"
}
trap cleanup EXIT

for command in ss pnpm psql portless curl; do
  command -v "$command" >/dev/null || {
    echo "PILOT_CAPACITY_E2E_PREREQUISITE_MISSING: $command" >&2
    exit 1
  }
done

PORT_BASE=$(choose_port_base)
API_PORT=$PORT_BASE
DB_PORT=$((PORT_BASE + 1))
STUDIO_PORT=$((PORT_BASE + 2))
MAILPIT_PORT=$((PORT_BASE + 3))
ANALYTICS_PORT=$((PORT_BASE + 6))
VECTOR_PORT=$((PORT_BASE + 7))
POOLER_PORT=$((PORT_BASE + 8))

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
  "$SUPABASE_CONFIG_DIR/config.toml"

export NO_COLOR=1
pnpm exec supabase --workdir "$ISOLATED_PROJECT_DIR" start

eval "$(pnpm exec supabase --workdir "$ISOLATED_PROJECT_DIR" status -o env | grep -E '^(API_URL|PUBLISHABLE_KEY|SECRET_KEY|ANON_KEY|SERVICE_ROLE_KEY|DB_URL)=')"
export NEXT_PUBLIC_SUPABASE_URL="$API_URL"
export NEXT_PUBLIC_SUPABASE_ANON_KEY="${PUBLISHABLE_KEY:-$ANON_KEY}"
export SUPABASE_SERVICE_ROLE_KEY="${SECRET_KEY:-$SERVICE_ROLE_KEY}"
export SUPABASE_DB_URL="$DB_URL"
export NEXT_PUBLIC_PILOT_MODE=true
export PILOT_MODE=true
export PILOT_SYNTHETIC_DATA_ONLY=true
export PILOT_EXTERNAL_DEPLOY_APPROVED=false
export PILOT_LEGAL_APPROVAL_STATUS=not_approved
export PILOT_IMPORT_ENCRYPTION_KEY="$(printf 'synthetic-pilot-encryption-key!!' | base64 -w0)"
export PILOT_IMPORT_ENCRYPTION_KEY_ID=synthetic-local-v1
export PILOT_CAPACITY_AUTH_STATE_PATH="$AUTH_STATE_PATH"

pnpm exec supabase --workdir "$ISOLATED_PROJECT_DIR" db reset
psql "$DB_URL" -X -v ON_ERROR_STOP=1 -f "$ROOT_DIR/supabase/pilot/provision-pilot-module-gate.sql" >/dev/null
pnpm exec tsx scripts/seed-pilot-capacity.ts
pnpm exec tsx scripts/validate-pilot-capacity.ts
printf 'PILOT_CAPACITY_PHASE: build\n'
pnpm build

APP_LOG="$ISOLATED_PROJECT_DIR/next.log"
(
  cd "$APP_DIR"
  portless run --name educa-pilot-capacity pnpm start >"$APP_LOG" 2>&1
) &
APP_PID=$!

BASE_URL=''
for _ in $(seq 1 60); do
  BASE_URL=$(portless get educa-pilot-capacity 2>/dev/null || true)
  if [[ -n "$BASE_URL" ]] && curl --silent --show-error --insecure --fail "$BASE_URL/login" >/dev/null 2>&1; then
    break
  fi
  sleep 1
done
if [[ -z "$BASE_URL" ]] || ! curl --silent --show-error --insecure --fail "$BASE_URL/login" >/dev/null 2>&1; then
  echo 'PILOT_CAPACITY_E2E_SERVER_FAILED: named portless app did not become ready' >&2
  cat "$APP_LOG" >&2 || true
  exit 1
fi

export PLAYWRIGHT_BASE_URL="$BASE_URL"
export PILOT_CAPACITY_SERVER_MANAGED=true
export NODE_EXTRA_CA_CERTS="${NODE_EXTRA_CA_CERTS:-$HOME/.portless/ca.pem}"
printf 'PILOT_CAPACITY_E2E_RECEIPT: base_url=%s database=%s\n' "$PLAYWRIGHT_BASE_URL" "$ISOLATED_PROJECT_DIR"
pnpm exec playwright test --config playwright.pilot-capacity.config.ts
