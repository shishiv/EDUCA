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
  ('b1000000-0000-0000-0000-000000000001', 'FAMILY-A', 'Escola Família A', 'fundamental', true),
  ('b1000000-0000-0000-0000-000000000002', 'FAMILY-B', 'Escola Família B', 'fundamental', true);

INSERT INTO public.users(id, nome, email, tipo_usuario, escola_id, ativo, primeiro_login, senha_padrao)
VALUES
  ('b1100000-0000-0000-0000-000000000001', 'Direção Família A', 'direcao.family.a@synthetic.invalid', 'diretor', 'b1000000-0000-0000-0000-000000000001', true, false, false),
  ('b1100000-0000-0000-0000-000000000002', 'Direção Família B', 'direcao.family.b@synthetic.invalid', 'diretor', 'b1000000-0000-0000-0000-000000000002', true, false, false),
  ('b1100000-0000-0000-0000-000000000003', 'Professora Família A', 'professora.family.a@synthetic.invalid', 'professor', 'b1000000-0000-0000-0000-000000000001', true, false, false),
  ('b1100000-0000-0000-0000-000000000004', 'Responsável Família A', 'responsavel.family.a@synthetic.invalid', 'responsavel', 'b1000000-0000-0000-0000-000000000001', true, false, false);

INSERT INTO public.turmas(id, nome, serie, turno, ano_letivo, escola_id, professor_id, ativo)
VALUES
  ('b1200000-0000-0000-0000-000000000001', 'Turma Família Titular', '1 ano', 'matutino', 2026, 'b1000000-0000-0000-0000-000000000001', 'b1100000-0000-0000-0000-000000000003', true),
  ('b1200000-0000-0000-0000-000000000002', 'Turma Família Não Titular', '2 ano', 'vespertino', 2026, 'b1000000-0000-0000-0000-000000000001', 'b1100000-0000-0000-0000-000000000001', true);

INSERT INTO public.responsaveis(id, escola_id, nome, cpf, parentesco, telefone, renda_familiar, ativo)
VALUES
  ('b1300000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001', 'Responsável Sintético A', '00000000191', 'mae', '11999990001', 1000, true),
  ('b1300000-0000-0000-0000-000000000002', 'b1000000-0000-0000-0000-000000000002', 'Responsável Sintético B', '00000000272', 'pai', '11999990002', 2000, true);

ALTER TABLE public.alunos DISABLE TRIGGER pilot_high_risk_student_guard;
INSERT INTO public.alunos(id, escola_id, nome_completo, data_nascimento, sexo, cpf, nome_mae, nome_pai, necessidades_especiais, ativo)
VALUES
  ('b1400000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001', 'Aluno Família Titular', DATE '2018-01-01', 'M', '00000000353', 'Mãe Sintética A', 'Pai Sintético A', 'Necessidade Sintética A', true),
  ('b1400000-0000-0000-0000-000000000002', 'b1000000-0000-0000-0000-000000000001', 'Aluno Família Não Titular', DATE '2018-02-01', 'F', '00000000434', 'Mãe Sintética B', 'Pai Sintético B', 'Necessidade Sintética B', true),
  ('b1400000-0000-0000-0000-000000000003', 'b1000000-0000-0000-0000-000000000002', 'Aluno Família Escola B', DATE '2018-03-01', 'F', '00000000515', 'Mãe Sintética C', 'Pai Sintético C', 'Necessidade Sintética C', true);
ALTER TABLE public.alunos ENABLE TRIGGER pilot_high_risk_student_guard;

INSERT INTO public.matriculas(id, aluno_id, turma_id, ano_letivo, situacao)
VALUES
  ('b1500000-0000-0000-0000-000000000001', 'b1400000-0000-0000-0000-000000000001', 'b1200000-0000-0000-0000-000000000001', 2026, 'ativa'),
  ('b1500000-0000-0000-0000-000000000002', 'b1400000-0000-0000-0000-000000000002', 'b1200000-0000-0000-0000-000000000002', 2026, 'ativa');

SELECT pg_temp.assert_true(
  NOT has_column_privilege('authenticated', 'public.alunos', 'cpf', 'SELECT')
    AND NOT has_column_privilege('authenticated', 'public.alunos', 'nome_mae', 'SELECT')
    AND NOT has_column_privilege('authenticated', 'public.alunos', 'nome_pai', 'SELECT')
    AND NOT has_column_privilege('authenticated', 'public.alunos', 'necessidades_especiais', 'SELECT')
    AND NOT has_column_privilege('authenticated', 'public.responsaveis', 'cpf', 'SELECT')
    AND NOT has_column_privilege('authenticated', 'public.responsaveis', 'telefone', 'SELECT')
    AND NOT has_column_privilege('authenticated', 'public.responsaveis', 'renda_familiar', 'SELECT'),
  'authenticated cannot select sensitive family columns directly'
);

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', 'b1100000-0000-0000-0000-000000000003', true);

DO $$
BEGIN
  BEGIN
    PERFORM cpf, nome_mae, nome_pai, necessidades_especiais FROM public.alunos;
    RAISE EXCEPTION 'teacher direct student sensitive read unexpectedly succeeded';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    PERFORM cpf, telefone, renda_familiar FROM public.responsaveis;
    RAISE EXCEPTION 'teacher direct guardian sensitive read unexpectedly succeeded';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END;
$$;

SELECT pg_temp.assert_true(
  (SELECT array_agg(id ORDER BY id) = ARRAY['b1400000-0000-0000-0000-000000000001'::uuid] FROM public.alunos),
  'teacher retains only the titular class roster'
);
SELECT pg_temp.assert_true(
  (SELECT count(*) = 0 FROM public.get_authorized_student_profiles(NULL, NULL))
    AND (SELECT count(*) = 0 FROM public.get_authorized_guardian_profiles(NULL, NULL)),
  'teacher cannot use governed sensitive profile RPCs'
);

SELECT set_config('request.jwt.claim.sub', 'b1100000-0000-0000-0000-000000000004', true);
SELECT pg_temp.assert_true(
  (SELECT count(*) = 0 FROM public.get_authorized_student_profiles(NULL, NULL))
    AND (SELECT count(*) = 0 FROM public.get_authorized_guardian_profiles(NULL, NULL)),
  'guardian role cannot use governed sensitive profile RPCs'
);

SELECT set_config('request.jwt.claim.sub', 'b1100000-0000-0000-0000-000000000001', true);
SELECT pg_temp.assert_true(
  (SELECT count(*) = 2 AND bool_and(cpf IS NOT NULL AND nome_mae IS NOT NULL AND nome_pai IS NOT NULL AND necessidades_especiais IS NOT NULL)
   FROM public.get_authorized_student_profiles(NULL, NULL))
    AND
  (SELECT count(*) = 1 AND bool_and(cpf IS NOT NULL AND telefone IS NOT NULL AND renda_familiar IS NOT NULL)
   FROM public.get_authorized_guardian_profiles(NULL, NULL)),
  'own-school direction retains governed sensitive profile access'
);
SELECT pg_temp.assert_true(
  (SELECT count(*) = 0 FROM public.get_authorized_student_profiles('b1400000-0000-0000-0000-000000000003', NULL))
    AND (SELECT count(*) = 0 FROM public.get_authorized_guardian_profiles('b1300000-0000-0000-0000-000000000002', NULL)),
  'governed sensitive profile RPCs deny cross-school reads'
);

RESET ROLE;
SELECT pg_temp.assert_true(
  EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.pilot_audit_log'::regclass
      AND conname = 'pilot_audit_sensitive_family_metadata_check'
      AND convalidated
  ),
  'audit metadata rejects sensitive family fields'
);

ROLLBACK;
