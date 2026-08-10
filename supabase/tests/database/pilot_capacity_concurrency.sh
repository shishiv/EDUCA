#!/usr/bin/env bash
set -euo pipefail

: "${PGHOST:?PGHOST is required}"
: "${PGPORT:?PGPORT is required}"
: "${PGUSER:?PGUSER is required}"
: "${PGDATABASE:?PGDATABASE is required}"

CLASS_ID='92000000-0000-0000-0000-000000000011'
SCHOOL_ID='92000000-0000-0000-0000-000000000001'
STUDENT_ONE_ID='92000000-0000-0000-0000-000000000021'
STUDENT_TWO_ID='92000000-0000-0000-0000-000000000022'
ENROLLMENT_PREFIX='93000000-0000-0000-0000-'

psql_args=(psql -X -v ON_ERROR_STOP=1)

prepare_fixture() {
  "${psql_args[@]}" <<SQL >/dev/null
BEGIN;
SET LOCAL ROLE service_role;
INSERT INTO public.escolas(id, codigo, nome, tipo, ativo)
VALUES ('$SCHOOL_ID', 'CAP-CONCURRENCY', 'Capacity Concurrency School', 'fundamental', true)
ON CONFLICT (id) DO UPDATE SET ativo = EXCLUDED.ativo;
INSERT INTO public.turmas(id, nome, serie, turno, ano_letivo, capacidade, escola_id, ativo)
VALUES ('$CLASS_ID', 'Capacity Concurrency Class', '1 ano', 'matutino', 2026, 1, '$SCHOOL_ID', true)
ON CONFLICT (id) DO UPDATE SET capacidade = EXCLUDED.capacidade, escola_id = EXCLUDED.escola_id, ativo = EXCLUDED.ativo;
INSERT INTO public.alunos(id, nome_completo, data_nascimento, sexo, escola_id, ativo)
VALUES
  ('$STUDENT_ONE_ID', 'Capacity Concurrency Student One', '2018-01-01', 'M', '$SCHOOL_ID', true),
  ('$STUDENT_TWO_ID', 'Capacity Concurrency Student Two', '2018-01-02', 'F', '$SCHOOL_ID', true)
ON CONFLICT (id) DO UPDATE SET escola_id = EXCLUDED.escola_id, ativo = EXCLUDED.ativo;
COMMIT;
SQL
}

clear_attempts() {
  "${psql_args[@]}" <<SQL >/dev/null
BEGIN;
SET LOCAL ROLE service_role;
DELETE FROM public.matriculas
WHERE id IN ('${ENROLLMENT_PREFIX}000000000001', '${ENROLLMENT_PREFIX}000000000002');
COMMIT;
SQL
}

run_attempt() {
  local client_id=$1
  local student_id=$STUDENT_ONE_ID
  local enrollment_id="${ENROLLMENT_PREFIX}000000000001"
  if [[ "$client_id" == 2 ]]; then
    student_id=$STUDENT_TWO_ID
    enrollment_id="${ENROLLMENT_PREFIX}000000000002"
  fi

  "${psql_args[@]}" >"$TMP_DIR/attempt-$client_id.log" 2>&1 <<SQL
BEGIN;
SET LOCAL ROLE service_role;
INSERT INTO public.matriculas(id, aluno_id, turma_id, ano_letivo, situacao, observacoes)
VALUES ('$enrollment_id', '$student_id', '$CLASS_ID', 2026, 'ativa', 'capacity concurrency attempt');
COMMIT;
SQL
}

run_attempts() {
  local expect_overflow=$1
  clear_attempts

  run_attempt 1 &
  local first_pid=$!
  run_attempt 2 &
  local second_pid=$!

  local first_status=0
  local second_status=0
  set +e
  wait "$first_pid"
  first_status=$?
  wait "$second_pid"
  second_status=$?
  set -e

  local active_count
  active_count=$("${psql_args[@]}" -Atqc "SELECT count(*) FROM public.matriculas WHERE turma_id = '$CLASS_ID' AND situacao = 'ativa';")
  local capacity_errors
  capacity_errors=$({ grep -h -c 'PILOT_CAPACITY_EXCEEDED' "$TMP_DIR"/attempt-*.log 2>/dev/null || true; } | awk '{ total += $1 } END { print total + 0 }')

  echo "CAPACITY_CONCURRENCY_RECEIPT: expect_overflow=$expect_overflow statuses=$first_status,$second_status active_enrollments=$active_count capacity_errors=$capacity_errors"

  if [[ "$expect_overflow" == true ]]; then
    [[ "$first_status" -eq 0 && "$second_status" -eq 0 && "$active_count" -eq 2 && "$capacity_errors" -eq 0 ]]
    return
  fi

  [[ "$active_count" -eq 1 && "$capacity_errors" -eq 1 && ( "$first_status" -ne 0 || "$second_status" -ne 0 ) ]]
}

TMP_DIR=$(mktemp -d "${TMPDIR:-/tmp}/educa-capacity-concurrency.XXXXXX")
trap 'rm -rf "$TMP_DIR"' EXIT

prepare_fixture
if [[ "${1:-guard}" == 'expect-overflow' ]]; then
  run_attempts true
  echo 'CAPACITY_GUARD_BYPASS_RED: concurrent enrollment attempts overflowed the class'
else
  run_attempts false
  echo 'CAPACITY_GUARD_GREEN: concurrent enrollment attempts kept one active row'
fi
