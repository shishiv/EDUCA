-- public.users browser-write boundary tests.
-- Runs against the disposable migration-test cluster after canonical migrations
-- and pilot provisioning. No live or shared database is used here.

BEGIN;

CREATE FUNCTION pg_temp.assert_true(condition boolean, message text)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF condition IS DISTINCT FROM true THEN RAISE EXCEPTION 'assertion failed: %', message; END IF;
END;
$$;

SELECT pg_temp.assert_true(
  (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.users'::regclass),
  'users keeps row-level security enabled'
);
SELECT pg_temp.assert_true(
  has_table_privilege('authenticated', 'public.users', 'SELECT')
  AND NOT has_table_privilege('authenticated', 'public.users', 'INSERT')
  AND NOT has_table_privilege('authenticated', 'public.users', 'UPDATE')
  AND NOT has_table_privilege('authenticated', 'public.users', 'DELETE'),
  'authenticated keeps SELECT but has no users write privilege'
);
SELECT pg_temp.assert_true(
  NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'users'
      AND policyname = 'admin_full_access'
  ),
  'users has no browser admin_full_access policy'
);

-- The existing server-side/service-role contract remains writable. This is a
-- disposable fixture proving the grant was not accidentally removed.
SELECT pg_temp.assert_true(
  has_table_privilege('service_role', 'public.users', 'INSERT')
  AND has_table_privilege('service_role', 'public.users', 'UPDATE')
  AND has_table_privilege('service_role', 'public.users', 'DELETE'),
  'service_role retains the existing users write contract'
);

SET LOCAL ROLE postgres;
INSERT INTO public.escolas(id, codigo, nome, tipo)
VALUES
  ('91000000-0000-0000-0000-000000000001', 'S2-A', 'S2 Escola A', 'fundamental'),
  ('91000000-0000-0000-0000-000000000002', 'S2-B', 'S2 Escola B', 'fundamental');
INSERT INTO public.users(id, nome, email, tipo_usuario, escola_id, ativo)
VALUES
  ('92000000-0000-0000-0000-000000000001', 'S2 Diretora A', 's2-a@synthetic.invalid', 'diretor', '91000000-0000-0000-0000-000000000001', true),
  ('92000000-0000-0000-0000-000000000002', 'S2 Professor A', 's2-prof-a@synthetic.invalid', 'professor', '91000000-0000-0000-0000-000000000001', true),
  ('92000000-0000-0000-0000-000000000003', 'S2 Diretora B', 's2-b@synthetic.invalid', 'diretor', '91000000-0000-0000-0000-000000000002', true);

-- SELECT remains constrained by the existing school-aware policies.
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '92000000-0000-0000-0000-000000000001', true);
SELECT pg_temp.assert_true(
  (SELECT count(*) = 2 FROM public.users)
  AND (SELECT count(*) = 0 FROM public.users WHERE id = '92000000-0000-0000-0000-000000000003'),
  'director A can read self and school A users but not school B users'
);

DO $$
BEGIN
  BEGIN
    INSERT INTO public.users(id, nome, email, tipo_usuario, escola_id, ativo)
    VALUES ('92000000-0000-0000-0000-000000000004', 'Browser Insert', 'insert@synthetic.invalid', 'professor', '91000000-0000-0000-0000-000000000001', true);
    RAISE EXCEPTION 'authenticated INSERT into users unexpectedly succeeded';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;

  BEGIN
    UPDATE public.users SET nome = 'Browser Update' WHERE id = '92000000-0000-0000-0000-000000000001';
    RAISE EXCEPTION 'authenticated UPDATE of users unexpectedly succeeded';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;

  BEGIN
    DELETE FROM public.users WHERE id = '92000000-0000-0000-0000-000000000002';
    RAISE EXCEPTION 'authenticated DELETE from users unexpectedly succeeded';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;
END $$;

-- The explicitly bounded server-side role can still maintain profiles when an
-- existing server path has already authenticated and authorized the action.
SET LOCAL ROLE service_role;
INSERT INTO public.users(id, nome, email, tipo_usuario, escola_id, ativo)
VALUES ('92000000-0000-0000-0000-000000000005', 'Service User', 'service@synthetic.invalid', 'professor', '91000000-0000-0000-0000-000000000001', true);
UPDATE public.users SET nome = 'Service User Updated'
WHERE id = '92000000-0000-0000-0000-000000000005';
DELETE FROM public.users WHERE id = '92000000-0000-0000-0000-000000000005';

ROLLBACK;
