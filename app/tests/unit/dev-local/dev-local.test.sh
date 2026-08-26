#!/usr/bin/env bash
set -euo pipefail

APP_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)
SCRIPT="$APP_DIR/scripts/dev-local.sh"
WORK=$(mktemp -d)
BIN="$WORK/bin"
CALLS="$WORK/calls"
mkdir -p "$BIN" "$WORK/tmp" "$WORK/runtime"
: > "$CALLS"
trap 'rm -rf "$WORK"' EXIT

cat > "$BIN/docker" <<'STUB'
#!/usr/bin/env bash
printf 'docker %s\n' "$*" >> "$CALLS"
exit 0
STUB
cat > "$BIN/ss" <<'STUB'
#!/usr/bin/env bash
exit 0
STUB
cat > "$BIN/curl" <<'STUB'
#!/usr/bin/env bash
exit 0
STUB
cat > "$BIN/psql" <<'STUB'
#!/usr/bin/env bash
printf 'psql %s\n' "$*" >> "$CALLS"
exit 0
STUB
cat > "$BIN/portless" <<'STUB'
#!/usr/bin/env bash
printf 'portless %s\n' "$*" >> "$CALLS"
case "${1:-}" in
  doctor) echo 'ok Proxy is responding' ;;
  get) echo "https://${2:-educa-dev-local}.localhost" ;;
  run) sleep 0.1 ;;
esac
STUB
cat > "$BIN/pnpm" <<'STUB'
#!/usr/bin/env bash
printf 'pnpm %s\n' "$*" >> "$CALLS"
if [[ "$*" == *'status -o env'* ]]; then
  if [[ "${STUB_REMOTE_STATUS:-false}" == true ]]; then
    printf '%s\n' \
      'API_URL="https://project.supabase.co"' \
      'DB_URL="postgresql://postgres:secret@db.example.com:5432/postgres"' \
      'PUBLISHABLE_KEY="sb_publishable_test"' \
      'SECRET_KEY="sb_secret_test"'
  else
    printf '%s\n' \
      'API_URL="http://127.0.0.1:55000"' \
      'DB_URL="postgresql://postgres:postgres@127.0.0.1:55001/postgres"' \
      'PUBLISHABLE_KEY="sb_publishable_test"' \
      'SECRET_KEY="sb_secret_test"'
  fi
fi
STUB
chmod +x "$BIN"/*

run_baseline() {
  PATH="$BIN:$PATH" CALLS="$CALLS" TMPDIR="$WORK/tmp" XDG_RUNTIME_DIR="$WORK/runtime" bash "$SCRIPT" "$@"
}

output=$(run_baseline)
grep -q 'EDUCA: https://educa-dev-local' <<<"$output"
grep -q 'Synthetic admin: admin@synthetic.invalid' <<<"$output"
grep -q 'Synthetic secretariat: secretaria@synthetic.invalid' <<<"$output"
grep -q 'supabase .* start' "$CALLS"
grep -q 'supabase .* db reset --local' "$CALLS"
grep -q 'pilot-safety-gate.ts seed' "$CALLS"
grep -q 'provision-pilot-module-gate.sql' "$CALLS"
grep -q 'seed-pilot-synthetic.ts' "$CALLS"
grep -q 'validate-pilot-canonical.ts' "$CALLS"
grep -q 'portless run --name educa-dev-local-' "$CALLS"
grep -q 'supabase .* stop .* --no-backup' "$CALLS"

: > "$CALLS"
if STUB_REMOTE_STATUS=true run_baseline >/dev/null 2>&1; then
  echo 'remote status must be rejected' >&2
  exit 1
fi
if grep -q 'seed-pilot-synthetic' "$CALLS"; then
  echo 'remote status reached the synthetic seed' >&2
  exit 1
fi

if run_baseline --unknown >/dev/null 2>&1; then
  echo 'unknown argument must be rejected' >&2
  exit 1
fi

printf 'dev-local baseline checks passed\n'
