BEGIN;

CREATE FUNCTION pg_temp.assert_true(condition boolean, message text)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF condition IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'RESTORE_GRANTS_REGRESSION: %', message;
  END IF;
END;
$$;

SELECT pg_temp.assert_true((SELECT * FROM restore_grants), 'current column contract must pass');
SELECT pg_temp.assert_true(
  NOT has_table_privilege('authenticated', 'public.alunos', 'SELECT'),
  'legacy RESTORE_GRANTS_OK is false on the correct migrated schema'
);

-- Each subtransaction rolls back its deliberate mutation, including on failure.
DO $$
DECLARE
  column_name text;
  mutation text;
  tested integer := 0;
BEGIN
  FOR column_name IN
    SELECT attname FROM pg_attribute
    WHERE attrelid = 'public.alunos'::regclass AND attnum > 0 AND NOT attisdropped
      AND has_column_privilege('authenticated', attrelid, attnum, 'SELECT')
  LOOP
    BEGIN
      EXECUTE format('REVOKE SELECT (%I) ON public.alunos FROM authenticated', column_name);
      PERFORM pg_temp.assert_true(NOT (SELECT * FROM restore_grants), 'removed allowed column: ' || column_name);
      RAISE SQLSTATE 'PT001';
    EXCEPTION WHEN SQLSTATE 'PT001' THEN NULL;
    END;
    tested := tested + 1;
  END LOOP;
  PERFORM pg_temp.assert_true(tested = 18, 'all 18 allowed columns must be tested');

  FOREACH column_name IN ARRAY ARRAY['cpf', 'nis', 'bolsa_familia', 'nome_mae', 'nome_pai', 'necessidades_especiais']
  LOOP
    BEGIN
      EXECUTE format('GRANT SELECT (%I) ON public.alunos TO authenticated', column_name);
      PERFORM pg_temp.assert_true(NOT (SELECT * FROM restore_grants), 'sensitive read exposed: ' || column_name);
      RAISE SQLSTATE 'PT001';
    EXCEPTION WHEN SQLSTATE 'PT001' THEN NULL;
    END;
  END LOOP;

  FOREACH mutation IN ARRAY ARRAY[
    'GRANT SELECT (id) ON public.alunos TO anon',
    'REVOKE INSERT ON public.frequencia FROM authenticated',
    'REVOKE SELECT ON storage.objects FROM authenticated',
    'GRANT SELECT ON public.notas TO authenticated',
    'GRANT SELECT (id) ON public.notas TO authenticated',
    'GRANT SELECT (id) ON public.notas TO anon'
  ]
  LOOP
    BEGIN
      EXECUTE mutation;
      PERFORM pg_temp.assert_true(NOT (SELECT * FROM restore_grants), 'boundary mutation: ' || mutation);
      RAISE SQLSTATE 'PT001';
    EXCEPTION WHEN SQLSTATE 'PT001' THEN NULL;
    END;
  END LOOP;

  BEGIN
    GRANT SELECT ON public.alunos TO authenticated;
    PERFORM pg_temp.assert_true(has_table_privilege('authenticated', 'public.alunos', 'SELECT'), 'unsafe counterfactual masks legacy failure');
    PERFORM pg_temp.assert_true(NOT (SELECT * FROM restore_grants), 'table grant must fail the new probe');
    RAISE SQLSTATE 'PT001';
  EXCEPTION WHEN SQLSTATE 'PT001' THEN NULL;
  END;
END;
$$;
SELECT pg_temp.assert_true((SELECT * FROM restore_grants), 'all mutations rolled back');
ROLLBACK;
\echo RESTORE_GRANTS_REGRESSION_OK: legacy probe false; 18 allowed revokes, 6 sensitive grants, unsafe table grant and 6 boundary mutations rejected
