#!/usr/bin/env bash
# Hermetic tests for dev-local.sh
# Run: bash app/tests/unit/dev-local/dev-local.test.sh
#
# All external tools (docker, pnpm, portless, node) are stubbed.
# Zero real Docker, Supabase, or portless interaction occurs.

set -uo pipefail

SCRIPT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../scripts" && pwd)/dev-local.sh"
PASS=0
FAIL=0

pass() { echo "  OK $1"; PASS=$((PASS + 1)); }
fail() { echo "  FAIL $1" >&2; FAIL=$((FAIL + 1)); }

# --- Setup hermetic environment ---
STUB_DIR=$(mktemp -d)
STUB_LOG="$STUB_DIR/calls.log"
touch "$STUB_LOG"

cleanup_stubs() { rm -rf "$STUB_DIR"; }
trap cleanup_stubs EXIT

# Create minimal app structure
mkdir -p "$STUB_DIR/app/scripts" "$STUB_DIR/repo"

# Create .env.local.example
cat > "$STUB_DIR/app/.env.local.example" << 'ENVEX'
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=placeholder
SUPABASE_SERVICE_ROLE_KEY=placeholder
ENVEX

# Stub: docker (always succeeds for info)
cat > "$STUB_DIR/docker" << 'STUB'
#!/usr/bin/env bash
echo "docker $*" >> "${STUB_LOG:-/dev/null}"
exit 0
STUB
chmod +x "$STUB_DIR/docker"

# Stub: node (implements the URL validation logic; uses exit codes like real node)
cat > "$STUB_DIR/node" << 'NODESTUB'
#!/usr/bin/env bash
# Mimics: node -e "try { ... process.exit(N) } catch { process.exit(4) }" URL
if [[ "$1" == "-e" ]]; then
  # The script passes the URL as the argument after the -e code
  local_url="${3:-}"
  if [[ -z "$local_url" ]]; then exit 0; fi
  # Validate protocol
  if [[ ! "$local_url" =~ ^https?:// ]]; then exit 1; fi
  # Check for userinfo (user:pass@)
  path_part="${local_url#*://}"
  if [[ "$path_part" == *@* ]]; then
    before_at="${path_part%%@*}"
    if [[ "$before_at" != */* ]]; then exit 2; fi
  fi
  # Extract hostname (handle bracketed IPv6 first)
  if [[ "$path_part" == \[* ]]; then
    # IPv6: extract between brackets
    host_part="${path_part#\[}"
    host_part="${host_part%%\]*}"
  else
    host_part="${path_part%%[:/]*}"
  fi
  case "$host_part" in
    127.0.0.1|localhost|::1) exit 0 ;;
    *) exit 3 ;;
  esac
fi
echo "node $*" >> "${STUB_LOG:-/dev/null}"
exit 0
NODESTUB
chmod +x "$STUB_DIR/node"

# Stub: pnpm (handles exec supabase and dev)
cat > "$STUB_DIR/pnpm" << 'PNPM'
#!/usr/bin/env bash
echo "pnpm $*" >> "${STUB_LOG:-/dev/null}"
if [[ "$*" == *"supabase"*"status -o env"* ]]; then
  echo "API_URL=http://127.0.0.1:54321"
  echo "PUBLISHABLE_KEY=eyJ_stub_publishable"
  echo "SECRET_KEY=eyJ_stub_secret"
  exit 0
fi
if [[ "$*" == *"supabase"*"status"* ]]; then
  if [[ "${STUB_SUPABASE_RUNNING:-}" == "1" ]]; then
    exit 0
  fi
  exit 1
fi
if [[ "$*" == *"supabase"*"start"* ]]; then exit 0; fi
if [[ "$*" == *"supabase"*"db push --local"* ]]; then exit 0; fi
if [[ "$*" == *"supabase"*"db reset --local"* ]]; then exit 0; fi
if [[ "$*" == *"supabase"*"stop"* ]]; then exit 0; fi
if [[ "$*" == *"dev"* ]]; then sleep 0.05; exit 0; fi
exit 0
PNPM
chmod +x "$STUB_DIR/pnpm"

# Stub: portless
cat > "$STUB_DIR/portless" << 'PORTLESS'
#!/usr/bin/env bash
echo "portless $*" >> "${STUB_LOG:-/dev/null}"
if [[ "$1" == "doctor" ]]; then
  if [[ "${STUB_PORTLESS_PROXY_DOWN:-}" == "1" ]]; then
    echo "warn  Proxy is NOT responding."
    exit 0
  fi
  echo "ok    Proxy is responding on port 1355."
  exit 0
fi
if [[ "$1" == "run" ]]; then
  shift
  exec "$@"
fi
exit 0
PORTLESS
chmod +x "$STUB_DIR/portless"

# Patch the script copy
cp "$SCRIPT" "$STUB_DIR/app/scripts/dev-local.sh"
PATCHED="$STUB_DIR/app/scripts/dev-local.sh"
sed -i "s|^APP_DIR=.*|APP_DIR=\"$STUB_DIR/app\"|" "$PATCHED"
sed -i "s|^REPO_ROOT=.*|REPO_ROOT=\"$STUB_DIR/repo\"|" "$PATCHED"

# Helper to run hermetically
run_h() {
  PATH="$STUB_DIR:$PATH" STUB_LOG="$STUB_LOG" bash "$PATCHED" "$@" 2>&1
}

echo "dev-local.sh hermetic tests"
echo "================================"

# --- Positive controls ---
echo ""
echo "Positive controls:"

# TEST: --help exits 0
if PATH="$STUB_DIR:$PATH" bash "$PATCHED" --help >/dev/null 2>&1; then
  pass "--help exits 0"
else
  fail "--help exits 0"
fi

# TEST: full lifecycle
true > "$STUB_LOG"
if output=$(run_h 2>&1); then
  pass "full lifecycle exits 0"
else
  fail "full lifecycle exits 0 (output: $(echo "$output" | tail -3))"
fi

if grep -q "supabase.*start" "$STUB_LOG"; then
  pass "supabase start was invoked"
else
  fail "supabase start was NOT invoked"
fi

if grep -q "supabase.*db push --local" "$STUB_LOG"; then
  pass "db push --local was invoked"
else
  fail "db push --local was NOT invoked"
fi

if grep -q "portless run" "$STUB_LOG"; then
  pass "portless run was invoked"
else
  fail "portless run was NOT invoked"
fi

if grep -q "supabase.*stop" "$STUB_LOG"; then
  pass "supabase stop called in cleanup"
else
  fail "supabase stop NOT called in cleanup"
fi

# TEST: --reset uses db reset --local
true > "$STUB_LOG"
if run_h --reset >/dev/null 2>&1; then
  pass "--reset lifecycle exits 0"
else
  fail "--reset lifecycle"
fi

if grep -q "supabase.*db reset --local" "$STUB_LOG"; then
  pass "--reset uses db reset --local"
else
  fail "--reset did NOT use db reset --local"
fi

# TEST: pre-existing Supabase is not stopped
true > "$STUB_LOG"
if STUB_SUPABASE_RUNNING=1 run_h >/dev/null 2>&1; then
  pass "pre-existing stack lifecycle exits 0"
else
  fail "pre-existing stack lifecycle"
fi

if grep -q "supabase.*stop" "$STUB_LOG"; then
  fail "should NOT stop pre-existing Supabase"
else
  pass "does not stop pre-existing Supabase"
fi

# TEST: env file is populated with publishable key
if [[ -f "$STUB_DIR/app/.env.local" ]]; then
  if grep -q "eyJ_stub_publishable" "$STUB_DIR/app/.env.local" && \
     grep -q "eyJ_stub_secret" "$STUB_DIR/app/.env.local"; then
    pass ".env.local populated with PUBLISHABLE_KEY and SECRET_KEY"
  else
    fail ".env.local not populated correctly"
  fi
else
  fail ".env.local was not created"
fi

# TEST: no secrets printed to stdout
true > "$STUB_LOG"
output=$(run_h 2>&1)
if echo "$output" | grep -q "eyJ_stub"; then
  fail "secrets leaked to stdout/stderr"
else
  pass "no secrets in stdout/stderr"
fi

# --- Negative controls ---
echo ""
echo "Negative controls:"

# TEST: unknown arg
if run_h --bogus >/dev/null 2>&1; then
  fail "unknown arg should exit non-zero"
else
  pass "unknown arg exits non-zero"
fi

# TEST: URL validation - reject non-loopback
for url in \
  "https://abc.supabase.co" \
  "https://custom.example.com" \
  "http://192.168.1.100:54321" \
  "http://localhost.evil:3000" \
  "http://127.0.0.2:54321" \
  "http://0.0.0.0:3000" \
  "ftp://localhost:21" \
  "http://user:pass@localhost:3000" \
  "not-a-url"; do
  if PATH="$STUB_DIR:$PATH" STUB_LOG="$STUB_LOG" \
     NEXT_PUBLIC_SUPABASE_URL="$url" bash "$PATCHED" 2>/dev/null; then
    fail "should block: $url"
  else
    pass "blocked: $url"
  fi
done

# TEST: loopback variants accepted
for url in \
  "" \
  "http://127.0.0.1:54321" \
  "http://localhost:54321" \
  "https://localhost:54321" \
  "http://[::1]:54321"; do
  output=$(PATH="$STUB_DIR:$PATH" STUB_LOG="$STUB_LOG" \
    NEXT_PUBLIC_SUPABASE_URL="$url" bash "$PATCHED" 2>&1 || true)
  if echo "$output" | grep -q "not a valid loopback"; then
    fail "incorrectly blocked loopback: '${url:-<empty>}'"
  else
    pass "accepted loopback: '${url:-<empty>}'"
  fi
done

# TEST: portless proxy not running
proxy_output=$(PATH="$STUB_DIR:$PATH" STUB_LOG="$STUB_LOG" STUB_PORTLESS_PROXY_DOWN=1 bash "$PATCHED" 2>&1 || true)
if echo "$proxy_output" | grep -q "portless proxy is not running"; then
  pass "fails when portless proxy is not active"
else
  fail "should fail when portless proxy is down (got: $proxy_output)"
fi


# --- Failure mode tests ---
echo ""
echo "Failure modes:"

# TEST: db push --local failure aborts, portless never starts, supabase stop runs
# Create a pnpm stub that fails on db push
cat > "$STUB_DIR/pnpm_fail_push" << 'PNPM_FAIL'
#!/usr/bin/env bash
echo "pnpm $*" >> "${STUB_LOG:-/dev/null}"
if [[ "$*" == *"supabase"*"status -o env"* ]]; then
  echo "API_URL=http://127.0.0.1:54321"
  echo "PUBLISHABLE_KEY=eyJ_stub_publishable"
  echo "SECRET_KEY=eyJ_stub_secret"
  exit 0
fi
if [[ "$*" == *"supabase"*"status"* ]]; then exit 1; fi
if [[ "$*" == *"supabase"*"start"* ]]; then exit 0; fi
if [[ "$*" == *"supabase"*"db push --local"* ]]; then
  echo "ERROR: migration failed" >&2
  exit 1
fi
if [[ "$*" == *"supabase"*"stop"* ]]; then
  echo "pnpm_stop_called" >> "${STUB_LOG:-/dev/null}"
  exit 0
fi
if [[ "$*" == *"dev"* ]]; then sleep 0.05; exit 0; fi
exit 0
PNPM_FAIL
chmod +x "$STUB_DIR/pnpm_fail_push"
true > "$STUB_LOG"
cp "$STUB_DIR/pnpm_fail_push" "$STUB_DIR/pnpm"
push_rc=0
PATH="$STUB_DIR:$PATH" STUB_LOG="$STUB_LOG" bash "$PATCHED" >/dev/null 2>&1 || push_rc=$?
if [[ "$push_rc" != "0" ]]; then
  pass "db push failure: exits non-zero"
else
  fail "db push failure: should exit non-zero (got rc=$push_rc)"
fi
if grep -q "pnpm_stop_called" "$STUB_LOG"; then
  pass "db push failure: supabase stop called (cleanup)"
else
  fail "db push failure: supabase stop NOT called"
fi
if grep -q "portless run" "$STUB_LOG"; then
  fail "db push failure: portless should NOT have started"
else
  pass "db push failure: portless was not started"
fi

# TEST: supabase start failure aborts immediately, no further steps
cat > "$STUB_DIR/pnpm_fail_start" << 'PNPM_FSTART'
#!/usr/bin/env bash
echo "pnpm $*" >> "${STUB_LOG:-/dev/null}"
if [[ "$*" == *"supabase"*"status -o env"* ]]; then exit 1; fi
if [[ "$*" == *"supabase"*"status"* ]]; then exit 1; fi
if [[ "$*" == *"supabase"*"start"* ]]; then
  echo "ERROR: start failed" >&2
  exit 1
fi
if [[ "$*" == *"supabase"*"stop"* ]]; then
  echo "pnpm_stop_called" >> "${STUB_LOG:-/dev/null}"
  exit 0
fi
exit 0
PNPM_FSTART
chmod +x "$STUB_DIR/pnpm_fail_start"
true > "$STUB_LOG"
cp "$STUB_DIR/pnpm_fail_start" "$STUB_DIR/pnpm"
start_rc=0
PATH="$STUB_DIR:$PATH" STUB_LOG="$STUB_LOG" bash "$PATCHED" >/dev/null 2>&1 || start_rc=$?
if [[ "$start_rc" != "0" ]]; then
  pass "start failure: exits non-zero"
else
  fail "start failure: should exit non-zero (got rc=$start_rc)"
fi
if grep -q "supabase.*db push" "$STUB_LOG"; then
  fail "start failure: db push should NOT run after start fails"
else
  pass "start failure: no db push after start fails"
fi
if grep -q "portless run" "$STUB_LOG"; then
  fail "start failure: portless should NOT run"
else
  pass "start failure: portless was not started"
fi

# --- Static analysis ---
echo ""
echo "Static analysis:"

if grep -qE '^\s*(sudo|su )\b' "$SCRIPT"; then
  fail "script contains sudo/su"
else
  pass "no sudo/su in script"
fi

if grep -qE 'localhost:[0-9]+' "$SCRIPT"; then
  fail "hardcoded localhost:port"
else
  pass "no hardcoded localhost:port"
fi

if grep -q '^RESET_DB=false' "$SCRIPT"; then
  pass "--reset is not default"
else
  fail "--reset appears default"
fi

if grep -q 'db push --local' "$SCRIPT" && grep -q 'db reset --local' "$SCRIPT"; then
  pass "--local on both db commands"
else
  fail "missing --local"
fi

if grep -P '\x{2014}' "$SCRIPT" >/dev/null 2>&1; then
  fail "em dash (U+2014) found"
else
  pass "no em dash"
fi

if [[ -x "$SCRIPT" ]]; then
  pass "script is executable"
else
  fail "not executable"
fi

if grep -q 'portless run' "$SCRIPT"; then
  pass "uses 'portless run' syntax"
else
  fail "does not use 'portless run'"
fi

# shellcheck disable=SC2016
if grep -q 'run_supabase' "$SCRIPT" && ! grep -qE '\$SUPABASE\b' "$SCRIPT"; then
  pass "uses run_supabase function (no bare \$SUPABASE string)"
else
  fail "still uses \$SUPABASE as bare string"
fi

if grep -q "portless doctor" "$SCRIPT"; then
  pass "checks proxy via doctor, does not attempt to start it"
else
  fail "proxy handling incorrect"
fi


if head -15 "$SCRIPT" | grep -q 'set -euo pipefail'; then
  pass "uses set -euo pipefail"
else
  fail "missing set -euo pipefail"
fi

# --- Summary ---
echo ""
echo "================================"
echo "Results: $PASS passed, $FAIL failed"
if [[ "$FAIL" -gt 0 ]]; then
  exit 1
fi
