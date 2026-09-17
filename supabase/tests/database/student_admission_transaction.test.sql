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

CREATE TEMP TABLE admission_receipts(
  label text PRIMARY KEY,
  student_id uuid NOT NULL
);
GRANT INSERT, SELECT ON admission_receipts TO authenticated;

RESET ROLE;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '97100000-0000-0000-0000-000000000001', true);

-- Success boundary: student, guardian, and relationship all commit together.
DO $$
DECLARE
  student_id uuid;
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
      'cpf', '11144477735',
      'telefone', '34999990001',
      'email', 'guardian.success@synthetic.invalid',
      'endereco', 'Rua Guardian Admission, 20',
      'profissao', 'Artesã',
      'grau_parentesco', 'mae'
    )
  );

  PERFORM pg_temp.assert_true(student_id IS NOT NULL, 'success returns the inserted student');
  INSERT INTO admission_receipts(label, student_id) VALUES ('success', student_id);
END;
$$;

RESET ROLE;
SET LOCAL ROLE service_role;
SELECT pg_temp.assert_true(
  (SELECT guardian.cpf = '11144477735'
       AND guardian.telefone = '34999990001'
       AND guardian.email = 'guardian.success@synthetic.invalid'
       AND guardian.endereco = 'Rua Guardian Admission, 20'
       AND guardian.profissao = 'Artesã'
       AND link.ativo = true
   FROM admission_receipts AS receipt
   JOIN public.aluno_responsaveis AS link ON link.aluno_id = receipt.student_id
   JOIN public.responsaveis AS guardian ON guardian.id = link.responsavel_id
   WHERE receipt.label = 'success'),
  'success persists the explicit guardian payload and active relationship'
);

RESET ROLE;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '97100000-0000-0000-0000-000000000001', true);

-- A student without a guardian keeps the existing optional-guardian behavior.
INSERT INTO admission_receipts(label, student_id)
SELECT 'without_guardian', id
FROM public.create_student_admission(
     p_nome_completo => 'Admission Without Guardian',
     p_data_nascimento => DATE '2019-02-11',
     p_sexo => 'M',
     p_escola_id => '97000000-0000-0000-0000-000000000001',
     p_endereco => 'Rua Admission Without Guardian, 11',
     p_nome_mae => 'Mãe Without Guardian',
     p_responsavel => NULL
   );

RESET ROLE;
SET LOCAL ROLE service_role;
SELECT pg_temp.assert_true(
  (SELECT count(*) = 1
   FROM admission_receipts AS receipt
   JOIN public.alunos AS student ON student.id = receipt.student_id
   WHERE receipt.label = 'without_guardian')
    AND NOT EXISTS (
      SELECT 1
      FROM admission_receipts AS receipt
      JOIN public.aluno_responsaveis AS link ON link.aluno_id = receipt.student_id
      WHERE receipt.label = 'without_guardian'
    ),
  'a missing optional guardian commits the student without a placeholder relationship'
);

RESET ROLE;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '97100000-0000-0000-0000-000000000001', true);

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

RESET ROLE;
SET LOCAL ROLE service_role;
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
RESET ROLE;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '97100000-0000-0000-0000-000000000001', true);
DO $$
DECLARE
  student_id uuid;
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

  PERFORM pg_temp.assert_true(student_id IS NOT NULL, 'retry returns the inserted student');
  INSERT INTO admission_receipts(label, student_id) VALUES ('retry', student_id);
END;
$$;

RESET ROLE;
SET LOCAL ROLE service_role;
SELECT pg_temp.assert_true(
  (SELECT count(*) = 1
   FROM admission_receipts AS receipt
   JOIN public.alunos AS student ON student.id = receipt.student_id
   WHERE receipt.label = 'retry'
     AND student.nome_completo = 'Admission Rollback Student')
    AND (SELECT count(*) = 1
         FROM admission_receipts AS receipt
         JOIN public.aluno_responsaveis AS link ON link.aluno_id = receipt.student_id
         JOIN public.responsaveis AS guardian ON guardian.id = link.responsavel_id
         WHERE receipt.label = 'retry'
           AND guardian.nome = 'Admission Rollback Guardian'),
  'retry creates exactly one student, guardian, and relationship'
);

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
RESET ROLE;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '97100000-0000-0000-0000-000000000001', true);
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

RESET ROLE;
SET LOCAL ROLE service_role;
SELECT pg_temp.assert_true(
  (SELECT count(*) = 0 FROM public.alunos WHERE nome_completo = 'Admission Cross School Rejected'),
  'cross-school admission creates no student'
);

RESET ROLE;
SET LOCAL ROLE authenticated;
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

RESET ROLE;
SET LOCAL ROLE service_role;
SELECT pg_temp.assert_true(
  (SELECT count(*) = 0 FROM public.alunos WHERE nome_completo = 'Admission Professor Rejected'),
  'professor admission creates no student'
);

RESET ROLE;
ROLLBACK;
