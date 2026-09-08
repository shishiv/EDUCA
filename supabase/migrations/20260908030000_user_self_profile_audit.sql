-- Atomically persist an authenticated user's display-name change and receipt.
-- Browser roles remain unable to write public.users directly.

BEGIN;

CREATE OR REPLACE FUNCTION public.update_current_pilot_profile_name(
  p_nome text
)
RETURNS TABLE (
  id uuid,
  nome text,
  email text,
  tipo_usuario text,
  escola_id uuid,
  ativo boolean,
  audit_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  actor_role text;
  current_profile public.users%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'PROFILE_AUTH_REQUIRED: authenticated actor required';
  END IF;

  IF p_nome IS NULL OR char_length(btrim(p_nome)) NOT BETWEEN 2 AND 160 THEN
    RAISE EXCEPTION 'PROFILE_NAME_INVALID: name must contain between 2 and 160 characters';
  END IF;

  actor_role := public.pilot_current_role();
  IF actor_role IS NULL THEN
    RAISE EXCEPTION 'PROFILE_ACTOR_INACTIVE: active pilot actor required';
  END IF;

  IF actor_role NOT IN ('admin', 'secretario', 'diretor', 'professor') THEN
    RAISE EXCEPTION 'PROFILE_ROLE_DENIED: active pilot role is not allowed';
  END IF;

  UPDATE public.users AS actor
  SET nome = btrim(p_nome)
  WHERE actor.id = auth.uid()
    AND actor.ativo = true
  RETURNING actor.* INTO current_profile;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'PROFILE_NOT_FOUND: active profile was not found';
  END IF;

  audit_id := public.write_pilot_audit_event(
    'profile_updated',
    'user',
    current_profile.id::text,
    current_profile.escola_id,
    '{}'::jsonb
  );

  id := current_profile.id;
  nome := current_profile.nome;
  email := current_profile.email;
  tipo_usuario := current_profile.tipo_usuario;
  escola_id := current_profile.escola_id;
  ativo := current_profile.ativo;
  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.update_current_pilot_profile_name(text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_current_pilot_profile_name(text)
  TO authenticated;

COMMIT;
