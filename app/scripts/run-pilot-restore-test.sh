#!/usr/bin/env bash
set -euo pipefail

APP_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
ROOT_DIR=$(cd "$APP_DIR/.." && pwd)
SUPABASE_CLI="$APP_DIR/node_modules/.bin/supabase"

[[ -x "$SUPABASE_CLI" ]] || {
  echo "PILOT_RESTORE_PREREQUISITE_MISSING: local Supabase CLI" >&2
  exit 1
}

# Read credentials only from the local Supabase CLI. Never link, restore, or
# send this proof to a remote project.
STATUS_ENV=$("$SUPABASE_CLI" --workdir "$ROOT_DIR" status -o env 2>/dev/null) || {
  echo "PILOT_RESTORE_LOCAL_STACK_REQUIRED: start the local Supabase stack first" >&2
  exit 1
}
eval "$(printf '%s\n' "$STATUS_ENV" | grep -E '^(API_URL|SERVICE_ROLE_KEY|DB_URL)=')"
unset STATUS_ENV

for required_variable in API_URL SERVICE_ROLE_KEY DB_URL; do
  [[ -n "${!required_variable:-}" ]] || {
    echo "PILOT_RESTORE_LOCAL_STACK_REQUIRED: Supabase status is missing $required_variable" >&2
    exit 1
  }
done

export NEXT_PUBLIC_SUPABASE_URL="$API_URL"
export SUPABASE_SERVICE_ROLE_KEY="$SERVICE_ROLE_KEY"
export DB_URL

# Contradictory caller-provided values fail closed instead of being silently
# replaced by this wrapper.
[[ -z "${PILOT_MODE:-}" || "$PILOT_MODE" == true ]] || {
  echo "PILOT_RESTORE_SAFETY_GATE: PILOT_MODE must be true" >&2
  exit 1
}
[[ -z "${PILOT_SYNTHETIC_DATA_ONLY:-}" || "$PILOT_SYNTHETIC_DATA_ONLY" == true ]] || {
  echo "PILOT_RESTORE_SAFETY_GATE: synthetic-only mode is required" >&2
  exit 1
}
[[ -z "${PILOT_IMPORT_TARGET:-}" || "$PILOT_IMPORT_TARGET" == isolated-proof ]] || {
  echo "PILOT_RESTORE_TARGET_IDENTITY_MISMATCH: isolated-proof target is required" >&2
  exit 1
}
[[ -z "${PILOT_IMPORT_DATA_MODE:-}" || "$PILOT_IMPORT_DATA_MODE" == synthetic ]] || {
  echo "PILOT_RESTORE_DATA_MODE_INVALID: synthetic data mode is required" >&2
  exit 1
}
[[ -z "${PILOT_IMPORT_SYNTHETIC_MARKER:-}" || "$PILOT_IMPORT_SYNTHETIC_MARKER" == SYNTHETIC-EDUCA-PILOT ]] || {
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

export PILOT_MODE=true
export PILOT_SYNTHETIC_DATA_ONLY=true
export PILOT_IMPORT_TARGET=isolated-proof
export PILOT_IMPORT_DATA_MODE=synthetic
export PILOT_IMPORT_SYNTHETIC_MARKER=SYNTHETIC-EDUCA-PILOT
export PILOT_EXTERNAL_DEPLOY_APPROVED=false
export PILOT_LEGAL_APPROVAL_STATUS=not_approved
export NEXT_PUBLIC_DEMO_SANDBOX=false
export DEMO_SANDBOX=false

exec "$ROOT_DIR/supabase/tests/pilot/run-backup-restore.sh"
