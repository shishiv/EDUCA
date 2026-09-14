BEGIN;
CREATE FUNCTION pg_temp.assert_true(ok boolean, message text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN IF ok IS DISTINCT FROM true THEN RAISE EXCEPTION 'assertion failed: %', message; END IF; END; $$;
INSERT INTO public.escolas(id,codigo,nome,tipo,ativo) VALUES
('d9000000-0000-4000-8000-000000000001','CONTRACT-A','Escola sintética contratos A','creche',true),
('d9000000-0000-4000-8000-000000000002','CONTRACT-B','Escola sintética contratos B','creche',true);
INSERT INTO public.users(id,nome,email,tipo_usuario,escola_id,ativo) VALUES
('d9100000-0000-4000-8000-000000000001','Docente sintético','docente.contract@synthetic.invalid','professor','d9000000-0000-4000-8000-000000000001',true),
('d9100000-0000-4000-8000-000000000002','Diretor sintético','diretor.contract@synthetic.invalid','diretor','d9000000-0000-4000-8000-000000000001',true),
('d9100000-0000-4000-8000-000000000003','Diretor B sintético','diretor.b.contract@synthetic.invalid','diretor','d9000000-0000-4000-8000-000000000002',true);
INSERT INTO public.turmas(id,nome,serie,turno,ano_letivo,escola_id,professor_id,ativo) VALUES
('d9200000-0000-4000-8000-000000000001','Pré sintética','Creche','matutino',2026,'d9000000-0000-4000-8000-000000000001','d9100000-0000-4000-8000-000000000001',true);
INSERT INTO public.alunos(id,escola_id,nome_completo,data_nascimento,sexo,ativo) VALUES
('d9300000-0000-4000-8000-000000000001','d9000000-0000-4000-8000-000000000001','Criança sintética contratos','2021-01-01','F',true);
INSERT INTO public.matriculas(id,aluno_id,turma_id,ano_letivo,situacao) VALUES
('d9400000-0000-4000-8000-000000000001','d9300000-0000-4000-8000-000000000001','d9200000-0000-4000-8000-000000000001',2026,'ativa');
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','d9100000-0000-4000-8000-000000000001',true);
INSERT INTO public.relatorios_descritivos(id,matricula_id,turma_id,professor_id,ano_letivo,semestre,status,
 campo_eu_outro_nos,campo_corpo_gestos,campo_tracos_sons,campo_escuta_fala,campo_espacos_tempos,created_by) VALUES
('d9500000-0000-4000-8000-000000000001','d9400000-0000-4000-8000-000000000001','d9200000-0000-4000-8000-000000000001',
 'd9100000-0000-4000-8000-000000000001',2026,'primeiro','rascunho',repeat('a',50),repeat('b',50),repeat('c',50),repeat('d',50),repeat('e',50),'d9100000-0000-4000-8000-000000000001');
DO $$ BEGIN
  BEGIN
    UPDATE public.relatorios_descritivos SET status='finalizado' WHERE id='d9500000-0000-4000-8000-000000000001';
    RAISE EXCEPTION 'missing calendar incorrectly permitted finalization';
  EXCEPTION WHEN check_violation THEN
    IF SQLERRM <> 'DESCRIPTIVE_REPORT_PERIOD_NOT_CONFIGURED' THEN RAISE; END IF;
  END;
END $$;
SELECT pg_temp.assert_true((SELECT status='rascunho' AND fontes_snapshot IS NULL FROM public.relatorios_descritivos WHERE id='d9500000-0000-4000-8000-000000000001'),'rejection leaves no partial snapshot');
DO $$ BEGIN
  BEGIN
    UPDATE public.relatorios_descritivos SET fontes_snapshot='{}' WHERE id='d9500000-0000-4000-8000-000000000001';
    RAISE EXCEPTION 'client forged snapshot';
  EXCEPTION WHEN check_violation THEN
    IF SQLERRM <> 'DESCRIPTIVE_REPORT_SNAPSHOT_DERIVED' THEN RAISE; END IF;
  END;
END $$;
SELECT set_config('request.jwt.claim.sub','d9100000-0000-4000-8000-000000000002',true);
SELECT public.set_school_academic_year('d9000000-0000-4000-8000-000000000001',2026,'2026-01-01','2026-12-31');
SELECT public.set_school_periods('d9000000-0000-4000-8000-000000000001',2026,
 '[{"chave":"primeiro","nome":"Período sintético A","data_inicio":"2026-01-01","data_fim":"2026-06-30"}]');
SELECT set_config('request.jwt.claim.sub','d9100000-0000-4000-8000-000000000001',true);
DO $$ BEGIN
  BEGIN
    UPDATE public.relatorios_descritivos SET status='finalizado' WHERE id='d9500000-0000-4000-8000-000000000001';
    RAISE EXCEPTION 'empty sources incorrectly permitted finalization';
  EXCEPTION WHEN check_violation THEN
    IF SQLERRM <> 'DESCRIPTIVE_REPORT_SOURCES_EMPTY' THEN RAISE; END IF;
  END;
  BEGIN
    PERFORM public.set_school_periods('d9000000-0000-4000-8000-000000000001',2026,'[]');
    RAISE EXCEPTION 'teacher configured calendar';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
INSERT INTO public.vivencias(escola_id,aluno_id,matricula_id,turma_id,professor_id,data_vivencia,campos_experiencia,descricao,created_by,updated_by)
SELECT 'd9000000-0000-4000-8000-000000000001','d9300000-0000-4000-8000-000000000001','d9400000-0000-4000-8000-000000000001',
'd9200000-0000-4000-8000-000000000001','d9100000-0000-4000-8000-000000000001',
CASE WHEN n=1 THEN DATE '2026-01-01' WHEN n=60 THEN DATE '2026-06-30' WHEN n=61 THEN DATE '2026-07-01' ELSE DATE '2026-03-01' END,
ARRAY['eu'], 'Vivência sintética completa número '||n,'d9100000-0000-4000-8000-000000000001','d9100000-0000-4000-8000-000000000001' FROM generate_series(1,61) n;
RESET ROLE;
INSERT INTO public.alunos(id,escola_id,nome_completo,data_nascimento,sexo,ativo) VALUES
('d9300000-0000-4000-8000-000000000002','d9000000-0000-4000-8000-000000000001','Outra criança sintética contratos','2021-01-01','M',true);
INSERT INTO public.matriculas(id,aluno_id,turma_id,ano_letivo,situacao) VALUES
('d9400000-0000-4000-8000-000000000002','d9300000-0000-4000-8000-000000000002','d9200000-0000-4000-8000-000000000001',2026,'ativa');
SET LOCAL ROLE authenticated;
INSERT INTO public.vivencias(escola_id,aluno_id,matricula_id,turma_id,professor_id,data_vivencia,campos_experiencia,descricao,created_by,updated_by) VALUES
('d9000000-0000-4000-8000-000000000001','d9300000-0000-4000-8000-000000000002','d9400000-0000-4000-8000-000000000002','d9200000-0000-4000-8000-000000000001',
'd9100000-0000-4000-8000-000000000001','2026-03-01',ARRAY['eu'],'Fonte de outra criança que não pode entrar na captura.',
'd9100000-0000-4000-8000-000000000001','d9100000-0000-4000-8000-000000000001');
SELECT pg_temp.assert_true(jsonb_array_length(public.preview_descriptive_report_sources('d9400000-0000-4000-8000-000000000001',2026,'primeiro')->'fontes')=60,'preview includes both boundaries and exceeds 50 without truncation');
UPDATE public.relatorios_descritivos SET status='finalizado' WHERE id='d9500000-0000-4000-8000-000000000001';
SELECT pg_temp.assert_true((SELECT jsonb_array_length(fontes_snapshot->'fontes')=60
 AND fontes_snapshot->>'versao'='vivencias-v1' AND fontes_snapshot->>'capturado_por'=finalizado_por::text
 AND fontes_snapshot->'periodo'->>'nome'='Período sintético A'
 FROM public.relatorios_descritivos WHERE id='d9500000-0000-4000-8000-000000000001'),'finalization persists the complete authenticated snapshot');
UPDATE public.vivencias SET descricao='Vivência sintética alterada depois da captura.' WHERE data_vivencia='2026-01-01' AND matricula_id='d9400000-0000-4000-8000-000000000001';
SELECT pg_temp.assert_true((SELECT fontes_snapshot->'fontes'->0->>'descricao'='Vivência sintética completa número 1'
 FROM public.relatorios_descritivos WHERE id='d9500000-0000-4000-8000-000000000001'),'editing the live source does not mutate the snapshot');
SELECT set_config('request.jwt.claim.sub','d9100000-0000-4000-8000-000000000002',true);
DO $$ BEGIN
  BEGIN
    PERFORM public.set_school_periods('d9000000-0000-4000-8000-000000000002',2026,'[]');
    RAISE EXCEPTION 'director configured another school';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    PERFORM public.set_school_periods('d9000000-0000-4000-8000-000000000001',2026,
     '[{"chave":"primeiro","nome":"A","data_inicio":"2026-01-01","data_fim":"2026-07-01"},{"chave":"segundo","nome":"B","data_inicio":"2026-07-01","data_fim":"2026-12-31"}]');
    RAISE EXCEPTION 'overlapping semesters accepted';
  EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
END $$;
DO $$
DECLARE invalid_period jsonb;
BEGIN
  FOR invalid_period IN SELECT value FROM jsonb_array_elements('[
    {"chave":"primeiro","nome":"X","data_inicio":"2025-12-31","data_fim":"2026-06-30"},
    {"chave":"primeiro","nome":"X","data_inicio":"2026-07-01","data_fim":"2026-06-30"},
    {"chave":"primeiro","nome":null,"data_inicio":"2026-01-01","data_fim":"2026-06-30"},
    {"chave":"inventado","nome":"X","data_inicio":"2026-01-01","data_fim":"2026-06-30"}
  ]') LOOP
    BEGIN
      PERFORM public.set_school_periods('d9000000-0000-4000-8000-000000000001',2026,jsonb_build_array(invalid_period));
      RAISE EXCEPTION 'invalid school period accepted';
    EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
  END LOOP;
END $$;
SELECT public.set_school_periods('d9000000-0000-4000-8000-000000000001',2026,'[]');
SELECT pg_temp.assert_true((SELECT fontes_snapshot->'periodo'->>'nome'='Período sintético A'
 FROM public.relatorios_descritivos WHERE id='d9500000-0000-4000-8000-000000000001'),'calendar removal does not rewrite the finalized period');
SELECT set_config('request.jwt.claim.sub','d9100000-0000-4000-8000-000000000003',true);
SELECT pg_temp.assert_true((SELECT count(*)=0 FROM public.relatorios_descritivos WHERE id='d9500000-0000-4000-8000-000000000001'),'foreign-school actor cannot read a captured report');
DO $$ BEGIN
  BEGIN
    PERFORM public.preview_descriptive_report_sources('d9400000-0000-4000-8000-000000000001',2026,'primeiro');
    RAISE EXCEPTION 'foreign-school actor read source preview';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
ROLLBACK;
