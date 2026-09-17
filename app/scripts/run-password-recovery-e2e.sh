#!/usr/bin/env bash
# Local-only F03 rehearsal. Browser calls are serialized through chrome-devtools-axi.
set -euo pipefail
umask 077
APP_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
ROOT_DIR=$(cd "$APP_DIR/.." && pwd)
cd "$APP_DIR"
export PATH="/usr/bin:$PATH"
/usr/bin/node -e 'if (process.versions.node.split(".")[0] !== "26") process.exit(1)'
[[ "$(pnpm --version)" == 9.* ]] || { echo 'F03_PNPM9_REQUIRED' >&2; exit 1; }
[[ -f "${CHROME_DEVTOOLS_AXI_MCP_PATH:-}" ]] || {
  echo 'F03_MCP_PATH_REQUIRED: select an already installed chrome-devtools-mcp entrypoint; no download is permitted' >&2
  exit 1
}
source scripts/pilot-port-range-lease.sh
source scripts/pilot-supabase-cleanup.sh
source scripts/pilot-local-runtime.sh
# Keep the lease bookkeeping inside this disposable worktree. Docker/TCP probes
# still reject resources owned by other worktrees.
export PILOT_E2E_PORT_LEASE_ROOT="$ROOT_DIR/.pilot-evidence/f03-leases"
PROJECT=''
APP_PID=''
TEST_PID=''
STARTED=false
RESULT=failed
RECEIPT="$ROOT_DIR/.pilot-evidence/f03-${F03_MODE:-green}.json"
cleanup() {
  local code=$? clean=true
  trap - EXIT INT TERM
  set +e
  pilot_stop_app_process_group "$TEST_PID" || clean=false
  for browser in requester other; do
    if [[ -n "$PROJECT" && -d "$PROJECT/browser-$browser" ]]; then
      HOME="$PROJECT/browser-$browser" CHROME_DEVTOOLS_AXI_SESSION="$browser" chrome-devtools-axi stop >/dev/null 2>&1 || clean=false
    fi
  done
  pilot_stop_app_process_group "$APP_PID" || clean=false
  if [[ "$STARTED" == true ]]; then
    pilot_supabase_stop_project "$PROJECT" "$(basename "$PROJECT")" >"$PROJECT/stop.log" 2>&1 || clean=false
  fi
  if [[ "$code" -ne 0 && -n "$PROJECT" ]]; then
    for log in start safety gate seed build; do
      if [[ -f "$PROJECT/$log.log" ]]; then
        printf 'F03 diagnostic phase=%s\n' "$log"
        redact_file "$PROJECT/$log.log" "$PROJECT/$log.redacted"
        grep -Ev 'JWT_SECRET|S3_PROTOCOL_ACCESS|"(ANON_KEY|SERVICE_ROLE_KEY|SECRET_KEY|PUBLISHABLE_KEY)"' "$PROJECT/$log.redacted" | tail -n 8
      fi
    done
  fi
  if [[ -n "$PROJECT" ]]; then rm -rf "$PROJECT"; fi
  pilot_port_range_lease_release >/dev/null || clean=false
  [[ "$clean" == true ]] || { code=1; RESULT=failed; }
  printf '{"result":"%s","exitCode":%s,"cleanup":%s,"localOnly":true,"syntheticOnly":true,"browserWorkers":1,"credentialsRetained":false,"headSha":"%s","mode":"%s"}\n' "$RESULT" "$code" "$clean" "$(git rev-parse HEAD)" "${F03_MODE:-green}" > "$RECEIPT"
  printf 'F03: result=%s cleanup=%s receipt=%s\n' "$RESULT" "$clean" "$RECEIPT"
  exit "$code"
}
mkdir -p "$ROOT_DIR/.pilot-evidence"
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
pilot_port_range_lease_acquire
PROJECT=$(mktemp -d "$ROOT_DIR/f03-local.XXXXXX")
export F03_PROJECT="$PROJECT"
export F03_ORIGIN="http://127.0.0.1:$((PILOT_E2E_PORT_BASE + 9))"
export F03_MAIL="http://127.0.0.1:$((PILOT_E2E_PORT_BASE + 3))"
pilot_local_project_init "$ROOT_DIR" "$PROJECT" "$PILOT_E2E_PORT_BASE" "$F03_ORIGIN"
/usr/bin/node <<'NODE'
const fs = require('node:fs')
const path = require('node:path')
const project = process.env.F03_PROJECT
const file = path.join(project, 'supabase/config.toml')
let config = fs.readFileSync(file, 'utf8')
config = config.replace(/^additional_redirect_urls = .*$/m, `additional_redirect_urls = ["${process.env.F03_ORIGIN}/login", "${process.env.F03_ORIGIN}/reset-password/complete"]`)
config += `\n[auth.email.smtp]\nenabled = true\nhost = "supabase_inbucket_${path.basename(project)}"\nport = 1025\nuser = "local"\npass = "local"\nadmin_email = "noreply@synthetic.invalid"\nsender_name = "Synthetic EDUCA"\n`
fs.writeFileSync(file, config)
NODE
unset NEXT_PUBLIC_SUPABASE_URL NEXT_PUBLIC_SUPABASE_ANON_KEY SUPABASE_SERVICE_ROLE_KEY SUPABASE_DB_URL
unset SUPABASE_DEMO_URL SUPABASE_DEMO_SERVICE_KEY SUPABASE_DEMO_DB_URL
unset SUPABASE_PROJECT_REF SUPABASE_ACCESS_TOKEN SUPABASE_DB_PASSWORD VERCEL_TOKEN
STARTED=true
pnpm exec supabase --workdir "$PROJECT" start >"$PROJECT/start.log" 2>&1
STATUS_ENV=$(pnpm exec supabase --workdir "$PROJECT" status -o env 2>"$PROJECT/status.log")
eval "$(printf '%s\n' "$STATUS_ENV" | grep -E '^(API_URL|DB_URL|PUBLISHABLE_KEY|SECRET_KEY)=')"
export NEXT_PUBLIC_SUPABASE_URL="$API_URL" NEXT_PUBLIC_SUPABASE_ANON_KEY="$PUBLISHABLE_KEY"
export SUPABASE_SERVICE_ROLE_KEY="$SECRET_KEY" SUPABASE_DB_URL="$DB_URL"
export NEXT_PUBLIC_APP_URL="$F03_ORIGIN" NEXT_PUBLIC_DEMO_SANDBOX=false DEMO_SANDBOX=false
export NEXT_PUBLIC_PILOT_MODE=true PILOT_MODE=true PILOT_SYNTHETIC_DATA_ONLY=true
export PILOT_EXTERNAL_DEPLOY_APPROVED=false PILOT_LEGAL_APPROVAL_STATUS=not_approved
pnpm exec tsx scripts/pilot-safety-gate.ts seed >"$PROJECT/safety.log" 2>&1
psql "$DB_URL" -X -v ON_ERROR_STOP=1 -f "$ROOT_DIR/supabase/pilot/provision-pilot-module-gate.sql" >"$PROJECT/gate.log" 2>&1
pnpm exec tsx scripts/seed-pilot-synthetic.ts >"$PROJECT/seed.log" 2>&1
# The development pass reproduces React Strict Mode and SDK initialization.
if [[ "${F03_BUILD:-false}" == true ]]; then
  CIRCLE_NODE_TOTAL=2 pnpm build >"$PROJECT/build.log" 2>&1
  printf 'PASS production build; workers=2\n'
  setsid pnpm start --hostname 127.0.0.1 --port "$((PILOT_E2E_PORT_BASE + 9))" >"$PROJECT/app.log" 2>&1 &
else
  setsid pnpm dev --hostname 127.0.0.1 --port "$((PILOT_E2E_PORT_BASE + 9))" >"$PROJECT/app.log" 2>&1 &
fi
APP_PID=$!
for _ in $(seq 1 90); do
  if curl -fsS "$F03_ORIGIN/login" >/dev/null 2>&1; then break; fi
  sleep 1
done
curl -fsS "$F03_ORIGIN/login" >/dev/null
setsid pnpm exec tsx tests/e2e/recovery/password-recovery.axi.ts &
TEST_PID=$!
wait "$TEST_PID"
RESULT=passed
