#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)
MIGRATIONS_DIR="$ROOT_DIR/supabase/migrations"
TESTS_DIR="$ROOT_DIR/supabase/tests/database"
PILOT_PROVISIONING="$ROOT_DIR/supabase/pilot/provision-pilot-module-gate.sql"
CENSO_MIGRATION="20260719031000_add_censo_escolar_fields.sql"
RELATORIOS_MIGRATION="20260124133337_create_relatorios_descritivos.sql"

for command in initdb pg_ctl psql; do
  if ! command -v "$command" >/dev/null 2>&1; then
    echo "error: $command is required to run the isolated capacity contract" >&2
    exit 1
  fi
done

WORK_DIR=$(mktemp -d "${TMPDIR:-/tmp}/educa-capacity-postgres.XXXXXX")
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

PSQL=(psql -X -h "$SOCKET_DIR" -p "$PORT" -U postgres -d postgres -v ON_ERROR_STOP=1)

"${PSQL[@]}" -f "$TESTS_DIR/bootstrap.sql" >/dev/null
mapfile -t migrations < <(find "$MIGRATIONS_DIR" -maxdepth 1 -type f -name '*.sql' -print | sort)
for migration in "${migrations[@]}"; do
  if [[ $(basename "$migration") == "$CENSO_MIGRATION" ]]; then
    "${PSQL[@]}" -f "$TESTS_DIR/censo_escolar_schema.before.sql" >/dev/null
  fi
  "${PSQL[@]}" -f "$migration" >/dev/null
done
"${PSQL[@]}" -f "$MIGRATIONS_DIR/$RELATORIOS_MIGRATION" >/dev/null
"${PSQL[@]}" -f "$PILOT_PROVISIONING" >/dev/null

# The ordinary SQL test proves the guard's single-row, multi-row, and status
# transition behavior in the same isolated raw PostgreSQL database.
"${PSQL[@]}" -f "$TESTS_DIR/pilot_capacity.test.sql" >/dev/null

export PGHOST="$SOCKET_DIR"
export PGPORT="$PORT"
export PGUSER=postgres
export PGDATABASE=postgres

"$TESTS_DIR/pilot_capacity_concurrency.sh"

"${PSQL[@]}" >/dev/null <<'SQL'
BEGIN;
DROP TRIGGER pilot_lock_matricula_capacity ON public.matriculas;
DROP TRIGGER pilot_validate_matricula_capacity_insert ON public.matriculas;
DROP TRIGGER pilot_validate_matricula_capacity_update ON public.matriculas;
COMMIT;
SQL

set +e
"$TESTS_DIR/pilot_capacity_concurrency.sh" expect-overflow
break_status=$?
set -e
if [[ "$break_status" -ne 0 ]]; then
  echo 'DELIBERATE_BREAK_FAILED: removing the guard did not expose the concurrent overflow' >&2
  exit 1
fi
echo 'DELIBERATE_BREAK_RED: bypassed capacity triggers and observed two active enrollments'

"${PSQL[@]}" -f "$MIGRATIONS_DIR/20260810042648_enforce_pilot_enrollment_capacity.sql" >/dev/null
"$TESTS_DIR/pilot_capacity_concurrency.sh"
echo 'RESTORED_GREEN: restored migration and rejected the concurrent overflow'

echo 'PILOT_CAPACITY_DATABASE_CONTRACT_OK: isolated PostgreSQL migration, concurrency, deliberate-break, and restore checks passed'
