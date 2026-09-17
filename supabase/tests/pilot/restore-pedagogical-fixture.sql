-- Companion to restore-fixture.sql after the complete migration chain.
-- All current writes use enabled triggers. Only historical approved requests
-- use owner INSERTs, with constraints enabled and their original captured time.
BEGIN;
INSERT INTO public.users(id, nome, email, tipo_usuario, escola_id, ativo) VALUES
  ('20000000-0000-0000-0000-000000000003', 'Synthetic director A', 'diretora.a@synthetic.invalid', 'diretor', '10000000-0000-0000-0000-000000000001', true),
  ('20000000-0000-0000-0000-000000000004', 'Synthetic director B', 'diretora.b@synthetic.invalid', 'diretor', '10000000-0000-0000-0000-000000000002', true);
INSERT INTO auth.users(id, email, created_at)
SELECT id, email, created_at FROM public.users WHERE tipo_usuario = 'diretor';
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '20000000-0000-0000-0000-000000000003', true);
SELECT public.set_school_academic_year('10000000-0000-0000-0000-000000000001', 2026, '2026-01-01', '2026-12-31');
SELECT public.set_school_periods('10000000-0000-0000-0000-000000000001', 2026,
  '[{"chave":"primeiro","nome":"Synthetic captured semester","data_inicio":"2026-01-01","data_fim":"2026-06-30"}]');
SELECT public.set_attendance_reopen_window_hours('10000000-0000-0000-0000-000000000001', 8);
SELECT set_config('request.jwt.claim.sub', '20000000-0000-0000-0000-000000000004', true);
SELECT public.set_school_academic_year('10000000-0000-0000-0000-000000000002', 2026, '2026-01-01', '2026-12-31');
SELECT public.set_attendance_reopen_window_hours('10000000-0000-0000-0000-000000000002', 6);
SELECT set_config('request.jwt.claim.sub', '20000000-0000-0000-0000-000000000001', true);
INSERT INTO public.vivencias(
  id, escola_id, aluno_id, matricula_id, turma_id, professor_id,
  data_vivencia, campos_experiencia, descricao, created_by, updated_by
)
SELECT ('81000000-0000-0000-0000-' || lpad(n::text, 12, '0'))::uuid,
  '10000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001',
  '50000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001',
  '20000000-0000-0000-0000-000000000001', DATE '2026-01-01' + n - 1,
  ARRAY['eu', 'corpo'], 'Synthetic captured narrative number ' || n,
  '20000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001'
FROM generate_series(1, 60) n;
INSERT INTO public.relatorios_descritivos(
  id, matricula_id, turma_id, professor_id, ano_letivo, semestre, status,
  campo_eu_outro_nos, campo_corpo_gestos, campo_tracos_sons,
  campo_escuta_fala, campo_espacos_tempos, created_by
) VALUES (
  '85000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001',
  '30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001',
  2026, 'primeiro', 'rascunho', repeat('synthetic eu ', 5), repeat('synthetic corpo ', 5),
  repeat('synthetic tracos ', 5), repeat('synthetic escuta ', 5), repeat('synthetic espacos ', 5),
  '20000000-0000-0000-0000-000000000001'
);
INSERT INTO public.relatorios_descritivos_vivencias(relatorio_id, vivencia_id, escola_id, created_by)
SELECT '85000000-0000-0000-0000-000000000001', id, escola_id, created_by FROM public.vivencias;
UPDATE public.relatorios_descritivos SET status = 'finalizado'
WHERE id = '85000000-0000-0000-0000-000000000001';
-- Make recapture observably wrong before backup, not only after restoration.
UPDATE public.vivencias SET descricao = 'Synthetic live narrative edited after capture'
WHERE id = '81000000-0000-0000-0000-000000000001';
SELECT set_config('request.jwt.claim.sub', '20000000-0000-0000-0000-000000000003', true);
SELECT public.set_school_periods('10000000-0000-0000-0000-000000000001', 2026,
  '[{"chave":"primeiro","nome":"Synthetic live semester renamed","data_inicio":"2026-01-01","data_fim":"2026-06-30"}]');
SELECT set_config('request.jwt.claim.sub', '20000000-0000-0000-0000-000000000002', true);
INSERT INTO public.vivencias(
  id, escola_id, aluno_id, matricula_id, turma_id, professor_id,
  data_vivencia, campos_experiencia, descricao, created_by, updated_by
) VALUES (
  '81000000-0000-0000-0000-000000000061', '10000000-0000-0000-0000-000000000002',
  '40000000-0000-0000-0000-000000000002', '50000000-0000-0000-0000-000000000002',
  '30000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002',
  '2026-01-01', ARRAY['escuta'], 'Synthetic school B narrative stays private',
  '20000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002'
);
RESET ROLE;
SELECT set_config('request.jwt.claim.sub', '', true);
INSERT INTO public.sessoes_aula(id, turma_id, escola_id, professor_id, data_aula, conteudo_programatico, status, aberta_em)
VALUES ('60000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000002',
  '10000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002',
  DATE '2026-01-01', 'Synthetic school B session', 'ABERTA', '2026-01-01T12:00:00Z'),
  ('60000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001',
  DATE '2026-01-02', 'Synthetic expired correction', 'ABERTA', '2026-01-02T12:00:00Z');
INSERT INTO public.conteudo_aula(sessao_id, tema, objetivo, habilidades_bncc, created_by)
SELECT id, 'Synthetic diary theme', 'Synthetic diary objective', ARRAY['EI03EO01'], professor_id
FROM public.sessoes_aula;
INSERT INTO public.attendance_reopen_requests(
  id, sessao_id, escola_id, requested_by, request_reason, status, requested_at,
  decided_by, decided_at, before_state, after_state,
  approved_at, correction_window_hours, correction_deadline_at
) VALUES
  ('86000000-0000-0000-0000-000000000001', '60000000-0000-0000-0000-000000000003',
   '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001',
   'Synthetic historical correction', 'APROVADA', '2026-01-01T11:00:00Z',
   '20000000-0000-0000-0000-000000000003', '2026-01-01T12:00:00Z', '{"status":"FECHADA"}', '{"status":"ABERTA"}',
   '2026-01-01T12:00:00Z', 2, '2026-01-01T14:00:00Z'),
  ('86000000-0000-0000-0000-000000000002', '60000000-0000-0000-0000-000000000002',
   '10000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002',
   'Synthetic legacy approval without captured window', 'APROVADA', '2026-01-01T11:00:00Z',
   '20000000-0000-0000-0000-000000000004', '2026-01-01T12:00:00Z', '{"status":"FECHADA"}', '{"status":"ABERTA"}',
   NULL, NULL, NULL);
COMMIT;
