#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)
MIGRATIONS_DIR="$ROOT_DIR/supabase/migrations"
TESTS_DIR="$ROOT_DIR/supabase/tests/database"
PILOT_PROVISIONING="$ROOT_DIR/supabase/pilot/provision-pilot-module-gate.sql"
CENSO_MIGRATION="20260719031000_add_censo_escolar_fields.sql"
RELATORIOS_MIGRATION="20260124133337_create_relatorios_descritivos.sql"
SECURITY_HARDENING_MIGRATION="20260810220000_governed_pilot_security_hardening.sql"
AUTH_AUDIT_SCOPE_MIGRATION="20260828000000_pilot_auth_audit_scope.sql"
ROLLBACK_STORAGE_MIGRATION="20260812231418_pilot_import_batch_rollback_storage.sql"
IMPORT_OWNER_AGREEMENT_MIGRATION="20260814000000_governed_import_owner_agreement.sql"
AUTH_REVOCATION_MIGRATION="20260812231541_pilot_auth_revocation_boundary.sql"
BOLSA_VISIBILITY_MIGRATION="20260815000000_bolsa_familia_visibility_policy.sql"
SENSITIVE_FAMILY_MIGRATION="20260829000000_sensitive_family_read_boundary.sql"
CANONICAL_GUARDIAN_LINK_MIGRATION="20260830000000_canonical_guardian_link_reads.sql"
ACADEMIC_YEAR_MIGRATION="20260826010000_school_academic_years.sql"
AUTH_MUTATION_RECEIPTS_MIGRATION="20260907000000_auth_mutation_audit_receipts.sql"
GOVERNED_MANAGEMENT_MIGRATION="20260908040000_governed_management_mutations.sql"
WHATSAPP_DELIVERY_MIGRATION="20260908050000_whatsapp_delivery_ownership.sql"
PILOT_IMPORT_REJECTION_MIGRATION="20260908060000_pilot_import_rejection_receipts.sql"
GOVERNED_MANAGEMENT_ATOMIC_UPDATES_MIGRATION="20260908070000_governed_management_atomic_updates.sql"

for command in initdb pg_ctl psql pg_dump diff sed; do
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

mkdir -p "$SOCKET_DIR" "$WORK_DIR/source/supabase"
# Freeze this invocation's schema and contracts while other work continues.
cp -a "$ROOT_DIR/supabase/migrations" "$WORK_DIR/source/supabase/migrations"
cp -a "$ROOT_DIR/supabase/tests" "$WORK_DIR/source/supabase/tests"
cp -a "$ROOT_DIR/supabase/pilot" "$WORK_DIR/source/supabase/pilot"
MIGRATIONS_DIR="$WORK_DIR/source/supabase/migrations"
TESTS_DIR="$WORK_DIR/source/supabase/tests/database"
PILOT_PROVISIONING="$WORK_DIR/source/supabase/pilot/provision-pilot-module-gate.sql"
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
  if [[ $(basename "$migration") == "$ACADEMIC_YEAR_MIGRATION" ]]; then
    "${PSQL[@]}" -f "$TESTS_DIR/school_academic_year.before.sql" >/dev/null
  fi

  if [[ $(basename "$migration") == '20260914000000_narrative_sources_and_school_periods.sql' ]]; then
    "${PSQL[@]}" -c 'CREATE DATABASE narrative_legacy TEMPLATE postgres' >/dev/null
    LEGACY_PSQL=("${PSQL[@]}" -d narrative_legacy)
    "${LEGACY_PSQL[@]}" -f "$TESTS_DIR/narrative_sources.before.sql" >/dev/null
    "${LEGACY_PSQL[@]}" -f "$migration" >/dev/null
    "${LEGACY_PSQL[@]}" -f "$TESTS_DIR/narrative_sources_legacy.contract.sql" >/dev/null
    "${PSQL[@]}" -c 'DROP DATABASE narrative_legacy' >/dev/null
    echo 'NARRATIVE_LEGACY_COMPATIBILITY_OK: isolated pre-migration report remains readable and immutable without fabricated sources'
  fi

  echo "Applying $(basename "$migration")"
  "${PSQL[@]}" -f "$migration" >/dev/null
done

echo 'Running session_realtime_publication.contract.sql'
"${PSQL[@]}" -f "$TESTS_DIR/session_realtime_publication.contract.sql" >/dev/null

# Check legacy replay on an isolated copy, leaving the canonical chain intact
# for every contract below. Compare complete schema and ACL dumps, excluding
# only pg_dump's random client-side restriction token.
dump_catalog() {
  pg_dump -h "$SOCKET_DIR" -p "$PORT" -U postgres -d "$1" \
    --schema-only --no-owner \
    | sed -e '/^\\restrict /d' -e '/^\\unrestrict /d'
}

dump_catalog postgres > "$WORK_DIR/canonical-catalog.sql"
"${PSQL[@]}" -c 'CREATE DATABASE legacy_replay TEMPLATE postgres' >/dev/null
REPLAY_PSQL=("${PSQL[@]}" -d legacy_replay)
echo "Replaying $RELATORIOS_MIGRATION on an isolated copy"
"${REPLAY_PSQL[@]}" -f "$MIGRATIONS_DIR/$RELATORIOS_MIGRATION" >/dev/null

# These finalizers restore the policies/functions replaced by the legacy
# report migration and earlier finalizers. A new migration changing one of
# these objects must preserve the catalog comparison below.
REPLAY_FINALIZERS=(
  "$SECURITY_HARDENING_MIGRATION"
  "$ROLLBACK_STORAGE_MIGRATION"
  "$AUTH_REVOCATION_MIGRATION"
  "$IMPORT_OWNER_AGREEMENT_MIGRATION"
  "$BOLSA_VISIBILITY_MIGRATION"
  "$AUTH_AUDIT_SCOPE_MIGRATION"
  "$SENSITIVE_FAMILY_MIGRATION"
  "$CANONICAL_GUARDIAN_LINK_MIGRATION"
  "$AUTH_MUTATION_RECEIPTS_MIGRATION"
  "$GOVERNED_MANAGEMENT_MIGRATION"
  "$WHATSAPP_DELIVERY_MIGRATION"
  "$PILOT_IMPORT_REJECTION_MIGRATION"
  "$GOVERNED_MANAGEMENT_ATOMIC_UPDATES_MIGRATION"
  "20260908090000_whatsapp_governed_enqueue.sql"
  "20260908100000_invitation_audit_recovery.sql"
)
for finalizer in "${REPLAY_FINALIZERS[@]}"; do
  echo "Reapplying $finalizer after legacy replay"
  "${REPLAY_PSQL[@]}" -f "$MIGRATIONS_DIR/$finalizer" >/dev/null
done
dump_catalog legacy_replay > "$WORK_DIR/replay-catalog.sql"
diff -u "$WORK_DIR/canonical-catalog.sql" "$WORK_DIR/replay-catalog.sql"
echo "CANONICAL_REPLAY_CATALOG_PARITY_OK: schema, functions, policies, triggers and grants match"
"${PSQL[@]}" -c 'DROP DATABASE legacy_replay' >/dev/null

echo "Applying pilot-only provisioning $(basename "$PILOT_PROVISIONING")"
"${PSQL[@]}" -f "$PILOT_PROVISIONING" >/dev/null

mapfile -t tests < <(find "$TESTS_DIR" -maxdepth 1 -type f -name '*.test.sql' -print | sort)
for test_file in "${tests[@]}"; do
  echo "Running $(basename "$test_file")"
  "${PSQL[@]}" -f "$test_file" >/dev/null
done

echo 'Running descriptive_report_finalization_concurrency.sh'
PGHOST="$SOCKET_DIR" \
PGPORT="$PORT" \
PGUSER=postgres \
PGDATABASE=postgres \
  "$TESTS_DIR/descriptive_report_finalization_concurrency.sh"

# The pilot provisioning above intentionally blocks NIS/PBF fixtures. Run the
# conditionality contract in its own isolated database without that pilot-only
# high-risk field guard.
"$TESTS_DIR/run-attendance-conditionality-contract.sh"

echo "Database migration tests passed"
