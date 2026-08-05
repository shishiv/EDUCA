-- Make the browser write boundary for public.users explicit.
-- Auth/profile maintenance continues through existing server-side service paths.

BEGIN;

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS admin_full_access ON public.users;

REVOKE INSERT, UPDATE, DELETE ON TABLE public.users FROM authenticated;
GRANT SELECT ON TABLE public.users TO authenticated;
GRANT ALL ON TABLE public.users TO service_role;

COMMIT;
