#!/usr/bin/env bash
# EDUCA — Canonical local development command (issue #17)
#
# Usage:
#   pnpm dev:local              # start Supabase + Next.js dev; cleanup on exit
#   pnpm dev:local --reset      # reset DB with synthetic seed before starting
#
# Requirements: Node.js 20+, pnpm 9+, Docker running.
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

for arg in "$@"; do
  case "$arg" in
    --reset) RESET_DB=true ;;
    --help|-h)
      echo "Usage: pnpm dev:local [--reset]"
      echo ""
      echo "  --reset   Reset the local database with migrations and seed (destructive)"
      echo ""
      echo "Without --reset, migrations are applied non-destructively via 'db push'."
      exit 0
      ;;
    *)
      echo "ERROR: Unknown argument: $arg" >&2
      exit 1
      ;;
  esac
done

# --- Safety gates ---

# Block remote endpoints
if [[ "${NEXT_PUBLIC_SUPABASE_URL:-}" == https://*.supabase.co* ]] || \
   [[ "${NEXT_PUBLIC_SUPABASE_URL:-}" == https://*.supabase.in* ]]; then
  echo "ERROR: NEXT_PUBLIC_SUPABASE_URL points to a remote endpoint." >&2
  echo "       This command is for local development only." >&2
  exit 1
fi

# Block sudo
if [[ "${EUID:-$(id -u)}" == "0" ]]; then
  echo "ERROR: Do not run as root." >&2
  exit 1
fi

# Check Docker
if ! docker info >/dev/null 2>&1; then
  echo "ERROR: Docker is not running or not accessible." >&2
  exit 1
fi

# --- Detect existing Supabase stack ---

supabase_running() {
  cd "$APP_DIR" && $SUPABASE status >/dev/null 2>&1
}

# --- Start Supabase if not already running ---

if supabase_running; then
  echo "✓ Local Supabase stack already running."
else
  echo "→ Starting local Supabase stack..."
  cd "$APP_DIR" && $SUPABASE start
  STARTED_SUPABASE=true
  echo "✓ Supabase stack started."
fi

# --- Read local credentials (never print them) ---

get_supabase_var() {
  cd "$APP_DIR" && $SUPABASE status 2>/dev/null | grep -oP "(?<=$1: ).*" | tr -d ' '
}

# Write .env.local with local Supabase values if it doesn't have them
write_local_env() {
  local api_url anon_key service_role_key
  api_url=$(cd "$APP_DIR" && $SUPABASE status -o env 2>/dev/null | grep "^API_URL=" | cut -d= -f2-)
  anon_key=$(cd "$APP_DIR" && $SUPABASE status -o env 2>/dev/null | grep "^ANON_KEY=" | cut -d= -f2-)
  service_role_key=$(cd "$APP_DIR" && $SUPABASE status -o env 2>/dev/null | grep "^SERVICE_ROLE_KEY=" | cut -d= -f2-)

  if [[ -z "$api_url" || -z "$anon_key" ]]; then
    echo "ERROR: Could not read local Supabase credentials from status." >&2
    exit 1
  fi

  local env_file="$APP_DIR/.env.local"
  if [[ ! -f "$env_file" ]]; then
    cp "$APP_DIR/.env.local.example" "$env_file"
  fi

  # Update only Supabase connection values (sed in-place)
  sed -i "s|^NEXT_PUBLIC_SUPABASE_URL=.*|NEXT_PUBLIC_SUPABASE_URL=$api_url|" "$env_file"
  sed -i "s|^NEXT_PUBLIC_SUPABASE_ANON_KEY=.*|NEXT_PUBLIC_SUPABASE_ANON_KEY=$anon_key|" "$env_file"
  sed -i "s|^SUPABASE_SERVICE_ROLE_KEY=.*|SUPABASE_SERVICE_ROLE_KEY=$service_role_key|" "$env_file"
}

write_local_env

# --- Apply migrations ---

if [[ "$RESET_DB" == "true" ]]; then
  echo "→ Resetting database (--reset flag)..."
  cd "$APP_DIR" && $SUPABASE db reset
  echo "✓ Database reset complete."
else
  echo "→ Applying migrations (non-destructive)..."
  cd "$APP_DIR" && $SUPABASE db push
  echo "✓ Migrations applied."
fi

# --- Start Next.js dev server ---

echo "→ Starting Next.js development server..."
echo "  The dev server URL will be printed below."
echo ""

# Cleanup handler: stop only what we started
cleanup() {
  echo ""
  echo "→ Shutting down..."
  if [[ "$STARTED_SUPABASE" == "true" ]]; then
    echo "→ Stopping Supabase stack (started by this session)..."
    cd "$APP_DIR" && $SUPABASE stop || true
    echo "✓ Supabase stopped."
  else
    echo "  Supabase was already running before this session; leaving it up."
  fi
  echo "✓ Cleanup complete."
}
trap cleanup EXIT INT TERM

cd "$APP_DIR" && exec pnpm dev
