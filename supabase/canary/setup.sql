BEGIN;

SELECT pg_advisory_xact_lock(hashtextextended(:'school_id', 0));

DO $$
BEGIN
  IF to_regnamespace('school_ca000000000000000000000000000001') IS NOT NULL THEN
    RAISE EXCEPTION 'CANARY_SCHEMA_ALREADY_EXISTS';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.school_schema_registry
    WHERE school_id = 'ca000000-0000-0000-0000-000000000001'::uuid
       OR schema_name = 'school_ca000000000000000000000000000001'
  ) THEN
    RAISE EXCEPTION 'CANARY_REGISTRY_ALREADY_EXISTS';
  END IF;
END;
$$;

INSERT INTO public.escolas(id, codigo, nome, tipo, ativo)
VALUES (
  :'school_id'::uuid,
  'SCHEMA-CANARY-SYNTHETIC',
  'Escola Sintetica Schema Canary',
  'fundamental',
  true
)
ON CONFLICT (id) DO NOTHING;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.escolas
    WHERE id = 'ca000000-0000-0000-0000-000000000001'::uuid
      AND codigo = 'SCHEMA-CANARY-SYNTHETIC'
      AND nome = 'Escola Sintetica Schema Canary'
  ) THEN
    RAISE EXCEPTION 'CANARY_SOURCE_IS_NOT_SYNTHETIC';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.anos_letivos
    WHERE escola_id = 'ca000000-0000-0000-0000-000000000001'::uuid
  ) THEN
    RAISE EXCEPTION 'CANARY_SOURCE_ACADEMIC_YEAR_MISSING';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.configs
    WHERE escola_id = 'ca000000-0000-0000-0000-000000000001'::uuid
      AND chave = 'bolsa_familia_visible_roles'
  ) THEN
    RAISE EXCEPTION 'CANARY_SOURCE_BOLSA_CONFIG_MISSING';
  END IF;
END;
$$;

INSERT INTO public.school_schema_registry(
  school_id,
  schema_name,
  schema_version,
  routing_state,
  is_synthetic
)
VALUES (
  :'school_id'::uuid,
  :'canary_schema',
  0,
  'provisioning',
  true
);

\ir tenant-v1.sql

DO $$
BEGIN
  IF (SELECT count(*) FROM school_ca000000000000000000000000000001.tenant_identity) <> 1 THEN
    RAISE EXCEPTION 'CANARY_TENANT_IDENTITY_INVALID';
  END IF;

  IF (SELECT count(*) FROM school_ca000000000000000000000000000001.anos_letivos) <> (
    SELECT count(*) FROM public.anos_letivos WHERE escola_id = 'ca000000-0000-0000-0000-000000000001'::uuid
  ) THEN
    RAISE EXCEPTION 'CANARY_ACADEMIC_YEAR_COPY_INVALID';
  END IF;

  IF (SELECT count(*) FROM school_ca000000000000000000000000000001.configs) <> 1 THEN
    RAISE EXCEPTION 'CANARY_BOLSA_CONFIG_COPY_INVALID';
  END IF;
END;
$$;

INSERT INTO public.school_schema_versions(school_id, version, checksum)
VALUES (:'school_id'::uuid, 1, :'tenant_version_checksum');

UPDATE public.school_schema_registry
SET schema_version = 1,
    routing_state = 'disabled',
    updated_at = now()
WHERE school_id = :'school_id'::uuid;

COMMIT;
