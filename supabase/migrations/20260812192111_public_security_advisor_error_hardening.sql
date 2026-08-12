-- Security-advisor ERROR hardening for the synthetic EDUCA pilot.
--
-- Scope is intentionally limited to the ten current ERROR findings:
--   * public.School, public.User, public.UserRole, public.Role,
--     public.RolePermission, public.Permission, public.codigos_inep, and
--     public.educacenso_exports have RLS disabled;
--   * public.vw_alunos_risco_bolsa_familia and public.audit_summary are
--     SECURITY DEFINER views.
--
-- The repository call-path review found no browser or server application call
-- for the uppercase RBAC tables, codigos_inep, educacenso_exports, or
-- audit_summary. The active pilot uses public.users, public.escolas, the
-- school-scoped pilot policies, and the canonical attendance RPC instead.
-- The legacy tables and disabled modules therefore stay service-role-only.
-- The legacy Bolsa Familia view remains blocked by the synthetic-only pilot
-- contract. ALTER VIEW preserves each deployed view's existing columns and
-- query while removing creator-privilege execution.

BEGIN;

-- -----------------------------------------------------------------------------
-- Deny browser access before enabling RLS.
-- These tables are legacy or explicitly blocked, not login dependencies.
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS security_errors_school_browser_denied ON public."School";
CREATE POLICY security_errors_school_browser_denied
ON public."School"
FOR ALL TO anon, authenticated
USING (false)
WITH CHECK (false);

DROP POLICY IF EXISTS security_errors_user_browser_denied ON public."User";
CREATE POLICY security_errors_user_browser_denied
ON public."User"
FOR ALL TO anon, authenticated
USING (false)
WITH CHECK (false);

DROP POLICY IF EXISTS security_errors_user_role_browser_denied ON public."UserRole";
CREATE POLICY security_errors_user_role_browser_denied
ON public."UserRole"
FOR ALL TO anon, authenticated
USING (false)
WITH CHECK (false);

DROP POLICY IF EXISTS security_errors_role_browser_denied ON public."Role";
CREATE POLICY security_errors_role_browser_denied
ON public."Role"
FOR ALL TO anon, authenticated
USING (false)
WITH CHECK (false);

DROP POLICY IF EXISTS security_errors_role_permission_browser_denied ON public."RolePermission";
CREATE POLICY security_errors_role_permission_browser_denied
ON public."RolePermission"
FOR ALL TO anon, authenticated
USING (false)
WITH CHECK (false);

DROP POLICY IF EXISTS security_errors_permission_browser_denied ON public."Permission";
CREATE POLICY security_errors_permission_browser_denied
ON public."Permission"
FOR ALL TO anon, authenticated
USING (false)
WITH CHECK (false);

-- Censo/INEP and Educacenso are disabled modules under the synthetic-only
-- contract. Their service-role paths remain available for controlled future
-- governance work, but no browser role may reach these relations.
DROP POLICY IF EXISTS security_errors_codigos_inep_browser_denied ON public.codigos_inep;
CREATE POLICY security_errors_codigos_inep_browser_denied
ON public.codigos_inep
FOR ALL TO anon, authenticated
USING (false)
WITH CHECK (false);

DROP POLICY IF EXISTS security_errors_educacenso_exports_browser_denied ON public.educacenso_exports;
CREATE POLICY security_errors_educacenso_exports_browser_denied
ON public.educacenso_exports
FOR ALL TO anon, authenticated
USING (false)
WITH CHECK (false);

-- -----------------------------------------------------------------------------
-- RLS is enabled only after every target table has its deny-by-default policy.
-- -----------------------------------------------------------------------------
ALTER TABLE public."School" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."UserRole" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Role" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."RolePermission" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Permission" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.codigos_inep ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.educacenso_exports ENABLE ROW LEVEL SECURITY;

-- Grants are the API reachability boundary. PUBLIC is revoked as well as the
-- two browser roles so an inherited PUBLIC grant cannot bypass the contract.
REVOKE ALL ON TABLE
  public."School",
  public."User",
  public."UserRole",
  public."Role",
  public."RolePermission",
  public."Permission",
  public.codigos_inep,
  public.educacenso_exports
FROM PUBLIC, anon, authenticated;

GRANT ALL ON TABLE
  public."School",
  public."User",
  public."UserRole",
  public."Role",
  public."RolePermission",
  public."Permission",
  public.codigos_inep,
  public.educacenso_exports
TO service_role;

-- -----------------------------------------------------------------------------
-- Preserve deployed view definitions while making execution use caller rights.
-- The target project runs PostgreSQL 17.6, so security_invoker is supported.
-- -----------------------------------------------------------------------------
ALTER VIEW public.vw_alunos_risco_bolsa_familia
  SET (security_invoker = true);
ALTER VIEW public.audit_summary
  SET (security_invoker = true);

-- The old Bolsa Familia model is not a pilot surface. The audit summary has
-- no application call path and may expose operational metadata, so both remain
-- service-role-only while retaining their existing columns for controlled use.
REVOKE ALL ON TABLE
  public.vw_alunos_risco_bolsa_familia,
  public.audit_summary
FROM PUBLIC, anon, authenticated;

GRANT SELECT ON TABLE
  public.vw_alunos_risco_bolsa_familia,
  public.audit_summary
TO service_role;

COMMIT;
