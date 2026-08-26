BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'educa_tenant_owner') THEN
    CREATE ROLE educa_tenant_owner NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT;
  END IF;
END;
$$;

CREATE TABLE public.school_schema_registry (
  school_id uuid PRIMARY KEY REFERENCES public.escolas(id) ON DELETE RESTRICT,
  schema_name text NOT NULL UNIQUE,
  schema_version bigint NOT NULL DEFAULT 0 CHECK (schema_version >= 0),
  routing_state text NOT NULL DEFAULT 'provisioning' CHECK (routing_state IN ('provisioning', 'active', 'restoring', 'disabled')),
  is_synthetic boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT school_schema_registry_name CHECK (
    schema_name = 'school_' || replace(school_id::text, '-', '')
    AND schema_name ~ '^school_[0-9a-f]{32}$'
  ),
  CONSTRAINT school_schema_registry_synthetic_not_active CHECK (
    NOT is_synthetic OR routing_state <> 'active'
  )
);

CREATE TABLE public.school_schema_versions (
  school_id uuid NOT NULL REFERENCES public.school_schema_registry(school_id) ON DELETE RESTRICT,
  version bigint NOT NULL CHECK (version > 0),
  checksum text NOT NULL CHECK (checksum ~ '^[0-9a-f]{64}$'),
  applied_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (school_id, version)
);

ALTER TABLE public.school_schema_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_schema_versions ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.school_schema_registry FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.school_schema_versions FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.school_schema_registry TO service_role;
GRANT SELECT ON TABLE public.school_schema_versions TO service_role;

COMMIT;
