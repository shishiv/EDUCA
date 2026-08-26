#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)
CANARY_DIR="$ROOT_DIR/supabase/canary"
TEST_DIR="$ROOT_DIR/supabase/tests/canary"
MIGRATIONS_DIR="$ROOT_DIR/supabase/migrations"
WORK_DIR=$(mktemp -d "${TMPDIR:-/tmp}/educa-schema-canary.XXXXXX")
DATA_DIR="$WORK_DIR/data"
SOCKET_DIR="$WORK_DIR/socket"
PORT=${POSTGRES_CANARY_PORT:-$((55000 + $$ % 5000))}
DB_URL="postgresql://postgres@127.0.0.1:$PORT/postgres"
RESTORE_DB='educa_schema_canary_restore'
RESTORE_URL="postgresql://postgres@127.0.0.1:$PORT/$RESTORE_DB"
CANARY_SCHOOL_ID='ca000000-0000-0000-0000-000000000001'
CANARY_SCHEMA='school_ca000000000000000000000000000001'
SERVER_STARTED=false

for command in initdb pg_ctl psql pg_dump pg_restore createdb sha256sum diff python3; do
  command -v "$command" >/dev/null || {
    echo "CANARY_PREREQUISITE_MISSING: $command" >&2
    exit 1
  }
done

cleanup() {
  if [[ "$SERVER_STARTED" == true ]]; then
    pg_ctl -D "$DATA_DIR" -m immediate -w stop >/dev/null
  fi
  rm -rf "$WORK_DIR"
}
trap cleanup EXIT

mkdir -p "$SOCKET_DIR"
initdb -D "$DATA_DIR" -A trust --no-locale --encoding=UTF8 --username=postgres >/dev/null
pg_ctl -D "$DATA_DIR" -l "$WORK_DIR/postgres.log" -o "-F -h 127.0.0.1 -k '$SOCKET_DIR' -p $PORT" -w start >/dev/null
SERVER_STARTED=true

apply_schema() {
  local database_url=$1
  local bootstrap_file="$ROOT_DIR/supabase/tests/database/bootstrap.sql"
  if [[ $(psql "$database_url" -X -Atq -v ON_ERROR_STOP=1 -c "SELECT to_regrole('authenticated') IS NOT NULL") == t ]]; then
    bootstrap_file="$TEST_DIR/restore-bootstrap.sql"
  fi
  psql "$database_url" -X -v ON_ERROR_STOP=1 -f "$bootstrap_file" >/dev/null
  while IFS= read -r migration; do
    psql "$database_url" -X -v ON_ERROR_STOP=1 -f "$migration" >/dev/null
  done < <(find "$MIGRATIONS_DIR" -maxdepth 1 -type f -name '*.sql' -print | sort)
}

catalog_snapshot() {
  local database_url=$1
  local schema=$2
  local school_id=$3
  local destination=$4
  psql "$database_url" -X -Atq -v ON_ERROR_STOP=1 \
    -v schema="$schema" \
    -v school_id="$school_id" \
    -f "$TEST_DIR/catalog.sql" > "$destination"
}

data_snapshot() {
  local database_url=$1
  local schema=$2
  local destination=$3
  psql "$database_url" -X -Atq -v ON_ERROR_STOP=1 -c "
    SELECT record
    FROM (
      SELECT 'anos_letivos|' || to_jsonb(row_record)::text AS record
      FROM (SELECT * FROM \"$schema\".anos_letivos ORDER BY id) AS row_record
      UNION ALL
      SELECT 'configs|' || to_jsonb(row_record)::text
      FROM (SELECT * FROM \"$schema\".configs ORDER BY id) AS row_record
      UNION ALL
      SELECT 'tenant_identity|' || to_jsonb(row_record)::text
      FROM (SELECT * FROM \"$schema\".tenant_identity ORDER BY school_id) AS row_record
    ) AS records
    ORDER BY record
  " > "$destination"
}

apply_schema "$DB_URL"
tenant_version_checksum=$(sha256sum "$CANARY_DIR/tenant-v1.sql" | cut -d' ' -f1)

setup_output=$(CANARY_TARGET=local-synthetic CANARY_DATA_MODE=synthetic DB_URL="$DB_URL" "$CANARY_DIR/setup.sh")
echo "$setup_output"

psql "$DB_URL" -X -v ON_ERROR_STOP=1 \
  -v tenant_version_checksum="$tenant_version_checksum" \
  -f "$TEST_DIR/assertions.sql" >/dev/null

python3 - "$ROOT_DIR/supabase/config.toml" "$CANARY_SCHEMA" <<'PY'
import sys
import tomllib

with open(sys.argv[1], "rb") as config_file:
    exposed = tomllib.load(config_file)["api"]["schemas"]
if sys.argv[2] in exposed or exposed != ["public"]:
    raise SystemExit(f"CANARY_EXPOSURE_INVALID: {exposed}")
PY

if grep -R -F "$CANARY_SCHEMA" "$ROOT_DIR/app" >/dev/null; then
  echo 'CANARY_APPLICATION_ROUTE_DETECTED' >&2
  exit 1
fi

echo 'CANARY_CATALOG_SECURITY_OK'

catalog_snapshot "$DB_URL" "$CANARY_SCHEMA" "$CANARY_SCHOOL_ID" "$WORK_DIR/source.catalog"
data_snapshot "$DB_URL" "$CANARY_SCHEMA" "$WORK_DIR/source.data"
source_data_checksum=$(sha256sum "$WORK_DIR/source.data" | cut -d' ' -f1)

export_started_at=$(date +%s%N)
pg_dump "$DB_URL" \
  --format=custom \
  --schema="$CANARY_SCHEMA" \
  --strict-names \
  --no-owner \
  --no-privileges \
  --file="$WORK_DIR/canary.dump"
export_elapsed_ms=$((($(date +%s%N) - export_started_at) / 1000000))
archive_checksum=$(sha256sum "$WORK_DIR/canary.dump" | cut -d' ' -f1)
cp "$WORK_DIR/canary.dump" "$WORK_DIR/canary.transferred.dump"
[[ "$archive_checksum" == "$(sha256sum "$WORK_DIR/canary.transferred.dump" | cut -d' ' -f1)" ]]
printf 'CANARY_EXPORT_OK checksum=%s elapsed_ms=%s\n' "$archive_checksum" "$export_elapsed_ms"

createdb -h 127.0.0.1 -p "$PORT" -U postgres "$RESTORE_DB"
apply_schema "$RESTORE_URL"
restore_started_at=$(date +%s%N)
psql "$RESTORE_URL" -X -v ON_ERROR_STOP=1 -c "CREATE SCHEMA \"$CANARY_SCHEMA\"" >/dev/null
pg_restore \
  --dbname="$RESTORE_URL" \
  --single-transaction \
  --exit-on-error \
  --no-owner \
  --no-privileges \
  --schema="$CANARY_SCHEMA" \
  "$WORK_DIR/canary.transferred.dump"
psql "$RESTORE_URL" -X -v ON_ERROR_STOP=1 \
  -v canary_schema="$CANARY_SCHEMA" \
  -f "$TEST_DIR/finalize-restore.sql" >/dev/null
restore_elapsed_ms=$((($(date +%s%N) - restore_started_at) / 1000000))

catalog_snapshot "$RESTORE_URL" "$CANARY_SCHEMA" "$CANARY_SCHOOL_ID" "$WORK_DIR/restored.catalog"
data_snapshot "$RESTORE_URL" "$CANARY_SCHEMA" "$WORK_DIR/restored.data"
diff -u "$WORK_DIR/source.catalog" "$WORK_DIR/restored.catalog"
diff -u "$WORK_DIR/source.data" "$WORK_DIR/restored.data"
restored_data_checksum=$(sha256sum "$WORK_DIR/restored.data" | cut -d' ' -f1)
[[ "$source_data_checksum" == "$restored_data_checksum" ]]
printf 'CANARY_RESTORE_OK data_checksum=%s elapsed_ms=%s\n' "$restored_data_checksum" "$restore_elapsed_ms"

run_benchmark() {
  local count=$1
  local sql_file="$WORK_DIR/benchmark-$count.sql"
  local cleanup_file="$WORK_DIR/benchmark-$count-cleanup.sql"
  local first_schema=''
  local first_school_id=''
  printf 'BEGIN;\n' > "$sql_file"
  printf 'BEGIN;\n' > "$cleanup_file"

  for ((index = 1; index <= count; index++)); do
    local suffix
    local school_id
    local schema
    suffix=$(printf '%012d' "$index")
    school_id="cb000000-0000-0000-0000-$suffix"
    schema="school_${school_id//-/}"
    if [[ -z "$first_schema" ]]; then
      first_schema=$schema
      first_school_id=$school_id
    fi
    printf "INSERT INTO public.escolas(id,codigo,nome,tipo,ativo) VALUES ('%s','CANARY-BENCH-%s','Escola Sintetica Benchmark %s','fundamental',true);\n" "$school_id" "$suffix" "$suffix" >> "$sql_file"
    printf "INSERT INTO public.school_schema_registry(school_id,schema_name,schema_version,routing_state,is_synthetic) VALUES ('%s','%s',0,'provisioning',true);\n" "$school_id" "$schema" >> "$sql_file"
    printf "\\set school_id %s\n\\set canary_schema %s\n\\ir %s/tenant-v1.sql\n" "$school_id" "$schema" "$CANARY_DIR" >> "$sql_file"
    printf "INSERT INTO public.school_schema_versions(school_id,version,checksum) VALUES ('%s',1,'%s');\n" "$school_id" "$tenant_version_checksum" >> "$sql_file"
    printf "UPDATE public.school_schema_registry SET schema_version=1,routing_state='disabled',updated_at=now() WHERE school_id='%s';\n" "$school_id" >> "$sql_file"
    printf "DROP SCHEMA %s CASCADE;\nDELETE FROM public.school_schema_versions WHERE school_id='%s';\nDELETE FROM public.school_schema_registry WHERE school_id='%s';\nDELETE FROM public.configs WHERE escola_id='%s';\nDELETE FROM public.anos_letivos WHERE escola_id='%s';\nDELETE FROM public.escolas WHERE id='%s';\n" "$schema" "$school_id" "$school_id" "$school_id" "$school_id" "$school_id" >> "$cleanup_file"
  done

  printf 'COMMIT;\n' >> "$sql_file"
  printf 'COMMIT;\n' >> "$cleanup_file"
  local started_at
  local elapsed_ms
  started_at=$(date +%s%N)
  psql "$DB_URL" -X -v ON_ERROR_STOP=1 -f "$sql_file" >/dev/null
  elapsed_ms=$((($(date +%s%N) - started_at) / 1000000))
  catalog_snapshot "$DB_URL" "$first_schema" "$first_school_id" "$WORK_DIR/benchmark-$count-reference.catalog"

  for ((index = 1; index <= count; index++)); do
    local suffix
    local school_id
    local schema
    suffix=$(printf '%012d' "$index")
    school_id="cb000000-0000-0000-0000-$suffix"
    schema="school_${school_id//-/}"
    catalog_snapshot "$DB_URL" "$schema" "$school_id" "$WORK_DIR/benchmark-$count-$index.catalog"
    diff -u "$WORK_DIR/benchmark-$count-reference.catalog" "$WORK_DIR/benchmark-$count-$index.catalog"
  done

  psql "$DB_URL" -X -v ON_ERROR_STOP=1 -f "$cleanup_file" >/dev/null
  printf 'CANARY_MIGRATION_BENCHMARK_OK schemas=%s elapsed_ms=%s\n' "$count" "$elapsed_ms"
}

run_benchmark 1
run_benchmark 10
run_benchmark 25

rollback_output=$(CANARY_TARGET=local-synthetic CANARY_DATA_MODE=synthetic DB_URL="$DB_URL" "$CANARY_DIR/rollback.sh")
echo "$rollback_output"

rollback_state=$(psql "$DB_URL" -X -Atq -v ON_ERROR_STOP=1 -c "
  SELECT to_regnamespace('$CANARY_SCHEMA') IS NULL
    AND NOT EXISTS (SELECT 1 FROM public.school_schema_registry WHERE school_id = '$CANARY_SCHOOL_ID'::uuid)
    AND NOT EXISTS (SELECT 1 FROM public.school_schema_versions WHERE school_id = '$CANARY_SCHOOL_ID'::uuid)
    AND EXISTS (SELECT 1 FROM public.escolas WHERE id = '$CANARY_SCHOOL_ID'::uuid)
")
[[ "$rollback_state" == t ]]

echo 'CANARY_CHECKS_OK'
