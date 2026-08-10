#!/usr/bin/env bash
# =============================================================================
# verify-sql.sh
#
# Validacao offline do seed do sandbox publico (issue #23) contra o schema
# canonico, em um cluster PostgreSQL descartavel (initdb/pg_ctl/psql, sem
# Docker, sem Supabase e sem segredos).
#
# Reproduz exatamente a forma do banco do demo: bootstrap.sql (stubs de auth)
# + migracoes canonicas. Diferente de supabase/tests/database/run.sh, este
# script NAO aplica supabase/pilot/provision-pilot-module-gate.sql: o sandbox
# publico roda as migracoes canonicas apenas, entao os campos NIS/Bolsa
# Familia do seed permanecem permitidos.
#
# Prova:
#   1. seed-demo.sql (entidades estaticas) aplica sem erros;
#   2. as sessoes/conteudos/frequencias geradas por attendance-generator.ts
#      aplicam sem erros e reproduzem exatamente o padrao esperado;
#   3. a fonte de certificado gerada por certificate-generator.ts so emite
#      com matricula, sessoes fechadas, presenca P, carga e hash verificaveis;
#   4. seed_demo_validation.sql passa (contagens, relacionamentos, marcadores
#      synthetic-only e caso de alerta < 80%);
#   5. repetibilidade: um segundo reset com a MESMA ancora produz
#      fingerprints md5 identicos nas tabelas-chave.
#
# Uso:
#   bash supabase/seed-demo/verify-sql.sh            (ancora padrao 2026-07-01)
#   bash supabase/seed-demo/verify-sql.sh 2026-08-10 (ancora explicita)
# =============================================================================
set -euo pipefail

ROOT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)
SEED_DIR="$ROOT_DIR/supabase/seed-demo"
MIGRATIONS_DIR="$ROOT_DIR/supabase/migrations"
TESTS_DIR="$ROOT_DIR/supabase/tests/database"
APP_DIR="$ROOT_DIR/app"
ANCHOR_DATE="${1:-2026-07-01}"

for command in initdb pg_ctl psql; do
  if ! command -v "$command" >/dev/null 2>&1; then
    echo "error: $command is required to run the seed validation" >&2
    exit 1
  fi
done

WORK_DIR=$(mktemp -d "${TMPDIR:-/tmp}/educa-seed-test.XXXXXX")
DATA_DIR="$WORK_DIR/data"
SOCKET_DIR="$WORK_DIR/socket"
PORT=${POSTGRES_TEST_PORT:-$((52000 + $$ % 10000))}
SERVER_STARTED=false

cleanup() {
  if [[ "$SERVER_STARTED" == true ]]; then
    pg_ctl -D "$DATA_DIR" -m immediate -w stop >/dev/null
  fi
  rm -rf "$WORK_DIR"
}
trap cleanup EXIT

mkdir -p "$SOCKET_DIR"
initdb -D "$DATA_DIR" -A trust --no-locale --encoding=UTF8 --username=postgres >/dev/null
pg_ctl \
  -D "$DATA_DIR" \
  -l "$WORK_DIR/postgres.log" \
  -o "-F -k '$SOCKET_DIR' -p $PORT" \
  -w start >/dev/null
SERVER_STARTED=true

PSQL=(
  psql
  -X
  -h "$SOCKET_DIR"
  -p "$PORT"
  -U postgres
  -d postgres
  -v ON_ERROR_STOP=1
)

echo "==> Aplicando bootstrap + migracoes canonicas (forma do banco demo)..."
"${PSQL[@]}" -f "$TESTS_DIR/bootstrap.sql" >/dev/null
mapfile -t migrations < <(find "$MIGRATIONS_DIR" -maxdepth 1 -type f -name '*.sql' -print | sort)
for migration in "${migrations[@]}"; do
  echo "    $(basename "$migration")"
  "${PSQL[@]}" -f "$migration" >/dev/null
done
echo "    (replay relatorios_descritivos, como run.sh)"
"${PSQL[@]}" -f "$MIGRATIONS_DIR/20260124133337_create_relatorios_descritivos.sql" >/dev/null

echo "==> Gerando sessoes/frequencias para a ancora $ANCHOR_DATE..."
(cd "$APP_DIR" && pnpm exec tsx "$SEED_DIR/emit-verify.ts" --date "$ANCHOR_DATE") > "$WORK_DIR/attendance.sql"

echo "==> Aplicando seed estatico + frequencia gerada..."
"${PSQL[@]}" -f "$SEED_DIR/seed-demo.sql" >/dev/null
"${PSQL[@]}" -f "$WORK_DIR/attendance.sql" >/dev/null

echo "==> Validacao estrutural (contagens, relacionamentos, marcadores, alerta)..."
"${PSQL[@]}" -v anchor_date="$ANCHOR_DATE" -f "$SEED_DIR/seed_demo_validation.sql" >/dev/null

echo "==> Prova de repetibilidade: segundo reset com a mesma ancora..."
"${PSQL[@]}" -c "TRUNCATE certificados_emitidos, certificado_atividade_sessoes, certificado_atividades, certificado_emissores, frequencia, conteudo_aula, sessoes_aula, aulas_abertas, notas, matriculas, aluno_responsaveis, alunos, responsaveis, disciplinas, turmas, calendario_escolar, configs, audit_logs, audit_trail, audit_sessoes_aula, codigos_inep, educacenso_exports, users, escolas CASCADE;" >/dev/null
"${PSQL[@]}" -f "$SEED_DIR/seed-demo.sql" >/dev/null
"${PSQL[@]}" -f "$WORK_DIR/attendance.sql" >/dev/null

fingerprint() {
  "${PSQL[@]}" -tA -c "SELECT md5(string_agg(md5(t::text), '|' ORDER BY md5(t::text))) FROM $1 t"
}
FP1=$(for t in escolas users turmas matriculas sessoes_aula conteudo_aula frequencia certificado_emissores certificado_atividades certificado_atividade_sessoes certificados_emitidos; do echo "$t $(fingerprint "$t")"; done)
"${PSQL[@]}" -c "TRUNCATE certificados_emitidos, certificado_atividade_sessoes, certificado_atividades, certificado_emissores, frequencia, conteudo_aula, sessoes_aula, aulas_abertas, notas, matriculas, aluno_responsaveis, alunos, responsaveis, disciplinas, turmas, calendario_escolar, configs, audit_logs, audit_trail, audit_sessoes_aula, codigos_inep, educacenso_exports, users, escolas CASCADE;" >/dev/null
"${PSQL[@]}" -f "$SEED_DIR/seed-demo.sql" >/dev/null
"${PSQL[@]}" -f "$WORK_DIR/attendance.sql" >/dev/null
FP2=$(for t in escolas users turmas matriculas sessoes_aula conteudo_aula frequencia certificado_emissores certificado_atividades certificado_atividade_sessoes certificados_emitidos; do echo "$t $(fingerprint "$t")"; done)

if [[ "$FP1" != "$FP2" ]]; then
  echo "FALHOU: fingerprints diferem entre resets com a mesma ancora"
  echo "$FP1"
  echo "$FP2"
  exit 1
fi

echo "OK: fingerprints identicos apos reset repetido"
echo "$FP1" | while read -r line; do echo "    $line"; done
echo ""
echo "Validacao offline do seed demo PASSED (ancora $ANCHOR_DATE)"
