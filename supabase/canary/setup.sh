#!/usr/bin/env bash
set -euo pipefail

CANARY_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
source "$CANARY_DIR/safety.sh"

for command in psql sha256sum; do
  command -v "$command" >/dev/null || {
    echo "CANARY_PREREQUISITE_MISSING: $command" >&2
    exit 1
  }
done

school_id='ca000000-0000-0000-0000-000000000001'
canary_schema='school_ca000000000000000000000000000001'
tenant_version_checksum=$(sha256sum "$CANARY_DIR/tenant-v1.sql" | cut -d' ' -f1)
started_at=$(date +%s%N)

psql "$DB_URL" \
  -X \
  -v ON_ERROR_STOP=1 \
  -v school_id="$school_id" \
  -v canary_schema="$canary_schema" \
  -v tenant_version_checksum="$tenant_version_checksum" \
  -f "$CANARY_DIR/setup.sql" >/dev/null

elapsed_ms=$((($(date +%s%N) - started_at) / 1000000))
printf 'CANARY_SETUP_OK schema=%s version=1 checksum=%s elapsed_ms=%s\n' \
  "$canary_schema" "$tenant_version_checksum" "$elapsed_ms"
