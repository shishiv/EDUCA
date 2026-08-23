#!/usr/bin/env bash
# Unit/integration tests for dev-local.sh
# Run: bash app/tests/unit/dev-local/dev-local.test.sh
# These tests validate script safety gates without starting real services.

set -euo pipefail

SCRIPT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../scripts" && pwd)/dev-local.sh"
PASS=0
FAIL=0

pass() { echo "  ✓ $1"; PASS=$((PASS + 1)); }
fail() { echo "  ✗ $1" >&2; FAIL=$((FAIL + 1)); }

echo "dev-local.sh safety gate tests"
echo "================================"

# --- TEST: --help exits 0 ---
echo ""
echo "Positive controls:"

if bash "$SCRIPT" --help >/dev/null 2>&1; then
  pass "--help exits 0"
else
  fail "--help exits 0"
fi

# --- TEST: unknown arg exits 1 ---
echo ""
echo "Negative controls:"

if bash "$SCRIPT" --bogus >/dev/null 2>&1; then
  fail "unknown arg should exit non-zero"
else
  pass "unknown arg exits non-zero"
fi

# --- TEST: remote endpoint blocked ---
if NEXT_PUBLIC_SUPABASE_URL="https://abc.supabase.co" bash "$SCRIPT" 2>/dev/null; then
  fail "remote supabase.co endpoint should be blocked"
else
  pass "remote supabase.co endpoint blocked (exit non-zero)"
fi

if NEXT_PUBLIC_SUPABASE_URL="https://xyz.supabase.in/rest" bash "$SCRIPT" 2>/dev/null; then
  fail "remote supabase.in endpoint should be blocked"
else
  pass "remote supabase.in endpoint blocked (exit non-zero)"
fi

# --- TEST: local endpoint not blocked ---
# (Will fail later due to Docker/Supabase not running, but should pass the URL gate)
output=$(NEXT_PUBLIC_SUPABASE_URL="http://127.0.0.1:54321" bash "$SCRIPT" 2>&1 || true)
if echo "$output" | grep -q "remote endpoint"; then
  fail "local URL should not be blocked as remote"
else
  pass "local URL not blocked by remote-endpoint gate"
fi

# --- TEST: script is executable ---
if [[ -x "$SCRIPT" ]]; then
  pass "script is executable"
else
  fail "script is not executable"
fi

# --- TEST: no sudo/su in script ---
if grep -qE '^\s*(sudo|su )\b' "$SCRIPT"; then
  fail "script contains sudo/su invocation"
else
  pass "script does not invoke sudo/su"
fi

# --- TEST: no hardcoded port in user-facing output ---
if grep -qE 'localhost:[0-9]+' "$SCRIPT"; then
  fail "script contains hardcoded localhost:port"
else
  pass "no hardcoded localhost:port in script output"
fi

# --- TEST: reset is not default ---
if grep -q '^RESET_DB=false' "$SCRIPT"; then
  pass "--reset is not the default (RESET_DB=false)"
else
  fail "--reset appears to be defaulted to true"
fi

# --- Summary ---
echo ""
echo "================================"
echo "Results: $PASS passed, $FAIL failed"
if [[ "$FAIL" -gt 0 ]]; then
  exit 1
fi
