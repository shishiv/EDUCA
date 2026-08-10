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

SET LOCAL ROLE service_role;

SELECT pg_temp.assert_true(
  (SELECT count(*) = 1 FROM pg_trigger
   WHERE tgrelid = 'public.matriculas'::regclass
     AND tgname = 'pilot_lock_matricula_capacity'
     AND NOT tgisinternal),
  'capacity row lock trigger is installed'
);
SELECT pg_temp.assert_true(
  (SELECT count(*) = 2 FROM pg_trigger
   WHERE tgrelid = 'public.matriculas'::regclass
     AND tgname IN ('pilot_validate_matricula_capacity_insert', 'pilot_validate_matricula_capacity_update')
     AND NOT tgisinternal),
  'capacity statement validation triggers are installed'
);

INSERT INTO escolas(id, codigo, nome, tipo, ativo)
VALUES (
  '91000000-0000-0000-0000-000000000001',
  'CAP-TEST',
  'Escola Capacity Test',
  'fundamental',
  true
);
INSERT INTO users(id, nome, email, tipo_usuario, escola_id, ativo)
VALUES (
  '91000000-0000-0000-0000-000000000011',
  'Diretor Capacity Test',
  'director.capacity.test@synthetic.invalid',
  'diretor',
  '91000000-0000-0000-0000-000000000001',
  true
);
UPDATE escolas
SET diretor_id = '91000000-0000-0000-0000-000000000011'
WHERE id = '91000000-0000-0000-0000-000000000001';

INSERT INTO turmas(id, nome, serie, turno, ano_letivo, capacidade, escola_id, professor_id, ativo)
VALUES
  ('91000000-0000-0000-0000-000000000021', 'Capacity Class One', '1 ano', 'matutino', 2026, 1, '91000000-0000-0000-0000-000000000001', NULL, true),
  ('91000000-0000-0000-0000-000000000022', 'Capacity Class Two', '1 ano', 'vespertino', 2026, 1, '91000000-0000-0000-0000-000000000001', NULL, true);
INSERT INTO alunos(id, nome_completo, data_nascimento, sexo, escola_id, ativo)
VALUES
  ('91000000-0000-0000-0000-000000000031', 'Capacity Student One', '2018-01-01', 'M', '91000000-0000-0000-0000-000000000001', true),
  ('91000000-0000-0000-0000-000000000032', 'Capacity Student Two', '2018-01-02', 'F', '91000000-0000-0000-0000-000000000001', true),
  ('91000000-0000-0000-0000-000000000033', 'Capacity Student Three', '2018-01-03', 'M', '91000000-0000-0000-0000-000000000001', true),
  ('91000000-0000-0000-0000-000000000034', 'Capacity Student Four', '2018-01-04', 'F', '91000000-0000-0000-0000-000000000001', true);

INSERT INTO matriculas(id, aluno_id, turma_id, ano_letivo, situacao)
VALUES (
  '91000000-0000-0000-0000-000000000041',
  '91000000-0000-0000-0000-000000000031',
  '91000000-0000-0000-0000-000000000021',
  2026,
  'ativa'
);

DO $$
BEGIN
  BEGIN
    INSERT INTO matriculas(id, aluno_id, turma_id, ano_letivo, situacao)
    VALUES (
      '91000000-0000-0000-0000-000000000042',
      '91000000-0000-0000-0000-000000000032',
      '91000000-0000-0000-0000-000000000021',
      2026,
      'ativa'
    );
    RAISE EXCEPTION 'capacity guard accepted a concurrent-boundary overflow';
  EXCEPTION WHEN check_violation THEN
    IF position('PILOT_CAPACITY_EXCEEDED' IN SQLERRM) = 0 THEN
      RAISE;
    END IF;
  END;
END;
$$;
SELECT pg_temp.assert_true(
  (SELECT count(*) = 1 FROM matriculas WHERE turma_id = '91000000-0000-0000-0000-000000000021' AND situacao = 'ativa'),
  'single-row overflow is rejected'
);

DO $$
BEGIN
  BEGIN
    INSERT INTO matriculas(id, aluno_id, turma_id, ano_letivo, situacao)
    VALUES
      ('91000000-0000-0000-0000-000000000043', '91000000-0000-0000-0000-000000000033', '91000000-0000-0000-0000-000000000022', 2026, 'ativa'),
      ('91000000-0000-0000-0000-000000000044', '91000000-0000-0000-0000-000000000034', '91000000-0000-0000-0000-000000000022', 2026, 'ativa');
    RAISE EXCEPTION 'capacity guard accepted a multi-row overflow';
  EXCEPTION WHEN check_violation THEN
    IF position('PILOT_CAPACITY_EXCEEDED' IN SQLERRM) = 0 THEN
      RAISE;
    END IF;
  END;
END;
$$;
SELECT pg_temp.assert_true(
  (SELECT count(*) = 0 FROM matriculas WHERE turma_id = '91000000-0000-0000-0000-000000000022'),
  'multi-row overflow rolls back atomically'
);

INSERT INTO matriculas(id, aluno_id, turma_id, ano_letivo, situacao)
VALUES
  (
    '91000000-0000-0000-0000-000000000046',
    '91000000-0000-0000-0000-000000000034',
    '91000000-0000-0000-0000-000000000022',
    2026,
    'ativa'
  ),
  (
    '91000000-0000-0000-0000-000000000045',
    '91000000-0000-0000-0000-000000000033',
    '91000000-0000-0000-0000-000000000022',
    2026,
    'cancelada'
  );
DO $$
BEGIN
  BEGIN
    UPDATE matriculas SET situacao = 'ativa'
    WHERE id = '91000000-0000-0000-0000-000000000045';
    RAISE EXCEPTION 'capacity guard accepted an inactive-to-active overflow';
  EXCEPTION WHEN check_violation THEN
    IF position('PILOT_CAPACITY_EXCEEDED' IN SQLERRM) = 0 THEN
      RAISE;
    END IF;
  END;
END;
$$;
SELECT pg_temp.assert_true(
  (SELECT situacao = 'cancelada' FROM matriculas WHERE id = '91000000-0000-0000-0000-000000000045'),
  'inactive-to-active overflow is rejected'
);

RESET ROLE;
ROLLBACK;
