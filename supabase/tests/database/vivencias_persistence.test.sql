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

INSERT INTO public.escolas(id, codigo, nome, tipo, ativo)
VALUES
  ('a1000000-0000-0000-0000-000000000001', 'VIV-A', 'Escola Vivências A', 'creche', true),
  ('a1000000-0000-0000-0000-000000000002', 'VIV-B', 'Escola Vivências B', 'creche', true);

INSERT INTO public.users(id, nome, email, tipo_usuario, escola_id, ativo)
VALUES
  ('a1100000-0000-0000-0000-000000000001', 'Professor Vivências A', 'professor.vivencias.a@synthetic.invalid', 'professor', 'a1000000-0000-0000-0000-000000000001', true),
  ('a1100000-0000-0000-0000-000000000002', 'Professor Vivências B', 'professor.vivencias.b@synthetic.invalid', 'professor', 'a1000000-0000-0000-0000-000000000002', true),
  ('a1100000-0000-0000-0000-000000000003', 'Diretor Vivências A', 'diretor.vivencias.a@synthetic.invalid', 'diretor', 'a1000000-0000-0000-0000-000000000001', true),
  ('a1100000-0000-0000-0000-000000000004', 'Diretor Vivências B', 'diretor.vivencias.b@synthetic.invalid', 'diretor', 'a1000000-0000-0000-0000-000000000002', true),
  ('a1100000-0000-0000-0000-000000000005', 'Secretaria Vivências', 'secretaria.vivencias@synthetic.invalid', 'secretario', NULL, true);

INSERT INTO public.turmas(id, nome, serie, turno, ano_letivo, escola_id, professor_id, ativo)
VALUES
  ('a1200000-0000-0000-0000-000000000001', 'Turma Vivências A', 'Creche', 'matutino', 2026, 'a1000000-0000-0000-0000-000000000001', 'a1100000-0000-0000-0000-000000000001', true),
  ('a1200000-0000-0000-0000-000000000002', 'Turma Vivências B', 'Creche', 'matutino', 2026, 'a1000000-0000-0000-0000-000000000002', 'a1100000-0000-0000-0000-000000000002', true);

INSERT INTO public.alunos(id, escola_id, nome_completo, data_nascimento, sexo, ativo)
VALUES
  ('a1300000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', 'Criança Vivências A', DATE '2020-01-01', 'F', true),
  ('a1300000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000002', 'Criança Vivências B', DATE '2020-01-01', 'M', true);

INSERT INTO public.matriculas(id, aluno_id, turma_id, ano_letivo, situacao)
VALUES
  ('a1400000-0000-0000-0000-000000000001', 'a1300000-0000-0000-0000-000000000001', 'a1200000-0000-0000-0000-000000000001', 2026, 'ativa'),
  ('a1400000-0000-0000-0000-000000000002', 'a1300000-0000-0000-0000-000000000002', 'a1200000-0000-0000-0000-000000000002', 2026, 'ativa');

INSERT INTO public.vivencias(
  id, escola_id, aluno_id, matricula_id, turma_id, professor_id,
  data_vivencia, campos_experiencia, descricao, observacoes,
  created_by, updated_by
)
VALUES (
  'a1500000-0000-0000-0000-000000000001',
  'a1000000-0000-0000-0000-000000000001',
  'a1300000-0000-0000-0000-000000000001',
  'a1400000-0000-0000-0000-000000000001',
  'a1200000-0000-0000-0000-000000000001',
  'a1100000-0000-0000-0000-000000000001',
  DATE '2026-08-20',
  ARRAY['eu', 'corpo'],
  'A criança explorou movimentos e combinou gestos com os colegas.',
  'Registro sintético de prova.',
  'a1100000-0000-0000-0000-000000000001',
  'a1100000-0000-0000-0000-000000000001'
);

SELECT pg_temp.assert_true(
  (SELECT count(*) = 2 FROM public.vivencias_campos_experiencia WHERE vivencia_id = 'a1500000-0000-0000-0000-000000000001'),
  'the five-field link table mirrors every selected Campo'
);
SELECT pg_temp.assert_true(
  (SELECT count(*) >= 1 FROM public.audit_trail WHERE tabela = 'vivencias' AND registro_id = 'a1500000-0000-0000-0000-000000000001'),
  'vivencia mutations enter the canonical audit trail'
);

INSERT INTO public.relatorios_descritivos(
  id, matricula_id, turma_id, professor_id, ano_letivo, semestre, status, created_by
)
VALUES (
  'a1600000-0000-0000-0000-000000000001',
  'a1400000-0000-0000-0000-000000000001',
  'a1200000-0000-0000-0000-000000000001',
  'a1100000-0000-0000-0000-000000000001',
  2026, 'primeiro', 'rascunho', 'a1100000-0000-0000-0000-000000000001'
);

INSERT INTO public.relatorios_descritivos_vivencias(
  relatorio_id, vivencia_id, escola_id, created_by
)
VALUES (
  'a1600000-0000-0000-0000-000000000001',
  'a1500000-0000-0000-0000-000000000001',
  'a1000000-0000-0000-0000-000000000001',
  'a1100000-0000-0000-0000-000000000001'
);

SELECT pg_temp.assert_true(
  (SELECT count(*) = 1 FROM public.relatorios_descritivos_vivencias WHERE relatorio_id = 'a1600000-0000-0000-0000-000000000001'),
  'reports have explicit vivencia source relationships'
);

DO $$
BEGIN
  BEGIN
    INSERT INTO public.vivencias(
      escola_id, aluno_id, matricula_id, turma_id, professor_id,
      data_vivencia, campos_experiencia, descricao, created_by, updated_by
    ) VALUES (
      'a1000000-0000-0000-0000-000000000002',
      'a1300000-0000-0000-0000-000000000001',
      'a1400000-0000-0000-0000-000000000001',
      'a1200000-0000-0000-0000-000000000001',
      'a1100000-0000-0000-0000-000000000001',
      DATE '2026-08-20', ARRAY['eu'],
      'Este registro deve falhar por escopo de escola.',
      'a1100000-0000-0000-0000-000000000001',
      'a1100000-0000-0000-0000-000000000001'
    );
    RAISE EXCEPTION 'vivencia scope mismatch was accepted';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM NOT LIKE 'VIVENCIA_SCOPE_MISMATCH%' THEN
      RAISE;
    END IF;
  END;
END;
$$;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', 'a1100000-0000-0000-0000-000000000001', true);

SELECT pg_temp.assert_true(
  (SELECT count(*) = 1 FROM public.vivencias),
  'teacher reads only the titular class vivencias'
);

INSERT INTO public.vivencias(
  id, escola_id, aluno_id, matricula_id, turma_id, professor_id,
  data_vivencia, campos_experiencia, descricao, created_by, updated_by
)
VALUES (
  'a1500000-0000-0000-0000-000000000002',
  'a1000000-0000-0000-0000-000000000001',
  'a1300000-0000-0000-0000-000000000001',
  'a1400000-0000-0000-0000-000000000001',
  'a1200000-0000-0000-0000-000000000001',
  'a1100000-0000-0000-0000-000000000001',
  DATE '2026-08-21', ARRAY['escuta'],
  'A criança narrou uma história e escutou diferentes hipóteses.',
  'a1100000-0000-0000-0000-000000000001',
  'a1100000-0000-0000-0000-000000000001'
);

UPDATE public.vivencias
SET campos_experiencia = ARRAY['escuta', 'tracos'],
    updated_by = 'a1100000-0000-0000-0000-000000000001'
WHERE id = 'a1500000-0000-0000-0000-000000000002';

SELECT pg_temp.assert_true(
  (SELECT count(*) = 2 FROM public.vivencias_campos_experiencia WHERE vivencia_id = 'a1500000-0000-0000-0000-000000000002'),
  'teacher updates keep normalized Campo links in sync'
);

DO $$
BEGIN
  BEGIN
    INSERT INTO public.vivencias(
      escola_id, aluno_id, matricula_id, turma_id, professor_id,
      data_vivencia, campos_experiencia, descricao, created_by, updated_by
    ) VALUES (
      'a1000000-0000-0000-0000-000000000002',
      'a1300000-0000-0000-0000-000000000002',
      'a1400000-0000-0000-0000-000000000002',
      'a1200000-0000-0000-0000-000000000002',
      'a1100000-0000-0000-0000-000000000002',
      DATE '2026-08-21', ARRAY['eu'],
      'O professor não pode escrever em outra escola.',
      'a1100000-0000-0000-0000-000000000001',
      'a1100000-0000-0000-0000-000000000001'
    );
    RAISE EXCEPTION 'cross-school teacher write was accepted';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;
END;
$$;

SELECT pg_temp.assert_true(
  (SELECT count(*) = 0 FROM public.vivencias WHERE escola_id = 'a1000000-0000-0000-0000-000000000002'),
  'teacher cannot read another school vivencias'
);

RESET ROLE;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', 'a1100000-0000-0000-0000-000000000003', true);
SELECT pg_temp.assert_true(
  (SELECT count(*) = 2 FROM public.vivencias WHERE escola_id = 'a1000000-0000-0000-0000-000000000001'),
  'director reads all vivencias from the own school'
);

DO $$
DECLARE
  affected bigint;
BEGIN
  DELETE FROM public.vivencias WHERE id = 'a1500000-0000-0000-0000-000000000001';
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected > 0 THEN
    RAISE EXCEPTION 'director delete was accepted';
  END IF;
END;
$$;

RESET ROLE;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', 'a1100000-0000-0000-0000-000000000005', true);
SELECT pg_temp.assert_true(
  (SELECT count(*) = 2 FROM public.vivencias WHERE escola_id = 'a1000000-0000-0000-0000-000000000001'),
  'secretariat reads school-scoped vivencias'
);

RESET ROLE;
DO $$
BEGIN
  BEGIN
    DELETE FROM public.vivencias WHERE id = 'a1500000-0000-0000-0000-000000000001';
    RAISE EXCEPTION 'report source deletion was accepted';
  EXCEPTION WHEN restrict_violation THEN
    NULL;
  END;
END;
$$;

ROLLBACK;
