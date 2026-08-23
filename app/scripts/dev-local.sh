#!/usr/bin/env bash
# EDUCA - Canonical local development command (issue #17)
#
# Usage:
#   pnpm dev:local              # start Supabase + Next.js dev; cleanup on exit
#   pnpm dev:local --reset      # reset DB with synthetic seed before starting
#
# Requirements: Node.js 20+, pnpm 9+, Docker running, portless proxy active.
# The script uses the Supabase CLI pinned in the project dependencies.
# It never uses sudo, never connects to remote endpoints, and cleans up
# only the resources it started.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
REPO_ROOT="$(cd "$APP_DIR/.." && pwd)"

# --- Supabase CLI wrapper (array to preserve quoting) ---
run_supabase() {
  pnpm exec supabase --workdir "$REPO_ROOT" "$@"
}

# Flags
RESET_DB=false
STARTED_SUPABASE=false
NEXT_PID=""
SHUTTING_DOWN=false

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

# Block any non-loopback NEXT_PUBLIC_SUPABASE_URL using Node URL parser
assert_loopback_url() {
  local url="${1:-}"
  # Empty is acceptable (will be set from local Supabase status)
  if [[ -z "$url" ]]; then
    return 0
  fi
  # Use Node.js URL parser for robust validation
  local result
  result=$(node -e "
    try {
      const u = new URL(process.argv[1]);
      const proto = u.protocol;
      if (proto !== 'http:' && proto !== 'https:') process.exit(1);
      if (u.username || u.password) process.exit(2);
      const h = u.hostname;
      if (h === '127.0.0.1' || h === 'localhost' || h === '::1') process.exit(0);
      process.exit(3);
    } catch { process.exit(4); }
  " "$url" 2>/dev/null; echo $?)
  if [[ "$result" != "0" ]]; then
    return 1
  fi
  return 0
}

if ! assert_loopback_url "${NEXT_PUBLIC_SUPABASE_URL:-}"; then
  echo "ERROR: NEXT_PUBLIC_SUPABASE_URL is not a valid loopback address." >&2
  echo "       Only http(s)://127.0.0.1, localhost, or [::1] are allowed." >&2
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

# Check portless binary exists
if ! command -v portless >/dev/null 2>&1; then
  echo "ERROR: portless is not installed or not on PATH." >&2
  echo "       Install: npm install -g portless" >&2
  exit 1
fi

# Check portless proxy is already active (do not attempt to start it)
if ! portless doctor 2>/dev/null | grep -q "Proxy is responding"; then
  echo "ERROR: portless proxy is not running." >&2
  echo "       Start it manually: portless proxy start" >&2
  echo "       Then re-run: pnpm dev:local" >&2
  exit 1
fi

# --- Cleanup handler: stop only what we started ---
# shellcheck disable=SC2329
cleanup() {
  if [[ "$SHUTTING_DOWN" == "true" ]]; then
    return
  fi
  SHUTTING_DOWN=true

  echo ""
  echo "-> Shutting down..."
  # Terminate Next.js child if running
  if [[ -n "$NEXT_PID" ]] && kill -0 "$NEXT_PID" 2>/dev/null; then
    kill -TERM "$NEXT_PID" 2>/dev/null || true
    wait "$NEXT_PID" 2>/dev/null || true
  fi
  if [[ "$STARTED_SUPABASE" == "true" ]]; then
    echo "-> Stopping Supabase stack (started by this session)..."
    run_supabase stop || true
    echo "OK Supabase stopped."
  else
    echo "   Supabase was already running before this session; leaving it up."
  fi
  echo "OK Cleanup complete."
}
trap cleanup EXIT
trap 'cleanup; exit 130' INT
trap 'cleanup; exit 143' TERM

# --- Detect existing Supabase stack ---

supabase_running() {
  run_supabase status >/dev/null 2>&1
}

# --- Start Supabase if not already running ---

if supabase_running; then
  echo "OK Local Supabase stack already running."
else
  echo "-> Starting local Supabase stack..."
  run_supabase start
  STARTED_SUPABASE=true
  echo "OK Supabase stack started."
fi

# --- Read local credentials and write .env.local securely ---

write_local_env() {
  local status_env
  status_env=$(run_supabase status -o env 2>/dev/null)
  if [[ -z "$status_env" ]]; then
    echo "ERROR: Could not read Supabase status." >&2
    return 1
  fi

  local api_url anon_key service_role_key

  api_url=$(echo "$status_env" | grep "^API_URL=" | cut -d= -f2-) || true
  # Prefer PUBLISHABLE_KEY (newer CLI), fall back to ANON_KEY
  anon_key=$(echo "$status_env" | grep "^PUBLISHABLE_KEY=" | cut -d= -f2-) || true
  if [[ -z "$anon_key" ]]; then
    anon_key=$(echo "$status_env" | grep "^ANON_KEY=" | cut -d= -f2-) || true
  fi
  # Prefer SECRET_KEY (newer CLI), fall back to SERVICE_ROLE_KEY
  service_role_key=$(echo "$status_env" | grep "^SECRET_KEY=" | cut -d= -f2-) || true
  if [[ -z "$service_role_key" ]]; then
    service_role_key=$(echo "$status_env" | grep "^SERVICE_ROLE_KEY=" | cut -d= -f2-) || true
  fi

  # Require all three
  if [[ -z "$api_url" ]]; then
    echo "ERROR: API_URL not found in Supabase status output." >&2
    return 1
  fi
  if [[ -z "$anon_key" ]]; then
    echo "ERROR: PUBLISHABLE_KEY/ANON_KEY not found in Supabase status output." >&2
    return 1
  fi
  if [[ -z "$service_role_key" ]]; then
    echo "ERROR: SECRET_KEY/SERVICE_ROLE_KEY not found in Supabase status output." >&2
    return 1
  fi

  local env_file="$APP_DIR/.env.local"
  if [[ ! -f "$env_file" ]]; then
    cp "$APP_DIR/.env.local.example" "$env_file"
  fi

  # Securely update env file without printing secrets: write to temp, then move
  local tmp_env
  tmp_env=$(mktemp "$APP_DIR/.env.local.XXXXXX")
  while IFS= read -r line || [[ -n "$line" ]]; do
    case "$line" in
      NEXT_PUBLIC_SUPABASE_URL=*)
        printf '%s\n' "NEXT_PUBLIC_SUPABASE_URL=$api_url" >> "$tmp_env" ;;
      NEXT_PUBLIC_SUPABASE_ANON_KEY=*)
        printf '%s\n' "NEXT_PUBLIC_SUPABASE_ANON_KEY=$anon_key" >> "$tmp_env" ;;
      SUPABASE_SERVICE_ROLE_KEY=*)
        printf '%s\n' "SUPABASE_SERVICE_ROLE_KEY=$service_role_key" >> "$tmp_env" ;;
      *)
        printf '%s\n' "$line" >> "$tmp_env" ;;
    esac
  done < "$env_file"
  mv "$tmp_env" "$env_file"
}

write_local_env

# --- Apply migrations (explicitly local) ---

if [[ "$RESET_DB" == "true" ]]; then
  echo "-> Resetting database (--reset flag)..."
  run_supabase db reset --local
  echo "OK Database reset complete."
else
  echo "-> Applying migrations (non-destructive, local only)..."
  run_supabase db push --local
  echo "OK Migrations applied."
fi

# --- Start Next.js dev server via portless ---

echo "-> Starting Next.js development server via portless..."
echo ""

cd "$APP_DIR" || exit 1
portless run pnpm dev &
NEXT_PID=$!

# Wait for child: disable -e to capture exit code, then propagate
set +e
wait "$NEXT_PID"
NEXT_EXIT=$?
set -e
NEXT_PID=""
exit "$NEXT_EXIT"
