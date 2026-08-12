BEGIN;

SELECT set_config(
  'educa.attendance_test_date',
  ((now() AT TIME ZONE 'America/Sao_Paulo')::date)::text,
  true
);

CREATE FUNCTION pg_temp.assert_true(condition boolean, message text)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF condition IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'assertion failed: %', message;
  END IF;
END;
$$;

INSERT INTO public.escolas(id, codigo, nome, tipo) VALUES
  ('12000000-0000-0000-0000-000000000001','REOPEN-A','Escola Reabertura A','fundamental'),
  ('12000000-0000-0000-0000-000000000002','REOPEN-B','Escola Reabertura B','fundamental');

INSERT INTO public.users(id, nome, email, tipo_usuario, escola_id, ativo) VALUES
  ('22000000-0000-0000-0000-000000000001','Professor Reabertura A','reopen.prof.a@synthetic.invalid','professor','12000000-0000-0000-0000-000000000001',true),
  ('22000000-0000-0000-0000-000000000002','Diretor Reabertura A','reopen.dir.a@synthetic.invalid','diretor','12000000-0000-0000-0000-000000000001',true),
  ('22000000-0000-0000-0000-000000000003','Diretor Reabertura B','reopen.dir.b@synthetic.invalid','diretor','12000000-0000-0000-0000-000000000002',true),
  ('22000000-0000-0000-0000-000000000004','Secretaria Reabertura','reopen.secretaria@synthetic.invalid','secretario',NULL,true),
  ('22000000-0000-0000-0000-000000000005','Admin Reabertura','reopen.admin@synthetic.invalid','admin',NULL,true);

INSERT INTO public.turmas(id, nome, serie, turno, ano_letivo, escola_id, professor_id) VALUES
  ('32000000-0000-0000-0000-000000000001','Turma Reabertura A','1 ano','matutino',2026,'12000000-0000-0000-0000-000000000001','22000000-0000-0000-0000-000000000001');

INSERT INTO public.alunos(id, nome_completo, data_nascimento, sexo, escola_id) VALUES
  ('42000000-0000-0000-0000-000000000001','Aluno Reabertura A','2018-01-01','M','12000000-0000-0000-0000-000000000001');

INSERT INTO public.matriculas(id, aluno_id, turma_id, ano_letivo, situacao) VALUES
  ('52000000-0000-0000-0000-000000000001','42000000-0000-0000-0000-000000000001','32000000-0000-0000-0000-000000000001',2026,'ativa');

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','22000000-0000-0000-0000-000000000001',true);

INSERT INTO public.sessoes_aula(
  id, turma_id, escola_id, professor_id, data_aula, status,
  aberta_em, conteudo_programatico
) VALUES (
  '62000000-0000-0000-0000-000000000001',
  '32000000-0000-0000-0000-000000000001',
  '12000000-0000-0000-0000-000000000001',
  '22000000-0000-0000-0000-000000000001',
  current_setting('educa.attendance_test_date')::date,
  'ABERTA', now(), 'Chamada de reabertura'
);

INSERT INTO public.frequencia(
  id, matricula_id, sessao_id, data_aula, status_presenca,
  presente, professor_id, marcado_por
) VALUES (
  '72000000-0000-0000-0000-000000000001',
  '52000000-0000-0000-0000-000000000001',
  '62000000-0000-0000-0000-000000000001',
  current_setting('educa.attendance_test_date')::date,
  'F', false,
  '22000000-0000-0000-0000-000000000005',
  '22000000-0000-0000-0000-000000000005'
);

UPDATE public.sessoes_aula
SET status = 'FECHADA', fechada_em = now()
WHERE id = '62000000-0000-0000-0000-000000000001';

SELECT pg_temp.assert_true(
  (SELECT status = 'FECHADA' AND hash_legal IS NOT NULL AND travada_em IS NOT NULL
   FROM public.sessoes_aula
   WHERE id = '62000000-0000-0000-0000-000000000001'),
  'canonical close still creates the immutable session state'
);

DO $$
BEGIN
  BEGIN
    UPDATE public.sessoes_aula SET status = 'ABERTA'
    WHERE id = '62000000-0000-0000-0000-000000000001';
    RAISE EXCEPTION 'closed session direct reopen unexpectedly succeeded';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM NOT LIKE 'ATTENDANCE_SESSION_IMMUTABLE:%' THEN RAISE; END IF;
  END;
END;
$$;

DO $$
BEGIN
  BEGIN
    PERFORM public.request_attendance_reopen(
      '62000000-0000-0000-0000-000000000001',
      '   '
    );
    RAISE EXCEPTION 'blank reopen reason unexpectedly succeeded';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM NOT LIKE 'ATTENDANCE_REOPEN_REASON_REQUIRED:%' THEN RAISE; END IF;
  END;
END;
$$;

SELECT public.request_attendance_reopen(
  '62000000-0000-0000-0000-000000000001',
  'Corrigir a falta registrada após conferência do diário.'
);

SELECT pg_temp.assert_true(
  (SELECT count(*) = 1
   FROM public.attendance_reopen_requests
   WHERE sessao_id = '62000000-0000-0000-0000-000000000001'
     AND status = 'PENDENTE'
     AND requested_by = '22000000-0000-0000-0000-000000000001'
     AND requested_at IS NOT NULL
     AND before_state->>'status' = 'FECHADA'
     AND after_state IS NULL),
  'teacher request records owner, time and closed before-state'
);

DO $$
DECLARE
  inserted_count bigint := 0;
BEGIN
  BEGIN
    INSERT INTO public.attendance_reopen_requests(
      sessao_id, escola_id, requested_by, request_reason, before_state
    ) VALUES (
      '62000000-0000-0000-0000-000000000001',
      '12000000-0000-0000-0000-000000000001',
      '22000000-0000-0000-0000-000000000001',
      'direct insert must be denied',
      '{}'::jsonb
    );
    GET DIAGNOSTICS inserted_count = ROW_COUNT;
  EXCEPTION WHEN insufficient_privilege THEN
    inserted_count := 0;
  END;
  PERFORM pg_temp.assert_true(
    inserted_count = 0,
    'direct reopen request INSERT was not blocked'
  );
END;
$$;

DO $$
BEGIN
  BEGIN
    PERFORM public.request_attendance_reopen(
      '62000000-0000-0000-0000-000000000001',
      'Segundo pedido para a mesma sessão.'
    );
    RAISE EXCEPTION 'duplicate pending reopen request unexpectedly succeeded';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM NOT LIKE 'ATTENDANCE_REOPEN_PENDING:%' THEN RAISE; END IF;
  END;
END;
$$;

DO $$
BEGIN
  BEGIN
    PERFORM public.decide_attendance_reopen(
      (SELECT id FROM public.attendance_reopen_requests
       WHERE sessao_id = '62000000-0000-0000-0000-000000000001'),
      'APROVADA',
      NULL
    );
    RAISE EXCEPTION 'teacher decision unexpectedly succeeded';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM NOT LIKE 'ATTENDANCE_REOPEN_ROLE_DENIED:%' THEN RAISE; END IF;
  END;
END;
$$;

SELECT set_config('request.jwt.claim.sub','22000000-0000-0000-0000-000000000003',true);
SELECT pg_temp.assert_true(
  (SELECT count(*) = 0 FROM public.attendance_reopen_requests),
  'foreign director cannot read another school request'
);

DO $$
BEGIN
  BEGIN
    PERFORM public.decide_attendance_reopen(
      (SELECT id FROM public.attendance_reopen_requests
       WHERE sessao_id = '62000000-0000-0000-0000-000000000001'),
      'APROVADA',
      NULL
    );
    RAISE EXCEPTION 'foreign director decision unexpectedly succeeded';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM NOT LIKE 'ATTENDANCE_REOPEN_SCHOOL_DENIED:%'
       AND SQLERRM NOT LIKE 'ATTENDANCE_REOPEN_REQUEST_NOT_FOUND:%' THEN
      RAISE;
    END IF;
  END;
END;
$$;

SELECT set_config('request.jwt.claim.sub','22000000-0000-0000-0000-000000000004',true);
SELECT pg_temp.assert_true(
  (SELECT count(*) = 0 FROM public.attendance_reopen_requests),
  'secretariat cannot read reopen requests'
);

DO $$
BEGIN
  BEGIN
    PERFORM public.request_attendance_reopen(
      '62000000-0000-0000-0000-000000000001',
      'Secretaria não pode solicitar.'
    );
    RAISE EXCEPTION 'secretariat request unexpectedly succeeded';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM NOT LIKE 'ATTENDANCE_REOPEN_ROLE_DENIED:%' THEN RAISE; END IF;
  END;
END;
$$;

SELECT set_config('request.jwt.claim.sub','22000000-0000-0000-0000-000000000002',true);
SELECT public.decide_attendance_reopen(
  (SELECT id FROM public.attendance_reopen_requests
   WHERE sessao_id = '62000000-0000-0000-0000-000000000001'),
  'APROVADA',
  NULL
);

SELECT pg_temp.assert_true(
  (SELECT status = 'ABERTA' AND fechada_em IS NULL AND travada_em IS NULL AND hash_legal IS NULL
   FROM public.sessoes_aula
   WHERE id = '62000000-0000-0000-0000-000000000001'),
  'director approval reopens only the canonical session through the workflow'
);
SELECT pg_temp.assert_true(
  (SELECT status = 'APROVADA'
      AND decided_by = '22000000-0000-0000-0000-000000000002'
      AND decided_at IS NOT NULL
      AND before_state->>'status' = 'FECHADA'
      AND after_state->>'status' = 'ABERTA'
   FROM public.attendance_reopen_requests
   WHERE sessao_id = '62000000-0000-0000-0000-000000000001'),
  'approval records director, decision time and after-state'
);
RESET ROLE;
SELECT pg_temp.assert_true(
  (SELECT count(*) >= 2
   FROM public.audit_trail
   WHERE tabela = 'attendance_reopen_requests'
     AND sessao_id = '62000000-0000-0000-0000-000000000001'
     AND dados_novos IS NOT NULL),
  'reopen request audit rows bind to the canonical session'
);
SELECT pg_temp.assert_true(
  (SELECT count(*) = 1
   FROM public.pilot_audit_log
   WHERE event_type = 'attendance_reopen_requested'
     AND entity_type = 'sessoes_aula'
     AND entity_id = '62000000-0000-0000-0000-000000000001'
     AND escola_id = '12000000-0000-0000-0000-000000000001'
     AND redacted_metadata->>'before_status' = 'FECHADA'),
  'request writes an allowlisted audit event on the canonical session'
);
SELECT pg_temp.assert_true(
  (SELECT count(*) = 1
   FROM public.pilot_audit_log
   WHERE event_type = 'attendance_reopen_decided'
     AND entity_type = 'sessoes_aula'
     AND entity_id = '62000000-0000-0000-0000-000000000001'
     AND escola_id = '12000000-0000-0000-0000-000000000001'
     AND redacted_metadata->>'decision' = 'APROVADA'),
  'approval writes an allowlisted audit event on the canonical session'
);

SELECT pg_temp.assert_true(
  NOT has_table_privilege('authenticated', 'public.attendance_reopen_requests', 'TRUNCATE')
    AND NOT has_table_privilege('anon', 'public.attendance_reopen_requests', 'TRUNCATE'),
  'browser roles cannot truncate attendance reopen requests'
);

SET LOCAL ROLE authenticated;
DO $$
BEGIN
  BEGIN
    TRUNCATE TABLE public.attendance_reopen_requests;
    RAISE EXCEPTION 'authenticated TRUNCATE unexpectedly succeeded';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;
END;
$$;
RESET ROLE;
SELECT pg_temp.assert_true(
  (SELECT count(*) = 1
   FROM public.attendance_reopen_requests
   WHERE sessao_id = '62000000-0000-0000-0000-000000000001'
     AND status = 'APROVADA'),
  'reopen request remains after rejected authenticated TRUNCATE'
);

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','22000000-0000-0000-0000-000000000001',true);
UPDATE public.frequencia
SET status_presenca = 'P', justificativa = NULL
WHERE id = '72000000-0000-0000-0000-000000000001';
UPDATE public.sessoes_aula
SET status = 'FECHADA', fechada_em = now()
WHERE id = '62000000-0000-0000-0000-000000000001';
SELECT pg_temp.assert_true(
  (SELECT status = 'FECHADA' AND hash_legal IS NOT NULL
   FROM public.sessoes_aula
   WHERE id = '62000000-0000-0000-0000-000000000001'),
  'reopened session can follow the canonical mark and close path again'
);

INSERT INTO public.sessoes_aula(
  id, turma_id, escola_id, professor_id, data_aula, status,
  aberta_em, conteudo_programatico
) VALUES (
  '62000000-0000-0000-0000-000000000002',
  '32000000-0000-0000-0000-000000000001',
  '12000000-0000-0000-0000-000000000001',
  '22000000-0000-0000-0000-000000000001',
  current_setting('educa.attendance_test_date')::date,
  'ABERTA', now(), 'Chamada de rejeição'
);
UPDATE public.sessoes_aula
SET status = 'FECHADA', fechada_em = now()
WHERE id = '62000000-0000-0000-0000-000000000002';
SELECT public.request_attendance_reopen(
  '62000000-0000-0000-0000-000000000002',
  'Revisar a conferência antes de qualquer alteração.'
);

SELECT set_config('request.jwt.claim.sub','22000000-0000-0000-0000-000000000002',true);
SELECT public.decide_attendance_reopen(
  (SELECT id FROM public.attendance_reopen_requests
   WHERE sessao_id = '62000000-0000-0000-0000-000000000002'),
  'REJEITADA',
  'A conferência apresentada não comprova a alteração.'
);
SELECT pg_temp.assert_true(
  (SELECT status = 'FECHADA'
   FROM public.sessoes_aula
   WHERE id = '62000000-0000-0000-0000-000000000002'),
  'rejection preserves the closed canonical session'
);
SELECT pg_temp.assert_true(
  (SELECT status = 'REJEITADA'
      AND decided_at IS NOT NULL
      AND after_state->>'status' = 'FECHADA'
   FROM public.attendance_reopen_requests
   WHERE sessao_id = '62000000-0000-0000-0000-000000000002'),
  'rejection records its decision time and unchanged after-state'
);

-- Conflict regression: a different open session for the same class and date
-- must keep the database invariant when approval tries to reopen this session.
SELECT set_config('request.jwt.claim.sub','22000000-0000-0000-0000-000000000001',true);
INSERT INTO public.sessoes_aula(
  id, turma_id, escola_id, professor_id, data_aula, status,
  aberta_em, conteudo_programatico
) VALUES (
  '62000000-0000-0000-0000-000000000003',
  '32000000-0000-0000-0000-000000000001',
  '12000000-0000-0000-0000-000000000001',
  '22000000-0000-0000-0000-000000000001',
  current_setting('educa.attendance_test_date')::date,
  'ABERTA', now(), 'Chamada de conflito de reabertura'
);
UPDATE public.sessoes_aula
SET status = 'FECHADA', fechada_em = now()
WHERE id = '62000000-0000-0000-0000-000000000003';
INSERT INTO public.sessoes_aula(
  id, turma_id, escola_id, professor_id, data_aula, status,
  aberta_em, conteudo_programatico
) VALUES (
  '62000000-0000-0000-0000-000000000004',
  '32000000-0000-0000-0000-000000000001',
  '12000000-0000-0000-0000-000000000001',
  '22000000-0000-0000-0000-000000000001',
  current_setting('educa.attendance_test_date')::date,
  'ABERTA', now(), 'Sessão aberta que bloqueia a reabertura'
);
SELECT public.request_attendance_reopen(
  '62000000-0000-0000-0000-000000000003',
  'Corrigir a falta após conferir o diário.'
);

SELECT set_config('request.jwt.claim.sub','22000000-0000-0000-0000-000000000002',true);
DO $$
BEGIN
  BEGIN
    PERFORM public.decide_attendance_reopen(
      (SELECT id FROM public.attendance_reopen_requests
       WHERE sessao_id = '62000000-0000-0000-0000-000000000003'
         AND status = 'PENDENTE'),
      'APROVADA',
      NULL
    );
    RAISE EXCEPTION 'open-session conflict unexpectedly succeeded';
  EXCEPTION WHEN unique_violation THEN
    IF SQLERRM NOT LIKE '%idx_sessoes_aula_open_turma_date%' THEN RAISE; END IF;
  END;
END;
$$;
SELECT pg_temp.assert_true(
  (SELECT status = 'FECHADA'
   FROM public.sessoes_aula
   WHERE id = '62000000-0000-0000-0000-000000000003'),
  'open-session conflict preserves the requested closed session'
);
SELECT pg_temp.assert_true(
  (SELECT status = 'ABERTA'
   FROM public.sessoes_aula
   WHERE id = '62000000-0000-0000-0000-000000000004'),
  'open-session conflict preserves the existing open session'
);
SELECT pg_temp.assert_true(
  (SELECT status = 'PENDENTE'
      AND decided_by IS NULL
      AND decided_at IS NULL
      AND after_state IS NULL
   FROM public.attendance_reopen_requests
   WHERE sessao_id = '62000000-0000-0000-0000-000000000003'
     AND status = 'PENDENTE'),
  'open-session conflict does not create a false approval or state transition'
);
SELECT pg_temp.assert_true(
  (SELECT count(*) = 0
   FROM public.pilot_audit_log
   WHERE event_type = 'attendance_reopen_decided'
     AND entity_id = '62000000-0000-0000-0000-000000000003'),
  'open-session conflict does not create a decision audit event'
);
SELECT pg_temp.assert_true(
  (SELECT indexdef LIKE '%UNIQUE INDEX idx_sessoes_aula_open_turma_date%'
      AND indexdef LIKE '%PLANEJADA%'
      AND indexdef LIKE '%ABERTA%'
   FROM pg_indexes
   WHERE schemaname = 'public'
     AND indexname = 'idx_sessoes_aula_open_turma_date'),
  'open-session uniqueness invariant remains present and scoped to planned/open sessions'
);

-- Deliberate break: a permissive browser INSERT must make the independent
-- direct-write oracle red, then the savepoint restores the production guard.
SELECT set_config('request.jwt.claim.sub','22000000-0000-0000-0000-000000000001',true);
RESET ROLE;
SAVEPOINT deliberate_reopen_write_break;
GRANT INSERT ON public.attendance_reopen_requests TO authenticated;
CREATE POLICY attendance_reopen_deliberate_insert_break
  ON public.attendance_reopen_requests
  FOR INSERT TO authenticated
  WITH CHECK (true);
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','22000000-0000-0000-0000-000000000001',true);
INSERT INTO public.attendance_reopen_requests(
  id, sessao_id, escola_id, requested_by, request_reason, before_state
) VALUES (
  '82000000-0000-0000-0000-000000000001',
  '62000000-0000-0000-0000-000000000002',
  '12000000-0000-0000-0000-000000000001',
  '22000000-0000-0000-0000-000000000001',
  'deliberate break',
  '{}'::jsonb
);
DO $$
BEGIN
  BEGIN
    PERFORM pg_temp.assert_true(
      (SELECT count(*) = 0
       FROM public.attendance_reopen_requests
       WHERE id = '82000000-0000-0000-0000-000000000001'),
      'direct reopen request INSERT was not blocked'
    );
    RAISE EXCEPTION 'deliberate reopen write break did not turn red';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM NOT LIKE 'assertion failed: direct reopen request INSERT was not blocked' THEN RAISE; END IF;
  END;
END;
$$;
ROLLBACK TO SAVEPOINT deliberate_reopen_write_break;

RESET ROLE;
ROLLBACK;
