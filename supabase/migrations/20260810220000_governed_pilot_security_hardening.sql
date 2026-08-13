-- Bounded security hardening for the governed synthetic pilot.
--
-- This migration runs after the legacy role policies, the canonical attendance
-- policies, the governed import contract, and the conditionality read model.
-- It removes policy overlap instead of relying on policy order: RLS policies
-- are OR-ed by PostgreSQL, so one permissive legacy policy defeats a stricter
-- replacement.

BEGIN;

-- -----------------------------------------------------------------------------
-- Authorization helpers and legacy policy removal
-- -----------------------------------------------------------------------------
-- The governed pilot has three browser roles. Secretariat is read-only;
-- directors write only in their school; teachers write only in the titular
-- class. Service role remains the operational write path for import and cleanup.
CREATE OR REPLACE FUNCTION public.pilot_can_manage_school(target_school_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT public.pilot_current_role() = 'diretor'
    AND target_school_id = public.pilot_current_school_id();
$$;

REVOKE ALL ON FUNCTION public.pilot_can_manage_school(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.pilot_can_manage_school(uuid) TO authenticated;

-- Keep the import batch ownership trigger hardened when the older import
-- migration is replayed by an isolated database test.
CREATE OR REPLACE FUNCTION public.pilot_block_import_batch_reassignment()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog
AS $$
BEGIN
  IF OLD.pilot_import_batch_id IS DISTINCT FROM NEW.pilot_import_batch_id THEN
    RAISE EXCEPTION 'PILOT_IMPORT_BATCH_IMMUTABLE: canonical row batch ownership cannot change';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.pilot_block_import_batch_reassignment() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.pilot_block_import_batch_reassignment() TO service_role;

-- These helpers encode the obsolete same-school write path. They remain in the
-- schema for migration compatibility but are not callable by browser roles.
REVOKE ALL ON FUNCTION public.current_user_role() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.current_user_school_id() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.has_any_role(text[]) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.can_access_school(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.can_access_class(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.can_access_enrollment(uuid) FROM PUBLIC, anon, authenticated;

DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'escolas', 'users', 'alunos', 'responsaveis', 'aluno_responsaveis',
    'turmas', 'matriculas', 'disciplinas', 'frequencia', 'notas',
    'sessoes_aula', 'aulas_abertas', 'calendario_escolar', 'configs',
    'relatorios_descritivos', 'feature_flags', 'escola_feature_flags'
  ] LOOP
    EXECUTE format('DROP POLICY IF EXISTS admin_full_access ON public.%I', table_name);
  END LOOP;
END;
$$;

DROP POLICY IF EXISTS escolas_select_authenticated ON public.escolas;
DROP POLICY IF EXISTS users_select_same_escola ON public.users;
DROP POLICY IF EXISTS turmas_select_escola ON public.turmas;
DROP POLICY IF EXISTS alunos_select_via_matricula ON public.alunos;
DROP POLICY IF EXISTS matriculas_select_escola ON public.matriculas;
DROP POLICY IF EXISTS frequencia_select_escola ON public.frequencia;
DROP POLICY IF EXISTS sessoes_aula_select_escola ON public.sessoes_aula;
DROP POLICY IF EXISTS audit_logs_admin_only ON public.audit_logs;

DROP POLICY IF EXISTS users_select_authorized ON public.users;
DROP POLICY IF EXISTS escolas_select_authenticated ON public.escolas;
DROP POLICY IF EXISTS turmas_select_authorized ON public.turmas;
DROP POLICY IF EXISTS alunos_select_authorized ON public.alunos;
DROP POLICY IF EXISTS matriculas_select_authorized ON public.matriculas;
DROP POLICY IF EXISTS responsaveis_select_authorized ON public.responsaveis;
DROP POLICY IF EXISTS aluno_responsaveis_select_authorized ON public.aluno_responsaveis;
DROP POLICY IF EXISTS disciplinas_select_authorized ON public.disciplinas;
DROP POLICY IF EXISTS frequencia_select_authorized ON public.frequencia;
DROP POLICY IF EXISTS notas_select_authorized ON public.notas;
DROP POLICY IF EXISTS sessoes_aula_select_authorized ON public.sessoes_aula;
DROP POLICY IF EXISTS aulas_abertas_select_authorized ON public.aulas_abertas;
DROP POLICY IF EXISTS calendario_select_authorized ON public.calendario_escolar;
DROP POLICY IF EXISTS configs_select_authorized ON public.configs;
DROP POLICY IF EXISTS school_staff_manage_alunos ON public.alunos;
DROP POLICY IF EXISTS school_staff_manage_responsaveis ON public.responsaveis;
DROP POLICY IF EXISTS school_staff_manage_links ON public.aluno_responsaveis;
DROP POLICY IF EXISTS school_staff_manage_turmas ON public.turmas;
DROP POLICY IF EXISTS school_staff_manage_matriculas ON public.matriculas;
DROP POLICY IF EXISTS academic_manage_frequencia ON public.frequencia;
DROP POLICY IF EXISTS academic_manage_notas ON public.notas;
DROP POLICY IF EXISTS academic_manage_sessoes ON public.sessoes_aula;
DROP POLICY IF EXISTS conteudo_aula_select_authorized ON public.conteudo_aula;
DROP POLICY IF EXISTS conteudo_aula_manage_authorized ON public.conteudo_aula;
DROP POLICY IF EXISTS conteudo_aula_admin ON public.conteudo_aula;

DROP POLICY IF EXISTS attendance_turmas_select ON public.turmas;
DROP POLICY IF EXISTS attendance_matriculas_select ON public.matriculas;
DROP POLICY IF EXISTS attendance_sessoes_select ON public.sessoes_aula;
DROP POLICY IF EXISTS attendance_sessoes_insert ON public.sessoes_aula;
DROP POLICY IF EXISTS attendance_sessoes_update ON public.sessoes_aula;
DROP POLICY IF EXISTS attendance_frequencia_select ON public.frequencia;
DROP POLICY IF EXISTS attendance_frequencia_insert ON public.frequencia;
DROP POLICY IF EXISTS attendance_frequencia_update ON public.frequencia;

DROP POLICY IF EXISTS pilot_escolas_select ON public.escolas;
DROP POLICY IF EXISTS pilot_escolas_insert ON public.escolas;
DROP POLICY IF EXISTS pilot_escolas_update ON public.escolas;
DROP POLICY IF EXISTS pilot_users_select ON public.users;
DROP POLICY IF EXISTS pilot_turmas_select ON public.turmas;
DROP POLICY IF EXISTS pilot_turmas_insert ON public.turmas;
DROP POLICY IF EXISTS pilot_turmas_update ON public.turmas;
DROP POLICY IF EXISTS pilot_alunos_select ON public.alunos;
DROP POLICY IF EXISTS pilot_alunos_insert ON public.alunos;
DROP POLICY IF EXISTS pilot_alunos_update ON public.alunos;
DROP POLICY IF EXISTS pilot_responsaveis_select ON public.responsaveis;
DROP POLICY IF EXISTS pilot_responsaveis_insert ON public.responsaveis;
DROP POLICY IF EXISTS pilot_responsaveis_update ON public.responsaveis;
DROP POLICY IF EXISTS pilot_aluno_responsaveis_select ON public.aluno_responsaveis;
DROP POLICY IF EXISTS pilot_aluno_responsaveis_insert ON public.aluno_responsaveis;
DROP POLICY IF EXISTS pilot_aluno_responsaveis_update ON public.aluno_responsaveis;
DROP POLICY IF EXISTS pilot_matriculas_select ON public.matriculas;
DROP POLICY IF EXISTS pilot_matriculas_insert ON public.matriculas;
DROP POLICY IF EXISTS pilot_matriculas_update ON public.matriculas;
DROP POLICY IF EXISTS pilot_aulas_abertas_select ON public.aulas_abertas;
DROP POLICY IF EXISTS pilot_aulas_abertas_insert ON public.aulas_abertas;
DROP POLICY IF EXISTS pilot_aulas_abertas_update ON public.aulas_abertas;
DROP POLICY IF EXISTS pilot_sessoes_select ON public.sessoes_aula;
DROP POLICY IF EXISTS pilot_sessoes_insert ON public.sessoes_aula;
DROP POLICY IF EXISTS pilot_sessoes_update ON public.sessoes_aula;
DROP POLICY IF EXISTS pilot_frequencia_select ON public.frequencia;
DROP POLICY IF EXISTS pilot_frequencia_insert ON public.frequencia;
DROP POLICY IF EXISTS pilot_frequencia_update ON public.frequencia;
DROP POLICY IF EXISTS pilot_disciplinas_select ON public.disciplinas;
DROP POLICY IF EXISTS pilot_configs_select ON public.configs;
DROP POLICY IF EXISTS governed_conteudo_aula_select ON public.conteudo_aula;
DROP POLICY IF EXISTS governed_conteudo_aula_insert ON public.conteudo_aula;
DROP POLICY IF EXISTS governed_conteudo_aula_update ON public.conteudo_aula;
DROP POLICY IF EXISTS governed_relatorios_descritivos_select ON public.relatorios_descritivos;
DROP POLICY IF EXISTS governed_relatorios_descritivos_insert ON public.relatorios_descritivos;
DROP POLICY IF EXISTS governed_relatorios_descritivos_update ON public.relatorios_descritivos;

DROP POLICY IF EXISTS "Authenticated users can read active flags" ON public.feature_flags;
DROP POLICY IF EXISTS "Admin can manage flags" ON public.feature_flags;
DROP POLICY IF EXISTS "Users can read own escola flags" ON public.escola_feature_flags;
DROP POLICY IF EXISTS "Admin can manage escola flags" ON public.escola_feature_flags;
DROP POLICY IF EXISTS "Professors can manage reports for their turmas" ON public.relatorios_descritivos;
DROP POLICY IF EXISTS "Directors can view reports from their escola" ON public.relatorios_descritivos;
DROP POLICY IF EXISTS "Admin can view all reports" ON public.relatorios_descritivos;
DROP POLICY IF EXISTS attendance_municipal_thresholds_select ON public.attendance_municipal_thresholds;
DROP POLICY IF EXISTS attendance_municipal_thresholds_insert ON public.attendance_municipal_thresholds;

-- -----------------------------------------------------------------------------
-- Final pilot RLS policy set
-- -----------------------------------------------------------------------------
CREATE POLICY pilot_escolas_select ON public.escolas
FOR SELECT TO authenticated
USING (ativo = true AND public.pilot_can_access_school(id));

CREATE POLICY pilot_users_select ON public.users
FOR SELECT TO authenticated
USING (id = auth.uid() OR public.pilot_is_secretariat() OR public.pilot_can_access_school(escola_id));

CREATE POLICY pilot_turmas_select ON public.turmas
FOR SELECT TO authenticated
USING (
  public.pilot_can_access_school(escola_id)
  AND (
    public.pilot_current_role() <> 'professor'
    OR professor_id = auth.uid()
  )
);
CREATE POLICY pilot_turmas_insert ON public.turmas
FOR INSERT TO authenticated
WITH CHECK (public.pilot_can_manage_school(escola_id));
CREATE POLICY pilot_turmas_update ON public.turmas
FOR UPDATE TO authenticated
USING (public.pilot_can_manage_school(escola_id))
WITH CHECK (public.pilot_can_manage_school(escola_id));

CREATE POLICY pilot_alunos_select ON public.alunos
FOR SELECT TO authenticated
USING (public.pilot_can_access_school(escola_id));
CREATE POLICY pilot_alunos_insert ON public.alunos
FOR INSERT TO authenticated
WITH CHECK (public.pilot_can_manage_school(escola_id));
CREATE POLICY pilot_alunos_update ON public.alunos
FOR UPDATE TO authenticated
USING (public.pilot_can_manage_school(escola_id))
WITH CHECK (public.pilot_can_manage_school(escola_id));

CREATE POLICY pilot_responsaveis_select ON public.responsaveis
FOR SELECT TO authenticated
USING (public.pilot_can_access_school(escola_id));
CREATE POLICY pilot_responsaveis_insert ON public.responsaveis
FOR INSERT TO authenticated
WITH CHECK (public.pilot_can_manage_school(escola_id));
CREATE POLICY pilot_responsaveis_update ON public.responsaveis
FOR UPDATE TO authenticated
USING (public.pilot_can_manage_school(escola_id))
WITH CHECK (public.pilot_can_manage_school(escola_id));

CREATE POLICY pilot_aluno_responsaveis_select ON public.aluno_responsaveis
FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1
  FROM public.alunos AS student
  WHERE student.id = aluno_id
    AND public.pilot_can_access_school(student.escola_id)
));
CREATE POLICY pilot_aluno_responsaveis_insert ON public.aluno_responsaveis
FOR INSERT TO authenticated
WITH CHECK (EXISTS (
  SELECT 1
  FROM public.alunos AS student
  WHERE student.id = aluno_id
    AND public.pilot_can_manage_school(student.escola_id)
));
CREATE POLICY pilot_aluno_responsaveis_update ON public.aluno_responsaveis
FOR UPDATE TO authenticated
USING (EXISTS (
  SELECT 1
  FROM public.alunos AS student
  WHERE student.id = aluno_id
    AND public.pilot_can_manage_school(student.escola_id)
))
WITH CHECK (EXISTS (
  SELECT 1
  FROM public.alunos AS student
  WHERE student.id = aluno_id
    AND public.pilot_can_manage_school(student.escola_id)
));

CREATE POLICY pilot_matriculas_select ON public.matriculas
FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1
  FROM public.turmas AS class
  WHERE class.id = turma_id
    AND public.pilot_can_access_school(class.escola_id)
    AND (
      public.pilot_current_role() <> 'professor'
      OR class.professor_id = auth.uid()
    )
));
CREATE POLICY pilot_matriculas_insert ON public.matriculas
FOR INSERT TO authenticated
WITH CHECK (public.pilot_can_insert_matricula(aluno_id, turma_id));
CREATE POLICY pilot_matriculas_update ON public.matriculas
FOR UPDATE TO authenticated
USING (EXISTS (
  SELECT 1
  FROM public.turmas AS class
  WHERE class.id = turma_id
    AND public.pilot_can_manage_school(class.escola_id)
))
WITH CHECK (EXISTS (
  SELECT 1
  FROM public.turmas AS class
  WHERE class.id = turma_id
    AND public.pilot_can_manage_school(class.escola_id)
));

CREATE POLICY pilot_aulas_abertas_select ON public.aulas_abertas
FOR SELECT TO authenticated
USING (
  public.pilot_can_access_school(escola_id)
  AND (
    public.pilot_current_role() <> 'professor'
    OR public.pilot_teacher_owns_class(turma_id)
  )
);
CREATE POLICY pilot_aulas_abertas_insert ON public.aulas_abertas
FOR INSERT TO authenticated
WITH CHECK (
  (
    public.pilot_current_role() = 'diretor'
    AND public.pilot_can_manage_school(escola_id)
  )
  OR (
    public.pilot_current_role() = 'professor'
    AND professor_id = auth.uid()
    AND escola_id = public.pilot_current_school_id()
    AND public.pilot_teacher_owns_class(turma_id)
  )
);
CREATE POLICY pilot_aulas_abertas_update ON public.aulas_abertas
FOR UPDATE TO authenticated
USING (
  (
    public.pilot_current_role() = 'diretor'
    AND public.pilot_can_manage_school(escola_id)
  )
  OR (
    public.pilot_current_role() = 'professor'
    AND professor_id = auth.uid()
    AND public.pilot_teacher_owns_class(turma_id)
  )
)
WITH CHECK (
  (
    public.pilot_current_role() = 'diretor'
    AND public.pilot_can_manage_school(escola_id)
  )
  OR (
    public.pilot_current_role() = 'professor'
    AND professor_id = auth.uid()
    AND escola_id = public.pilot_current_school_id()
    AND public.pilot_teacher_owns_class(turma_id)
  )
);

CREATE POLICY pilot_sessoes_select ON public.sessoes_aula
FOR SELECT TO authenticated
USING (
  public.pilot_can_access_school(escola_id)
  AND (
    public.pilot_current_role() <> 'professor'
    OR public.pilot_teacher_owns_class(turma_id)
  )
);
CREATE POLICY pilot_sessoes_insert ON public.sessoes_aula
FOR INSERT TO authenticated
WITH CHECK (
  status IN ('PLANEJADA', 'ABERTA')
  AND EXISTS (
    SELECT 1
    FROM public.turmas AS class
    WHERE class.id = turma_id
      AND class.escola_id = sessoes_aula.escola_id
      AND class.professor_id = sessoes_aula.professor_id
      AND (
        (
          public.pilot_current_role() = 'professor'
          AND class.professor_id = auth.uid()
          AND public.pilot_teacher_owns_class(class.id)
        )
        OR (
          public.pilot_current_role() = 'diretor'
          AND public.pilot_can_manage_school(class.escola_id)
        )
      )
  )
);
CREATE POLICY pilot_sessoes_update ON public.sessoes_aula
FOR UPDATE TO authenticated
USING (
  (
    public.pilot_current_role() = 'professor'
    AND professor_id = auth.uid()
    AND public.pilot_teacher_owns_class(turma_id)
  )
  OR (
    public.pilot_current_role() = 'diretor'
    AND public.pilot_can_manage_school(escola_id)
  )
)
WITH CHECK (
  status IN ('PLANEJADA', 'ABERTA', 'FECHADA', 'CANCELADA')
  AND EXISTS (
    SELECT 1
    FROM public.turmas AS class
    WHERE class.id = turma_id
      AND class.escola_id = sessoes_aula.escola_id
      AND class.professor_id = sessoes_aula.professor_id
      AND (
        (
          public.pilot_current_role() = 'professor'
          AND class.professor_id = auth.uid()
          AND public.pilot_teacher_owns_class(class.id)
        )
        OR (
          public.pilot_current_role() = 'diretor'
          AND public.pilot_can_manage_school(class.escola_id)
        )
      )
  )
);

CREATE POLICY pilot_frequencia_select ON public.frequencia
FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1
  FROM public.matriculas AS enrollment
  JOIN public.turmas AS class ON class.id = enrollment.turma_id
  WHERE enrollment.id = matricula_id
    AND public.pilot_can_access_school(class.escola_id)
    AND (
      public.pilot_current_role() <> 'professor'
      OR class.professor_id = auth.uid()
    )
));
CREATE POLICY pilot_frequencia_insert ON public.frequencia
FOR INSERT TO authenticated
WITH CHECK (EXISTS (
  SELECT 1
  FROM public.matriculas AS enrollment
  JOIN public.turmas AS class ON class.id = enrollment.turma_id
  JOIN public.sessoes_aula AS session ON session.id = frequencia.sessao_id
  WHERE enrollment.id = matricula_id
    AND session.turma_id = class.id
    AND session.status = 'ABERTA'
    AND session.professor_id = frequencia.professor_id
    AND frequencia.marcado_por = auth.uid()
    AND (
      (
        public.pilot_current_role() = 'professor'
        AND session.professor_id = auth.uid()
        AND public.pilot_teacher_owns_class(class.id)
      )
      OR (
        public.pilot_current_role() = 'diretor'
        AND public.pilot_can_manage_school(class.escola_id)
      )
    )
));
CREATE POLICY pilot_frequencia_update ON public.frequencia
FOR UPDATE TO authenticated
USING (EXISTS (
  SELECT 1
  FROM public.matriculas AS enrollment
  JOIN public.turmas AS class ON class.id = enrollment.turma_id
  JOIN public.sessoes_aula AS session ON session.id = frequencia.sessao_id
  WHERE enrollment.id = matricula_id
    AND session.turma_id = class.id
    AND (
      (
        public.pilot_current_role() = 'professor'
        AND session.professor_id = auth.uid()
        AND public.pilot_teacher_owns_class(class.id)
      )
      OR (
        public.pilot_current_role() = 'diretor'
        AND public.pilot_can_manage_school(class.escola_id)
      )
    )
))
WITH CHECK (EXISTS (
  SELECT 1
  FROM public.matriculas AS enrollment
  JOIN public.turmas AS class ON class.id = enrollment.turma_id
  JOIN public.sessoes_aula AS session ON session.id = frequencia.sessao_id
  WHERE enrollment.id = matricula_id
    AND session.turma_id = class.id
    AND session.status = 'ABERTA'
    AND session.professor_id = frequencia.professor_id
    AND frequencia.marcado_por = auth.uid()
    AND (
      (
        public.pilot_current_role() = 'professor'
        AND session.professor_id = auth.uid()
        AND public.pilot_teacher_owns_class(class.id)
      )
      OR (
        public.pilot_current_role() = 'diretor'
        AND public.pilot_can_manage_school(class.escola_id)
      )
    )
));

CREATE POLICY pilot_disciplinas_select ON public.disciplinas
FOR SELECT TO authenticated
USING (public.pilot_can_access_school(escola_id));

CREATE POLICY pilot_configs_select ON public.configs
FOR SELECT TO authenticated
USING (escola_id IS NULL OR public.pilot_can_access_school(escola_id));

-- No authenticated school role may create or update schools. The governed
-- service role owns municipality provisioning; browser roles only read schools.

-- -----------------------------------------------------------------------------
-- Diary content: no authenticated DELETE and titular-class writes only
-- -----------------------------------------------------------------------------
CREATE POLICY governed_conteudo_aula_select ON public.conteudo_aula
FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1
  FROM public.sessoes_aula AS session
  JOIN public.turmas AS class ON class.id = session.turma_id
  WHERE session.id = conteudo_aula.sessao_id
    AND public.pilot_can_access_school(class.escola_id)
    AND (
      public.pilot_current_role() <> 'professor'
      OR class.professor_id = auth.uid()
    )
));

CREATE POLICY governed_conteudo_aula_insert ON public.conteudo_aula
FOR INSERT TO authenticated
WITH CHECK (EXISTS (
  SELECT 1
  FROM public.sessoes_aula AS session
  JOIN public.turmas AS class ON class.id = session.turma_id
  WHERE session.id = conteudo_aula.sessao_id
    AND (
      (
        public.pilot_current_role() = 'professor'
        AND class.professor_id = auth.uid()
        AND public.pilot_teacher_owns_class(class.id)
      )
      OR (
        public.pilot_current_role() = 'diretor'
        AND public.pilot_can_manage_school(class.escola_id)
      )
    )
));

CREATE POLICY governed_conteudo_aula_update ON public.conteudo_aula
FOR UPDATE TO authenticated
USING (EXISTS (
  SELECT 1
  FROM public.sessoes_aula AS session
  JOIN public.turmas AS class ON class.id = session.turma_id
  WHERE session.id = conteudo_aula.sessao_id
    AND (
      (
        public.pilot_current_role() = 'professor'
        AND class.professor_id = auth.uid()
        AND public.pilot_teacher_owns_class(class.id)
      )
      OR (
        public.pilot_current_role() = 'diretor'
        AND public.pilot_can_manage_school(class.escola_id)
      )
    )
))
WITH CHECK (EXISTS (
  SELECT 1
  FROM public.sessoes_aula AS session
  JOIN public.turmas AS class ON class.id = session.turma_id
  WHERE session.id = conteudo_aula.sessao_id
    AND (
      (
        public.pilot_current_role() = 'professor'
        AND class.professor_id = auth.uid()
        AND public.pilot_teacher_owns_class(class.id)
      )
      OR (
        public.pilot_current_role() = 'diretor'
        AND public.pilot_can_manage_school(class.escola_id)
      )
    )
));

-- -----------------------------------------------------------------------------
-- Governed descriptive reports: bounded release after the database gate
-- -----------------------------------------------------------------------------
CREATE POLICY governed_relatorios_descritivos_select ON public.relatorios_descritivos
FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1
  FROM public.turmas AS class
  WHERE class.id = relatorios_descritivos.turma_id
    AND public.pilot_can_access_school(class.escola_id)
    AND (
      public.pilot_current_role() <> 'professor'
      OR class.professor_id = auth.uid()
    )
));

CREATE POLICY governed_relatorios_descritivos_insert ON public.relatorios_descritivos
FOR INSERT TO authenticated
WITH CHECK (
  public.pilot_current_role() = 'professor'
  AND professor_id = auth.uid()
  AND created_by = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.turmas AS class
    JOIN public.matriculas AS enrollment ON enrollment.turma_id = class.id
    WHERE class.id = relatorios_descritivos.turma_id
      AND enrollment.id = relatorios_descritivos.matricula_id
      AND class.professor_id = auth.uid()
      AND public.pilot_teacher_owns_class(class.id)
  )
);

CREATE POLICY governed_relatorios_descritivos_update ON public.relatorios_descritivos
FOR UPDATE TO authenticated
USING (
  public.pilot_current_role() = 'professor'
  AND professor_id = auth.uid()
  AND public.pilot_teacher_owns_class(turma_id)
)
WITH CHECK (
  public.pilot_current_role() = 'professor'
  AND professor_id = auth.uid()
  AND public.pilot_teacher_owns_class(turma_id)
);

-- -----------------------------------------------------------------------------
-- Consent boundary: director owns the school opt-in registry; no DELETE
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS whatsapp_optins_select ON public.whatsapp_notification_optins;
DROP POLICY IF EXISTS whatsapp_optins_insert ON public.whatsapp_notification_optins;
DROP POLICY IF EXISTS whatsapp_optins_update ON public.whatsapp_notification_optins;
CREATE POLICY whatsapp_optins_select ON public.whatsapp_notification_optins
FOR SELECT TO authenticated
USING (public.pilot_can_access_school(escola_id));
CREATE POLICY whatsapp_optins_insert ON public.whatsapp_notification_optins
FOR INSERT TO authenticated
WITH CHECK (
  public.pilot_can_manage_school(escola_id)
  AND registrado_por = auth.uid()
);
CREATE POLICY whatsapp_optins_update ON public.whatsapp_notification_optins
FOR UPDATE TO authenticated
USING (
  public.pilot_can_manage_school(escola_id)
)
WITH CHECK (
  public.pilot_can_manage_school(escola_id)
  AND registrado_por = auth.uid()
);

DROP POLICY IF EXISTS whatsapp_messages_select ON public.whatsapp_notification_messages;
DROP POLICY IF EXISTS whatsapp_messages_insert ON public.whatsapp_notification_messages;
DROP POLICY IF EXISTS whatsapp_messages_update ON public.whatsapp_notification_messages;
CREATE POLICY whatsapp_messages_select ON public.whatsapp_notification_messages
FOR SELECT TO authenticated
USING (public.pilot_can_access_school(escola_id));
CREATE POLICY whatsapp_messages_insert ON public.whatsapp_notification_messages
FOR INSERT TO authenticated
WITH CHECK (public.pilot_can_manage_school(escola_id));
CREATE POLICY whatsapp_messages_update ON public.whatsapp_notification_messages
FOR UPDATE TO authenticated
USING (public.pilot_can_manage_school(escola_id))
WITH CHECK (public.pilot_can_manage_school(escola_id));

-- Metrics are server-owned events. A director may record only the own-school
-- metric; secretariat and teachers keep the read-only boundary.
CREATE OR REPLACE FUNCTION public.record_pilot_metric_event(
  p_event_name text,
  p_escola_id uuid DEFAULT NULL,
  p_metric_value numeric DEFAULT 1,
  p_dimensions jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  inserted_id uuid;
BEGIN
  IF auth.uid() IS NULL OR public.pilot_current_role() <> 'diretor'
     OR p_escola_id IS NULL
     OR NOT public.pilot_can_manage_school(p_escola_id) THEN
    RAISE EXCEPTION 'PILOT_METRIC_WRITE_DENIED: director own-school scope is required';
  END IF;
  IF p_dimensions ?| ARRAY['student_id', 'student_name', 'cpf', 'nis', 'email', 'phone'] THEN
    RAISE EXCEPTION 'PILOT_METRIC_PII_REJECTED';
  END IF;

  INSERT INTO public.pilot_metric_events(
    escola_id, actor_user_id, event_name, metric_value, dimensions
  )
  VALUES (p_escola_id, auth.uid(), p_event_name, p_metric_value, p_dimensions)
  RETURNING id INTO inserted_id;
  RETURN inserted_id;
END;
$$;
REVOKE ALL ON FUNCTION public.record_pilot_metric_event(text, uuid, numeric, jsonb)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_pilot_metric_event(text, uuid, numeric, jsonb)
  TO authenticated;

-- Municipality margins are read-only to browser roles. Definitions are a
-- service-owned governance operation in this bounded pilot.
CREATE POLICY attendance_municipal_thresholds_select
ON public.attendance_municipal_thresholds
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.escolas AS school
    WHERE school.municipio_id = attendance_municipal_thresholds.municipality_id
      AND public.pilot_can_access_school(school.id)
  )
);

-- -----------------------------------------------------------------------------
-- Privileges: RLS is the row boundary, grants are the operation boundary
-- -----------------------------------------------------------------------------
REVOKE ALL ON public.escolas, public.users, public.alunos, public.responsaveis,
  public.aluno_responsaveis, public.turmas, public.matriculas,
  public.disciplinas, public.sessoes_aula, public.aulas_abertas,
  public.frequencia, public.configs, public.conteudo_aula,
  public.relatorios_descritivos FROM authenticated;

GRANT SELECT ON public.escolas, public.users, public.alunos, public.responsaveis,
  public.aluno_responsaveis, public.turmas, public.matriculas,
  public.disciplinas, public.sessoes_aula, public.aulas_abertas,
  public.frequencia, public.configs, public.conteudo_aula,
  public.relatorios_descritivos TO authenticated;
GRANT INSERT, UPDATE ON public.alunos, public.responsaveis,
  public.aluno_responsaveis, public.turmas, public.matriculas,
  public.sessoes_aula, public.aulas_abertas, public.frequencia,
  public.conteudo_aula, public.relatorios_descritivos TO authenticated;
REVOKE DELETE ON public.escolas, public.users, public.alunos, public.responsaveis,
  public.aluno_responsaveis, public.turmas, public.matriculas,
  public.disciplinas, public.sessoes_aula, public.aulas_abertas,
  public.frequencia, public.configs, public.conteudo_aula,
  public.relatorios_descritivos, public.whatsapp_notification_optins,
  public.whatsapp_notification_messages, public.attendance_municipal_thresholds
FROM authenticated;

REVOKE ALL ON public.calendario_escolar, public.feature_flags,
  public.escola_feature_flags FROM authenticated;
REVOKE ALL ON public.notas, public.relatorios_descritivos FROM anon;
GRANT SELECT, INSERT, UPDATE ON public.relatorios_descritivos TO authenticated;
REVOKE DELETE ON public.relatorios_descritivos FROM authenticated;
GRANT SELECT ON public.whatsapp_notification_optins,
  public.whatsapp_notification_messages TO authenticated;
GRANT INSERT, UPDATE ON public.whatsapp_notification_optins,
  public.whatsapp_notification_messages TO authenticated;
GRANT ALL ON public.whatsapp_notification_optins,
  public.whatsapp_notification_messages TO service_role;
GRANT SELECT ON public.attendance_municipal_thresholds TO authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.attendance_municipal_thresholds FROM authenticated;

-- The old view is never part of the governed pilot. The new security-invoker
-- read model and its RPC are the only conditionality boundary.
REVOKE ALL ON public.vw_alunos_risco_bolsa_familia FROM anon, authenticated;
REVOKE ALL ON public.vw_frequencia_condicionalidade FROM anon, authenticated;
GRANT SELECT ON public.vw_frequencia_condicionalidade TO authenticated;
REVOKE ALL ON FUNCTION public.get_attendance_conditionality(date, date, uuid, uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_attendance_conditionality(date, date, uuid, uuid)
  TO authenticated, service_role;

-- -----------------------------------------------------------------------------
-- Reliable append-only audit events
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.pilot_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id uuid REFERENCES public.users(id),
  escola_id uuid REFERENCES public.escolas(id),
  event_type text NOT NULL,
  entity_type text NOT NULL,
  entity_id text,
  redacted_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  correlation_id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (NOT (redacted_metadata ?| ARRAY[
    'cpf', 'nis', 'rg', 'password', 'senha', 'health', 'saude',
    'deficiencia', 'race', 'cor_raca'
  ]))
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.pilot_audit_log'::regclass
      AND conname = 'pilot_audit_metadata_object_check'
  ) THEN
    ALTER TABLE public.pilot_audit_log
      ADD CONSTRAINT pilot_audit_metadata_object_check
      CHECK (jsonb_typeof(redacted_metadata) = 'object');
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS idx_pilot_audit_school_created
  ON public.pilot_audit_log(escola_id, created_at DESC);
ALTER TABLE public.pilot_audit_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS pilot_audit_select ON public.pilot_audit_log;
CREATE POLICY pilot_audit_select ON public.pilot_audit_log
FOR SELECT TO authenticated
USING (
  public.pilot_is_secretariat()
  OR (
    public.pilot_current_role() = 'diretor'
    AND public.pilot_can_access_school(escola_id)
  )
);
REVOKE INSERT, UPDATE, DELETE ON public.pilot_audit_log FROM anon, authenticated;
GRANT SELECT ON public.pilot_audit_log TO authenticated;
GRANT ALL ON public.pilot_audit_log TO service_role;

CREATE OR REPLACE FUNCTION public.pilot_audit_metadata_allowed(
  p_event_type text,
  p_metadata jsonb
)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
SET search_path = pg_catalog
AS $$
  SELECT jsonb_typeof(coalesce($2, '{}'::jsonb)) = 'object'
    AND NOT EXISTS (
      SELECT 1
      FROM jsonb_object_keys(coalesce($2, '{}'::jsonb)) AS metadata_key(key)
      WHERE metadata_key.key <> ALL (
        CASE $1
          WHEN 'demo_action_intercepted' THEN ARRAY[
            'operation', 'outcome', 'effect_suppressed', 'correlation_id'
          ]::text[]
          WHEN 'whatsapp_optin_changed' THEN ARRAY['canal', 'opt_in']::text[]
          WHEN 'import_staged' THEN ARRAY[
            'dataset', 'row_count', 'source_fingerprint_sha256',
            'governance_recorded', 'plaintext_stored'
          ]::text[]
          WHEN 'import_published' THEN ARRAY[
            'dataset', 'row_count', 'canonical_counts',
            'canonical_fingerprint_sha256', 'governance_recorded',
            'plaintext_stored'
          ]::text[]
          WHEN 'user_invited' THEN ARRAY['role']::text[]
          WHEN 'first_access_completed' THEN ARRAY[]::text[]
          ELSE ARRAY[]::text[]
        END
      )
    );
$$;
REVOKE ALL ON FUNCTION public.pilot_audit_metadata_allowed(text, jsonb)
  FROM PUBLIC, anon, authenticated;

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
    'demo_action_intercepted', 'whatsapp_optin_changed', 'import_staged',
    'import_published', 'user_invited', 'first_access_completed'
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

  IF p_event_type = 'first_access_completed' THEN
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

CREATE OR REPLACE FUNCTION public.pilot_block_audit_mutation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog
AS $$
BEGIN
  RAISE EXCEPTION 'PILOT_AUDIT_APPEND_ONLY: audit records cannot be changed or deleted';
END;
$$;
DROP TRIGGER IF EXISTS pilot_audit_append_only ON public.pilot_audit_log;
CREATE TRIGGER pilot_audit_append_only
BEFORE UPDATE OR DELETE ON public.pilot_audit_log
FOR EACH ROW EXECUTE FUNCTION public.pilot_block_audit_mutation();
REVOKE ALL ON FUNCTION public.pilot_block_audit_mutation() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.pilot_audit_core_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  row_data jsonb;
  old_data jsonb;
  school_id uuid;
  record_id text;
BEGIN
  row_data := CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE to_jsonb(NEW) END;
  old_data := CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) ELSE '{}'::jsonb END;
  record_id := row_data->>'id';
  school_id := NULLIF(row_data->>'escola_id', '')::uuid;

  IF school_id IS NULL AND TG_TABLE_NAME = 'matriculas' THEN
    SELECT class.escola_id INTO school_id
    FROM public.turmas AS class
    WHERE class.id = NULLIF(row_data->>'turma_id', '')::uuid;
  ELSIF school_id IS NULL AND TG_TABLE_NAME = 'frequencia' THEN
    SELECT class.escola_id INTO school_id
    FROM public.matriculas AS enrollment
    JOIN public.turmas AS class ON class.id = enrollment.turma_id
    WHERE enrollment.id = NULLIF(row_data->>'matricula_id', '')::uuid;
  ELSIF school_id IS NULL AND TG_TABLE_NAME = 'conteudo_aula' THEN
    SELECT class.escola_id INTO school_id
    FROM public.sessoes_aula AS session
    JOIN public.turmas AS class ON class.id = session.turma_id
    WHERE session.id = NULLIF(row_data->>'sessao_id', '')::uuid;
  ELSIF school_id IS NULL AND TG_TABLE_NAME = 'relatorios_descritivos' THEN
    SELECT class.escola_id INTO school_id
    FROM public.turmas AS class
    WHERE class.id = NULLIF(row_data->>'turma_id', '')::uuid;
  END IF;

  INSERT INTO public.pilot_audit_log(
    actor_user_id, escola_id, event_type, entity_type, entity_id, redacted_metadata
  )
  VALUES (
    auth.uid(), school_id, lower(TG_OP), TG_TABLE_NAME, record_id,
    jsonb_build_object(
      'changed_columns',
      CASE
        WHEN TG_OP = 'UPDATE' THEN (
          SELECT coalesce(jsonb_agg(changed.key), '[]'::jsonb)
          FROM jsonb_each(to_jsonb(NEW)) AS changed(key, value)
          WHERE changed.value IS DISTINCT FROM (old_data -> changed.key)
        )
        ELSE '[]'::jsonb
      END
    )
  );

  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;
REVOKE ALL ON FUNCTION public.pilot_audit_core_change() FROM PUBLIC, anon, authenticated;

DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'escolas', 'users', 'alunos', 'responsaveis', 'aluno_responsaveis',
    'turmas', 'matriculas', 'frequencia', 'sessoes_aula', 'aulas_abertas',
    'conteudo_aula', 'relatorios_descritivos', 'whatsapp_notification_optins',
    'whatsapp_notification_messages'
  ] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS pilot_audit_core_change ON public.%I', table_name);
    EXECUTE format(
      'CREATE TRIGGER pilot_audit_core_change AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.pilot_audit_core_change()',
      table_name
    );
  END LOOP;
END;
$$;

-- -----------------------------------------------------------------------------
-- Service-role-only cleanup and rollback receipts
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.pilot_cleanup_import_staging()
RETURNS integer
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  batch_row record;
  affected integer := 0;
BEGIN
  IF current_user NOT IN ('postgres', 'service_role') THEN
    RAISE EXCEPTION 'PILOT_IMPORT_CLEANUP_ROLE_DENIED: service role is required';
  END IF;

  FOR batch_row IN
    SELECT id, escola_id
    FROM public.pilot_import_batches
    WHERE encrypted_payload IS NOT NULL
      AND (raw_expires_at <= now() OR status IN ('published', 'rejected'))
    FOR UPDATE
  LOOP
    UPDATE public.pilot_import_batches
    SET encrypted_payload = NULL,
        iv = NULL,
        auth_tag = NULL,
        status = CASE WHEN status IN ('published', 'rejected') THEN status ELSE 'cleaned' END,
        cleaned_at = now()
    WHERE id = batch_row.id;

    INSERT INTO public.pilot_audit_log(
      actor_user_id, escola_id, event_type, entity_type, entity_id, redacted_metadata
    )
    VALUES (
      NULL, batch_row.escola_id, 'import_staging_cleaned', 'pilot_import_batch',
      batch_row.id::text,
      jsonb_build_object('reason', 'raw_expired_or_terminal', 'plaintext_stored', false)
    );
    affected := affected + 1;
  END LOOP;

  RETURN affected;
END;
$$;
REVOKE ALL ON FUNCTION public.pilot_cleanup_import_staging() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.pilot_cleanup_import_staging() TO service_role;

-- The later rollback-storage migration extends this function's return row.
-- Drop here so isolated replay can reapply this historical migration safely.
DROP FUNCTION IF EXISTS public.pilot_rollback_import_batch(uuid, uuid, text);

CREATE OR REPLACE FUNCTION public.pilot_rollback_import_batch(
  p_batch_id uuid,
  p_actor_user_id uuid,
  p_reason text
)
RETURNS TABLE(
  batch_id uuid,
  deleted_enrollments integer,
  deleted_relationships integer,
  deleted_students integer,
  deleted_guardians integer,
  final_status text
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  batch_row public.pilot_import_batches%ROWTYPE;
  attendance_count integer;
  shared_guardian_count integer;
  deleted_enrollment_count integer := 0;
  deleted_relationship_count integer := 0;
  deleted_student_count integer := 0;
  deleted_guardian_count integer := 0;
BEGIN
  IF current_user NOT IN ('postgres', 'service_role') THEN
    RAISE EXCEPTION 'PILOT_IMPORT_ROLLBACK_ROLE_DENIED: service role is required';
  END IF;
  IF length(trim(coalesce(p_reason, ''))) < 3 THEN
    RAISE EXCEPTION 'PILOT_IMPORT_ROLLBACK_REASON_REQUIRED: rollback reason is required';
  END IF;

  SELECT * INTO batch_row
  FROM public.pilot_import_batches
  WHERE id = p_batch_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'PILOT_IMPORT_ROLLBACK_BATCH_NOT_FOUND: import batch does not exist';
  END IF;
  IF batch_row.import_target <> 'isolated_proof' THEN
    RAISE EXCEPTION 'PILOT_IMPORT_ROLLBACK_TARGET_DENIED: only isolated proof imports can be discarded';
  END IF;
  IF batch_row.status = 'rolled_back' THEN
    RETURN QUERY SELECT p_batch_id, 0, 0, 0, 0, batch_row.status;
    RETURN;
  END IF;
  IF batch_row.status IN ('rejected', 'cleaned') THEN
    RAISE EXCEPTION 'PILOT_IMPORT_ROLLBACK_STATE_DENIED: batch is not canonical proof data';
  END IF;
  IF (batch_row.rollback_until IS NULL OR now() > batch_row.rollback_until)
    AND NOT (p_reason = 'retention_expired' AND batch_row.canonical_expires_at <= now()) THEN
    RAISE EXCEPTION 'PILOT_IMPORT_ROLLBACK_EXPIRED: rollback window has expired';
  END IF;

  IF p_reason <> 'retention_expired' AND NOT EXISTS (
    SELECT 1
    FROM public.users AS actor
    WHERE actor.id = p_actor_user_id
      AND actor.ativo = true
      AND (
        actor.tipo_usuario IN ('admin', 'secretario')
        OR (
          actor.tipo_usuario = 'diretor'
          AND actor.escola_id = batch_row.escola_id
        )
      )
  ) THEN
    RAISE EXCEPTION 'PILOT_IMPORT_ROLLBACK_ACTOR_REQUIRED: active governance actor is required';
  END IF;

  SELECT count(*) INTO attendance_count
  FROM public.frequencia AS frequency
  JOIN public.matriculas AS enrollment ON enrollment.id = frequency.matricula_id
  WHERE enrollment.pilot_import_batch_id = p_batch_id;
  IF attendance_count > 0 THEN
    RAISE EXCEPTION 'PILOT_IMPORT_ROLLBACK_DEPENDENCY: canonical attendance exists for this batch';
  END IF;

  SELECT count(*) INTO shared_guardian_count
  FROM public.responsaveis AS guardian
  JOIN public.aluno_responsaveis AS relationship
    ON relationship.responsavel_id = guardian.id
  WHERE guardian.pilot_import_batch_id = p_batch_id
    AND relationship.pilot_import_batch_id IS DISTINCT FROM p_batch_id;
  IF shared_guardian_count > 0 THEN
    RAISE EXCEPTION 'PILOT_IMPORT_ROLLBACK_SHARED_GUARDIAN: guardian is linked outside this batch';
  END IF;

  DELETE FROM public.aluno_responsaveis
  WHERE pilot_import_batch_id = p_batch_id;
  GET DIAGNOSTICS deleted_relationship_count = ROW_COUNT;

  DELETE FROM public.matriculas
  WHERE pilot_import_batch_id = p_batch_id;
  GET DIAGNOSTICS deleted_enrollment_count = ROW_COUNT;

  DELETE FROM public.alunos
  WHERE pilot_import_batch_id = p_batch_id;
  GET DIAGNOSTICS deleted_student_count = ROW_COUNT;

  DELETE FROM public.responsaveis AS guardian
  WHERE guardian.pilot_import_batch_id = p_batch_id
    AND NOT EXISTS (
      SELECT 1
      FROM public.aluno_responsaveis AS relationship
      WHERE relationship.responsavel_id = guardian.id
    );
  GET DIAGNOSTICS deleted_guardian_count = ROW_COUNT;

  UPDATE public.pilot_import_batches
  SET status = 'rolled_back',
      encrypted_payload = NULL,
      iv = NULL,
      auth_tag = NULL,
      cleaned_at = coalesce(cleaned_at, now()),
      rolled_back_at = now(),
      rolled_back_by = p_actor_user_id,
      rollback_reason = trim(p_reason)
  WHERE id = p_batch_id;

  INSERT INTO public.pilot_data_tombstones(
    entity_type, source_fingerprint, reason_code, created_by
  )
  VALUES (
    'pilot_import_batch', batch_row.content_sha256,
    'pilot_import_rollback', p_actor_user_id
  )
  ON CONFLICT (entity_type, source_fingerprint) DO NOTHING;

  INSERT INTO public.pilot_audit_log(
    actor_user_id, escola_id, event_type, entity_type, entity_id, redacted_metadata
  )
  VALUES (
    p_actor_user_id, batch_row.escola_id, 'import_rolled_back',
    'pilot_import_batch', p_batch_id::text,
    jsonb_build_object(
      'target', batch_row.import_target,
      'deleted_enrollments', deleted_enrollment_count,
      'deleted_relationships', deleted_relationship_count,
      'deleted_students', deleted_student_count,
      'deleted_guardians', deleted_guardian_count,
      'reason_recorded', true
    )
  );

  RETURN QUERY SELECT
    p_batch_id,
    deleted_enrollment_count,
    deleted_relationship_count,
    deleted_student_count,
    deleted_guardian_count,
    'rolled_back'::text;
END;
$$;
REVOKE ALL ON FUNCTION public.pilot_rollback_import_batch(uuid, uuid, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.pilot_rollback_import_batch(uuid, uuid, text)
  TO service_role;

CREATE OR REPLACE FUNCTION public.pilot_cleanup_import_retention()
RETURNS integer
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  batch_row record;
  expired_batch record;
  affected integer := 0;
BEGIN
  IF current_user NOT IN ('postgres', 'service_role') THEN
    RAISE EXCEPTION 'PILOT_IMPORT_RETENTION_ROLE_DENIED: service role is required';
  END IF;

  FOR batch_row IN
    SELECT id, escola_id
    FROM public.pilot_import_batches
    WHERE encrypted_payload IS NOT NULL
      AND raw_expires_at <= now()
    FOR UPDATE
  LOOP
    UPDATE public.pilot_import_batches
    SET encrypted_payload = NULL,
        iv = NULL,
        auth_tag = NULL,
        status = CASE
          WHEN import_target = 'isolated_proof' OR status IN ('published', 'rejected')
            THEN status
          ELSE 'cleaned'
        END,
        cleaned_at = coalesce(cleaned_at, now())
    WHERE id = batch_row.id;

    INSERT INTO public.pilot_audit_log(
      actor_user_id, escola_id, event_type, entity_type, entity_id, redacted_metadata
    )
    VALUES (
      NULL, batch_row.escola_id, 'import_payload_cleaned',
      'pilot_import_batch', batch_row.id::text,
      jsonb_build_object('reason', 'raw_payload_expired', 'plaintext_stored', false)
    );
    affected := affected + 1;
  END LOOP;

  FOR expired_batch IN
    SELECT id, coalesce(approved_by, submitted_by) AS actor_user_id
    FROM public.pilot_import_batches
    WHERE import_target = 'isolated_proof'
      AND status IN ('approved', 'published')
      AND canonical_expires_at IS NOT NULL
      AND canonical_expires_at <= now()
  LOOP
    PERFORM public.pilot_rollback_import_batch(
      expired_batch.id,
      expired_batch.actor_user_id,
      'retention_expired'
    );
    affected := affected + 1;
  END LOOP;

  RETURN affected;
END;
$$;
REVOKE ALL ON FUNCTION public.pilot_cleanup_import_retention()
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.pilot_cleanup_import_retention() TO service_role;

COMMIT;
