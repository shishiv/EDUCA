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

CREATE FUNCTION pg_temp.expect_admission_denial(statement_sql text)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  EXECUTE statement_sql;
  RAISE EXCEPTION 'student admission unexpectedly succeeded';
EXCEPTION WHEN insufficient_privilege THEN
  IF position('PILOT_STUDENT_SCHOOL_DENIED' IN SQLERRM) = 0 THEN
    RAISE;
  END IF;
END;
$$;

SET LOCAL ROLE service_role;

INSERT INTO public.escolas(id, codigo, nome, tipo, ativo)
VALUES
  ('97300000-0000-0000-0000-000000000001', 'ADM-MUNIC-A', 'Escola Municipal Admission A', 'fundamental', true),
  ('97300000-0000-0000-0000-000000000002', 'ADM-MUNIC-B', 'Escola Municipal Admission B', 'fundamental', true),
  ('97300000-0000-0000-0000-000000000003', 'ADM-MUNIC-I', 'Escola Municipal Admission Inativa', 'fundamental', false);

INSERT INTO public.users(id, nome, email, tipo_usuario, escola_id, ativo)
VALUES
  ('97400000-0000-0000-0000-000000000001', 'Admin Municipal Admission', 'admission-municipal-admin@synthetic.invalid', 'admin', NULL, true),
  ('97400000-0000-0000-0000-000000000002', 'Diretora Municipal Admission A', 'admission-municipal-director@synthetic.invalid', 'diretor', '97300000-0000-0000-0000-000000000001', true),
  ('97400000-0000-0000-0000-000000000003', 'Professor Municipal Admission A', 'admission-municipal-teacher@synthetic.invalid', 'professor', '97300000-0000-0000-0000-000000000001', true),
  ('97400000-0000-0000-0000-000000000004', 'Admin Municipal Admission Inativo', 'admission-municipal-inactive@synthetic.invalid', 'admin', NULL, false);

RESET ROLE;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '97400000-0000-0000-0000-000000000001', true);

SELECT pg_temp.assert_true(
  (SELECT id IS NOT NULL
   FROM public.create_student_admission(
     p_nome_completo => 'Admission Municipal Admin Success',
     p_data_nascimento => DATE '2018-06-15',
     p_sexo => 'F',
     p_escola_id => '97300000-0000-0000-0000-000000000001',
     p_endereco => 'Rua Municipal Admission, 1',
     p_nome_mae => 'Mãe Municipal Admission'
   )),
  'active municipal administration admits a student into the selected active school'
);

RESET ROLE;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '97400000-0000-0000-0000-000000000002', true);

SELECT pg_temp.assert_true(
  (SELECT id IS NOT NULL
   FROM public.create_student_admission(
     p_nome_completo => 'Admission Director Own School Success',
     p_data_nascimento => DATE '2018-06-16',
     p_sexo => 'M',
     p_escola_id => '97300000-0000-0000-0000-000000000001',
     p_endereco => 'Rua Director Admission, 2',
     p_nome_mae => 'Mãe Director Admission'
   )),
  'an active director admits a student into their own school'
);

SELECT pg_temp.expect_admission_denial($statement$
  SELECT id
  FROM public.create_student_admission(
    p_nome_completo => 'Admission Director Cross School Rejected',
    p_data_nascimento => DATE '2018-06-17',
    p_sexo => 'M',
    p_escola_id => '97300000-0000-0000-0000-000000000002',
    p_endereco => 'Rua Director Cross School, 3',
    p_nome_mae => 'Mãe Director Cross School'
  )
$statement$);

RESET ROLE;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '97400000-0000-0000-0000-000000000003', true);

SELECT pg_temp.expect_admission_denial($statement$
  SELECT id
  FROM public.create_student_admission(
    p_nome_completo => 'Admission Professor Rejected',
    p_data_nascimento => DATE '2018-06-18',
    p_sexo => 'F',
    p_escola_id => '97300000-0000-0000-0000-000000000001',
    p_endereco => 'Rua Professor Admission, 4',
    p_nome_mae => 'Mãe Professor Admission'
  )
$statement$);

RESET ROLE;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '97400000-0000-0000-0000-000000000004', true);

SELECT pg_temp.expect_admission_denial($statement$
  SELECT id
  FROM public.create_student_admission(
    p_nome_completo => 'Admission Inactive Admin Rejected',
    p_data_nascimento => DATE '2018-06-19',
    p_sexo => 'F',
    p_escola_id => '97300000-0000-0000-0000-000000000001',
    p_endereco => 'Rua Inactive Admission, 5',
    p_nome_mae => 'Mãe Inactive Admission'
  )
$statement$);

RESET ROLE;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '97400000-0000-0000-0000-000000000001', true);

SELECT pg_temp.expect_admission_denial($statement$
  SELECT id
  FROM public.create_student_admission(
    p_nome_completo => 'Admission Inactive School Rejected',
    p_data_nascimento => DATE '2018-06-20',
    p_sexo => 'M',
    p_escola_id => '97300000-0000-0000-0000-000000000003',
    p_endereco => 'Rua Inactive School Admission, 6',
    p_nome_mae => 'Mãe Inactive School Admission'
  )
$statement$);

RESET ROLE;
SET LOCAL ROLE service_role;

SELECT pg_temp.assert_true(
  (SELECT count(*) = 1 FROM public.alunos WHERE nome_completo = 'Admission Municipal Admin Success')
  AND (SELECT count(*) = 1 FROM public.alunos WHERE nome_completo = 'Admission Director Own School Success')
  AND (SELECT count(*) = 0 FROM public.alunos WHERE nome_completo IN (
    'Admission Director Cross School Rejected',
    'Admission Professor Rejected',
    'Admission Inactive Admin Rejected',
    'Admission Inactive School Rejected'
  )),
  'only authorized admissions create student rows'
);

RESET ROLE;
ROLLBACK;
