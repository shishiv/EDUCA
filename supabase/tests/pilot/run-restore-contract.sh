#!/usr/bin/env bash
# Raw PostgreSQL proof only. No Supabase services, network source or real data.
set -euo pipefail
ROOT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)
PROOF_DIR="$ROOT_DIR/supabase/tests/pilot"
for command in initdb pg_ctl psql cmp; do
  command -v "$command" >/dev/null || { echo "RESTORE_CONTRACT_PREREQUISITE: $command" >&2; exit 1; }
done
WORK_DIR=$(mktemp -d "${TMPDIR:-/tmp}/educa-restore-contract.XXXXXX")
SERVER_STARTED=false
cleanup() {
  local status=$?
  trap - EXIT
  if [[ "$SERVER_STARTED" == true ]] && ! pg_ctl -D "$WORK_DIR/data" -m immediate -w stop >/dev/null; then
    echo 'RESTORE_CONTRACT_CLEANUP_FAILED: temporary PostgreSQL did not stop' >&2
    exit 1
  fi
  if ! rm -rf "$WORK_DIR" || [[ -e "$WORK_DIR" ]]; then
    echo 'RESTORE_CONTRACT_CLEANUP_FAILED: temporary artifacts remain' >&2
    exit 1
  fi
  echo "RESTORE_CONTRACT_CLEANUP: status=$status temporary_cluster_and_csv_removed"
  exit "$status"
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
initdb -D "$WORK_DIR/data" -A trust --no-locale --encoding=UTF8 --username=postgres >/dev/null
# Unix socket only: no shared port or local Supabase lifecycle is touched.
pg_ctl -D "$WORK_DIR/data" -l "$WORK_DIR/postgres.log" -o "-F -h '' -k '$WORK_DIR'" -w start >/dev/null
SERVER_STARTED=true
PSQL=(psql -X -h "$WORK_DIR" -U postgres -v ON_ERROR_STOP=1 -Atq)
"${PSQL[@]}" -d postgres -c 'CREATE ROLE authenticated NOLOGIN; CREATE ROLE anon NOLOGIN; CREATE ROLE service_role NOLOGIN BYPASSRLS;'
apply_schema() {
  local database=$1
  "${PSQL[@]}" -d postgres -c "CREATE DATABASE $database TEMPLATE template0"
  "${PSQL[@]}" -d "$database" -f "$PROOF_DIR/restore-bootstrap.sql"
  for migration in "$ROOT_DIR"/supabase/migrations/*.sql; do
    if [[ "$database" == source && "$(basename "$migration")" == 20260914000000_narrative_sources_and_school_periods.sql ]]; then
      "${PSQL[@]}" -d source -f "$PROOF_DIR/restore-fixture.sql"
      "${PSQL[@]}" -d source -f "$PROOF_DIR/restore-legacy-fixture.sql"
    fi
    "${PSQL[@]}" -d "$database" -f "$migration" >/dev/null
  done
  "${PSQL[@]}" -d "$database" -f "$ROOT_DIR/supabase/pilot/provision-pilot-module-gate.sql"
}
apply_schema source
apply_schema restored
"${PSQL[@]}" -d source -f "$PROOF_DIR/restore-pedagogical-fixture.sql"
"${PSQL[@]}" -d source -f "$PROOF_DIR/restore-integrity.sql" -f "$PROOF_DIR/restore-pedagogical.test.sql"
mapfile -t tables < <(awk -F '\t' '$1 == "included" { print $2 }' "$PROOF_DIR/restore-coverage-v2.tsv")
[[ ${#tables[@]} == 26 ]] || { echo 'RESTORE_ALLOWLIST_CHANGED: explicit coverage review required' >&2; exit 1; }
"${PSQL[@]}" -d restored -f "$PROOF_DIR/restore-catalog.sql" > "$WORK_DIR/expected.catalog"
"${PSQL[@]}" -d restored -c 'TRUNCATE public.pilot_municipality_config CASCADE; TRUNCATE public.configs'
for table in "${tables[@]}"; do
  "${PSQL[@]}" -d source -c "\copy (SELECT * FROM public.\"$table\" ORDER BY id) TO '$WORK_DIR/$table.csv' WITH (FORMAT csv, HEADER true)"
  if [[ "${PILOT_RESTORE_RAW_BREAK:-none}" != "omit-$table" ]]; then
    # Owner replay is bounded to the new disposable DB. It does not grant a
    # service/browser role access to RPC-only configs or academic-year tables.
    "${PSQL[@]}" -d restored -c 'SET session_replication_role = replica' \
      -c "\copy public.\"$table\" FROM '$WORK_DIR/$table.csv' WITH (FORMAT csv, HEADER true)"
  fi
  "${PSQL[@]}" -d restored -c "\copy (SELECT * FROM public.\"$table\" ORDER BY id) TO '$WORK_DIR/$table.restored.csv' WITH (FORMAT csv, HEADER true)"
  cmp "$WORK_DIR/$table.csv" "$WORK_DIR/$table.restored.csv" || {
    echo "RESTORE_DEPENDENCY_RED: table=$table" >&2; exit 1;
  }
  count=$("${PSQL[@]}" -d restored -c "SELECT count(*) FROM public.\"$table\"")
  printf 'RESTORE_RAW_TABLE_MATCH: %s rows=%s\n' "$table" "$count"
done
"${PSQL[@]}" -d source -c "\copy (SELECT id,email,created_at FROM auth.users ORDER BY id) TO '$WORK_DIR/auth.csv' WITH (FORMAT csv, HEADER true)"
"${PSQL[@]}" -d restored -c "\copy auth.users FROM '$WORK_DIR/auth.csv' WITH (FORMAT csv, HEADER true)"
"${PSQL[@]}" -d restored -c "\copy (SELECT id,email,created_at FROM auth.users ORDER BY id) TO '$WORK_DIR/auth.restored.csv' WITH (FORMAT csv, HEADER true)"
cmp "$WORK_DIR/auth.csv" "$WORK_DIR/auth.restored.csv"
"${PSQL[@]}" -d restored -f "$PROOF_DIR/restore-catalog.sql" > "$WORK_DIR/restored.catalog"
cmp "$WORK_DIR/expected.catalog" "$WORK_DIR/restored.catalog"

# Same names/counts, changed expressions: the old policy manifest missed these.
for mutation in \
  'ALTER POLICY pilot_alunos_select ON public.alunos USING (true)' \
  'ALTER POLICY pilot_frequencia_insert ON public.frequencia WITH CHECK (true)' \
  'ALTER TABLE public.alunos DISABLE ROW LEVEL SECURITY' \
  'GRANT SELECT (cpf) ON public.alunos TO authenticated'; do
  "${PSQL[@]}" -d restored -c BEGIN -c "$mutation" -f "$PROOF_DIR/restore-catalog.sql" -c ROLLBACK > "$WORK_DIR/mutated.catalog"
  if cmp -s "$WORK_DIR/expected.catalog" "$WORK_DIR/mutated.catalog"; then
    echo 'RESTORE_CATALOG_REGRESSION: mutation escaped detection' >&2
    exit 1
  fi
done
echo 'RESTORE_CATALOG_OK: qual, with_check, RLS and grants mutations detected'
case "${PILOT_RESTORE_RAW_BREAK:-none}" in
  none) ;;
  allowed-column) "${PSQL[@]}" -d restored -c 'REVOKE SELECT (nome_completo) ON public.alunos FROM authenticated' ;;
  cpf|nis) "${PSQL[@]}" -d restored -c "GRANT SELECT (${PILOT_RESTORE_RAW_BREAK}) ON public.alunos TO authenticated" ;;
  snapshot) "${PSQL[@]}" -d restored -c "SET session_replication_role = replica; UPDATE public.relatorios_descritivos SET fontes_snapshot = jsonb_set(fontes_snapshot, '{fontes,0,descricao}', '\"corrupted\"') WHERE fontes_snapshot IS NOT NULL" ;;
  deadline) "${PSQL[@]}" -d restored -c "SET session_replication_role = replica; UPDATE public.attendance_reopen_requests SET approved_at = approved_at + interval '1 day', decided_at = decided_at + interval '1 day', correction_deadline_at = correction_deadline_at + interval '1 day' WHERE correction_deadline_at IS NOT NULL" ;;
  orphan) "${PSQL[@]}" -d restored -c "SET session_replication_role = replica; UPDATE public.conteudo_aula SET sessao_id = 'ffffffff-ffff-ffff-ffff-ffffffffffff' WHERE sessao_id = '60000000-0000-0000-0000-000000000002'" ;;
  *) echo 'RESTORE_CONTRACT_UNKNOWN_BREAK' >&2; exit 1 ;;
esac
"${PSQL[@]}" -d restored -c "CREATE TEMP VIEW restore_grants AS $(< "$PROOF_DIR/restore-grants.sql")" -f "$PROOF_DIR/restore-grants.test.sql"
"${PSQL[@]}" -d restored -f "$PROOF_DIR/restore-scope.test.sql"
"${PSQL[@]}" -d restored -f "$PROOF_DIR/restore-integrity.sql" -f "$PROOF_DIR/restore-pedagogical.test.sql"
echo 'RESTORE_RAW_PARTIAL_OK: 26 table CSV comparisons (empty tables identified), pedagogical aggregate, identity manifest and migration catalog; no Storage bytes, encryption or GoTrue session proof'
