BEGIN;

-- Database contract for the ten security-advisor ERROR findings.
-- The eight tables are legacy or blocked, so browser roles must have neither
-- grants nor effective access. service_role remains the controlled positive
-- path. The views retain their deployed columns and are security invoker.
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

-- ---------------------------------------------------------------------------
-- RLS state, deny policies, and grants for all eight tables
-- ---------------------------------------------------------------------------
SELECT pg_temp.assert_true(
  (SELECT relrowsecurity FROM pg_class WHERE oid = 'public."School"'::regclass),
  'public.School has RLS enabled'
);
SELECT pg_temp.assert_true(
  (SELECT relrowsecurity FROM pg_class WHERE oid = 'public."User"'::regclass),
  'public.User has RLS enabled'
);
SELECT pg_temp.assert_true(
  (SELECT relrowsecurity FROM pg_class WHERE oid = 'public."UserRole"'::regclass),
  'public.UserRole has RLS enabled'
);
SELECT pg_temp.assert_true(
  (SELECT relrowsecurity FROM pg_class WHERE oid = 'public."Role"'::regclass),
  'public.Role has RLS enabled'
);
SELECT pg_temp.assert_true(
  (SELECT relrowsecurity FROM pg_class WHERE oid = 'public."RolePermission"'::regclass),
  'public.RolePermission has RLS enabled'
);
SELECT pg_temp.assert_true(
  (SELECT relrowsecurity FROM pg_class WHERE oid = 'public."Permission"'::regclass),
  'public.Permission has RLS enabled'
);
SELECT pg_temp.assert_true(
  (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.codigos_inep'::regclass),
  'public.codigos_inep has RLS enabled'
);
SELECT pg_temp.assert_true(
  (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.educacenso_exports'::regclass),
  'public.educacenso_exports has RLS enabled'
);

SELECT pg_temp.assert_true(
  (SELECT count(*) = 1 FROM pg_policies
   WHERE schemaname = 'public' AND tablename = 'School'
     AND policyname = 'security_errors_school_browser_denied'
     AND cmd = 'ALL' AND roles @> ARRAY['anon'::name, 'authenticated'::name]),
  'public.School has an explicit browser deny policy'
);
SELECT pg_temp.assert_true(
  (SELECT count(*) = 1 FROM pg_policies
   WHERE schemaname = 'public' AND tablename = 'User'
     AND policyname = 'security_errors_user_browser_denied'
     AND cmd = 'ALL' AND roles @> ARRAY['anon'::name, 'authenticated'::name]),
  'public.User has an explicit browser deny policy'
);
SELECT pg_temp.assert_true(
  (SELECT count(*) = 1 FROM pg_policies
   WHERE schemaname = 'public' AND tablename = 'UserRole'
     AND policyname = 'security_errors_user_role_browser_denied'
     AND cmd = 'ALL' AND roles @> ARRAY['anon'::name, 'authenticated'::name]),
  'public.UserRole has an explicit browser deny policy'
);
SELECT pg_temp.assert_true(
  (SELECT count(*) = 1 FROM pg_policies
   WHERE schemaname = 'public' AND tablename = 'Role'
     AND policyname = 'security_errors_role_browser_denied'
     AND cmd = 'ALL' AND roles @> ARRAY['anon'::name, 'authenticated'::name]),
  'public.Role has an explicit browser deny policy'
);
SELECT pg_temp.assert_true(
  (SELECT count(*) = 1 FROM pg_policies
   WHERE schemaname = 'public' AND tablename = 'RolePermission'
     AND policyname = 'security_errors_role_permission_browser_denied'
     AND cmd = 'ALL' AND roles @> ARRAY['anon'::name, 'authenticated'::name]),
  'public.RolePermission has an explicit browser deny policy'
);
SELECT pg_temp.assert_true(
  (SELECT count(*) = 1 FROM pg_policies
   WHERE schemaname = 'public' AND tablename = 'Permission'
     AND policyname = 'security_errors_permission_browser_denied'
     AND cmd = 'ALL' AND roles @> ARRAY['anon'::name, 'authenticated'::name]),
  'public.Permission has an explicit browser deny policy'
);
SELECT pg_temp.assert_true(
  (SELECT count(*) = 1 FROM pg_policies
   WHERE schemaname = 'public' AND tablename = 'codigos_inep'
     AND policyname = 'security_errors_codigos_inep_browser_denied'
     AND cmd = 'ALL' AND roles @> ARRAY['anon'::name, 'authenticated'::name]),
  'public.codigos_inep has an explicit browser deny policy'
);
SELECT pg_temp.assert_true(
  (SELECT count(*) = 1 FROM pg_policies
   WHERE schemaname = 'public' AND tablename = 'educacenso_exports'
     AND policyname = 'security_errors_educacenso_exports_browser_denied'
     AND cmd = 'ALL' AND roles @> ARRAY['anon'::name, 'authenticated'::name]),
  'public.educacenso_exports has an explicit browser deny policy'
);

SELECT pg_temp.assert_true(
  NOT has_table_privilege('anon', 'public."School"', 'SELECT')
    AND NOT has_table_privilege('authenticated', 'public."School"', 'SELECT')
    AND has_table_privilege('service_role', 'public."School"', 'SELECT'),
  'public.School grants are browser-denied and service-role-readable'
);
SELECT pg_temp.assert_true(
  NOT has_table_privilege('anon', 'public."User"', 'SELECT')
    AND NOT has_table_privilege('authenticated', 'public."User"', 'SELECT')
    AND has_table_privilege('service_role', 'public."User"', 'SELECT'),
  'public.User grants are browser-denied and service-role-readable'
);
SELECT pg_temp.assert_true(
  NOT has_table_privilege('anon', 'public."UserRole"', 'SELECT')
    AND NOT has_table_privilege('authenticated', 'public."UserRole"', 'SELECT')
    AND has_table_privilege('service_role', 'public."UserRole"', 'SELECT'),
  'public.UserRole grants are browser-denied and service-role-readable'
);
SELECT pg_temp.assert_true(
  NOT has_table_privilege('anon', 'public."Role"', 'SELECT')
    AND NOT has_table_privilege('authenticated', 'public."Role"', 'SELECT')
    AND has_table_privilege('service_role', 'public."Role"', 'SELECT'),
  'public.Role grants are browser-denied and service-role-readable'
);
SELECT pg_temp.assert_true(
  NOT has_table_privilege('anon', 'public."RolePermission"', 'SELECT')
    AND NOT has_table_privilege('authenticated', 'public."RolePermission"', 'SELECT')
    AND has_table_privilege('service_role', 'public."RolePermission"', 'SELECT'),
  'public.RolePermission grants are browser-denied and service-role-readable'
);
SELECT pg_temp.assert_true(
  NOT has_table_privilege('anon', 'public."Permission"', 'SELECT')
    AND NOT has_table_privilege('authenticated', 'public."Permission"', 'SELECT')
    AND has_table_privilege('service_role', 'public."Permission"', 'SELECT'),
  'public.Permission grants are browser-denied and service-role-readable'
);
SELECT pg_temp.assert_true(
  NOT has_table_privilege('anon', 'public.codigos_inep', 'SELECT')
    AND NOT has_table_privilege('authenticated', 'public.codigos_inep', 'SELECT')
    AND has_table_privilege('service_role', 'public.codigos_inep', 'SELECT'),
  'public.codigos_inep grants are browser-denied and service-role-readable'
);
SELECT pg_temp.assert_true(
  NOT has_table_privilege('anon', 'public.educacenso_exports', 'SELECT')
    AND NOT has_table_privilege('authenticated', 'public.educacenso_exports', 'SELECT')
    AND has_table_privilege('service_role', 'public.educacenso_exports', 'SELECT'),
  'public.educacenso_exports grants are browser-denied and service-role-readable'
);

-- ---------------------------------------------------------------------------
-- View options and deployed column contracts
-- ---------------------------------------------------------------------------
SELECT pg_temp.assert_true(
  (SELECT coalesce(reloptions, ARRAY[]::text[]) @> ARRAY['security_invoker=true']
   FROM pg_class WHERE oid = 'public.vw_alunos_risco_bolsa_familia'::regclass),
  'legacy Bolsa Familia view uses caller privileges'
);
SELECT pg_temp.assert_true(
  (SELECT coalesce(reloptions, ARRAY[]::text[]) @> ARRAY['security_invoker=true']
   FROM pg_class WHERE oid = 'public.audit_summary'::regclass),
  'audit summary view uses caller privileges'
);
SELECT pg_temp.assert_true(
  (SELECT array_agg(column_name ORDER BY ordinal_position)::text[] = ARRAY[
      'aluno_id', 'nome_completo', 'nis', 'bolsa_familia', 'matricula_id',
      'turma_id', 'turma_nome', 'serie', 'escola_id', 'escola_nome',
      'presencas', 'faltas', 'atestados', 'total_aulas',
      'percentual_frequencia'
    ]::text[]
   FROM information_schema.columns
   WHERE table_schema = 'public' AND table_name = 'vw_alunos_risco_bolsa_familia'),
  'legacy Bolsa Familia view columns are preserved'
);
SELECT pg_temp.assert_true(
  (SELECT array_agg(column_name ORDER BY ordinal_position)::text[] = ARRAY[
      'log_date', 'escola_id', 'action', 'event_count', 'unique_users',
      'first_event', 'last_event'
    ]::text[]
   FROM information_schema.columns
   WHERE table_schema = 'public' AND table_name = 'audit_summary'),
  'audit summary view columns are preserved'
);
SELECT pg_temp.assert_true(
  NOT has_table_privilege('anon', 'public.vw_alunos_risco_bolsa_familia', 'SELECT')
    AND NOT has_table_privilege('authenticated', 'public.vw_alunos_risco_bolsa_familia', 'SELECT')
    AND has_table_privilege('service_role', 'public.vw_alunos_risco_bolsa_familia', 'SELECT')
    AND NOT has_table_privilege('anon', 'public.audit_summary', 'SELECT')
    AND NOT has_table_privilege('authenticated', 'public.audit_summary', 'SELECT')
    AND has_table_privilege('service_role', 'public.audit_summary', 'SELECT'),
  'both view grants keep browser roles blocked and service_role available'
);

-- ---------------------------------------------------------------------------
-- Positive controlled path: service_role can still use the legacy/blocked
-- relations for maintenance without making them a browser login dependency.
-- ---------------------------------------------------------------------------
RESET ROLE;
SET LOCAL ROLE service_role;
INSERT INTO public."School"(id, name)
VALUES
  ('a1000000-0000-0000-0000-000000000001', 'Legacy School A'),
  ('a1000000-0000-0000-0000-000000000002', 'Legacy School B');
INSERT INTO public."User"(id, email, full_name, school_id)
VALUES
  ('a2000000-0000-0000-0000-000000000001', 'legacy-a@synthetic.invalid', 'Legacy A', 'a1000000-0000-0000-0000-000000000001'),
  ('a2000000-0000-0000-0000-000000000002', 'legacy-b@synthetic.invalid', 'Legacy B', 'a1000000-0000-0000-0000-000000000002');
INSERT INTO public."Role"(id, name)
VALUES ('a3000000-0000-0000-0000-000000000001', 'legacy_reader');
INSERT INTO public."Permission"(id, name)
VALUES ('a4000000-0000-0000-0000-000000000001', 'legacy_read');
INSERT INTO public."UserRole"(user_id, role_id)
VALUES
  ('a2000000-0000-0000-0000-000000000001', 'a3000000-0000-0000-0000-000000000001'),
  ('a2000000-0000-0000-0000-000000000002', 'a3000000-0000-0000-0000-000000000001');
INSERT INTO public."RolePermission"(role_id, permission_id)
VALUES ('a3000000-0000-0000-0000-000000000001', 'a4000000-0000-0000-0000-000000000001');
INSERT INTO public.escolas(id, codigo, nome, tipo, ativo)
VALUES ('a5000000-0000-0000-0000-000000000001', 'SEC-ERR-A', 'Security Error A', 'fundamental', true);
INSERT INTO public.codigos_inep(id, entidade_tipo, entidade_id, codigo_inep)
VALUES ('a6000000-0000-0000-0000-000000000001', 'escola', 'a5000000-0000-0000-0000-000000000001', 'SEC-ERR-INEP');
INSERT INTO public.educacenso_exports(id, escola_id, tipo_export, ano_referencia)
VALUES ('a7000000-0000-0000-0000-000000000001', 'a5000000-0000-0000-0000-000000000001', 'disabled', 2026);

SELECT pg_temp.assert_true(
  (SELECT count(*) = 2 FROM public."School")
    AND (SELECT count(*) = 2 FROM public."User")
    AND (SELECT count(*) = 2 FROM public."UserRole")
    AND (SELECT count(*) = 1 FROM public."Role")
    AND (SELECT count(*) = 1 FROM public."RolePermission")
    AND (SELECT count(*) = 1 FROM public."Permission")
    AND (SELECT count(*) = 1 FROM public.codigos_inep)
    AND (SELECT count(*) = 1 FROM public.educacenso_exports),
  'service_role retains the controlled positive path for all eight tables'
);
SELECT pg_temp.assert_true(
  (SELECT count(*) = 0 FROM public.vw_alunos_risco_bolsa_familia)
    AND (SELECT count(*) = 0 FROM public.audit_summary),
  'service_role can query both preserved views in the empty disposable fixture'
);

-- ---------------------------------------------------------------------------
-- Effective browser denial for both roles, including the blocked modules.
-- ---------------------------------------------------------------------------
RESET ROLE;
SET LOCAL ROLE anon;
DO $$
DECLARE relation_name text;
BEGIN
  FOREACH relation_name IN ARRAY ARRAY[
    'School', 'User', 'UserRole', 'Role', 'RolePermission', 'Permission',
    'codigos_inep', 'educacenso_exports',
    'vw_alunos_risco_bolsa_familia', 'audit_summary'
  ] LOOP
    BEGIN
      EXECUTE format('SELECT count(*) FROM public.%I', relation_name);
      RAISE EXCEPTION 'anon read unexpectedly succeeded for %', relation_name;
    EXCEPTION WHEN insufficient_privilege THEN
      NULL;
    END;
  END LOOP;
END;
$$;

SET LOCAL ROLE authenticated;
DO $$
DECLARE relation_name text;
BEGIN
  FOREACH relation_name IN ARRAY ARRAY[
    'School', 'User', 'UserRole', 'Role', 'RolePermission', 'Permission',
    'codigos_inep', 'educacenso_exports',
    'vw_alunos_risco_bolsa_familia', 'audit_summary'
  ] LOOP
    BEGIN
      EXECUTE format('SELECT count(*) FROM public.%I', relation_name);
      RAISE EXCEPTION 'authenticated read unexpectedly succeeded for %', relation_name;
    EXCEPTION WHEN insufficient_privilege THEN
      NULL;
    END;
  END LOOP;
END;
$$;

-- ---------------------------------------------------------------------------
-- Deliberate break: a permissive policy and grant must make the blocked
-- assertion fail. The savepoint proves that the live transaction is restored.
-- ---------------------------------------------------------------------------
RESET ROLE;
SAVEPOINT deliberate_security_advisor_break;
GRANT SELECT ON TABLE public."School" TO authenticated;
CREATE POLICY security_errors_deliberate_school_break
ON public."School"
FOR SELECT TO authenticated
USING (true);
SET LOCAL ROLE authenticated;
DO $$
BEGIN
  BEGIN
    PERFORM pg_temp.assert_true(
      (SELECT count(*) = 0 FROM public."School"),
      'deliberate permissive policy break was not detected'
    );
    RAISE EXCEPTION 'deliberate permissive policy break unexpectedly passed';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM NOT LIKE 'assertion failed: deliberate permissive policy break was not detected' THEN
      RAISE;
    END IF;
  END;
END;
$$;
RESET ROLE;
ROLLBACK TO SAVEPOINT deliberate_security_advisor_break;

SELECT pg_temp.assert_true(
  NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'School'
      AND policyname = 'security_errors_deliberate_school_break'
  )
  AND NOT has_table_privilege('authenticated', 'public."School"', 'SELECT'),
  'deliberate permissive policy and grant were rolled back'
);

RESET ROLE;
ROLLBACK;
