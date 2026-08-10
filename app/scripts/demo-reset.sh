#!/usr/bin/env bash
#
# Reset and validate the synthetic demo sandbox through the versioned local
# runner. This wrapper intentionally accepts only the explicit demo variables.
# It never prints their values or falls back to another Supabase environment.
set -euo pipefail

APP_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
cd "$APP_DIR"

required_vars=(
  SUPABASE_DEMO_URL
  SUPABASE_DEMO_SERVICE_KEY
  SUPABASE_DEMO_DB_URL
)
missing_vars=()

for variable_name in "${required_vars[@]}"; do
  if [[ -z "${!variable_name:-}" ]]; then
    missing_vars+=("$variable_name")
  fi
done

if ((${#missing_vars[@]} > 0)); then
  printf 'DEMO_RESET_ENV_MISSING: variaveis ausentes: %s\n' "${missing_vars[*]}" >&2
  printf 'DEMO_RESET_ENV_REQUIRED: exporte as tres variaveis SUPABASE_DEMO_*; valores omitidos.\n' >&2
  exit 2
fi

printf 'DEMO_RESET_ENV_OK: variaveis SUPABASE_DEMO_* presentes; valores omitidos.\n'
printf 'DEMO_RESET_START: executando seed e validacao do sandbox demo.\n'
# Keep the usual pnpm script separator from reaching the seed argument parser.
if [[ "${1:-}" == '--' ]]; then
  shift
fi
pnpm seed:demo "$@"
pnpm demo:validate
printf 'DEMO_RESET_OK: seed e validacao concluidos.\n'
