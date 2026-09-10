-- Recover the audit receipt after an Auth/profile operation is retried.
-- Serialize recovery on the persisted invitation and use its canonical role/school.
CREATE OR REPLACE FUNCTION public.ensure_pilot_invitation_audit(p_invitation_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  invitation public.pilot_user_invitations%ROWTYPE;
  receipt_id uuid;
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = auth.uid() AND u.ativo = true AND u.escola_id IS NULL
      AND u.tipo_usuario IN ('admin', 'secretario')
  ) THEN
    RAISE EXCEPTION 'PILOT_INVITE_AUDIT_ACTOR_DENIED: active municipal secretariat required';
  END IF;

  SELECT * INTO invitation FROM public.pilot_user_invitations
  WHERE id = p_invitation_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'PILOT_INVITE_AUDIT_NOT_FOUND: persisted invitation required';
  END IF;

  SELECT id INTO receipt_id FROM public.pilot_audit_log
  WHERE event_type = 'user_invited' AND entity_type = 'user'
    AND entity_id = invitation.auth_user_id::text
    AND escola_id IS NOT DISTINCT FROM invitation.escola_id
    AND redacted_metadata->>'role' = invitation.invited_role
  ORDER BY created_at, id LIMIT 1;
  IF receipt_id IS NOT NULL THEN RETURN receipt_id; END IF;

  -- The receipt records the recovering actor; the original inviter remains on
  -- the invitation. Audit storage failure aborts recovery instead of being hidden.
  RETURN public.write_pilot_audit_event(
    'user_invited', 'user', invitation.auth_user_id::text, invitation.escola_id,
    jsonb_build_object('role', invitation.invited_role)
  );
END;
$$;
REVOKE ALL ON FUNCTION public.ensure_pilot_invitation_audit(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ensure_pilot_invitation_audit(uuid) TO authenticated;
