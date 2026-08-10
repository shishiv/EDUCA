BEGIN;

-- Real PostgreSQL receipt for D5. The fixture uses canonical sessoes_aula rows,
-- not the retired aula_id source, and keeps both policy boundaries observable.
CREATE FUNCTION pg_temp.assert_true(condition boolean, message text)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF condition IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'assertion failed: %', message;
  END IF;
END;
$$;

INSERT INTO escolas(id, codigo, nome, tipo) VALUES
  ('96000000-0000-0000-0000-000000000001', 'D5-A', 'Escola D5', 'fundamental');

INSERT INTO users(id, nome, email, tipo_usuario, escola_id, ativo) VALUES
  ('96000000-0000-0000-0000-000000000011', 'Professor D5', 'd5.professor@synthetic.invalid', 'professor', '96000000-0000-0000-0000-000000000001', true);

INSERT INTO turmas(id, nome, serie, turno, ano_letivo, escola_id, professor_id) VALUES
  ('96000000-0000-0000-0000-000000000021', 'Turma D5', '1 ano', 'matutino', 2026,
   '96000000-0000-0000-0000-000000000001', '96000000-0000-0000-0000-000000000011');

INSERT INTO alunos(id, nome_completo, data_nascimento, sexo, escola_id) VALUES
  ('96000000-0000-0000-0000-000000000031', 'Miguel D5', '2018-01-01', 'M',
   '96000000-0000-0000-0000-000000000001'),
  ('96000000-0000-0000-0000-000000000032', 'Aluno Atenção D5', '2018-01-02', 'F',
   '96000000-0000-0000-0000-000000000001');

INSERT INTO matriculas(id, aluno_id, turma_id, ano_letivo, situacao) VALUES
  ('96000000-0000-0000-0000-000000000041', '96000000-0000-0000-0000-000000000031',
   '96000000-0000-0000-0000-000000000021', 2026, 'ativa'),
  ('96000000-0000-0000-0000-000000000042', '96000000-0000-0000-0000-000000000032',
   '96000000-0000-0000-0000-000000000021', 2026, 'ativa');

INSERT INTO sessoes_aula(
  id, turma_id, escola_id, professor_id, data_aula, status, aberta_em, conteudo_programatico
)
SELECT
  ('96000000-0000-0000-0000-' || lpad(day_number::text, 12, '0'))::uuid,
  '96000000-0000-0000-0000-000000000021',
  '96000000-0000-0000-0000-000000000001',
  '96000000-0000-0000-0000-000000000011',
  DATE '2026-08-01' + day_number - 1,
  'ABERTA',
  now(),
  'D5 policy fixture'
FROM generate_series(1, 10) AS days(day_number);

INSERT INTO frequencia(
  id, matricula_id, sessao_id, data_aula, status_presenca, presente, professor_id, marcado_por
)
SELECT
  ('97000000-0000-0000-0000-' || lpad((day_number + student_offset)::text, 12, '0'))::uuid,
  CASE WHEN student_offset = 0
    THEN '96000000-0000-0000-0000-000000000041'::uuid
    ELSE '96000000-0000-0000-0000-000000000042'::uuid
  END,
  ('96000000-0000-0000-0000-' || lpad(day_number::text, 12, '0'))::uuid,
  DATE '1900-01-01',
  CASE
    WHEN student_offset = 0 AND day_number <= 7 THEN 'P'
    WHEN student_offset = 20 AND day_number <= 8 THEN 'P'
    ELSE 'F'
  END,
  false,
  '96000000-0000-0000-0000-000000000011',
  '96000000-0000-0000-0000-000000000011'
FROM generate_series(1, 10) AS days(day_number)
CROSS JOIN (VALUES (0), (20)) AS students(student_offset);

WITH policy AS (
  SELECT 80::numeric AS conformidade, 85::numeric AS atencao
), canonical AS (
  SELECT
    a.nome_completo,
    m.id AS matricula_id,
    count(f.id)::numeric AS total,
    count(f.id) FILTER (WHERE f.presente)::numeric AS presentes
  FROM matriculas m
  JOIN alunos a ON a.id = m.aluno_id
  JOIN frequencia f ON f.matricula_id = m.id
  WHERE f.sessao_id IS NOT NULL
    AND f.status_presenca <> 'NAO_MARCADO'
  GROUP BY a.nome_completo, m.id
), rates AS (
  SELECT
    canonical.*,
    round(100 * canonical.presentes / canonical.total) AS percentual
  FROM canonical
)
SELECT pg_temp.assert_true(
  (SELECT percentual = 70 AND percentual < policy.conformidade
   FROM rates, policy WHERE nome_completo = 'Miguel D5'),
  'Miguel is 70% and below the 80% Bolsa Familia conditionality'
);

WITH policy AS (
  SELECT 80::numeric AS conformidade, 85::numeric AS atencao
), rates AS (
  SELECT
    round(100 * count(f.id) FILTER (WHERE f.presente)::numeric / count(f.id)) AS percentual
  FROM frequencia f
  WHERE f.matricula_id = '96000000-0000-0000-0000-000000000042'
    AND f.sessao_id IS NOT NULL
    AND f.status_presenca <> 'NAO_MARCADO'
)
SELECT pg_temp.assert_true(
  (SELECT percentual = 80 AND percentual >= policy.conformidade AND percentual < policy.atencao
   FROM rates, policy),
  'the 80% case is compliant and in the preventive attention band below 85%'
);

SELECT pg_temp.assert_true(
  (SELECT count(*) = 20 FROM frequencia WHERE sessao_id IS NOT NULL),
  'the policy receipt reads only canonical session-backed rows'
);

ROLLBACK;
