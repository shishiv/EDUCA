BEGIN;

CREATE FUNCTION pg_temp.assert_true(condition boolean, message text)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF condition IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'assertion failed: %', message;
  END IF;
END;
$$;

CREATE FUNCTION pg_temp.expect_management_failure(expected_code text, statement_sql text)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  EXECUTE statement_sql;
  RAISE EXCEPTION 'management mutation unexpectedly succeeded';
EXCEPTION WHEN raise_exception THEN
  IF SQLERRM NOT LIKE expected_code || ':%' THEN
    RAISE;
  END IF;
END;
$$;

SELECT pg_temp.assert_true(
  has_function_privilege('authenticated', 'public.create_governed_school(text,text,text,uuid,text,text,text)', 'EXECUTE')
  AND has_function_privilege('authenticated', 'public.write_governed_turma(uuid,jsonb)', 'EXECUTE')
  AND has_function_privilege('authenticated', 'public.create_governed_enrollment(uuid,uuid,integer,date,text)', 'EXECUTE')
  AND NOT has_function_privilege('anon', 'public.create_governed_school(text,text,text,uuid,text,text,text)', 'EXECUTE'),
  'governed management RPCs are exposed only to authenticated callers'
);
SELECT pg_temp.assert_true(
  NOT has_table_privilege('authenticated', 'public.escolas', 'INSERT')
  AND NOT has_table_privilege('authenticated', 'public.escolas', 'UPDATE')
  AND NOT has_table_privilege('authenticated', 'public.escolas', 'DELETE')
  AND NOT has_table_privilege('authenticated', 'public.turmas', 'INSERT')
  AND NOT has_table_privilege('authenticated', 'public.turmas', 'UPDATE')
  AND NOT has_table_privilege('authenticated', 'public.matriculas', 'INSERT')
  AND NOT has_table_privilege('authenticated', 'public.matriculas', 'UPDATE')
  AND NOT has_table_privilege('authenticated', 'public.matriculas', 'DELETE'),
  'browser roles cannot bypass governed school, class, and enrollment RPCs with table writes'
);

SET LOCAL ROLE service_role;
INSERT INTO public.escolas(id, codigo, nome, tipo, ativo) VALUES
  ('c6100000-0000-0000-0000-000000000001', 'MGMT-A', 'Escola Gestão A', 'fundamental', true),
  ('c6100000-0000-0000-0000-000000000002', 'MGMT-B', 'Escola Gestão B', 'fundamental', true);
INSERT INTO public.users(id, nome, email, tipo_usuario, escola_id, ativo, primeiro_login, senha_padrao) VALUES
  ('c6200000-0000-0000-0000-000000000001', 'Admin Gestão', 'management-admin@synthetic.invalid', 'admin', NULL, true, false, false),
  ('c6200000-0000-0000-0000-000000000002', 'Diretora Gestão A', 'management-director-a@synthetic.invalid', 'diretor', 'c6100000-0000-0000-0000-000000000001', true, false, false),
  ('c6200000-0000-0000-0000-000000000003', 'Diretora Gestão B', 'management-director-b@synthetic.invalid', 'diretor', 'c6100000-0000-0000-0000-000000000002', true, false, false),
  ('c6200000-0000-0000-0000-000000000004', 'Diretora Disponível', 'management-director-free@synthetic.invalid', 'diretor', NULL, true, false, false),
  ('c6200000-0000-0000-0000-000000000005', 'Professora Gestão A', 'management-teacher-a@synthetic.invalid', 'professor', 'c6100000-0000-0000-0000-000000000001', true, false, false),
  ('c6200000-0000-0000-0000-000000000006', 'Professor Gestão B', 'management-teacher-b@synthetic.invalid', 'professor', 'c6100000-0000-0000-0000-000000000002', true, false, false),
  ('c6200000-0000-0000-0000-000000000007', 'Diretora Inativa', 'management-director-inactive@synthetic.invalid', 'diretor', 'c6100000-0000-0000-0000-000000000001', false, false, false),
  ('c6200000-0000-0000-0000-000000000008', 'Professor Gestão A 2', 'management-teacher-a2@synthetic.invalid', 'professor', 'c6100000-0000-0000-0000-000000000001', true, false, false);
INSERT INTO public.alunos(id, nome_completo, data_nascimento, sexo, escola_id, ativo) VALUES
  ('c6300000-0000-0000-0000-000000000001', 'Aluno Gestão A', DATE '2018-02-10', 'M', 'c6100000-0000-0000-0000-000000000001', true),
  ('c6300000-0000-0000-0000-000000000002', 'Aluno Gestão B', DATE '2018-03-11', 'F', 'c6100000-0000-0000-0000-000000000002', true);
RESET ROLE;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', 'c6200000-0000-0000-0000-000000000001', true);
DO $$
BEGIN
  BEGIN
    UPDATE public.escolas
    SET codigo = 'MGMT-DIRECT-WRITE'
    WHERE id = 'c6100000-0000-0000-0000-000000000001';
    RAISE EXCEPTION 'direct school write unexpectedly succeeded';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;
END;
$$;
SELECT pg_temp.assert_true(
  (
    SELECT school_id IS NOT NULL
       AND diretor_id = 'c6200000-0000-0000-0000-000000000004'
       AND audit_id IS NOT NULL
    FROM public.create_governed_school(
      'Escola Gestão Nova', 'MGMT-NEW', 'fundamental',
      'c6200000-0000-0000-0000-000000000004', NULL, NULL, NULL
    )
  ),
  'municipal administration creates a school and assigns its director atomically'
);
RESET ROLE;
SELECT pg_temp.assert_true(
  (SELECT escola_id IS NOT NULL FROM public.users WHERE id = 'c6200000-0000-0000-0000-000000000004')
  AND (SELECT count(*) = 1 FROM public.pilot_audit_log
       WHERE event_type = 'school_created'
         AND entity_type = 'school'
         AND actor_user_id = 'c6200000-0000-0000-0000-000000000001'),
  'school creation persists the director relationship and governed receipt'
);

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', 'c6200000-0000-0000-0000-000000000001', true);
SELECT pg_temp.assert_true(
  (
    SELECT school_id IS NOT NULL
       AND diretor_id IS NULL
       AND audit_id IS NOT NULL
    FROM public.assign_governed_school_director(
      (SELECT escola_id FROM public.users WHERE id = 'c6200000-0000-0000-0000-000000000004'),
      NULL
    )
  ),
  'removing a director records a governed receipt'
);
RESET ROLE;
SELECT pg_temp.assert_true(
  (SELECT escola_id IS NULL FROM public.users WHERE id = 'c6200000-0000-0000-0000-000000000004')
  AND NOT EXISTS (
    SELECT 1
    FROM public.escolas AS school
    WHERE school.diretor_id = 'c6200000-0000-0000-0000-000000000004'
  ),
  'removing a director clears both sides of the school relationship'
);

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', 'c6200000-0000-0000-0000-000000000001', true);
SELECT pg_temp.expect_management_failure(
  'PILOT_MANAGEMENT_DIRECTOR_CONFLICT',
  $$SELECT * FROM public.update_governed_school(
    'c6100000-0000-0000-0000-000000000001',
    jsonb_build_object(
      'nome', 'Escola Gestão A não deve persistir',
      'diretor_id', 'c6200000-0000-0000-0000-000000000003'
    )
  )$$
);
RESET ROLE;
SELECT pg_temp.assert_true(
  (SELECT nome = 'Escola Gestão A' FROM public.escolas WHERE id = 'c6100000-0000-0000-0000-000000000001'),
  'a rejected director reassignment leaves the school fields unchanged'
);

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', 'c6200000-0000-0000-0000-000000000001', true);
SELECT pg_temp.assert_true(
  (
    SELECT school_id IS NOT NULL AND audit_id IS NOT NULL
    FROM public.update_governed_school(
      (SELECT id FROM public.escolas WHERE codigo = 'MGMT-NEW'),
      jsonb_build_object(
        'nome', 'Escola Gestão Nova Atualizada',
        'diretor_id', 'c6200000-0000-0000-0000-000000000004'
      )
    )
  ),
  'school fields and director assignment share one governed update receipt'
);
RESET ROLE;
SELECT pg_temp.assert_true(
  (SELECT nome = 'Escola Gestão Nova Atualizada'
     AND diretor_id = 'c6200000-0000-0000-0000-000000000004'
   FROM public.escolas WHERE codigo = 'MGMT-NEW')
  AND (SELECT escola_id = (SELECT id FROM public.escolas WHERE codigo = 'MGMT-NEW')
       FROM public.users WHERE id = 'c6200000-0000-0000-0000-000000000004')
  AND (SELECT count(*) = 1 FROM public.pilot_audit_log
       WHERE event_type = 'school_updated'
         AND entity_id = (SELECT id::text FROM public.escolas WHERE codigo = 'MGMT-NEW'))
  AND (SELECT count(*) = 2 FROM public.pilot_audit_log
       WHERE event_type = 'school_director_assigned'
         AND entity_id = (SELECT id::text FROM public.escolas WHERE codigo = 'MGMT-NEW')),
  'the combined school update commits both relationship sides and both audit events'
);

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', 'c6200000-0000-0000-0000-000000000001', true);
SELECT pg_temp.expect_management_failure(
  'PILOT_MANAGEMENT_DIRECTOR_CONFLICT',
  $$SELECT * FROM public.create_governed_school(
    'Escola Gestão Falha', 'MGMT-ROLLBACK', 'fundamental',
    'c6200000-0000-0000-0000-000000000003', NULL, NULL, NULL
  )$$
);
RESET ROLE;
SELECT pg_temp.assert_true(
  (SELECT count(*) = 0 FROM public.escolas WHERE codigo = 'MGMT-ROLLBACK'),
  'an invalid director leaves no partial school row'
);

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', 'c6200000-0000-0000-0000-000000000002', true);
DO $$
DECLARE
  class_a uuid;
BEGIN
  SELECT turma_id INTO class_a
  FROM public.write_governed_turma(
    NULL,
    jsonb_build_object(
      'nome', 'Turma Gestão A',
      'serie', '3º Ano',
      'turno', 'matutino',
      'ano_letivo', 2026,
      'capacidade', 25,
      'escola_id', 'c6100000-0000-0000-0000-000000000001',
      'professor_id', 'c6200000-0000-0000-0000-000000000005'
    )
  );
  PERFORM pg_temp.assert_true(class_a IS NOT NULL, 'school director can create a class with its teacher');
  PERFORM set_config('test.governed_management_class_a_id', class_a::text, true);
END;
$$;
SELECT pg_temp.assert_true(
  (
    SELECT audit_id IS NOT NULL
    FROM public.write_governed_turma(
      current_setting('test.governed_management_class_a_id')::uuid,
      jsonb_build_object(
        'capacidade', 24,
        'professor_id', 'c6200000-0000-0000-0000-000000000005'
      )
    )
  ),
  'a class edit with the unchanged teacher returns an audit receipt'
);
SELECT pg_temp.assert_true(
  (SELECT count(*) = 1 FROM public.pilot_audit_log
   WHERE event_type = 'class_updated'
     AND entity_id = current_setting('test.governed_management_class_a_id')),
  'an unchanged teacher identity keeps the class-updated audit event'
);
SELECT pg_temp.assert_true(
  (
    SELECT audit_id IS NOT NULL
    FROM public.write_governed_turma(
      current_setting('test.governed_management_class_a_id')::uuid,
      jsonb_build_object('professor_id', 'c6200000-0000-0000-0000-000000000008')
    )
  ),
  'a changed teacher identity returns an assignment audit receipt'
);
SELECT pg_temp.assert_true(
  (SELECT professor_id = 'c6200000-0000-0000-0000-000000000008'
   FROM public.turmas WHERE id = current_setting('test.governed_management_class_a_id')::uuid)
  AND (SELECT count(*) = 1 FROM public.pilot_audit_log
       WHERE event_type = 'class_teacher_assigned'
         AND entity_id = current_setting('test.governed_management_class_a_id')),
  'only an actual teacher identity change records the assignment event'
);
SELECT pg_temp.expect_management_failure(
  'PILOT_MANAGEMENT_TEACHER_DENIED',
  $$SELECT * FROM public.write_governed_turma(
    NULL,
    jsonb_build_object(
      'nome', 'Turma Gestão Inválida',
      'serie', '3º Ano',
      'turno', 'matutino',
      'ano_letivo', 2026,
      'capacidade', 25,
      'escola_id', 'c6100000-0000-0000-0000-000000000001',
      'professor_id', 'c6200000-0000-0000-0000-000000000006'
    )
  )$$
);
SELECT pg_temp.expect_management_failure(
  'PILOT_MANAGEMENT_CLASS_INVALID',
  $$SELECT * FROM public.write_governed_turma(
    NULL,
    jsonb_build_object(
      'nome', 'Turma Gestão Forma',
      'serie', '3º Ano',
      'turno', 'matutino',
      'ano_letivo', '2026',
      'capacidade', 25,
      'escola_id', 'c6100000-0000-0000-0000-000000000001'
    )
  )$$
);

SELECT set_config('request.jwt.claim.sub', 'c6200000-0000-0000-0000-000000000003', true);
SELECT pg_temp.expect_management_failure(
  'PILOT_MANAGEMENT_CLASS_SCHOOL_DENIED',
  $$SELECT * FROM public.write_governed_turma(
    current_setting('test.governed_management_class_a_id')::uuid,
    jsonb_build_object('nome', 'Turma Gestão Violada')
  )$$
);

SELECT set_config('request.jwt.claim.sub', 'c6200000-0000-0000-0000-000000000002', true);
SELECT pg_temp.assert_true(
  (
    SELECT matricula_id IS NOT NULL
    FROM public.create_governed_enrollment(
      'c6300000-0000-0000-0000-000000000001',
      (SELECT id FROM public.turmas WHERE nome = 'Turma Gestão A'),
      2026,
      DATE '2026-02-11',
      NULL
    )
  ),
  'school director can create an active enrollment in its own class'
);
SELECT pg_temp.expect_management_failure(
  'PILOT_MANAGEMENT_ENROLLMENT_CONFLICT',
  $$SELECT * FROM public.create_governed_enrollment(
    'c6300000-0000-0000-0000-000000000001',
    (SELECT id FROM public.turmas WHERE nome = 'Turma Gestão A'),
    2026,
    DATE '2026-02-12',
    NULL
  )$$
);
SELECT pg_temp.expect_management_failure(
  'PILOT_MANAGEMENT_CLASS_YEAR_DENIED',
  $$SELECT * FROM public.write_governed_turma(
    (SELECT id FROM public.turmas WHERE nome = 'Turma Gestão A'),
    jsonb_build_object('ano_letivo', 2027)
  )$$
);
SELECT pg_temp.expect_management_failure(
  'PILOT_MANAGEMENT_CLASS_YEAR_DENIED',
  $$SELECT * FROM public.write_governed_turma(
    NULL,
    jsonb_build_object(
      'nome', 'Turma Gestão Sem Ano',
      'serie', '3º Ano',
      'turno', 'matutino',
      'ano_letivo', EXTRACT(YEAR FROM CURRENT_DATE)::integer + 1,
      'capacidade', 25,
      'escola_id', 'c6100000-0000-0000-0000-000000000001',
      'professor_id', 'c6200000-0000-0000-0000-000000000005'
    )
  )$$
);
SELECT pg_temp.assert_true(
  (SELECT count(*) = 1 FROM public.matriculas
   WHERE aluno_id = 'c6300000-0000-0000-0000-000000000001'
     AND ano_letivo = 2026
     AND situacao = 'ativa'),
  'duplicate active enrollment leaves one durable enrollment'
);

SELECT pg_temp.assert_true(
  (
    SELECT matricula_id IS NOT NULL
    FROM public.update_governed_enrollment(
      (SELECT id FROM public.matriculas WHERE aluno_id = 'c6300000-0000-0000-0000-000000000001' AND situacao = 'ativa'),
      'cancelada',
      NULL
    )
  ),
  'school director can cancel an active enrollment'
);
RESET ROLE;
SET LOCAL ROLE service_role;
UPDATE public.alunos
SET ativo = false
WHERE id = 'c6300000-0000-0000-0000-000000000001';
RESET ROLE;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', 'c6200000-0000-0000-0000-000000000002', true);
SELECT pg_temp.expect_management_failure(
  'PILOT_MANAGEMENT_STUDENT_DENIED',
  $$SELECT * FROM public.update_governed_enrollment(
    (SELECT id FROM public.matriculas WHERE aluno_id = 'c6300000-0000-0000-0000-000000000001' AND situacao = 'cancelada'),
    'ativa',
    NULL
  )$$
);
RESET ROLE;
SET LOCAL ROLE service_role;
UPDATE public.alunos
SET ativo = true
WHERE id = 'c6300000-0000-0000-0000-000000000001';
UPDATE public.turmas
SET ativo = false
WHERE nome = 'Turma Gestão A';
RESET ROLE;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', 'c6200000-0000-0000-0000-000000000002', true);
SELECT pg_temp.expect_management_failure(
  'PILOT_MANAGEMENT_CLASS_NOT_FOUND',
  $$SELECT * FROM public.update_governed_enrollment(
    (SELECT id FROM public.matriculas WHERE aluno_id = 'c6300000-0000-0000-0000-000000000001' AND situacao = 'cancelada'),
    'ativa',
    NULL
  )$$
);
RESET ROLE;
SET LOCAL ROLE service_role;
UPDATE public.turmas
SET ativo = true,
    ano_letivo = 2027
WHERE nome = 'Turma Gestão A';
RESET ROLE;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', 'c6200000-0000-0000-0000-000000000002', true);
SELECT pg_temp.expect_management_failure(
  'PILOT_MANAGEMENT_ENROLLMENT_YEAR_DENIED',
  $$SELECT * FROM public.update_governed_enrollment(
    (SELECT id FROM public.matriculas WHERE aluno_id = 'c6300000-0000-0000-0000-000000000001' AND situacao = 'cancelada'),
    'ativa',
    NULL
  )$$
);
RESET ROLE;

SET LOCAL ROLE service_role;
UPDATE public.escolas
SET ativo = false
WHERE id = 'c6100000-0000-0000-0000-000000000002';
RESET ROLE;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', 'c6200000-0000-0000-0000-000000000003', true);
SELECT pg_temp.expect_management_failure(
  'PILOT_MANAGEMENT_CLASS_SCHOOL_DENIED',
  $$SELECT * FROM public.write_governed_turma(
    NULL,
    jsonb_build_object(
      'nome', 'Turma Gestão Escola Inativa',
      'serie', '3º Ano',
      'turno', 'matutino',
      'ano_letivo', EXTRACT(YEAR FROM CURRENT_DATE)::integer,
      'capacidade', 25,
      'escola_id', 'c6100000-0000-0000-0000-000000000002',
      'professor_id', 'c6200000-0000-0000-0000-000000000006'
    )
  )$$
);
RESET ROLE;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', 'c6200000-0000-0000-0000-000000000099', true);
SELECT pg_temp.assert_true(
  public.pilot_can_manage_school('c6100000-0000-0000-0000-000000000001') = false,
  'the management helper denies an authenticated identity without a pilot profile'
);
SELECT pg_temp.expect_management_failure(
  'PILOT_MANAGEMENT_ROLE_DENIED',
  $$SELECT * FROM public.create_governed_school(
    'Escola Gestão Sem Perfil', 'MGMT-NOPROFILE', 'fundamental', NULL, NULL, NULL, NULL
  )$$
);
SELECT pg_temp.assert_true(
  (SELECT count(*) = 0 FROM public.escolas WHERE codigo = 'MGMT-NOPROFILE'),
  'an authenticated identity without an active pilot profile cannot enter SECURITY DEFINER management writes'
);
SELECT set_config('request.jwt.claim.sub', 'c6200000-0000-0000-0000-000000000007', true);
SELECT pg_temp.assert_true(
  public.pilot_can_manage_school('c6100000-0000-0000-0000-000000000001') = false,
  'the management helper denies an inactive school director'
);
RESET ROLE;
ROLLBACK;
