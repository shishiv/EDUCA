#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)
MIGRATIONS_DIR="$ROOT_DIR/supabase/migrations"
TESTS_DIR="$ROOT_DIR/supabase/tests/database"
PILOT_PROVISIONING="$ROOT_DIR/supabase/pilot/provision-pilot-module-gate.sql"
CENSO_MIGRATION="20260719031000_add_censo_escolar_fields.sql"
RELATORIOS_MIGRATION="20260124133337_create_relatorios_descritivos.sql"
SECURITY_HARDENING_MIGRATION="20260810220000_governed_pilot_security_hardening.sql"
ROLLBACK_STORAGE_MIGRATION="20260812231418_pilot_import_batch_rollback_storage.sql"
AUTH_REVOCATION_MIGRATION="20260812231541_pilot_auth_revocation_boundary.sql"
BOLSA_VISIBILITY_MIGRATION="20260815000000_bolsa_familia_visibility_policy.sql"

for command in initdb pg_ctl psql; do
  if ! command -v "$command" >/dev/null 2>&1; then
    echo "error: $command is required to run database migration tests" >&2
    exit 1
  fi
done

WORK_DIR=$(mktemp -d "${TMPDIR:-/tmp}/educa-postgres-test.XXXXXX")
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

echo "Replaying $RELATORIOS_MIGRATION"
"${PSQL[@]}" -f "$MIGRATIONS_DIR/$RELATORIOS_MIGRATION" >/dev/null
# The replayed legacy report migration recreates its old policies. Reapply the
# final hardening so this isolated database matches the deployed migration state.
echo "Reapplying $(basename "$SECURITY_HARDENING_MIGRATION") after legacy replay"
"${PSQL[@]}" -f "$MIGRATIONS_DIR/$SECURITY_HARDENING_MIGRATION" >/dev/null
echo "Reapplying $(basename "$ROLLBACK_STORAGE_MIGRATION") after legacy replay"
"${PSQL[@]}" -f "$MIGRATIONS_DIR/$ROLLBACK_STORAGE_MIGRATION" >/dev/null
# The legacy replay also replaces the pilot users policy. Reapply the final
# active-profile boundary so the isolated database matches the deployed state.
echo "Reapplying $(basename "$AUTH_REVOCATION_MIGRATION") after legacy replay"
"${PSQL[@]}" -f "$MIGRATIONS_DIR/$AUTH_REVOCATION_MIGRATION" >/dev/null
echo "Reapplying $(basename "$BOLSA_VISIBILITY_MIGRATION") after legacy replay"
"${PSQL[@]}" -f "$MIGRATIONS_DIR/$BOLSA_VISIBILITY_MIGRATION" >/dev/null

echo "Applying pilot-only provisioning $(basename "$PILOT_PROVISIONING")"
"${PSQL[@]}" -f "$PILOT_PROVISIONING" >/dev/null

mapfile -t tests < <(find "$TESTS_DIR" -maxdepth 1 -type f -name '*.test.sql' -print | sort)
for test_file in "${tests[@]}"; do
  echo "Running $(basename "$test_file")"
  "${PSQL[@]}" -f "$test_file" >/dev/null
done

# The pilot provisioning above intentionally blocks NIS/PBF fixtures. Run the
# conditionality contract in its own isolated database without that pilot-only
# high-risk field guard.
"$TESTS_DIR/run-attendance-conditionality-contract.sh"

echo "Database migration tests passed"
