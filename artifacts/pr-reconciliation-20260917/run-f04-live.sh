#!/usr/bin/env bash
# Reuses the canonical local lifecycle for the two preserved F04 live contracts.
set -euo pipefail
ROOT=$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)
EVIDENCE="${F04_EVIDENCE_DIR:-$ROOT/.pilot-evidence/f04-reconciliation-$(date -u +%Y%m%dT%H%M%SZ)-$$}"
[[ "$EVIDENCE" == /* ]] || { echo 'F04_EVIDENCE_DIR_MUST_BE_ABSOLUTE' >&2; exit 1; }
WORK=$(mktemp -d "$ROOT/.reconciliation-f04.XXXXXX")
PROJECT_ID=$(basename "$WORK")
PROJECT_ID="${PROJECT_ID#.}"
APP_PID=''
STARTED=false
mkdir -p "$EVIDENCE"
cd "$ROOT/app"
source scripts/pilot-local-runtime.sh
source scripts/pilot-port-range-lease.sh
source scripts/pilot-supabase-cleanup.sh
cleanup() {
  local result=$?
  trap - EXIT INT TERM
  set +e
  pilot_stop_app_process_group "$APP_PID" || result=1
  if [[ "$STARTED" == true ]]; then
    pilot_supabase_stop_project "$WORK" "$PROJECT_ID" >"$WORK/cleanup.log" 2>&1 || result=1
  fi
  pilot_port_range_lease_release || result=1
  for name in start reset gate seed app test cleanup; do
    redact_file "$WORK/$name.log" "$EVIDENCE/$name.log" || result=1
    if [[ -f "$EVIDENCE/$name.log" ]]; then
      sed -i -E 's/"(JWT_SECRET|S3_PROTOCOL_ACCESS_KEY_ID|S3_PROTOCOL_ACCESS_KEY_SECRET)":"[^"]*"/"\1":"[REDACTED_LOCAL_SECRET]"/g' "$EVIDENCE/$name.log" || result=1
    fi
  done
  rm -rf "$WORK" || result=1
  [[ ! -e "$WORK" ]] || result=1
  printf 'F04_RECONCILIATION_EXIT=%s\n' "$result" | tee "$EVIDENCE/result.txt"
  exit "$result"
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
unset NEXT_PUBLIC_SUPABASE_URL NEXT_PUBLIC_SUPABASE_ANON_KEY SUPABASE_SERVICE_ROLE_KEY SUPABASE_DB_URL
unset SUPABASE_DEMO_URL SUPABASE_DEMO_SERVICE_KEY SUPABASE_DEMO_DB_URL SUPABASE_PROJECT_REF SUPABASE_ACCESS_TOKEN SUPABASE_DB_PASSWORD VERCEL_TOKEN
unset API_URL DB_URL PUBLISHABLE_KEY SECRET_KEY
pilot_port_range_lease_acquire
ORIGIN="http://127.0.0.1:$((PILOT_E2E_PORT_BASE+9))"
pilot_local_project_init "$ROOT" "$WORK" "$PILOT_E2E_PORT_BASE" "$ORIGIN"
STARTED=true
pnpm exec supabase --workdir "$WORK" start >"$WORK/start.log" 2>&1
STATUS_ENV=$(pnpm exec supabase --workdir "$WORK" status -o env 2>/dev/null)
eval "$(printf '%s\n' "$STATUS_ENV" | grep -E '^(API_URL|DB_URL|PUBLISHABLE_KEY|SECRET_KEY)=')"
export NEXT_PUBLIC_SUPABASE_URL="$API_URL" NEXT_PUBLIC_SUPABASE_ANON_KEY="$PUBLISHABLE_KEY"
export SUPABASE_SERVICE_ROLE_KEY="$SECRET_KEY" SUPABASE_DB_URL="$DB_URL" NEXT_PUBLIC_APP_URL="$ORIGIN"
export NEXT_PUBLIC_DEMO_SANDBOX=false DEMO_SANDBOX=false NEXT_PUBLIC_PILOT_MODE=true PILOT_MODE=true
export PILOT_SYNTHETIC_DATA_ONLY=true PILOT_EXTERNAL_DEPLOY_APPROVED=false PILOT_LEGAL_APPROVAL_STATUS=not_approved
export PILOT_IMPORT_ENCRYPTION_KEY="$(printf 'synthetic-pilot-encryption-key!!' | base64 -w0)" PILOT_IMPORT_ENCRYPTION_KEY_ID=synthetic-local-v1
pnpm exec tsx scripts/pilot-safety-gate.ts seed >"$WORK/gate.log" 2>&1
pnpm exec supabase --workdir "$WORK" db reset --local >"$WORK/reset.log" 2>&1
psql "$DB_URL" -X -v ON_ERROR_STOP=1 -f "$ROOT/supabase/pilot/provision-pilot-module-gate.sql" >>"$WORK/gate.log" 2>&1
pnpm exec tsx scripts/seed-pilot-synthetic.ts >"$WORK/seed.log" 2>&1
setsid /usr/bin/node node_modules/next/dist/bin/next dev --webpack --hostname 127.0.0.1 --port "$((PILOT_E2E_PORT_BASE+9))" >"$WORK/app.log" 2>&1 &
APP_PID=$!
for attempt in $(seq 1 90); do
  if curl --silent --fail "$ORIGIN/login" >/dev/null; then break; fi
  sleep 1
done
curl --silent --fail "$ORIGIN/login" >/dev/null
EDUCA_LIVE_SUPABASE=1 EDUCA_USER_STATUS_DB_TEST=1 EDUCA_USER_STATUS_HTTP_TEST=1 pnpm exec vitest run \
  tests/live/user-status-atomic.live.test.ts tests/live/user-status-concurrency.live.test.ts \
  --maxWorkers=1 --no-file-parallelism >"$WORK/test.log" 2>&1
