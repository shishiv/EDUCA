BEGIN;
CREATE FUNCTION pg_temp.assert_true(condition boolean, message text)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF condition IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'RESTORE_SCOPE_REGRESSION: %', message;
  END IF;
END;
$$;
SELECT pg_temp.assert_true(
  NOT EXISTS (SELECT 1 FROM public.configs WHERE chave = 'restore_excluded_sentinel'),
  'excluded school config must not be reported as recovered'
);
SELECT pg_temp.assert_true(
  NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'notas')
    AND (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.notas'::regclass),
  'grades remain blocked with RLS and no policies'
);
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '20000000-0000-0000-0000-000000000001', true);
SELECT pg_temp.assert_true(
  (SELECT count(id) = 1 FROM public.alunos WHERE escola_id = '10000000-0000-0000-0000-000000000001')
    AND (SELECT count(id) = 0 FROM public.alunos WHERE escola_id = '10000000-0000-0000-0000-000000000002'),
  'restored teacher roster is restricted to own class and school'
);
-- Execute the complete permitted projection as the restored teacher, not only
-- privilege introspection as the cluster owner.
SELECT pg_temp.assert_true(
  (SELECT count(*) = 1 FROM (
    SELECT id, escola_id, nome_completo, data_nascimento, sexo, rg, telefone,
      email, endereco, responsavel_id, ativo, created_at, cor_raca,
      zona_residencial, transporte_escolar, tipo_deficiencia, import_source_id,
      pilot_import_batch_id
    FROM public.alunos
  ) roster),
  'all 18 permitted columns remain readable under teacher RLS'
);
DO $$
BEGIN
  BEGIN
    PERFORM cpf FROM public.alunos;
    RAISE EXCEPTION 'CPF read unexpectedly succeeded';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    PERFORM nis FROM public.alunos;
    RAISE EXCEPTION 'NIS read unexpectedly succeeded';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    PERFORM id FROM public.notas;
    RAISE EXCEPTION 'grades read unexpectedly succeeded';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    INSERT INTO public.frequencia(matricula_id, sessao_id, data_aula, presente, status_presenca, professor_id, marcado_por)
    VALUES ('50000000-0000-0000-0000-000000000002', '60000000-0000-0000-0000-000000000001',
      (now() AT TIME ZONE 'America/Sao_Paulo')::date, true, 'P',
      '20000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001');
    RAISE EXCEPTION 'cross-school attendance write unexpectedly succeeded';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END;
$$;
ROLLBACK;
\echo RESTORE_SCOPE_OK: SQL claims only, no Auth service session proved
