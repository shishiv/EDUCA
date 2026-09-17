BEGIN;

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

INSERT INTO public.escolas(id, codigo, nome, tipo, ativo)
VALUES ('d4000000-0000-4000-8000-000000000101', 'C04-FINAL', 'Escola C04 Finalização', 'creche', true);

INSERT INTO public.users(id, nome, email, tipo_usuario, escola_id, ativo)
VALUES
  ('d4100000-0000-4000-8000-000000000101', 'Professora C04', 'professora.finalizacao.c04@synthetic.invalid', 'professor', 'd4000000-0000-4000-8000-000000000101', true),
  ('d4100000-0000-4000-8000-000000000102', 'Finalizador falso C04', 'finalizador.falso.c04@synthetic.invalid', 'professor', 'd4000000-0000-4000-8000-000000000101', true);

INSERT INTO public.turmas(id, nome, serie, turno, ano_letivo, escola_id, professor_id, ativo)
VALUES (
  'd4200000-0000-4000-8000-000000000101', 'Turma C04 Finalização', 'Creche', 'matutino', 2026,
  'd4000000-0000-4000-8000-000000000101', 'd4100000-0000-4000-8000-000000000101', true
);

INSERT INTO public.alunos(id, escola_id, nome_completo, data_nascimento, sexo, ativo)
VALUES
  ('d4300000-0000-4000-8000-000000000101', 'd4000000-0000-4000-8000-000000000101', 'Criança finalização', DATE '2021-01-01', 'F', true),
  ('d4300000-0000-4000-8000-000000000102', 'd4000000-0000-4000-8000-000000000101', 'Criança inserção final', DATE '2021-01-02', 'M', true),
  ('d4300000-0000-4000-8000-000000000103', 'd4000000-0000-4000-8000-000000000101', 'Criança seed sintético', DATE '2021-01-03', 'F', true),
  ('d4300000-0000-4000-8000-000000000104', 'd4000000-0000-4000-8000-000000000101', 'Criança relatório incompleto', DATE '2021-01-04', 'M', true);

INSERT INTO public.matriculas(id, aluno_id, turma_id, ano_letivo, situacao)
VALUES
  ('d4400000-0000-4000-8000-000000000101', 'd4300000-0000-4000-8000-000000000101', 'd4200000-0000-4000-8000-000000000101', 2026, 'ativa'),
  ('d4400000-0000-4000-8000-000000000102', 'd4300000-0000-4000-8000-000000000102', 'd4200000-0000-4000-8000-000000000101', 2026, 'ativa'),
  ('d4400000-0000-4000-8000-000000000103', 'd4300000-0000-4000-8000-000000000103', 'd4200000-0000-4000-8000-000000000101', 2026, 'ativa'),
  ('d4400000-0000-4000-8000-000000000104', 'd4300000-0000-4000-8000-000000000104', 'd4200000-0000-4000-8000-000000000101', 2026, 'ativa');

INSERT INTO public.vivencias(
  id, escola_id, aluno_id, matricula_id, turma_id, professor_id,
  data_vivencia, campos_experiencia, descricao, created_by, updated_by
)
VALUES
  (
    'd4600000-0000-4000-8000-000000000101',
    'd4000000-0000-4000-8000-000000000101',
    'd4300000-0000-4000-8000-000000000101',
    'd4400000-0000-4000-8000-000000000101',
    'd4200000-0000-4000-8000-000000000101',
    'd4100000-0000-4000-8000-000000000101',
    DATE '2026-09-01', ARRAY['eu'],
    'Primeira Vivência sintética válida para o vínculo do rascunho.',
    'd4100000-0000-4000-8000-000000000101',
    'd4100000-0000-4000-8000-000000000101'
  ),
  (
    'd4600000-0000-4000-8000-000000000102',
    'd4000000-0000-4000-8000-000000000101',
    'd4300000-0000-4000-8000-000000000101',
    'd4400000-0000-4000-8000-000000000101',
    'd4200000-0000-4000-8000-000000000101',
    'd4100000-0000-4000-8000-000000000101',
    DATE '2026-09-02', ARRAY['corpo'],
    'Segunda Vivência sintética válida para tentar alterar a linhagem.',
    'd4100000-0000-4000-8000-000000000101',
    'd4100000-0000-4000-8000-000000000101'
  );

INSERT INTO public.relatorios_descritivos(
  id, matricula_id, turma_id, professor_id, ano_letivo, semestre, status,
  campo_eu_outro_nos, campo_corpo_gestos, campo_tracos_sons,
  campo_escuta_fala, campo_espacos_tempos, created_by
)
VALUES (
  'd4500000-0000-4000-8000-000000000101',
  'd4400000-0000-4000-8000-000000000101',
  'd4200000-0000-4000-8000-000000000101',
  'd4100000-0000-4000-8000-000000000101',
  2026, 'primeiro', 'rascunho', repeat('A', 50), repeat('B', 50), repeat('C', 50),
  repeat('D', 50), repeat('E', 50),
  'd4100000-0000-4000-8000-000000000101'
);

INSERT INTO public.relatorios_descritivos(
  id, matricula_id, turma_id, professor_id, ano_letivo, semestre, status,
  campo_eu_outro_nos, created_by
)
VALUES (
  'd4500000-0000-4000-8000-000000000104',
  'd4400000-0000-4000-8000-000000000104',
  'd4200000-0000-4000-8000-000000000101',
  'd4100000-0000-4000-8000-000000000101',
  2026, 'primeiro', 'rascunho', repeat('A', 50),
  'd4100000-0000-4000-8000-000000000101'
);

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', 'd4100000-0000-4000-8000-000000000101', true);

INSERT INTO public.relatorios_descritivos_vivencias(
  relatorio_id, vivencia_id, escola_id, created_by
)
VALUES (
  'd4500000-0000-4000-8000-000000000101',
  'd4600000-0000-4000-8000-000000000101',
  'd4000000-0000-4000-8000-000000000101',
  'd4100000-0000-4000-8000-000000000101'
);

SELECT pg_temp.assert_true(
  (SELECT count(*) = 1
   FROM public.relatorios_descritivos_vivencias
   WHERE relatorio_id = 'd4500000-0000-4000-8000-000000000101'),
  'draft reports continue to accept authorized Vivência source links'
);

DO $$
BEGIN
  BEGIN
    UPDATE public.relatorios_descritivos
    SET status = 'finalizado'
    WHERE id = 'd4500000-0000-4000-8000-000000000104';
    RAISE EXCEPTION 'incomplete report finalization was accepted';
  EXCEPTION WHEN check_violation THEN
    IF SQLERRM <> 'DESCRIPTIVE_REPORT_FINALIZATION_FIELDS_INVALID' THEN RAISE; END IF;
  END;
END;
$$;

SELECT pg_temp.assert_true(
  (SELECT status = 'rascunho' AND finalizado_em IS NULL AND finalizado_por IS NULL
   FROM public.relatorios_descritivos
   WHERE id = 'd4500000-0000-4000-8000-000000000104'),
  'incomplete reports remain editable drafts after rejected finalization'
);

UPDATE public.relatorios_descritivos
SET status = 'finalizado',
    finalizado_em = TIMESTAMPTZ '2000-01-01 00:00:00+00',
    finalizado_por = 'd4100000-0000-4000-8000-000000000102'
WHERE id = 'd4500000-0000-4000-8000-000000000101';

SELECT pg_temp.assert_true(
  (SELECT status = 'finalizado'
      AND finalizado_por = 'd4100000-0000-4000-8000-000000000101'
      AND finalizado_em >= current_timestamp - interval '1 minute'
   FROM public.relatorios_descritivos
   WHERE id = 'd4500000-0000-4000-8000-000000000101'),
  'draft finalization derives actor and time from the authenticated database session'
);

DO $$
BEGIN
  BEGIN
    INSERT INTO public.relatorios_descritivos_vivencias(
      relatorio_id, vivencia_id, escola_id, created_by
    ) VALUES (
      'd4500000-0000-4000-8000-000000000101',
      'd4600000-0000-4000-8000-000000000102',
      'd4000000-0000-4000-8000-000000000101',
      'd4100000-0000-4000-8000-000000000101'
    );
    RAISE EXCEPTION 'finalized report source link was accepted';
  EXCEPTION WHEN check_violation THEN
    IF SQLERRM <> 'DESCRIPTIVE_REPORT_FINALIZED_SOURCES_IMMUTABLE' THEN RAISE; END IF;
  END;
END;
$$;

SELECT pg_temp.assert_true(
  (SELECT count(*) = 1
   FROM public.relatorios_descritivos_vivencias
   WHERE relatorio_id = 'd4500000-0000-4000-8000-000000000101'),
  'finalized report source links remain frozen at their pre-finalization set'
);

INSERT INTO public.relatorios_descritivos(
  id, matricula_id, turma_id, professor_id, ano_letivo, semestre, status,
  campo_eu_outro_nos, campo_corpo_gestos, campo_tracos_sons,
  campo_escuta_fala, campo_espacos_tempos,
  finalizado_em, finalizado_por, created_by
)
VALUES (
  'd4500000-0000-4000-8000-000000000102',
  'd4400000-0000-4000-8000-000000000102',
  'd4200000-0000-4000-8000-000000000101',
  'd4100000-0000-4000-8000-000000000101',
  2026, 'primeiro', 'finalizado', repeat('A', 50), repeat('B', 50), repeat('C', 50),
  repeat('D', 50), repeat('E', 50),
  TIMESTAMPTZ '2000-01-01 00:00:00+00',
  'd4100000-0000-4000-8000-000000000102',
  'd4100000-0000-4000-8000-000000000101'
);

SELECT pg_temp.assert_true(
  (SELECT finalizado_por = 'd4100000-0000-4000-8000-000000000101'
      AND finalizado_em >= current_timestamp - interval '1 minute'
   FROM public.relatorios_descritivos
   WHERE id = 'd4500000-0000-4000-8000-000000000102'),
  'direct finalized inserts cannot spoof the finalizer or finalization time'
);

DO $$
BEGIN
  BEGIN
    UPDATE public.relatorios_descritivos
    SET campo_eu_outro_nos = 'Texto adulterado depois da finalização'
    WHERE id = 'd4500000-0000-4000-8000-000000000101';
    RAISE EXCEPTION 'finalized report content update was accepted';
  EXCEPTION WHEN check_violation THEN
    IF SQLERRM <> 'DESCRIPTIVE_REPORT_FINALIZED_IMMUTABLE' THEN RAISE; END IF;
  END;
END;
$$;

DO $$
BEGIN
  BEGIN
    UPDATE public.relatorios_descritivos
    SET status = 'rascunho'
    WHERE id = 'd4500000-0000-4000-8000-000000000101';
    RAISE EXCEPTION 'finalized report reopening was accepted';
  EXCEPTION WHEN check_violation THEN
    IF SQLERRM <> 'DESCRIPTIVE_REPORT_FINALIZED_IMMUTABLE' THEN RAISE; END IF;
  END;
END;
$$;

DO $$
BEGIN
  BEGIN
    UPDATE public.relatorios_descritivos
    SET finalizado_por = 'd4100000-0000-4000-8000-000000000102'
    WHERE id = 'd4500000-0000-4000-8000-000000000101';
    RAISE EXCEPTION 'finalizer spoof after finalization was accepted';
  EXCEPTION WHEN check_violation THEN
    IF SQLERRM <> 'DESCRIPTIVE_REPORT_FINALIZED_IMMUTABLE' THEN RAISE; END IF;
  END;
END;
$$;

SELECT pg_temp.assert_true(
  (SELECT status = 'finalizado'
      AND campo_eu_outro_nos = repeat('A', 50)
      AND finalizado_por = 'd4100000-0000-4000-8000-000000000101'
   FROM public.relatorios_descritivos
   WHERE id = 'd4500000-0000-4000-8000-000000000101'),
  'rejected writes leave the finalized report unchanged'
);

RESET ROLE;
SELECT set_config('request.jwt.claim.sub', '', true);
SET LOCAL ROLE service_role;

INSERT INTO public.relatorios_descritivos(
  id, matricula_id, turma_id, professor_id, ano_letivo, semestre, status,
  campo_eu_outro_nos, campo_corpo_gestos, campo_tracos_sons,
  campo_escuta_fala, campo_espacos_tempos,
  finalizado_em, finalizado_por, created_by
)
VALUES (
  'd4500000-0000-4000-8000-000000000103',
  'd4400000-0000-4000-8000-000000000103',
  'd4200000-0000-4000-8000-000000000101',
  'd4100000-0000-4000-8000-000000000101',
  2026, 'primeiro', 'finalizado', repeat('A', 50), repeat('B', 50), repeat('C', 50),
  repeat('D', 50), repeat('E', 50),
  TIMESTAMPTZ '2026-08-01 12:00:00+00',
  'd4100000-0000-4000-8000-000000000101',
  'd4100000-0000-4000-8000-000000000101'
);

SELECT pg_temp.assert_true(
  (SELECT finalizado_por = 'd4100000-0000-4000-8000-000000000101'
      AND finalizado_em = TIMESTAMPTZ '2026-08-01 12:00:00+00'
   FROM public.relatorios_descritivos
   WHERE id = 'd4500000-0000-4000-8000-000000000103'),
  'explicit service-role synthetic finalization remains supported'
);

ROLLBACK;
