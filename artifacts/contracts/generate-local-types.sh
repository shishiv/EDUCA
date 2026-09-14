#!/usr/bin/env bash
set -euo pipefail
ROOT=$(cd "$(dirname "$0")/../.." && pwd)
cd "$ROOT/app"
source scripts/pilot-local-runtime.sh
source scripts/pilot-port-range-lease.sh
source scripts/pilot-supabase-cleanup.sh
project="$ROOT/.pilot-evidence/contracts-types-$$"
project_id=$(basename "$project")
cleanup() {
  pilot_supabase_stop_project "$project" "$project_id"
  rm -rf "$project"
  pilot_port_range_lease_release
}
trap cleanup EXIT
pilot_port_range_lease_acquire
pilot_local_project_init "$ROOT" "$project" "$PILOT_E2E_PORT_BASE"
pnpm exec supabase --workdir "$project" start
pnpm exec supabase --workdir "$project" gen types typescript --local > "$project/database.ts"
cp "$project/database.ts" types/database.ts
