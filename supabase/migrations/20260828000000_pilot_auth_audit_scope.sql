CREATE OR REPLACE FUNCTION public.write_pilot_audit_event(
  p_event_type text,
  p_entity_type text,
  p_entity_id text DEFAULT NULL,
  p_escola_id uuid DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  actor_role text;
  target_school uuid;
  batch_row record;
  metadata jsonb := coalesce(p_metadata, '{}'::jsonb);
  audit_correlation uuid := gen_random_uuid();
  inserted_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'PILOT_AUDIT_AUTH_REQUIRED: authenticated actor required';
  END IF;

  actor_role := public.pilot_current_role();
  IF actor_role IS NULL THEN
    RAISE EXCEPTION 'PILOT_AUDIT_ACTOR_INACTIVE: active pilot actor required';
  END IF;

  IF p_event_type NOT IN (
    'login', 'logout', 'demo_action_intercepted', 'whatsapp_optin_changed',
    'import_staged', 'import_published', 'user_invited', 'first_access_completed'
  ) THEN
    RAISE EXCEPTION 'PILOT_AUDIT_EVENT_NOT_ALLOWED: event is not owned by a pilot server flow';
  END IF;
  IF NOT public.pilot_audit_metadata_allowed(p_event_type, metadata) THEN
    RAISE EXCEPTION 'PILOT_AUDIT_METADATA_NOT_ALLOWED: event metadata is outside its contract';
  END IF;

  IF metadata ? 'correlation_id' THEN
    IF metadata->>'correlation_id' !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' THEN
      RAISE EXCEPTION 'PILOT_AUDIT_CORRELATION_INVALID: correlation id must be a UUID';
    END IF;
    audit_correlation := (metadata->>'correlation_id')::uuid;
  END IF;

  IF p_event_type IN ('login', 'logout') THEN
    IF p_entity_type <> 'auth_session' OR p_entity_id IS DISTINCT FROM auth.uid()::text THEN
      RAISE EXCEPTION 'PILOT_AUDIT_ENTITY_DENIED: authentication event must audit the current user';
    END IF;
    target_school := public.pilot_current_school_id();
    IF p_escola_id IS NOT NULL AND p_escola_id IS DISTINCT FROM target_school THEN
      RAISE EXCEPTION 'PILOT_AUDIT_SCHOOL_DENIED: actor school does not match the event';
    END IF;
    p_escola_id := target_school;
  ELSIF p_event_type = 'first_access_completed' THEN
    IF p_entity_type <> 'user' OR p_entity_id IS DISTINCT FROM auth.uid()::text THEN
      RAISE EXCEPTION 'PILOT_AUDIT_ENTITY_DENIED: first access must audit the current user';
    END IF;
    SELECT escola_id INTO target_school FROM public.users WHERE id = auth.uid();
    IF p_escola_id IS NOT NULL AND p_escola_id IS DISTINCT FROM target_school THEN
      RAISE EXCEPTION 'PILOT_AUDIT_SCHOOL_DENIED: actor school does not match the event';
    END IF;
    p_escola_id := target_school;
  ELSIF p_event_type = 'demo_action_intercepted' THEN
    IF actor_role NOT IN ('admin', 'secretario') OR p_entity_type <> 'demo_operation' THEN
      RAISE EXCEPTION 'PILOT_AUDIT_ROLE_DENIED: demo receipts belong to secretariat flows';
    END IF;
  ELSIF p_event_type = 'user_invited' THEN
    IF actor_role NOT IN ('admin', 'secretario') OR p_entity_type <> 'user' THEN
      RAISE EXCEPTION 'PILOT_AUDIT_ROLE_DENIED: invitations belong to secretariat flows';
    END IF;
    IF p_entity_id IS NULL OR p_entity_id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
      RAISE EXCEPTION 'PILOT_AUDIT_ENTITY_INVALID: invited user id must be a UUID';
    END IF;
    SELECT escola_id INTO target_school
    FROM public.users
    WHERE id = p_entity_id::uuid;
    IF NOT FOUND OR p_escola_id IS DISTINCT FROM target_school THEN
      RAISE EXCEPTION 'PILOT_AUDIT_ENTITY_DENIED: invitation target school is not authoritative';
    END IF;
    IF metadata->>'role' NOT IN ('secretario', 'diretor', 'professor') THEN
      RAISE EXCEPTION 'PILOT_AUDIT_METADATA_NOT_ALLOWED: invitation role is invalid';
    END IF;
  ELSIF p_event_type IN ('import_staged', 'import_published') THEN
    IF p_entity_type <> 'pilot_import_batch'
       OR p_entity_id IS NULL
       OR p_entity_id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
      RAISE EXCEPTION 'PILOT_AUDIT_ENTITY_INVALID: import event requires a batch UUID';
    END IF;
    SELECT escola_id, submitted_by, approved_by
    INTO batch_row
    FROM public.pilot_import_batches
    WHERE id = p_entity_id::uuid;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'PILOT_AUDIT_ENTITY_DENIED: import batch does not exist';
    END IF;
    IF p_event_type = 'import_staged'
       AND (actor_role NOT IN ('admin', 'secretario') OR batch_row.submitted_by <> auth.uid()) THEN
      RAISE EXCEPTION 'PILOT_AUDIT_ROLE_DENIED: only the import submitter can audit staging';
    END IF;
    IF p_event_type = 'import_published'
       AND (actor_role <> 'diretor' OR batch_row.approved_by <> auth.uid()) THEN
      RAISE EXCEPTION 'PILOT_AUDIT_ROLE_DENIED: only the approving director can audit publication';
    END IF;
    IF p_escola_id IS DISTINCT FROM batch_row.escola_id THEN
      RAISE EXCEPTION 'PILOT_AUDIT_SCHOOL_DENIED: import event school is not authoritative';
    END IF;
    IF metadata->>'dataset' <> 'students'
       OR metadata->>'governance_recorded' <> 'true'
       OR metadata->>'plaintext_stored' <> 'false' THEN
      RAISE EXCEPTION 'PILOT_AUDIT_METADATA_NOT_ALLOWED: import receipt is incomplete';
    END IF;
  ELSIF p_event_type = 'whatsapp_optin_changed' THEN
    IF actor_role <> 'diretor' OR p_entity_type <> 'responsavel'
       OR p_entity_id IS NULL
       OR p_entity_id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
      RAISE EXCEPTION 'PILOT_AUDIT_ROLE_DENIED: consent changes belong to the school director';
    END IF;
    SELECT escola_id INTO target_school
    FROM public.responsaveis
    WHERE id = p_entity_id::uuid;
    IF NOT FOUND OR NOT public.pilot_can_manage_school(target_school)
       OR p_escola_id IS DISTINCT FROM target_school THEN
      RAISE EXCEPTION 'PILOT_AUDIT_SCHOOL_DENIED: consent event is outside the director school';
    END IF;
    IF metadata->>'canal' <> 'whatsapp'
       OR jsonb_typeof(metadata->'opt_in') <> 'boolean' THEN
      RAISE EXCEPTION 'PILOT_AUDIT_METADATA_NOT_ALLOWED: consent receipt is incomplete';
    END IF;
  END IF;

  IF p_escola_id IS NOT NULL
     AND NOT public.pilot_can_access_school(p_escola_id) THEN
    RAISE EXCEPTION 'PILOT_AUDIT_SCHOOL_DENIED: actor cannot audit another school';
  END IF;

  INSERT INTO public.pilot_audit_log(
    actor_user_id, escola_id, event_type, entity_type, entity_id,
    redacted_metadata, correlation_id
  )
  VALUES (
    auth.uid(), p_escola_id, p_event_type, p_entity_type, p_entity_id,
    metadata, audit_correlation
  )
  RETURNING id INTO inserted_id;
  RETURN inserted_id;
END;
$$;
REVOKE ALL ON FUNCTION public.write_pilot_audit_event(text, text, text, uuid, jsonb)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.write_pilot_audit_event(text, text, text, uuid, jsonb)
  TO authenticated;
