-- Canonical attendance flow for the synthetic EDUCA pilot.
--
-- The canonical source is sessoes_aula. A frequency row belongs to one
-- matricula and one session. The session supplies the attendance date.
-- Closed sessions and their records are immutable.

BEGIN;

-- The previous day-level unique index prevents two sessions on the same day.
-- Remove it only after the duplicate checks below. Session cardinality is the
-- canonical key, so a second session on one day preserves the first history.
DROP INDEX IF EXISTS public.idx_frequencia_matricula_data;

-- Normalize only values with an explicit, reversible domain mapping. Unknown
-- values stop the migration instead of being silently rewritten.
UPDATE public.sessoes_aula
SET status = CASE lower(status)
  WHEN 'planejada' THEN 'PLANEJADA'
  WHEN 'aberta' THEN 'ABERTA'
  WHEN 'em_andamento' THEN 'ABERTA'
  WHEN 'fechada' THEN 'FECHADA'
  WHEN 'travada' THEN 'FECHADA'
  WHEN 'cancelada' THEN 'CANCELADA'
  ELSE status
END
WHERE status IS NOT NULL;

UPDATE public.frequencia
SET status_presenca = CASE lower(coalesce(status_presenca, ''))
  WHEN '' THEN 'NAO_MARCADO'
  WHEN 'nao_marcado' THEN 'NAO_MARCADO'
  WHEN 'presente' THEN 'P'
  WHEN 'p' THEN 'P'
  WHEN 'falta' THEN 'F'
  WHEN 'ausente' THEN 'F'
  WHEN 'f' THEN 'F'
  WHEN 'justificada' THEN 'J'
  WHEN 'j' THEN 'J'
  WHEN 'atestado' THEN 'A'
  WHEN 'atestado_medico' THEN 'A'
  WHEN 'a' THEN 'A'
  ELSE status_presenca
END
WHERE status_presenca IS NULL
   OR lower(status_presenca) IN (
     '', 'nao_marcado', 'presente', 'p', 'falta', 'ausente', 'f',
     'justificada', 'j', 'atestado', 'atestado_medico', 'a'
   );

UPDATE public.frequencia
SET presente = status_presenca IN ('P', 'J', 'A')
WHERE status_presenca IN ('P', 'F', 'J', 'A', 'NAO_MARCADO');

-- Migrate legacy aulas_abertas only through an exact identity rule. The old
-- UUID becomes the sessoes_aula UUID, and a legacy frequency row keeps its
-- history through that same session ID. Ambiguous or conflicting rows stop the
-- migration instead of being merged or deleted.
DO $$
DECLARE
  legacy_statuses text;
  legacy_id_conflict text;
  legacy_duplicate_identity text;
  legacy_frequency_conflict text;
  legacy_invalid_identity text;
  legacy_null_date bigint;
BEGIN
  SELECT string_agg(status, ', ' ORDER BY status)
  INTO legacy_statuses
  FROM (
    SELECT DISTINCT coalesce(status, '<NULL>') AS status
    FROM public.aulas_abertas
    WHERE status IS NULL
       OR lower(status) NOT IN ('aberta', 'fechada', 'travada', 'cancelada')
  ) values_to_check;

  IF legacy_statuses IS NOT NULL THEN
    RAISE EXCEPTION
      'ATTENDANCE_CANONICAL_MIGRATION_BLOCKED: unknown aulas_abertas.status values: %',
      legacy_statuses;
  END IF;

  SELECT count(*) INTO legacy_null_date
  FROM public.aulas_abertas
  WHERE data_aula IS NULL;
  IF legacy_null_date > 0 THEN
    RAISE EXCEPTION
      'ATTENDANCE_CANONICAL_MIGRATION_BLOCKED: % legacy sessions have no class date',
      legacy_null_date;
  END IF;

  SELECT format('aula_id=%s turma_id=%s', aa.id, aa.turma_id)
  INTO legacy_invalid_identity
  FROM public.aulas_abertas AS aa
  JOIN public.turmas AS t ON t.id = aa.turma_id
  WHERE aa.escola_id <> t.escola_id
     OR aa.professor_id <> t.professor_id
  LIMIT 1;

  IF legacy_invalid_identity IS NOT NULL THEN
    RAISE EXCEPTION
      'ATTENDANCE_CANONICAL_MIGRATION_BLOCKED: legacy session identity does not match turma: %',
      legacy_invalid_identity;
  END IF;

  SELECT aa.id::text
  INTO legacy_id_conflict
  FROM public.aulas_abertas AS aa
  JOIN public.sessoes_aula AS s ON s.id = aa.id
  LIMIT 1;

  IF legacy_id_conflict IS NOT NULL THEN
    RAISE EXCEPTION
      'ATTENDANCE_CANONICAL_MIGRATION_BLOCKED: legacy aula UUID already exists as session: %',
      legacy_id_conflict;
  END IF;

  SELECT format('turma_id=%s data_aula=%s professor_id=%s count=%s', turma_id, data_aula, professor_id, count(*))
  INTO legacy_duplicate_identity
  FROM public.aulas_abertas
  GROUP BY turma_id, data_aula, professor_id
  HAVING count(*) > 1
  LIMIT 1;

  IF legacy_duplicate_identity IS NOT NULL THEN
    RAISE EXCEPTION
      'ATTENDANCE_CANONICAL_MIGRATION_BLOCKED: ambiguous legacy session identity: %',
      legacy_duplicate_identity;
  END IF;

  SELECT aa.id::text
  INTO legacy_frequency_conflict
  FROM public.frequencia AS f
  JOIN public.aulas_abertas AS aa ON aa.id = f.aula_id
  WHERE f.sessao_id IS NOT NULL
    AND f.sessao_id <> aa.id
  LIMIT 1;

  IF legacy_frequency_conflict IS NOT NULL THEN
    RAISE EXCEPTION
      'ATTENDANCE_CANONICAL_MIGRATION_BLOCKED: frequency row has conflicting aula_id and sessao_id: %',
      legacy_frequency_conflict;
  END IF;
END;
$$;

INSERT INTO public.sessoes_aula (
  id, turma_id, escola_id, professor_id, data_aula, inicio_aula, fim_aula,
  status, aberta_em, fechada_em, travada_em, cancelada_em,
  observacoes_fechamento, conteudo_programatico, documento_oficial
)
SELECT
  aa.id,
  aa.turma_id,
  aa.escola_id,
  aa.professor_id,
  aa.data_aula,
  coalesce(aa.aberta_em::time, current_time),
  aa.fechada_em::time,
  CASE lower(aa.status)
    WHEN 'aberta' THEN 'ABERTA'
    WHEN 'fechada' THEN 'FECHADA'
    WHEN 'travada' THEN 'FECHADA'
    WHEN 'cancelada' THEN 'CANCELADA'
  END,
  aa.aberta_em,
  aa.fechada_em,
  coalesce(aa.travada_em, aa.fechada_em),
  CASE WHEN lower(aa.status) = 'cancelada' THEN aa.fechada_em ELSE NULL END,
  aa.observacoes_fechamento,
  'Chamada migrada de aulas_abertas',
  true
FROM public.aulas_abertas AS aa;

UPDATE public.frequencia AS f
SET sessao_id = coalesce(f.sessao_id, aa.id),
    aula_id = NULL
FROM public.aulas_abertas AS aa
WHERE f.aula_id = aa.id;

-- The session owns the date. Existing linked records are corrected from the
-- session before the protecting trigger is installed. Legacy rows without a
-- session keep their original date and remain readable for history.
UPDATE public.frequencia AS f
SET data_aula = s.data_aula
FROM public.sessoes_aula AS s
WHERE f.sessao_id = s.id
  AND f.data_aula IS DISTINCT FROM s.data_aula;

DO $$
DECLARE
  invalid_session_status text;
  invalid_attendance_status text;
  duplicate_frequency text;
  duplicate_open_session text;
  null_session_date_count bigint;
  null_session_status_count bigint;
BEGIN
  SELECT string_agg(status, ', ' ORDER BY status)
  INTO invalid_session_status
  FROM (
    SELECT DISTINCT coalesce(status, '<NULL>') AS status
    FROM public.sessoes_aula
    WHERE status IS NULL
       OR status NOT IN ('PLANEJADA', 'ABERTA', 'FECHADA', 'CANCELADA')
  ) invalid_statuses;

  IF invalid_session_status IS NOT NULL THEN
    RAISE EXCEPTION
      'ATTENDANCE_CANONICAL_MIGRATION_BLOCKED: unknown sessoes_aula.status values: %',
      invalid_session_status;
  END IF;

  SELECT string_agg(status_presenca, ', ' ORDER BY status_presenca)
  INTO invalid_attendance_status
  FROM (
    SELECT DISTINCT coalesce(status_presenca, '<NULL>') AS status_presenca
    FROM public.frequencia
    WHERE status_presenca IS NULL
       OR status_presenca NOT IN ('P', 'F', 'J', 'A', 'NAO_MARCADO')
  ) invalid_statuses;

  IF invalid_attendance_status IS NOT NULL THEN
    RAISE EXCEPTION
      'ATTENDANCE_CANONICAL_MIGRATION_BLOCKED: unknown frequencia.status_presenca values: %',
      invalid_attendance_status;
  END IF;

  SELECT format('sessao_id=%s matricula_id=%s count=%s', sessao_id, matricula_id, count(*))
  INTO duplicate_frequency
  FROM public.frequencia
  WHERE sessao_id IS NOT NULL
  GROUP BY sessao_id, matricula_id
  HAVING count(*) > 1
  LIMIT 1;

  IF duplicate_frequency IS NOT NULL THEN
    RAISE EXCEPTION
      'ATTENDANCE_CANONICAL_MIGRATION_BLOCKED: duplicate frequency rows: %',
      duplicate_frequency;
  END IF;

  SELECT format('turma_id=%s data_aula=%s count=%s', turma_id, data_aula, count(*))
  INTO duplicate_open_session
  FROM public.sessoes_aula
  WHERE status IN ('PLANEJADA', 'ABERTA')
  GROUP BY turma_id, data_aula
  HAVING count(*) > 1
  LIMIT 1;

  IF duplicate_open_session IS NOT NULL THEN
    RAISE EXCEPTION
      'ATTENDANCE_CANONICAL_MIGRATION_BLOCKED: duplicate open sessions: %',
      duplicate_open_session;
  END IF;

  SELECT count(*) INTO null_session_date_count
  FROM public.sessoes_aula
  WHERE data_aula IS NULL;
  IF null_session_date_count > 0 THEN
    RAISE EXCEPTION
      'ATTENDANCE_CANONICAL_MIGRATION_BLOCKED: sessoes_aula.data_aula has % null rows',
      null_session_date_count;
  END IF;

  SELECT count(*) INTO null_session_status_count
  FROM public.sessoes_aula
  WHERE status IS NULL;
  IF null_session_status_count > 0 THEN
    RAISE EXCEPTION
      'ATTENDANCE_CANONICAL_MIGRATION_BLOCKED: sessoes_aula.status has % null rows',
      null_session_status_count;
  END IF;
END;
$$;

ALTER TABLE public.sessoes_aula
  ALTER COLUMN data_aula SET NOT NULL,
  ALTER COLUMN status SET NOT NULL,
  ALTER COLUMN status SET DEFAULT 'ABERTA';

ALTER TABLE public.frequencia
  ALTER COLUMN status_presenca SET NOT NULL,
  ALTER COLUMN status_presenca SET DEFAULT 'NAO_MARCADO';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.sessoes_aula'::regclass
      AND conname = 'sessoes_aula_status_canonical_check'
  ) THEN
    ALTER TABLE public.sessoes_aula
      ADD CONSTRAINT sessoes_aula_status_canonical_check
      CHECK (status IN ('PLANEJADA', 'ABERTA', 'FECHADA', 'CANCELADA'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.frequencia'::regclass
      AND conname = 'frequencia_status_canonical_check'
  ) THEN
    ALTER TABLE public.frequencia
      ADD CONSTRAINT frequencia_status_canonical_check
      CHECK (status_presenca IN ('P', 'F', 'J', 'A', 'NAO_MARCADO'));
  END IF;
END;
$$;

-- Multiple closed sessions on one day are valid history. Only one planned or
-- open session can exist for a class and date at a time.
DROP INDEX IF EXISTS public.idx_sessoes_aula_open_turma_date;
CREATE UNIQUE INDEX idx_sessoes_aula_open_turma_date
  ON public.sessoes_aula (turma_id, data_aula)
  WHERE status IN ('PLANEJADA', 'ABERTA');

DROP INDEX IF EXISTS public.idx_frequencia_sessao_matricula_unique;
CREATE UNIQUE INDEX idx_frequencia_sessao_matricula_unique
  ON public.frequencia (sessao_id, matricula_id)
  WHERE sessao_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_frequencia_session_date
  ON public.frequencia (sessao_id, data_aula)
  WHERE sessao_id IS NOT NULL;

-- Read helpers use the users table through SECURITY DEFINER functions. They
-- never read user-editable JWT metadata and are not authorization endpoints.
CREATE OR REPLACE FUNCTION public.attendance_current_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT tipo_usuario
  FROM public.users
  WHERE id = (SELECT auth.uid())
    AND ativo = true
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.attendance_current_school_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT escola_id
  FROM public.users
  WHERE id = (SELECT auth.uid())
    AND ativo = true
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.attendance_can_access_class(target_class_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.turmas AS t
    WHERE t.id = target_class_id
      AND (
        (
          (SELECT public.attendance_current_role()) IN ('admin', 'secretario')
          AND (
            (SELECT public.attendance_current_school_id()) IS NULL
            OR t.escola_id = (SELECT public.attendance_current_school_id())
          )
        )
        OR (
          (SELECT public.attendance_current_role()) = 'diretor'
          AND t.escola_id = (SELECT public.attendance_current_school_id())
        )
        OR (
          (SELECT public.attendance_current_role()) = 'professor'
          AND t.professor_id = (SELECT auth.uid())
          AND t.escola_id = (SELECT public.attendance_current_school_id())
        )
      )
  );
$$;

REVOKE ALL ON FUNCTION public.attendance_current_role() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.attendance_current_school_id() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.attendance_can_access_class(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.attendance_current_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.attendance_current_school_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.attendance_can_access_class(uuid) TO authenticated;

-- A BEFORE trigger derives protected identity fields from the session. RLS
-- checks the derived values after this trigger runs.
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
  WHERE id = NEW.sessao_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ATTENDANCE_SESSION_NOT_FOUND: session % does not exist', NEW.sessao_id;
  END IF;

  IF actor_id IS NOT NULL AND (
       session_row.status <> 'ABERTA'
       OR session_row.travada_em IS NOT NULL
       OR session_row.fechada_em IS NOT NULL
       OR session_row.data_aula <> (now() AT TIME ZONE 'America/Sao_Paulo')::date
       OR (
         session_row.auto_fechamento_agendado IS NOT NULL
         AND now() >= session_row.auto_fechamento_agendado
       )
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

DROP TRIGGER IF EXISTS attendance_prepare_frequency_record ON public.frequencia;
CREATE TRIGGER attendance_prepare_frequency_record
BEFORE INSERT OR UPDATE ON public.frequencia
FOR EACH ROW EXECUTE FUNCTION public.attendance_prepare_frequency_record();
REVOKE ALL ON FUNCTION public.attendance_prepare_frequency_record() FROM PUBLIC;

-- Session identity cannot be changed after creation. Closing is a one-way
-- transition and produces the legal hash used by the immutable record.
CREATE OR REPLACE FUNCTION public.attendance_protect_session_state()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF OLD.turma_id IS DISTINCT FROM NEW.turma_id
     OR OLD.escola_id IS DISTINCT FROM NEW.escola_id
     OR OLD.professor_id IS DISTINCT FROM NEW.professor_id
     OR OLD.data_aula IS DISTINCT FROM NEW.data_aula
     OR OLD.disciplina_id IS DISTINCT FROM NEW.disciplina_id THEN
    RAISE EXCEPTION 'ATTENDANCE_SESSION_IDENTITY_IMMUTABLE: session identity cannot change';
  END IF;

  IF OLD.status IN ('FECHADA', 'CANCELADA') THEN
    RAISE EXCEPTION 'ATTENDANCE_SESSION_IMMUTABLE: closed or cancelled sessions cannot change';
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

-- A direct table update cannot bypass the closed-session rule, even when a
-- caller has a broad SQL grant. Legacy rows without sessao_id remain history;
-- new and updated canonical rows must reference a session.
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
  WHERE id = coalesce(OLD.sessao_id, NEW.sessao_id);

  IF FOUND AND (
    session_row.status IN ('FECHADA', 'CANCELADA')
    OR session_row.travada_em IS NOT NULL
    OR session_row.fechada_em IS NOT NULL
    OR (
      auth.uid() IS NOT NULL
      AND session_row.data_aula <> (now() AT TIME ZONE 'America/Sao_Paulo')::date
    )
    OR (
      auth.uid() IS NOT NULL
      AND session_row.auto_fechamento_agendado IS NOT NULL
      AND now() >= session_row.auto_fechamento_agendado
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

DROP TRIGGER IF EXISTS attendance_protect_frequency_state ON public.frequencia;
CREATE TRIGGER attendance_protect_frequency_state
BEFORE UPDATE OR DELETE ON public.frequencia
FOR EACH ROW EXECUTE FUNCTION public.attendance_protect_frequency_state();
REVOKE ALL ON FUNCTION public.attendance_protect_frequency_state() FROM PUBLIC;

-- Keep the database lock function aligned with the canonical uppercase state
-- and the session's server-owned automatic cutoff.
CREATE OR REPLACE FUNCTION public.is_session_editable(session_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT coalesce(
    s.status = 'ABERTA'
    AND s.travada_em IS NULL
    AND s.fechada_em IS NULL
    AND s.data_aula = (now() AT TIME ZONE 'America/Sao_Paulo')::date
    AND (
      s.auto_fechamento_agendado IS NULL
      OR now() < s.auto_fechamento_agendado
    ),
    false
  )
  FROM public.sessoes_aula AS s
  WHERE s.id = session_id;
$$;

REVOKE ALL ON FUNCTION public.is_session_editable(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_session_editable(uuid) TO authenticated;

-- Canonical audit trail. The pilot also writes its redacted audit log, while
-- this trail keeps the attendance contract available outside pilot provisioning.
CREATE OR REPLACE FUNCTION public.attendance_audit_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  actor_id uuid := auth.uid();
  school_id uuid;
  session_id text;
  record_id text;
  old_values jsonb;
  new_values jsonb;
  criticality text := 'normal';
BEGIN
  IF actor_id IS NULL THEN
    RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
  END IF;

  old_values := CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) ELSE NULL END;
  new_values := CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END;

  IF TG_TABLE_NAME = 'sessoes_aula' THEN
    IF TG_OP = 'DELETE' THEN
      school_id := OLD.escola_id;
      session_id := OLD.id::text;
    ELSE
      school_id := NEW.escola_id;
      session_id := NEW.id::text;
    END IF;
    IF TG_OP = 'DELETE' OR (TG_OP <> 'DELETE' AND NEW.status = 'FECHADA') THEN
      criticality := 'critical';
    END IF;
  ELSE
    IF TG_OP = 'DELETE' THEN
      record_id := OLD.id::text;
      session_id := OLD.sessao_id::text;
      SELECT s.escola_id INTO school_id
      FROM public.sessoes_aula AS s
      WHERE s.id = OLD.sessao_id;
      IF school_id IS NULL THEN
        SELECT t.escola_id INTO school_id
        FROM public.matriculas AS m
        JOIN public.turmas AS t ON t.id = m.turma_id
        WHERE m.id = OLD.matricula_id;
      END IF;
    ELSE
      record_id := NEW.id::text;
      session_id := NEW.sessao_id::text;
      SELECT s.escola_id INTO school_id
      FROM public.sessoes_aula AS s
      WHERE s.id = NEW.sessao_id;
      IF school_id IS NULL THEN
        SELECT t.escola_id INTO school_id
        FROM public.matriculas AS m
        JOIN public.turmas AS t ON t.id = m.turma_id
        WHERE m.id = NEW.matricula_id;
      END IF;
    END IF;
  END IF;

  INSERT INTO public.audit_trail (
    tabela, registro_id, operacao, usuario_id, escola_id, sessao_id,
    dados_anteriores, dados_novos, justificativa, nivel_criticidade
  ) VALUES (
    TG_TABLE_NAME,
    coalesce(record_id, session_id, '<unknown>'),
    lower(TG_OP),
    actor_id,
    school_id,
    session_id,
    old_values,
    new_values,
    CASE WHEN TG_TABLE_NAME = 'frequencia' THEN 'attendance canonical flow' ELSE 'attendance session lifecycle' END,
    criticality
  );

  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;

DROP TRIGGER IF EXISTS attendance_audit_session_change ON public.sessoes_aula;
CREATE TRIGGER attendance_audit_session_change
AFTER INSERT OR UPDATE OR DELETE ON public.sessoes_aula
FOR EACH ROW EXECUTE FUNCTION public.attendance_audit_change();

DROP TRIGGER IF EXISTS attendance_audit_frequency_change ON public.frequencia;
CREATE TRIGGER attendance_audit_frequency_change
AFTER INSERT OR UPDATE OR DELETE ON public.frequencia
FOR EACH ROW EXECUTE FUNCTION public.attendance_audit_change();
REVOKE ALL ON FUNCTION public.attendance_audit_change() FROM PUBLIC;

-- The attendance tables are readable by the approved actors. Only professor
-- and director receive write policies. Admin and secretaria remain view-only.
DROP POLICY IF EXISTS attendance_turmas_select ON public.turmas;
CREATE POLICY attendance_turmas_select ON public.turmas
FOR SELECT TO authenticated
USING ((SELECT public.attendance_can_access_class(id)));

DROP POLICY IF EXISTS attendance_matriculas_select ON public.matriculas;
CREATE POLICY attendance_matriculas_select ON public.matriculas
FOR SELECT TO authenticated
USING ((SELECT public.attendance_can_access_class(turma_id)));

DROP POLICY IF EXISTS admin_full_access ON public.sessoes_aula;
DROP POLICY IF EXISTS admin_full_access ON public.frequencia;
DROP POLICY IF EXISTS academic_manage_sessoes ON public.sessoes_aula;
DROP POLICY IF EXISTS academic_manage_frequencia ON public.frequencia;
DROP POLICY IF EXISTS attendance_sessoes_select ON public.sessoes_aula;
DROP POLICY IF EXISTS attendance_sessoes_insert ON public.sessoes_aula;
DROP POLICY IF EXISTS attendance_sessoes_update ON public.sessoes_aula;
DROP POLICY IF EXISTS attendance_frequencia_select ON public.frequencia;
DROP POLICY IF EXISTS attendance_frequencia_insert ON public.frequencia;
DROP POLICY IF EXISTS attendance_frequencia_update ON public.frequencia;

CREATE POLICY attendance_sessoes_select ON public.sessoes_aula
FOR SELECT TO authenticated
USING ((SELECT public.attendance_can_access_class(turma_id)));

CREATE POLICY attendance_sessoes_insert ON public.sessoes_aula
FOR INSERT TO authenticated
WITH CHECK (
  status IN ('PLANEJADA', 'ABERTA')
  AND escola_id = (
    SELECT t.escola_id FROM public.turmas AS t WHERE t.id = sessoes_aula.turma_id
  )
  AND professor_id = (
    SELECT t.professor_id FROM public.turmas AS t WHERE t.id = sessoes_aula.turma_id
  )
  AND (
    (
      (SELECT public.attendance_current_role()) = 'professor'
      AND professor_id = (SELECT auth.uid())
      AND (SELECT public.attendance_can_access_class(turma_id))
    )
    OR (
      (SELECT public.attendance_current_role()) = 'diretor'
      AND escola_id = (SELECT public.attendance_current_school_id())
      AND (SELECT public.attendance_can_access_class(turma_id))
    )
  )
);

CREATE POLICY attendance_sessoes_update ON public.sessoes_aula
FOR UPDATE TO authenticated
USING (
  (SELECT public.attendance_can_access_class(turma_id))
  AND (
    (
      (SELECT public.attendance_current_role()) = 'professor'
      AND professor_id = (SELECT auth.uid())
    )
    OR (
      (SELECT public.attendance_current_role()) = 'diretor'
      AND escola_id = (SELECT public.attendance_current_school_id())
    )
  )
)
WITH CHECK (
  escola_id = (
    SELECT t.escola_id FROM public.turmas AS t WHERE t.id = sessoes_aula.turma_id
  )
  AND professor_id = (
    SELECT t.professor_id FROM public.turmas AS t WHERE t.id = sessoes_aula.turma_id
  )
  AND (SELECT public.attendance_current_role()) IN ('professor', 'diretor')
  AND (SELECT public.attendance_can_access_class(turma_id))
);

CREATE POLICY attendance_frequencia_select ON public.frequencia
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.matriculas AS m
    WHERE m.id = frequencia.matricula_id
      AND (SELECT public.attendance_can_access_class(m.turma_id))
  )
);

CREATE POLICY attendance_frequencia_insert ON public.frequencia
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.matriculas AS m
    JOIN public.turmas AS t ON t.id = m.turma_id
    JOIN public.sessoes_aula AS s ON s.id = frequencia.sessao_id
    WHERE m.id = frequencia.matricula_id
      AND s.turma_id = m.turma_id
      AND s.status = 'ABERTA'
      AND s.professor_id = frequencia.professor_id
      AND frequencia.marcado_por = (SELECT auth.uid())
      AND (
        (
          (SELECT public.attendance_current_role()) = 'professor'
          AND t.professor_id = (SELECT auth.uid())
          AND s.professor_id = (SELECT auth.uid())
        )
        OR (
          (SELECT public.attendance_current_role()) = 'diretor'
          AND s.escola_id = (SELECT public.attendance_current_school_id())
        )
      )
  )
);

CREATE POLICY attendance_frequencia_update ON public.frequencia
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.matriculas AS m
    JOIN public.turmas AS t ON t.id = m.turma_id
    JOIN public.sessoes_aula AS s ON s.id = frequencia.sessao_id
    WHERE m.id = frequencia.matricula_id
      AND s.turma_id = m.turma_id
      AND (SELECT public.attendance_can_access_class(m.turma_id))
      AND (
        (
          (SELECT public.attendance_current_role()) = 'professor'
          AND t.professor_id = (SELECT auth.uid())
          AND s.professor_id = (SELECT auth.uid())
        )
        OR (
          (SELECT public.attendance_current_role()) = 'diretor'
          AND s.escola_id = (SELECT public.attendance_current_school_id())
        )
      )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.matriculas AS m
    JOIN public.turmas AS t ON t.id = m.turma_id
    JOIN public.sessoes_aula AS s ON s.id = frequencia.sessao_id
    WHERE m.id = frequencia.matricula_id
      AND s.turma_id = m.turma_id
      AND s.status = 'ABERTA'
      AND s.professor_id = frequencia.professor_id
      AND frequencia.marcado_por = (SELECT auth.uid())
      AND (
        (
          (SELECT public.attendance_current_role()) = 'professor'
          AND t.professor_id = (SELECT auth.uid())
          AND s.professor_id = (SELECT auth.uid())
        )
        OR (
          (SELECT public.attendance_current_role()) = 'diretor'
          AND s.escola_id = (SELECT public.attendance_current_school_id())
        )
      )
  )
);

REVOKE DELETE ON public.sessoes_aula, public.frequencia FROM authenticated;
GRANT SELECT, INSERT, UPDATE ON public.sessoes_aula, public.frequencia TO authenticated;

COMMIT;
