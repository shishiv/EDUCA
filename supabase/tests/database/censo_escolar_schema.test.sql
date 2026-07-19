BEGIN;

CREATE FUNCTION pg_temp.assert_true(condition boolean, message text)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  IF condition IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'assertion failed: %', message;
  END IF;
END;
$$;

CREATE FUNCTION pg_temp.assert_check_violation(statement text, expected_constraint text)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  actual_constraint text;
BEGIN
  BEGIN
    EXECUTE statement;
  EXCEPTION
    WHEN check_violation THEN
      GET STACKED DIAGNOSTICS actual_constraint = CONSTRAINT_NAME;
      IF actual_constraint IS DISTINCT FROM expected_constraint THEN
        RAISE EXCEPTION 'expected constraint %, got %', expected_constraint, actual_constraint;
      END IF;
      RETURN;
  END;

  RAISE EXCEPTION 'expected constraint % to reject statement', expected_constraint;
END;
$$;

SELECT pg_temp.assert_true(
  EXISTS (
    SELECT 1 FROM public.escolas
    WHERE id = '00000000-0000-0000-0000-000000000021'
  ),
  'migration preserves the existing escola row'
);
SELECT pg_temp.assert_true(
  EXISTS (
    SELECT 1 FROM public.alunos
    WHERE id = '00000000-0000-0000-0000-000000000022'
  ),
  'migration preserves the existing aluno row'
);
SELECT pg_temp.assert_true(
  EXISTS (
    SELECT 1 FROM public.turmas
    WHERE id = '00000000-0000-0000-0000-000000000023'
  ),
  'migration preserves the existing turma row'
);

SELECT pg_temp.assert_true(
  (SELECT zona_residencial = 'urbana' FROM public.alunos
   WHERE id = '00000000-0000-0000-0000-000000000022'),
  'alunos.zona_residencial defaults to urbana'
);
SELECT pg_temp.assert_true(
  (SELECT transporte_escolar = false FROM public.alunos
   WHERE id = '00000000-0000-0000-0000-000000000022'),
  'alunos.transporte_escolar defaults to false'
);
SELECT pg_temp.assert_true(
  (SELECT cor_raca IS NULL AND tipo_deficiencia IS NULL FROM public.alunos
   WHERE id = '00000000-0000-0000-0000-000000000022'),
  'nullable aluno fields do not guess legacy values'
);
SELECT pg_temp.assert_true(
  (SELECT tipo_mediacao = 'presencial' FROM public.turmas
   WHERE id = '00000000-0000-0000-0000-000000000023'),
  'turmas.tipo_mediacao defaults to presencial'
);
SELECT pg_temp.assert_true(
  (SELECT tempo_integral = false FROM public.turmas
   WHERE id = '00000000-0000-0000-0000-000000000023'),
  'turmas.tempo_integral defaults to false'
);
SELECT pg_temp.assert_true(
  (SELECT etapa_ensino IS NULL FROM public.turmas
   WHERE id = '00000000-0000-0000-0000-000000000023'),
  'turmas.etapa_ensino does not guess a legacy value'
);
SELECT pg_temp.assert_true(
  (SELECT
    in_biblioteca = false
    AND in_laboratorio_informatica = false
    AND in_internet = false
    AND in_acessibilidade = false
    AND in_quadra_esportes = false
    AND in_refeitorio = false
   FROM public.escolas
   WHERE id = '00000000-0000-0000-0000-000000000021'),
  'escola infrastructure fields default to false'
);
SELECT pg_temp.assert_true(
  (SELECT localizacao_diferenciada IS NULL FROM public.escolas
   WHERE id = '00000000-0000-0000-0000-000000000021'),
  'escolas.localizacao_diferenciada does not guess a legacy value'
);

SELECT pg_temp.assert_check_violation(
  $$INSERT INTO public.alunos (nome_completo, data_nascimento, sexo, cor_raca)
    VALUES ('Cor invalida', DATE '2015-01-01', 'F', 'azul')$$,
  'alunos_cor_raca_check'
);
SELECT pg_temp.assert_check_violation(
  $$INSERT INTO public.alunos (nome_completo, data_nascimento, sexo, zona_residencial)
    VALUES ('Zona invalida', DATE '2015-01-01', 'F', 'maritima')$$,
  'alunos_zona_residencial_check'
);
SELECT pg_temp.assert_check_violation(
  $$INSERT INTO public.turmas (nome, serie, turno, ano_letivo, escola_id, etapa_ensino)
    VALUES ('Etapa invalida', '1 ano', 'matutino', 2026,
      '00000000-0000-0000-0000-000000000021', 'SUPERIOR')$$,
  'turmas_etapa_ensino_check'
);
SELECT pg_temp.assert_check_violation(
  $$INSERT INTO public.turmas (nome, serie, turno, ano_letivo, escola_id, tipo_mediacao)
    VALUES ('Mediacao invalida', '1 ano', 'matutino', 2026,
      '00000000-0000-0000-0000-000000000021', 'hibrido')$$,
  'turmas_tipo_mediacao_check'
);
SELECT pg_temp.assert_check_violation(
  $$INSERT INTO public.escolas (codigo, nome, tipo, localizacao_diferenciada)
    VALUES ('TESTE-CENSO-INVALIDO', 'Localizacao invalida', 'municipal', 'ribeirinha')$$,
  'escolas_localizacao_diferenciada_check'
);

ROLLBACK;
