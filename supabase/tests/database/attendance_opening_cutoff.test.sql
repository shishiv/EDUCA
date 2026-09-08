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

INSERT INTO public.escolas(id,codigo,nome,tipo) VALUES
 ('d1000000-0000-0000-0000-000000000001','OC-A','Opening A','fundamental'),
 ('d1000000-0000-0000-0000-000000000002','OC-B','Opening B','fundamental');
INSERT INTO public.users(id,nome,email,tipo_usuario,escola_id,ativo) VALUES
 ('d2000000-0000-0000-0000-000000000001','Teacher A','oc.teacher@synthetic.invalid','professor','d1000000-0000-0000-0000-000000000001',true),
 ('d2000000-0000-0000-0000-000000000002','Director A','oc.director@synthetic.invalid','diretor','d1000000-0000-0000-0000-000000000001',true),
 ('d2000000-0000-0000-0000-000000000003','Director B','oc.foreign@synthetic.invalid','diretor','d1000000-0000-0000-0000-000000000002',true),
 ('d2000000-0000-0000-0000-000000000004','Admin','oc.admin@synthetic.invalid','admin',NULL,true);
INSERT INTO public.turmas(id,nome,serie,turno,ano_letivo,escola_id,professor_id) VALUES
 ('d3000000-0000-0000-0000-000000000001','Class A','1','matutino',2026,'d1000000-0000-0000-0000-000000000001','d2000000-0000-0000-0000-000000000001'),
 ('d3000000-0000-0000-0000-000000000002','Class planned','1','matutino',2026,'d1000000-0000-0000-0000-000000000001','d2000000-0000-0000-0000-000000000001');
INSERT INTO public.alunos(id,nome_completo,data_nascimento,sexo,escola_id)
VALUES ('d4000000-0000-0000-0000-000000000001','Student','2018-01-01','M','d1000000-0000-0000-0000-000000000001');
INSERT INTO public.matriculas(id,aluno_id,turma_id,ano_letivo,situacao)
VALUES ('d5000000-0000-0000-0000-000000000001','d4000000-0000-0000-0000-000000000001','d3000000-0000-0000-0000-000000000001',2026,'ativa');

-- Trusted fixtures retain their historical timestamps with all triggers active.
INSERT INTO public.sessoes_aula(id,turma_id,escola_id,professor_id,data_aula,status,aberta_em,auto_fechamento_agendado,conteudo_programatico)
VALUES ('d6000000-0000-0000-0000-000000000007','d3000000-0000-0000-0000-000000000001',
 'd1000000-0000-0000-0000-000000000001','d2000000-0000-0000-0000-000000000001',
 (clock_timestamp() AT TIME ZONE 'America/Sao_Paulo')::date-1,'ABERTA',now()-interval '2 days',now()-interval '1 day','Historical seed');
UPDATE public.sessoes_aula SET status='FECHADA' WHERE id='d6000000-0000-0000-0000-000000000007';
SELECT pg_temp.assert_true((SELECT aberta_em=now()-interval '2 days' AND auto_fechamento_agendado=now()-interval '1 day'
 FROM public.sessoes_aula WHERE id='d6000000-0000-0000-0000-000000000007'),'trusted historical timestamps are preserved');
INSERT INTO public.sessoes_aula(id,turma_id,escola_id,professor_id,data_aula,status,conteudo_programatico)
VALUES ('d6000000-0000-0000-0000-000000000008','d3000000-0000-0000-0000-000000000002',
 'd1000000-0000-0000-0000-000000000001','d2000000-0000-0000-0000-000000000001',
 (clock_timestamp() AT TIME ZONE 'America/Sao_Paulo')::date,'PLANEJADA','Planned seed');
SELECT pg_temp.assert_true(public.attendance_daily_cutoff('d1000000-0000-0000-0000-000000000001')='18:00:00'::time,'seeded school default');
SELECT pg_temp.assert_true(NOT has_function_privilege('anon','public.set_attendance_daily_cutoff(uuid,time)','EXECUTE'),'anonymous configuration denied');

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','d2000000-0000-0000-0000-000000000002',true);
-- An explicit persisted fixture policy makes these openings independent of
-- the hour at which the suite runs. The expired policy is tested below.
SELECT public.set_attendance_daily_cutoff('d1000000-0000-0000-0000-000000000001','24:00:00');
SELECT public.set_attendance_daily_cutoff('d1000000-0000-0000-0000-000000000001','24:00:00');
SELECT pg_temp.assert_true((SELECT count(*)=1 FROM public.configs WHERE chave='attendance_daily_cutoff' AND escola_id='d1000000-0000-0000-0000-000000000001'),'one override per school');
SELECT pg_temp.assert_denied($q$SELECT public.attendance_daily_cutoff('d1000000-0000-0000-0000-000000000001')$q$,'permission denied');
SELECT pg_temp.assert_denied($q$SELECT public.set_attendance_daily_cutoff('d1000000-0000-0000-0000-000000000002','24:00:00')$q$,'ATTENDANCE_CUTOFF_WRITE_DENIED:');
SELECT pg_temp.assert_denied($q$SELECT public.set_attendance_daily_cutoff('d1000000-0000-0000-0000-000000000001',NULL)$q$,'ATTENDANCE_CUTOFF_VALUE_INVALID:');
UPDATE public.configs SET valor='00:00:00' WHERE chave='attendance_daily_cutoff';
SELECT pg_temp.assert_true((SELECT valor='24:00:00' FROM public.configs WHERE chave='attendance_daily_cutoff' AND escola_id='d1000000-0000-0000-0000-000000000001'),'direct table updates do not change policy');
SELECT pg_temp.assert_denied($q$INSERT INTO public.configs(chave,valor,escola_id) VALUES ('attendance_daily_cutoff','12:00:00','d1000000-0000-0000-0000-000000000002')$q$,'permission denied');
SELECT set_config('request.jwt.claim.sub','d2000000-0000-0000-0000-000000000003',true);
SELECT pg_temp.assert_true((SELECT count(*)=0 FROM public.configs WHERE chave='attendance_daily_cutoff' AND escola_id='d1000000-0000-0000-0000-000000000001'),'school override is isolated');
SELECT set_config('request.jwt.claim.sub','d2000000-0000-0000-0000-000000000004',true);
SELECT pg_temp.assert_denied($q$SELECT public.set_attendance_daily_cutoff('d1000000-0000-0000-0000-000000000001','24:00:00')$q$,'ATTENDANCE_CUTOFF_WRITE_DENIED:');
SELECT set_config('request.jwt.claim.sub','d2000000-0000-0000-0000-000000000001',true);
SELECT pg_temp.assert_denied($q$SELECT public.set_attendance_daily_cutoff('d1000000-0000-0000-0000-000000000001','24:00:00')$q$,'ATTENDANCE_CUTOFF_WRITE_DENIED:');

SELECT pg_temp.assert_denied($q$INSERT INTO public.sessoes_aula(turma_id,escola_id,professor_id,data_aula,status,conteudo_programatico)
 VALUES ('d3000000-0000-0000-0000-000000000001','d1000000-0000-0000-0000-000000000001','d2000000-0000-0000-0000-000000000001',
 (clock_timestamp() AT TIME ZONE 'America/Sao_Paulo')::date-1,'ABERTA','Past')$q$,'ATTENDANCE_OPEN_DATE_NOT_CURRENT:');
SELECT pg_temp.assert_denied($q$INSERT INTO public.sessoes_aula(turma_id,escola_id,professor_id,data_aula,status,conteudo_programatico)
 VALUES ('d3000000-0000-0000-0000-000000000001','d1000000-0000-0000-0000-000000000001','d2000000-0000-0000-0000-000000000001',
 (clock_timestamp() AT TIME ZONE 'America/Sao_Paulo')::date+1,'ABERTA','Future')$q$,'ATTENDANCE_OPEN_DATE_NOT_CURRENT:');
SELECT pg_temp.assert_denied($q$INSERT INTO public.sessoes_aula(turma_id,escola_id,professor_id,data_aula,status,auto_fechamento_agendado,conteudo_programatico)
 VALUES ('d3000000-0000-0000-0000-000000000001','d1000000-0000-0000-0000-000000000001','d2000000-0000-0000-0000-000000000001',
 (clock_timestamp() AT TIME ZONE 'America/Sao_Paulo')::date,'ABERTA',now()-interval '1 second','Expired input')$q$,'ATTENDANCE_OPEN_CUTOFF_PASSED:');
SELECT pg_temp.assert_denied($q$INSERT INTO public.sessoes_aula(turma_id,escola_id,professor_id,data_aula,status,conteudo_programatico)
 VALUES ('d3000000-0000-0000-0000-000000000001','d1000000-0000-0000-0000-000000000001','d2000000-0000-0000-0000-000000000001',
 (clock_timestamp() AT TIME ZONE 'America/Sao_Paulo')::date,'FECHADA','Closed input')$q$,'ATTENDANCE_OPEN_STATUS_INVALID:');

INSERT INTO public.sessoes_aula(id,turma_id,escola_id,professor_id,data_aula,status,aberta_em,auto_fechamento_agendado,conteudo_programatico)
VALUES ('d6000000-0000-0000-0000-000000000001','d3000000-0000-0000-0000-000000000001',
 'd1000000-0000-0000-0000-000000000001','d2000000-0000-0000-0000-000000000001',
 (clock_timestamp() AT TIME ZONE 'America/Sao_Paulo')::date,'ABERTA',now()-interval '5 days',now()+interval '5 days','Opening');
SELECT pg_temp.assert_true((SELECT auto_fechamento_agendado=(data_aula+time '24:00:00') AT TIME ZONE 'America/Sao_Paulo'
 AND aberta_em>=transaction_timestamp() AND aberta_em<=clock_timestamp()
 FROM public.sessoes_aula WHERE id='d6000000-0000-0000-0000-000000000001'),'database captures policy and opening time, ignoring arbitrary future deadline');
SELECT pg_temp.assert_denied($q$UPDATE public.sessoes_aula SET auto_fechamento_agendado=now()+interval '2 days' WHERE id='d6000000-0000-0000-0000-000000000001'$q$,'ATTENDANCE_CUTOFF_IMMUTABLE:');
SELECT pg_temp.assert_denied($q$UPDATE public.sessoes_aula SET aberta_em=now()+interval '1 hour' WHERE id='d6000000-0000-0000-0000-000000000001'$q$,'ATTENDANCE_OPEN_TIME_IMMUTABLE:');
SELECT pg_temp.assert_denied($q$UPDATE public.sessoes_aula SET status='PLANEJADA' WHERE id='d6000000-0000-0000-0000-000000000001'$q$,'ATTENDANCE_SESSION_TRANSITION_INVALID:');
INSERT INTO public.frequencia(matricula_id,sessao_id,data_aula,status_presenca)
VALUES ('d5000000-0000-0000-0000-000000000001','d6000000-0000-0000-0000-000000000001',current_date,'P');
UPDATE public.sessoes_aula SET status='FECHADA' WHERE id='d6000000-0000-0000-0000-000000000001';
INSERT INTO public.sessoes_aula(id,turma_id,escola_id,professor_id,data_aula,status,conteudo_programatico)
VALUES ('d6000000-0000-0000-0000-000000000002','d3000000-0000-0000-0000-000000000001',
 'd1000000-0000-0000-0000-000000000001','d2000000-0000-0000-0000-000000000001',
 (clock_timestamp() AT TIME ZONE 'America/Sao_Paulo')::date,'ABERTA','Second opening');
INSERT INTO public.frequencia(matricula_id,sessao_id,data_aula,status_presenca)
VALUES ('d5000000-0000-0000-0000-000000000001','d6000000-0000-0000-0000-000000000002',current_date,'F');
SELECT pg_temp.assert_true((SELECT count(*)=2 AND count(DISTINCT sessao_id)=2 FROM public.frequencia
 WHERE matricula_id='d5000000-0000-0000-0000-000000000001'),'same-day sessions retain separate attendance history');
UPDATE public.sessoes_aula SET status='FECHADA' WHERE id='d6000000-0000-0000-0000-000000000002';
UPDATE public.sessoes_aula SET status='ABERTA' WHERE id='d6000000-0000-0000-0000-000000000008';
SELECT pg_temp.assert_true((SELECT auto_fechamento_agendado IS NOT NULL AND aberta_em>=transaction_timestamp()
 FROM public.sessoes_aula WHERE id='d6000000-0000-0000-0000-000000000008'),'planned transition captures the deadline too');

SELECT set_config('request.jwt.claim.sub','d2000000-0000-0000-0000-000000000002',true);
SELECT public.set_attendance_daily_cutoff('d1000000-0000-0000-0000-000000000001','00:00:00');
SELECT pg_temp.assert_true(public.is_session_editable('d6000000-0000-0000-0000-000000000008'),'policy changes do not shorten an existing captured deadline');
SELECT set_config('request.jwt.claim.sub','d2000000-0000-0000-0000-000000000001',true);
SELECT pg_temp.assert_denied($q$INSERT INTO public.sessoes_aula(turma_id,escola_id,professor_id,data_aula,status,auto_fechamento_agendado,conteudo_programatico)
 VALUES ('d3000000-0000-0000-0000-000000000001','d1000000-0000-0000-0000-000000000001','d2000000-0000-0000-0000-000000000001',
 (clock_timestamp() AT TIME ZONE 'America/Sao_Paulo')::date,'ABERTA',now()+interval '5 days','Bypass attempt')$q$,'ATTENDANCE_OPEN_CUTOFF_PASSED:');
SELECT pg_temp.assert_true((SELECT count(*)=2 FROM public.sessoes_aula WHERE turma_id='d3000000-0000-0000-0000-000000000001'
 AND data_aula=(clock_timestamp() AT TIME ZONE 'America/Sao_Paulo')::date),'denied opening creates no extra session');
SELECT public.request_attendance_reopen('d6000000-0000-0000-0000-000000000007','Conferir a chamada histórica com a direção.');
SELECT set_config('request.jwt.claim.sub','d2000000-0000-0000-0000-000000000002',true);
SELECT public.decide_attendance_reopen((SELECT id FROM public.attendance_reopen_requests WHERE sessao_id='d6000000-0000-0000-0000-000000000007'),'APROVADA');
SELECT set_config('request.jwt.claim.sub','d2000000-0000-0000-0000-000000000001',true);
SELECT pg_temp.assert_true(public.is_session_editable('d6000000-0000-0000-0000-000000000007'),'audited correction takes precedence over the ordinary cutoff');
UPDATE public.sessoes_aula SET status='FECHADA' WHERE id='d6000000-0000-0000-0000-000000000007';

RESET ROLE;
SELECT pg_temp.assert_true(EXISTS(SELECT 1 FROM public.audit_trail WHERE tabela='configs' AND dados_novos->>'chave'='attendance_daily_cutoff'
 AND dados_novos->>'valor'='24:00:00' AND usuario_id='d2000000-0000-0000-0000-000000000002'
 AND escola_id='d1000000-0000-0000-0000-000000000001'),'policy change records actor, school and value');
SELECT pg_temp.assert_true(public.attendance_daily_cutoff('d1000000-0000-0000-0000-000000000002')='18:00:00'::time,'foreign school retains its default');
UPDATE public.users SET ativo=false WHERE id='d2000000-0000-0000-0000-000000000002';
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','d2000000-0000-0000-0000-000000000002',true);
SELECT pg_temp.assert_denied($q$SELECT public.set_attendance_daily_cutoff('d1000000-0000-0000-0000-000000000001','12:00:00')$q$,'ATTENDANCE_CUTOFF_WRITE_DENIED:');
RESET ROLE;
UPDATE public.users SET ativo=true WHERE id='d2000000-0000-0000-0000-000000000002';
UPDATE public.escolas SET ativo=false WHERE id='d1000000-0000-0000-0000-000000000001';
SET LOCAL ROLE authenticated;
SELECT pg_temp.assert_denied($q$SELECT public.set_attendance_daily_cutoff('d1000000-0000-0000-0000-000000000001','12:00:00')$q$,'ATTENDANCE_CUTOFF_WRITE_DENIED:');
RESET ROLE;
ROLLBACK;
