#!/usr/bin/env bash
# Uses an already installed local image, with no network or shared database.
set -euo pipefail
cd "$(dirname "$0")/../.."
name="educa-contracts-sql-$$"
trap 'docker rm -f "$name" >/dev/null 2>&1 || true' EXIT
# Source mount is read-only; the cluster and its cleanup live in this container.
docker run --rm --pull=never --name "$name" --network none --user postgres \
  -e CONTRACT_BASELINE="${CONTRACT_BASELINE:-false}" \
  -v "$PWD:/workspace:ro" pgvector/pgvector:pg16 bash -euc '
export PATH="/usr/lib/postgresql/16/bin:$PATH"
work=$(mktemp -d)
trap '\''pg_ctl -D "$work/db" -m immediate stop >/dev/null 2>&1 || true; rm -rf "$work"'\'' EXIT
mkdir "$work/socket"
initdb -D "$work/db" -A trust --no-locale --encoding=UTF8 >/dev/null
pg_ctl -D "$work/db" -l "$work/log" -o "-F -k $work/socket -c listen_addresses=" -w start >/dev/null
export PGHOST="$work/socket" PGUSER=postgres PGDATABASE=postgres
psql -X -v ON_ERROR_STOP=1 -f /workspace/supabase/tests/database/bootstrap.sql >/dev/null
for file in /workspace/supabase/migrations/*.sql; do
  if [[ "$CONTRACT_BASELINE" == true && "$file" == *20260914000000* ]]; then continue; fi
  if [[ "$file" == *20260914000000* ]]; then
    psql -X -v ON_ERROR_STOP=1 -c "CREATE DATABASE narrative_legacy TEMPLATE postgres" >/dev/null
    psql -X -v ON_ERROR_STOP=1 -d narrative_legacy -f /workspace/supabase/tests/database/narrative_sources.before.sql >/dev/null
    psql -X -v ON_ERROR_STOP=1 -d narrative_legacy -f "$file" >/dev/null
    psql -X -v ON_ERROR_STOP=1 -d narrative_legacy -f /workspace/supabase/tests/database/narrative_sources_legacy.contract.sql >/dev/null
    psql -X -v ON_ERROR_STOP=1 -c "DROP DATABASE narrative_legacy" >/dev/null
  fi
  psql -X -v ON_ERROR_STOP=1 -f "$file" >/dev/null
done
psql -X -v ON_ERROR_STOP=1 -f /workspace/supabase/tests/database/narrative_sources.test.sql
'
