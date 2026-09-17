#!/usr/bin/env bash
# Disposable local rehearsal of the repository's real general Playwright manifest.
set -euo pipefail
ROOT=$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)
cd "$ROOT/app"
source scripts/pilot-local-runtime.sh
source scripts/pilot-port-range-lease.sh
source scripts/pilot-supabase-cleanup.sh
EVIDENCE="${GENERAL_E2E_EVIDENCE_DIR:-$ROOT/artifacts/quality-integration/general}"
mkdir -p "$EVIDENCE"
PROJECT=$(mktemp -d "$ROOT/.quality-general.XXXXXX")
PROJECT_ID=$(basename "$PROJECT")
PROJECT_ID="${PROJECT_ID#.}"
CONFIG="$PWD/playwright.quality.local.config.ts"
[[ ! -e "$CONFIG" && ! -e "$ROOT/app/playwright/.auth" ]] || { echo 'Temporary config or auth state already exists' >&2; exit 1; }
APP_PID=''
STARTED=false
cleanup() {
  local result=$?
  trap - EXIT INT TERM
  set +e
  pilot_stop_app_process_group "$APP_PID" || result=1
  if [[ "$STARTED" == true ]]; then
    pilot_supabase_stop_project "$PROJECT" "$PROJECT_ID" > "$EVIDENCE/cleanup.log" 2>&1 || result=1
  fi
  pilot_port_range_lease_release || result=1
  for name in supabase-start build server test; do
    redact_file "$PROJECT/$name.log" "$EVIDENCE/$name.log"
    if [[ -f "$EVIDENCE/$name.log" ]]; then
      sed -i -E 's/"(JWT_SECRET|S3_PROTOCOL_ACCESS_KEY_ID|S3_PROTOCOL_ACCESS_KEY_SECRET)":"[^"]*"/"\1":"[REDACTED_LOCAL_SECRET]"/g' "$EVIDENCE/$name.log"
    fi
  done
  rm -f "$CONFIG"
  rm -rf "$PROJECT" "$ROOT/app/playwright/.auth"
  printf 'GENERAL_E2E_EXIT=%s\n' "$result" | tee "$EVIDENCE/result.txt"
  exit "$result"
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
unset NEXT_PUBLIC_SUPABASE_URL NEXT_PUBLIC_SUPABASE_ANON_KEY SUPABASE_SERVICE_ROLE_KEY SUPABASE_DB_URL
unset SUPABASE_PROJECT_REF SUPABASE_ACCESS_TOKEN SUPABASE_DB_PASSWORD VERCEL_TOKEN PILOT_AUTH_STATE_PATH
pilot_port_range_lease_acquire
APP_PORT=$((PILOT_E2E_PORT_BASE + 9))
export PLAYWRIGHT_BASE_URL="http://localhost:$APP_PORT"
pilot_local_project_init "$ROOT" "$PROJECT" "$PILOT_E2E_PORT_BASE" "$PLAYWRIGHT_BASE_URL"
STARTED=true
pnpm exec supabase --workdir "$PROJECT" start > "$PROJECT/supabase-start.log" 2>&1
STATUS=$(pnpm exec supabase --workdir "$PROJECT" status -o env 2>/dev/null)
eval "$(printf '%s\n' "$STATUS" | grep -E '^(API_URL|PUBLISHABLE_KEY|SECRET_KEY|DB_URL)=')"
export NEXT_PUBLIC_SUPABASE_URL="$API_URL" NEXT_PUBLIC_SUPABASE_ANON_KEY="$PUBLISHABLE_KEY"
export SUPABASE_SERVICE_ROLE_KEY="$SECRET_KEY" SUPABASE_DB_URL="$DB_URL"
export NEXT_PUBLIC_APP_URL="$PLAYWRIGHT_BASE_URL" PILOT_MODE=false NEXT_PUBLIC_PILOT_MODE=false
export NEXT_PUBLIC_DEMO_SANDBOX=false DEMO_SANDBOX=false PILOT_SYNTHETIC_DATA_ONLY=true
export PILOT_EXTERNAL_DEPLOY_APPROVED=false PILOT_LEGAL_APPROVAL_STATUS=not_approved
export NEXT_PUBLIC_EDUCA_E2E_MODE=true EDUCA_E2E_MODE=true NEXT_TELEMETRY_DISABLED=1
pnpm build > "$PROJECT/build.log" 2>&1
setsid pnpm run start --hostname 127.0.0.1 --port "$APP_PORT" > "$PROJECT/server.log" 2>&1 &
APP_PID=$!
for _ in $(seq 1 60); do
  if curl --silent --fail "$PLAYWRIGHT_BASE_URL/login" >/dev/null; then break; fi
  sleep 1
done
curl --silent --fail "$PLAYWRIGHT_BASE_URL/login" >/dev/null
# Override transport only: keep the exact project's setup, selection, timeout and assertions.
cat > "$CONFIG" <<'TS'
import { defineConfig } from '@playwright/test'
import config from './playwright.config'
export default defineConfig({
  ...config,
  webServer: undefined,
  use: { ...config.use, launchOptions: { executablePath: '/usr/bin/chromium' } },
})
TS
pnpm exec playwright test --config "$CONFIG" --workers=1 --max-failures=1 --reporter=line "$@" > "$PROJECT/test.log" 2>&1
