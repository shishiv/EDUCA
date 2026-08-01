#!/usr/bin/env bash
set -euo pipefail

APP_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
ROOT_DIR=$(cd "$APP_DIR/.." && pwd)
cd "$APP_DIR"

eval "$(pnpm exec supabase --workdir "$ROOT_DIR" status -o env 2>/dev/null | grep -E '^(API_URL|SERVICE_ROLE_KEY|DB_URL)=')"
export NEXT_PUBLIC_SUPABASE_URL="$API_URL"
export SUPABASE_SERVICE_ROLE_KEY="$SERVICE_ROLE_KEY"
export DB_URL
export PILOT_MODE=true
export PILOT_SYNTHETIC_DATA_ONLY=true
export PILOT_BACKUP_ENCRYPTION_PASSPHRASE='synthetic-local-restore-passphrase'

"$ROOT_DIR/supabase/tests/pilot/run-backup-restore.sh"
