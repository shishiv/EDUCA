CREATE SCHEMA :"canary_schema" AUTHORIZATION educa_tenant_owner;

CREATE TABLE :"canary_schema".tenant_identity (
  school_id uuid PRIMARY KEY,
  schema_version bigint NOT NULL CHECK (schema_version > 0),
  CONSTRAINT tenant_identity_exact_school CHECK (school_id = :'school_id'::uuid)
);

CREATE TABLE :"canary_schema".anos_letivos (
  LIKE public.anos_letivos INCLUDING ALL
);

ALTER TABLE :"canary_schema".anos_letivos
  ADD CONSTRAINT anos_letivos_tenant_identity_fkey
  FOREIGN KEY (escola_id)
  REFERENCES :"canary_schema".tenant_identity(school_id)
  ON DELETE RESTRICT;

CREATE TABLE :"canary_schema".configs (
  LIKE public.configs INCLUDING ALL
);

ALTER TABLE :"canary_schema".configs
  ADD CONSTRAINT configs_tenant_identity_fkey
  FOREIGN KEY (escola_id)
  REFERENCES :"canary_schema".tenant_identity(school_id)
  ON DELETE RESTRICT,
  ADD CONSTRAINT configs_shared_user_fkey
  FOREIGN KEY (criado_por)
  REFERENCES public.users(id)
  ON DELETE RESTRICT;

ALTER TABLE :"canary_schema".tenant_identity ENABLE ROW LEVEL SECURITY;
ALTER TABLE :"canary_schema".tenant_identity FORCE ROW LEVEL SECURITY;
ALTER TABLE :"canary_schema".anos_letivos ENABLE ROW LEVEL SECURITY;
ALTER TABLE :"canary_schema".anos_letivos FORCE ROW LEVEL SECURITY;
ALTER TABLE :"canary_schema".configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE :"canary_schema".configs FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_identity_select
ON :"canary_schema".tenant_identity
FOR SELECT TO authenticated
USING (
  school_id = :'school_id'::uuid
  AND public.pilot_can_access_school(school_id)
);

CREATE POLICY anos_letivos_select
ON :"canary_schema".anos_letivos
FOR SELECT TO authenticated
USING (
  escola_id = :'school_id'::uuid
  AND public.pilot_can_access_school(escola_id)
);

CREATE POLICY anos_letivos_insert
ON :"canary_schema".anos_letivos
FOR INSERT TO authenticated
WITH CHECK (
  escola_id = :'school_id'::uuid
  AND public.pilot_can_manage_school(escola_id)
);

CREATE POLICY anos_letivos_update
ON :"canary_schema".anos_letivos
FOR UPDATE TO authenticated
USING (
  escola_id = :'school_id'::uuid
  AND public.pilot_can_manage_school(escola_id)
)
WITH CHECK (
  escola_id = :'school_id'::uuid
  AND public.pilot_can_manage_school(escola_id)
);

CREATE POLICY configs_select
ON :"canary_schema".configs
FOR SELECT TO authenticated
USING (
  escola_id = :'school_id'::uuid
  AND public.pilot_can_access_school(escola_id)
);

CREATE POLICY bolsa_familia_visibility_config_update
ON :"canary_schema".configs
FOR UPDATE TO authenticated
USING (
  escola_id = :'school_id'::uuid
  AND chave = 'bolsa_familia_visible_roles'
  AND (
    public.pilot_current_role() = 'admin'
    OR (
      public.pilot_current_role() = 'diretor'
      AND public.pilot_can_manage_school(escola_id)
    )
  )
)
WITH CHECK (
  escola_id = :'school_id'::uuid
  AND chave = 'bolsa_familia_visible_roles'
  AND valor ~ '^(none|admin(,diretor)?(,secretario)?|diretor(,secretario)?|secretario)$'
  AND (
    public.pilot_current_role() = 'admin'
    OR (
      public.pilot_current_role() = 'diretor'
      AND public.pilot_can_manage_school(escola_id)
    )
  )
);

INSERT INTO :"canary_schema".tenant_identity(school_id, schema_version)
VALUES (:'school_id'::uuid, 1);

INSERT INTO :"canary_schema".anos_letivos
SELECT academic_year.*
FROM public.anos_letivos AS academic_year
WHERE academic_year.escola_id = :'school_id'::uuid;

INSERT INTO :"canary_schema".configs
SELECT config.*
FROM public.configs AS config
WHERE config.escola_id = :'school_id'::uuid
  AND config.chave = 'bolsa_familia_visible_roles';

ALTER TABLE :"canary_schema".tenant_identity OWNER TO educa_tenant_owner;
ALTER TABLE :"canary_schema".anos_letivos OWNER TO educa_tenant_owner;
ALTER TABLE :"canary_schema".configs OWNER TO educa_tenant_owner;

REVOKE ALL ON SCHEMA :"canary_schema" FROM PUBLIC, anon, authenticated;
REVOKE ALL ON ALL TABLES IN SCHEMA :"canary_schema" FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA :"canary_schema" TO service_role;
GRANT SELECT ON ALL TABLES IN SCHEMA :"canary_schema" TO service_role;

ALTER DEFAULT PRIVILEGES FOR ROLE educa_tenant_owner IN SCHEMA :"canary_schema"
  REVOKE ALL ON TABLES FROM PUBLIC, anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE educa_tenant_owner IN SCHEMA :"canary_schema"
  GRANT SELECT ON TABLES TO service_role;
