#!/usr/bin/env bash
set -euo pipefail
IFS=$'\n\t'

ROOT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)
APP_DIR="$ROOT_DIR/app"
MIGRATIONS_DIR="$ROOT_DIR/supabase/migrations"
PILOT_PROVISIONING="$ROOT_DIR/supabase/pilot/provision-pilot-module-gate.sql"
EVIDENCE_FILE="$ROOT_DIR/.pilot-evidence/synthetic-restore-evidence.md"

EXPECTED_TARGET='isolated-proof'
EXPECTED_DATABASE_TARGET='isolated_proof'
EXPECTED_DATA_MODE='synthetic'
EXPECTED_SYNTHETIC_MARKER='SYNTHETIC-EDUCA-PILOT'

: "${DB_URL:?DB_URL is required}"
: "${NEXT_PUBLIC_SUPABASE_URL:?NEXT_PUBLIC_SUPABASE_URL is required}"
: "${SUPABASE_SERVICE_ROLE_KEY:?SUPABASE_SERVICE_ROLE_KEY is required}"
: "${PILOT_MODE:?PILOT_MODE is required}"
: "${PILOT_SYNTHETIC_DATA_ONLY:?PILOT_SYNTHETIC_DATA_ONLY is required}"
: "${PILOT_IMPORT_TARGET:?PILOT_IMPORT_TARGET is required}"
: "${PILOT_IMPORT_DATA_MODE:?PILOT_IMPORT_DATA_MODE is required}"
: "${PILOT_IMPORT_SYNTHETIC_MARKER:?PILOT_IMPORT_SYNTHETIC_MARKER is required}"

case "$NEXT_PUBLIC_SUPABASE_URL" in
  http://127.0.0.1:*|http://localhost:*) ;;
  *) echo "PILOT_RESTORE_SAFETY_GATE: only local synthetic Supabase is allowed" >&2; exit 1 ;;
esac

[[ "$PILOT_MODE" == true && "$PILOT_SYNTHETIC_DATA_ONLY" == true ]] || {
  echo "PILOT_RESTORE_SAFETY_GATE: synthetic-only pilot mode is required" >&2
  exit 1
}
[[ "$PILOT_IMPORT_TARGET" == "$EXPECTED_TARGET" ]] || {
  echo "PILOT_RESTORE_TARGET_IDENTITY_MISMATCH: isolated-proof target is required" >&2
  exit 1
}
[[ "$PILOT_IMPORT_DATA_MODE" == "$EXPECTED_DATA_MODE" ]] || {
  echo "PILOT_RESTORE_DATA_MODE_INVALID: synthetic data mode is required" >&2
  exit 1
}
[[ "$PILOT_IMPORT_SYNTHETIC_MARKER" == "$EXPECTED_SYNTHETIC_MARKER" ]] || {
  echo "PILOT_RESTORE_SYNTHETIC_MARKER_INVALID: synthetic marker is required" >&2
  exit 1
}
[[ "${PILOT_EXTERNAL_DEPLOY_APPROVED:-false}" != true ]] || {
  echo "PILOT_RESTORE_EXTERNAL_DEPLOY_DENIED: external deployment is not authorized" >&2
  exit 1
}
[[ "${PILOT_LEGAL_APPROVAL_STATUS:-not_approved}" == not_approved ]] || {
  echo "PILOT_RESTORE_LEGAL_APPROVAL_DENIED: legal approval is not part of this proof" >&2
  exit 1
}
[[ "${NEXT_PUBLIC_DEMO_SANDBOX:-false}" != true && "${DEMO_SANDBOX:-false}" != true ]] || {
  echo "PILOT_RESTORE_DEMO_DENIED: the public demo is never a restore target" >&2
  exit 1
}
if env | grep -q '^SUPABASE_DEMO_[^=]*='; then
  echo "PILOT_RESTORE_DEMO_REFERENCE_DENIED: demo environment references are not allowed" >&2
  exit 1
fi

for command in psql curl openssl sha256sum tar diff python3; do
  command -v "$command" >/dev/null || {
    echo "PILOT_RESTORE_PREREQUISITE_MISSING: $command" >&2
    exit 1
  }
done

if [[ -z "${PILOT_RESTORE_DELIBERATE_BREAK:-}" ]]; then
  DELIBERATE_BREAK='none'
else
  DELIBERATE_BREAK="$PILOT_RESTORE_DELIBERATE_BREAK"
fi
case "$DELIBERATE_BREAK" in
  none|artifact|student-checksum|attendance-checksum|policy|auth|storage|cleanup) ;;
  *)
    echo "PILOT_RESTORE_DELIBERATE_BREAK_INVALID: use artifact, student-checksum, attendance-checksum, policy, auth, storage, or cleanup" >&2
    exit 1
    ;;
esac

mkdir -p "$(dirname "$EVIDENCE_FILE")"
rm -f "$EVIDENCE_FILE"

WORK_DIR=$(mktemp -d "${TMPDIR:-/tmp}/educa-pilot-restore.XXXXXX")
BACKUP_DIR="$WORK_DIR/portable-backup"
RESTORED_DIR="$WORK_DIR/restored-backup"
RESTORED_FINGERPRINT_DIR="$WORK_DIR/restored-fingerprints"
PORTABLE_TAR="$WORK_DIR/portable-backup.tar"
ENCRYPTED_ARTIFACT="$WORK_DIR/portable-backup.tar.enc"
RESTORED_TAR="$WORK_DIR/restored-backup.tar"
EXPECTED_ARTIFACT_FILES="$WORK_DIR/expected-artifact-files.txt"
RESTORED_ARTIFACT_FILES="$WORK_DIR/restored-artifact-files.txt"
MIGRATION_LOG="$WORK_DIR/migrations.log"
RESTORE_DB="educa_pilot_proof_restore_${BASHPID}_$(date +%s)"
RESTORE_URL="${DB_URL%/*}/$RESTORE_DB"
RESTORE_CREATED=false
WORK_DIR_CLEANED=false

mkdir -p "$BACKUP_DIR/storage-bytes" "$RESTORED_DIR" "$RESTORED_FINGERPRINT_DIR"

FAILED_ASSERTIONS=()
CHECK_RESULTS=()
declare -A SOURCE_TABLE_FINGERPRINTS=()
declare -A RESTORED_TABLE_FINGERPRINTS=()

record_check() {
  local name=$1
  local result=$2
  local observed=${3:-}
  local expected=${4:-}
  CHECK_RESULTS+=("$name=$result")
  printf 'PILOT_RESTORE_ASSERTION name=%s result=%s observed=%s expected=%s\n' \
    "$name" "$result" "${observed:-missing}" "${expected:-n/a}"
  if [[ "$result" != pass ]]; then
    FAILED_ASSERTIONS+=("$name")
  fi
}

assert_true() {
  local name=$1
  local observed=${2:-}
  if [[ "$observed" == t || "$observed" == true ]]; then
    record_check "$name" pass "$observed" true
  else
    record_check "$name" fail "$observed" true
  fi
}

assert_equal() {
  local name=$1
  local observed=${2:-}
  local expected=${3:-}
  if [[ "$observed" == "$expected" ]]; then
    record_check "$name" pass "$observed" "$expected"
  else
    record_check "$name" fail "$observed" "$expected"
  fi
}

assert_positive() {
  local name=$1
  local observed=${2:-}
  if [[ "$observed" =~ ^[0-9]+$ ]] && (( observed > 0 )); then
    record_check "$name" pass "$observed" '>0'
  else
    record_check "$name" fail "$observed" '>0'
  fi
}

cleanup_database() {
  if [[ "$RESTORE_CREATED" != true ]]; then
    return 0
  fi

  if ! psql "$DB_URL" -X -v ON_ERROR_STOP=1 -c \
    "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$RESTORE_DB'" >/dev/null 2>&1; then
    return 1
  fi
  if ! psql "$DB_URL" -X -v ON_ERROR_STOP=1 -c \
    "DROP DATABASE IF EXISTS \"$RESTORE_DB\"" >/dev/null 2>&1; then
    return 1
  fi
  RESTORE_CREATED=false
  return 0
}

cleanup_work_dir() {
  if [[ "$WORK_DIR_CLEANED" == true ]]; then
    return 0
  fi
  if [[ -e "$WORK_DIR" ]] && ! rm -rf "$WORK_DIR"; then
    return 1
  fi
  if [[ -e "$WORK_DIR" ]]; then
    return 1
  fi
  WORK_DIR_CLEANED=true
  return 0
}

cleanup() {
  local exit_status=$?
  local cleanup_failed=false
  set +e

  cleanup_database || cleanup_failed=true
  cleanup_work_dir || cleanup_failed=true
  unset PILOT_BACKUP_ENCRYPTION_PASSPHRASE PILOT_IMPORT_ENCRYPTION_KEY PILOT_IMPORT_ENCRYPTION_KEY_ID
  unset PILOT_IMPORT_PROOF_DATABASE_URL PILOT_RESTORE_DECRYPT_PASSPHRASE
  unset SUPABASE_SERVICE_ROLE_KEY SERVICE_ROLE_KEY

  if [[ "$cleanup_failed" == true ]]; then
    echo "PILOT_RESTORE_CLEANUP_FAILED: temporary database or artifacts were not removed" >&2
    if (( exit_status == 0 )); then
      exit_status=1
    fi
  fi

  trap - EXIT
  exit "$exit_status"
}
trap cleanup EXIT

# These credentials exist only inside this child process and the temporary work
# directory. The cleanup trap unsets them on both success and failure.
export PILOT_BACKUP_ENCRYPTION_PASSPHRASE
PILOT_BACKUP_ENCRYPTION_PASSPHRASE=$(openssl rand -hex 32)
export PILOT_IMPORT_ENCRYPTION_KEY
PILOT_IMPORT_ENCRYPTION_KEY=$(openssl rand -base64 32)
export PILOT_IMPORT_ENCRYPTION_KEY_ID='synthetic-restore-proof-v1'

run_restore_safety() {
  pnpm --dir "$APP_DIR" exec tsx scripts/pilot-restore-safety.ts
}

query_source() {
  psql "$DB_URL" -X -Atq -v ON_ERROR_STOP=1 -c "$1"
}

query_restore() {
  psql "$RESTORE_URL" -X -Atq -v ON_ERROR_STOP=1 -c "$1"
}

export_public_table() {
  local database_url=$1
  local table=$2
  local destination=$3
  psql "$database_url" -X -v ON_ERROR_STOP=1 \
    -c "\\copy (SELECT * FROM public.\"$table\" ORDER BY id) TO STDOUT WITH (FORMAT csv, HEADER true)" \
    > "$destination"
}

export_auth_manifest() {
  local database_url=$1
  local destination=$2
  psql "$database_url" -X -v ON_ERROR_STOP=1 \
    -c "\\copy (SELECT auth_user.id,auth_user.email,auth_user.created_at FROM auth.users AS auth_user WHERE EXISTS (SELECT 1 FROM public.users AS profile WHERE profile.id = auth_user.id) OR EXISTS (SELECT 1 FROM public.pilot_user_invitations AS invitation WHERE invitation.auth_user_id = auth_user.id) ORDER BY auth_user.id) TO STDOUT WITH (FORMAT csv, HEADER true)" \
    > "$destination"
}

export_storage_buckets() {
  local database_url=$1
  local destination=$2
  psql "$database_url" -X -v ON_ERROR_STOP=1 \
    -c "\\copy (SELECT id,name,public,file_size_limit,allowed_mime_types FROM storage.buckets WHERE id='student-photos' ORDER BY id) TO STDOUT WITH (FORMAT csv, HEADER true)" \
    > "$destination"
}

export_storage_objects() {
  local database_url=$1
  local destination=$2
  psql "$database_url" -X -v ON_ERROR_STOP=1 \
    -c "\\copy (SELECT id,bucket_id,name,metadata,created_at FROM storage.objects WHERE bucket_id='student-photos' ORDER BY id) TO STDOUT WITH (FORMAT csv, HEADER true)" \
    > "$destination"
}

storage_bytes_fingerprint() {
  local index_file=$1
  awk -F '\t' 'NF >= 3 { print $1 "\t" $3 }' "$index_file" | sha256sum | cut -d' ' -f1
}

policy_manifest() {
  local database_url=$1
  local destination=$2
  psql "$database_url" -X -Atq -v ON_ERROR_STOP=1 -c \
    "SELECT schemaname||'.'||tablename||'|'||policyname||'|'||cmd||'|'||array_to_string(roles,',') FROM pg_policies WHERE schemaname IN ('public','storage') ORDER BY schemaname,tablename,policyname" \
    > "$destination"
}

policy_fingerprint() {
  local database_url=$1
  local manifest_file=$2
  policy_manifest "$database_url" "$manifest_file"
  sha256sum "$manifest_file" | cut -d' ' -f1
}

# T08 owns the canonical identity and synthetic safety contract. The restore
# runner must pass that contract before it reads the local source database.
run_restore_safety

PUBLIC_TABLES=(
  pilot_municipality_config
  attendance_municipal_thresholds
  escolas
  users
  turmas
  responsaveis
  alunos
  aluno_responsaveis
  matriculas
  aulas_abertas
  sessoes_aula
  frequencia
  pilot_import_batches
  pilot_import_approvals
  pilot_user_invitations
  pilot_metric_events
  pilot_data_tombstones
  pilot_audit_log
)

SOURCE_GOVERNANCE_OK=$(query_source "SELECT (count(*) = 1 AND bool_and(data_classification = 'synthetic_only' AND external_deploy_allowed = false AND legal_approval_status = 'not_approved' AND backup_rpo_hours IS NOT NULL AND backup_rto_hours IS NOT NULL)) FROM public.pilot_municipality_config")
SOURCE_SYNTHETIC_IDENTITIES_OK=$(query_source "SELECT NOT EXISTS (SELECT 1 FROM public.users WHERE email IS NULL OR email !~ '@synthetic\\.invalid$') AND NOT EXISTS (SELECT 1 FROM auth.users AS auth_user WHERE (EXISTS (SELECT 1 FROM public.users AS profile WHERE profile.id = auth_user.id) OR EXISTS (SELECT 1 FROM public.pilot_user_invitations AS invitation WHERE invitation.auth_user_id = auth_user.id)) AND (auth_user.email IS NULL OR auth_user.email !~ '@synthetic\\.invalid$'))")
SOURCE_STORAGE_OBJECT_COUNT=$(query_source "SELECT count(*) FROM storage.objects WHERE bucket_id = 'student-photos'")
SOURCE_STORAGE_BUCKET_COUNT=$(query_source "SELECT count(*) FROM storage.buckets WHERE id = 'student-photos'")
SOURCE_AUTH_COUNT=$(query_source "SELECT count(*) FROM auth.users AS auth_user WHERE EXISTS (SELECT 1 FROM public.users AS profile WHERE profile.id = auth_user.id) OR EXISTS (SELECT 1 FROM public.pilot_user_invitations AS invitation WHERE invitation.auth_user_id = auth_user.id)")
SOURCE_STUDENT_COUNT=$(query_source "SELECT count(*) FROM public.alunos")
SOURCE_ATTENDANCE_COUNT=$(query_source "SELECT count(*) FROM public.frequencia")
RPO_TARGET_HOURS=$(query_source "SELECT backup_rpo_hours FROM public.pilot_municipality_config ORDER BY created_at, id LIMIT 1" | tr -d '[:space:]')
RTO_TARGET_HOURS=$(query_source "SELECT backup_rto_hours FROM public.pilot_municipality_config ORDER BY created_at, id LIMIT 1" | tr -d '[:space:]')

assert_true 'source.synthetic_governance' "$SOURCE_GOVERNANCE_OK"
assert_true 'source.synthetic_identities' "$SOURCE_SYNTHETIC_IDENTITIES_OK"
assert_positive 'source.auth_manifest_count' "$SOURCE_AUTH_COUNT"
assert_positive 'source.student_count' "$SOURCE_STUDENT_COUNT"
assert_positive 'source.attendance_count' "$SOURCE_ATTENDANCE_COUNT"
assert_positive 'source.storage_bucket_count' "$SOURCE_STORAGE_BUCKET_COUNT"
assert_positive 'source.storage_object_count' "$SOURCE_STORAGE_OBJECT_COUNT"
assert_positive 'source.rpo_target_hours' "$RPO_TARGET_HOURS"
assert_positive 'source.rto_target_hours' "$RTO_TARGET_HOURS"

[[ "$RPO_TARGET_HOURS" =~ ^[0-9]+$ && "$RTO_TARGET_HOURS" =~ ^[0-9]+$ ]] || {
  echo "PILOT_RESTORE_TARGET_RECEIPT_INVALID: documented RPO/RTO targets must be integer hours" >&2
  exit 1
}
RPO_TARGET_SECONDS=$((RPO_TARGET_HOURS * 3600))
RTO_TARGET_SECONDS=$((RTO_TARGET_HOURS * 3600))

BACKUP_EPOCH=$(date +%s)
BACKUP_ISO=$(date -u +%Y-%m-%dT%H:%M:%SZ)

for table in "${PUBLIC_TABLES[@]}"; do
  export_public_table "$DB_URL" "$table" "$BACKUP_DIR/public.$table.csv"
done
export_auth_manifest "$DB_URL" "$BACKUP_DIR/auth.users.csv"
export_storage_buckets "$DB_URL" "$BACKUP_DIR/storage.buckets.csv"
export_storage_objects "$DB_URL" "$BACKUP_DIR/storage.objects.csv"

STORAGE_INDEX="$BACKUP_DIR/storage-bytes/index.tsv"
: > "$STORAGE_INDEX"
mapfile -t STORAGE_OBJECT_ROWS < <(psql "$DB_URL" -X -Atq -F $'\t' -v ON_ERROR_STOP=1 \
  -c "SELECT id,name FROM storage.objects WHERE bucket_id='student-photos' ORDER BY id")
for object_row in "${STORAGE_OBJECT_ROWS[@]}"; do
  IFS=$'\t' read -r object_id object_name <<< "$object_row"
  [[ "$object_id" =~ ^[0-9a-fA-F-]{36}$ && -n "$object_name" ]] || {
    echo "PILOT_RESTORE_STORAGE_METADATA_INVALID: storage object identity is invalid" >&2
    exit 1
  }
  encoded_path=$(python3 -c 'import sys; from urllib.parse import quote; print(quote(sys.argv[1], safe="/"))' "$object_name")
  byte_file="$BACKUP_DIR/storage-bytes/$object_id.bin"
  curl --fail --silent --show-error \
    -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
    -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
    "$NEXT_PUBLIC_SUPABASE_URL/storage/v1/object/authenticated/student-photos/$encoded_path" \
    --output "$byte_file"
  byte_sha=$(sha256sum "$byte_file" | cut -d' ' -f1)
  printf '%s\t%s\t%s\n' "$object_id" "$object_name" "$byte_sha" >> "$STORAGE_INDEX"
done

SOURCE_STORAGE_BYTES_FINGERPRINT=$(storage_bytes_fingerprint "$STORAGE_INDEX")
SOURCE_STUDENT_FINGERPRINT=$(sha256sum "$BACKUP_DIR/public.alunos.csv" | cut -d' ' -f1)
SOURCE_ATTENDANCE_FINGERPRINT=$(sha256sum "$BACKUP_DIR/public.frequencia.csv" | cut -d' ' -f1)
SOURCE_AUTH_FINGERPRINT=$(sha256sum "$BACKUP_DIR/auth.users.csv" | cut -d' ' -f1)
SOURCE_STORAGE_BUCKET_FINGERPRINT=$(sha256sum "$BACKUP_DIR/storage.buckets.csv" | cut -d' ' -f1)
SOURCE_STORAGE_OBJECT_FINGERPRINT=$(sha256sum "$BACKUP_DIR/storage.objects.csv" | cut -d' ' -f1)
for table in "${PUBLIC_TABLES[@]}"; do
  SOURCE_TABLE_FINGERPRINTS["$table"]=$(sha256sum "$BACKUP_DIR/public.$table.csv" | cut -d' ' -f1)
done

cat > "$BACKUP_DIR/manifest.txt" <<EOF
format=educa-portable-csv-v2
target=$EXPECTED_TARGET
database_target=$EXPECTED_DATABASE_TARGET
data_mode=$EXPECTED_DATA_MODE
synthetic_marker=$EXPECTED_SYNTHETIC_MARKER
created_at=$BACKUP_ISO
schema_source=repository_migrations
portable_data=explicit_public_table_allowlist
provider_boundary=auth_identity_manifest,storage_metadata_and_bytes
auth_manifest=auth_users_referenced_by_profiles_or_invitations
excluded=owners,acls,roles,extensions,managed_session_settings,provider_pitr_metadata
source_database_writes=none
EOF

{
  printf '%s\n' manifest.txt auth.users.csv storage.buckets.csv storage.objects.csv storage-bytes/index.tsv
  for storage_file in "$BACKUP_DIR"/storage-bytes/*.bin; do
    printf 'storage-bytes/%s\n' "$(basename "$storage_file")"
  done
  for table in "${PUBLIC_TABLES[@]}"; do
    printf 'public.%s.csv\n' "$table"
  done
} | LC_ALL=C sort > "$EXPECTED_ARTIFACT_FILES"

(
  cd "$BACKUP_DIR"
  tar -cf "$PORTABLE_TAR" --files-from "$EXPECTED_ARTIFACT_FILES"
)
openssl enc -aes-256-cbc -pbkdf2 -salt \
  -pass env:PILOT_BACKUP_ENCRYPTION_PASSPHRASE \
  -in "$PORTABLE_TAR" -out "$ENCRYPTED_ARTIFACT"
ENCRYPTED_SHA=$(sha256sum "$ENCRYPTED_ARTIFACT" | cut -d' ' -f1)

# Plaintext source exports are no longer needed after encryption.
rm -rf "$BACKUP_DIR"
[[ ! -e "$BACKUP_DIR" ]] || {
  echo "PILOT_RESTORE_ARTIFACT_CLEANUP_FAILED: source plaintext exports remain" >&2
  exit 1
}

RESTORE_STARTED=$(date +%s)
if [[ "$DELIBERATE_BREAK" == artifact ]]; then
  export PILOT_RESTORE_DECRYPT_PASSPHRASE="${PILOT_BACKUP_ENCRYPTION_PASSPHRASE}deliberate-break"
else
  export PILOT_RESTORE_DECRYPT_PASSPHRASE="$PILOT_BACKUP_ENCRYPTION_PASSPHRASE"
fi
if ! openssl enc -d -aes-256-cbc -pbkdf2 \
  -pass env:PILOT_RESTORE_DECRYPT_PASSPHRASE \
  -in "$ENCRYPTED_ARTIFACT" -out "$RESTORED_TAR"; then
  echo "PILOT_RESTORE_PROOF_RED: encrypted artifact decryption failed" >&2
  exit 1
fi

tar -tf "$RESTORED_TAR" | LC_ALL=C sort > "$RESTORED_ARTIFACT_FILES"
diff -u "$EXPECTED_ARTIFACT_FILES" "$RESTORED_ARTIFACT_FILES" >/dev/null || {
  echo "PILOT_RESTORE_ARTIFACT_ALLOWLIST_FAILED: decrypted artifact contains an unexpected file" >&2
  exit 1
}
tar -C "$RESTORED_DIR" -xf "$RESTORED_TAR"
rm -f "$RESTORED_TAR"
[[ ! -e "$RESTORED_TAR" ]] || {
  echo "PILOT_RESTORE_ARTIFACT_CLEANUP_FAILED: decrypted tar remains" >&2
  exit 1
}

psql "$DB_URL" -X -v ON_ERROR_STOP=1 -c "CREATE DATABASE \"$RESTORE_DB\" TEMPLATE template0" >/dev/null
RESTORE_CREATED=true
export PILOT_IMPORT_PROOF_DATABASE_URL="$RESTORE_URL"
run_restore_safety

# This is a compatibility boundary for a second database in the local
# Supabase PostgreSQL cluster. Source Auth and Storage are exercised through
# their real local contracts above; application schema and RLS come only from
# repository migrations and the explicit pilot provisioner below.
if ! psql "$RESTORE_URL" -X -v ON_ERROR_STOP=1 > /dev/null 2> "$MIGRATION_LOG" <<'SQL'
CREATE SCHEMA auth;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;
CREATE TABLE auth.users (
  id uuid PRIMARY KEY,
  email text,
  created_at timestamptz
);

CREATE SCHEMA storage;
CREATE TABLE storage.buckets (
  id text PRIMARY KEY,
  name text NOT NULL,
  public boolean NOT NULL DEFAULT false,
  file_size_limit bigint,
  allowed_mime_types text[]
);
CREATE TABLE storage.objects (
  id uuid PRIMARY KEY,
  bucket_id text NOT NULL REFERENCES storage.buckets(id),
  name text NOT NULL,
  metadata jsonb,
  created_at timestamptz
);
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
CREATE FUNCTION storage.foldername(name text) RETURNS text[]
LANGUAGE sql IMMUTABLE AS $$ SELECT string_to_array(name, '/') $$;
GRANT USAGE ON SCHEMA auth, storage TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated, service_role;
GRANT ALL ON auth.users, storage.buckets, storage.objects TO service_role;
GRANT SELECT ON storage.buckets TO authenticated;
GRANT SELECT, INSERT, UPDATE ON storage.objects TO authenticated;
SQL
then
  cat "$MIGRATION_LOG" >&2
  exit 1
fi

mapfile -t MIGRATIONS < <(find "$MIGRATIONS_DIR" -maxdepth 1 -type f -name '*.sql' -print | LC_ALL=C sort)
MIGRATION_COUNT=${#MIGRATIONS[@]}
[[ "$MIGRATION_COUNT" -gt 0 ]] || {
  echo "PILOT_RESTORE_MIGRATIONS_MISSING: repository migration directory is empty" >&2
  exit 1
}
for migration in "${MIGRATIONS[@]}"; do
  if ! psql "$RESTORE_URL" -X -v ON_ERROR_STOP=1 -f "$migration" >> "$MIGRATION_LOG" 2>&1; then
    cat "$MIGRATION_LOG" >&2
    exit 1
  fi
done
if ! psql "$RESTORE_URL" -X -v ON_ERROR_STOP=1 -f "$PILOT_PROVISIONING" >> "$MIGRATION_LOG" 2>&1; then
  cat "$MIGRATION_LOG" >&2
  exit 1
fi

# These migrations bootstrap one synthetic municipality and two storage
# buckets. Replace only those provider/application metadata rows with the
# exported allowlisted rows before importing dependent school data.
psql "$RESTORE_URL" -X -v ON_ERROR_STOP=1 -c "TRUNCATE public.pilot_municipality_config CASCADE" >/dev/null
psql "$RESTORE_URL" -X -v ON_ERROR_STOP=1 -c "TRUNCATE storage.buckets CASCADE" >/dev/null

restore_public_table() {
  local table=$1
  local source_file="$RESTORED_DIR/public.$table.csv"
  psql "$RESTORE_URL" -X -v ON_ERROR_STOP=1 \
    -c "SET session_replication_role = replica; SET ROLE service_role" \
    -c "\\copy public.\"$table\" FROM '$source_file' WITH (FORMAT csv, HEADER true)" \
    >/dev/null
}

for table in "${PUBLIC_TABLES[@]}"; do
  restore_public_table "$table"
done
psql "$RESTORE_URL" -X -v ON_ERROR_STOP=1 \
  -c "SET session_replication_role = replica; SET ROLE service_role" \
  -c "\\copy auth.users FROM '$RESTORED_DIR/auth.users.csv' WITH (FORMAT csv, HEADER true)" \
  >/dev/null
psql "$RESTORE_URL" -X -v ON_ERROR_STOP=1 \
  -c "SET session_replication_role = replica; SET ROLE service_role" \
  -c "\\copy storage.buckets (id,name,public,file_size_limit,allowed_mime_types) FROM '$RESTORED_DIR/storage.buckets.csv' WITH (FORMAT csv, HEADER true)" \
  >/dev/null
psql "$RESTORE_URL" -X -v ON_ERROR_STOP=1 \
  -c "SET session_replication_role = replica; SET ROLE service_role" \
  -c "\\copy storage.objects (id,bucket_id,name,metadata,created_at) FROM '$RESTORED_DIR/storage.objects.csv' WITH (FORMAT csv, HEADER true)" \
  >/dev/null

apply_deliberate_break() {
  case "$DELIBERATE_BREAK" in
    none) ;;
    student-checksum)
      psql "$RESTORE_URL" -X -v ON_ERROR_STOP=1 -c \
        "SET session_replication_role = replica; UPDATE public.alunos SET nome_completo = 'deliberate-restore-break' WHERE id = (SELECT id FROM public.alunos ORDER BY id LIMIT 1)" >/dev/null
      ;;
    attendance-checksum)
      psql "$RESTORE_URL" -X -v ON_ERROR_STOP=1 -c \
        "SET session_replication_role = replica; DELETE FROM public.frequencia WHERE id = (SELECT id FROM public.frequencia ORDER BY id LIMIT 1)" >/dev/null
      ;;
    policy)
      psql "$RESTORE_URL" -X -v ON_ERROR_STOP=1 -c \
        "DROP POLICY pilot_student_photos_select ON storage.objects" >/dev/null
      ;;
    auth)
      psql "$RESTORE_URL" -X -v ON_ERROR_STOP=1 -c \
        "DELETE FROM auth.users WHERE id = (SELECT id FROM public.users WHERE email = 'professora.a@synthetic.invalid')" >/dev/null
      ;;
    storage)
      local storage_file
      storage_file=$(find "$RESTORED_DIR/storage-bytes" -maxdepth 1 -type f -name '*.bin' | LC_ALL=C sort | head -1)
      [[ -n "$storage_file" ]] && rm -f "$storage_file"
      ;;
    cleanup) ;;
    artifact) ;;
  esac
}
apply_deliberate_break

RESTORED_STORAGE_INDEX="$RESTORED_DIR/storage-bytes/index.tsv"
RESTORED_STORAGE_DIGEST="$WORK_DIR/restored-storage-digest.tsv"
: > "$RESTORED_STORAGE_DIGEST"
STORAGE_BYTE_OBJECTS_OK=t
while IFS=$'\t' read -r object_id object_name expected_sha; do
  [[ -n "$object_id" ]] || continue
  restored_file="$RESTORED_DIR/storage-bytes/$object_id.bin"
  if [[ ! -f "$restored_file" ]]; then
    STORAGE_BYTE_OBJECTS_OK=f
    printf '%s\tmissing\n' "$object_id" >> "$RESTORED_STORAGE_DIGEST"
    continue
  fi
  actual_sha=$(sha256sum "$restored_file" | cut -d' ' -f1)
  printf '%s\t%s\n' "$object_id" "$actual_sha" >> "$RESTORED_STORAGE_DIGEST"
  [[ "$actual_sha" == "$expected_sha" ]] || STORAGE_BYTE_OBJECTS_OK=f
done < "$RESTORED_STORAGE_INDEX"
RESTORED_STORAGE_BYTES_FINGERPRINT=$(cut -f1,2 "$RESTORED_STORAGE_DIGEST" | sha256sum | cut -d' ' -f1)

# Keep plaintext restored rows only until the real PostgreSQL replay and byte
# checks finish. The receipt never includes a row, name, email, or object path.
rm -rf "$RESTORED_DIR"
[[ ! -e "$RESTORED_DIR" ]] || {
  echo "PILOT_RESTORE_ARTIFACT_CLEANUP_FAILED: restored plaintext files remain" >&2
  exit 1
}

for table in "${PUBLIC_TABLES[@]}"; do
  export_public_table "$RESTORE_URL" "$table" "$RESTORED_FINGERPRINT_DIR/public.$table.csv"
done
export_auth_manifest "$RESTORE_URL" "$RESTORED_FINGERPRINT_DIR/auth.users.csv"
export_storage_buckets "$RESTORE_URL" "$RESTORED_FINGERPRINT_DIR/storage.buckets.csv"
export_storage_objects "$RESTORE_URL" "$RESTORED_FINGERPRINT_DIR/storage.objects.csv"

for table in "${PUBLIC_TABLES[@]}"; do
  RESTORED_TABLE_FINGERPRINTS["$table"]=$(sha256sum "$RESTORED_FINGERPRINT_DIR/public.$table.csv" | cut -d' ' -f1)
done
RESTORED_AUTH_FINGERPRINT=$(sha256sum "$RESTORED_FINGERPRINT_DIR/auth.users.csv" | cut -d' ' -f1)
RESTORED_STORAGE_BUCKET_FINGERPRINT=$(sha256sum "$RESTORED_FINGERPRINT_DIR/storage.buckets.csv" | cut -d' ' -f1)
RESTORED_STORAGE_OBJECT_FINGERPRINT=$(sha256sum "$RESTORED_FINGERPRINT_DIR/storage.objects.csv" | cut -d' ' -f1)
RESTORED_STUDENT_FINGERPRINT="${RESTORED_TABLE_FINGERPRINTS[alunos]}"
RESTORED_ATTENDANCE_FINGERPRINT="${RESTORED_TABLE_FINGERPRINTS[frequencia]}"
RESTORE_POLICY_FINGERPRINT=$(policy_fingerprint "$RESTORE_URL" "$WORK_DIR/restore-policies.txt")
RESTORE_POLICY_COUNT=$(query_restore "SELECT count(*) FROM pg_policies WHERE schemaname IN ('public','storage')")

RESTORE_AUTH_COUNT=$(query_restore "SELECT count(*) FROM auth.users")
RESTORE_STUDENT_COUNT=$(query_restore "SELECT count(*) FROM public.alunos")
RESTORE_ATTENDANCE_COUNT=$(query_restore "SELECT count(*) FROM public.frequencia")
RESTORE_STORAGE_METADATA_COUNT=$(query_restore "SELECT count(*) FROM storage.objects WHERE bucket_id = 'student-photos'")
RESTORE_STORAGE_BUCKET_COUNT=$(query_restore "SELECT count(*) FROM storage.buckets WHERE id = 'student-photos'")
RESTORE_SYNTHETIC_IDENTITIES_OK=$(query_restore "SELECT NOT EXISTS (SELECT 1 FROM public.users WHERE email IS NULL OR email !~ '@synthetic\\.invalid$') AND NOT EXISTS (SELECT 1 FROM auth.users WHERE email IS NULL OR email !~ '@synthetic\\.invalid$')")
RESTORE_AUTH_PROFILE_LINK_OK=$(query_restore "SELECT NOT EXISTS (SELECT 1 FROM public.users AS profile LEFT JOIN auth.users AS auth_user ON auth_user.id = profile.id WHERE auth_user.id IS NULL OR auth_user.email IS DISTINCT FROM profile.email)")
RESTORE_CONFIG_OK=$(query_restore "SELECT (count(*) = 1 AND bool_and(data_classification = 'synthetic_only' AND external_deploy_allowed = false AND legal_approval_status = 'not_approved')) FROM public.pilot_municipality_config")
RESTORE_REQUIRED_POLICIES_OK=$(query_restore "SELECT NOT EXISTS (SELECT required.policy_name FROM (VALUES ('pilot_alunos_select'),('pilot_frequencia_select'),('pilot_frequencia_insert'),('pilot_frequencia_update'),('pilot_student_photos_select'),('pilot_student_photos_insert'),('pilot_student_photos_update'),('pilot_users_select')) AS required(policy_name) WHERE NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname IN ('public','storage') AND policyname = required.policy_name))")
RESTORE_GRANTS_OK=$(query_restore "SELECT has_table_privilege('authenticated','public.alunos','SELECT') AND has_table_privilege('authenticated','public.frequencia','INSERT') AND has_table_privilege('authenticated','storage.objects','SELECT') AND NOT has_table_privilege('authenticated','public.notas','SELECT')")
RESTORE_VIEW_OK=$(query_restore "SELECT coalesce(reloptions @> ARRAY['security_invoker=true'], false) FROM pg_class WHERE oid = 'public.vw_frequencia_completa'::regclass")
RESTORE_RPC_OK=$(query_restore "SELECT to_regprocedure('public.pilot_dashboard_metrics(uuid)') IS NOT NULL")
RESTORE_PILOT_GUARD_OK=$(query_restore "SELECT to_regprocedure('public.pilot_reject_high_risk_student_fields()') IS NOT NULL AND EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'pilot_high_risk_student_guard' AND tgrelid = 'public.alunos'::regclass)")
RESTORE_RELATIONSHIPS_OK=$(query_restore "SELECT NOT EXISTS (SELECT 1 FROM public.matriculas m LEFT JOIN public.alunos a ON a.id = m.aluno_id LEFT JOIN public.turmas t ON t.id = m.turma_id WHERE a.id IS NULL OR t.id IS NULL) AND NOT EXISTS (SELECT 1 FROM public.aluno_responsaveis r LEFT JOIN public.alunos a ON a.id = r.aluno_id LEFT JOIN public.responsaveis g ON g.id = r.responsavel_id WHERE a.id IS NULL OR g.id IS NULL)")
RESTORE_TOMBSTONE_OK=$(query_restore "SELECT EXISTS (SELECT 1 FROM public.pilot_data_tombstones WHERE source_fingerprint = 'synthetic-deleted-copy-sha256') AND NOT EXISTS (SELECT 1 FROM public.pilot_import_batches WHERE content_sha256 = 'synthetic-deleted-copy-sha256')")
SOURCE_AUDIT_COUNT=$(query_source "SELECT count(*) FROM public.pilot_audit_log")
RESTORE_AUDIT_COUNT=$(query_restore "SELECT count(*) FROM public.pilot_audit_log")
RESTORE_RPO_TARGET_HOURS=$(query_restore "SELECT backup_rpo_hours FROM public.pilot_municipality_config ORDER BY created_at, id LIMIT 1" | tr -d '[:space:]')
RESTORE_RTO_TARGET_HOURS=$(query_restore "SELECT backup_rto_hours FROM public.pilot_municipality_config ORDER BY created_at, id LIMIT 1" | tr -d '[:space:]')

TEACHER_ID=$(query_restore "SELECT id FROM public.users WHERE email = 'professora.a@synthetic.invalid' LIMIT 1" | tr -d '[:space:]')
TEACHER_ID_OK=false
if [[ "$TEACHER_ID" =~ ^[0-9a-fA-F-]{36}$ ]]; then
  TEACHER_ID_OK=true
fi

TEACHER_SESSION_RESULT=f
if [[ "$TEACHER_ID_OK" == true ]]; then
  if TEACHER_SESSION_RESULT=$(psql "$RESTORE_URL" -X -Atq -v ON_ERROR_STOP=1 <<SQL
BEGIN;
SET LOCAL ROLE service_role;
INSERT INTO public.sessoes_aula(
  id, turma_id, escola_id, professor_id, data_aula, conteudo_programatico, status, aberta_em
) VALUES (
  '71000000-0000-0000-0000-000000000010',
  '30000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000001',
  '$TEACHER_ID',
  (now() AT TIME ZONE 'America/Sao_Paulo')::date,
  'Synthetic restore teacher session',
  'ABERTA', now()
);
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '$TEACHER_ID', true);
INSERT INTO public.frequencia(
  id, matricula_id, sessao_id, data_aula, presente, status_presenca,
  professor_id, marcado_por
) VALUES (
  '71000000-0000-0000-0000-000000000001',
  '50000000-0000-0000-0000-000000000001',
  '71000000-0000-0000-0000-000000000010',
  (now() AT TIME ZONE 'America/Sao_Paulo')::date, true, 'P', '$TEACHER_ID', '$TEACHER_ID'
);
DO \$\$
DECLARE
  cross_school_denied boolean := false;
BEGIN
  BEGIN
    INSERT INTO public.frequencia(
      id, matricula_id, sessao_id, data_aula, presente, status_presenca,
      professor_id, marcado_por
    ) VALUES (
      '71000000-0000-0000-0000-000000000002',
      '50000000-0000-0000-0000-000000000002',
      '71000000-0000-0000-0000-000000000010',
      (now() AT TIME ZONE 'America/Sao_Paulo')::date, true, 'P', '$TEACHER_ID', '$TEACHER_ID'
    );
    RAISE EXCEPTION 'PILOT_RESTORE_TEACHER_SCOPE_BREAK: cross-school attendance write succeeded';
  EXCEPTION WHEN insufficient_privilege THEN
    cross_school_denied := true;
  END;
  IF NOT cross_school_denied THEN
    RAISE EXCEPTION 'PILOT_RESTORE_TEACHER_SCOPE_BREAK: cross-school attendance write was not denied';
  END IF;
END
\$\$;
SELECT (
  auth.uid() = '$TEACHER_ID'::uuid
  AND public.pilot_current_role() = 'professor'
  AND (SELECT count(*) FROM public.alunos WHERE escola_id = '10000000-0000-0000-0000-000000000001') > 0
  AND (SELECT count(*) FROM public.alunos WHERE escola_id = '10000000-0000-0000-0000-000000000002') = 0
);
ROLLBACK;
SQL
  ); then
    TEACHER_SESSION_RESULT=$(printf '%s\n' "$TEACHER_SESSION_RESULT" | tail -1)
  else
    TEACHER_SESSION_RESULT=f
  fi
fi

STORAGE_SESSION_RESULT=f
if [[ "$TEACHER_ID_OK" == true ]]; then
  if STORAGE_SESSION_OUTPUT=$(psql "$RESTORE_URL" -X -Atq -v ON_ERROR_STOP=1 <<SQL
BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '$TEACHER_ID', true);
SELECT count(*) FROM storage.objects WHERE bucket_id = 'student-photos' AND name LIKE '10000000-0000-0000-0000-000000000001/%';
SELECT count(*) FROM storage.objects WHERE bucket_id = 'student-photos' AND name LIKE '10000000-0000-0000-0000-000000000002/%';
ROLLBACK;
SQL
  ); then
    STORAGE_ALLOWED_COUNT=$(printf '%s\n' "$STORAGE_SESSION_OUTPUT" | tail -2 | head -1)
    STORAGE_DENIED_COUNT=$(printf '%s\n' "$STORAGE_SESSION_OUTPUT" | tail -1)
    if [[ "$STORAGE_ALLOWED_COUNT" =~ ^[0-9]+$ && "$STORAGE_DENIED_COUNT" =~ ^[0-9]+$ ]] && (( STORAGE_ALLOWED_COUNT > 0 )) && (( STORAGE_DENIED_COUNT == 0 )); then
      STORAGE_SESSION_RESULT=t
    fi
  fi
fi

RESTORE_FINISHED=$(date +%s)
RPO_SECONDS=$((RESTORE_STARTED - BACKUP_EPOCH))
RTO_SECONDS=$((RESTORE_FINISHED - RESTORE_STARTED))

assert_equal 'restore.auth_manifest_count' "$RESTORE_AUTH_COUNT" "$SOURCE_AUTH_COUNT"
assert_equal 'restore.student_count' "$RESTORE_STUDENT_COUNT" "$SOURCE_STUDENT_COUNT"
assert_equal 'restore.attendance_count' "$RESTORE_ATTENDANCE_COUNT" "$SOURCE_ATTENDANCE_COUNT"
assert_equal 'restore.storage_metadata_count' "$RESTORE_STORAGE_METADATA_COUNT" "$SOURCE_STORAGE_OBJECT_COUNT"
assert_equal 'restore.storage_bucket_count' "$RESTORE_STORAGE_BUCKET_COUNT" "$SOURCE_STORAGE_BUCKET_COUNT"
assert_true 'restore.synthetic_identities' "$RESTORE_SYNTHETIC_IDENTITIES_OK"
assert_true 'restore.auth_profile_link' "$RESTORE_AUTH_PROFILE_LINK_OK"
assert_positive 'restore.migration_files' "$MIGRATION_COUNT"
assert_true 'restore.pilot_configuration' "$RESTORE_CONFIG_OK"
assert_equal 'restore.rpo_target_hours' "$RESTORE_RPO_TARGET_HOURS" "$RPO_TARGET_HOURS"
assert_equal 'restore.rto_target_hours' "$RESTORE_RTO_TARGET_HOURS" "$RTO_TARGET_HOURS"

for table in "${PUBLIC_TABLES[@]}"; do
  assert_equal "restore.allowlisted_table.$table" \
    "${RESTORED_TABLE_FINGERPRINTS[$table]}" "${SOURCE_TABLE_FINGERPRINTS[$table]}"
done
assert_equal 'restore.student_fingerprint' "$RESTORED_STUDENT_FINGERPRINT" "$SOURCE_STUDENT_FINGERPRINT"
assert_equal 'restore.attendance_fingerprint' "$RESTORED_ATTENDANCE_FINGERPRINT" "$SOURCE_ATTENDANCE_FINGERPRINT"

assert_equal 'restore.auth_manifest_fingerprint' "$RESTORED_AUTH_FINGERPRINT" "$SOURCE_AUTH_FINGERPRINT"
assert_equal 'restore.storage_bucket_fingerprint' "$RESTORED_STORAGE_BUCKET_FINGERPRINT" "$SOURCE_STORAGE_BUCKET_FINGERPRINT"
assert_equal 'restore.storage_metadata_fingerprint' "$RESTORED_STORAGE_OBJECT_FINGERPRINT" "$SOURCE_STORAGE_OBJECT_FINGERPRINT"
assert_equal 'restore.storage_bytes_fingerprint' "$RESTORED_STORAGE_BYTES_FINGERPRINT" "$SOURCE_STORAGE_BYTES_FINGERPRINT"
assert_true 'restore.storage_bytes' "$STORAGE_BYTE_OBJECTS_OK"
assert_positive 'restore.policy_count' "$RESTORE_POLICY_COUNT"
assert_positive 'restore.policy_fingerprint' "${#RESTORE_POLICY_FINGERPRINT}"
assert_true 'restore.required_policies' "$RESTORE_REQUIRED_POLICIES_OK"
assert_true 'restore.grants' "$RESTORE_GRANTS_OK"
assert_true 'restore.security_invoker_view' "$RESTORE_VIEW_OK"
assert_true 'restore.dashboard_rpc' "$RESTORE_RPC_OK"
assert_true 'restore.pilot_gate' "$RESTORE_PILOT_GUARD_OK"
assert_true 'restore.relationships' "$RESTORE_RELATIONSHIPS_OK"
assert_true 'restore.tombstone' "$RESTORE_TOMBSTONE_OK"
assert_equal 'restore.audit_count' "$RESTORE_AUDIT_COUNT" "$SOURCE_AUDIT_COUNT"
assert_true 'restore.teacher_session_scope' "$TEACHER_SESSION_RESULT"
assert_true 'restore.storage_session_scope' "$STORAGE_SESSION_RESULT"
assert_equal 'restore.rpo_observed_target' "$([[ "$RPO_SECONDS" -le "$RPO_TARGET_SECONDS" ]] && echo t || echo f)" t
assert_equal 'restore.rto_observed_target' "$([[ "$RTO_SECONDS" -le "$RTO_TARGET_SECONDS" ]] && echo t || echo f)" t

printf '\nPILOT_RESTORE_ASSERTION_SUMMARY total=%s failed=%s\n' "${#CHECK_RESULTS[@]}" "${#FAILED_ASSERTIONS[@]}"
if ((${#FAILED_ASSERTIONS[@]} > 0)); then
  printf 'PILOT_RESTORE_PROOF_RED: failed_assertions=%s\n' "${FAILED_ASSERTIONS[*]}" >&2
  exit 1
fi

if [[ "$DELIBERATE_BREAK" == cleanup ]]; then
  echo "PILOT_RESTORE_CLEANUP_ASSERTION: forced cleanup failure" >&2
  echo "PILOT_RESTORE_PROOF_RED: failed_assertions=cleanup" >&2
  exit 1
fi

# Remove every artifact before writing the receipt. The trap repeats these
# operations if any assertion or command fails earlier.
rm -rf "$RESTORED_FINGERPRINT_DIR" "$RESTORED_ARTIFACT_FILES" "$EXPECTED_ARTIFACT_FILES" "$MIGRATION_LOG" "$PORTABLE_TAR" "$ENCRYPTED_ARTIFACT"
[[ ! -e "$RESTORED_FINGERPRINT_DIR" && ! -e "$PORTABLE_TAR" && ! -e "$ENCRYPTED_ARTIFACT" ]] || {
  echo "PILOT_RESTORE_ARTIFACT_CLEANUP_FAILED: temporary artifacts remain" >&2
  exit 1
}
cleanup_database || {
  echo "PILOT_RESTORE_CLEANUP_FAILED: isolated restore database was not removed" >&2
  exit 1
}
cleanup_work_dir || {
  echo "PILOT_RESTORE_CLEANUP_FAILED: isolated work directory was not removed" >&2
  exit 1
}

cat > "$EVIDENCE_FILE" <<EOF
# Synthetic portable restore proof

Este receipt registra uma prova técnica sintética e isolada. Ele não demonstra prontidão municipal, aprovação legal, contrato, SLA comercial ou PITR gerenciado do provedor. O banco de origem local foi somente lido.

| Check | Observed |
|---|---:|
| Result | pass |
| Isolated synthetic target | \`$EXPECTED_TARGET\` |
| Database target identity | \`$EXPECTED_DATABASE_TARGET\` |
| Data mode and marker | \`$EXPECTED_DATA_MODE\` / \`$EXPECTED_SYNTHETIC_MARKER\` |
| Portable artifact format | \`educa-portable-csv-v2\` encrypted tar |
| Portable public-table allowlist | ${#PUBLIC_TABLES[@]} tables |
| Encrypted artifact SHA-256 | \`$ENCRYPTED_SHA\` |
| Plaintext artifact lifecycle | removed before receipt |
| Temporary restore database | removed before receipt |
| Source database writes | none |
| Auth manifest count | $RESTORE_AUTH_COUNT |
| Auth manifest fingerprint source/restore | \`$SOURCE_AUTH_FINGERPRINT\` / \`$RESTORED_AUTH_FINGERPRINT\` |
| Auth profile linkage | $RESTORE_AUTH_PROFILE_LINK_OK |
| Repository migration files applied | $MIGRATION_COUNT |
| Student count | $RESTORE_STUDENT_COUNT |
| Student fingerprint source/restore | \`$SOURCE_STUDENT_FINGERPRINT\` / \`$RESTORED_STUDENT_FINGERPRINT\` |
| Attendance count | $RESTORE_ATTENDANCE_COUNT |
| Attendance fingerprint source/restore | \`$SOURCE_ATTENDANCE_FINGERPRINT\` / \`$RESTORED_ATTENDANCE_FINGERPRINT\` |
| Storage metadata count | $RESTORE_STORAGE_METADATA_COUNT |
| Storage metadata fingerprint source/restore | \`$SOURCE_STORAGE_OBJECT_FINGERPRINT\` / \`$RESTORED_STORAGE_OBJECT_FINGERPRINT\` |
| Storage byte checksum source/restore | \`$SOURCE_STORAGE_BYTES_FINGERPRINT\` / \`$RESTORED_STORAGE_BYTES_FINGERPRINT\` |
| Restored policy count / fingerprint | $RESTORE_POLICY_COUNT / \`$RESTORE_POLICY_FINGERPRINT\` |
| Grants | $RESTORE_GRANTS_OK |
| Security-invoker view | $RESTORE_VIEW_OK |
| Dashboard RPC | $RESTORE_RPC_OK |
| Pilot gate | $RESTORE_PILOT_GUARD_OK |
| Relationships | $RESTORE_RELATIONSHIPS_OK |
| Tombstone prevents resurrection | $RESTORE_TOMBSTONE_OK |
| Synthetic teacher session within school scope | $TEACHER_SESSION_RESULT |
| Storage policy session within school scope | $STORAGE_SESSION_RESULT |
| Observed RPO / documented target | ${RPO_SECONDS}s / ${RPO_TARGET_HOURS}h |
| Observed RTO / documented target | ${RTO_SECONDS}s / ${RTO_TARGET_HOURS}h |
| Provider PITR | not exercised |
| Default deliberate-break contract | \`PILOT_RESTORE_DELIBERATE_BREAK=student-checksum\` must produce red |
| Receipt PII | none |

Focused failure probes are intentional and must fail visibly: \`artifact\`, \`student-checksum\`, \`attendance-checksum\`, \`policy\`, \`auth\`, \`storage\`, and \`cleanup\`. Run them only against the disposable local synthetic proof.
EOF

printf 'Portable synthetic restore proof passed: target=%s RPO=%ss/%sh RTO=%ss/%sh evidence=%s\n' \
  "$EXPECTED_TARGET" "$RPO_SECONDS" "$RPO_TARGET_HOURS" "$RTO_SECONDS" "$RTO_TARGET_HOURS" "$EVIDENCE_FILE"
