#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)
MIGRATIONS_DIR="$ROOT_DIR/supabase/migrations"
TESTS_DIR="$ROOT_DIR/supabase/tests/database"
CENSO_MIGRATION="20260719031000_add_censo_escolar_fields.sql"
RELATORIOS_MIGRATION="20260124133337_create_relatorios_descritivos.sql"

for command in initdb pg_ctl psql; do
  if ! command -v "$command" >/dev/null 2>&1; then
    echo "error: $command is required to run the isolated attendance conditionality contract" >&2
    exit 1
  fi
done

WORK_DIR=$(mktemp -d "${TMPDIR:-/tmp}/educa-attendance-conditionality.XXXXXX")
DATA_DIR="$WORK_DIR/data"
SOCKET_DIR="$WORK_DIR/socket"
PORT=${POSTGRES_TEST_PORT:-$((50000 + $$ % 10000))}
SERVER_STARTED=false

cleanup() {
  if [[ "$SERVER_STARTED" == true ]]; then
    pg_ctl -D "$DATA_DIR" -m immediate -w stop >/dev/null
  fi
  rm -rf "$WORK_DIR"
}
trap cleanup EXIT

mkdir -p "$SOCKET_DIR"
initdb -D "$DATA_DIR" -A trust --no-locale --encoding=UTF8 --username=postgres >/dev/null
pg_ctl \
  -D "$DATA_DIR" \
  -l "$WORK_DIR/postgres.log" \
  -o "-F -k '$SOCKET_DIR' -p $PORT" \
  -w start >/dev/null
SERVER_STARTED=true

PSQL=(
  psql
  -X
  -h "$SOCKET_DIR"
  -p "$PORT"
  -U postgres
  -d postgres
  -v ON_ERROR_STOP=1
)

"${PSQL[@]}" -f "$TESTS_DIR/bootstrap.sql" >/dev/null
mapfile -t migrations < <(find "$MIGRATIONS_DIR" -maxdepth 1 -type f -name '*.sql' -print | sort)
for migration in "${migrations[@]}"; do
  if [[ $(basename "$migration") == "$CENSO_MIGRATION" ]]; then
    "${PSQL[@]}" -f "$TESTS_DIR/censo_escolar_schema.before.sql" >/dev/null
  fi
  echo "Applying $(basename "$migration")"
  "${PSQL[@]}" -f "$migration" >/dev/null
done

"${PSQL[@]}" -f "$MIGRATIONS_DIR/$RELATORIOS_MIGRATION" >/dev/null

# The pilot provisioning file is intentionally not applied here. The contract
# needs synthetic NIS/PBF rows to exercise the real legal read model.
echo "Running attendance_conditionality.contract.sql"
"${PSQL[@]}" -f "$TESTS_DIR/attendance_conditionality.contract.sql"

echo "ATTENDANCE_CONDITIONALITY_DATABASE_CONTRACT_OK: isolated PostgreSQL legal floors, municipality margins, fallback, precedence, completion derivation, and audit passed"
