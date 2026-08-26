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
  (
    'a1000000-0000-0000-0000-000000000001',
    'BF-VIS-A',
    'Escola Bolsa Visibilidade A',
    'fundamental',
    true
  ),
  (
    'a1000000-0000-0000-0000-000000000002',
    'BF-VIS-B',
    'Escola Bolsa Visibilidade B',
    'fundamental',
    true
  );

INSERT INTO public.users(id, nome, email, tipo_usuario, escola_id, ativo, primeiro_login, senha_padrao)
VALUES
  (
    'a1100000-0000-0000-0000-000000000001',
    'Coordenacao Pedagogica e Assistencia Social',
    'coordenacao.social@synthetic.invalid',
    'secretario',
    NULL,
    true,
    false,
    false
  ),
  (
    'a1100000-0000-0000-0000-000000000002',
    'Direcao Bolsa',
    'direcao.bolsa@synthetic.invalid',
    'diretor',
    'a1000000-0000-0000-0000-000000000001',
    true,
    false,
    false
  ),
  (
    'a1100000-0000-0000-0000-000000000003',
    'Professora Bolsa',
    'professora.bolsa@synthetic.invalid',
    'professor',
    'a1000000-0000-0000-0000-000000000001',
    true,
    false,
    false
  );

INSERT INTO public.turmas(id, nome, serie, turno, ano_letivo, escola_id, professor_id, ativo)
VALUES (
  'a1200000-0000-0000-0000-000000000001',
  'Turma Bolsa',
  '1 ano',
  'matutino',
  2026,
  'a1000000-0000-0000-0000-000000000001',
  'a1100000-0000-0000-0000-000000000003',
  true
);

ALTER TABLE public.alunos DISABLE TRIGGER pilot_high_risk_student_guard;
INSERT INTO public.alunos(
  id,
  escola_id,
  nome_completo,
  data_nascimento,
  sexo,
  nis,
  bolsa_familia,
  ativo
)
VALUES (
  'a1300000-0000-0000-0000-000000000001',
  'a1000000-0000-0000-0000-000000000001',
  'Aluna Bolsa Sintetica',
  DATE '2018-01-01',
  'F',
  'NIS-SYNTHETIC-VISIBILITY',
  true,
  true
);
ALTER TABLE public.alunos ENABLE TRIGGER pilot_high_risk_student_guard;

INSERT INTO public.matriculas(id, aluno_id, turma_id, ano_letivo, situacao)
VALUES (
  'a1400000-0000-0000-0000-000000000001',
  'a1300000-0000-0000-0000-000000000001',
  'a1200000-0000-0000-0000-000000000001',
  2026,
  'ativa'
);

SELECT pg_temp.assert_true(
  NOT has_column_privilege('authenticated', 'public.alunos', 'bolsa_familia', 'SELECT')
    AND NOT has_column_privilege('authenticated', 'public.alunos', 'nis', 'SELECT')
    AND has_column_privilege('authenticated', 'public.alunos', 'nome_completo', 'SELECT'),
  'authenticated callers receive safe student columns but not Bolsa Familia or NIS'
);

SELECT pg_temp.assert_true(
  (SELECT valor = 'admin,diretor,secretario'
   FROM public.configs
   WHERE escola_id IS NULL
     AND chave = 'bolsa_familia_visible_roles'),
  'the visibility default is stored in the database'
);
SELECT pg_temp.assert_true(
  (SELECT count(*) = 2 AND bool_and(valor = 'admin,diretor,secretario')
   FROM public.configs
   WHERE escola_id IN (
     'a1000000-0000-0000-0000-000000000001',
     'a1000000-0000-0000-0000-000000000002'
   )
     AND chave = 'bolsa_familia_visible_roles'),
  'each school receives an isolated override copied from the database default'
);
SELECT pg_temp.assert_true(
  EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.pilot_audit_log'::regclass
      AND conname = 'pilot_audit_bolsa_familia_metadata_check'
      AND convalidated
  ),
  'audit metadata rejects Bolsa Familia values'
);

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', 'a1100000-0000-0000-0000-000000000003', true);

DO $$
BEGIN
  PERFORM bolsa_familia
  FROM public.alunos
  WHERE id = 'a1300000-0000-0000-0000-000000000001';
  RAISE EXCEPTION 'teacher direct Bolsa Familia read unexpectedly succeeded';
EXCEPTION
  WHEN insufficient_privilege THEN NULL;
END;
$$;

SELECT pg_temp.assert_true(
  public.get_student_bolsa_familia('a1300000-0000-0000-0000-000000000001') IS NULL,
  'teacher cannot obtain the Bolsa Familia value through the scalar interface'
);
SELECT pg_temp.assert_true(
  (SELECT count(*) = 0
   FROM public.get_attendance_conditionality(
     DATE '2026-08-01',
     DATE '2026-08-31',
     NULL,
     NULL
   )),
  'teacher cannot obtain Bolsa Familia rows through the report interface'
);
SELECT pg_temp.assert_true(
  (SELECT count(*) = 0 FROM public.vw_frequencia_condicionalidade),
  'teacher cannot obtain Bolsa Familia rows through the direct view'
);

UPDATE public.configs
SET valor = 'admin', updated_at = now()
WHERE escola_id = 'a1000000-0000-0000-0000-000000000001'
  AND chave = 'bolsa_familia_visible_roles';
SELECT pg_temp.assert_true(
  (SELECT valor = 'admin,diretor,secretario'
   FROM public.configs
   WHERE escola_id = 'a1000000-0000-0000-0000-000000000001'
     AND chave = 'bolsa_familia_visible_roles'),
  'teacher cannot change the school visibility policy'
);

SELECT set_config('request.jwt.claim.sub', 'a1100000-0000-0000-0000-000000000001', true);
SELECT pg_temp.assert_true(
  public.get_student_bolsa_familia('a1300000-0000-0000-0000-000000000001') = true,
  'the current secretariat role used for coordination and social assistance sees the field by default'
);
SELECT pg_temp.assert_true(
  (SELECT count(*) = 1 AND bool_and(is_bolsa_familia)
   FROM public.get_attendance_conditionality(
     DATE '2026-08-01',
     DATE '2026-08-31',
     NULL,
     NULL
   )),
  'the authorized coordination and social-assistance journey reads the conditionality value'
);

SELECT set_config('request.jwt.claim.sub', 'a1100000-0000-0000-0000-000000000002', true);
SELECT pg_temp.assert_true(
  public.get_student_bolsa_familia('a1300000-0000-0000-0000-000000000001') = true,
  'direction sees the own-school field under the default policy'
);

UPDATE public.configs
SET valor = 'admin,secretario', updated_at = now()
WHERE escola_id = 'a1000000-0000-0000-0000-000000000001'
  AND chave = 'bolsa_familia_visible_roles';

SELECT pg_temp.assert_true(
  public.get_student_bolsa_familia('a1300000-0000-0000-0000-000000000001') IS NULL,
  'the school can remove direction access'
);
DO $$
DECLARE
  changed_rows integer;
BEGIN
  UPDATE public.configs
  SET valor = 'admin', updated_at = now()
  WHERE escola_id = 'a1000000-0000-0000-0000-000000000002'
    AND chave = 'bolsa_familia_visible_roles';
  GET DIAGNOSTICS changed_rows = ROW_COUNT;
  IF changed_rows <> 0 THEN
    RAISE EXCEPTION 'director changed another school visibility policy';
  END IF;
END;
$$;
SELECT pg_temp.assert_true(
  (SELECT count(*) = 0
   FROM public.get_attendance_conditionality(
     DATE '2026-08-01',
     DATE '2026-08-31',
     NULL,
     NULL
   )),
  'the configured school policy is enforced at the report data boundary'
);

ROLLBACK;
