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

INSERT INTO public.escolas(id, codigo, nome, tipo, ativo)
VALUES
  ('c1000000-0000-0000-0000-000000000001', 'READ-A', 'Escola Read A', 'fundamental', true),
  ('c1000000-0000-0000-0000-000000000002', 'READ-B', 'Escola Read B', 'fundamental', true);

INSERT INTO public.users(id, nome, email, tipo_usuario, escola_id, ativo)
VALUES
  ('c1100000-0000-0000-0000-000000000001', 'Diretora Read A', 'read.a@synthetic.invalid', 'diretor', 'c1000000-0000-0000-0000-000000000001', true),
  ('c1100000-0000-0000-0000-000000000002', 'Diretora Read B', 'read.b@synthetic.invalid', 'diretor', 'c1000000-0000-0000-0000-000000000002', true);

INSERT INTO public.turmas(id, nome, serie, turno, ano_letivo, escola_id, ativo)
VALUES ('c1200000-0000-0000-0000-000000000001', 'Turma Read A', '1 ano', 'matutino', 2026, 'c1000000-0000-0000-0000-000000000001', true);

INSERT INTO public.responsaveis(id, escola_id, nome, cpf, parentesco, telefone, ativo)
VALUES
  ('c1300000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000001', 'Responsável Read A', '', 'mae', '', true),
  ('c1300000-0000-0000-0000-000000000002', 'c1000000-0000-0000-0000-000000000001', 'Responsável Histórico A', '', 'pai', '', false),
  ('c1300000-0000-0000-0000-000000000003', 'c1000000-0000-0000-0000-000000000002', 'Responsável Read B', '', 'mae', '', true);

INSERT INTO public.alunos(id, escola_id, nome_completo, data_nascimento, sexo, responsavel_id, ativo)
VALUES
  ('c1400000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000001', 'Aluno Ativo Sem Matrícula', DATE '2018-01-01', 'M', NULL, true),
  ('c1400000-0000-0000-0000-000000000002', 'c1000000-0000-0000-0000-000000000001', 'Aluno Ativo Matriculado', DATE '2018-02-01', 'F', NULL, true),
  ('c1400000-0000-0000-0000-000000000003', 'c1000000-0000-0000-0000-000000000001', 'Aluno Inativo', DATE '2018-03-01', 'F', NULL, false),
  ('c1400000-0000-0000-0000-000000000004', 'c1000000-0000-0000-0000-000000000002', 'Aluno Escola B', DATE '2018-04-01', 'M', NULL, true);

INSERT INTO public.matriculas(id, aluno_id, turma_id, ano_letivo, situacao)
VALUES ('c1500000-0000-0000-0000-000000000001', 'c1400000-0000-0000-0000-000000000002', 'c1200000-0000-0000-0000-000000000001', 2026, 'ativa');

INSERT INTO public.aluno_responsaveis(id, aluno_id, responsavel_id, tipo_responsabilidade, ativo)
VALUES
  ('c1600000-0000-0000-0000-000000000001', 'c1400000-0000-0000-0000-000000000001', 'c1300000-0000-0000-0000-000000000001', 'mae', true),
  ('c1600000-0000-0000-0000-000000000002', 'c1400000-0000-0000-0000-000000000001', 'c1300000-0000-0000-0000-000000000002', 'pai', false),
  ('c1600000-0000-0000-0000-000000000003', 'c1400000-0000-0000-0000-000000000001', 'c1300000-0000-0000-0000-000000000003', 'mae', true),
  ('c1600000-0000-0000-0000-000000000004', 'c1400000-0000-0000-0000-000000000004', 'c1300000-0000-0000-0000-000000000003', 'mae', true);

RESET ROLE;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', 'c1100000-0000-0000-0000-000000000001', true);

SELECT pg_temp.assert_true(
  (SELECT count(*) = 3 FROM public.get_authorized_student_profiles(NULL, NULL)),
  'school student profiles include active unenrolled, enrolled, and inactive students exactly once'
);
SELECT pg_temp.assert_true(
  (SELECT count(*) = 1 FROM public.get_authorized_student_profiles('c1400000-0000-0000-0000-000000000001', NULL) WHERE ativo = true),
  'active unenrolled student is visible through the school profile boundary'
);
SELECT pg_temp.assert_true(
  (SELECT count(*) = 1 FROM public.get_authorized_student_profiles('c1400000-0000-0000-0000-000000000002', NULL) WHERE ativo = true),
  'enrolled student remains visible without duplication'
);
SELECT pg_temp.assert_true(
  (SELECT count(*) = 1 FROM public.get_authorized_student_profiles('c1400000-0000-0000-0000-000000000003', NULL) WHERE ativo = false),
  'inactive student remains visible for status management'
);
SELECT pg_temp.assert_true(
  (SELECT count(*) = 2 FROM public.aluno_responsaveis WHERE aluno_id = 'c1400000-0000-0000-0000-000000000001'),
  'same-school active and historical canonical links remain readable'
);
SELECT pg_temp.assert_true(
  (SELECT count(*) = 0 FROM public.aluno_responsaveis WHERE responsavel_id = 'c1300000-0000-0000-0000-000000000003'),
  'cross-school canonical links are denied'
);
SELECT pg_temp.assert_true(
  (SELECT count(*) = 0 FROM public.get_authorized_student_profiles('c1400000-0000-0000-0000-000000000004', NULL)),
  'cross-school student profile is denied'
);

RESET ROLE;
ROLLBACK;
