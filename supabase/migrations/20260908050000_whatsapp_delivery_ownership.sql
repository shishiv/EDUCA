BEGIN;

ALTER TABLE public.whatsapp_notification_messages
  ADD COLUMN IF NOT EXISTS claim_token uuid,
  ADD COLUMN IF NOT EXISTS claim_expires_at timestamptz;

ALTER TABLE public.whatsapp_notification_messages
  DROP CONSTRAINT IF EXISTS whatsapp_notification_messages_status_check,
  DROP CONSTRAINT IF EXISTS whatsapp_notification_messages_claim_state_check;

ALTER TABLE public.whatsapp_notification_messages
  ADD CONSTRAINT whatsapp_notification_messages_status_check
    CHECK (status IN ('queued', 'processing', 'accepted', 'sent', 'delivered', 'read', 'failed', 'blocked')),
  ADD CONSTRAINT whatsapp_notification_messages_claim_state_check
    CHECK (
      (status = 'processing' AND claim_token IS NOT NULL AND claim_expires_at IS NOT NULL)
      OR
      (status <> 'processing' AND claim_token IS NULL AND claim_expires_at IS NULL)
    );

DROP INDEX IF EXISTS public.idx_whatsapp_messages_due;
CREATE INDEX idx_whatsapp_messages_due
  ON public.whatsapp_notification_messages(status, proxima_tentativa, claim_expires_at)
  WHERE status IN ('queued', 'processing');

CREATE OR REPLACE FUNCTION public.claim_whatsapp_notifications(
  p_claim_token uuid,
  p_max_attempts integer,
  p_limit integer DEFAULT 50,
  p_message_id uuid DEFAULT NULL,
  p_lease_seconds integer DEFAULT 300
)
RETURNS SETOF public.whatsapp_notification_messages
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  claimed_at timestamptz := clock_timestamp();
  effective_max_attempts integer := least(greatest(coalesce(p_max_attempts, 1), 1), 5);
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'WHATSAPP_CLAIM_AUTH_REQUIRED: authenticated actor required';
  END IF;
  IF p_claim_token IS NULL THEN
    RAISE EXCEPTION 'WHATSAPP_CLAIM_INVALID: token is required';
  END IF;

  UPDATE public.whatsapp_notification_messages AS message
  SET status = 'failed',
      falhou_em = claimed_at,
      ultimo_erro_codigo = 'tentativas_esgotadas',
      claim_token = NULL,
      claim_expires_at = NULL,
      updated_at = claimed_at
  WHERE (p_message_id IS NULL OR message.id = p_message_id)
    AND message.tentativas >= effective_max_attempts
    AND public.pilot_can_manage_school(message.escola_id) IS TRUE
    AND (
      (message.status = 'queued' AND message.proxima_tentativa <= claimed_at)
      OR
      (message.status = 'processing' AND message.claim_expires_at <= claimed_at)
    );

  RETURN QUERY
  WITH candidates AS (
    SELECT message.id
    FROM public.whatsapp_notification_messages AS message
    WHERE (p_message_id IS NULL OR message.id = p_message_id)
      AND message.tentativas < effective_max_attempts
      AND public.pilot_can_manage_school(message.escola_id) IS TRUE
      AND (
        (message.status = 'queued' AND message.proxima_tentativa <= claimed_at)
        OR
        (message.status = 'processing' AND message.claim_expires_at <= claimed_at)
      )
    ORDER BY message.proxima_tentativa, message.created_at
    FOR UPDATE SKIP LOCKED
    LIMIT least(greatest(coalesce(p_limit, 50), 1), 50)
  )
  UPDATE public.whatsapp_notification_messages AS message
  SET status = 'processing',
      claim_token = p_claim_token,
      claim_expires_at = claimed_at + make_interval(
        secs => least(greatest(coalesce(p_lease_seconds, 300), 30), 900)
      ),
      tentativas = message.tentativas + 1,
      updated_at = claimed_at
  FROM candidates
  WHERE message.id = candidates.id
  RETURNING message.*;
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_whatsapp_notification_delivery(
  p_message_id uuid,
  p_claim_token uuid,
  p_outcome text,
  p_external_message_id text DEFAULT NULL,
  p_block_reason text DEFAULT NULL,
  p_failure_code text DEFAULT NULL,
  p_retry_delay_seconds integer DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  current_message public.whatsapp_notification_messages%ROWTYPE;
  completed_at timestamptz;
BEGIN
  SELECT * INTO current_message
  FROM public.whatsapp_notification_messages
  WHERE id = p_message_id
  FOR UPDATE;

  completed_at := clock_timestamp();

  IF NOT FOUND
     OR current_message.status <> 'processing'
     OR current_message.claim_token IS DISTINCT FROM p_claim_token
     OR current_message.claim_expires_at <= completed_at
     OR public.pilot_can_manage_school(current_message.escola_id) IS DISTINCT FROM true THEN
    RETURN false;
  END IF;

  IF p_outcome = 'retry' THEN
    IF p_retry_delay_seconds IS NULL OR p_retry_delay_seconds <= 0 OR current_message.tentativas >= 5 THEN
      RETURN false;
    END IF;
    UPDATE public.whatsapp_notification_messages
    SET status = 'queued',
        proxima_tentativa = completed_at + make_interval(
          secs => least(p_retry_delay_seconds, 86400)
        ),
        ultimo_erro_codigo = NULL,
        claim_token = NULL,
        claim_expires_at = NULL,
        updated_at = completed_at
    WHERE id = p_message_id;
  ELSIF p_outcome = 'accepted' AND p_external_message_id IS NOT NULL THEN
    UPDATE public.whatsapp_notification_messages
    SET status = 'accepted',
        external_message_id = p_external_message_id,
        ultimo_status_em = completed_at,
        claim_token = NULL,
        claim_expires_at = NULL,
        updated_at = completed_at
    WHERE id = p_message_id;
  ELSIF p_outcome = 'delivered' THEN
    UPDATE public.whatsapp_notification_messages
    SET status = 'delivered',
        external_message_id = p_external_message_id,
        entregue_em = completed_at,
        ultimo_status_em = completed_at,
        claim_token = NULL,
        claim_expires_at = NULL,
        updated_at = completed_at
    WHERE id = p_message_id;
  ELSIF p_outcome = 'blocked' AND p_block_reason IS NOT NULL THEN
    UPDATE public.whatsapp_notification_messages
    SET status = 'blocked',
        bloqueado_motivo = p_block_reason,
        bloqueado_em = completed_at,
        claim_token = NULL,
        claim_expires_at = NULL,
        updated_at = completed_at
    WHERE id = p_message_id;
  ELSIF p_outcome = 'failed' THEN
    UPDATE public.whatsapp_notification_messages
    SET status = 'failed',
        falhou_em = completed_at,
        ultimo_erro_codigo = coalesce(p_failure_code, 'permanent_failure'),
        claim_token = NULL,
        claim_expires_at = NULL,
        updated_at = completed_at
    WHERE id = p_message_id;
  ELSE
    RETURN false;
  END IF;

  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.apply_whatsapp_delivery_status(
  p_external_message_id text,
  p_status text,
  p_timestamp timestamptz,
  p_error_code text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  current_status text;
  current_rank integer;
  new_rank integer;
BEGIN
  SELECT status INTO current_status
  FROM public.whatsapp_notification_messages
  WHERE external_message_id = p_external_message_id
  FOR UPDATE;

  IF current_status IS NULL OR current_status IN ('failed', 'blocked', 'read') THEN
    RETURN false;
  END IF;

  IF p_status = 'failed' THEN
    IF current_status NOT IN ('accepted', 'sent') THEN
      RETURN false;
    END IF;
  ELSE
    new_rank := public.whatsapp_delivery_status_rank(p_status);
    current_rank := public.whatsapp_delivery_status_rank(current_status);
    IF new_rank = 0 OR new_rank <= current_rank THEN
      RETURN false;
    END IF;
  END IF;

  UPDATE public.whatsapp_notification_messages
  SET status = p_status,
      ultimo_status_em = p_timestamp,
      ultimo_erro_codigo = CASE WHEN p_status = 'failed' THEN p_error_code ELSE ultimo_erro_codigo END,
      entregue_em = CASE WHEN p_status = 'delivered' THEN p_timestamp ELSE entregue_em END,
      lido_em = CASE WHEN p_status = 'read' THEN p_timestamp ELSE lido_em END,
      falhou_em = CASE WHEN p_status = 'failed' THEN p_timestamp ELSE falhou_em END,
      updated_at = now()
  WHERE external_message_id = p_external_message_id;
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_guardian_whatsapp_opt_in(
  p_responsavel_id uuid,
  p_opt_in boolean,
  p_registrado_por uuid
)
RETURNS TABLE (
  responsavel_id uuid,
  opt_in boolean,
  consentido_em timestamptz,
  cancelado_em timestamptz,
  audit_id uuid
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  guardian_school uuid;
  optin_row public.whatsapp_notification_optins%ROWTYPE;
  occurred_at timestamptz := clock_timestamp();
BEGIN
  IF p_registrado_por IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'WHATSAPP_OPTIN_ACTOR_DENIED: receipt actor must match the authenticated user';
  END IF;

  SELECT escola_id INTO guardian_school
  FROM public.responsaveis
  WHERE id = p_responsavel_id
    AND public.pilot_can_manage_school(escola_id) IS TRUE;
  IF NOT FOUND OR guardian_school IS NULL THEN
    RAISE EXCEPTION 'PILOT_NOTIFICATION_SCHOOL_DENIED: guardian not visible to actor';
  END IF;

  INSERT INTO public.whatsapp_notification_optins (
    responsavel_id, escola_id, canal, opt_in, consentido_em,
    cancelado_em, registrado_por, updated_at
  ) VALUES (
    p_responsavel_id, guardian_school, 'whatsapp', p_opt_in,
    CASE WHEN p_opt_in THEN occurred_at ELSE NULL END,
    CASE WHEN p_opt_in THEN NULL ELSE occurred_at END,
    p_registrado_por, occurred_at
  )
  ON CONFLICT ON CONSTRAINT whatsapp_notification_optins_responsavel_id_canal_key DO UPDATE
  SET opt_in = EXCLUDED.opt_in,
      consentido_em = EXCLUDED.consentido_em,
      cancelado_em = EXCLUDED.cancelado_em,
      registrado_por = EXCLUDED.registrado_por,
      updated_at = EXCLUDED.updated_at
  RETURNING * INTO optin_row;

  audit_id := public.write_pilot_audit_event(
    'whatsapp_optin_changed',
    'responsavel',
    p_responsavel_id::text,
    guardian_school,
    jsonb_build_object('canal', 'whatsapp', 'opt_in', p_opt_in)
  );

  responsavel_id := optin_row.responsavel_id;
  opt_in := optin_row.opt_in;
  consentido_em := optin_row.consentido_em;
  cancelado_em := optin_row.cancelado_em;
  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_whatsapp_notifications(uuid, integer, integer, uuid, integer)
  FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.complete_whatsapp_notification_delivery(uuid, uuid, text, text, text, text, integer)
  FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.set_guardian_whatsapp_opt_in(uuid, boolean, uuid)
  FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.claim_whatsapp_notifications(uuid, integer, integer, uuid, integer)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_whatsapp_notification_delivery(uuid, uuid, text, text, text, text, integer)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_guardian_whatsapp_opt_in(uuid, boolean, uuid)
  TO authenticated;

REVOKE UPDATE ON public.whatsapp_notification_messages FROM authenticated;

COMMIT;
