ALTER SCHEMA :"canary_schema" OWNER TO educa_tenant_owner;
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
