BEGIN;

-- This contract calls the migration-owned RPC as authenticated users. It does
-- not mock PostgREST or the database, so a later write failure must roll back
-- the earlier rows in the same real PostgreSQL transaction.
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

SELECT pg_temp.assert_true(
  has_function_privilege(
    'authenticated',
    'public.create_student_admission(text,date,text,uuid,text,text,text,text,text,text,text,text,jsonb)',
    'EXECUTE'
  )
  AND NOT has_function_privilege(
    'anon',
    'public.create_student_admission(text,date,text,uuid,text,text,text,text,text,text,text,text,jsonb)',
    'EXECUTE'
  ),
  'admission RPC is exposed only to authenticated callers'
);

SET LOCAL ROLE service_role;

INSERT INTO public.escolas(id, codigo, nome, tipo, ativo)
VALUES
  ('97000000-0000-0000-0000-000000000001', 'ADM-A', 'Escola Admission A', 'fundamental', true),
  ('97000000-0000-0000-0000-000000000002', 'ADM-B', 'Escola Admission B', 'fundamental', true);

INSERT INTO public.users(id, nome, email, tipo_usuario, escola_id, ativo)
VALUES
  ('97100000-0000-0000-0000-000000000001', 'Diretora Admission A', 'admission.a@synthetic.invalid', 'diretor', '97000000-0000-0000-0000-000000000001', true),
  ('97100000-0000-0000-0000-000000000002', 'Diretora Admission B', 'admission.b@synthetic.invalid', 'diretor', '97000000-0000-0000-0000-000000000002', true),
  ('97100000-0000-0000-0000-000000000003', 'Professor Admission A', 'admission.professor@synthetic.invalid', 'professor', '97000000-0000-0000-0000-000000000001', true);

RESET ROLE;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '97100000-0000-0000-0000-000000000001', true);

-- Success boundary: student, guardian, and relationship all commit together.
DO $$
DECLARE
  student_id uuid;
  guardian_id uuid;
BEGIN
  SELECT id
  INTO student_id
  FROM public.create_student_admission(
    p_nome_completo => 'Admission Success Student',
    p_data_nascimento => DATE '2018-01-10',
    p_sexo => 'F',
    p_escola_id => '97000000-0000-0000-0000-000000000001',
    p_cpf => '52998224725',
    p_endereco => 'Rua Admission Success, 10',
    p_nome_mae => 'Mãe Admission Success',
    p_responsavel => jsonb_build_object(
      'nome', 'Admission Success Guardian',
      'telefone', '34999990001',
      'email', 'guardian.success@synthetic.invalid',
      'grau_parentesco', 'mae'
    )
  );

  SELECT id INTO guardian_id
  FROM public.responsaveis
  WHERE nome = 'Admission Success Guardian';

  PERFORM pg_temp.assert_true(student_id IS NOT NULL, 'success returns the inserted student');
  PERFORM pg_temp.assert_true(guardian_id IS NOT NULL, 'success inserts the guardian');
  PERFORM pg_temp.assert_true(
    (SELECT count(*) = 1 FROM public.aluno_responsaveis
     WHERE aluno_id = student_id AND responsavel_id = guardian_id AND ativo = true),
    'success inserts the active relationship'
  );
END;
$$;

-- A student without a guardian keeps the existing optional-guardian behavior.
SELECT pg_temp.assert_true(
  (SELECT count(*) = 1
   FROM public.create_student_admission(
     p_nome_completo => 'Admission Without Guardian',
     p_data_nascimento => DATE '2019-02-11',
     p_sexo => 'M',
     p_escola_id => '97000000-0000-0000-0000-000000000001',
     p_endereco => 'Rua Admission Without Guardian, 11',
     p_nome_mae => 'Mãe Without Guardian',
     p_responsavel => NULL
   )),
  'a missing optional guardian still commits the student'
);
SELECT pg_temp.assert_true(
  (SELECT count(*) = 0 FROM public.responsaveis WHERE nome = 'Admission Without Guardian'),
  'missing guardian does not create a placeholder guardian'
);

-- Mid-flow failure: the student insert succeeds inside the function before the
-- malformed guardian reaches its NOT NULL constraint. The call must roll back.
DO $$
BEGIN
  BEGIN
    PERFORM 1
    FROM public.create_student_admission(
      p_nome_completo => 'Admission Rollback Student',
      p_data_nascimento => DATE '2018-03-12',
      p_sexo => 'F',
      p_escola_id => '97000000-0000-0000-0000-000000000001',
      p_cpf => '39053344705',
      p_endereco => 'Rua Admission Rollback, 12',
      p_nome_mae => 'Mãe Admission Rollback',
      p_responsavel => jsonb_build_object(
        'nome', 'Admission Rollback Guardian',
        'telefone', '34999990002',
        'email', 'guardian.rollback@synthetic.invalid'
      )
    );
    RAISE EXCEPTION 'malformed guardian admission unexpectedly succeeded';
  EXCEPTION WHEN not_null_violation THEN
    NULL;
  END;
END;
$$;

SELECT pg_temp.assert_true(
  (SELECT count(*) = 0 FROM public.alunos WHERE nome_completo = 'Admission Rollback Student'),
  'student row is rolled back after the guardian failure'
);
SELECT pg_temp.assert_true(
  (SELECT count(*) = 0 FROM public.responsaveis WHERE nome = 'Admission Rollback Guardian'),
  'guardian row is absent after the failed transaction'
);
SELECT pg_temp.assert_true(
  (SELECT count(*) = 0 FROM public.aluno_responsaveis link
   JOIN public.alunos student ON student.id = link.aluno_id
   WHERE student.nome_completo = 'Admission Rollback Student'),
  'relationship row is absent after the failed transaction'
);

-- Retry the same logical admission after rollback. It converges to one complete
-- graph because the failed call left no durable partial rows.
DO $$
DECLARE
  student_id uuid;
  guardian_id uuid;
BEGIN
  SELECT id
  INTO student_id
  FROM public.create_student_admission(
    p_nome_completo => 'Admission Rollback Student',
    p_data_nascimento => DATE '2018-03-12',
    p_sexo => 'F',
    p_escola_id => '97000000-0000-0000-0000-000000000001',
    p_cpf => '39053344705',
    p_endereco => 'Rua Admission Rollback, 12',
    p_nome_mae => 'Mãe Admission Rollback',
    p_responsavel => jsonb_build_object(
      'nome', 'Admission Rollback Guardian',
      'telefone', '34999990002',
      'email', 'guardian.rollback@synthetic.invalid',
      'grau_parentesco', 'mae'
    )
  );

  SELECT id INTO guardian_id
  FROM public.responsaveis
  WHERE nome = 'Admission Rollback Guardian';

  PERFORM pg_temp.assert_true(
    (SELECT count(*) = 1 FROM public.alunos WHERE nome_completo = 'Admission Rollback Student'),
    'retry creates exactly one student'
  );
  PERFORM pg_temp.assert_true(
    (SELECT count(*) = 1 FROM public.responsaveis WHERE nome = 'Admission Rollback Guardian'),
    'retry creates exactly one guardian'
  );
  PERFORM pg_temp.assert_true(
    (SELECT count(*) = 1 FROM public.aluno_responsaveis
     WHERE aluno_id = student_id AND responsavel_id = guardian_id),
    'retry creates exactly one relationship'
  );
END;
$$;

-- Duplicate relationship behavior is owned by the existing real unique index.
-- A repeated link fails and cannot create a second relationship row.
DO $$
DECLARE
  student_id uuid;
  guardian_id uuid;
BEGIN
  SELECT id INTO student_id FROM public.alunos WHERE nome_completo = 'Admission Rollback Student';
  SELECT id INTO guardian_id FROM public.responsaveis WHERE nome = 'Admission Rollback Guardian';

  BEGIN
    INSERT INTO public.aluno_responsaveis(aluno_id, responsavel_id, tipo_responsabilidade, ativo)
    VALUES (student_id, guardian_id, 'mae', true);
    RAISE EXCEPTION 'duplicate relationship unexpectedly succeeded';
  EXCEPTION WHEN unique_violation THEN
    NULL;
  END;

  PERFORM pg_temp.assert_true(
    (SELECT count(*) = 1 FROM public.aluno_responsaveis
     WHERE aluno_id = student_id AND responsavel_id = guardian_id),
    'duplicate relationship leaves one durable link'
  );
END;
$$;

-- School and role boundaries remain enforced by the function and RLS.
DO $$
BEGIN
  BEGIN
    PERFORM 1
    FROM public.create_student_admission(
      p_nome_completo => 'Admission Cross School Rejected',
      p_data_nascimento => DATE '2018-04-13',
      p_sexo => 'M',
      p_escola_id => '97000000-0000-0000-0000-000000000002',
      p_endereco => 'Rua Admission Cross School, 13',
      p_nome_mae => 'Mãe Admission Cross School',
      p_responsavel => NULL
    );
    RAISE EXCEPTION 'cross-school admission unexpectedly succeeded';
  EXCEPTION WHEN insufficient_privilege THEN
    IF position('PILOT_STUDENT_SCHOOL_DENIED' IN SQLERRM) = 0 THEN
      RAISE;
    END IF;
  END;
END;
$$;
SELECT pg_temp.assert_true(
  (SELECT count(*) = 0 FROM public.alunos WHERE nome_completo = 'Admission Cross School Rejected'),
  'cross-school admission creates no student'
);

SELECT set_config('request.jwt.claim.sub', '97100000-0000-0000-0000-000000000003', true);
DO $$
BEGIN
  BEGIN
    PERFORM 1
    FROM public.create_student_admission(
      p_nome_completo => 'Admission Professor Rejected',
      p_data_nascimento => DATE '2018-05-14',
      p_sexo => 'F',
      p_escola_id => '97000000-0000-0000-0000-000000000001',
      p_endereco => 'Rua Admission Professor, 14',
      p_nome_mae => 'Mãe Admission Professor',
      p_responsavel => NULL
    );
    RAISE EXCEPTION 'professor admission unexpectedly succeeded';
  EXCEPTION WHEN insufficient_privilege THEN
    IF position('PILOT_STUDENT_SCHOOL_DENIED' IN SQLERRM) = 0 THEN
      RAISE;
    END IF;
  END;
END;
$$;
SELECT pg_temp.assert_true(
  (SELECT count(*) = 0 FROM public.alunos WHERE nome_completo = 'Admission Professor Rejected'),
  'professor admission creates no student'
);

RESET ROLE;
ROLLBACK;
