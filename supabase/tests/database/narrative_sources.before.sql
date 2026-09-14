-- Synthetic legacy row created before the snapshot migration, not a bypass of it.
INSERT INTO public.escolas(id,codigo,nome,tipo,ativo)
VALUES ('d8000000-0000-4000-8000-000000000001','NARRATIVE-LEGACY','Escola sintética legado','creche',true);
INSERT INTO public.users(id,nome,email,tipo_usuario,escola_id,ativo)
VALUES ('d8100000-0000-4000-8000-000000000001','Docente legado sintético','legado.contract@synthetic.invalid','professor','d8000000-0000-4000-8000-000000000001',true);
INSERT INTO public.turmas(id,nome,serie,turno,ano_letivo,escola_id,professor_id,ativo)
VALUES ('d8200000-0000-4000-8000-000000000001','Pré legado sintético','Creche','matutino',2026,'d8000000-0000-4000-8000-000000000001','d8100000-0000-4000-8000-000000000001',true);
INSERT INTO public.alunos(id,escola_id,nome_completo,data_nascimento,sexo,ativo)
VALUES ('d8300000-0000-4000-8000-000000000001','d8000000-0000-4000-8000-000000000001','Criança legado sintético','2021-01-01','F',true);
INSERT INTO public.matriculas(id,aluno_id,turma_id,ano_letivo,situacao)
VALUES ('d8400000-0000-4000-8000-000000000001','d8300000-0000-4000-8000-000000000001','d8200000-0000-4000-8000-000000000001',2026,'ativa');
INSERT INTO public.relatorios_descritivos(id,matricula_id,turma_id,professor_id,ano_letivo,semestre,status,
 campo_eu_outro_nos,campo_corpo_gestos,campo_tracos_sons,campo_escuta_fala,campo_espacos_tempos,created_by,finalizado_por,finalizado_em)
VALUES ('d8500000-0000-4000-8000-000000000001','d8400000-0000-4000-8000-000000000001','d8200000-0000-4000-8000-000000000001','d8100000-0000-4000-8000-000000000001',
 2026,'primeiro','finalizado',repeat('a',50),repeat('b',50),repeat('c',50),repeat('d',50),repeat('e',50),
 'd8100000-0000-4000-8000-000000000001','d8100000-0000-4000-8000-000000000001','2026-07-31T12:00:00Z');
