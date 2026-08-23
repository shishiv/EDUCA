#!/usr/bin/env bash
# EDUCA - Canonical local development command (issue #17)
#
# Usage:
#   pnpm dev:local              # start Supabase + Next.js dev; cleanup on exit
#   pnpm dev:local --reset      # reset DB with synthetic seed before starting
#
# Requirements: Node.js 20+, pnpm 9+, Docker running, portless configured.
# The script uses the Supabase CLI pinned in the project dependencies.
# It never uses sudo, never connects to remote endpoints, and cleans up
# only the resources it started.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
REPO_ROOT="$(cd "$APP_DIR/.." && pwd)"

# Resolve the project-pinned supabase binary
SUPABASE="pnpm exec supabase --workdir $REPO_ROOT"

# Flags
RESET_DB=false
STARTED_SUPABASE=false
NEXT_PID=""

for arg in "$@"; do
  case "$arg" in
    --reset) RESET_DB=true ;;
    --help|-h)
      echo "Usage: pnpm dev:local [--reset]"
      echo ""
      echo "  --reset   Reset the local database with migrations and seed (destructive)"
      echo ""
      echo "Without --reset, migrations are applied non-destructively (db push --local)."
      exit 0
      ;;
    *)
      echo "ERROR: Unknown argument: $arg" >&2
      exit 1
      ;;
  esac
done

# --- Safety gates ---

# Block any non-loopback NEXT_PUBLIC_SUPABASE_URL
is_loopback_url() {
  local url="${1:-}"
  [[ -z "$url" ]] && return 0
  # Allow only http://127.0.0.1, http://localhost, http://[::1]
  if [[ "$url" =~ ^https?://(127\.0\.0\.1|localhost|\[::1\]) ]]; then
    return 0
  fi
  return 1
}

if ! is_loopback_url "${NEXT_PUBLIC_SUPABASE_URL:-}"; then
  echo "ERROR: NEXT_PUBLIC_SUPABASE_URL is not a loopback address." >&2
  echo "       This command is for local development only." >&2
  exit 1
fi

# Block sudo/root
if [[ "${EUID:-$(id -u)}" == "0" ]]; then
  echo "ERROR: Do not run as root." >&2
  exit 1
fi

# Check Docker
if ! docker info >/dev/null 2>&1; then
  echo "ERROR: Docker is not running or not accessible." >&2
  exit 1
fi

# Check portless
if ! command -v portless >/dev/null 2>&1; then
  echo "ERROR: portless is not installed or not on PATH." >&2
  echo "       Install portless for local HTTPS development without explicit ports." >&2
  echo "       See: https://github.com/nicholasgasior/portless" >&2
  exit 1
fi

# --- Cleanup handler: stop only what we started ---
cleanup() {
  local exit_code=$?
  echo ""
  echo "-> Shutting down..."
  # Kill Next.js child if running
  if [[ -n "$NEXT_PID" ]] && kill -0 "$NEXT_PID" 2>/dev/null; then
    kill -TERM "$NEXT_PID" 2>/dev/null || true
    wait "$NEXT_PID" 2>/dev/null || true
  fi
  if [[ "$STARTED_SUPABASE" == "true" ]]; then
    echo "-> Stopping Supabase stack (started by this session)..."
    cd "$APP_DIR" && $SUPABASE stop || true
    echo "OK Supabase stopped."
  else
    echo "   Supabase was already running before this session; leaving it up."
  fi
  echo "OK Cleanup complete."
  exit "$exit_code"
}
trap cleanup EXIT INT TERM

# --- Detect existing Supabase stack ---

supabase_running() {
  cd "$APP_DIR" && $SUPABASE status >/dev/null 2>&1
}

# --- Start Supabase if not already running ---

if supabase_running; then
  echo "OK Local Supabase stack already running."
else
  echo "-> Starting local Supabase stack..."
  cd "$APP_DIR" && $SUPABASE start
  STARTED_SUPABASE=true
  echo "OK Supabase stack started."
fi

# --- Read local credentials (never print them) ---

write_local_env() {
  local status_env
  status_env=$(cd "$APP_DIR" && $SUPABASE status -o env 2>/dev/null)

  local api_url anon_key service_role_key
  api_url=$(echo "$status_env" | grep "^API_URL=" | cut -d= -f2-)
  # Prefer PUBLISHABLE_KEY (newer CLI), fall back to ANON_KEY
  anon_key=$(echo "$status_env" | grep "^PUBLISHABLE_KEY=" | cut -d= -f2-)
  if [[ -z "$anon_key" ]]; then
    anon_key=$(echo "$status_env" | grep "^ANON_KEY=" | cut -d= -f2-)
  fi
  # Prefer SECRET_KEY (newer CLI), fall back to SERVICE_ROLE_KEY
  service_role_key=$(echo "$status_env" | grep "^SECRET_KEY=" | cut -d= -f2-)
  if [[ -z "$service_role_key" ]]; then
    service_role_key=$(echo "$status_env" | grep "^SERVICE_ROLE_KEY=" | cut -d= -f2-)
  fi

  if [[ -z "$api_url" || -z "$anon_key" ]]; then
    echo "ERROR: Could not read local Supabase credentials from status." >&2
    exit 1
  fi

  local env_file="$APP_DIR/.env.local"
  if [[ ! -f "$env_file" ]]; then
    cp "$APP_DIR/.env.local.example" "$env_file"
  fi

  # Update only Supabase connection values (sed in-place, never echo secrets)
  sed -i "s|^NEXT_PUBLIC_SUPABASE_URL=.*|NEXT_PUBLIC_SUPABASE_URL=$api_url|" "$env_file"
  sed -i "s|^NEXT_PUBLIC_SUPABASE_ANON_KEY=.*|NEXT_PUBLIC_SUPABASE_ANON_KEY=$anon_key|" "$env_file"
  sed -i "s|^SUPABASE_SERVICE_ROLE_KEY=.*|SUPABASE_SERVICE_ROLE_KEY=$service_role_key|" "$env_file"
}

write_local_env

# --- Apply migrations (explicitly local) ---

if [[ "$RESET_DB" == "true" ]]; then
  echo "-> Resetting database (--reset flag)..."
  cd "$APP_DIR" && $SUPABASE db reset --local
  echo "OK Database reset complete."
else
  echo "-> Applying migrations (non-destructive, local only)..."
  cd "$APP_DIR" && $SUPABASE db push --local
  echo "OK Migrations applied."
fi

# --- Start Next.js dev server via portless ---

echo "-> Starting Next.js development server via portless..."
echo ""

cd "$APP_DIR" && portless . pnpm dev &
NEXT_PID=$!

# Wait for the child; if it exits or we get a signal, cleanup runs via trap
wait "$NEXT_PID" || true
