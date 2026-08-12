-- Teacher-requested reopening for a canonical closed attendance session.
--
-- A closed session remains immutable for every ordinary table write. Only the
-- director decision function can clear the closed state, and the session
-- trigger accepts that transition only with a transaction-local request guard.
-- The request row and both audit trails keep the canonical session ID.

BEGIN;

CREATE TABLE public.attendance_reopen_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sessao_id uuid NOT NULL REFERENCES public.sessoes_aula(id) ON DELETE RESTRICT,
  escola_id uuid NOT NULL REFERENCES public.escolas(id) ON DELETE RESTRICT,
  requested_by uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  request_reason text NOT NULL,
  status text NOT NULL DEFAULT 'PENDENTE',
  requested_at timestamptz NOT NULL DEFAULT now(),
  decided_by uuid REFERENCES public.users(id) ON DELETE RESTRICT,
  decision_reason text,
  decided_at timestamptz,
  before_state jsonb NOT NULL,
  after_state jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT attendance_reopen_reason_required
    CHECK (btrim(request_reason) <> ''),
  CONSTRAINT attendance_reopen_status_check
    CHECK (status IN ('PENDENTE', 'APROVADA', 'REJEITADA')),
  CONSTRAINT attendance_reopen_decision_state_check
    CHECK (
      (status = 'PENDENTE'
        AND decided_by IS NULL
        AND decided_at IS NULL
        AND after_state IS NULL)
      OR (status IN ('APROVADA', 'REJEITADA')
        AND decided_by IS NOT NULL
        AND decided_at IS NOT NULL
        AND after_state IS NOT NULL)
    ),
  CONSTRAINT attendance_reopen_decision_reason_check
    CHECK (status <> 'REJEITADA' OR btrim(coalesce(decision_reason, '')) <> '')
);

CREATE UNIQUE INDEX idx_attendance_reopen_pending_session
  ON public.attendance_reopen_requests(sessao_id)
  WHERE status = 'PENDENTE';
CREATE INDEX idx_attendance_reopen_school_status
  ON public.attendance_reopen_requests(escola_id, status, requested_at DESC);
CREATE INDEX idx_attendance_reopen_session
  ON public.attendance_reopen_requests(sessao_id, requested_at DESC);

ALTER TABLE public.attendance_reopen_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY attendance_reopen_select
  ON public.attendance_reopen_requests
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.sessoes_aula AS session
      WHERE session.id = attendance_reopen_requests.sessao_id
        AND (
          (
            (SELECT public.attendance_current_role()) = 'professor'
            AND session.professor_id = (SELECT auth.uid())
            AND attendance_reopen_requests.requested_by = (SELECT auth.uid())
          )
          OR (
            (SELECT public.attendance_current_role()) = 'diretor'
            AND session.escola_id = (SELECT public.attendance_current_school_id())
            AND attendance_reopen_requests.escola_id = session.escola_id
          )
        )
    )
  );

REVOKE INSERT, UPDATE, DELETE ON public.attendance_reopen_requests FROM anon, authenticated;
REVOKE TRUNCATE ON public.attendance_reopen_requests FROM authenticated, anon;
GRANT SELECT ON public.attendance_reopen_requests TO authenticated;
GRANT ALL ON public.attendance_reopen_requests TO service_role;

-- The state snapshot is deliberately narrow. It records the canonical fields
-- that prove the close and the guarded reopen without copying attendance rows.
CREATE OR REPLACE FUNCTION public.attendance_reopen_session_state(p_session_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT jsonb_build_object(
    'id', session.id,
    'turma_id', session.turma_id,
    'escola_id', session.escola_id,
    'professor_id', session.professor_id,
    'data_aula', session.data_aula,
    'status', session.status,
    'aberta_em', session.aberta_em,
    'fechada_em', session.fechada_em,
    'travada_em', session.travada_em,
    'hash_legal', session.hash_legal,
    'observacoes_fechamento', session.observacoes_fechamento,
    'updated_at', session.updated_at
  )
  FROM public.sessoes_aula AS session
  WHERE session.id = p_session_id;
$$;
REVOKE ALL ON FUNCTION public.attendance_reopen_session_state(uuid)
  FROM PUBLIC, anon, authenticated;

-- This is an internal, server-owned audit seam. It has its own explicit
-- allowlist because the generic pilot audit RPC must not become a reopen
-- override or accept arbitrary attendance event names.
CREATE OR REPLACE FUNCTION public.write_attendance_reopen_pilot_audit(
  p_event_type text,
  p_session_id uuid,
  p_request_id uuid,
  p_school_id uuid,
  p_metadata jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  actor_role text;
  session_school uuid;
  session_professor uuid;
  metadata jsonb := coalesce(p_metadata, '{}'::jsonb);
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'ATTENDANCE_REOPEN_AUDIT_AUTH_REQUIRED: authenticated actor required';
  END IF;

  IF p_event_type NOT IN ('attendance_reopen_requested', 'attendance_reopen_decided') THEN
    RAISE EXCEPTION 'ATTENDANCE_REOPEN_AUDIT_EVENT_NOT_ALLOWED: event is outside the reopen contract';
  END IF;

  IF jsonb_typeof(metadata) <> 'object'
     OR EXISTS (
       SELECT 1
       FROM jsonb_object_keys(metadata) AS key_name(key)
       WHERE key_name.key <> ALL (
         CASE p_event_type
           WHEN 'attendance_reopen_requested' THEN ARRAY[
             'request_id', 'before_status', 'after_status', 'requested_at',
             'reason_present'
           ]::text[]
           WHEN 'attendance_reopen_decided' THEN ARRAY[
             'request_id', 'decision', 'before_status', 'after_status',
             'requested_at', 'decided_at', 'decision_reason_present'
           ]::text[]
         END
       )
     ) THEN
    RAISE EXCEPTION 'ATTENDANCE_REOPEN_AUDIT_METADATA_NOT_ALLOWED: metadata is outside the reopen contract';
  END IF;

  SELECT session.escola_id, session.professor_id
  INTO session_school, session_professor
  FROM public.sessoes_aula AS session
  WHERE session.id = p_session_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'ATTENDANCE_REOPEN_AUDIT_SESSION_NOT_FOUND: canonical session does not exist';
  END IF;

  IF p_school_id IS DISTINCT FROM session_school THEN
    RAISE EXCEPTION 'ATTENDANCE_REOPEN_AUDIT_SCHOOL_DENIED: event school is not canonical';
  END IF;

  actor_role := public.attendance_current_role();
  IF p_event_type = 'attendance_reopen_requested' THEN
    IF actor_role <> 'professor' OR session_professor IS DISTINCT FROM auth.uid() THEN
      RAISE EXCEPTION 'ATTENDANCE_REOPEN_AUDIT_ROLE_DENIED: request event belongs to the session professor';
    END IF;
    IF metadata->>'before_status' <> 'FECHADA'
       OR metadata->>'after_status' <> 'FECHADA'
       OR metadata->>'reason_present' <> 'true' THEN
      RAISE EXCEPTION 'ATTENDANCE_REOPEN_AUDIT_METADATA_NOT_ALLOWED: request receipt is incomplete';
    END IF;
  ELSE
    IF actor_role <> 'diretor'
       OR public.attendance_current_school_id() IS DISTINCT FROM session_school THEN
      RAISE EXCEPTION 'ATTENDANCE_REOPEN_AUDIT_ROLE_DENIED: decision event belongs to the school director';
    END IF;
    IF metadata->>'before_status' <> 'FECHADA'
       OR metadata->>'decision' NOT IN ('APROVADA', 'REJEITADA')
       OR metadata->>'after_status' NOT IN ('ABERTA', 'FECHADA')
       OR metadata->>'decided_at' IS NULL THEN
      RAISE EXCEPTION 'ATTENDANCE_REOPEN_AUDIT_METADATA_NOT_ALLOWED: decision receipt is incomplete';
    END IF;
  END IF;

  IF p_request_id IS NULL THEN
    RAISE EXCEPTION 'ATTENDANCE_REOPEN_AUDIT_REQUEST_REQUIRED: request ID is required';
  END IF;

  INSERT INTO public.pilot_audit_log(
    actor_user_id, escola_id, event_type, entity_type, entity_id,
    redacted_metadata
  ) VALUES (
    auth.uid(), p_school_id, p_event_type, 'sessoes_aula', p_session_id::text,
    metadata || jsonb_build_object('request_id', p_request_id::text)
  );
END;
$$;
REVOKE ALL ON FUNCTION public.write_attendance_reopen_pilot_audit(text, uuid, uuid, uuid, jsonb)
  FROM PUBLIC, anon, authenticated;

-- The canonical attendance audit trail includes the request lifecycle and
-- points every row to the same sessoes_aula ID.
CREATE OR REPLACE FUNCTION public.attendance_reopen_audit_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  actor_id uuid := auth.uid();
  row_data jsonb;
  old_data jsonb;
  session_id text;
  school_id uuid;
  record_id text;
  reason text;
BEGIN
  IF actor_id IS NULL THEN
    RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
  END IF;

  row_data := CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE to_jsonb(NEW) END;
  old_data := CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) ELSE NULL END;
  record_id := row_data->>'id';
  session_id := row_data->>'sessao_id';
  school_id := NULLIF(row_data->>'escola_id', '')::uuid;
  reason := coalesce(row_data->>'decision_reason', row_data->>'request_reason');

  INSERT INTO public.audit_trail(
    tabela, registro_id, operacao, usuario_id, escola_id, sessao_id,
    dados_anteriores, dados_novos, justificativa, nivel_criticidade
  ) VALUES (
    TG_TABLE_NAME, record_id, lower(TG_OP), actor_id, school_id, session_id,
    old_data, CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN row_data ELSE NULL END,
    reason, 'critical'
  );

  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;

DROP TRIGGER IF EXISTS attendance_reopen_audit_change
  ON public.attendance_reopen_requests;
CREATE TRIGGER attendance_reopen_audit_change
AFTER INSERT OR UPDATE OR DELETE ON public.attendance_reopen_requests
FOR EACH ROW EXECUTE FUNCTION public.attendance_reopen_audit_change();
REVOKE ALL ON FUNCTION public.attendance_reopen_audit_change() FROM PUBLIC, anon, authenticated;

-- Only the approved director workflow may clear the closed state. Ordinary
-- updates, including a forged status change, still hit the immutable error.
CREATE OR REPLACE FUNCTION public.attendance_protect_session_state()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  reopen_request_id uuid;
BEGIN
  IF OLD.turma_id IS DISTINCT FROM NEW.turma_id
     OR OLD.escola_id IS DISTINCT FROM NEW.escola_id
     OR OLD.professor_id IS DISTINCT FROM NEW.professor_id
     OR OLD.data_aula IS DISTINCT FROM NEW.data_aula
     OR OLD.disciplina_id IS DISTINCT FROM NEW.disciplina_id THEN
    RAISE EXCEPTION 'ATTENDANCE_SESSION_IDENTITY_IMMUTABLE: session identity cannot change';
  END IF;

  IF OLD.status IN ('FECHADA', 'CANCELADA') THEN
    reopen_request_id := NULLIF(
      current_setting('educa.attendance_reopen_request_id', true),
      ''
    )::uuid;

    IF OLD.status <> 'FECHADA'
       OR NEW.status <> 'ABERTA'
       OR reopen_request_id IS NULL
       OR public.attendance_current_role() <> 'diretor'
       OR public.attendance_current_school_id() IS DISTINCT FROM OLD.escola_id
       OR NEW.fechada_em IS NOT NULL
       OR NEW.travada_em IS NOT NULL
       OR NEW.hash_legal IS NOT NULL
       OR NOT EXISTS (
         SELECT 1
         FROM public.attendance_reopen_requests AS request
         JOIN public.users AS requester ON requester.id = request.requested_by
         WHERE request.id = reopen_request_id
           AND request.sessao_id = OLD.id
           AND request.escola_id = OLD.escola_id
           AND request.status = 'PENDENTE'
           AND requester.tipo_usuario = 'professor'
           AND requester.escola_id = OLD.escola_id
       ) THEN
      RAISE EXCEPTION 'ATTENDANCE_SESSION_IMMUTABLE: closed or cancelled sessions cannot change';
    END IF;
  END IF;

  IF NEW.status = 'FECHADA' THEN
    IF OLD.status <> 'ABERTA' THEN
      RAISE EXCEPTION 'ATTENDANCE_SESSION_TRANSITION_INVALID: only an open session can close';
    END IF;
    IF auth.uid() IS NOT NULL
       AND (
         OLD.data_aula <> (now() AT TIME ZONE 'America/Sao_Paulo')::date
         OR (
           OLD.auto_fechamento_agendado IS NOT NULL
           AND now() >= OLD.auto_fechamento_agendado
         )
       ) THEN
      RAISE EXCEPTION 'ATTENDANCE_SESSION_IMMUTABLE: session is outside its editable window';
    END IF;
    NEW.fechada_em := coalesce(NEW.fechada_em, now());
    NEW.travada_em := coalesce(NEW.travada_em, NEW.fechada_em);
    NEW.hash_legal := md5(concat_ws('|', NEW.id::text, NEW.turma_id::text,
      NEW.professor_id::text, NEW.data_aula::text, NEW.aberta_em::text,
      NEW.fechada_em::text, NEW.conteudo_programatico));
  ELSIF NEW.status = 'CANCELADA' AND OLD.status NOT IN ('ABERTA', 'PLANEJADA') THEN
    RAISE EXCEPTION 'ATTENDANCE_SESSION_TRANSITION_INVALID: session cannot be cancelled from this state';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS attendance_protect_session_state ON public.sessoes_aula;
CREATE TRIGGER attendance_protect_session_state
BEFORE UPDATE ON public.sessoes_aula
FOR EACH ROW EXECUTE FUNCTION public.attendance_protect_session_state();
REVOKE ALL ON FUNCTION public.attendance_protect_session_state() FROM PUBLIC;

CREATE OR REPLACE FUNCTION public.request_attendance_reopen(
  p_session_id uuid,
  p_reason text
)
RETURNS public.attendance_reopen_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  actor_role text;
  actor_school uuid;
  session_row public.sessoes_aula%ROWTYPE;
  request_row public.attendance_reopen_requests%ROWTYPE;
  request_reason text := btrim(coalesce(p_reason, ''));
  before_state jsonb;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'ATTENDANCE_REOPEN_AUTH_REQUIRED: authenticated teacher required';
  END IF;

  SELECT users.tipo_usuario, users.escola_id
  INTO actor_role, actor_school
  FROM public.users
  WHERE users.id = auth.uid()
    AND users.ativo = true;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'ATTENDANCE_REOPEN_AUTH_REQUIRED: active actor required';
  END IF;

  IF actor_role <> 'professor' THEN
    RAISE EXCEPTION 'ATTENDANCE_REOPEN_ROLE_DENIED: only the session teacher can request reopening';
  END IF;

  IF request_reason = '' THEN
    RAISE EXCEPTION 'ATTENDANCE_REOPEN_REASON_REQUIRED: reopening reason is required';
  END IF;

  SELECT session.*
  INTO session_row
  FROM public.sessoes_aula AS session
  JOIN public.turmas AS class ON class.id = session.turma_id
  WHERE session.id = p_session_id
    AND class.professor_id = session.professor_id
    AND class.escola_id = session.escola_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'ATTENDANCE_REOPEN_SESSION_NOT_FOUND: canonical session does not exist';
  END IF;

  IF session_row.escola_id IS DISTINCT FROM actor_school THEN
    RAISE EXCEPTION 'ATTENDANCE_REOPEN_SCHOOL_DENIED: session belongs to another school';
  END IF;
  IF session_row.professor_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'ATTENDANCE_REOPEN_SESSION_NOT_OWNED: only the titular teacher can request reopening';
  END IF;
  IF session_row.status <> 'FECHADA' THEN
    RAISE EXCEPTION 'ATTENDANCE_REOPEN_SESSION_NOT_CLOSED: only a closed session can be reopened';
  END IF;

  before_state := public.attendance_reopen_session_state(session_row.id);

  BEGIN
    INSERT INTO public.attendance_reopen_requests(
      sessao_id, escola_id, requested_by, request_reason,
      requested_at, before_state
    ) VALUES (
      session_row.id, session_row.escola_id, auth.uid(), request_reason,
      now(), before_state
    )
    RETURNING * INTO request_row;
  EXCEPTION WHEN unique_violation THEN
    RAISE EXCEPTION 'ATTENDANCE_REOPEN_PENDING: a request is already pending for this session';
  END;

  PERFORM public.write_attendance_reopen_pilot_audit(
    'attendance_reopen_requested',
    session_row.id,
    request_row.id,
    session_row.escola_id,
    jsonb_build_object(
      'before_status', request_row.before_state->>'status',
      'after_status', request_row.before_state->>'status',
      'requested_at', request_row.requested_at,
      'reason_present', true
    )
  );

  RETURN request_row;
END;
$$;
REVOKE ALL ON FUNCTION public.request_attendance_reopen(uuid, text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.request_attendance_reopen(uuid, text)
  TO authenticated;

CREATE OR REPLACE FUNCTION public.decide_attendance_reopen(
  p_request_id uuid,
  p_decision text,
  p_reason text DEFAULT NULL
)
RETURNS public.attendance_reopen_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  actor_role text;
  actor_school uuid;
  request_row public.attendance_reopen_requests%ROWTYPE;
  session_row public.sessoes_aula%ROWTYPE;
  decision_reason_value text := nullif(btrim(coalesce(p_reason, '')), '');
  after_state_value jsonb;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'ATTENDANCE_REOPEN_AUTH_REQUIRED: authenticated director required';
  END IF;

  SELECT users.tipo_usuario, users.escola_id
  INTO actor_role, actor_school
  FROM public.users
  WHERE users.id = auth.uid()
    AND users.ativo = true;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'ATTENDANCE_REOPEN_AUTH_REQUIRED: active actor required';
  END IF;

  IF actor_role <> 'diretor' THEN
    RAISE EXCEPTION 'ATTENDANCE_REOPEN_ROLE_DENIED: only a director can decide reopening';
  END IF;

  IF p_decision NOT IN ('APROVADA', 'REJEITADA') THEN
    RAISE EXCEPTION 'ATTENDANCE_REOPEN_DECISION_INVALID: use APROVADA or REJEITADA';
  END IF;
  IF p_decision = 'REJEITADA' AND decision_reason_value IS NULL THEN
    RAISE EXCEPTION 'ATTENDANCE_REOPEN_DECISION_REASON_REQUIRED: rejection reason is required';
  END IF;

  SELECT * INTO request_row
  FROM public.attendance_reopen_requests
  WHERE id = p_request_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'ATTENDANCE_REOPEN_REQUEST_NOT_FOUND: request does not exist';
  END IF;

  SELECT * INTO session_row
  FROM public.sessoes_aula
  WHERE id = request_row.sessao_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'ATTENDANCE_REOPEN_SESSION_NOT_FOUND: canonical session does not exist';
  END IF;

  IF request_row.escola_id IS DISTINCT FROM actor_school
     OR session_row.escola_id IS DISTINCT FROM actor_school THEN
    RAISE EXCEPTION 'ATTENDANCE_REOPEN_SCHOOL_DENIED: director can decide only the own school';
  END IF;
  IF request_row.status <> 'PENDENTE' THEN
    RAISE EXCEPTION 'ATTENDANCE_REOPEN_ALREADY_DECIDED: request already has a decision';
  END IF;
  IF session_row.status <> 'FECHADA' THEN
    RAISE EXCEPTION 'ATTENDANCE_REOPEN_SESSION_STATE_CHANGED: session is no longer closed';
  END IF;

  IF p_decision = 'APROVADA' THEN
    PERFORM set_config('educa.attendance_reopen_request_id', request_row.id::text, true);
    UPDATE public.sessoes_aula
    SET status = 'ABERTA',
        fechada_em = NULL,
        travada_em = NULL,
        hash_legal = NULL,
        updated_at = now()
    WHERE id = session_row.id;
  END IF;

  after_state_value := public.attendance_reopen_session_state(session_row.id);

  UPDATE public.attendance_reopen_requests
  SET status = p_decision,
      decided_by = auth.uid(),
      decision_reason = decision_reason_value,
      decided_at = now(),
      after_state = after_state_value,
      updated_at = now()
  WHERE id = request_row.id
  RETURNING * INTO request_row;

  PERFORM public.write_attendance_reopen_pilot_audit(
    'attendance_reopen_decided',
    session_row.id,
    request_row.id,
    session_row.escola_id,
    jsonb_build_object(
      'decision', request_row.status,
      'before_status', request_row.before_state->>'status',
      'after_status', request_row.after_state->>'status',
      'requested_at', request_row.requested_at,
      'decided_at', request_row.decided_at,
      'decision_reason_present', request_row.decision_reason IS NOT NULL
    )
  );

  RETURN request_row;
END;
$$;
REVOKE ALL ON FUNCTION public.decide_attendance_reopen(uuid, text, text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.decide_attendance_reopen(uuid, text, text)
  TO authenticated;

COMMIT;
