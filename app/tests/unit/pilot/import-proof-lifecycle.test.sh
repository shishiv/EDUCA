#!/usr/bin/env bash
# Serial lifecycle regression. Stubs prove runner decisions, not PostgreSQL semantics.
set -euo pipefail
APP_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)
ROOT_DIR=$(cd "$APP_DIR/.." && pwd)
mkdir -p "$ROOT_DIR/.pilot-evidence"
WORK=$(mktemp -d "$ROOT_DIR/.pilot-evidence/import-proof-stubs.XXXXXX")
trap 'rm -rf "$WORK"' EXIT
FIXTURE="$WORK/repo"
BIN="$WORK/bin"
mkdir -p "$FIXTURE/app/scripts" "$FIXTURE/app/lib/pilot" "$FIXTURE/supabase/"{migrations,pilot,tests/database} "$BIN" "$WORK/tmp"
cp "$APP_DIR/scripts/run-pilot-import-proof-e2e.sh" "$FIXTURE/app/scripts/"
cp "$APP_DIR/package.json" "$APP_DIR/pnpm-lock.yaml" "$FIXTURE/app/"
if [[ -f "$APP_DIR/scripts/pilot-import-proof-lifecycle.sh" ]]; then
  cp "$APP_DIR/scripts/pilot-import-proof-lifecycle.sh" "$FIXTURE/app/scripts/"
fi
# The fixture resolves the enclosing worktree SHA but never uses its evidence path.
cat > "$BIN/initdb" <<'STUB'
#!/usr/bin/env bash
set -eu
[[ "$STUB_CASE" != early ]] || exit 19
mkdir -p "$2"
printf 'synthetic data\n' > "$2/fixture"
STUB
cat > "$BIN/pg_ctl" <<'STUB'
#!/usr/bin/env bash
set -eu
data=$2
case "${*: -1}" in
  start)
    : > "$data/running"
    printf '%s\n' "$data" > "$STUB_DATA"
    if [[ "$STUB_CASE" == partial-start ]]; then exit 23; fi
    case "$STUB_CASE" in
      signal) kill -TERM "$PPID" ;;
      signal-int) kill -INT "$PPID" ;;
      signal-hup) kill -HUP "$PPID" ;;
    esac
    ;;
  stop)
    # A green receipt at this point is the original bug, even if later deleted.
    receipts=$(find "$FIXTURE/.pilot-evidence" \( -name 'receipt.md' -o -name 'governed-import-proof-e2e.md' \) | wc -l)
    if [[ "$receipts" -gt "${STUB_EXISTING_RECEIPTS:-0}" ]]; then
      : > "$STUB_PREMATURE"
    fi
    if [[ "$STUB_CASE" == stop-fails || "$STUB_CASE" == signal-stop-fails ]]; then
      printf 'private postgres://secret@synthetic.invalid/ CSV_SECRET\n' >&2
      exit 42
    fi
    if [[ "$STUB_CASE" == stop-lies ]]; then exit 0; fi
    if [[ "$STUB_CASE" == signal-during-stop ]]; then kill -TERM "$PPID"; fi
    if [[ "$STUB_CASE" == source-changed ]]; then echo '# changed mid-run' >> "$FIXTURE/app/scripts/pilot-import-proof-lifecycle.sh"; fi
    rm -f "$data/running"
    if [[ "$STUB_CASE" == live-pid ]]; then printf '%s\n' "$STUB_PARENT" > "$data/postmaster.pid"; fi
    ;;
  status)
    if [[ "$STUB_CASE" == status-unknown ]]; then exit 4; fi
    [[ -f "$data/running" ]] && exit 0
    exit 3
    ;;
esac
STUB
cat > "$BIN/psql" <<'STUB'
#!/usr/bin/env bash
set -eu
if [[ "$STUB_CASE" == signal-stop-fails ]]; then kill -TERM "$PPID"; exit 0; fi
mkdir -p "$TMPDIR/tool-cache"
case "$*" in
  *'SELECT count(*) FROM public.pilot_import_batches'*) echo 0 ;;
  *"SELECT coalesce(user_metadata->>'pilot_import_object_fingerprint'"*) printf '%064d\n' 1 ;;
  *'SELECT ('*) echo t ;;
  *) cat >/dev/null ;;
esac
STUB
cat > "$BIN/pnpm" <<'STUB'
#!/usr/bin/env bash
set -eu
error=''
case "${PILOT_IMPORT_TARGET:-}" in isolated-proof) ;; *) error=PILOT_IMPORT_PROOF_TARGET_MISMATCH ;; esac
[[ "$PILOT_IMPORT_PROOF_DATABASE_URL" != *127.0.0.2* ]] || error=PILOT_IMPORT_PROOF_DATABASE_LOCAL_ONLY
[[ "${NEXT_PUBLIC_DEMO_SANDBOX:-}" != true ]] || error=PILOT_IMPORT_PROOF_DEMO_DENIED
[[ -z "${SUPABASE_DEMO_URL:-}" ]] || error=PILOT_IMPORT_PROOF_DEMO_REFERENCE_DENIED
[[ "${PILOT_IMPORT_DATA_MODE:-}" != real ]] || error=PILOT_IMPORT_PROOF_REAL_DATA_DENIED
[[ -n "${PILOT_IMPORT_SYNTHETIC_MARKER:-}" ]] || error=PILOT_IMPORT_PROOF_SYNTHETIC_MARKER_REQUIRED
[[ -n "${PILOT_IMPORT_DATA_MODE:-}" ]] || error=PILOT_IMPORT_PROOF_DATA_MODE_REQUIRED
[[ "${PILOT_MODE:-}" == true ]] || error=PILOT_IMPORT_PROOF_PILOT_MODE_REQUIRED
[[ -n "${PILOT_IMPORT_ENCRYPTION_KEY:-}" ]] || error=PILOT_IMPORT_KEY_MISSING
case "$*" in
  *approval-missing-owner*) error=PILOT_IMPORT_GOVERNANCE_INVALID ;;
  *approval-changed-governance*) error=PILOT_IMPORT_IDEMPOTENCY_GOVERNANCE_MISMATCH ;;
esac
if [[ -n "$error" ]]; then echo "PILOT_IMPORT_PROOF_SAFETY_RECEIPT $error"; exit 1; fi
batch=10000000-0000-0000-0000-000000000001
[[ "$*" != *pilot-second.csv* ]] || batch=10000000-0000-0000-0000-000000000002
printf '{"target":"isolated-proof","attemptedTarget":"isolated-proof","batchId":"%s","sourceFingerprintSha256":"%064d","canonicalFingerprintSha256":"%064d","databaseFingerprintSha256":"%064d","governanceFingerprintSha256":"%064d","governanceManifestVersion":"educa-synthetic-pilot-governance-v1","deletedEnrollments":0,"removed":0,"rollbackEvents":1}\n' "$batch" 1 2 3 4
STUB
chmod +x "$BIN"/*
export FIXTURE STUB_DATA="$WORK/data-path" STUB_PREMATURE="$WORK/premature" STUB_PARENT=$$
export PATH="$BIN:/usr/bin:$PATH" TMPDIR="$WORK/tmp"

fail() { echo "FAIL: $*" >&2; exit 1; }
run_case() {
  export STUB_CASE=$1
  rm -rf "$FIXTURE/.pilot-evidence" "$WORK/tmp/"*
  rm -f "$STUB_DATA" "$STUB_PREMATURE"
  mkdir -p "$FIXTURE/.pilot-evidence"
  printf 'historical green receipt\n' > "$FIXTURE/.pilot-evidence/governed-import-proof-e2e.md"
  status=0
  bash "$FIXTURE/app/scripts/run-pilot-import-proof-e2e.sh" > "$WORK/output" 2>&1 || status=$?
  [[ ! -f "$FIXTURE/.pilot-evidence/governed-import-proof-e2e.md" ]] || fail "$1 left a historical receipt at the current path"
  [[ ! -f "$STUB_PREMATURE" ]] || fail "$1 published success before stopping PostgreSQL"
  if grep -Eq 'CSV_SECRET|postgres://secret|@synthetic.invalid' "$WORK/output"; then fail "$1 leaked diagnostics"; fi
  attempt=$(find "$FIXTURE/.pilot-evidence/governed-import-proof-e2e" -mindepth 1 -maxdepth 1 -type d)
  [[ -n "$attempt" && -f "$attempt/selection.sha256" ]] || fail "$1 has no attempt manifest"
  grep -q 'historical green receipt' "$attempt/legacy-unattributed.md" || fail "$1 destroyed historical evidence"
  /usr/bin/node - "$attempt" "$(git -C "$ROOT_DIR" rev-parse HEAD)" "$status" "$STUB_CASE" <<'JS'
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const [dir, sha, status, scenario] = process.argv.slice(2);
const result = JSON.parse(fs.readFileSync(path.join(dir, 'result.json'), 'utf8'));
assert.equal(result.runId, path.basename(dir));
assert.equal(result.sourceSha, sha);
assert.equal(result.exitCode, Number(status));
assert.equal(result.selectionSha256, crypto.createHash('sha256').update(fs.readFileSync(path.join(dir, 'selection.sha256'))).digest('hex'));
assert.equal(result.result, status === '0' ? 'pass' : 'failed');
const preserved = ['stop-fails', 'stop-lies', 'live-pid', 'status-unknown', 'signal-stop-fails'].includes(scenario);
assert.equal(result.workspace, preserved ? 'preserved' : 'removed');
assert.equal(result.database, scenario === 'early' ? 'not-started' : preserved ? 'unverified' : 'stopped');
JS
}

run_case early
[[ "$status" == 19 ]] || fail 'early failure exit code was lost'
[[ ! -f "$attempt/receipt.md" ]] || fail 'early failure emitted success'
grep -q 'PILOT_IMPORT_PROOF_E2E_FAILED' "$WORK/output"
printf 'PASS: stale receipt invalidated and early failure attributed\n'

for scenario in stop-fails stop-lies live-pid status-unknown signal-stop-fails; do
  run_case "$scenario"
  [[ "$status" != 0 ]] || fail "$scenario accepted unverified shutdown"
  [[ "$scenario" != signal-stop-fails || "$status" == 143 ]] || fail 'signal exit code was lost on failed stop'
  data=$(<"$STUB_DATA")
  [[ -f "$data/fixture" ]] || fail "$scenario removed potentially live data"
  [[ ! -f "$attempt/receipt.md" ]] || fail "$scenario emitted success"
  grep -q 'PILOT_IMPORT_PROOF_E2E_CLEANUP_FAILED' "$WORK/output"
  printf 'PASS: %s preserves data and rejects success\n' "$scenario"
done

for scenario in signal signal-int signal-hup signal-during-stop partial-start source-changed; do
  run_case "$scenario"
  case "$scenario" in
    signal|signal-during-stop) expected=143 ;;
    signal-int) expected=130 ;;
    signal-hup) expected=129 ;;
    partial-start) expected=23 ;;
    source-changed) expected=1 ;;
  esac
  [[ "$status" == "$expected" ]] || fail "$scenario exit code was lost"
  data=$(<"$STUB_DATA")
  [[ ! -d "$data" && ! -f "$attempt/receipt.md" ]] || fail "$scenario cleanup or receipt incorrect"
  printf 'PASS: %s cleans the workspace without success\n' "$scenario"
done

run_case success
[[ "$status" == 0 ]] || { cat "$WORK/output" >&2; fail 'success turned red'; }
data=$(<"$STUB_DATA")
[[ ! -d "$data" && -f "$attempt/receipt.md" ]] || fail 'success did not follow cleanup'
[[ -z "$(find "$WORK/tmp" -mindepth 1 -print -quit)" ]] || fail 'child tool cache escaped cleanup'
grep -q "$(basename "$attempt")" "$attempt/receipt.md"
grep -q 'PILOT_IMPORT_PROOF_E2E_OK' "$WORK/output"
previous=$attempt
# A second invocation cannot overwrite the first attempt's immutable evidence.
STUB_EXISTING_RECEIPTS=1 bash "$FIXTURE/app/scripts/run-pilot-import-proof-e2e.sh" > "$WORK/output" 2>&1
[[ $(find "$FIXTURE/.pilot-evidence/governed-import-proof-e2e" -name receipt.md | wc -l) == 2 ]] || fail 'attempts reused evidence'
[[ -f "$previous/receipt.md" ]] || fail 'second invocation destroyed first attempt'
printf 'PASS: success is post-cleanup and each invocation has separate evidence\n'
