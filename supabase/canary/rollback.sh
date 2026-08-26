#!/usr/bin/env bash
set -euo pipefail

CANARY_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
source "$CANARY_DIR/safety.sh"

command -v psql >/dev/null || {
  echo 'CANARY_PREREQUISITE_MISSING: psql' >&2
  exit 1
}

started_at=$(date +%s%N)
psql "$DB_URL" -X -v ON_ERROR_STOP=1 -f "$CANARY_DIR/rollback.sql" >/dev/null
elapsed_ms=$((($(date +%s%N) - started_at) / 1000000))
printf 'CANARY_ROLLBACK_OK schema=school_ca000000000000000000000000000001 elapsed_ms=%s\n' "$elapsed_ms"
