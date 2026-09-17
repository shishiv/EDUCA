BEGIN;

-- This RPC owns only public.users status, not GoTrue or email delivery.
CREATE OR REPLACE FUNCTION public.set_governed_user_status(p_user_id uuid, p_ativo boolean)
RETURNS TABLE (user_id uuid, ativo boolean, audit_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  actor public.users%ROWTYPE;
  target public.users%ROWTYPE;
  receipt uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'PILOT_USER_STATUS_AUTH_REQUIRED';
  END IF;
  IF p_user_id IS NULL OR p_ativo IS NULL THEN
    RAISE EXCEPTION 'PILOT_USER_STATUS_INVALID';
  END IF;

  -- Stable ordering also covers self-deactivation and two admins targeting
  -- one another. A concurrent role/status/school change must finish before
  -- we read authority, or wait until this mutation and receipt have committed.
  PERFORM u.id FROM public.users u
  WHERE u.id IN (auth.uid(), p_user_id)
  ORDER BY u.id FOR UPDATE;

  SELECT * INTO actor FROM public.users WHERE id = auth.uid();
  IF NOT FOUND OR actor.ativo IS DISTINCT FROM true OR actor.tipo_usuario <> 'admin' THEN
    RAISE EXCEPTION 'PILOT_USER_STATUS_ROLE_DENIED';
  END IF;
  SELECT * INTO target FROM public.users WHERE id = p_user_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'PILOT_USER_STATUS_TARGET_NOT_FOUND';
  END IF;
  IF actor.escola_id IS NOT NULL AND actor.escola_id IS DISTINCT FROM target.escola_id THEN
    RAISE EXCEPTION 'PILOT_USER_STATUS_SCHOOL_DENIED';
  END IF;

  -- A retry sets a desired state; it never toggles the value read previously.
  -- Each accepted command has its own receipt, including a truthful no-op.
  UPDATE public.users SET ativo = p_ativo WHERE id = target.id;
  INSERT INTO public.pilot_audit_log (
    actor_user_id, escola_id, event_type, entity_type, entity_id,
    redacted_metadata, correlation_id
  ) VALUES (
    actor.id, target.escola_id, 'user_status_updated', 'user', target.id::text,
    jsonb_build_object('previous_active', target.ativo, 'active', p_ativo,
                      'changed', target.ativo IS DISTINCT FROM p_ativo),
    gen_random_uuid()
  ) RETURNING id INTO receipt;
  IF receipt IS NULL THEN
    RAISE EXCEPTION 'PILOT_USER_STATUS_AUDIT_INCOMPLETE';
  END IF;

  user_id := target.id;
  ativo := p_ativo;
  audit_id := receipt;
  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.set_governed_user_status(uuid, boolean) FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.set_governed_user_status(uuid, boolean) TO authenticated;

COMMIT;
