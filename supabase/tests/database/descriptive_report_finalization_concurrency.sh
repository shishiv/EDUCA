#!/usr/bin/env bash
set -euo pipefail

: "${PGHOST:?PGHOST is required}"
: "${PGPORT:?PGPORT is required}"
: "${PGUSER:?PGUSER is required}"
: "${PGDATABASE:?PGDATABASE is required}"

MODE=${1:-guard}
if [[ "$MODE" != guard && "$MODE" != expect-race ]]; then
  echo "error: expected mode 'guard' or 'expect-race'" >&2
  exit 2
fi

SCHOOL_ID='d4000000-0000-4000-8000-000000000201'
TEACHER_ID='d4100000-0000-4000-8000-000000000201'
CLASS_ID='d4200000-0000-4000-8000-000000000201'
STUDENT_LINK_FIRST_ID='d4300000-0000-4000-8000-000000000201'
STUDENT_FINALIZE_FIRST_ID='d4300000-0000-4000-8000-000000000202'
ENROLLMENT_LINK_FIRST_ID='d4400000-0000-4000-8000-000000000201'
ENROLLMENT_FINALIZE_FIRST_ID='d4400000-0000-4000-8000-000000000202'
REPORT_LINK_FIRST_ID='d4500000-0000-4000-8000-000000000201'
REPORT_FINALIZE_FIRST_ID='d4500000-0000-4000-8000-000000000202'
VIVENCIA_LINK_FIRST_ID='d4600000-0000-4000-8000-000000000201'
VIVENCIA_FINALIZE_FIRST_ID='d4600000-0000-4000-8000-000000000202'

psql_args=(psql -X -v ON_ERROR_STOP=1)
TMP_DIR=$(mktemp -d "${TMPDIR:-/tmp}/educa-descriptive-finalization-concurrency.XXXXXX")
HELD_PID=''
HELD_FD=''
HELD_FIFO=''
ONE_PID=''
ONE_LOG=''
ONE_STATUS=''

cleanup_fixture() {
  "${psql_args[@]}" >/dev/null <<SQL
BEGIN;
SET LOCAL ROLE service_role;
DELETE FROM public.relatorios_descritivos_vivencias
WHERE relatorio_id IN ('$REPORT_LINK_FIRST_ID', '$REPORT_FINALIZE_FIRST_ID');
DELETE FROM public.relatorios_descritivos
WHERE id IN ('$REPORT_LINK_FIRST_ID', '$REPORT_FINALIZE_FIRST_ID');
DELETE FROM public.vivencias
WHERE id IN ('$VIVENCIA_LINK_FIRST_ID', '$VIVENCIA_FINALIZE_FIRST_ID');
DELETE FROM public.matriculas
WHERE id IN ('$ENROLLMENT_LINK_FIRST_ID', '$ENROLLMENT_FINALIZE_FIRST_ID');
DELETE FROM public.alunos
WHERE id IN ('$STUDENT_LINK_FIRST_ID', '$STUDENT_FINALIZE_FIRST_ID');
DELETE FROM public.turmas WHERE id = '$CLASS_ID';
COMMIT;
SQL
}

cleanup() {
  set +e
  if [[ -n "$ONE_PID" ]]; then
    kill "$ONE_PID" 2>/dev/null
    wait "$ONE_PID" 2>/dev/null
  fi
  if [[ -n "$HELD_PID" ]]; then
    kill "$HELD_PID" 2>/dev/null
    wait "$HELD_PID" 2>/dev/null
  fi
  if [[ -n "$HELD_FD" ]]; then
    eval "exec ${HELD_FD}>&-"
  fi
  cleanup_fixture
  rm -rf "$TMP_DIR"
}
trap cleanup EXIT

fail() {
  local message=$1
  echo "error: $message" >&2
  for log_file in "$TMP_DIR"/*.log; do
    if [[ -f "$log_file" ]]; then
      echo "--- $(basename "$log_file")" >&2
      cat "$log_file" >&2
    fi
  done
  exit 1
}

activity_count() {
  local app_name=$1
  local predicate=$2
  "${psql_args[@]}" -Atqc "
    SELECT count(*)
    FROM pg_catalog.pg_stat_activity
    WHERE application_name = '$app_name'
      AND ($predicate);
  "
}

wait_for_activity() {
  local app_name=$1
  local predicate=$2
  local expected=$3
  local description=$4
  local attempt
  for ((attempt = 0; attempt < 100; attempt++)); do
    if [[ "$(activity_count "$app_name" "$predicate")" == "$expected" ]]; then
      return 0
    fi
    sleep 0.05
  done
  fail "timed out waiting for $description"
}

open_held_session() {
  local app_name=$1
  local log_file=$2
  HELD_FIFO="$TMP_DIR/$app_name.fifo"
  mkfifo "$HELD_FIFO"
  exec {HELD_FD}<>"$HELD_FIFO"
  PGAPPNAME="$app_name" "${psql_args[@]}" <"$HELD_FIFO" >"$log_file" 2>&1 &
  HELD_PID=$!
}

send_held_sql() {
  cat >&"$HELD_FD"
}

wait_for_held_idle() {
  local app_name=$1
  wait_for_activity "$app_name" "state = 'idle in transaction'" 1 "$app_name to become idle in transaction"
}

release_held_session() {
  printf 'COMMIT;\n\\q\n' >&"$HELD_FD"
  local status=0
  set +e
  wait "$HELD_PID"
  status=$?
  set -e
  eval "exec ${HELD_FD}>&-"
  rm -f "$HELD_FIFO"
  HELD_PID=''
  HELD_FD=''
  HELD_FIFO=''
  [[ "$status" -eq 0 ]] || fail "held PostgreSQL session exited with status $status"
}

start_one_shot() {
  local app_name=$1
  ONE_LOG=$2
  local sql_file="$TMP_DIR/$app_name.sql"
  cat >"$sql_file"
  PGAPPNAME="$app_name" "${psql_args[@]}" -f "$sql_file" >"$ONE_LOG" 2>&1 &
  ONE_PID=$!
}

wait_one_shot() {
  ONE_STATUS=0
  set +e
  wait "$ONE_PID"
  ONE_STATUS=$?
  set -e
  ONE_PID=''
}

wait_for_one_shot_exit() {
  local app_name=$1
  wait_for_activity "$app_name" "true" 0 "$app_name to finish"
}

wait_for_one_shot_lock() {
  local app_name=$1
  wait_for_activity "$app_name" "wait_event_type = 'Lock'" 1 "$app_name to wait on the report row lock"
}

assert_state() {
  local report_id=$1
  local expected_links=$2
  local label=$3
  local state
  state=$("${psql_args[@]}" -Atqc "
    SELECT r.status || ':' || count(source.vivencia_id)
    FROM public.relatorios_descritivos AS r
    LEFT JOIN public.relatorios_descritivos_vivencias AS source
      ON source.relatorio_id = r.id
    WHERE r.id = '$report_id'
    GROUP BY r.status;
  ")
  [[ "$state" == "finalizado:$expected_links" ]] || fail "$label produced state '$state'"
}

prepare_fixture() {
  cleanup_fixture
  "${psql_args[@]}" >/dev/null <<SQL
BEGIN;
SET LOCAL ROLE service_role;
INSERT INTO public.escolas(id, codigo, nome, tipo, ativo)
VALUES ('$SCHOOL_ID', 'C04-CONCURRENCY', 'Escola C04 concorrência', 'creche', true)
ON CONFLICT (id) DO UPDATE
SET codigo = EXCLUDED.codigo, nome = EXCLUDED.nome, tipo = EXCLUDED.tipo, ativo = EXCLUDED.ativo;
RESET ROLE;
INSERT INTO public.anos_letivos(escola_id,ano,data_inicio,data_fim,periodos)
VALUES ('$SCHOOL_ID',2026,'2026-01-01','2026-12-31',
 '[{"chave":"primeiro","nome":"Período sintético concorrência","data_inicio":"2026-01-01","data_fim":"2026-12-31"}]')
ON CONFLICT (escola_id,ano) DO UPDATE SET periodos=EXCLUDED.periodos;
SET LOCAL ROLE service_role;
INSERT INTO public.users(id, nome, email, tipo_usuario, escola_id, ativo)
VALUES ('$TEACHER_ID', 'Professora C04 concorrência', 'professora.concorrencia.c04@synthetic.invalid', 'professor', '$SCHOOL_ID', true)
ON CONFLICT (id) DO UPDATE
SET nome = EXCLUDED.nome, email = EXCLUDED.email, tipo_usuario = EXCLUDED.tipo_usuario,
    escola_id = EXCLUDED.escola_id, ativo = EXCLUDED.ativo;
INSERT INTO public.turmas(id, nome, serie, turno, ano_letivo, escola_id, professor_id, ativo)
VALUES ('$CLASS_ID', 'Turma C04 concorrência', 'Creche', 'matutino', 2026, '$SCHOOL_ID', '$TEACHER_ID', true);
INSERT INTO public.alunos(id, escola_id, nome_completo, data_nascimento, sexo, ativo)
VALUES
  ('$STUDENT_LINK_FIRST_ID', '$SCHOOL_ID', 'Criança vínculo primeiro', DATE '2021-02-01', 'F', true),
  ('$STUDENT_FINALIZE_FIRST_ID', '$SCHOOL_ID', 'Criança finalização primeiro', DATE '2021-02-02', 'M', true);
INSERT INTO public.matriculas(id, aluno_id, turma_id, ano_letivo, situacao)
VALUES
  ('$ENROLLMENT_LINK_FIRST_ID', '$STUDENT_LINK_FIRST_ID', '$CLASS_ID', 2026, 'ativa'),
  ('$ENROLLMENT_FINALIZE_FIRST_ID', '$STUDENT_FINALIZE_FIRST_ID', '$CLASS_ID', 2026, 'ativa');
INSERT INTO public.vivencias(
  id, escola_id, aluno_id, matricula_id, turma_id, professor_id,
  data_vivencia, campos_experiencia, descricao, created_by, updated_by
)
VALUES
  (
    '$VIVENCIA_LINK_FIRST_ID', '$SCHOOL_ID', '$STUDENT_LINK_FIRST_ID',
    '$ENROLLMENT_LINK_FIRST_ID', '$CLASS_ID', '$TEACHER_ID', DATE '2026-09-01',
    ARRAY['eu'], 'Vivência sintética para vínculo iniciado antes da finalização.',
    '$TEACHER_ID', '$TEACHER_ID'
  ),
  (
    '$VIVENCIA_FINALIZE_FIRST_ID', '$SCHOOL_ID', '$STUDENT_FINALIZE_FIRST_ID',
    '$ENROLLMENT_FINALIZE_FIRST_ID', '$CLASS_ID', '$TEACHER_ID', DATE '2026-09-01',
    ARRAY['corpo'], 'Vivência sintética para finalização iniciada antes do vínculo.',
    '$TEACHER_ID', '$TEACHER_ID'
  );
INSERT INTO public.relatorios_descritivos(
  id, matricula_id, turma_id, professor_id, ano_letivo, semestre, status,
  campo_eu_outro_nos, campo_corpo_gestos, campo_tracos_sons,
  campo_escuta_fala, campo_espacos_tempos, created_by
)
VALUES
  (
    '$REPORT_LINK_FIRST_ID', '$ENROLLMENT_LINK_FIRST_ID', '$CLASS_ID', '$TEACHER_ID',
    2026, 'primeiro', 'rascunho', repeat('A', 50), repeat('B', 50), repeat('C', 50),
    repeat('D', 50), repeat('E', 50), '$TEACHER_ID'
  ),
  (
    '$REPORT_FINALIZE_FIRST_ID', '$ENROLLMENT_FINALIZE_FIRST_ID', '$CLASS_ID', '$TEACHER_ID',
    2026, 'primeiro', 'rascunho', repeat('A', 50), repeat('B', 50), repeat('C', 50),
    repeat('D', 50), repeat('E', 50), '$TEACHER_ID'
  );
COMMIT;
SQL
}

run_link_first() {
  local held_app='c04_link_first_held'
  local finalize_app='c04_link_first_finalize'
  open_held_session "$held_app" "$TMP_DIR/link-first-held.log"
  send_held_sql <<SQL
BEGIN;
SET LOCAL statement_timeout = '15s';
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '$TEACHER_ID', true);
INSERT INTO public.relatorios_descritivos_vivencias(
  relatorio_id, vivencia_id, escola_id, created_by
) VALUES (
  '$REPORT_LINK_FIRST_ID', '$VIVENCIA_LINK_FIRST_ID', '$SCHOOL_ID', '$TEACHER_ID'
);
SQL
  wait_for_held_idle "$held_app"

  start_one_shot "$finalize_app" "$TMP_DIR/link-first-finalize.log" <<SQL
BEGIN;
SET LOCAL statement_timeout = '15s';
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '$TEACHER_ID', true);
UPDATE public.relatorios_descritivos
SET status = 'finalizado'
WHERE id = '$REPORT_LINK_FIRST_ID';
COMMIT;
SQL

  if [[ "$MODE" == expect-race ]]; then
    wait_for_one_shot_exit "$finalize_app"
    wait_one_shot
    [[ "$ONE_STATUS" -eq 0 ]] || fail "link-first finalization failed during race reproduction"
    release_held_session
    assert_state "$REPORT_LINK_FIRST_ID" 1 'link-first race reproduction'
    echo 'C04_CONCURRENCY_RED_LINK_FIRST: finalization committed before the open source-link transaction'
    return
  fi

  wait_for_one_shot_lock "$finalize_app"
  release_held_session
  wait_one_shot
  [[ "$ONE_STATUS" -eq 0 ]] || fail "link-first finalization failed after source-link commit"
  assert_state "$REPORT_LINK_FIRST_ID" 1 'link-first guard'
  echo 'C04_CONCURRENCY_GREEN_LINK_FIRST: source link committed before waiting finalization'
}

run_finalize_first() {
  local held_app='c04_finalize_first_held'
  local link_app='c04_finalize_first_link'
  open_held_session "$held_app" "$TMP_DIR/finalize-first-held.log"
  send_held_sql <<SQL
BEGIN;
SET LOCAL statement_timeout = '15s';
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '$TEACHER_ID', true);
UPDATE public.relatorios_descritivos
SET status = 'finalizado'
WHERE id = '$REPORT_FINALIZE_FIRST_ID';
SQL
  wait_for_held_idle "$held_app"

  start_one_shot "$link_app" "$TMP_DIR/finalize-first-link.log" <<SQL
BEGIN;
SET LOCAL statement_timeout = '15s';
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '$TEACHER_ID', true);
INSERT INTO public.relatorios_descritivos_vivencias(
  relatorio_id, vivencia_id, escola_id, created_by
) VALUES (
  '$REPORT_FINALIZE_FIRST_ID', '$VIVENCIA_FINALIZE_FIRST_ID', '$SCHOOL_ID', '$TEACHER_ID'
);
COMMIT;
SQL

  if [[ "$MODE" == expect-race ]]; then
    wait_for_one_shot_exit "$link_app"
    wait_one_shot
    [[ "$ONE_STATUS" -eq 0 ]] || fail "finalize-first source link failed during race reproduction"
    release_held_session
    assert_state "$REPORT_FINALIZE_FIRST_ID" 1 'finalize-first race reproduction'
    echo 'C04_CONCURRENCY_RED_FINALIZE_FIRST: source link committed while finalization remained open'
    return
  fi

  wait_for_one_shot_lock "$link_app"
  release_held_session
  wait_one_shot
  [[ "$ONE_STATUS" -ne 0 ]] || fail "finalize-first source link unexpectedly committed"
  grep -q 'DESCRIPTIVE_REPORT_FINALIZED_SOURCES_IMMUTABLE' "$ONE_LOG" \
    || fail "finalize-first source link failed without the finalized-source guard"
  assert_state "$REPORT_FINALIZE_FIRST_ID" 0 'finalize-first guard'
  echo 'C04_CONCURRENCY_GREEN_FINALIZE_FIRST: source link waited and was rejected after finalization'
}

run_source_edit_during_capture() {
  local held_app='narrative_source_edit_held'
  local finalize_app='narrative_source_edit_finalize'
  prepare_fixture
  open_held_session "$held_app" "$TMP_DIR/source-edit-held.log"
  send_held_sql <<SQL
BEGIN;
SET LOCAL statement_timeout = '15s';
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '$TEACHER_ID', true);
UPDATE public.vivencias SET descricao = 'Fonte sintética editada em outra transação durante a captura.'
WHERE id = '$VIVENCIA_LINK_FIRST_ID';
SQL
  wait_for_held_idle "$held_app"
  start_one_shot "$finalize_app" "$TMP_DIR/source-edit-finalize.log" <<SQL
BEGIN;
SET LOCAL statement_timeout = '15s';
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '$TEACHER_ID', true);
UPDATE public.relatorios_descritivos SET status='finalizado' WHERE id='$REPORT_LINK_FIRST_ID';
COMMIT;
SQL
  wait_for_one_shot_exit "$finalize_app"
  wait_one_shot
  [[ "$ONE_STATUS" -eq 0 ]] || fail 'concurrent snapshot finalization failed'
  release_held_session
  local verified
  verified=$("${psql_args[@]}" -Atqc "SELECT
    r.fontes_snapshot->'fontes'->0->>'descricao' = 'Vivência sintética para vínculo iniciado antes da finalização.'
    AND v.descricao = 'Fonte sintética editada em outra transação durante a captura.'
    AND r.fontes_snapshot->'fontes'->0->>'id' = v.id::text
    FROM public.relatorios_descritivos r JOIN public.vivencias v ON v.id='$VIVENCIA_LINK_FIRST_ID'
    WHERE r.id='$REPORT_LINK_FIRST_ID';")
  [[ "$verified" == t ]] || fail 'snapshot mixed an uncommitted source version with the finalization'
  echo 'NARRATIVE_CONCURRENT_CAPTURE_OK: committed source version captured atomically; later source commit did not rewrite it'
}

prepare_fixture
run_link_first
run_finalize_first
if [[ "$MODE" == guard ]]; then run_source_edit_during_capture; fi

if [[ "$MODE" == expect-race ]]; then
  echo 'C04_DESCRIPTIVE_REPORT_CONCURRENCY_RED_REPRODUCED'
else
  echo 'C04_DESCRIPTIVE_REPORT_CONCURRENCY_GUARD_OK'
fi
