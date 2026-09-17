-- Same scenario checked before export and after replay. Every assertion has
-- nonempty witnesses so missing dependencies cannot pass as an empty result.
BEGIN;
CREATE FUNCTION pg_temp.assert_true(condition boolean, message text)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF condition IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'RESTORE_PEDAGOGICAL_REGRESSION: %', message;
  END IF;
END;
$$;
SELECT pg_temp.assert_true(
  (SELECT count(*) = 2 FROM public.escolas)
  AND (SELECT periodos = '[]'::jsonb FROM public.anos_letivos
    WHERE escola_id = '10000000-0000-0000-0000-000000000002' AND ano = 2026)
  AND (SELECT periodos->0->>'nome' = 'Synthetic live semester renamed' FROM public.anos_letivos
    WHERE escola_id = '10000000-0000-0000-0000-000000000001' AND ano = 2026),
  'two schools retain configured and empty periods'
);
SELECT pg_temp.assert_true(
  (SELECT valor = '8' FROM public.configs WHERE chave = 'attendance_reopen_window_hours'
    AND escola_id = '10000000-0000-0000-0000-000000000001')
  AND (SELECT valor = '24' FROM public.configs WHERE chave = 'attendance_reopen_window_hours' AND escola_id IS NULL),
  'seeded default and school override are recovered separately'
);
SELECT pg_temp.assert_true(
  (SELECT count(*) = 61 FROM public.vivencias)
  AND (SELECT count(*) = 121 FROM public.vivencias_campos_experiencia)
  AND (SELECT count(*) = 60 FROM public.relatorios_descritivos_vivencias)
  AND (SELECT count(*) = 3 FROM public.conteudo_aula),
  'all source rows, field links, original report links and diary content survive'
);
SELECT pg_temp.assert_true(
  (SELECT status = 'finalizado' AND jsonb_array_length(fontes_snapshot->'fontes') = 60
    AND fontes_snapshot->'fontes'->0->>'descricao' = 'Synthetic captured narrative number 1'
    AND fontes_snapshot->'periodo'->>'nome' = 'Synthetic captured semester'
    FROM public.relatorios_descritivos WHERE id = '85000000-0000-0000-0000-000000000001')
  AND (SELECT descricao = 'Synthetic live narrative edited after capture'
    FROM public.vivencias WHERE id = '81000000-0000-0000-0000-000000000001'),
  'snapshot is the original 60 sources, not recaptured from changed live text or period'
);
SELECT pg_temp.assert_true(
  (SELECT status = 'finalizado' AND fontes_snapshot IS NULL AND finalizado_em = '2026-07-31T12:00:00Z'
    FROM public.relatorios_descritivos WHERE id = '85000000-0000-0000-0000-000000000002')
  AND NOT EXISTS (SELECT 1 FROM public.relatorios_descritivos_vivencias
    WHERE relatorio_id = '85000000-0000-0000-0000-000000000002'),
  'pre-migration legacy report retains NULL provenance and no invented source links'
);
SELECT pg_temp.assert_true(
  (SELECT approved_at = '2026-01-01T12:00:00Z' AND correction_window_hours = 2
    AND correction_deadline_at = '2026-01-01T14:00:00Z'
    FROM public.attendance_reopen_requests WHERE id = '86000000-0000-0000-0000-000000000001')
  AND (SELECT approved_at IS NULL AND correction_window_hours IS NULL AND correction_deadline_at IS NULL
    FROM public.attendance_reopen_requests WHERE id = '86000000-0000-0000-0000-000000000002'),
  'expired captured deadline is not renewed and legacy approval receives no retroactive window'
);
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '20000000-0000-0000-0000-000000000001', true);
SELECT pg_temp.assert_true(
  (SELECT count(*) = 60 FROM public.vivencias)
  AND (SELECT count(*) = 120 FROM public.vivencias_campos_experiencia)
  AND (SELECT count(*) = 1 FROM public.relatorios_descritivos)
  AND (SELECT count(*) = 60 FROM public.relatorios_descritivos_vivencias)
  AND (SELECT count(*) = 2 FROM public.conteudo_aula)
  AND (SELECT count(*) = 1 FROM public.attendance_reopen_requests)
  AND (SELECT count(*) = 0 FROM public.configs WHERE escola_id = '10000000-0000-0000-0000-000000000002'
    AND chave = 'attendance_reopen_window_hours'),
  'school A teacher reads its aggregate but not school B witnesses'
);
SELECT pg_temp.assert_true(
  (SELECT count(*) = 1 FROM public.get_school_academic_year('10000000-0000-0000-0000-000000000001', 2026))
  AND NOT public.is_session_editable('60000000-0000-0000-0000-000000000003'),
  'school year remains accessible through its governed RPC and expired window stays closed'
);
DO $$
BEGIN
  BEGIN
    PERFORM public.preview_descriptive_report_sources('50000000-0000-0000-0000-000000000002', 2026, 'primeiro');
    RAISE EXCEPTION 'foreign-school preview unexpectedly readable';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    PERFORM public.get_school_academic_year('10000000-0000-0000-0000-000000000002', 2026);
    RAISE EXCEPTION 'foreign-school year unexpectedly readable';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    INSERT INTO public.frequencia(matricula_id, sessao_id, data_aula, status_presenca, presente)
    VALUES ('50000000-0000-0000-0000-000000000001', '60000000-0000-0000-0000-000000000003', CURRENT_DATE, 'P', true);
    RAISE EXCEPTION 'expired restored session unexpectedly writable';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM NOT LIKE 'ATTENDANCE_SESSION_IMMUTABLE:%' THEN RAISE; END IF;
  END;
END;
$$;
-- A director may change future configuration, but not the restored capture.
SELECT set_config('request.jwt.claim.sub', '20000000-0000-0000-0000-000000000003', true);
SELECT public.set_attendance_reopen_window_hours('10000000-0000-0000-0000-000000000001', 48);
SELECT pg_temp.assert_true(
  (SELECT correction_window_hours = 2 AND correction_deadline_at = '2026-01-01T14:00:00Z'
    FROM public.attendance_reopen_requests WHERE id = '86000000-0000-0000-0000-000000000001'),
  'later director configuration does not extend recovered approval'
);
SELECT set_config('request.jwt.claim.sub', '20000000-0000-0000-0000-000000000002', true);
DO $$
BEGIN
  BEGIN
    UPDATE public.relatorios_descritivos SET fontes_snapshot = '{}'
    WHERE id = '85000000-0000-0000-0000-000000000002';
    RAISE EXCEPTION 'legacy provenance unexpectedly writable';
  EXCEPTION WHEN check_violation THEN
    IF SQLERRM <> 'DESCRIPTIVE_REPORT_FINALIZED_IMMUTABLE' THEN RAISE; END IF;
  END;
  BEGIN
    INSERT INTO public.relatorios_descritivos_vivencias(relatorio_id, vivencia_id, escola_id, created_by)
    VALUES ('85000000-0000-0000-0000-000000000002', '81000000-0000-0000-0000-000000000061',
      '10000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002');
    RAISE EXCEPTION 'retroactive legacy source unexpectedly accepted';
  EXCEPTION WHEN check_violation THEN
    IF SQLERRM <> 'DESCRIPTIVE_REPORT_FINALIZED_SOURCES_IMMUTABLE' THEN RAISE; END IF;
  END;
END;
$$;
ROLLBACK;
\echo RESTORE_PEDAGOGICAL_OK: two schools, empty/configured period, 60 captured sources, legacy, expired deadline, RLS and write denials
