-- Synthetic pilot identity revocation boundary.
--
-- Auth access tokens are signed artifacts and are not assumed to invalidate
-- instantly. The active profile predicate remains the observable boundary for
-- PostgREST and Storage, while the server lifecycle removes the Auth identity.

BEGIN;

-- An inactive profile must not even read its own row through a previously
-- issued JWT. Resource helpers already require ativo = true; this closes the
-- direct users-table escape hatch used by a deliberately bypassed app guard.
DROP POLICY IF EXISTS pilot_users_select ON public.users;
CREATE POLICY pilot_users_select ON public.users
FOR SELECT TO authenticated
USING (
  ativo = true
  AND (
    id = auth.uid()
    OR public.pilot_is_secretariat()
    OR public.pilot_can_access_school(escola_id)
  )
);

-- The revocation receipt is a server-owned audit path. It accepts the target
-- UUID only as an input, then persists a deterministic redacted identity.
CREATE OR REPLACE FUNCTION public.write_pilot_user_revocation_audit(
  p_user_id uuid,
  p_role text,
  p_escola_id uuid,
  p_release text,
  p_reason text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  actor_role text;
  target_role text;
  target_school uuid;
  target_active boolean;
  target_email text;
  redacted_identity text;
  inserted_id uuid;
BEGIN
  actor_role := public.pilot_current_role();
  IF auth.uid() IS NULL OR actor_role NOT IN ('admin', 'secretario') THEN
    RAISE EXCEPTION 'PILOT_AUTH_REVOCATION_ROLE_DENIED: municipal operator required';
  END IF;

  IF p_release IS NULL OR p_release !~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,79}$' THEN
    RAISE EXCEPTION 'PILOT_AUTH_REVOCATION_RELEASE_INVALID: release must be a safe identifier';
  END IF;
  IF p_reason IS NULL OR p_reason !~ '^[A-Za-z0-9][A-Za-z0-9._:-]{2,79}$' THEN
    RAISE EXCEPTION 'PILOT_AUTH_REVOCATION_REASON_INVALID: reason must be a safe code';
  END IF;

  SELECT tipo_usuario, escola_id, ativo, email
  INTO target_role, target_school, target_active, target_email
  FROM public.users
  WHERE id = p_user_id;

  IF NOT FOUND OR target_email IS NULL
     OR split_part(lower(target_email), '@', 2) <> 'synthetic.invalid'
     OR target_role NOT IN ('secretario', 'diretor', 'professor') THEN
    RAISE EXCEPTION 'PILOT_AUTH_REVOCATION_TARGET_DENIED: synthetic target is required';
  END IF;
  IF target_role IS DISTINCT FROM p_role
     OR target_school IS DISTINCT FROM p_escola_id THEN
    RAISE EXCEPTION 'PILOT_AUTH_REVOCATION_SCOPE_DENIED: target scope is not authoritative';
  END IF;
  IF target_active THEN
    RAISE EXCEPTION 'PILOT_AUTH_REVOCATION_PROFILE_ACTIVE: profile must be deactivated first';
  END IF;

  redacted_identity := 'synthetic-' || substr(md5(p_user_id::text), 1, 16);

  INSERT INTO public.pilot_audit_log(
    actor_user_id, escola_id, event_type, entity_type, entity_id,
    redacted_metadata
  )
  VALUES (
    auth.uid(), p_escola_id, 'user_revoked', 'user', redacted_identity,
    jsonb_build_object(
      'identity', redacted_identity,
      'role', p_role,
      'release', p_release,
      'reason', p_reason
    )
  )
  RETURNING id INTO inserted_id;

  RETURN inserted_id;
END;
$$;

REVOKE ALL ON FUNCTION public.write_pilot_user_revocation_audit(uuid, text, uuid, text, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.write_pilot_user_revocation_audit(uuid, text, uuid, text, text)
  TO authenticated;

COMMIT;
