#!/usr/bin/env bash
# Isolated synthetic source for the existing encrypted portable restore runner.
# No app, browser, provider recovery, shared Supabase stack or remote project.
set -euo pipefail
ROOT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)
PROOF_DIR="$ROOT_DIR/supabase/tests/pilot"
source "$ROOT_DIR/app/scripts/pilot-port-range-lease.sh"
source "$ROOT_DIR/app/scripts/pilot-supabase-cleanup.sh"
source "$ROOT_DIR/app/scripts/pilot-local-runtime.sh"
cd "$ROOT_DIR/app"
EVIDENCE_DIR="$ROOT_DIR/.pilot-evidence/f07"
mkdir -p "$EVIDENCE_DIR"
PROJECT_DIR=$(mktemp -d "$ROOT_DIR/.pilot-evidence/f07-source.XXXXXX")
PROJECT_ID=$(basename "$PROJECT_DIR")
STARTED=false
cleanup() {
  local status=$?
  trap - EXIT
  if [[ "$STARTED" == true ]]; then
    if ! pilot_supabase_stop_project "$PROJECT_DIR" "$PROJECT_ID" >"$PROJECT_DIR/stop.log" 2>&1; then
      show_log_on_failure "$PROJECT_DIR/stop.log"
      echo 'F07_REHEARSAL_CLEANUP_FAILED: source project remains' >&2
      status=1
    fi
  fi
  if [[ "$status" != 0 ]]; then
    redact_file "$PROJECT_DIR/seed.log" "$EVIDENCE_DIR/setup-failure.log"
  fi
  if ! rm -rf "$PROJECT_DIR" || [[ -e "$PROJECT_DIR" ]]; then status=1; fi
  if ! pilot_port_range_lease_release; then status=1; fi
  if [[ "$status" == 0 ]]; then
    echo 'F07_REHEARSAL_CLEANUP: status=0 isolated_source_removed'
  else
    echo "F07_REHEARSAL_FAILED: status=$status consult cleanup diagnostics"
  fi
  exit "$status"
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
pilot_port_range_lease_acquire
pilot_local_project_init "$ROOT_DIR" "$PROJECT_DIR" "$PILOT_E2E_PORT_BASE"
# Materialize legacy state through the true historical boundary. Apply every
# later migration unmodified after fixture insertion, not a trigger bypass.
mkdir "$PROJECT_DIR/later"
for migration in "$PROJECT_DIR"/supabase/migrations/*.sql; do
  if [[ "$(basename "$migration")" > 20260913999999 ]]; then
    mv "$migration" "$PROJECT_DIR/later/"
  fi
done
STARTED=true
if ! pnpm exec supabase --workdir "$PROJECT_DIR" start \
  -x studio,logflare,vector,edge-runtime,postgres-meta,realtime,mailpit >"$PROJECT_DIR/start.log" 2>&1; then
  show_log_on_failure "$PROJECT_DIR/start.log"
  exit 1
fi
STATUS_ENV=$(pnpm exec supabase --workdir "$PROJECT_DIR" status -o env 2>/dev/null)
unset API_URL DB_URL SECRET_KEY SERVICE_ROLE_KEY
eval "$(printf '%s\n' "$STATUS_ENV" | grep -E '^(API_URL|DB_URL|SECRET_KEY|SERVICE_ROLE_KEY)=')"
unset STATUS_ENV
export DB_URL
export NEXT_PUBLIC_SUPABASE_URL="${API_URL:?}"
export SUPABASE_SERVICE_ROLE_KEY="${SECRET_KEY:-${SERVICE_ROLE_KEY:-}}"
: "${SUPABASE_SERVICE_ROLE_KEY:?}"
case "$DB_URL" in postgresql://*@127.0.0.1:*/*) ;; *) echo 'F07_SOURCE_NOT_LOCAL' >&2; exit 1 ;; esac
psql "$DB_URL" -Xq -v ON_ERROR_STOP=1 -f "$PROOF_DIR/restore-fixture.sql" -f "$PROOF_DIR/restore-legacy-fixture.sql" >"$PROJECT_DIR/seed.log" 2>&1
for migration in "$PROJECT_DIR"/later/*.sql; do
  psql "$DB_URL" -Xq -v ON_ERROR_STOP=1 -f "$migration" >>"$PROJECT_DIR/seed.log" 2>&1
done
psql "$DB_URL" -Xq -v ON_ERROR_STOP=1 \
  -f "$ROOT_DIR/supabase/pilot/provision-pilot-module-gate.sql" \
  -f "$PROOF_DIR/restore-pedagogical-fixture.sql" \
  -f "$PROOF_DIR/restore-integrity.sql" -f "$PROOF_DIR/restore-pedagogical.test.sql" >>"$PROJECT_DIR/seed.log" 2>&1
# Keep the original portable teacher-write probe free to open today's session.
# This ordinary closure is fixture preparation before backup, not replay logic.
psql "$DB_URL" -Xq -v ON_ERROR_STOP=1 -c "UPDATE public.sessoes_aula SET status = 'FECHADA' WHERE id = '60000000-0000-0000-0000-000000000001'" >>"$PROJECT_DIR/seed.log" 2>&1
psql "$DB_URL" -Xq -v ON_ERROR_STOP=1 -c "INSERT INTO public.pilot_data_tombstones(entity_type, source_fingerprint, reason_code, created_by) VALUES ('technical_copy', 'synthetic-deleted-copy-sha256', 'synthetic_restore_test', '20000000-0000-0000-0000-000000000003')" >>"$PROJECT_DIR/seed.log" 2>&1
# Tiny synthetic image, uploaded only to this disposable local Storage source.
printf '%s' 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=' | base64 -d >"$PROJECT_DIR/pixel.png"
for school in 10000000-0000-0000-0000-000000000001 10000000-0000-0000-0000-000000000002; do
  curl --fail --silent --show-error -X POST \
    -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
    -H 'Content-Type: image/png' --data-binary "@$PROJECT_DIR/pixel.png" \
    "$API_URL/storage/v1/object/student-photos/$school/synthetic/avatar.png" >/dev/null
done
export PILOT_RESTORE_FIXTURE_CONTRACT=pedagogical-v2
export PILOT_MODE=true PILOT_SYNTHETIC_DATA_ONLY=true
export PILOT_IMPORT_TARGET=isolated-proof PILOT_IMPORT_DATA_MODE=synthetic
export PILOT_IMPORT_SYNTHETIC_MARKER=SYNTHETIC-EDUCA-PILOT
export PILOT_EXTERNAL_DEPLOY_APPROVED=false PILOT_LEGAL_APPROVAL_STATUS=not_approved
export NEXT_PUBLIC_DEMO_SANDBOX=false DEMO_SANDBOX=false
if [[ $# == 0 ]]; then set -- none; fi
for probe in "$@"; do
  case "$probe" in
    none|artifact|student-checksum|attendance-checksum|policy|auth|storage|cleanup|pedagogical-omission|snapshot|deadline) ;;
    *) echo 'F07_UNKNOWN_PROBE' >&2; exit 1 ;;
  esac
  status=0
  PILOT_RESTORE_DELIBERATE_BREAK="$probe" bash "$PROOF_DIR/run-backup-restore.sh" >"$PROJECT_DIR/probe.log" 2>&1 || status=$?
  redact_file "$PROJECT_DIR/probe.log" "$EVIDENCE_DIR/$probe.log"
  if [[ "$probe" == none ]]; then
    [[ "$status" == 0 ]] || { show_log_on_failure "$PROJECT_DIR/probe.log"; exit 1; }
    cp "$ROOT_DIR/.pilot-evidence/synthetic-restore-evidence.md" "$EVIDENCE_DIR/portable-receipt.md"
  else
    [[ "$status" != 0 ]] && grep -q 'PILOT_RESTORE_PROOF_RED' "$PROJECT_DIR/probe.log" \
      && [[ ! -f "$ROOT_DIR/.pilot-evidence/synthetic-restore-evidence.md" ]] || {
      echo "F07_EXPECTED_RED_MISSING: $probe exit=$status" >&2; exit 1;
    }
  fi
  grep -q 'PILOT_RESTORE_CLEANUP: .*temporary_database_and_artifacts_removed' "$PROJECT_DIR/probe.log" || {
    echo 'F07_RESTORE_ARTIFACT_CLEANUP_UNVERIFIED' >&2; exit 1;
  }
  remaining=$(psql "$DB_URL" -XAtq -v ON_ERROR_STOP=1 -c "SELECT count(*) FROM pg_database WHERE datname LIKE 'educa_pilot_proof_restore_%'")
  [[ "$remaining" == 0 ]] || { echo 'F07_RESTORE_DATABASE_LEAK' >&2; exit 1; }
  echo "F07_REHEARSAL_PROBE: $probe exit=$status restore_database_removed receipt_contract_verified"
done
