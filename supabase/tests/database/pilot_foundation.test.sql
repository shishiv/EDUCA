BEGIN;

CREATE FUNCTION pg_temp.assert_true(condition boolean, message text)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF condition IS DISTINCT FROM true THEN RAISE EXCEPTION 'assertion failed: %', message; END IF;
END;
$$;

INSERT INTO escolas(id, codigo, nome, tipo) VALUES
  ('10000000-0000-0000-0000-000000000001','SYN-A','Escola Sintetica A','fundamental'),
  ('10000000-0000-0000-0000-000000000002','SYN-B','Escola Sintetica B','fundamental');
INSERT INTO users(id,nome,email,tipo_usuario,escola_id,ativo) VALUES
  ('20000000-0000-0000-0000-000000000001','Secretaria Sintetica','secretaria@synthetic.invalid','secretario',NULL,true),
  ('20000000-0000-0000-0000-000000000002','Diretora A','diretora.a@synthetic.invalid','diretor','10000000-0000-0000-0000-000000000001',true),
  ('20000000-0000-0000-0000-000000000003','Professor A','prof.a@synthetic.invalid','professor','10000000-0000-0000-0000-000000000001',true),
  ('20000000-0000-0000-0000-000000000004','Diretora B','diretora.b@synthetic.invalid','diretor','10000000-0000-0000-0000-000000000002',true),
  ('20000000-0000-0000-0000-000000000005','Inativa A','inativa@synthetic.invalid','diretor','10000000-0000-0000-0000-000000000001',false),
  ('20000000-0000-0000-0000-000000000006','Responsavel A','parent@synthetic.invalid','responsavel','10000000-0000-0000-0000-000000000001',true);
INSERT INTO turmas(id,nome,serie,turno,ano_letivo,escola_id,professor_id) VALUES
  ('30000000-0000-0000-0000-000000000001','Turma A','1 ano','matutino',2026,'10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000003'),
  ('30000000-0000-0000-0000-000000000002','Turma B','1 ano','matutino',2026,'10000000-0000-0000-0000-000000000002',NULL);
INSERT INTO alunos(id,nome_completo,data_nascimento,sexo,escola_id) VALUES
  ('40000000-0000-0000-0000-000000000001','Aluno Sintetico A','2018-01-01','M','10000000-0000-0000-0000-000000000001'),
  ('40000000-0000-0000-0000-000000000002','Aluno Sintetico B','2018-01-01','F','10000000-0000-0000-0000-000000000002');
INSERT INTO matriculas(id,aluno_id,turma_id,ano_letivo) VALUES
  ('50000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000001',2026),
  ('50000000-0000-0000-0000-000000000002','40000000-0000-0000-0000-000000000002','30000000-0000-0000-0000-000000000002',2026);

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','20000000-0000-0000-0000-000000000002',true);
SELECT pg_temp.assert_true((SELECT count(*) = 1 FROM alunos), 'director A sees only school A students');
SELECT pg_temp.assert_true((SELECT count(*) = 1 FROM escolas), 'director A sees only school A');
SELECT pg_temp.assert_true((SELECT count(*) = 0 FROM vw_frequencia_completa), 'redacted view remains RLS scoped and queryable');
SELECT pg_temp.assert_true((SELECT count(*) = 0 FROM alunos WHERE escola_id = '10000000-0000-0000-0000-000000000002'), 'school A cannot read school B');

SELECT set_config('request.jwt.claim.sub','20000000-0000-0000-0000-000000000003',true);
SELECT pg_temp.assert_true((SELECT count(*) = 1 FROM turmas), 'teacher sees only own school classes');
SELECT pg_temp.assert_true(pilot_teacher_owns_class('30000000-0000-0000-0000-000000000001'), 'teacher assignment is enforced');

SELECT set_config('request.jwt.claim.sub','20000000-0000-0000-0000-000000000001',true);
SELECT pg_temp.assert_true((SELECT count(*) >= 2 FROM alunos), 'secretariat sees municipality schools');
SELECT pg_temp.assert_true((SELECT count(*) >= 2 FROM escolas), 'secretariat sees all schools in dedicated project');
SELECT pg_temp.assert_true((SELECT count(*) = 3 FROM pilot_dashboard_metrics(NULL)), 'dashboard RPC is deployed');

INSERT INTO matriculas(id, aluno_id, turma_id, ano_letivo, situacao)
VALUES (
  '50000000-0000-0000-0000-000000000003',
  '40000000-0000-0000-0000-000000000001',
  '30000000-0000-0000-0000-000000000001',
  2027,
  'ativa'
);
SELECT pg_temp.assert_true(
  (SELECT count(*) = 1 FROM matriculas WHERE id = '50000000-0000-0000-0000-000000000003'),
  'secretariat can insert an enrollment without recursive RLS'
);

SELECT set_config('request.jwt.claim.sub','20000000-0000-0000-0000-000000000005',true);
SELECT pg_temp.assert_true((SELECT count(*) = 0 FROM alunos), 'inactive user has no school access');

SELECT set_config('request.jwt.claim.sub','20000000-0000-0000-0000-000000000006',true);
SELECT pg_temp.assert_true((SELECT count(*) = 0 FROM alunos), 'guardian role is disabled for pilot');

RESET ROLE;
SELECT pg_temp.assert_true(
  NOT has_table_privilege('authenticated','notas','SELECT')
  AND NOT has_table_privilege('authenticated','relatorios_descritivos','SELECT')
  AND NOT has_table_privilege('authenticated','educacenso_exports','SELECT'),
  'notes, descriptive reports, and Educacenso grants are disabled by the base pilot gate'
);
SELECT pg_temp.assert_true(
  (SELECT reloptions @> ARRAY['security_invoker=true'] FROM pg_class WHERE oid='vw_frequencia_completa'::regclass),
  'attendance view uses caller RLS'
);
SELECT pg_temp.assert_true(
  (SELECT count(*) >= 8 FROM pg_policies WHERE policyname LIKE 'pilot_%'),
  'pilot RLS policies are deployed'
);
SELECT pg_temp.assert_true(
  (SELECT data_classification='synthetic_only' AND external_deploy_allowed=false AND legal_approval_status='not_approved'
     AND support_critical_response_business_hours=4 AND support_normal_response_business_days=1
     AND weekly_active_schools_target_percent=80 AND attendance_capture_target_percent=90
     AND backup_cadence='daily' AND backup_rpo_hours=24 AND backup_rto_hours=4
   FROM pilot_municipality_config LIMIT 1),
  'real data, external deploy, and legal approval claims are hard disabled'
);

DO $$
BEGIN
  BEGIN
    UPDATE pilot_audit_log SET event_type='tampered' WHERE id=(SELECT id FROM pilot_audit_log LIMIT 1);
    RAISE EXCEPTION 'append-only audit update unexpectedly succeeded';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM NOT LIKE 'PILOT_AUDIT_APPEND_ONLY:%' THEN RAISE; END IF;
  END;
END $$;

ROLLBACK;
