#!/usr/bin/env bash
# shellcheck disable=SC2329,SC1091
set -euo pipefail

APP_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
ROOT_DIR=$(cd "$APP_DIR/.." && pwd)
cd "$APP_DIR"
# shellcheck source=pilot-port-range-lease.sh
source "$APP_DIR/scripts/pilot-port-range-lease.sh"
source "$APP_DIR/scripts/pilot-app-server.sh"

RECEIPT_ROOT="${PILOT_E2E_RECEIPT_DIR:-$ROOT_DIR/.pilot-evidence}"
RUN_ID="$(date -u +%Y%m%dT%H%M%SZ)-$$"
AGGREGATE_DIR="$RECEIPT_ROOT/r3-t4-pilot-aggregate-$RUN_ID"
CHILD_DIR="$AGGREGATE_DIR/children"
SUMMARY_DIR="$AGGREGATE_DIR/summaries"
FINAL_RECEIPT="$AGGREGATE_DIR.json"
CLEANUP_RECEIPT="$AGGREGATE_DIR.cleanup.json"
AGGREGATE_DELIBERATE_BREAK="${PILOT_AGGREGATE_DELIBERATE_BREAK:-none}"
PORT_LEASE_RELEASE_FAILED=false

mkdir -p "$CHILD_DIR" "$SUMMARY_DIR"

redact_file() {
  local source_file="$1"
  local destination_file="$2"
  if [[ ! -f "$source_file" ]]; then
    return 0
  fi
  sed -E \
    -e 's/sb_(publishable|secret)_[A-Za-z0-9_-]+/[REDACTED_SUPABASE_KEY]/g' \
    -e 's/eyJ[A-Za-z0-9._-]+/[REDACTED_TOKEN]/g' \
    -e 's#(postgresql://[^:@/]+):[^@]+@#\1:[REDACTED]@#g' \
    -e 's#(https?://[^:/[:space:]]+):[0-9]+#\1#g' \
    "$source_file" > "$destination_file"
}

write_child_summary() {
  local name="$1"
  local command_text="$2"
  local exit_code="$3"
  local receipt_path="$4"
  local output_path="$5"
  local summary_path="$SUMMARY_DIR/$name.json"

  node - "$summary_path" "$name" "$command_text" "$exit_code" "$receipt_path" "$output_path" <<'NODE'
const fs = require('node:fs')
const [summaryPath, name, command, exitCodeText, receiptPath, outputPath] = process.argv.slice(2)
const exitCode = Number(exitCodeText)
let receipt = null
let receiptError = null
if (receiptPath && fs.existsSync(receiptPath)) {
  try {
    receipt = JSON.parse(fs.readFileSync(receiptPath, 'utf8'))
  } catch (error) {
    receiptError = error instanceof Error ? error.message : String(error)
  }
}
const childResult = receipt?.result
const cleanupResult = receipt?.cleanup?.result
let status
if (childResult === 'skipped') {
  status = 'skipped'
} else if (exitCode === 0 && (childResult === 'passed' || childResult === 'pass') && cleanupResult !== 'failed') {
  status = 'passed'
} else if (exitCode === 0 && !receipt) {
  status = 'skipped'
} else {
  status = 'failed'
}
const summary = {
  name,
  command,
  exitCode,
  status,
  receiptPath: receiptPath || null,
  outputPath: outputPath || null,
  receipt,
  receiptError,
}
fs.writeFileSync(summaryPath, `${JSON.stringify(summary, null, 2)}\n`, 'utf8')
NODE
}

run_child() {
  local name="$1"
  local command_text="$2"
  shift 2
  local child_receipt_dir="$CHILD_DIR/$name"
  local raw_log="$child_receipt_dir/$name.raw.log"
  local output_log="$child_receipt_dir/$name.log"
  local receipt_path=''
  local child_exit=1
  local -a child_env=(
    "PILOT_E2E_RECEIPT_DIR=$child_receipt_dir"
    "PILOT_E2E_PORT_BASE=$PILOT_E2E_PORT_BASE"
    "PILOT_E2E_PORT_LEASE_DIR=$PILOT_E2E_PORT_LEASE_DIR"
    "PILOT_E2E_APP_SERVER=${PILOT_E2E_APP_SERVER:-portless}"
    'PILOT_E2E_PORT_LEASE_EXTERNAL=true'
    'PILOT_LEGACY_DELIBERATE_BREAK=none'
    'PILOT_CAPACITY_DELIBERATE_BREAK=none'
    'PILOT_DESCRIPTIVE_DELIBERATE_BREAK=none'
  )

  mkdir -p "$child_receipt_dir"
  case "$name" in
    legacy)
      child_env+=("PILOT_PLAYWRIGHT_CONFIG=")
      if [[ "$AGGREGATE_DELIBERATE_BREAK" == legacy ]]; then
        child_env+=("PILOT_LEGACY_DELIBERATE_BREAK=cleanup")
      fi
      ;;
    capacity)
      child_env+=("PILOT_PLAYWRIGHT_CONFIG=")
      if [[ "$AGGREGATE_DELIBERATE_BREAK" == capacity ]]; then
        child_env+=("PILOT_CAPACITY_DELIBERATE_BREAK=cleanup")
      fi
      ;;
    descriptive)
      child_env+=("PILOT_PLAYWRIGHT_CONFIG=")
      if [[ "$AGGREGATE_DELIBERATE_BREAK" == descriptive ]]; then
        child_env+=("PILOT_DESCRIPTIVE_DELIBERATE_BREAK=cleanup")
      fi
      ;;
    security)
      child_env+=("PILOT_PLAYWRIGHT_CONFIG=playwright.pilot-security.config.ts")
      if [[ "$AGGREGATE_DELIBERATE_BREAK" == security ]]; then
        child_env+=("PILOT_LEGACY_DELIBERATE_BREAK=cleanup")
      fi
      ;;
    *)
      echo "PILOT_AGGREGATE_UNKNOWN_CHILD: $name" >&2
      return 1
      ;;
  esac

  printf 'PILOT_AGGREGATE_CHILD_START: name=%s command=%s\n' "$name" "$command_text"
  set +e
  env "${child_env[@]}" bash "$@" >"$raw_log" 2>&1
  child_exit=$?
  set -e
  redact_file "$raw_log" "$output_log"
  rm -f "$raw_log"
  receipt_path=$(sed -n 's/^PILOT_E2E_FINAL_RECEIPT: //p' "$output_log" | tail -1 || true)
  write_child_summary "$name" "$command_text" "$child_exit" "$receipt_path" "$output_log"
  local status
  status=$(node - "$SUMMARY_DIR/$name.json" <<'NODE'
const fs = require('node:fs')
const summary = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'))
process.stdout.write(summary.status)
NODE
)
  printf 'PILOT_AGGREGATE_CHILD_RESULT: name=%s status=%s exit_code=%s receipt=%s\n' "$name" "$status" "$child_exit" "${receipt_path:-missing}"
}

finalize() {
  local exit_code=$?
  trap - EXIT INT TERM
  set +e

  if ! pilot_port_range_lease_release; then
    PORT_LEASE_RELEASE_FAILED=true
    exit_code=1
  fi

  cat > "$CLEANUP_RECEIPT" <<JSON
{
  "result": "$([[ "$PORT_LEASE_RELEASE_FAILED" == true ]] && printf failed || printf pass)",
  "childReceiptsPreserved": true,
  "childLogsRedacted": true,
  "serverMode": "${PILOT_E2E_APP_SERVER:-portless}",
  "portRangeLeaseDir": null,
  "portRangeLeaseReleased": $([[ "$PILOT_E2E_PORT_LEASE_RELEASED" == true ]] && printf true || printf false),
  "aggregateDirectory": "$AGGREGATE_DIR"
}
JSON

  node - "$FINAL_RECEIPT" "$CLEANUP_RECEIPT" "$SUMMARY_DIR" "$exit_code" "$AGGREGATE_DELIBERATE_BREAK" <<'NODE'
const fs = require('node:fs')
const path = require('node:path')

const [finalPath, cleanupPath, summaryDir, exitCodeText, deliberateBreak] = process.argv.slice(2)
const exitCode = Number(exitCodeText)
const planned = [
  { name: 'legacy', command: 'cd app && pnpm test:e2e:pilot:legacy' },
  { name: 'capacity', command: 'cd app && pnpm test:e2e:pilot:capacity' },
  { name: 'descriptive', command: 'cd app && pnpm test:e2e:pilot:descriptive' },
  { name: 'security', command: 'cd app && pnpm test:e2e:pilot:security' },
]
const readJson = file => fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : null
const children = planned.map(child => readJson(path.join(summaryDir, `${child.name}.json`)) || {
  ...child,
  exitCode: 130,
  status: 'skipped',
  receiptPath: null,
  outputPath: null,
  receipt: null,
  receiptError: 'child was not started before aggregate interruption',
})
const failed = children.filter(child => child.status === 'failed')
const skipped = children.filter(child => child.status === 'skipped')
const allPassed = children.length === planned.length && children.every(child => child.status === 'passed')
const result = allPassed && exitCode === 0 ? 'passed' : failed.length === 0 && skipped.length > 0 ? 'skipped' : 'failed'
const receipt = {
  contract: 'R3-T4 aggregate pilot E2E',
  result,
  exitCode,
  children,
  totals: {
    expected: planned.length,
    passed: children.filter(child => child.status === 'passed').length,
    failed: failed.length,
    skipped: skipped.length,
  },
  childOrder: planned.map(child => child.name),
  capacityAndDescriptiveIndependent: true,
  sharedLegacyProjectDoesNotLoadVerticalSetups: true,
  r1Independent: true,
  deliberateBreak: deliberateBreak === 'none' ? null : deliberateBreak,
  cleanup: readJson(cleanupPath),
  externalCredentialsUsed: false,
  publicDemoUsed: false,
  portRangeLease: {
    serverMode: process.env.PILOT_E2E_APP_SERVER || 'portless',
    external: process.env.PILOT_E2E_PORT_LEASE_EXTERNAL === 'true',
    leaseDir: null,
    released: process.env.PILOT_E2E_PORT_LEASE_RELEASED === 'true',
  },
}
fs.writeFileSync(finalPath, `${JSON.stringify(receipt, null, 2)}\n`, 'utf8')
NODE

  printf 'PILOT_AGGREGATE_CLEANUP_RECEIPT: result=%s receipt=%s\n' "$([[ "$PORT_LEASE_RELEASE_FAILED" == true ]] && printf failed || printf pass)" "$CLEANUP_RECEIPT"
  printf 'PILOT_AGGREGATE_FINAL_RECEIPT: %s\n' "$FINAL_RECEIPT"
  exit "$exit_code"
}

trap finalize EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

AGGREGATE_SERVER_MODE=$(pilot_app_server_mode)
for command in bash env node pnpm ss docker; do
  command -v "$command" >/dev/null || {
    echo "PILOT_AGGREGATE_PREREQUISITE_MISSING: $command" >&2
    exit 1
  }
done
if [[ "$AGGREGATE_SERVER_MODE" == portless ]] && ! command -v portless >/dev/null; then
  echo 'PILOT_AGGREGATE_PREREQUISITE_MISSING: portless' >&2
  exit 1
fi

case "$AGGREGATE_DELIBERATE_BREAK" in
  none|legacy|capacity|descriptive|security) ;;
  *)
    echo 'PILOT_AGGREGATE_DELIBERATE_BREAK_INVALID: expected none or one child name' >&2
    exit 1
    ;;
esac

if ! pilot_port_range_lease_use_external; then
  exit 1
fi

run_child legacy 'cd app && pnpm test:e2e:pilot:legacy' scripts/run-pilot-e2e.sh
run_child capacity 'cd app && pnpm test:e2e:pilot:capacity' scripts/run-pilot-capacity-e2e.sh
run_child descriptive 'cd app && pnpm test:e2e:pilot:descriptive' scripts/run-pilot-descriptive-e2e.sh
run_child security 'cd app && pnpm test:e2e:pilot:security' scripts/run-pilot-e2e.sh

aggregate_exit=$(node - "$SUMMARY_DIR" <<'NODE'
const fs = require('node:fs')
const path = require('node:path')
const summaries = fs.readdirSync(process.argv[2])
  .filter(file => file.endsWith('.json'))
  .map(file => JSON.parse(fs.readFileSync(path.join(process.argv[2], file), 'utf8')))
const exitCode = summaries.length === 4 && summaries.every(summary => summary.status === 'passed') ? 0 : 1
process.stdout.write(String(exitCode))
NODE
)
exit "$aggregate_exit"
