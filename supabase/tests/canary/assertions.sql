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

SELECT pg_temp.assert_true(
  EXISTS (
    SELECT 1
    FROM public.school_schema_registry
    WHERE school_id = 'ca000000-0000-0000-0000-000000000001'::uuid
      AND schema_name = 'school_ca000000000000000000000000000001'
      AND schema_version = 1
      AND routing_state = 'disabled'
      AND is_synthetic
  ),
  'synthetic canary is registered but cannot route'
);

SELECT pg_temp.assert_true(
  EXISTS (
    SELECT 1
    FROM public.school_schema_versions
    WHERE school_id = 'ca000000-0000-0000-0000-000000000001'::uuid
      AND version = 1
      AND checksum = :'tenant_version_checksum'
  ),
  'tenant migration checksum is recorded'
);

SELECT pg_temp.assert_true(
  (
    SELECT array_agg(class.relname ORDER BY class.relname)
    FROM pg_class AS class
    JOIN pg_namespace AS namespace ON namespace.oid = class.relnamespace
    WHERE namespace.nspname = 'school_ca000000000000000000000000000001'
      AND class.relkind = 'r'
  ) = ARRAY['anos_letivos', 'configs', 'tenant_identity']::name[],
  'canary contains only the three approved tables'
);

SELECT pg_temp.assert_true(
  NOT EXISTS (
    (SELECT * FROM school_ca000000000000000000000000000001.anos_letivos)
    EXCEPT
    (SELECT * FROM public.anos_letivos WHERE escola_id = 'ca000000-0000-0000-0000-000000000001'::uuid)
  )
  AND NOT EXISTS (
    (SELECT * FROM public.anos_letivos WHERE escola_id = 'ca000000-0000-0000-0000-000000000001'::uuid)
    EXCEPT
    (SELECT * FROM school_ca000000000000000000000000000001.anos_letivos)
  ),
  'academic year rows match the authoritative public source'
);

SELECT pg_temp.assert_true(
  NOT EXISTS (
    (SELECT * FROM school_ca000000000000000000000000000001.configs)
    EXCEPT
    (SELECT * FROM public.configs
     WHERE escola_id = 'ca000000-0000-0000-0000-000000000001'::uuid
       AND chave = 'bolsa_familia_visible_roles')
  )
  AND NOT EXISTS (
    (SELECT * FROM public.configs
     WHERE escola_id = 'ca000000-0000-0000-0000-000000000001'::uuid
       AND chave = 'bolsa_familia_visible_roles')
    EXCEPT
    (SELECT * FROM school_ca000000000000000000000000000001.configs)
  ),
  'Bolsa Familia configuration matches the authoritative public source'
);

SELECT pg_temp.assert_true(
  NOT EXISTS (
    (
      SELECT table_name, column_name, ordinal_position, data_type, udt_name, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema = 'school_ca000000000000000000000000000001'
        AND table_name IN ('anos_letivos', 'configs')
    )
    EXCEPT
    (
      SELECT table_name, column_name, ordinal_position, data_type, udt_name, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name IN ('anos_letivos', 'configs')
    )
  )
  AND NOT EXISTS (
    (
      SELECT table_name, column_name, ordinal_position, data_type, udt_name, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name IN ('anos_letivos', 'configs')
    )
    EXCEPT
    (
      SELECT table_name, column_name, ordinal_position, data_type, udt_name, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema = 'school_ca000000000000000000000000000001'
        AND table_name IN ('anos_letivos', 'configs')
    )
  ),
  'tenant and public table columns are catalog-equivalent'
);

SELECT pg_temp.assert_true(
  (
    SELECT count(*) = 3
    FROM pg_constraint AS constraint_record
    JOIN pg_class AS class ON class.oid = constraint_record.conrelid
    JOIN pg_namespace AS namespace ON namespace.oid = class.relnamespace
    WHERE namespace.nspname = 'school_ca000000000000000000000000000001'
      AND constraint_record.contype = 'f'
      AND (
        constraint_record.confrelid IN (
          'school_ca000000000000000000000000000001.tenant_identity'::regclass,
          'public.users'::regclass
        )
      )
  ),
  'tenant foreign keys use only local identity and shared users'
);

SELECT pg_temp.assert_true(
  NOT EXISTS (
    SELECT 1
    FROM pg_constraint AS dependency
    JOIN pg_class AS dependent_relation ON dependent_relation.oid = dependency.conrelid
    JOIN pg_namespace AS dependent_schema ON dependent_schema.oid = dependent_relation.relnamespace
    JOIN pg_class AS referenced_relation ON referenced_relation.oid = dependency.confrelid
    JOIN pg_namespace AS referenced_schema ON referenced_schema.oid = referenced_relation.relnamespace
    WHERE dependent_schema.nspname LIKE 'school\_%' ESCAPE '\'
      AND referenced_schema.nspname LIKE 'school\_%' ESCAPE '\'
      AND dependent_schema.nspname <> referenced_schema.nspname
  ),
  'tenant schemas have zero cross-tenant foreign keys'
);

SELECT pg_temp.assert_true(
  NOT EXISTS (
    SELECT 1
    FROM pg_depend AS dependency
    JOIN pg_rewrite AS rewrite_rule
      ON dependency.classid = 'pg_rewrite'::regclass
     AND dependency.objid = rewrite_rule.oid
    JOIN pg_class AS dependent_relation ON dependent_relation.oid = rewrite_rule.ev_class
    JOIN pg_namespace AS dependent_schema ON dependent_schema.oid = dependent_relation.relnamespace
    JOIN pg_class AS referenced_relation
      ON dependency.refclassid = 'pg_class'::regclass
     AND dependency.refobjid = referenced_relation.oid
    JOIN pg_namespace AS referenced_schema ON referenced_schema.oid = referenced_relation.relnamespace
    WHERE referenced_schema.nspname = 'school_ca000000000000000000000000000001'
      AND dependent_schema.nspname <> referenced_schema.nspname
  ),
  'no object outside the canary schema depends on a canary relation'
);

SELECT pg_temp.assert_true(
  (
    SELECT namespace_owner.rolname = 'educa_tenant_owner'
    FROM pg_namespace AS namespace
    JOIN pg_roles AS namespace_owner ON namespace_owner.oid = namespace.nspowner
    WHERE namespace.nspname = 'school_ca000000000000000000000000000001'
  )
  AND NOT (SELECT rolcanlogin FROM pg_roles WHERE rolname = 'educa_tenant_owner')
  AND NOT EXISTS (
    SELECT 1
    FROM pg_class AS class
    JOIN pg_namespace AS namespace ON namespace.oid = class.relnamespace
    JOIN pg_roles AS object_owner ON object_owner.oid = class.relowner
    WHERE namespace.nspname = 'school_ca000000000000000000000000000001'
      AND class.relkind IN ('r', 'i')
      AND object_owner.rolname <> 'educa_tenant_owner'
  ),
  'schema and relations use the no-login tenant owner'
);

SELECT pg_temp.assert_true(
  NOT has_schema_privilege('anon', 'school_ca000000000000000000000000000001', 'USAGE')
  AND NOT has_schema_privilege('authenticated', 'school_ca000000000000000000000000000001', 'USAGE')
  AND has_schema_privilege('service_role', 'school_ca000000000000000000000000000001', 'USAGE')
  AND NOT has_schema_privilege('service_role', 'school_ca000000000000000000000000000001', 'CREATE'),
  'schema grants exclude browser roles and creation by service role'
);

SELECT pg_temp.assert_true(
  NOT EXISTS (
    SELECT 1
    FROM information_schema.role_table_grants
    WHERE table_schema = 'school_ca000000000000000000000000000001'
      AND grantee IN ('anon', 'authenticated', 'PUBLIC')
  )
  AND (
    SELECT count(DISTINCT table_name) = 3
    FROM information_schema.role_table_grants
    WHERE table_schema = 'school_ca000000000000000000000000000001'
      AND grantee = 'service_role'
      AND privilege_type = 'SELECT'
  ),
  'table grants are service-only and read-only'
);

SELECT pg_temp.assert_true(
  (
    SELECT count(*) = 3 AND bool_and(class.relrowsecurity) AND bool_and(class.relforcerowsecurity)
    FROM pg_class AS class
    JOIN pg_namespace AS namespace ON namespace.oid = class.relnamespace
    WHERE namespace.nspname = 'school_ca000000000000000000000000000001'
      AND class.relkind = 'r'
  )
  AND (
    SELECT count(*) = 6
    FROM pg_policies
    WHERE schemaname = 'school_ca000000000000000000000000000001'
  ),
  'RLS is forced and expected policies are present'
);

SELECT pg_temp.assert_true(
  NOT EXISTS (
    SELECT 1
    FROM pg_trigger AS trigger_record
    JOIN pg_class AS class ON class.oid = trigger_record.tgrelid
    JOIN pg_namespace AS namespace ON namespace.oid = class.relnamespace
    WHERE namespace.nspname = 'school_ca000000000000000000000000000001'
      AND NOT trigger_record.tgisinternal
  ),
  'canary has no dual-write triggers'
);

SELECT pg_temp.assert_true(
  coalesce(
    (
      SELECT array_to_string(rolconfig, ',') NOT LIKE '%school_ca000000000000000000000000000001%'
      FROM pg_roles
      WHERE rolname = 'authenticator'
    ),
    true
  ),
  'database PostgREST configuration does not expose the canary'
);

UPDATE school_ca000000000000000000000000000001.configs
SET valor = 'admin'
WHERE chave = 'bolsa_familia_visible_roles';

SELECT pg_temp.assert_true(
  (
    SELECT valor = 'admin,diretor,secretario'
    FROM public.configs
    WHERE escola_id = 'ca000000-0000-0000-0000-000000000001'::uuid
      AND chave = 'bolsa_familia_visible_roles'
  ),
  'tenant writes do not modify authoritative public data'
);

ROLLBACK;
