#!/usr/bin/env bash
set -euo pipefail

APP_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
ROOT_DIR=$(cd "$APP_DIR/.." && pwd)
cd "$APP_DIR"

pnpm exec supabase --workdir "$ROOT_DIR" status >/dev/null
eval "$(pnpm exec supabase --workdir "$ROOT_DIR" status -o env 2>/dev/null | grep -E '^(API_URL|ANON_KEY|SERVICE_ROLE_KEY|DB_URL)=')"

export NEXT_PUBLIC_SUPABASE_URL="$API_URL"
export NEXT_PUBLIC_SUPABASE_ANON_KEY="$ANON_KEY"
export SUPABASE_SERVICE_ROLE_KEY="$SERVICE_ROLE_KEY"
export NEXT_PUBLIC_APP_URL="http://127.0.0.1:3000"
export NEXT_PUBLIC_PILOT_MODE=true
export PILOT_MODE=true
export PILOT_SYNTHETIC_DATA_ONLY=true
export PILOT_EXTERNAL_DEPLOY_APPROVED=false
export PILOT_LEGAL_APPROVAL_STATUS=not_approved
export PILOT_IMPORT_ENCRYPTION_KEY="$(printf 'synthetic-pilot-encryption-key!!' | base64 -w0)"
export PILOT_IMPORT_ENCRYPTION_KEY_ID=synthetic-local-v1
export PLAYWRIGHT_SERVER_COMMAND="pnpm build && pnpm start"
export PILOT_AUTH_STATE_PATH="$APP_DIR/.pilot-e2e/auth/user.json"

# This path is owned by the synthetic harness. Never delete browser-profile or
# developer auth state outside this one test artifact.
node -e "require('node:fs').rmSync(process.env.PILOT_AUTH_STATE_PATH, { force: true })"

pnpm exec supabase --workdir "$ROOT_DIR" db reset
pnpm exec tsx scripts/seed-pilot-synthetic.ts
pnpm exec playwright test tests/e2e/pilot --project=chromium
