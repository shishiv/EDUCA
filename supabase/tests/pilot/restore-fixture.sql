-- Synthetic-only, two-school fixture. No CPF/NIS or real identities.
INSERT INTO public.escolas(id, codigo, nome, tipo, ativo) VALUES
  ('10000000-0000-0000-0000-000000000001', 'RESTORE-A', 'Synthetic restore A', 'fundamental', true),
  ('10000000-0000-0000-0000-000000000002', 'RESTORE-B', 'Synthetic restore B', 'fundamental', true);
INSERT INTO public.users(id, nome, email, tipo_usuario, escola_id, ativo, primeiro_login, senha_padrao) VALUES
  ('20000000-0000-0000-0000-000000000001', 'Synthetic teacher A', 'professora.a@synthetic.invalid', 'professor', '10000000-0000-0000-0000-000000000001', true, false, false),
  ('20000000-0000-0000-0000-000000000002', 'Synthetic teacher B', 'professora.b@synthetic.invalid', 'professor', '10000000-0000-0000-0000-000000000002', true, false, false);
INSERT INTO auth.users(id, email, created_at) SELECT id, email, created_at FROM public.users;
INSERT INTO public.turmas(id, nome, serie, turno, ano_letivo, escola_id, professor_id, ativo) VALUES
  ('30000000-0000-0000-0000-000000000001', 'Synthetic class A', '1 ano', 'matutino', 2026, '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', true),
  ('30000000-0000-0000-0000-000000000002', 'Synthetic class B', '1 ano', 'matutino', 2026, '10000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', true);
INSERT INTO public.alunos(id, escola_id, nome_completo, data_nascimento, sexo, ativo) VALUES
  ('40000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Synthetic student A', '2018-01-01', 'F', true),
  ('40000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', 'Synthetic student B', '2018-01-01', 'M', true);
INSERT INTO public.matriculas(id, aluno_id, turma_id, ano_letivo, situacao) VALUES
  ('50000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 2026, 'ativa'),
  ('50000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000002', 2026, 'ativa');
INSERT INTO public.sessoes_aula(id, turma_id, escola_id, professor_id, data_aula, conteudo_programatico, status, aberta_em) VALUES
  ('60000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', (now() AT TIME ZONE 'America/Sao_Paulo')::date, 'Synthetic restore', 'ABERTA', now());
INSERT INTO public.frequencia(id, matricula_id, sessao_id, data_aula, presente, status_presenca, professor_id, marcado_por) VALUES
  ('70000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', '60000000-0000-0000-0000-000000000001', (now() AT TIME ZONE 'America/Sao_Paulo')::date, true, 'P', '20000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001');
INSERT INTO public.configs(chave, valor, categoria, descricao, escola_id) VALUES
  ('restore_excluded_sentinel', 'synthetic', 'test', 'Must not be recovered by F02', '10000000-0000-0000-0000-000000000001');
