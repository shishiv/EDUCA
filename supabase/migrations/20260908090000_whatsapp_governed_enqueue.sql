-- Close the browser-write and ambiguous-delivery gaps before any external
-- WhatsApp worker is authorized. Enqueue and consent mutations are RPC-only;
-- an expired dispatch is held for reconciliation instead of being sent again.

BEGIN;

ALTER TABLE public.whatsapp_notification_messages
  ADD COLUMN IF NOT EXISTS reconciliation_required_at timestamptz;

ALTER TABLE public.whatsapp_notification_messages
  DROP CONSTRAINT IF EXISTS whatsapp_notification_messages_status_check,
  DROP CONSTRAINT IF EXISTS whatsapp_notification_messages_claim_state_check,
  DROP CONSTRAINT IF EXISTS whatsapp_notification_messages_reconciliation_state_check;

ALTER TABLE public.whatsapp_notification_messages
  ADD CONSTRAINT whatsapp_notification_messages_status_check
    CHECK (status IN (
      'queued', 'processing', 'accepted', 'sent', 'delivered', 'read',
      'failed', 'blocked', 'delivery_unknown'
    )),
  ADD CONSTRAINT whatsapp_notification_messages_claim_state_check
    CHECK (
      (status = 'processing' AND claim_token IS NOT NULL AND claim_expires_at IS NOT NULL)
      OR
      (status <> 'processing' AND claim_token IS NULL AND claim_expires_at IS NULL)
    ),
  ADD CONSTRAINT whatsapp_notification_messages_reconciliation_state_check
    CHECK (
      (status = 'delivery_unknown' AND reconciliation_required_at IS NOT NULL)
      OR
      (status <> 'delivery_unknown' AND reconciliation_required_at IS NULL)
    );

CREATE OR REPLACE FUNCTION public.enqueue_guardian_whatsapp_attendance_notification(
  p_responsavel_id uuid,
  p_aluno_id uuid,
  p_tipo text,
  p_data_aula date,
  p_criado_por uuid
)
RETURNS TABLE (
  message_id uuid,
  status text,
  duplicated boolean,
  audit_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  actor_row public.users%ROWTYPE;
  target_school_id uuid;
  existing_message public.whatsapp_notification_messages%ROWTYPE;
  inserted_message public.whatsapp_notification_messages%ROWTYPE;
  computed_idempotency_key text;
  inserted_audit_id uuid;
  was_duplicate boolean := false;
BEGIN
  IF auth.uid() IS NULL OR p_criado_por IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'WHATSAPP_ENQUEUE_ACTOR_DENIED: authenticated actor must own the request';
  END IF;
  IF p_tipo NOT IN ('presenca_falta', 'presenca_presente') OR p_data_aula IS NULL THEN
    RAISE EXCEPTION 'WHATSAPP_ENQUEUE_INPUT_INVALID: attendance type and date are required';
  END IF;

  SELECT * INTO actor_row
  FROM public.users
  WHERE id = auth.uid()
    AND ativo = true
    AND tipo_usuario = 'diretor';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'WHATSAPP_ENQUEUE_ACTOR_DENIED: active school director required';
  END IF;

  SELECT student.escola_id INTO target_school_id
  FROM public.alunos AS student
  JOIN public.responsaveis AS guardian
    ON guardian.id = p_responsavel_id
   AND guardian.escola_id = student.escola_id
  JOIN public.aluno_responsaveis AS link
    ON link.aluno_id = student.id
   AND link.responsavel_id = guardian.id
   AND link.ativo = true
  WHERE student.id = p_aluno_id
    AND student.escola_id IS NOT NULL
    AND actor_row.escola_id = student.escola_id
    AND public.pilot_can_manage_school(student.escola_id) IS TRUE
    AND EXISTS (
      SELECT 1
      FROM public.matriculas AS enrollment
      JOIN public.turmas AS class ON class.id = enrollment.turma_id
      JOIN public.frequencia AS attendance ON attendance.matricula_id = enrollment.id
      JOIN public.sessoes_aula AS session ON session.id = attendance.sessao_id
      WHERE enrollment.aluno_id = student.id
        AND class.escola_id = student.escola_id
        AND session.turma_id = class.id
        AND session.escola_id = student.escola_id
        AND session.data_aula = p_data_aula
        AND attendance.data_aula = p_data_aula
        AND (
          (p_tipo = 'presenca_falta' AND attendance.status_presenca = 'F')
          OR
          (p_tipo = 'presenca_presente' AND attendance.status_presenca = 'P')
        )
    );

  IF target_school_id IS NULL THEN
    RAISE EXCEPTION 'WHATSAPP_ENQUEUE_CONTEXT_DENIED: active relationship and matching attendance are required';
  END IF;

  computed_idempotency_key := encode(
    extensions.digest(
      p_responsavel_id::text || '|' || p_aluno_id::text || '|' || p_tipo || '|' || p_data_aula::text,
      'sha256'
    ),
    'hex'
  );

  INSERT INTO public.whatsapp_notification_messages (
    responsavel_id, aluno_id, escola_id, tipo, data_aula, external_message_id,
    idempotency_key, status, tentativas, proxima_tentativa,
    ultimo_erro_codigo, bloqueado_motivo, entregue_em, lido_em, falhou_em,
    bloqueado_em, ultimo_status_em, claim_token, claim_expires_at,
    reconciliation_required_at, criado_por
  ) VALUES (
    p_responsavel_id, p_aluno_id, target_school_id, p_tipo, p_data_aula, NULL,
    computed_idempotency_key, 'queued', 0, clock_timestamp(),
    NULL, NULL, NULL, NULL, NULL,
    NULL, NULL, NULL, NULL,
    NULL, auth.uid()
  )
  ON CONFLICT (idempotency_key) DO NOTHING
  RETURNING * INTO inserted_message;

  IF inserted_message.id IS NULL THEN
    SELECT * INTO existing_message
    FROM public.whatsapp_notification_messages AS message
    WHERE message.idempotency_key = computed_idempotency_key
      AND message.escola_id = target_school_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'WHATSAPP_ENQUEUE_DUPLICATE_INCONSISTENT: existing decision is outside the governed context';
    END IF;
    inserted_message := existing_message;
    was_duplicate := true;
  END IF;

  INSERT INTO public.pilot_audit_log (
    actor_user_id, escola_id, event_type, entity_type, entity_id, redacted_metadata
  ) VALUES (
    auth.uid(),
    target_school_id,
    CASE WHEN was_duplicate
      THEN 'whatsapp_notification_enqueue_replayed'
      ELSE 'whatsapp_notification_enqueued'
    END,
    'whatsapp_notification_message',
    inserted_message.id::text,
    jsonb_build_object(
      'notification_type', p_tipo,
      'attendance_date', p_data_aula,
      'duplicate', was_duplicate
    )
  )
  RETURNING id INTO inserted_audit_id;

  RETURN QUERY SELECT inserted_message.id, inserted_message.status, was_duplicate, inserted_audit_id;
END;
$$;

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

  -- Once a worker owned a row, lease expiry cannot prove whether the provider
  -- accepted the request. Hold it for reconciliation instead of sending again.
  UPDATE public.whatsapp_notification_messages AS message
  SET status = 'delivery_unknown',
      ultimo_erro_codigo = NULL,
      reconciliation_required_at = claimed_at,
      claim_token = NULL,
      claim_expires_at = NULL,
      updated_at = claimed_at
  WHERE (p_message_id IS NULL OR message.id = p_message_id)
    AND message.status = 'processing'
    AND message.claim_expires_at <= claimed_at
    AND public.pilot_can_manage_school(message.escola_id) IS TRUE;

  UPDATE public.whatsapp_notification_messages AS message
  SET status = 'failed',
      falhou_em = claimed_at,
      ultimo_erro_codigo = 'tentativas_esgotadas',
      claim_token = NULL,
      claim_expires_at = NULL,
      updated_at = claimed_at
  WHERE (p_message_id IS NULL OR message.id = p_message_id)
    AND message.status = 'queued'
    AND message.proxima_tentativa <= claimed_at
    AND message.tentativas >= effective_max_attempts
    AND public.pilot_can_manage_school(message.escola_id) IS TRUE;

  RETURN QUERY
  WITH candidates AS (
    SELECT message.id
    FROM public.whatsapp_notification_messages AS message
    WHERE (p_message_id IS NULL OR message.id = p_message_id)
      AND message.status = 'queued'
      AND message.proxima_tentativa <= claimed_at
      AND message.tentativas < effective_max_attempts
      AND public.pilot_can_manage_school(message.escola_id) IS TRUE
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
      reconciliation_required_at = NULL,
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
        proxima_tentativa = completed_at + make_interval(secs => least(p_retry_delay_seconds, 86400)),
        ultimo_erro_codigo = NULL,
        claim_token = NULL,
        claim_expires_at = NULL,
        reconciliation_required_at = NULL,
        updated_at = completed_at
    WHERE id = p_message_id;
  ELSIF p_outcome = 'accepted' AND p_external_message_id IS NOT NULL THEN
    UPDATE public.whatsapp_notification_messages
    SET status = 'accepted',
        external_message_id = p_external_message_id,
        ultimo_status_em = completed_at,
        claim_token = NULL,
        claim_expires_at = NULL,
        reconciliation_required_at = NULL,
        updated_at = completed_at
    WHERE id = p_message_id;
  ELSIF p_outcome = 'delivered' AND p_external_message_id IS NOT NULL THEN
    UPDATE public.whatsapp_notification_messages
    SET status = 'delivered',
        external_message_id = p_external_message_id,
        entregue_em = completed_at,
        ultimo_status_em = completed_at,
        claim_token = NULL,
        claim_expires_at = NULL,
        reconciliation_required_at = NULL,
        updated_at = completed_at
    WHERE id = p_message_id;
  ELSIF p_outcome = 'blocked' AND p_block_reason IS NOT NULL THEN
    UPDATE public.whatsapp_notification_messages
    SET status = 'blocked',
        bloqueado_motivo = p_block_reason,
        bloqueado_em = completed_at,
        claim_token = NULL,
        claim_expires_at = NULL,
        reconciliation_required_at = NULL,
        updated_at = completed_at
    WHERE id = p_message_id;
  ELSIF p_outcome = 'failed' THEN
    UPDATE public.whatsapp_notification_messages
    SET status = 'failed',
        falhou_em = completed_at,
        ultimo_erro_codigo = coalesce(p_failure_code, 'permanent_failure'),
        claim_token = NULL,
        claim_expires_at = NULL,
        reconciliation_required_at = NULL,
        updated_at = completed_at
    WHERE id = p_message_id;
  ELSIF p_outcome = 'indeterminate' THEN
    UPDATE public.whatsapp_notification_messages
    SET status = 'delivery_unknown',
        ultimo_erro_codigo = NULL,
        reconciliation_required_at = completed_at,
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

ALTER FUNCTION public.set_guardian_whatsapp_opt_in(uuid, boolean, uuid) SECURITY DEFINER;

REVOKE ALL ON FUNCTION public.enqueue_guardian_whatsapp_attendance_notification(uuid, uuid, text, date, uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.enqueue_guardian_whatsapp_attendance_notification(uuid, uuid, text, date, uuid)
  TO authenticated;

REVOKE INSERT, UPDATE ON public.whatsapp_notification_messages FROM authenticated;
REVOKE INSERT, UPDATE ON public.whatsapp_notification_optins FROM authenticated;

COMMIT;
