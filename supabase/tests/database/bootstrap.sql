CREATE ROLE authenticated NOLOGIN;
CREATE ROLE anon NOLOGIN;
CREATE ROLE service_role NOLOGIN BYPASSRLS;
CREATE SCHEMA auth;

CREATE FUNCTION auth.uid()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;

-- Match the local Supabase role contract: browser and service roles can resolve
-- auth.uid(), while the function still reads only the request-scoped claim.
GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role;
