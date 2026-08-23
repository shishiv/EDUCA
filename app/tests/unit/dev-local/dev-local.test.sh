#!/usr/bin/env bash
# Hermetic tests for dev-local.sh
# Run: bash app/tests/unit/dev-local/dev-local.test.sh
#
# These tests use stub binaries in a temp PATH to exercise the full script
# lifecycle (start, status, migration, app, stop) without real services.
# Zero Docker, Supabase, or portless interaction occurs.

set -euo pipefail

SCRIPT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../scripts" && pwd)/dev-local.sh"
PASS=0
FAIL=0

pass() { echo "  OK $1"; PASS=$((PASS + 1)); }
fail() { echo "  FAIL $1" >&2; FAIL=$((FAIL + 1)); }

# --- Setup hermetic environment ---
STUB_DIR=$(mktemp -d)
STUB_LOG="$STUB_DIR/calls.log"
ENV_EXAMPLE="$STUB_DIR/app/.env.local.example"
trap 'rm -rf "$STUB_DIR"' EXIT

# Create minimal app structure the script expects
mkdir -p "$STUB_DIR/app/scripts" "$STUB_DIR/repo"
cp "$SCRIPT" "$STUB_DIR/app/scripts/dev-local.sh"

# Create .env.local.example
cat > "$ENV_EXAMPLE" << 'ENVEX'
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=placeholder
SUPABASE_SERVICE_ROLE_KEY=placeholder
ENVEX

# Stub: docker (always succeeds for info)
cat > "$STUB_DIR/docker" << 'STUB'
#!/usr/bin/env bash
echo "docker $*" >> "$STUB_LOG"
exit 0
STUB
chmod +x "$STUB_DIR/docker"

# Stub: pnpm (handles exec supabase and dev)
cat > "$STUB_DIR/pnpm" << 'PNPM'
#!/usr/bin/env bash
echo "pnpm $*" >> "$STUB_LOG"
if [[ "$*" == *"supabase"*"status -o env"* ]]; then
  echo "API_URL=http://127.0.0.1:54321"
  echo "PUBLISHABLE_KEY=eyJ_stub_anon_key"
  echo "SECRET_KEY=eyJ_stub_service_role"
  exit 0
fi
if [[ "$*" == *"supabase"*"status"* ]]; then
  # Simulate not running (exit 1) unless STUB_SUPABASE_RUNNING is set
  if [[ "${STUB_SUPABASE_RUNNING:-}" == "1" ]]; then
    exit 0
  fi
  exit 1
fi
if [[ "$*" == *"supabase"*"start"* ]]; then
  exit 0
fi
if [[ "$*" == *"supabase"*"db push --local"* ]]; then
  exit 0
fi
if [[ "$*" == *"supabase"*"db reset --local"* ]]; then
  exit 0
fi
if [[ "$*" == *"supabase"*"stop"* ]]; then
  exit 0
fi
if [[ "$*" == *"dev"* ]]; then
  # Simulate dev server running briefly then exiting
  sleep 0.1
  exit 0
fi
exit 0
PNPM
chmod +x "$STUB_DIR/pnpm"

# Stub: portless (wraps the command)
cat > "$STUB_DIR/portless" << 'PORTLESS'
#!/usr/bin/env bash
echo "portless $*" >> "$STUB_LOG"
shift  # skip the directory arg
exec "$@"
PORTLESS
chmod +x "$STUB_DIR/portless"

# Patch the script copy to use our stub app dir
PATCHED_SCRIPT="$STUB_DIR/app/scripts/dev-local.sh"
# Override APP_DIR and REPO_ROOT in the patched script
sed -i "s|APP_DIR=.*|APP_DIR=\"$STUB_DIR/app\"|" "$PATCHED_SCRIPT"
sed -i "s|REPO_ROOT=.*|REPO_ROOT=\"$STUB_DIR/repo\"|" "$PATCHED_SCRIPT"

# Create a helper to run the script hermetically
run_hermetic() {
  local extra_env="${1:-}"
  PATH="$STUB_DIR:$PATH" \
  STUB_LOG="$STUB_LOG" \
  \
  $extra_env \
  bash "$PATCHED_SCRIPT" "${@:2}" 2>&1
}

echo "dev-local.sh hermetic tests"
echo "================================"

# --- Positive controls ---
echo ""
echo "Positive controls:"

# TEST: --help exits 0
if PATH="$STUB_DIR:$PATH" bash "$PATCHED_SCRIPT" --help >/dev/null 2>&1; then
  pass "--help exits 0"
else
  fail "--help exits 0"
fi

# TEST: full lifecycle (start -> push --local -> portless dev -> cleanup)
true > "$STUB_LOG"
if output=$(run_hermetic "" 2>&1); then
  pass "full lifecycle exits 0"
else
  fail "full lifecycle exits 0 (got: $output)"
fi

# Verify the correct commands were called
if grep -q "supabase.*start" "$STUB_LOG"; then
  pass "supabase start was invoked"
else
  fail "supabase start was NOT invoked"
fi

if grep -q "supabase.*db push --local" "$STUB_LOG"; then
  pass "db push --local was invoked (not bare db push)"
else
  fail "db push --local was NOT invoked"
fi

if grep -q "portless" "$STUB_LOG"; then
  pass "portless was invoked for dev server"
else
  fail "portless was NOT invoked"
fi

if grep -q "supabase.*stop" "$STUB_LOG"; then
  pass "supabase stop called in cleanup (started by session)"
else
  fail "supabase stop NOT called in cleanup"
fi

# TEST: --reset uses db reset --local
true > "$STUB_LOG"
if output=$(PATH="$STUB_DIR:$PATH" STUB_LOG="$STUB_LOG" bash "$PATCHED_SCRIPT" --reset 2>&1); then
  pass "--reset lifecycle exits 0"
else
  fail "--reset lifecycle (got: $output)"
fi

if grep -q "supabase.*db reset --local" "$STUB_LOG"; then
  pass "--reset uses db reset --local"
else
  fail "--reset did NOT use db reset --local"
fi

# TEST: pre-existing Supabase is not stopped
true > "$STUB_LOG"
if output=$(PATH="$STUB_DIR:$PATH" STUB_LOG="$STUB_LOG" STUB_SUPABASE_RUNNING=1 bash "$PATCHED_SCRIPT" 2>&1); then
  pass "pre-existing stack lifecycle exits 0"
else
  fail "pre-existing stack lifecycle (got: $output)"
fi

if grep -q "supabase.*stop" "$STUB_LOG"; then
  fail "should NOT stop pre-existing Supabase"
else
  pass "does not stop pre-existing Supabase"
fi

# TEST: env file is populated without printing secrets
if [[ -f "$STUB_DIR/app/.env.local" ]]; then
  if grep -q "PUBLISHABLE" "$STUB_DIR/app/.env.local" || grep -q "eyJ_stub_anon_key" "$STUB_DIR/app/.env.local"; then
    pass ".env.local populated with local credentials"
  else
    fail ".env.local not populated correctly"
  fi
else
  fail ".env.local was not created"
fi

# --- Negative controls ---
echo ""
echo "Negative controls:"

# TEST: unknown arg exits 1
if PATH="$STUB_DIR:$PATH" bash "$PATCHED_SCRIPT" --bogus >/dev/null 2>&1; then
  fail "unknown arg should exit non-zero"
else
  pass "unknown arg exits non-zero"
fi

# TEST: non-loopback URL blocked
if PATH="$STUB_DIR:$PATH" NEXT_PUBLIC_SUPABASE_URL="https://abc.supabase.co" bash "$PATCHED_SCRIPT" 2>/dev/null; then
  fail "remote supabase.co should be blocked"
else
  pass "remote supabase.co blocked"
fi

if PATH="$STUB_DIR:$PATH" NEXT_PUBLIC_SUPABASE_URL="https://custom.example.com" bash "$PATCHED_SCRIPT" 2>/dev/null; then
  fail "non-loopback custom URL should be blocked"
else
  pass "non-loopback custom URL blocked"
fi

if PATH="$STUB_DIR:$PATH" NEXT_PUBLIC_SUPABASE_URL="http://192.168.1.100:54321" bash "$PATCHED_SCRIPT" 2>/dev/null; then
  fail "LAN IP should be blocked"
else
  pass "LAN IP blocked"
fi

# TEST: loopback variants pass the URL gate (fail later at Docker, which is fine)
for url in "" "http://127.0.0.1:54321" "http://localhost:54321" "http://[::1]:54321"; do
  output=$(PATH="$STUB_DIR:$PATH" NEXT_PUBLIC_SUPABASE_URL="$url" bash "$PATCHED_SCRIPT" 2>&1 || true)
  if echo "$output" | grep -q "not a loopback"; then
    fail "loopback URL '$url' incorrectly blocked"
  else
    pass "loopback URL '${url:-<empty>}' passes gate"
  fi
done

# --- Static analysis ---
echo ""
echo "Static analysis:"

# TEST: no sudo/su in script
if grep -qE '^\s*(sudo|su )\b' "$SCRIPT"; then
  fail "script contains sudo/su invocation"
else
  pass "no sudo/su in script"
fi

# TEST: no hardcoded localhost:port in user-facing output
if grep -qE 'localhost:[0-9]+' "$SCRIPT"; then
  fail "script contains hardcoded localhost:port"
else
  pass "no hardcoded localhost:port in script"
fi

# TEST: reset is not default
if grep -q '^RESET_DB=false' "$SCRIPT"; then
  pass "--reset is not the default"
else
  fail "--reset appears to be default"
fi

# TEST: uses --local flags
if grep -q 'db push --local' "$SCRIPT" && grep -q 'db reset --local' "$SCRIPT"; then
  pass "uses --local for both push and reset"
else
  fail "missing --local flag on db commands"
fi

# TEST: no em dash (U+2014)
if grep -P '\x{2014}' "$SCRIPT"; then
  fail "script contains em dash (U+2014)"
else
  pass "no em dash in script"
fi

# TEST: script is executable
if [[ -x "$SCRIPT" ]]; then
  pass "script is executable"
else
  fail "script is not executable"
fi

# --- Summary ---
echo ""
echo "================================"
echo "Results: $PASS passed, $FAIL failed"
if [[ "$FAIL" -gt 0 ]]; then
  exit 1
fi
