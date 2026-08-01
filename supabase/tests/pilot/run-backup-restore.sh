#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)
MIGRATIONS_DIR="$ROOT_DIR/supabase/migrations"
PILOT_PROVISIONING="$ROOT_DIR/supabase/pilot/provision-pilot-module-gate.sql"
EVIDENCE_FILE="$ROOT_DIR/.pilot-evidence/synthetic-restore-evidence.md"

: "${DB_URL:?DB_URL is required}"
: "${NEXT_PUBLIC_SUPABASE_URL:?NEXT_PUBLIC_SUPABASE_URL is required}"
: "${SUPABASE_SERVICE_ROLE_KEY:?SUPABASE_SERVICE_ROLE_KEY is required}"
: "${PILOT_BACKUP_ENCRYPTION_PASSPHRASE:?PILOT_BACKUP_ENCRYPTION_PASSPHRASE is required}"

case "$NEXT_PUBLIC_SUPABASE_URL" in
  http://127.0.0.1:*|http://localhost:*) ;;
  *) echo "PILOT_RESTORE_SAFETY_GATE: only local synthetic Supabase is allowed" >&2; exit 1 ;;
esac
[[ "${PILOT_MODE:-}" == true && "${PILOT_SYNTHETIC_DATA_ONLY:-}" == true ]] || {
  echo "PILOT_RESTORE_SAFETY_GATE: synthetic-only pilot mode is required" >&2
  exit 1
}

for command in psql curl openssl sha256sum tar; do
  command -v "$command" >/dev/null || { echo "missing command: $command" >&2; exit 1; }
done

WORK_DIR=$(mktemp -d "${TMPDIR:-/tmp}/educa-pilot-restore.XXXXXX")
BACKUP_DIR="$WORK_DIR/portable-backup"
RESTORED_DIR="$WORK_DIR/restored-backup"
RESTORE_DB="educa_pilot_restore_$$"
RESTORE_URL="${DB_URL%/*}/$RESTORE_DB"
RESTORE_CREATED=false
mkdir -p "$BACKUP_DIR" "$RESTORED_DIR"

cleanup() {
  if [[ "$RESTORE_CREATED" == true ]]; then
    psql "$DB_URL" -v ON_ERROR_STOP=1 -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$RESTORE_DB'" >/dev/null 2>&1 || true
    psql "$DB_URL" -v ON_ERROR_STOP=1 -c "DROP DATABASE IF EXISTS \"$RESTORE_DB\"" >/dev/null 2>&1 || true
  fi
  rm -rf "$WORK_DIR"
}
trap cleanup EXIT

# Strict allowlist: the portable artifact contains CSV data and media bytes only.
# No SQL parser is needed and no owner, ACL, extension, role, or managed SET
# statement can enter the artifact.
PUBLIC_TABLES=(
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

export_table() {
  local table=$1
  psql "$DB_URL" -X -v ON_ERROR_STOP=1 \
    -c "\\copy public.$table TO '$BACKUP_DIR/public.$table.csv' WITH (FORMAT csv, HEADER true)" >/dev/null
}

BACKUP_EPOCH=$(date +%s)
BACKUP_ISO=$(date -u +%Y-%m-%dT%H:%M:%SZ)
for table in "${PUBLIC_TABLES[@]}"; do export_table "$table"; done

# Provider boundaries are represented by a minimal portable identity manifest
# and storage metadata/bytes. Provider PITR remains a separate control.
psql "$DB_URL" -X -v ON_ERROR_STOP=1 \
  -c "\\copy (SELECT id,email,created_at FROM auth.users ORDER BY id) TO '$BACKUP_DIR/auth.users.csv' WITH (FORMAT csv, HEADER true)" >/dev/null
psql "$DB_URL" -X -v ON_ERROR_STOP=1 \
  -c "\\copy (SELECT id,bucket_id,name,metadata,created_at FROM storage.objects WHERE bucket_id='student-photos' ORDER BY id) TO '$BACKUP_DIR/storage.objects.csv' WITH (FORMAT csv, HEADER true)" >/dev/null

STORAGE_OBJECT_PATH="10000000-0000-0000-0000-000000000001/synthetic-student/avatar.png"
curl --fail --silent --show-error \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  "$NEXT_PUBLIC_SUPABASE_URL/storage/v1/object/authenticated/student-photos/$STORAGE_OBJECT_PATH" \
  --output "$BACKUP_DIR/storage-object.png"
STORAGE_SHA=$(sha256sum "$BACKUP_DIR/storage-object.png" | cut -d' ' -f1)

cat > "$BACKUP_DIR/manifest.txt" <<EOF
format=educa-portable-csv-v1
created_at=$BACKUP_ISO
schema_source=repository_migrations
excluded=owners,acls,roles,extensions,managed_session_settings,provider_pitr_metadata
provider_boundary=auth_identity_manifest,storage_metadata_and_bytes
EOF

tar -C "$BACKUP_DIR" -cf "$WORK_DIR/portable-backup.tar" .
openssl enc -aes-256-cbc -pbkdf2 -salt \
  -pass env:PILOT_BACKUP_ENCRYPTION_PASSPHRASE \
  -in "$WORK_DIR/portable-backup.tar" -out "$WORK_DIR/portable-backup.tar.enc"
ENCRYPTED_SHA=$(sha256sum "$WORK_DIR/portable-backup.tar.enc" | cut -d' ' -f1)

RESTORE_STARTED=$(date +%s)
openssl enc -d -aes-256-cbc -pbkdf2 \
  -pass env:PILOT_BACKUP_ENCRYPTION_PASSPHRASE \
  -in "$WORK_DIR/portable-backup.tar.enc" -out "$WORK_DIR/restored-backup.tar"
tar -C "$RESTORED_DIR" -xf "$WORK_DIR/restored-backup.tar"

# The isolated target begins empty. Provider-owned seams are represented by a
# minimal compatibility bootstrap, then application schema/RLS/grants come only
# from repository migrations.
psql "$DB_URL" -v ON_ERROR_STOP=1 -c "CREATE DATABASE \"$RESTORE_DB\"" >/dev/null
RESTORE_CREATED=true
psql "$RESTORE_URL" -X -v ON_ERROR_STOP=1 >/dev/null <<'SQL'
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
GRANT ALL ON auth.users, storage.buckets, storage.objects TO service_role;
SQL

mapfile -t migrations < <(find "$MIGRATIONS_DIR" -maxdepth 1 -type f -name '*.sql' -print | sort)
for migration in "${migrations[@]}"; do
  psql "$RESTORE_URL" -X -v ON_ERROR_STOP=1 -f "$migration" >/dev/null
 done
psql "$RESTORE_URL" -X -v ON_ERROR_STOP=1 -f "$PILOT_PROVISIONING" >/dev/null

restore_table() {
  local table=$1
  psql "$RESTORE_URL" -X -v ON_ERROR_STOP=1 \
    -c "SET ROLE service_role" \
    -c "\\copy public.$table FROM '$RESTORED_DIR/public.$table.csv' WITH (FORMAT csv, HEADER true)" >/dev/null
}

# Migrations seed the synthetic municipality config. All backed-up tables below
# are otherwise empty before the portable replay.
for table in "${PUBLIC_TABLES[@]}"; do restore_table "$table"; done
psql "$RESTORE_URL" -X -v ON_ERROR_STOP=1 \
  -c "SET ROLE service_role" \
  -c "\\copy auth.users FROM '$RESTORED_DIR/auth.users.csv' WITH (FORMAT csv, HEADER true)" \
  -c "\\copy storage.objects FROM '$RESTORED_DIR/storage.objects.csv' WITH (FORMAT csv, HEADER true)" >/dev/null

query_source() { psql "$DB_URL" -X -Atq -v ON_ERROR_STOP=1 -c "$1"; }
query_restore() { psql "$RESTORE_URL" -X -Atq -v ON_ERROR_STOP=1 -c "$1"; }
checksum_query() { printf "SELECT md5(coalesce(string_agg(row_to_json(t)::text, ',' ORDER BY id),'')) FROM (SELECT * FROM public.%s ORDER BY id) t" "$1"; }

SCHOOL_COUNT=$(query_restore "SELECT count(*) FROM public.escolas")
USER_COUNT=$(query_restore "SELECT count(*) FROM public.users")
AUTH_COUNT=$(query_restore "SELECT count(*) FROM auth.users")
STUDENT_COUNT=$(query_restore "SELECT count(*) FROM public.alunos")
STORAGE_METADATA_COUNT=$(query_restore "SELECT count(*) FROM storage.objects WHERE bucket_id='student-photos'")
POLICY_COUNT=$(query_restore "SELECT count(*) FROM pg_policies WHERE policyname LIKE 'pilot_%'")
GRANT_OK=$(query_restore "SELECT has_table_privilege('authenticated','public.alunos','SELECT') AND NOT has_table_privilege('authenticated','public.notas','SELECT')")
VIEW_OK=$(query_restore "SELECT coalesce(reloptions @> ARRAY['security_invoker=true'],false) FROM pg_class WHERE oid='public.vw_frequencia_completa'::regclass")
RPC_OK=$(query_restore "SELECT to_regprocedure('public.pilot_dashboard_metrics(uuid)') IS NOT NULL")
RELATIONSHIP_OK=$(query_restore "SELECT NOT EXISTS (SELECT 1 FROM public.matriculas m LEFT JOIN public.alunos a ON a.id=m.aluno_id LEFT JOIN public.turmas t ON t.id=m.turma_id WHERE a.id IS NULL OR t.id IS NULL)")
TOMBSTONE_OK=$(query_restore "SELECT EXISTS (SELECT 1 FROM public.pilot_data_tombstones WHERE source_fingerprint='synthetic-deleted-copy-sha256') AND NOT EXISTS (SELECT 1 FROM public.pilot_import_batches WHERE content_sha256='synthetic-deleted-copy-sha256')")
AUDIT_SOURCE_COUNT=$(query_source "SELECT count(*) FROM public.pilot_audit_log")
AUDIT_RESTORE_COUNT=$(query_restore "SELECT count(*) FROM public.pilot_audit_log")
SOURCE_STUDENT_CHECKSUM=$(query_source "$(checksum_query alunos)")
RESTORE_STUDENT_CHECKSUM=$(query_restore "$(checksum_query alunos)")
SOURCE_ATTENDANCE_CHECKSUM=$(query_source "$(checksum_query frequencia)")
RESTORE_ATTENDANCE_CHECKSUM=$(query_restore "$(checksum_query frequencia)")
RESTORED_STORAGE_SHA=$(sha256sum "$RESTORED_DIR/storage-object.png" | cut -d' ' -f1)

TEACHER_ID=$(query_restore "SELECT id FROM public.users WHERE email='professora.a@synthetic.invalid'")
ATTENDANCE_WRITE_OK=$(psql "$RESTORE_URL" -X -Atq -v ON_ERROR_STOP=1 <<SQL
BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','$TEACHER_ID',true);
INSERT INTO public.frequencia(id,matricula_id,data_aula,presente,status_presenca,professor_id)
VALUES ('71000000-0000-0000-0000-000000000001','50000000-0000-0000-0000-000000000001','2026-07-28',true,'presente','$TEACHER_ID');
SELECT count(*)=1 FROM public.frequencia WHERE id='71000000-0000-0000-0000-000000000001';
ROLLBACK;
SQL
)
ATTENDANCE_WRITE_OK=$(printf '%s\n' "$ATTENDANCE_WRITE_OK" | tail -1)

[[ "$AUTH_COUNT" -ge 4 && "$STORAGE_METADATA_COUNT" -ge 1 && "$POLICY_COUNT" -ge 8 ]] || { echo "portable restore count verification failed" >&2; exit 1; }
[[ "$GRANT_OK" == t && "$VIEW_OK" == t && "$RPC_OK" == t && "$RELATIONSHIP_OK" == t && "$TOMBSTONE_OK" == t && "$ATTENDANCE_WRITE_OK" == t ]] || { echo "portable restore policy/relationship/attendance verification failed" >&2; exit 1; }
[[ "$SOURCE_STUDENT_CHECKSUM" == "$RESTORE_STUDENT_CHECKSUM" && "$SOURCE_ATTENDANCE_CHECKSUM" == "$RESTORE_ATTENDANCE_CHECKSUM" ]] || { echo "portable restore table checksum mismatch" >&2; exit 1; }
[[ "$STORAGE_SHA" == "$RESTORED_STORAGE_SHA" ]] || { echo "portable restore storage checksum mismatch" >&2; exit 1; }
[[ "$AUDIT_RESTORE_COUNT" -ge "$AUDIT_SOURCE_COUNT" ]] || { echo "portable restore lost audit rows" >&2; exit 1; }

RESTORE_FINISHED=$(date +%s)
RTO_SECONDS=$((RESTORE_FINISHED - RESTORE_STARTED))
RPO_SECONDS=$((RESTORE_STARTED - BACKUP_EPOCH))
[[ "$RTO_SECONDS" -le 14400 && "$RPO_SECONDS" -le 86400 ]] || { echo "RPO/RTO target missed" >&2; exit 1; }

mkdir -p "$(dirname "$EVIDENCE_FILE")"

cat > "$EVIDENCE_FILE" <<EOF
# Synthetic restore evidence

This is an isolated application-level portable restore with synthetic data only. It is not evidence of municipal production readiness or legal approval. Provider-managed PITR remains a separate operational control.

| Evidence | Observed |
|---|---:|
| Backup timestamp (UTC) | $BACKUP_ISO |
| Artifact format | \`educa-portable-csv-v1\`, encrypted tar |
| Schema source | repository migrations |
| Intentionally excluded | owners, ACLs, roles, extensions, managed session settings, provider PITR metadata |
| Source/restore topology | local Supabase -> migrated isolated database \`$RESTORE_DB\` |
| Encrypted artifact SHA-256 | \`$ENCRYPTED_SHA\` |
| RPO observed | ${RPO_SECONDS}s (target <= 86400s / 24h) |
| RTO observed | ${RTO_SECONDS}s (target <= 14400s / 4h) |
| Schools / profiles / Auth manifest users | $SCHOOL_COUNT / $USER_COUNT / $AUTH_COUNT |
| Students | $STUDENT_COUNT |
| Student checksum source/restore | \`$SOURCE_STUDENT_CHECKSUM\` / \`$RESTORE_STUDENT_CHECKSUM\` |
| Attendance checksum source/restore | \`$SOURCE_ATTENDANCE_CHECKSUM\` / \`$RESTORE_ATTENDANCE_CHECKSUM\` |
| Attendance RLS write rehearsal | $ATTENDANCE_WRITE_OK |
| Relationships valid | $RELATIONSHIP_OK |
| Audit rows source/restore | $AUDIT_SOURCE_COUNT / $AUDIT_RESTORE_COUNT |
| Storage metadata objects | $STORAGE_METADATA_COUNT |
| Storage byte checksum | \`$RESTORED_STORAGE_SHA\` |
| Pilot policies | $POLICY_COUNT |
| Grants / security-invoker view / dashboard RPC | $GRANT_OK / $VIEW_OK / $RPC_OK |
| Tombstone prevents silent resurrection | $TOMBSTONE_OK |

The isolated database and decrypted temporary artifacts were removed by the rehearsal trap after evidence collection.
EOF

echo "Portable synthetic restore passed: format=educa-portable-csv-v1 RPO=${RPO_SECONDS}s RTO=${RTO_SECONDS}s evidence=$EVIDENCE_FILE"
