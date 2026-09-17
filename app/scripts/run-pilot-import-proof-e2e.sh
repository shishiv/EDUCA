#!/usr/bin/env bash
set -euo pipefail

APP_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
ROOT_DIR=$(cd "$APP_DIR/.." && pwd)
MIGRATIONS_DIR="$ROOT_DIR/supabase/migrations"
BOOTSTRAP="$ROOT_DIR/supabase/tests/database/bootstrap.sql"
PILOT_PROVISIONING="$ROOT_DIR/supabase/pilot/provision-pilot-module-gate.sql"
source "$APP_DIR/scripts/pilot-import-proof-lifecycle.sh"
begin_import_proof

case "$RETENTION_DELIBERATE_BREAK" in
  none|isolation) ;;
  *) echo 'PILOT_IMPORT_RETENTION_BREAK_INVALID' >&2; exit 1 ;;
esac

for command in initdb pg_ctl psql node pnpm; do
  command -v "$command" >/dev/null || { echo "PILOT_IMPORT_PROOF_E2E_MISSING_COMMAND: $command" >&2; exit 1; }
done

WORK_DIR=$(mktemp -d "${TMPDIR:-/tmp}/educa-pilot-import-proof.XXXXXX")
WORKSPACE_STATE=created
# Keep child tool caches and temporary files inside the owned cleanup boundary.
export TMPDIR="$WORK_DIR"
DATA_DIR="$WORK_DIR/data"
PORT=${POSTGRES_TEST_PORT:-$((50000 + $$ % 10000))}
PROOF_DB="educa_pilot_proof_$$"
PROOF_URL="postgresql://postgres@127.0.0.1:$PORT/$PROOF_DB"
CSV_FILE="$WORK_DIR/pilot.csv"
SECOND_CSV_FILE="$WORK_DIR/pilot-second.csv"
APPROVAL_FILE="$WORK_DIR/approval.json"
MISSING_OWNER_FILE="$WORK_DIR/approval-missing-owner.json"
CHANGED_GOVERNANCE_FILE="$WORK_DIR/approval-changed-governance.json"

# Raw subprocess output stays inside the private disposable workspace. Only
# allowlisted lifecycle diagnostics and the post-cleanup receipt escape it.
{
PROOF_STAGE=initdb
initdb -D "$DATA_DIR" -A trust --no-locale --encoding=UTF8 --username=postgres >/dev/null
PROOF_STAGE=start
START_ATTEMPTED=true
pg_ctl -D "$DATA_DIR" -l "$WORK_DIR/postgres.log" -o "-F -k '' -p $PORT -h 127.0.0.1" -t 15 -w start >/dev/null
DATABASE_STATE=running
PROOF_STAGE=proof

PSQL=(psql -X -h 127.0.0.1 -p "$PORT" -U postgres -v ON_ERROR_STOP=1)
"${PSQL[@]}" -d postgres -c "CREATE DATABASE \"$PROOF_DB\"" >/dev/null

"${PSQL[@]}" -d "$PROOF_DB" -f "$BOOTSTRAP" >/dev/null
"${PSQL[@]}" -d "$PROOF_DB" >/dev/null <<'SQL'
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
  user_metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
CREATE FUNCTION storage.foldername(name text) RETURNS text[]
LANGUAGE sql IMMUTABLE AS $$ SELECT string_to_array(name, '/') $$;
GRANT USAGE ON SCHEMA storage TO service_role;
GRANT ALL ON storage.buckets, storage.objects TO service_role;
SQL
mapfile -t migrations < <(find "$MIGRATIONS_DIR" -maxdepth 1 -type f -name '*.sql' -print | sort)
for migration in "${migrations[@]}"; do
  "${PSQL[@]}" -d "$PROOF_DB" -f "$migration" >/dev/null
done
"${PSQL[@]}" -d "$PROOF_DB" -f "$PILOT_PROVISIONING" >/dev/null

"${PSQL[@]}" -d "$PROOF_DB" >/dev/null <<'SQL'
INSERT INTO public.escolas(id, codigo, nome, tipo, ativo)
VALUES ('10000000-0000-0000-0000-000000000099', 'SYN-PROOF', 'Escola Prova Sintetica', 'fundamental', true);
INSERT INTO public.users(id, nome, email, tipo_usuario, escola_id, ativo, primeiro_login, senha_padrao)
VALUES
  ('20000000-0000-0000-0000-000000000099', 'Secretaria Prova Sintetica', 'secretaria.prova@synthetic.invalid', 'secretario', NULL, true, false, false),
  ('20000000-0000-0000-0000-000000000098', 'Diretora Prova Sintetica', 'diretora.prova@synthetic.invalid', 'diretor', '10000000-0000-0000-0000-000000000099', true, false, false);
INSERT INTO public.turmas(id, import_source_id, nome, serie, turno, ano_letivo, capacidade, escola_id, ativo)
VALUES ('30000000-0000-0000-0000-000000000099', 'SYN-PROOF-CLASS', 'Turma Prova Sintetica', '1 ano', 'matutino', 2026, 30, '10000000-0000-0000-0000-000000000099', true);
INSERT INTO public.pilot_data_treatment_agreements(
  escola_id, reference, version, confirmed, confirmed_at, confirmed_by
)
VALUES (
  '10000000-0000-0000-0000-000000000099',
  'DPA-SYN-PROOF-001',
  'v1',
  true,
  now() - interval '1 minute',
  '20000000-0000-0000-0000-000000000099'
);
SQL

cat > "$CSV_FILE" <<'CSV'
synthetic_marker,source_id,school_code,class_code,student_name,birth_date,sex,guardian_name,guardian_phone,guardian_relationship
SYNTHETIC-EDUCA-PILOT,synthetic-proof-student,SYN-PROOF,SYN-PROOF-CLASS,Aluno Prova Sintetico,2018-05-20,M,Responsavel Prova Sintetico,11999990000,mae
CSV
cat > "$SECOND_CSV_FILE" <<'CSV'
synthetic_marker,source_id,school_code,class_code,student_name,birth_date,sex,guardian_name,guardian_phone,guardian_relationship
SYNTHETIC-EDUCA-PILOT,synthetic-proof-student-two,SYN-PROOF,SYN-PROOF-CLASS,Aluno Prova Sintetico Dois,2018-06-21,F,Responsavel Prova Sintetico Dois,11999990001,pai
CSV

RECORDED_AT=$(date -u -d '1 minute ago' +%Y-%m-%dT%H:%M:%S.000Z)
RAW_EXPIRES_AT=$(date -u -d '1 day' +%Y-%m-%dT%H:%M:%S.000Z)
CANONICAL_EXPIRES_AT=$(date -u -d '30 days' +%Y-%m-%dT%H:%M:%S.000Z)
ROLLBACK_UNTIL=$(date -u -d '7 days' +%Y-%m-%dT%H:%M:%S.000Z)
cat > "$APPROVAL_FILE" <<JSON
{
  "version": "educa-synthetic-pilot-governance-v1",
  "owner": {"name": "Secretaria Prova Sintetica", "email": "secretaria.prova@synthetic.invalid"},
  "controller": {"name": "Controlador Prova Sintetico", "email": "controller.prova@synthetic.invalid", "status": "a confirmar"},
  "processor": {"name": "Processador Prova Sintetico", "email": "processor.prova@synthetic.invalid", "status": "a confirmar"},
  "purpose": "preparacao tecnica do piloto sintetico",
  "legalBasis": "a confirmar",
  "processingAgreement": {
    "reference": "DPA-SYN-PROOF-001",
    "version": "v1",
    "status": "confirmed",
    "confirmed": true,
    "recordedAt": "$RECORDED_AT",
    "recordedBy": {"name": "Secretaria Prova Sintetica", "email": "secretaria.prova@synthetic.invalid"}
  },
  "approval": {
    "submittedBy": {"name": "Secretaria Prova Sintetica", "email": "secretaria.prova@synthetic.invalid"},
    "approvedBy": {"name": "Diretora Prova Sintetica", "email": "diretora.prova@synthetic.invalid"},
    "approvedAt": "$RECORDED_AT"
  },
  "subprocessors": [{
    "name": "Armazenamento Prova Sintetico",
    "email": "storage.prova@synthetic.invalid",
    "status": "a confirmar",
    "service": "armazenamento cifrado de prova",
    "processingLocation": "isolated-proof-local"
  }],
  "location": {"primary": "isolated-proof-local", "transfer": "a confirmar"},
  "encryption": {
    "algorithm": "aes-256-gcm",
    "keyReference": "proof-e2e-v1",
    "inTransit": "a confirmar",
    "plaintextStored": false
  },
  "retention": {
    "policy": "proof-only-30d",
    "rawPayloadExpiresAt": "$RAW_EXPIRES_AT",
    "canonicalDataExpiresAt": "$CANONICAL_EXPIRES_AT",
    "rollbackUntil": "$ROLLBACK_UNTIL"
  },
  "exit": {
    "trigger": "fim da prova tecnica",
    "dataDisposition": "a confirmar",
    "accessRevocation": "a confirmar",
    "evidence": "a confirmar"
  },
  "incident": {
    "contact": {"name": "Contato Incidente Sintetico", "email": "incidente.prova@synthetic.invalid"},
    "notification": "a confirmar",
    "response": "a confirmar"
  }
}
JSON
cp "$APPROVAL_FILE" "$MISSING_OWNER_FILE"
node -e "const fs=require('node:fs'); const p=process.argv[1]; const x=JSON.parse(fs.readFileSync(p,'utf8')); delete x.owner; fs.writeFileSync(p, JSON.stringify(x));" "$MISSING_OWNER_FILE"

export PILOT_MODE=true
export PILOT_IMPORT_TARGET=isolated-proof
export PILOT_IMPORT_PROOF_DATABASE_URL="$PROOF_URL"
export PILOT_IMPORT_DATA_MODE=synthetic
export PILOT_SYNTHETIC_DATA_ONLY=true
export PILOT_IMPORT_SYNTHETIC_MARKER=SYNTHETIC-EDUCA-PILOT
export NEXT_PUBLIC_DEMO_SANDBOX=false
export DEMO_SANDBOX=false
PILOT_IMPORT_ENCRYPTION_KEY="$(printf '01234567890123456789012345678901' | base64 -w0)"
export PILOT_IMPORT_ENCRYPTION_KEY
export PILOT_IMPORT_ENCRYPTION_KEY_ID=proof-e2e-v1
unset SUPABASE_DEMO_URL SUPABASE_DEMO_DB_URL SUPABASE_DEMO_SERVICE_KEY

run_expected_failure() {
  local expected=$1
  shift
  local output
  local status
  set +e
  output=$("$@" 2>&1)
  status=$?
  set -e
  printf '%s\n' "$output" > "$WORK_DIR/expected-failure.log"
  if [[ "$status" -eq 0 ]]; then
    echo "PILOT_IMPORT_PROOF_DELIBERATE_BREAK_FAILED: $expected did not turn red" >&2
    exit 1
  fi
  grep -F "$expected" "$WORK_DIR/expected-failure.log" >/dev/null || {
    echo "PILOT_IMPORT_PROOF_DELIBERATE_BREAK_WRONG_ERROR: expected $expected" >&2
    exit 1
  }
}

run_expected_safety_failure() {
  local expected=$1
  shift
  run_expected_failure "$expected" "$@"
  grep -F 'PILOT_IMPORT_PROOF_SAFETY_RECEIPT' "$WORK_DIR/expected-failure.log" >/dev/null || {
    echo "PILOT_IMPORT_PROOF_SAFETY_RECEIPT_MISSING: $expected" >&2
    exit 1
  }
}

UNREACHABLE_PROOF_URL="postgresql://postgres@127.0.0.1:$((PORT + 1))/educa_pilot_proof_blocked"
INITIAL_BATCH_COUNT=$("${PSQL[@]}" -d "$PROOF_DB" -At -c "SELECT count(*) FROM public.pilot_import_batches")
run_expected_safety_failure PILOT_IMPORT_PROOF_TARGET_MISMATCH env \
  PILOT_IMPORT_TARGET=unexpected-target PILOT_IMPORT_PROOF_DATABASE_URL="$UNREACHABLE_PROOF_URL" \
  pnpm --dir "$APP_DIR" exec tsx scripts/pilot-import-proof.ts import --csv "$CSV_FILE" --approval "$APPROVAL_FILE"
run_expected_safety_failure PILOT_IMPORT_PROOF_DATABASE_LOCAL_ONLY env \
  PILOT_IMPORT_PROOF_DATABASE_URL='postgresql://postgres@127.0.0.2/educa_pilot_proof_test' \
  pnpm --dir "$APP_DIR" exec tsx scripts/pilot-import-proof.ts import --csv "$CSV_FILE" --approval "$APPROVAL_FILE"
run_expected_safety_failure PILOT_IMPORT_PROOF_DEMO_DENIED env \
  NEXT_PUBLIC_DEMO_SANDBOX=true PILOT_IMPORT_PROOF_DATABASE_URL="$UNREACHABLE_PROOF_URL" \
  pnpm --dir "$APP_DIR" exec tsx scripts/pilot-import-proof.ts import --csv "$CSV_FILE" --approval "$APPROVAL_FILE"
run_expected_safety_failure PILOT_IMPORT_PROOF_DEMO_REFERENCE_DENIED env \
  SUPABASE_DEMO_URL='synthetic-demo-reference' PILOT_IMPORT_PROOF_DATABASE_URL="$UNREACHABLE_PROOF_URL" \
  pnpm --dir "$APP_DIR" exec tsx scripts/pilot-import-proof.ts import --csv "$CSV_FILE" --approval "$APPROVAL_FILE"
run_expected_safety_failure PILOT_IMPORT_PROOF_REAL_DATA_DENIED env \
  PILOT_IMPORT_DATA_MODE=real PILOT_SYNTHETIC_DATA_ONLY=false \
  PILOT_IMPORT_REAL_DATA_CONFIRMATION=isolated-proof-only PILOT_IMPORT_PROOF_DATABASE_URL="$UNREACHABLE_PROOF_URL" \
  pnpm --dir "$APP_DIR" exec tsx scripts/pilot-import-proof.ts import --csv "$CSV_FILE" --approval "$APPROVAL_FILE"
run_expected_safety_failure PILOT_IMPORT_PROOF_SYNTHETIC_MARKER_REQUIRED env \
  -u PILOT_IMPORT_SYNTHETIC_MARKER PILOT_IMPORT_PROOF_DATABASE_URL="$UNREACHABLE_PROOF_URL" \
  pnpm --dir "$APP_DIR" exec tsx scripts/pilot-import-proof.ts import --csv "$CSV_FILE" --approval "$APPROVAL_FILE"
run_expected_safety_failure PILOT_IMPORT_PROOF_DATA_MODE_REQUIRED env \
  -u PILOT_IMPORT_DATA_MODE PILOT_IMPORT_PROOF_DATABASE_URL="$UNREACHABLE_PROOF_URL" \
  pnpm --dir "$APP_DIR" exec tsx scripts/pilot-import-proof.ts import --csv "$CSV_FILE" --approval "$APPROVAL_FILE"
run_expected_safety_failure PILOT_IMPORT_PROOF_PILOT_MODE_REQUIRED env \
  PILOT_MODE=false PILOT_IMPORT_PROOF_DATABASE_URL="$UNREACHABLE_PROOF_URL" \
  pnpm --dir "$APP_DIR" exec tsx scripts/pilot-import-proof.ts import --csv "$CSV_FILE" --approval "$APPROVAL_FILE"

run_expected_failure PILOT_IMPORT_GOVERNANCE_INVALID pnpm --dir "$APP_DIR" exec tsx scripts/pilot-import-proof.ts import --csv "$CSV_FILE" --approval "$MISSING_OWNER_FILE"
run_expected_failure PILOT_IMPORT_KEY_MISSING env -u PILOT_IMPORT_ENCRYPTION_KEY pnpm --dir "$APP_DIR" exec tsx scripts/pilot-import-proof.ts import --csv "$CSV_FILE" --approval "$APPROVAL_FILE"
run_expected_failure PILOT_IMPORT_PROOF_DEMO_DENIED env NEXT_PUBLIC_DEMO_SANDBOX=true DEMO_SANDBOX=false pnpm --dir "$APP_DIR" exec tsx scripts/pilot-import-proof.ts import --csv "$CSV_FILE" --approval "$APPROVAL_FILE"

AFTER_FAILURE_BATCH_COUNT=$("${PSQL[@]}" -d "$PROOF_DB" -At -c "SELECT count(*) FROM public.pilot_import_batches")
[[ "$AFTER_FAILURE_BATCH_COUNT" == "$INITIAL_BATCH_COUNT" ]] || {
  echo "PILOT_IMPORT_PROOF_SAFETY_MUTATION: rejected proof input changed the database" >&2
  exit 1
}

IMPORT_OUTPUT=$(pnpm --dir "$APP_DIR" exec tsx scripts/pilot-import-proof.ts import --csv "$CSV_FILE" --approval "$APPROVAL_FILE")
printf '%s\n' "$IMPORT_OUTPUT"
grep -F '"target":"isolated-proof"' <<<"$IMPORT_OUTPUT" >/dev/null || {
  echo "PILOT_IMPORT_PROOF_RECEIPT_TARGET_MISSING: accepted target is not observable" >&2
  exit 1
}
grep -F '"attemptedTarget":"isolated-proof"' <<<"$IMPORT_OUTPUT" >/dev/null || {
  echo "PILOT_IMPORT_PROOF_RECEIPT_SAFETY_MISSING: accepted safety receipt is not observable" >&2
  exit 1
}
BATCH_ID=$(printf '%s\n' "$IMPORT_OUTPUT" | sed -n 's/.*"batchId":"\([0-9a-f-]*\)".*/\1/p' | tail -1)
SOURCE_FINGERPRINT=$(printf '%s\n' "$IMPORT_OUTPUT" | sed -n 's/.*"sourceFingerprintSha256":"\([a-f0-9]*\)".*/\1/p' | tail -1)
CANONICAL_FINGERPRINT=$(printf '%s\n' "$IMPORT_OUTPUT" | sed -n 's/.*"canonicalFingerprintSha256":"\([a-f0-9]*\)".*/\1/p' | tail -1)
DATABASE_FINGERPRINT=$(printf '%s\n' "$IMPORT_OUTPUT" | sed -n 's/.*"databaseFingerprintSha256":"\([a-f0-9]*\)".*/\1/p' | tail -1)
GOVERNANCE_FINGERPRINT=$(printf '%s\n' "$IMPORT_OUTPUT" | sed -n 's/.*"governanceFingerprintSha256":"\([a-f0-9]*\)".*/\1/p' | tail -1)
GOVERNANCE_VERSION=$(printf '%s\n' "$IMPORT_OUTPUT" | sed -n 's/.*"governanceManifestVersion":"\([^"]*\)".*/\1/p' | tail -1)
[[ -n "$BATCH_ID" && -n "$SOURCE_FINGERPRINT" && -n "$CANONICAL_FINGERPRINT" && -n "$DATABASE_FINGERPRINT" && -n "$GOVERNANCE_FINGERPRINT" && "$GOVERNANCE_VERSION" == 'educa-synthetic-pilot-governance-v1' ]] || {
  echo "PILOT_IMPORT_PROOF_E2E_RECEIPT_MISSING: batch or fingerprint receipt field not found" >&2
  exit 1
}
STORAGE_FINGERPRINT=$("${PSQL[@]}" -d "$PROOF_DB" -At -c "SELECT coalesce(user_metadata->>'pilot_import_object_fingerprint', metadata->>'pilot_import_object_fingerprint') FROM storage.objects WHERE coalesce(user_metadata->>'pilot_import_batch_id', metadata->>'pilot_import_batch_id') = '$BATCH_ID'")
[[ "$STORAGE_FINGERPRINT" =~ ^[a-f0-9]{64}$ ]] || {
  echo "PILOT_IMPORT_PROOF_E2E_STORAGE_RECEIPT_MISSING: Storage association fingerprint not found" >&2
  exit 1
}
if printf '%s\n' "$IMPORT_OUTPUT" | grep -E 'Aluno Prova Sintetico|Responsavel Prova Sintetico|@synthetic\.invalid' >/dev/null; then
  echo "PILOT_IMPORT_PROOF_E2E_RECEIPT_PII: receipt contains CSV or PII" >&2
  exit 1
fi

cp "$APPROVAL_FILE" "$CHANGED_GOVERNANCE_FILE"
node -e "const fs=require('node:fs'); const p=process.argv[1]; const x=JSON.parse(fs.readFileSync(p,'utf8')); x.purpose='preparacao tecnica de rollback sintetico'; fs.writeFileSync(p, JSON.stringify(x));" "$CHANGED_GOVERNANCE_FILE"
run_expected_failure PILOT_IMPORT_IDEMPOTENCY_GOVERNANCE_MISMATCH pnpm --dir "$APP_DIR" exec tsx scripts/pilot-import-proof.ts import --csv "$CSV_FILE" --approval "$CHANGED_GOVERNANCE_FILE"

SECOND_IMPORT_OUTPUT=$(pnpm --dir "$APP_DIR" exec tsx scripts/pilot-import-proof.ts import --csv "$SECOND_CSV_FILE" --approval "$APPROVAL_FILE")
printf '%s\n' "$SECOND_IMPORT_OUTPUT"
SECOND_BATCH_ID=$(printf '%s\n' "$SECOND_IMPORT_OUTPUT" | sed -n 's/.*"batchId":"\([0-9a-f-]*\)".*/\1/p' | tail -1)
[[ -n "$SECOND_BATCH_ID" && "$SECOND_BATCH_ID" != "$BATCH_ID" ]] || {
  echo "PILOT_IMPORT_PROOF_E2E_ISOLATION_SETUP_FAILED: second batch was not created" >&2
  exit 1
}

PAYLOAD_CHECK=$("${PSQL[@]}" -d "$PROOF_DB" -At -c "SELECT (import_target = 'isolated_proof' AND source_mode = 'synthetic' AND encrypted_payload IS NOT NULL AND iv IS NOT NULL AND auth_tag IS NOT NULL AND encrypted_payload NOT LIKE '%Aluno Prova Sintetico%' AND source_row_count = 1 AND canonical_counts->>'storageObjects' = '1' AND canonical_fingerprint_sha256 IS NOT NULL AND database_fingerprint_sha256 IS NOT NULL AND governance_fingerprint_sha256 IS NOT NULL AND governance_owner_name = 'Secretaria Prova Sintetica' AND processing_agreement_reference = 'DPA-SYN-PROOF-001' AND processing_agreement_confirmed = true AND retention_policy = 'proof-only-30d') FROM public.pilot_import_batches WHERE id = '$BATCH_ID'")
[[ "$PAYLOAD_CHECK" == t ]] || { echo "PILOT_IMPORT_PROOF_E2E_CONTRACT_FAILED: encrypted governance batch receipt" >&2; exit 1; }

ROW_CHECK=$("${PSQL[@]}" -d "$PROOF_DB" -At -c "SELECT ((SELECT count(*) FROM public.alunos WHERE pilot_import_batch_id = '$BATCH_ID') = 1 AND (SELECT count(*) FROM public.responsaveis WHERE pilot_import_batch_id = '$BATCH_ID') = 1 AND (SELECT count(*) FROM public.aluno_responsaveis WHERE pilot_import_batch_id = '$BATCH_ID') = 1 AND (SELECT count(*) FROM public.matriculas WHERE pilot_import_batch_id = '$BATCH_ID') = 1 AND (SELECT count(*) FROM storage.objects WHERE coalesce(user_metadata->>'pilot_import_batch_id', metadata->>'pilot_import_batch_id') = '$BATCH_ID') = 1)")
[[ "$ROW_CHECK" == t ]] || { echo "PILOT_IMPORT_PROOF_E2E_CANONICAL_FAILED: canonical counts or batch trace missing" >&2; exit 1; }

"${PSQL[@]}" -d "$PROOF_DB" -c "UPDATE public.pilot_import_batches SET raw_expires_at = now() - interval '1 minute' WHERE id = '$BATCH_ID'" >/dev/null
CLEANUP_OUTPUT=$(pnpm --dir "$APP_DIR" exec tsx scripts/pilot-import-proof.ts cleanup)
printf '%s\n' "$CLEANUP_OUTPUT"
CLEANED_CHECK=$("${PSQL[@]}" -d "$PROOF_DB" -At -c "SELECT (encrypted_payload IS NULL AND iv IS NULL AND auth_tag IS NULL AND status = 'published') FROM public.pilot_import_batches WHERE id = '$BATCH_ID'")
[[ "$CLEANED_CHECK" == t ]] || { echo "PILOT_IMPORT_PROOF_E2E_RETENTION_FAILED: expired ciphertext was not cleaned" >&2; exit 1; }

ROLLBACK_OUTPUT=$(pnpm --dir "$APP_DIR" exec tsx scripts/pilot-import-proof.ts rollback --batch "$BATCH_ID" --actor-email diretora.prova@synthetic.invalid --reason 'synthetic proof rollback rehearsal')
printf '%s\n' "$ROLLBACK_OUTPUT"
if printf '%s\n' "$ROLLBACK_OUTPUT" | grep -E 'Aluno Prova Sintetico|Responsavel Prova Sintetico|@synthetic\.invalid' >/dev/null; then
  echo "PILOT_IMPORT_PROOF_E2E_ROLLBACK_RECEIPT_PII: receipt contains CSV or PII" >&2
  exit 1
fi
ROLLBACK_CHECK=$("${PSQL[@]}" -d "$PROOF_DB" -At -c "SELECT (status = 'rolled_back' AND rolled_back_at IS NOT NULL AND encrypted_payload IS NULL AND iv IS NULL AND auth_tag IS NULL AND (SELECT count(*) FROM public.alunos WHERE pilot_import_batch_id = '$BATCH_ID') = 0 AND (SELECT count(*) FROM public.responsaveis WHERE pilot_import_batch_id = '$BATCH_ID') = 0 AND (SELECT count(*) FROM public.aluno_responsaveis WHERE pilot_import_batch_id = '$BATCH_ID') = 0 AND (SELECT count(*) FROM public.matriculas WHERE pilot_import_batch_id = '$BATCH_ID') = 0 AND (SELECT count(*) FROM storage.objects WHERE coalesce(user_metadata->>'pilot_import_batch_id', metadata->>'pilot_import_batch_id') = '$BATCH_ID') = 0 AND (SELECT count(*) FROM public.pilot_data_tombstones WHERE entity_type = 'pilot_import_batch' AND source_fingerprint = content_sha256) = 1 AND (SELECT count(*) FROM public.pilot_audit_log WHERE event_type = 'import_rolled_back' AND entity_type = 'pilot_import_batch' AND entity_id = '$BATCH_ID' AND NOT (redacted_metadata ?| ARRAY['cpf','nis','rg','password','senha','health','saude','deficiencia','race','cor_raca'])) = 1) FROM public.pilot_import_batches WHERE id = '$BATCH_ID'")
[[ "$ROLLBACK_CHECK" == t ]] || { echo "PILOT_IMPORT_PROOF_E2E_ROLLBACK_FAILED: rollback did not remove exact batch rows, Storage objects, ciphertext, tombstone, or redacted audit" >&2; exit 1; }

OTHER_BATCH_CHECK=$("${PSQL[@]}" -d "$PROOF_DB" -At -c "SELECT (status = 'published' AND encrypted_payload IS NOT NULL AND (SELECT count(*) FROM public.alunos WHERE pilot_import_batch_id = '$SECOND_BATCH_ID') = 1 AND (SELECT count(*) FROM public.responsaveis WHERE pilot_import_batch_id = '$SECOND_BATCH_ID') = 1 AND (SELECT count(*) FROM public.aluno_responsaveis WHERE pilot_import_batch_id = '$SECOND_BATCH_ID') = 1 AND (SELECT count(*) FROM public.matriculas WHERE pilot_import_batch_id = '$SECOND_BATCH_ID') = 1 AND (SELECT count(*) FROM storage.objects WHERE coalesce(user_metadata->>'pilot_import_batch_id', metadata->>'pilot_import_batch_id') = '$SECOND_BATCH_ID') = 1) FROM public.pilot_import_batches WHERE id = '$SECOND_BATCH_ID'")
[[ "$OTHER_BATCH_CHECK" == t ]] || { echo "PILOT_IMPORT_PROOF_E2E_ISOLATION_FAILED: another batch changed during rollback" >&2; exit 1; }

REPLAY_OUTPUT=$(pnpm --dir "$APP_DIR" exec tsx scripts/pilot-import-proof.ts rollback --batch "$BATCH_ID" --actor-email diretora.prova@synthetic.invalid --reason 'synthetic proof rollback replay')
printf '%s\n' "$REPLAY_OUTPUT"
REPLAY_CHECK=false
if printf '%s\n' "$REPLAY_OUTPUT" | grep -F '"deletedEnrollments":0' >/dev/null \
  && printf '%s\n' "$REPLAY_OUTPUT" | grep -F '"removed":0' >/dev/null \
  && printf '%s\n' "$REPLAY_OUTPUT" | grep -F '"rollbackEvents":1' >/dev/null; then
  REPLAY_CHECK=true
fi
[[ "$REPLAY_CHECK" == true ]] || { echo "PILOT_IMPORT_PROOF_E2E_REPLAY_FAILED: replay was not idempotent" >&2; exit 1; }

PROOF_STAGE=retention
if [[ "$RETENTION_DELIBERATE_BREAK" == isolation ]]; then
  # Deliberately restore the old abort-all failure mechanism in this disposable
  # database only. The retention oracle below must fail, then F05 tears it down.
  "${PSQL[@]}" -d "$PROOF_DB" >/dev/null <<'SQL'
DO $$
DECLARE definition text; broken text;
BEGIN
  definition := pg_get_functiondef('public.pilot_cleanup_import_retention_results()'::regprocedure);
  broken := replace(replace(definition,
    'canonical_status := ''preserved_dependency'';', 'RAISE;'),
    'reason_code := ''batch_failed'';', 'RAISE;');
  IF broken = definition THEN RAISE EXCEPTION 'F08_DELIBERATE_BREAK_NOT_APPLIED'; END IF;
  EXECUTE broken;
END;
$$;
SQL
fi

# The canonical SQL contract includes school B, a finalized snapshot, Vivências,
# attendance, shared state, a mid-delete failure, exact deadlines and retries.
"${PSQL[@]}" -d "$PROOF_DB" -f "$ROOT_DIR/supabase/tests/database/pilot_retention_batch.test.sql" >/dev/null

# Exercise the real CLI receipt with two expired batches, not just its serializer.
THIRD_CSV_FILE="$WORK_DIR/pilot-third.csv"
sed 's/synthetic-proof-student-two/synthetic-proof-student-three/g' "$SECOND_CSV_FILE" > "$THIRD_CSV_FILE"
THIRD_IMPORT_OUTPUT=$(pnpm --dir "$APP_DIR" exec tsx scripts/pilot-import-proof.ts import --csv "$THIRD_CSV_FILE" --approval "$APPROVAL_FILE")
THIRD_BATCH_ID=$(printf '%s\n' "$THIRD_IMPORT_OUTPUT" | sed -n 's/.*"batchId":"\([0-9a-f-]*\)".*/\1/p' | tail -1)
[[ -n "$THIRD_BATCH_ID" && "$THIRD_BATCH_ID" != "$SECOND_BATCH_ID" ]] || exit 1
"${PSQL[@]}" -d "$PROOF_DB" -v blocked_batch="$SECOND_BATCH_ID" -v removable_batch="$THIRD_BATCH_ID" >/dev/null <<'SQL'
INSERT INTO public.sessoes_aula(id, turma_id, escola_id, professor_id, data_aula, conteudo_programatico, status)
VALUES ('30000000-0000-4000-8000-000000000097', '30000000-0000-0000-0000-000000000099',
  '10000000-0000-0000-0000-000000000099', '20000000-0000-0000-0000-000000000098', '2026-03-01', 'Synthetic retention dependency', 'ABERTA');
INSERT INTO public.frequencia(matricula_id, sessao_id, data_aula, presente, status_presenca)
SELECT id, '30000000-0000-4000-8000-000000000097', '2026-03-01', true, 'P'
FROM public.matriculas WHERE pilot_import_batch_id = :'blocked_batch';
-- Fixture clock setup only. The cleanup itself must never rewrite these values.
UPDATE public.pilot_import_batches
SET raw_expires_at = now() - interval '30 days', rollback_until = now() - interval '7 days', canonical_expires_at = now() - interval '1 day'
WHERE id IN (:'blocked_batch', :'removable_batch');
SQL
RETENTION_OUTPUT=$(pnpm --dir "$APP_DIR" exec tsx scripts/pilot-import-proof.ts cleanup)
node - "$RETENTION_OUTPUT" "$SECOND_BATCH_ID" "$THIRD_BATCH_ID" <<'NODE'
const assert = require('node:assert/strict')
const [output, blocked, removed] = process.argv.slice(2)
const receipt = JSON.parse(output.split('PILOT_GOVERNED_RETENTION_RECEIPT: ')[1])
assert.equal(receipt.rawPayloadsCleaned, 2)
assert.equal(receipt.canonicalBatchesDeleted, 1)
assert.equal(receipt.canonicalBatchesPreserved, 1)
assert.equal(receipt.canonicalBatchesFailed, 0)
assert.equal(receipt.batches.length, 2)
assert.equal(receipt.batches.find(batch => batch.batch_id === blocked).canonical_status, 'preserved_dependency')
assert.equal(receipt.batches.find(batch => batch.batch_id === removed).canonical_status, 'deleted')
assert.doesNotMatch(output, /Aluno Prova|Responsavel Prova|@synthetic\.invalid|ciphertext|private-f08-error/)
NODE
RETENTION_RETRY_OUTPUT=$(pnpm --dir "$APP_DIR" exec tsx scripts/pilot-import-proof.ts cleanup)
node - "$RETENTION_RETRY_OUTPUT" "$SECOND_BATCH_ID" <<'NODE'
const assert = require('node:assert/strict')
const [output, blocked] = process.argv.slice(2)
const receipt = JSON.parse(output.split('PILOT_GOVERNED_RETENTION_RECEIPT: ')[1])
assert.equal(receipt.rawPayloadsCleaned, 0)
assert.equal(receipt.canonicalBatchesDeleted, 0)
assert.equal(receipt.batches.length, 1)
assert.equal(receipt.batches[0].batch_id, blocked)
assert.equal(receipt.batches[0].canonical_status, 'preserved_dependency')
NODE
RETENTION_STORAGE_CHECK=$("${PSQL[@]}" -d "$PROOF_DB" -At -c "SELECT (SELECT count(*) FROM storage.objects WHERE coalesce(user_metadata->>'pilot_import_batch_id', metadata->>'pilot_import_batch_id') = '$SECOND_BATCH_ID') = 1 AND (SELECT count(*) FROM storage.objects WHERE coalesce(user_metadata->>'pilot_import_batch_id', metadata->>'pilot_import_batch_id') = '$THIRD_BATCH_ID') = 0 AND (SELECT count(*) FROM public.pilot_data_tombstones WHERE source_fingerprint = (SELECT content_sha256 FROM public.pilot_import_batches WHERE id = '$THIRD_BATCH_ID')) = 1")
[[ "$RETENTION_STORAGE_CHECK" == t ]] || { echo 'PILOT_IMPORT_RETENTION_STORAGE_FAILED' >&2; exit 1; }

write_import_proof_receipt() {
cat <<EOF
# Governed pilot CSV proof receipt

This evidence was generated against a disposable PostgreSQL cluster and one database named $PROOF_DB. The CSV contained synthetic rows only. No demo or production endpoint was used.

| Check | Observed |
| --- | --- |
| runId | $RUN_ID |
| Source commit SHA | $SOURCE_SHA |
| Source working tree dirty | $SOURCE_DIRTY |
| Selection manifest | selection.sha256 |
| Selection SHA-256 | $SELECTION_SHA256 |
| PostgreSQL stopped and workspace removed | true |
| Target | isolated-proof |
| Source mode | synthetic |
| Batch | $BATCH_ID |
| CSV rows | 1 |
| Canonical rows | 1 student, 1 guardian, 1 relationship, 1 enrollment |
| Storage objects owned before rollback | 1 |
| Storage object fingerprint | $STORAGE_FINGERPRINT |
| Source SHA-256 | $SOURCE_FINGERPRINT |
| Canonical SHA-256 | $CANONICAL_FINGERPRINT |
| Database SHA-256 | $DATABASE_FINGERPRINT |
| Governance manifest version | $GOVERNANCE_VERSION |
| Governance SHA-256 | $GOVERNANCE_FINGERPRINT |
| Ciphertext at rest before retention cleanup | true |
| Plaintext payload stored | false |
| Owner and agreement recorded | true |
| Receipt contains no CSV or PII | true |
| Safety deliberate breaks: target, host, demo, demo reference, real mode, missing marker, missing data mode, pilot disabled | red, no batch mutation |
| Deliberate break without owner | red |
| Governance change fingerprint mismatch | red |
| Deliberate break without encryption key | red |
| Raw payload retention cleanup | true |
| Rollback removed ciphertext, IV, tag, canonical rows, and Storage object | true |
| Tombstone and redacted audit | true |
| Other batch remained unchanged | true |
| Idempotent rollback replay | true |
| Retention CLI: expired blocked and removable batches | preserved_dependency + deleted, raw cleanup = 2 |
| Retention CLI retry | preserved_dependency only, raw cleanup = 0, no duplicate tombstone |
| Storage after retention | blocked batch kept, removable batch removed by exact association |
| Retention SQL: school B and real-mode sentinel | unchanged, synthetic fixture only |
| Retention SQL: finalized report, source links, Vivências, attendance and shared guardian | preserved |
| Retention SQL: injected mid-delete failure and ownership gap | failed, no partial canonical deletion |
| Retention SQL: existing deadlines, policy and purpose | unchanged |

This is a synthetic isolated proof receipt. It is not evidence of municipal readiness.
EOF

}
PROOF_COMPLETE=true
PROOF_STAGE=cleanup
} > "$WORK_DIR/proof.log" 2>&1
