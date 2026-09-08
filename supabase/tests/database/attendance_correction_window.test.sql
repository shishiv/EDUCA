BEGIN;
CREATE FUNCTION pg_temp.assert_true(condition boolean, message text)
RETURNS void LANGUAGE plpgsql AS $$ BEGIN
  IF condition IS DISTINCT FROM true THEN RAISE EXCEPTION 'assertion failed: %', message; END IF;
END $$;
CREATE FUNCTION pg_temp.assert_denied(statement text, expected_prefix text)
RETURNS void LANGUAGE plpgsql AS $$ BEGIN
  BEGIN
    EXECUTE statement;
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM LIKE expected_prefix || '%' THEN RETURN; END IF;
    RAISE;
  END;
  RAISE EXCEPTION 'statement unexpectedly allowed: %', statement;
END $$;

INSERT INTO public.escolas(id, codigo, nome, tipo) VALUES
 ('c1000000-0000-0000-0000-000000000001','CW-A','Correction A','fundamental'),
 ('c1000000-0000-0000-0000-000000000002','CW-B','Correction B','fundamental');
INSERT INTO public.users(id,nome,email,tipo_usuario,escola_id,ativo) VALUES
 ('c2000000-0000-0000-0000-000000000001','Teacher A','cw.teacher@synthetic.invalid','professor','c1000000-0000-0000-0000-000000000001',true),
 ('c2000000-0000-0000-0000-000000000002','Director A','cw.director@synthetic.invalid','diretor','c1000000-0000-0000-0000-000000000001',true),
 ('c2000000-0000-0000-0000-000000000003','Director B','cw.foreign@synthetic.invalid','diretor','c1000000-0000-0000-0000-000000000002',true),
 ('c2000000-0000-0000-0000-000000000004','Admin','cw.admin@synthetic.invalid','admin',NULL,true);
INSERT INTO public.turmas(id,nome,serie,turno,ano_letivo,escola_id,professor_id) VALUES
 ('c3000000-0000-0000-0000-000000000001','Class A','1','matutino',2026,'c1000000-0000-0000-0000-000000000001','c2000000-0000-0000-0000-000000000001');
INSERT INTO public.alunos(id,nome_completo,data_nascimento,sexo,escola_id) VALUES
 ('c4000000-0000-0000-0000-000000000001','Student','2018-01-01','M','c1000000-0000-0000-0000-000000000001');
INSERT INTO public.matriculas(id,aluno_id,turma_id,ano_letivo,situacao) VALUES
 ('c5000000-0000-0000-0000-000000000001','c4000000-0000-0000-0000-000000000001','c3000000-0000-0000-0000-000000000001',2026,'ativa');


-- Coherent historical fixtures use ordinary owner INSERTs, all constraints and
-- triggers enabled. User decisions below use the real request/decision RPCs.
INSERT INTO public.turmas(id,nome,serie,turno,ano_letivo,escola_id,professor_id)
VALUES ('c3000000-0000-0000-0000-000000000002','Class ordinary','1','matutino',2026,
 'c1000000-0000-0000-0000-000000000001','c2000000-0000-0000-0000-000000000001');
INSERT INTO public.sessoes_aula(id,turma_id,escola_id,professor_id,data_aula,status,aberta_em,auto_fechamento_agendado,conteudo_programatico)
SELECT id, turma_id, 'c1000000-0000-0000-0000-000000000001',
 'c2000000-0000-0000-0000-000000000001',
 (now() AT TIME ZONE 'America/Sao_Paulo')::date + day_offset, 'ABERTA',
 now() + make_interval(days => day_offset), now() + make_interval(days => day_offset) + interval '1 day', 'Correction fixture'
FROM (VALUES
 ('c6000000-0000-0000-0000-000000000001'::uuid,'c3000000-0000-0000-0000-000000000001'::uuid,-1),
 ('c6000000-0000-0000-0000-000000000002'::uuid,'c3000000-0000-0000-0000-000000000001'::uuid,0),
 ('c6000000-0000-0000-0000-000000000003'::uuid,'c3000000-0000-0000-0000-000000000002'::uuid,0),
 ('c6000000-0000-0000-0000-000000000004'::uuid,'c3000000-0000-0000-0000-000000000001'::uuid,-2),
 ('c6000000-0000-0000-0000-000000000005'::uuid,'c3000000-0000-0000-0000-000000000001'::uuid,-3),
 ('c6000000-0000-0000-0000-000000000006'::uuid,'c3000000-0000-0000-0000-000000000001'::uuid,-4)
) AS fixture(id,turma_id,day_offset);
INSERT INTO public.frequencia(id,matricula_id,sessao_id,data_aula,status_presenca,presente)
VALUES ('c7000000-0000-0000-0000-000000000002','c5000000-0000-0000-0000-000000000001',
 'c6000000-0000-0000-0000-000000000002',current_date,'F',false);
UPDATE public.sessoes_aula SET status='FECHADA'
WHERE id IN ('c6000000-0000-0000-0000-000000000001','c6000000-0000-0000-0000-000000000005','c6000000-0000-0000-0000-000000000006');
-- A second open session on the collision date must block reopening atomically.
INSERT INTO public.sessoes_aula(id,turma_id,escola_id,professor_id,data_aula,status,aberta_em,conteudo_programatico)
SELECT 'c6000000-0000-0000-0000-000000000007',turma_id,escola_id,professor_id,data_aula,'ABERTA',now(),'Collision fixture'
FROM public.sessoes_aula WHERE id='c6000000-0000-0000-0000-000000000005';
INSERT INTO public.attendance_reopen_requests(
 sessao_id,escola_id,requested_by,request_reason,status,requested_at,decided_by,decided_at,before_state,after_state,
 approved_at,correction_window_hours,correction_deadline_at
)
SELECT 'c6000000-0000-0000-0000-000000000002','c1000000-0000-0000-0000-000000000001',
 'c2000000-0000-0000-0000-000000000001','Historical valid approval','APROVADA',approved - interval '1 hour',
 'c2000000-0000-0000-0000-000000000002',approved,'{"status":"FECHADA"}','{"status":"ABERTA"}',
 approved,hours,approved+make_interval(hours => hours)
FROM (VALUES (now()-interval '3 hours',24),(now()-interval '2 hours',1)) AS fixture(approved,hours);
-- Pre-migration approval: no backfill, hence no retroactive correction access.
INSERT INTO public.attendance_reopen_requests(
 sessao_id,escola_id,requested_by,request_reason,status,requested_at,decided_by,decided_at,before_state,after_state
) VALUES (
 'c6000000-0000-0000-0000-000000000004','c1000000-0000-0000-0000-000000000001',
 'c2000000-0000-0000-0000-000000000001','Legacy approval','APROVADA',now()-interval '2 days',
 'c2000000-0000-0000-0000-000000000002',now()-interval '2 days','{"status":"FECHADA"}','{"status":"ABERTA"}'
);

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','c2000000-0000-0000-0000-000000000003',true);
SELECT pg_temp.assert_true(public.attendance_reopen_window_hours('c1000000-0000-0000-0000-000000000002')=24,'seeded default applies');
SELECT pg_temp.assert_denied($q$SELECT public.attendance_reopen_window_hours('c1000000-0000-0000-0000-000000000001')$q$,'ATTENDANCE_REOPEN_WINDOW_READ_DENIED:');
SELECT pg_temp.assert_true(NOT public.is_session_editable('c6000000-0000-0000-0000-000000000003'),'foreign lock lookup does not expose editability');
SELECT set_config('request.jwt.claim.sub','c2000000-0000-0000-0000-000000000002',true);
SELECT public.set_attendance_reopen_window_hours('c1000000-0000-0000-0000-000000000001',2);
SELECT public.set_attendance_reopen_window_hours('c1000000-0000-0000-0000-000000000001',2);
SELECT pg_temp.assert_true((SELECT count(*)=1 FROM public.configs WHERE escola_id='c1000000-0000-0000-0000-000000000001' AND chave='attendance_reopen_window_hours'),'repeated config writes keep one override');
SELECT pg_temp.assert_denied($q$SELECT public.set_attendance_reopen_window_hours('c1000000-0000-0000-0000-000000000002',2)$q$,'ATTENDANCE_REOPEN_WINDOW_WRITE_DENIED:');
SELECT pg_temp.assert_denied($q$SELECT public.set_attendance_reopen_window_hours('c1000000-0000-0000-0000-000000000001',0)$q$,'ATTENDANCE_REOPEN_WINDOW_VALUE_INVALID:');
SELECT pg_temp.assert_denied($q$SELECT public.set_attendance_reopen_window_hours('c1000000-0000-0000-0000-000000000001',169)$q$,'ATTENDANCE_REOPEN_WINDOW_VALUE_INVALID:');
UPDATE public.configs SET valor='100' WHERE chave='attendance_reopen_window_hours';
SELECT pg_temp.assert_true(public.attendance_reopen_window_hours('c1000000-0000-0000-0000-000000000001')=2,'direct table update cannot change window config');
SELECT set_config('request.jwt.claim.sub','c2000000-0000-0000-0000-000000000001',true);
SELECT pg_temp.assert_denied($q$SELECT public.set_attendance_reopen_window_hours('c1000000-0000-0000-0000-000000000001',3)$q$,'ATTENDANCE_REOPEN_WINDOW_WRITE_DENIED:');
SELECT public.request_attendance_reopen('c6000000-0000-0000-0000-000000000001','Corrigir a chamada histórica após conferência.');
SELECT public.request_attendance_reopen('c6000000-0000-0000-0000-000000000005','Collision request');
SELECT public.request_attendance_reopen('c6000000-0000-0000-0000-000000000006','Rejection request');
SELECT pg_temp.assert_denied($q$SELECT public.decide_attendance_reopen((SELECT id FROM public.attendance_reopen_requests WHERE sessao_id='c6000000-0000-0000-0000-000000000001'),'APROVADA')$q$,'ATTENDANCE_REOPEN_ROLE_DENIED:');
SELECT set_config('request.jwt.claim.sub','c2000000-0000-0000-0000-000000000003',true);
SELECT pg_temp.assert_true((SELECT count(*)=0 FROM public.attendance_reopen_requests),'foreign school cannot read requests');
SELECT pg_temp.assert_true((SELECT count(*)=0 FROM public.configs WHERE escola_id='c1000000-0000-0000-0000-000000000001' AND chave='attendance_reopen_window_hours'),'foreign override is isolated');
SELECT set_config('request.jwt.claim.sub','c2000000-0000-0000-0000-000000000002',true);
SELECT public.decide_attendance_reopen((SELECT id FROM public.attendance_reopen_requests WHERE sessao_id='c6000000-0000-0000-0000-000000000001'),'APROVADA');
SELECT pg_temp.assert_true((SELECT correction_window_hours=2 AND approved_at=decided_at AND correction_deadline_at=approved_at+interval '2 hours' FROM public.attendance_reopen_requests WHERE sessao_id='c6000000-0000-0000-0000-000000000001'),'approval captures exact configured window');
SELECT public.set_attendance_reopen_window_hours('c1000000-0000-0000-0000-000000000001',8);
SELECT pg_temp.assert_true((SELECT correction_window_hours=2 FROM public.attendance_reopen_requests WHERE sessao_id='c6000000-0000-0000-0000-000000000001'),'later config does not extend captured window');
SELECT pg_temp.assert_denied($q$SELECT public.decide_attendance_reopen((SELECT id FROM public.attendance_reopen_requests WHERE sessao_id='c6000000-0000-0000-0000-000000000001'),'APROVADA')$q$,'ATTENDANCE_REOPEN_ALREADY_DECIDED:');
SELECT public.decide_attendance_reopen((SELECT id FROM public.attendance_reopen_requests WHERE sessao_id='c6000000-0000-0000-0000-000000000006'),'REJEITADA','Sem evidência para alteração.');
SELECT pg_temp.assert_true((SELECT approved_at IS NULL AND correction_window_hours IS NULL AND correction_deadline_at IS NULL FROM public.attendance_reopen_requests WHERE sessao_id='c6000000-0000-0000-0000-000000000006'),'rejection grants no window');
SELECT pg_temp.assert_denied($q$SELECT public.decide_attendance_reopen((SELECT id FROM public.attendance_reopen_requests WHERE sessao_id='c6000000-0000-0000-0000-000000000005'),'APROVADA')$q$,'duplicate key value violates unique constraint');
SELECT pg_temp.assert_true((SELECT status='PENDENTE' AND approved_at IS NULL FROM public.attendance_reopen_requests WHERE sessao_id='c6000000-0000-0000-0000-000000000005'),'collision rolls back request decision');
SELECT pg_temp.assert_true((SELECT status='FECHADA' AND hash_legal IS NOT NULL FROM public.sessoes_aula WHERE id='c6000000-0000-0000-0000-000000000005'),'collision preserves closed session');

SELECT set_config('request.jwt.claim.sub','c2000000-0000-0000-0000-000000000001',true);
SELECT pg_temp.assert_true(public.is_session_editable('c6000000-0000-0000-0000-000000000001'),'past-day correction is editable inside approved window');
INSERT INTO public.frequencia(id,matricula_id,sessao_id,data_aula,status_presenca,presente,professor_id,marcado_por)
VALUES ('c7000000-0000-0000-0000-000000000001','c5000000-0000-0000-0000-000000000001','c6000000-0000-0000-0000-000000000001',current_date,'F',true,'c2000000-0000-0000-0000-000000000002','c2000000-0000-0000-0000-000000000002');
SELECT pg_temp.assert_true((SELECT data_aula=(now() AT TIME ZONE 'America/Sao_Paulo')::date-1 AND NOT presente AND professor_id='c2000000-0000-0000-0000-000000000001' AND marcado_por=professor_id FROM public.frequencia WHERE id='c7000000-0000-0000-0000-000000000001'),'date, teacher, actor and presence remain derived');
SELECT pg_temp.assert_denied($q$UPDATE public.frequencia SET status_presenca='J' WHERE id='c7000000-0000-0000-0000-000000000001'$q$,'ATTENDANCE_JUSTIFICATION_REQUIRED:');
UPDATE public.frequencia SET status_presenca='J',justificativa='Ausência conferida' WHERE id='c7000000-0000-0000-0000-000000000001';
UPDATE public.frequencia SET status_presenca='A' WHERE id='c7000000-0000-0000-0000-000000000001';
UPDATE public.frequencia SET status_presenca='P' WHERE id='c7000000-0000-0000-0000-000000000001';
SELECT pg_temp.assert_true((SELECT presente AND modificado_em IS NOT NULL FROM public.frequencia WHERE id='c7000000-0000-0000-0000-000000000001'),'corrections preserve presence normalization and timestamps');
UPDATE public.sessoes_aula SET status='FECHADA' WHERE id='c6000000-0000-0000-0000-000000000001';
SELECT pg_temp.assert_true((SELECT status='FECHADA' AND hash_legal IS NOT NULL AND travada_em IS NOT NULL FROM public.sessoes_aula WHERE id='c6000000-0000-0000-0000-000000000001'),'correction closes and restores immutable hash');
SELECT pg_temp.assert_true(NOT public.is_session_editable('c6000000-0000-0000-0000-000000000001'),'closed state overrides live correction window');
SELECT pg_temp.assert_denied($q$UPDATE public.frequencia SET status_presenca='F' WHERE id='c7000000-0000-0000-0000-000000000001'$q$,'ATTENDANCE_SESSION_IMMUTABLE:');

-- Expiry is exercised on a STILL OPEN session, before its normal cutoff. The
-- latest approval overrides both the ordinary day and an older, longer window.
SELECT pg_temp.assert_true((SELECT status='ABERTA' AND auto_fechamento_agendado>now() AND data_aula=(now() AT TIME ZONE 'America/Sao_Paulo')::date FROM public.sessoes_aula WHERE id='c6000000-0000-0000-0000-000000000002'),'expiry fixture is still open and inside ordinary time');
SELECT pg_temp.assert_true(public.is_session_editable('c6000000-0000-0000-0000-000000000003'),'ordinary session without approval remains editable');
SELECT pg_temp.assert_true(NOT public.is_session_editable('c6000000-0000-0000-0000-000000000002'),'expired latest window prevails');
SELECT pg_temp.assert_true(NOT public.is_session_editable('c6000000-0000-0000-0000-000000000004'),'legacy approval has no retroactive access');
SELECT pg_temp.assert_denied($q$UPDATE public.frequencia SET status_presenca='P' WHERE id='c7000000-0000-0000-0000-000000000002'$q$,'ATTENDANCE_SESSION_IMMUTABLE:');
SELECT pg_temp.assert_denied($q$DELETE FROM public.frequencia WHERE id='c7000000-0000-0000-0000-000000000002'$q$,'permission denied');
SELECT pg_temp.assert_denied($q$INSERT INTO public.frequencia(matricula_id,sessao_id,data_aula,status_presenca,presente) VALUES ('c5000000-0000-0000-0000-000000000001','c6000000-0000-0000-0000-000000000002',current_date,'P',true)$q$,'ATTENDANCE_SESSION_IMMUTABLE:');
SELECT pg_temp.assert_denied($q$UPDATE public.sessoes_aula SET status='FECHADA' WHERE id='c6000000-0000-0000-0000-000000000002'$q$,'ATTENDANCE_SESSION_IMMUTABLE:');
SELECT pg_temp.assert_denied($q$UPDATE public.attendance_reopen_requests SET correction_deadline_at=now()+interval '1 day'$q$,'permission denied');
SELECT pg_temp.assert_denied($q$SELECT public.attendance_session_within_window('c6000000-0000-0000-0000-000000000002')$q$,'permission denied');

RESET ROLE;
SELECT pg_temp.assert_denied($q$DELETE FROM public.frequencia WHERE id='c7000000-0000-0000-0000-000000000002'$q$,'ATTENDANCE_SESSION_IMMUTABLE:');
-- Even broad internal UPDATE rights cannot rewrite a decided window.
SELECT pg_temp.assert_denied($q$UPDATE public.attendance_reopen_requests SET correction_deadline_at=correction_deadline_at+interval '1 hour' WHERE sessao_id='c6000000-0000-0000-0000-000000000001'$q$,'ATTENDANCE_REOPEN_DECISION_IMMUTABLE:');
SELECT pg_temp.assert_true(EXISTS(SELECT 1 FROM public.audit_trail WHERE tabela='attendance_reopen_requests' AND sessao_id='c6000000-0000-0000-0000-000000000001' AND dados_novos->>'correction_window_hours'='2' AND dados_novos->>'correction_deadline_at' IS NOT NULL AND usuario_id='c2000000-0000-0000-0000-000000000002'),'canonical audit records actor and captured deadline');
SELECT pg_temp.assert_true(EXISTS(SELECT 1 FROM public.audit_trail WHERE tabela='frequencia' AND sessao_id='c6000000-0000-0000-0000-000000000001' AND operacao='update' AND usuario_id='c2000000-0000-0000-0000-000000000001'),'correction writes remain audited');
SELECT pg_temp.assert_true(EXISTS(SELECT 1 FROM public.pilot_audit_log WHERE event_type='attendance_reopen_decided' AND entity_id='c6000000-0000-0000-0000-000000000001'),'pilot decision receipt remains present');
UPDATE public.users SET ativo=false WHERE id='c2000000-0000-0000-0000-000000000002';
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','c2000000-0000-0000-0000-000000000002',true);
SELECT pg_temp.assert_denied($q$SELECT public.set_attendance_reopen_window_hours('c1000000-0000-0000-0000-000000000001',3)$q$,'ATTENDANCE_REOPEN_WINDOW_WRITE_DENIED:');
SELECT pg_temp.assert_denied($q$SELECT public.attendance_reopen_window_hours('c1000000-0000-0000-0000-000000000001')$q$,'ATTENDANCE_REOPEN_WINDOW_READ_DENIED:');
RESET ROLE;
ROLLBACK;
