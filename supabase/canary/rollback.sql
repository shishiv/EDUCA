BEGIN;

SELECT pg_advisory_xact_lock(hashtextextended('ca000000-0000-0000-0000-000000000001', 0));

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.school_schema_registry
    WHERE school_id = 'ca000000-0000-0000-0000-000000000001'::uuid
      AND schema_name = 'school_ca000000000000000000000000000001'
      AND routing_state = 'disabled'
      AND is_synthetic
  ) THEN
    RAISE EXCEPTION 'CANARY_REGISTRY_SAFETY_CHECK_FAILED';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_constraint AS dependency
    JOIN pg_class AS dependent_relation ON dependent_relation.oid = dependency.conrelid
    JOIN pg_namespace AS dependent_schema ON dependent_schema.oid = dependent_relation.relnamespace
    JOIN pg_class AS referenced_relation ON referenced_relation.oid = dependency.confrelid
    JOIN pg_namespace AS referenced_schema ON referenced_schema.oid = referenced_relation.relnamespace
    WHERE referenced_schema.nspname = 'school_ca000000000000000000000000000001'
      AND dependent_schema.nspname <> referenced_schema.nspname
  ) THEN
    RAISE EXCEPTION 'CANARY_EXTERNAL_FOREIGN_KEY_DEPENDENCY';
  END IF;

  IF EXISTS (
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
  ) THEN
    RAISE EXCEPTION 'CANARY_EXTERNAL_VIEW_DEPENDENCY';
  END IF;
END;
$$;

CREATE TEMP TABLE canary_external_catalog_before ON COMMIT DROP AS
SELECT 'relation'::text AS object_type, class.oid AS object_id
FROM pg_class AS class
JOIN pg_namespace AS namespace ON namespace.oid = class.relnamespace
WHERE namespace.nspname <> 'school_ca000000000000000000000000000001'
  AND namespace.nspname NOT LIKE 'pg_temp_%'
  AND namespace.nspname NOT LIKE 'pg_toast%'
UNION ALL
SELECT 'function', function_record.oid
FROM pg_proc AS function_record
JOIN pg_namespace AS namespace ON namespace.oid = function_record.pronamespace
WHERE namespace.nspname <> 'school_ca000000000000000000000000000001'
  AND namespace.nspname NOT LIKE 'pg_temp_%'
UNION ALL
SELECT 'constraint', constraint_record.oid
FROM pg_constraint AS constraint_record
JOIN pg_namespace AS namespace ON namespace.oid = constraint_record.connamespace
WHERE namespace.nspname <> 'school_ca000000000000000000000000000001'
  AND namespace.nspname NOT LIKE 'pg_temp_%'
UNION ALL
SELECT 'policy', policy_record.oid
FROM pg_policy AS policy_record
JOIN pg_class AS class ON class.oid = policy_record.polrelid
JOIN pg_namespace AS namespace ON namespace.oid = class.relnamespace
WHERE namespace.nspname <> 'school_ca000000000000000000000000000001'
  AND namespace.nspname NOT LIKE 'pg_temp_%'
UNION ALL
SELECT 'trigger', trigger_record.oid
FROM pg_trigger AS trigger_record
JOIN pg_class AS class ON class.oid = trigger_record.tgrelid
JOIN pg_namespace AS namespace ON namespace.oid = class.relnamespace
WHERE namespace.nspname <> 'school_ca000000000000000000000000000001'
  AND namespace.nspname NOT LIKE 'pg_temp_%'
  AND NOT EXISTS (
    SELECT 1
    FROM pg_constraint AS trigger_constraint
    JOIN pg_namespace AS constraint_schema ON constraint_schema.oid = trigger_constraint.connamespace
    WHERE trigger_constraint.oid = trigger_record.tgconstraint
      AND constraint_schema.nspname = 'school_ca000000000000000000000000000001'
  );

DROP SCHEMA school_ca000000000000000000000000000001 CASCADE;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM (
      SELECT object_type, object_id
      FROM canary_external_catalog_before
      EXCEPT
      SELECT catalog_after.object_type, catalog_after.object_id
      FROM (
      SELECT 'relation'::text AS object_type, class.oid AS object_id
      FROM pg_class AS class
      JOIN pg_namespace AS namespace ON namespace.oid = class.relnamespace
      WHERE namespace.nspname NOT LIKE 'pg_temp_%'
        AND namespace.nspname NOT LIKE 'pg_toast%'
      UNION ALL
      SELECT 'function', function_record.oid
      FROM pg_proc AS function_record
      JOIN pg_namespace AS namespace ON namespace.oid = function_record.pronamespace
      WHERE namespace.nspname NOT LIKE 'pg_temp_%'
      UNION ALL
      SELECT 'constraint', constraint_record.oid
      FROM pg_constraint AS constraint_record
      JOIN pg_namespace AS namespace ON namespace.oid = constraint_record.connamespace
      WHERE namespace.nspname NOT LIKE 'pg_temp_%'
      UNION ALL
      SELECT 'policy', policy_record.oid
      FROM pg_policy AS policy_record
      UNION ALL
        SELECT 'trigger', trigger_record.oid
        FROM pg_trigger AS trigger_record
      ) AS catalog_after
    ) AS missing_external_object
  ) THEN
    RAISE EXCEPTION 'CANARY_ROLLBACK_REMOVED_EXTERNAL_OBJECT';
  END IF;
END;
$$;

DELETE FROM public.school_schema_versions
WHERE school_id = 'ca000000-0000-0000-0000-000000000001'::uuid;

DELETE FROM public.school_schema_registry
WHERE school_id = 'ca000000-0000-0000-0000-000000000001'::uuid;

DO $$
BEGIN
  IF to_regnamespace('school_ca000000000000000000000000000001') IS NOT NULL THEN
    RAISE EXCEPTION 'CANARY_SCHEMA_ROLLBACK_FAILED';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.school_schema_registry
    WHERE school_id = 'ca000000-0000-0000-0000-000000000001'::uuid
  ) OR EXISTS (
    SELECT 1
    FROM public.school_schema_versions
    WHERE school_id = 'ca000000-0000-0000-0000-000000000001'::uuid
  ) THEN
    RAISE EXCEPTION 'CANARY_METADATA_ROLLBACK_FAILED';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.escolas
    WHERE id = 'ca000000-0000-0000-0000-000000000001'::uuid
      AND codigo = 'SCHEMA-CANARY-SYNTHETIC'
  ) OR NOT EXISTS (
    SELECT 1
    FROM public.anos_letivos
    WHERE escola_id = 'ca000000-0000-0000-0000-000000000001'::uuid
  ) OR NOT EXISTS (
    SELECT 1
    FROM public.configs
    WHERE escola_id = 'ca000000-0000-0000-0000-000000000001'::uuid
      AND chave = 'bolsa_familia_visible_roles'
  ) THEN
    RAISE EXCEPTION 'CANARY_PUBLIC_AUTHORITY_CHANGED';
  END IF;
END;
$$;

COMMIT;
