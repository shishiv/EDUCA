-- Director-approved attendance corrections capture a school-configured deadline.
-- Historical approvals are not backfilled: they do not acquire a new window.
BEGIN;

CREATE UNIQUE INDEX configs_attendance_reopen_default
  ON public.configs(chave)
  WHERE chave = 'attendance_reopen_window_hours' AND escola_id IS NULL;
CREATE UNIQUE INDEX configs_attendance_reopen_school
  ON public.configs(escola_id, chave)
  WHERE chave = 'attendance_reopen_window_hours' AND escola_id IS NOT NULL;

INSERT INTO public.configs (
  chave, valor, categoria, descricao, tipo_valor, valor_padrao, escola_id, ativo
) VALUES (
  'attendance_reopen_window_hours', '24', 'attendance',
  'Janela de correção após aprovação de reabertura de frequência (horas)',
  'integer', '24', NULL, true
);

ALTER TABLE public.configs ADD CONSTRAINT attendance_reopen_window_config_check
CHECK (
  chave <> 'attendance_reopen_window_hours'
  OR CASE WHEN valor ~ '^[0-9]{1,3}$' THEN valor::integer BETWEEN 1 AND 168 ELSE false END
);

CREATE POLICY attendance_reopen_config_select_scoped
ON public.configs AS RESTRICTIVE FOR SELECT TO authenticated
USING (
  chave <> 'attendance_reopen_window_hours'
  OR (
    public.attendance_current_role() IN ('professor', 'diretor')
    AND public.attendance_current_school_id() IS NOT NULL
    AND (escola_id IS NULL OR escola_id = public.attendance_current_school_id())
  )
);
CREATE POLICY attendance_reopen_config_no_direct_update
ON public.configs AS RESTRICTIVE FOR UPDATE TO authenticated
USING (chave <> 'attendance_reopen_window_hours')
WITH CHECK (chave <> 'attendance_reopen_window_hours');

CREATE OR REPLACE FUNCTION public.attendance_reopen_window_hours(p_school_id uuid)
RETURNS integer
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
  configured text;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.users AS u
    WHERE u.id = auth.uid() AND u.ativo = true
      AND u.tipo_usuario IN ('professor', 'diretor') AND u.escola_id = p_school_id
  ) THEN
    RAISE EXCEPTION 'ATTENDANCE_REOPEN_WINDOW_READ_DENIED: school actor required';
  END IF;
  SELECT c.valor INTO configured FROM public.configs AS c
  WHERE c.chave = 'attendance_reopen_window_hours' AND c.ativo = true
    AND (c.escola_id = p_school_id OR c.escola_id IS NULL)
  ORDER BY c.escola_id NULLS LAST LIMIT 1;
  IF configured IS NULL THEN
    RAISE EXCEPTION 'ATTENDANCE_REOPEN_WINDOW_CONFIG_INVALID: active default required';
  END IF;
  RETURN configured::integer;
END;
$$;
REVOKE ALL ON FUNCTION public.attendance_reopen_window_hours(uuid) FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.attendance_reopen_window_hours(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.set_attendance_reopen_window_hours(p_school_id uuid, p_hours integer)
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
  config_id uuid;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.users AS u
    WHERE u.id = auth.uid() AND u.ativo = true
      AND u.tipo_usuario = 'diretor' AND u.escola_id = p_school_id
  ) THEN
    RAISE EXCEPTION 'ATTENDANCE_REOPEN_WINDOW_WRITE_DENIED: school director required';
  END IF;
  IF p_hours IS NULL OR p_hours NOT BETWEEN 1 AND 168 THEN
    RAISE EXCEPTION 'ATTENDANCE_REOPEN_WINDOW_VALUE_INVALID: hours must be between 1 and 168';
  END IF;
  INSERT INTO public.configs (
    chave, valor, categoria, descricao, tipo_valor, valor_padrao, escola_id, criado_por, ativo
  ) SELECT
    'attendance_reopen_window_hours', p_hours::text, 'attendance',
    'Janela de correção após aprovação de reabertura de frequência (horas)',
    'integer', c.valor, p_school_id, auth.uid(), true
  FROM public.configs AS c
  WHERE c.chave = 'attendance_reopen_window_hours' AND c.escola_id IS NULL AND c.ativo = true
  ON CONFLICT (escola_id, chave)
    WHERE chave = 'attendance_reopen_window_hours' AND escola_id IS NOT NULL
  DO UPDATE SET valor = EXCLUDED.valor, ativo = true, updated_at = clock_timestamp()
  RETURNING id INTO config_id;
  IF config_id IS NULL THEN
    RAISE EXCEPTION 'ATTENDANCE_REOPEN_WINDOW_CONFIG_INVALID: active default required';
  END IF;
  INSERT INTO public.audit_trail (
    tabela, registro_id, operacao, usuario_id, escola_id, dados_novos, nivel_criticidade
  ) VALUES (
    'configs', config_id::text, 'update', auth.uid(), p_school_id,
    jsonb_build_object('chave', 'attendance_reopen_window_hours', 'valor', p_hours), 'critical'
  );
  RETURN p_hours;
END;
$$;
REVOKE ALL ON FUNCTION public.set_attendance_reopen_window_hours(uuid, integer) FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.set_attendance_reopen_window_hours(uuid, integer) TO authenticated;

ALTER TABLE public.attendance_reopen_requests
  ADD COLUMN approved_at timestamptz,
  ADD COLUMN correction_window_hours integer,
  ADD COLUMN correction_deadline_at timestamptz;
ALTER TABLE public.attendance_reopen_requests
  ADD CONSTRAINT attendance_reopen_approval_window_check CHECK (
    (approved_at IS NULL AND correction_window_hours IS NULL AND correction_deadline_at IS NULL)
    OR (
      status = 'APROVADA' AND approved_at IS NOT NULL
      AND correction_window_hours IS NOT NULL AND correction_window_hours BETWEEN 1 AND 168
      AND correction_deadline_at IS NOT NULL
      AND correction_deadline_at = approved_at + make_interval(hours => correction_window_hours)
    )
  );

CREATE OR REPLACE FUNCTION public.attendance_reopen_capture_window()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
BEGIN
  IF OLD.status <> 'PENDENTE' AND NEW IS DISTINCT FROM OLD THEN
    RAISE EXCEPTION 'ATTENDANCE_REOPEN_DECISION_IMMUTABLE: decision cannot be changed';
  END IF;
  IF OLD.status = 'PENDENTE' AND NEW.status = 'APROVADA' THEN
    NEW.approved_at := clock_timestamp();
    NEW.decided_at := NEW.approved_at;
    NEW.correction_window_hours := public.attendance_reopen_window_hours(NEW.escola_id);
    NEW.correction_deadline_at := NEW.approved_at + make_interval(hours => NEW.correction_window_hours);
  ELSIF OLD.status = 'PENDENTE' THEN
    NEW.approved_at := NULL;
    NEW.correction_window_hours := NULL;
    NEW.correction_deadline_at := NULL;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER attendance_reopen_capture_window
BEFORE UPDATE ON public.attendance_reopen_requests
FOR EACH ROW EXECUTE FUNCTION public.attendance_reopen_capture_window();
REVOKE ALL ON FUNCTION public.attendance_reopen_capture_window() FROM PUBLIC, anon, authenticated, service_role;

-- Internal temporal rule shared by the lock RPC and all write triggers. Once
-- an approval has a captured deadline, the ordinary day/cutoff cannot extend it.
-- Wall time also prevents a long transaction from retaining an expired window.
CREATE OR REPLACE FUNCTION public.attendance_session_within_window(p_session_id uuid)
RETURNS boolean
LANGUAGE sql VOLATILE SECURITY DEFINER SET search_path = public, pg_temp
AS $$
  SELECT coalesce((
    SELECT CASE WHEN request.correction_deadline_at IS NOT NULL
      THEN clock_timestamp() < request.correction_deadline_at
      ELSE s.data_aula = (clock_timestamp() AT TIME ZONE 'America/Sao_Paulo')::date
        AND (s.auto_fechamento_agendado IS NULL OR clock_timestamp() < s.auto_fechamento_agendado)
      END
    FROM public.sessoes_aula AS s
    LEFT JOIN LATERAL (
      SELECT r.correction_deadline_at FROM public.attendance_reopen_requests AS r
      WHERE r.sessao_id = s.id AND r.status = 'APROVADA'
      ORDER BY r.decided_at DESC, r.requested_at DESC, r.id DESC LIMIT 1
    ) AS request ON true
    WHERE s.id = p_session_id
  ), false);
$$;
REVOKE ALL ON FUNCTION public.attendance_session_within_window(uuid) FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.is_session_editable(session_id uuid)
RETURNS boolean
LANGUAGE sql VOLATILE SECURITY DEFINER SET search_path = public, pg_temp
AS $$
  SELECT coalesce((
    SELECT s.status = 'ABERTA' AND s.travada_em IS NULL AND s.fechada_em IS NULL
      AND public.attendance_can_access_class(s.turma_id)
      AND public.attendance_session_within_window(s.id)
    FROM public.sessoes_aula AS s WHERE s.id = session_id
  ), false);
$$;
REVOKE ALL ON FUNCTION public.is_session_editable(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_session_editable(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.attendance_prepare_frequency_record()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  session_row public.sessoes_aula%ROWTYPE;
  actor_id uuid;
BEGIN
  IF NEW.sessao_id IS NULL THEN
    RAISE EXCEPTION 'ATTENDANCE_SESSION_REQUIRED: frequencia must reference sessoes_aula';
  END IF;

  IF NEW.aula_id IS NOT NULL THEN
    RAISE EXCEPTION 'ATTENDANCE_CANONICAL_SESSION_REQUIRED: aulas_abertas is not the canonical attendance source';
  END IF;

  actor_id := auth.uid();

  SELECT * INTO session_row
  FROM public.sessoes_aula
  WHERE id = NEW.sessao_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ATTENDANCE_SESSION_NOT_FOUND: session % does not exist', NEW.sessao_id;
  END IF;

  IF actor_id IS NOT NULL AND (
       session_row.status <> 'ABERTA'
       OR session_row.travada_em IS NOT NULL
       OR session_row.fechada_em IS NOT NULL
       OR NOT public.attendance_session_within_window(session_row.id)
     ) THEN
    RAISE EXCEPTION 'ATTENDANCE_SESSION_IMMUTABLE: session % is not editable', NEW.sessao_id;
  END IF;

  NEW.data_aula := session_row.data_aula;
  NEW.professor_id := session_row.professor_id;
  IF actor_id IS NOT NULL THEN
    NEW.marcado_por := actor_id;
  END IF;
  NEW.marcado_em := coalesce(NEW.marcado_em, now());
  NEW.modificado_em := CASE WHEN TG_OP = 'UPDATE' THEN now() ELSE NEW.modificado_em END;

  IF NEW.status_presenca NOT IN ('P', 'F', 'J', 'A', 'NAO_MARCADO') THEN
    RAISE EXCEPTION 'ATTENDANCE_STATUS_INVALID: use P, F, J, A or NAO_MARCADO';
  END IF;

  NEW.presente := NEW.status_presenca IN ('P', 'J', 'A');

  IF NEW.status_presenca = 'J'
     AND nullif(btrim(coalesce(NEW.justificativa, '')), '') IS NULL THEN
    RAISE EXCEPTION 'ATTENDANCE_JUSTIFICATION_REQUIRED: justified absence needs a reason';
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.attendance_protect_frequency_state()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  session_row public.sessoes_aula%ROWTYPE;
BEGIN
  SELECT * INTO session_row
  FROM public.sessoes_aula
  WHERE id = coalesce(OLD.sessao_id, NEW.sessao_id)
  FOR UPDATE;

  IF FOUND AND (
    session_row.status IN ('FECHADA', 'CANCELADA')
    OR session_row.travada_em IS NOT NULL
    OR session_row.fechada_em IS NOT NULL
    OR (
      auth.uid() IS NOT NULL
      AND NOT public.attendance_session_within_window(session_row.id)
    )
  ) THEN
    RAISE EXCEPTION 'ATTENDANCE_SESSION_IMMUTABLE: attendance records cannot change after closure';
  END IF;

  IF TG_OP = 'DELETE' AND OLD.sessao_id IS NOT NULL THEN
    RETURN OLD;
  END IF;

  RETURN NEW;
END;
$$;

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
           AND requester.ativo = true
           AND requester.id = OLD.professor_id
           AND EXISTS (
             SELECT 1 FROM public.turmas AS turma
             WHERE turma.id = OLD.turma_id AND turma.professor_id = requester.id
               AND turma.escola_id = OLD.escola_id AND turma.ativo = true
           )
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
       AND NOT public.attendance_session_within_window(OLD.id) THEN
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

COMMIT;
