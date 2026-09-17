#!/usr/bin/env bash
# Sourced only by run-pilot-import-proof-e2e.sh. Owns attempt evidence and teardown.

write_import_proof_result() {
  local result=$1 exit_code=$2
  cat > "$ATTEMPT_DIR/result.pending" <<EOF || return $?
{
  "runId": "$RUN_ID",
  "sourceSha": "$SOURCE_SHA",
  "sourceDirty": $SOURCE_DIRTY,
  "command": "pnpm test:e2e:pilot:import",
  "retentionDeliberateBreak": "$RETENTION_DELIBERATE_BREAK",
  "selectionManifest": "selection.sha256",
  "selectionSha256": "$SELECTION_SHA256",
  "result": "$result",
  "exitCode": $exit_code,
  "stage": "$PROOF_STAGE",
  "database": "$DATABASE_STATE",
  "workspace": "$WORKSPACE_STATE"
}
EOF
  mv "$ATTEMPT_DIR/result.pending" "$ATTEMPT_DIR/result.json"
}

cleanup_import_proof() {
  local stop_status=0 probe_status=0 postmaster_pid=''
  [[ -n "$WORK_DIR" ]] || return 0
  if [[ "$START_ATTEMPTED" == true ]]; then
    # pg_ctl removes postmaster.pid on success. Keep the original PID for an
    # independent liveness check, including a partial/failed startup.
    if [[ -f "$DATA_DIR/postmaster.pid" ]]; then
      read -r postmaster_pid < "$DATA_DIR/postmaster.pid"
    fi
    pg_ctl -D "$DATA_DIR" -m immediate -t 15 -w stop >/dev/null 2>&1 || stop_status=$?
    pg_ctl -D "$DATA_DIR" status >/dev/null 2>&1 || probe_status=$?
    if [[ -z "$postmaster_pid" && -f "$DATA_DIR/postmaster.pid" ]]; then
      read -r postmaster_pid < "$DATA_DIR/postmaster.pid"
    fi
    # status=3 is pg_ctl's explicit "not running". Any other response is not
    # proof of shutdown. Never delete a cluster after a failed stop or live PID.
    if [[ "$stop_status" -ne 0 || "$probe_status" -ne 3 ]] \
      || { [[ "$postmaster_pid" =~ ^[1-9][0-9]*$ ]] && kill -0 "$postmaster_pid" 2>/dev/null; }; then
      DATABASE_STATE=unverified
      WORKSPACE_STATE=preserved
      printf 'PILOT_IMPORT_PROOF_E2E_CLEANUP_FAILED: runId=%s stopExit=%s statusExit=%s workspace=preserved\n' \
        "$RUN_ID" "$stop_status" "$probe_status" >&2
      # Local recovery coordinates only. Do not copy PostgreSQL logs, CSV or env.
      printf 'workDir=%q\n' "$WORK_DIR" > "$ATTEMPT_DIR/recovery.txt"
      return 1
    fi
    DATABASE_STATE=stopped
  fi
  if ! rm -rf -- "$WORK_DIR" || [[ -e "$WORK_DIR" ]]; then
    WORKSPACE_STATE=preserved
    printf 'PILOT_IMPORT_PROOF_E2E_CLEANUP_FAILED: runId=%s workspace=preserved\n' "$RUN_ID" >&2
    return 1
  fi
  WORKSPACE_STATE=removed
}

finish_import_proof() {
  local exit_code=$1
  exec 1>&3 2>&4
  trap - EXIT
  # A signal during teardown still wins over a green result, without interrupting
  # the finalizer and leaving an untracked database behind.
  trap 'exit_code=130' INT
  trap 'exit_code=143' TERM
  trap 'exit_code=129' HUP
  if ! cleanup_import_proof; then
    [[ "$exit_code" -ne 0 ]] || exit_code=1
  fi
  if [[ "$PROOF_COMPLETE" != true && "$exit_code" -eq 0 ]]; then exit_code=1; fi
  if [[ "$exit_code" -eq 0 ]]; then
    PROOF_STAGE=selection
    if ! (cd "$ROOT_DIR" && sha256sum --check --status "$ATTEMPT_DIR/selection.sha256"); then
      exit_code=1
    fi
  fi
  if [[ "$exit_code" -eq 0 ]]; then
    PROOF_STAGE=receipt
    # The success file is atomically published only after verified teardown.
    if ! write_import_proof_receipt > "$ATTEMPT_DIR/receipt.pending" \
      || ! mv "$ATTEMPT_DIR/receipt.pending" "$ATTEMPT_DIR/receipt.md"; then
      exit_code=1
    fi
  fi
  if [[ "$exit_code" -eq 0 ]]; then
    PROOF_STAGE=complete
    write_import_proof_result pass 0 || exit_code=1
  fi
  if [[ "$exit_code" -ne 0 ]]; then
    rm -f "$ATTEMPT_DIR/receipt.pending" "$ATTEMPT_DIR/receipt.md"
    write_import_proof_result failed "$exit_code"
    printf 'PILOT_IMPORT_PROOF_E2E_FAILED: runId=%s stage=%s exit=%s\n' "$RUN_ID" "$PROOF_STAGE" "$exit_code" >&2
  else
    printf 'PILOT_IMPORT_PROOF_E2E_OK: runId=%s sourceSha=%s selectionSha256=%s receipt=%s/receipt.md cleanup=verified\n' \
      "$RUN_ID" "$SOURCE_SHA" "$SELECTION_SHA256" "$ATTEMPT_DIR"
  fi
  exit "$exit_code"
}

begin_import_proof() {
  exec 3>&1 4>&2
  umask 077
  local evidence_root="$ROOT_DIR/.pilot-evidence/governed-import-proof-e2e"
  mkdir -p "$evidence_root"
  ATTEMPT_DIR=$(mktemp -d "$evidence_root/$(date -u +%Y%m%dT%H%M%SZ)-XXXXXX")
  RUN_ID=${ATTEMPT_DIR##*/}
  SOURCE_SHA=$(git -C "$ROOT_DIR" rev-parse HEAD)
  case "${PILOT_IMPORT_RETENTION_DELIBERATE_BREAK:-none}" in
    none|isolation) RETENTION_DELIBERATE_BREAK=${PILOT_IMPORT_RETENTION_DELIBERATE_BREAK:-none} ;;
    *) RETENTION_DELIBERATE_BREAK=invalid ;;
  esac
  SOURCE_DIRTY=false
  if [[ -n "$(git -C "$ROOT_DIR" status --porcelain)" ]]; then SOURCE_DIRTY=true; fi
  SELECTION_SHA256=''
  WORK_DIR=''
  START_ATTEMPTED=false
  PROOF_COMPLETE=false
  PROOF_STAGE=preflight
  DATABASE_STATE=not-started
  WORKSPACE_STATE=not-created
  trap 'finish_import_proof $?' EXIT
  trap 'exit 130' INT
  trap 'exit 143' TERM
  trap 'exit 129' HUP
  # Retire the pre-F05 alias without destroying historical evidence or creating
  # a new shared "latest" pointer that concurrent attempts could overwrite.
  if [[ -f "$ROOT_DIR/.pilot-evidence/governed-import-proof-e2e.md" ]]; then
    mv "$ROOT_DIR/.pilot-evidence/governed-import-proof-e2e.md" "$ATTEMPT_DIR/legacy-unattributed.md"
  fi
  write_import_proof_result running 0
  printf 'PILOT_IMPORT_PROOF_E2E_ATTEMPT: runId=%s sourceSha=%s evidence=%s\n' "$RUN_ID" "$SOURCE_SHA" "$ATTEMPT_DIR"
  # Exact selected entry point and database inputs, not a claim that a broader
  # browser/SQL suite ran. Hashes also disambiguate an uncommitted working tree.
  (
    cd "$ROOT_DIR" || exit
    sha256sum app/scripts/run-pilot-import-proof-e2e.sh app/scripts/pilot-import-proof-lifecycle.sh app/package.json app/pnpm-lock.yaml \
      supabase/tests/database/pilot_retention_batch.test.sql supabase/tests/pilot/retention-fixture.sql
    find app/scripts app/lib/pilot supabase/migrations supabase/pilot supabase/tests/database \
      -maxdepth 1 -type f \( -name 'pilot-import-proof.ts' -o -path 'app/lib/pilot/*.ts' \
      -o -path 'supabase/migrations/*.sql' -o -name 'bootstrap.sql' -o -name 'provision-pilot-module-gate.sql' \) \
      -print0 | sort -z | xargs -0 -r sha256sum
  ) > "$ATTEMPT_DIR/selection.sha256"
  SELECTION_SHA256=$(sha256sum "$ATTEMPT_DIR/selection.sha256")
  SELECTION_SHA256=${SELECTION_SHA256%% *}
  write_import_proof_result running 0
}
