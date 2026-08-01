-- Synthetic-only technical foundation for the EDUCA municipal pilot.
-- This migration is deliberately non-production: real data and external deployment remain blocked.

-- -----------------------------------------------------------------------------
-- Dedicated municipality and governance configuration
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pilot_municipality_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  municipality_slug text NOT NULL UNIQUE,
  deployment_model text NOT NULL DEFAULT 'dedicated_supabase_project'
    CHECK (deployment_model = 'dedicated_supabase_project'),
  primary_region text NOT NULL DEFAULT 'sa-east-1' CHECK (primary_region = 'sa-east-1'),
  data_classification text NOT NULL DEFAULT 'synthetic_only' CHECK (data_classification = 'synthetic_only'),
  external_deploy_allowed boolean NOT NULL DEFAULT false CHECK (external_deploy_allowed = false),
  legal_approval_status text NOT NULL DEFAULT 'not_approved' CHECK (legal_approval_status = 'not_approved'),
  controller_name text,
  operator_name text NOT NULL DEFAULT 'EDUCA',
  processors jsonb NOT NULL DEFAULT '[{"name":"Supabase","status":"pending_contract"},{"name":"Vercel","status":"pending_contract"}]'::jsonb,
  dpa_status text NOT NULL DEFAULT 'pending' CHECK (dpa_status IN ('pending', 'approved_by_municipality')),
  ripd_status text NOT NULL DEFAULT 'pending' CHECK (ripd_status IN ('pending', 'approved_by_municipality')),
  ttd_status text NOT NULL DEFAULT 'pending' CHECK (ttd_status IN ('pending', 'provided_by_municipality')),
  cpad_or_archive_authority text,
  rights_request_channel text,
  incident_contact text,
  support_critical_channel text NOT NULL DEFAULT 'whatsapp',
  support_critical_response_business_hours integer NOT NULL DEFAULT 4 CHECK (support_critical_response_business_hours = 4),
  support_normal_channel text NOT NULL DEFAULT 'email_or_ticket',
  support_normal_response_business_days integer NOT NULL DEFAULT 1 CHECK (support_normal_response_business_days = 1),
  weekly_active_schools_target_percent numeric NOT NULL DEFAULT 80 CHECK (weekly_active_schools_target_percent = 80),
  attendance_capture_target_percent numeric NOT NULL DEFAULT 90 CHECK (attendance_capture_target_percent = 90),
  critical_incident_target integer NOT NULL DEFAULT 0 CHECK (critical_incident_target = 0),
  satisfaction_target numeric NOT NULL DEFAULT 4 CHECK (satisfaction_target = 4),
  backup_cadence text NOT NULL DEFAULT 'daily' CHECK (backup_cadence = 'daily'),
  backup_rpo_hours integer NOT NULL DEFAULT 24 CHECK (backup_rpo_hours = 24),
  backup_rto_hours integer NOT NULL DEFAULT 4 CHECK (backup_rto_hours = 4),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO pilot_municipality_config (municipality_slug)
VALUES ('synthetic-municipality')
ON CONFLICT (municipality_slug) DO NOTHING;

CREATE OR REPLACE FUNCTION pilot_reject_second_municipality()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF (SELECT count(*) FROM pilot_municipality_config) >= 1 THEN
    RAISE EXCEPTION 'PILOT_SAFETY_GATE: one dedicated Supabase project is required per municipality';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS pilot_single_municipality_guard ON pilot_municipality_config;
CREATE TRIGGER pilot_single_municipality_guard
BEFORE INSERT ON pilot_municipality_config
FOR EACH ROW EXECUTE FUNCTION pilot_reject_second_municipality();

ALTER TABLE pilot_municipality_config ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON pilot_municipality_config FROM anon, authenticated;

-- -----------------------------------------------------------------------------
-- Direct school ownership for students and guardians, including pre-enrollment
-- records. This closes the un-enrolled record isolation gap.
-- -----------------------------------------------------------------------------
ALTER TABLE alunos ADD COLUMN IF NOT EXISTS escola_id uuid REFERENCES escolas(id);
ALTER TABLE responsaveis ADD COLUMN IF NOT EXISTS escola_id uuid REFERENCES escolas(id);
ALTER TABLE alunos ADD COLUMN IF NOT EXISTS import_source_id text;
ALTER TABLE responsaveis ADD COLUMN IF NOT EXISTS import_source_id text;
ALTER TABLE turmas ADD COLUMN IF NOT EXISTS import_source_id text;
ALTER TABLE responsaveis ALTER COLUMN cpf DROP NOT NULL;

UPDATE alunos a
SET escola_id = source.escola_id
FROM (
  SELECT DISTINCT ON (m.aluno_id) m.aluno_id, t.escola_id
  FROM matriculas m
  JOIN turmas t ON t.id = m.turma_id
  ORDER BY m.aluno_id, m.created_at DESC
) source
WHERE source.aluno_id = a.id AND a.escola_id IS NULL;

UPDATE responsaveis r
SET escola_id = source.escola_id
FROM (
  SELECT DISTINCT ON (ar.responsavel_id) ar.responsavel_id, a.escola_id
  FROM aluno_responsaveis ar
  JOIN alunos a ON a.id = ar.aluno_id
  WHERE a.escola_id IS NOT NULL
  ORDER BY ar.responsavel_id, ar.created_at DESC
) source
WHERE source.responsavel_id = r.id AND r.escola_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_alunos_escola ON alunos(escola_id);
CREATE INDEX IF NOT EXISTS idx_responsaveis_escola ON responsaveis(escola_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_alunos_school_import_source
  ON alunos(escola_id, import_source_id) WHERE import_source_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_responsaveis_school_import_source
  ON responsaveis(escola_id, import_source_id) WHERE import_source_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_turmas_school_import_source
  ON turmas(escola_id, import_source_id) WHERE import_source_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_aluno_responsaveis_unique_link
  ON aluno_responsaveis(aluno_id, responsavel_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_matriculas_unique_pilot_enrollment
  ON matriculas(aluno_id, turma_id, ano_letivo);

-- -----------------------------------------------------------------------------
-- Non-recursive authorization helpers. SECURITY DEFINER helpers read only the
-- minimal active-user attributes required by RLS.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION pilot_current_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT tipo_usuario FROM public.users WHERE id = auth.uid() AND ativo = true
$$;

CREATE OR REPLACE FUNCTION pilot_current_school_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT escola_id FROM public.users WHERE id = auth.uid() AND ativo = true
$$;

CREATE OR REPLACE FUNCTION pilot_is_secretariat()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT coalesce(
    (SELECT tipo_usuario IN ('admin', 'secretario') AND escola_id IS NULL
     FROM public.users WHERE id = auth.uid() AND ativo = true),
    false
  )
$$;

CREATE OR REPLACE FUNCTION pilot_can_access_school(target_school_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT pilot_current_role() IN ('admin', 'secretario', 'diretor', 'professor')
    AND (pilot_is_secretariat() OR target_school_id = pilot_current_school_id())
$$;

CREATE OR REPLACE FUNCTION pilot_can_manage_school(target_school_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT pilot_current_role() IN ('admin', 'secretario', 'diretor')
    AND (pilot_is_secretariat()
      OR (pilot_current_role() = 'diretor' AND target_school_id = pilot_current_school_id()))
$$;

CREATE OR REPLACE FUNCTION pilot_teacher_owns_class(target_class_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.turmas
    WHERE id = target_class_id
      AND professor_id = auth.uid()
      AND escola_id = pilot_current_school_id()
      AND ativo = true
  )
$$;

REVOKE ALL ON FUNCTION pilot_current_role() FROM PUBLIC;
REVOKE ALL ON FUNCTION pilot_current_school_id() FROM PUBLIC;
REVOKE ALL ON FUNCTION pilot_is_secretariat() FROM PUBLIC;
REVOKE ALL ON FUNCTION pilot_can_access_school(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION pilot_can_manage_school(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION pilot_teacher_owns_class(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION pilot_current_role() TO authenticated;
GRANT EXECUTE ON FUNCTION pilot_current_school_id() TO authenticated;
GRANT EXECUTE ON FUNCTION pilot_is_secretariat() TO authenticated;
GRANT EXECUTE ON FUNCTION pilot_can_access_school(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION pilot_can_manage_school(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION pilot_teacher_owns_class(uuid) TO authenticated;

-- -----------------------------------------------------------------------------
-- Replace baseline policies with explicit core-scope read/write policies.
-- Parents have no pilot policy and therefore no access.
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS escolas_select_authenticated ON escolas;
DROP POLICY IF EXISTS users_select_same_escola ON users;
DROP POLICY IF EXISTS turmas_select_escola ON turmas;
DROP POLICY IF EXISTS alunos_select_via_matricula ON alunos;
DROP POLICY IF EXISTS matriculas_select_escola ON matriculas;
DROP POLICY IF EXISTS frequencia_select_escola ON frequencia;
DROP POLICY IF EXISTS sessoes_aula_select_escola ON sessoes_aula;
DROP POLICY IF EXISTS audit_logs_admin_only ON audit_logs;

CREATE POLICY pilot_escolas_select ON escolas FOR SELECT TO authenticated
USING (ativo = true AND pilot_can_access_school(id));
CREATE POLICY pilot_escolas_insert ON escolas FOR INSERT TO authenticated
WITH CHECK (pilot_is_secretariat());
CREATE POLICY pilot_escolas_update ON escolas FOR UPDATE TO authenticated
USING (pilot_is_secretariat()) WITH CHECK (pilot_is_secretariat());

CREATE POLICY pilot_users_select ON users FOR SELECT TO authenticated
USING (id = auth.uid() OR pilot_is_secretariat() OR pilot_can_access_school(escola_id));

CREATE POLICY pilot_turmas_select ON turmas FOR SELECT TO authenticated
USING (pilot_can_access_school(escola_id));
CREATE POLICY pilot_turmas_insert ON turmas FOR INSERT TO authenticated
WITH CHECK (pilot_can_manage_school(escola_id));
CREATE POLICY pilot_turmas_update ON turmas FOR UPDATE TO authenticated
USING (pilot_can_manage_school(escola_id)) WITH CHECK (pilot_can_manage_school(escola_id));

CREATE POLICY pilot_alunos_select ON alunos FOR SELECT TO authenticated
USING (pilot_can_access_school(escola_id));
CREATE POLICY pilot_alunos_insert ON alunos FOR INSERT TO authenticated
WITH CHECK (pilot_can_manage_school(escola_id));
CREATE POLICY pilot_alunos_update ON alunos FOR UPDATE TO authenticated
USING (pilot_can_manage_school(escola_id)) WITH CHECK (pilot_can_manage_school(escola_id));

CREATE POLICY pilot_responsaveis_select ON responsaveis FOR SELECT TO authenticated
USING (pilot_can_access_school(escola_id));
CREATE POLICY pilot_responsaveis_insert ON responsaveis FOR INSERT TO authenticated
WITH CHECK (pilot_can_manage_school(escola_id));
CREATE POLICY pilot_responsaveis_update ON responsaveis FOR UPDATE TO authenticated
USING (pilot_can_manage_school(escola_id)) WITH CHECK (pilot_can_manage_school(escola_id));

CREATE POLICY pilot_aluno_responsaveis_select ON aluno_responsaveis FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM alunos a WHERE a.id = aluno_id AND pilot_can_access_school(a.escola_id)
));
CREATE POLICY pilot_aluno_responsaveis_insert ON aluno_responsaveis FOR INSERT TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM alunos a WHERE a.id = aluno_id AND pilot_can_manage_school(a.escola_id)
));
CREATE POLICY pilot_aluno_responsaveis_update ON aluno_responsaveis FOR UPDATE TO authenticated
USING (EXISTS (
  SELECT 1 FROM alunos a WHERE a.id = aluno_id AND pilot_can_manage_school(a.escola_id)
)) WITH CHECK (EXISTS (
  SELECT 1 FROM alunos a WHERE a.id = aluno_id AND pilot_can_manage_school(a.escola_id)
));

CREATE POLICY pilot_matriculas_select ON matriculas FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM turmas t WHERE t.id = turma_id AND pilot_can_access_school(t.escola_id)
));
CREATE POLICY pilot_matriculas_insert ON matriculas FOR INSERT TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM turmas t
  JOIN alunos a ON a.id = aluno_id
  WHERE t.id = turma_id AND a.escola_id = t.escola_id AND pilot_can_manage_school(t.escola_id)
));
CREATE POLICY pilot_matriculas_update ON matriculas FOR UPDATE TO authenticated
USING (EXISTS (
  SELECT 1 FROM turmas t WHERE t.id = turma_id AND pilot_can_manage_school(t.escola_id)
)) WITH CHECK (EXISTS (
  SELECT 1 FROM turmas t WHERE t.id = turma_id AND pilot_can_manage_school(t.escola_id)
));

CREATE POLICY pilot_aulas_abertas_select ON aulas_abertas FOR SELECT TO authenticated
USING (pilot_can_access_school(escola_id));
CREATE POLICY pilot_aulas_abertas_insert ON aulas_abertas FOR INSERT TO authenticated
WITH CHECK (pilot_can_manage_school(escola_id) OR (professor_id = auth.uid() AND pilot_teacher_owns_class(turma_id)));
CREATE POLICY pilot_aulas_abertas_update ON aulas_abertas FOR UPDATE TO authenticated
USING (pilot_can_manage_school(escola_id) OR professor_id = auth.uid())
WITH CHECK (pilot_can_manage_school(escola_id) OR professor_id = auth.uid());

CREATE POLICY pilot_sessoes_select ON sessoes_aula FOR SELECT TO authenticated
USING (pilot_can_access_school(escola_id));
CREATE POLICY pilot_sessoes_insert ON sessoes_aula FOR INSERT TO authenticated
WITH CHECK (pilot_can_manage_school(escola_id) OR (professor_id = auth.uid() AND pilot_teacher_owns_class(turma_id)));
CREATE POLICY pilot_sessoes_update ON sessoes_aula FOR UPDATE TO authenticated
USING (pilot_can_manage_school(escola_id) OR professor_id = auth.uid())
WITH CHECK (pilot_can_manage_school(escola_id) OR professor_id = auth.uid());

CREATE POLICY pilot_frequencia_select ON frequencia FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM matriculas m JOIN turmas t ON t.id = m.turma_id
  WHERE m.id = matricula_id AND pilot_can_access_school(t.escola_id)
));
CREATE POLICY pilot_frequencia_insert ON frequencia FOR INSERT TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM matriculas m JOIN turmas t ON t.id = m.turma_id
  WHERE m.id = matricula_id
    AND (pilot_can_manage_school(t.escola_id) OR (frequencia.professor_id = auth.uid() AND pilot_teacher_owns_class(t.id)))
));
CREATE POLICY pilot_frequencia_update ON frequencia FOR UPDATE TO authenticated
USING (EXISTS (
  SELECT 1 FROM matriculas m JOIN turmas t ON t.id = m.turma_id
  WHERE m.id = matricula_id
    AND (pilot_can_manage_school(t.escola_id) OR (frequencia.professor_id = auth.uid() AND pilot_teacher_owns_class(t.id)))
)) WITH CHECK (EXISTS (
  SELECT 1 FROM matriculas m JOIN turmas t ON t.id = m.turma_id
  WHERE m.id = matricula_id
    AND (pilot_can_manage_school(t.escola_id) OR (frequencia.professor_id = auth.uid() AND pilot_teacher_owns_class(t.id)))
));

-- The module revokes and the high-risk field guard are pilot-only containment.
-- They live in supabase/pilot/provision-pilot-module-gate.sql so a canonical
-- migration run never disables Censo Escolar fields or previously shipped
-- modules outside a synthetic municipal pilot.

-- -----------------------------------------------------------------------------
-- Security-invoker, redacted attendance view. The legacy PBF view remains
-- revoked because the module is outside the pilot.
-- -----------------------------------------------------------------------------
DROP VIEW IF EXISTS vw_frequencia_completa;
CREATE VIEW vw_frequencia_completa
WITH (security_invoker = true)
AS
SELECT
  f.id,
  f.matricula_id,
  m.aluno_id,
  f.data_aula,
  f.presente,
  f.status_presenca,
  f.aula_id,
  f.professor_id,
  f.marcado_em,
  f.modificado_em,
  f.travado,
  a.nome_completo AS aluno_nome,
  t.id AS turma_id,
  t.nome AS turma_nome,
  t.serie AS turma_serie,
  t.turno AS turma_turno,
  m.ano_letivo,
  m.situacao AS situacao_matricula,
  e.id AS escola_id,
  e.nome AS escola_nome,
  u.nome AS professor_nome
FROM frequencia f
JOIN matriculas m ON m.id = f.matricula_id
JOIN alunos a ON a.id = m.aluno_id
JOIN turmas t ON t.id = m.turma_id
JOIN escolas e ON e.id = t.escola_id
LEFT JOIN users u ON u.id = f.professor_id;

REVOKE ALL ON vw_frequencia_completa FROM anon;
GRANT SELECT ON vw_frequencia_completa TO authenticated;

-- -----------------------------------------------------------------------------
-- Append-only, redacted, server-owned audit trail.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pilot_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id uuid REFERENCES users(id),
  escola_id uuid REFERENCES escolas(id),
  event_type text NOT NULL,
  entity_type text NOT NULL,
  entity_id text,
  redacted_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  correlation_id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (NOT (redacted_metadata ?| ARRAY['cpf','nis','rg','password','senha','health','saude','deficiencia','race','cor_raca']))
);
CREATE INDEX IF NOT EXISTS idx_pilot_audit_school_created ON pilot_audit_log(escola_id, created_at DESC);
ALTER TABLE pilot_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY pilot_audit_select ON pilot_audit_log FOR SELECT TO authenticated
USING (pilot_is_secretariat() OR (pilot_current_role() = 'diretor' AND pilot_can_access_school(escola_id)));

CREATE OR REPLACE FUNCTION pilot_block_audit_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'PILOT_AUDIT_APPEND_ONLY: audit records cannot be changed or deleted';
END;
$$;
DROP TRIGGER IF EXISTS pilot_audit_append_only ON pilot_audit_log;
CREATE TRIGGER pilot_audit_append_only
BEFORE UPDATE OR DELETE ON pilot_audit_log
FOR EACH ROW EXECUTE FUNCTION pilot_block_audit_mutation();

CREATE OR REPLACE FUNCTION write_pilot_audit_event(
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
  inserted_id uuid;
  cleaned jsonb;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'PILOT_AUDIT_AUTH_REQUIRED: authenticated actor required';
  END IF;
  IF p_escola_id IS NOT NULL AND NOT pilot_can_access_school(p_escola_id) THEN
    RAISE EXCEPTION 'PILOT_AUDIT_SCHOOL_DENIED: actor cannot audit another school';
  END IF;
  cleaned := coalesce(p_metadata, '{}'::jsonb)
    - ARRAY['cpf','nis','rg','password','senha','health','saude','deficiencia','race','cor_raca'];
  INSERT INTO pilot_audit_log(actor_user_id, escola_id, event_type, entity_type, entity_id, redacted_metadata)
  VALUES (auth.uid(), p_escola_id, p_event_type, p_entity_type, p_entity_id, cleaned)
  RETURNING id INTO inserted_id;
  RETURN inserted_id;
END;
$$;
REVOKE ALL ON FUNCTION write_pilot_audit_event(text,text,text,uuid,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION write_pilot_audit_event(text,text,text,uuid,jsonb) TO authenticated;
REVOKE INSERT, UPDATE, DELETE ON pilot_audit_log FROM anon, authenticated;
GRANT SELECT ON pilot_audit_log TO authenticated;

CREATE OR REPLACE FUNCTION pilot_audit_core_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  row_data jsonb;
  school_id uuid;
  record_id text;
BEGIN
  row_data := CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE to_jsonb(NEW) END;
  record_id := row_data->>'id';
  school_id := NULLIF(row_data->>'escola_id', '')::uuid;
  IF school_id IS NULL AND TG_TABLE_NAME = 'matriculas' THEN
    SELECT t.escola_id INTO school_id FROM turmas t WHERE t.id = NULLIF(row_data->>'turma_id','')::uuid;
  ELSIF school_id IS NULL AND TG_TABLE_NAME = 'frequencia' THEN
    SELECT t.escola_id INTO school_id
    FROM matriculas m JOIN turmas t ON t.id = m.turma_id
    WHERE m.id = NULLIF(row_data->>'matricula_id','')::uuid;
  END IF;
  INSERT INTO pilot_audit_log(actor_user_id, escola_id, event_type, entity_type, entity_id, redacted_metadata)
  VALUES (
    auth.uid(), school_id, lower(TG_OP), TG_TABLE_NAME, record_id,
    jsonb_build_object('changed_columns', CASE WHEN TG_OP = 'UPDATE' THEN
      (SELECT jsonb_agg(key) FROM jsonb_each(to_jsonb(NEW)) WHERE value IS DISTINCT FROM (to_jsonb(OLD)->key))
      ELSE '[]'::jsonb END)
  );
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;

DO $$
DECLARE table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY['escolas','users','alunos','responsaveis','aluno_responsaveis','turmas','matriculas','frequencia','aulas_abertas']
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS pilot_audit_core_change ON %I', table_name);
    EXECUTE format('CREATE TRIGGER pilot_audit_core_change AFTER INSERT OR UPDATE OR DELETE ON %I FOR EACH ROW EXECUTE FUNCTION pilot_audit_core_change()', table_name);
  END LOOP;
END $$;

-- -----------------------------------------------------------------------------
-- Encrypted, synthetic-only, maker-checker CSV staging contract.
-- Plain CSV rows are never stored in the database.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pilot_import_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  escola_id uuid NOT NULL REFERENCES escolas(id),
  dataset text NOT NULL DEFAULT 'students' CHECK (dataset = 'students'),
  idempotency_key text NOT NULL,
  content_sha256 text NOT NULL,
  encryption_key_id text NOT NULL,
  encrypted_payload text,
  iv text,
  auth_tag text,
  validation_report jsonb NOT NULL,
  status text NOT NULL DEFAULT 'pending_approval'
    CHECK (status IN ('pending_approval','approved','published','rejected','cleaned')),
  submitted_by uuid NOT NULL REFERENCES users(id),
  approved_by uuid REFERENCES users(id),
  approved_at timestamptz,
  published_at timestamptz,
  raw_expires_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours'),
  cleaned_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (escola_id, idempotency_key),
  UNIQUE (escola_id, content_sha256)
);

CREATE TABLE IF NOT EXISTS pilot_import_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid NOT NULL UNIQUE REFERENCES pilot_import_batches(id),
  escola_id uuid NOT NULL REFERENCES escolas(id),
  submitted_by uuid NOT NULL REFERENCES users(id),
  approved_by uuid NOT NULL REFERENCES users(id),
  decision text NOT NULL CHECK (decision IN ('approved','rejected')),
  report_sha256 text NOT NULL,
  decided_at timestamptz NOT NULL DEFAULT now(),
  CHECK (submitted_by <> approved_by)
);

ALTER TABLE pilot_import_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE pilot_import_approvals ENABLE ROW LEVEL SECURITY;
CREATE POLICY pilot_import_batches_select ON pilot_import_batches FOR SELECT TO authenticated
USING (submitted_by = auth.uid() OR pilot_is_secretariat() OR (pilot_current_role() = 'diretor' AND pilot_can_access_school(escola_id)));
CREATE POLICY pilot_import_approvals_select ON pilot_import_approvals FOR SELECT TO authenticated
USING (submitted_by = auth.uid() OR approved_by = auth.uid() OR pilot_is_secretariat());
REVOKE INSERT, UPDATE, DELETE ON pilot_import_batches, pilot_import_approvals FROM anon, authenticated;
GRANT SELECT ON pilot_import_batches, pilot_import_approvals TO authenticated;

CREATE OR REPLACE FUNCTION pilot_cleanup_import_staging()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE affected integer;
BEGIN
  UPDATE pilot_import_batches
  SET encrypted_payload = NULL, iv = NULL, auth_tag = NULL,
      status = CASE WHEN status IN ('published','rejected') THEN status ELSE 'cleaned' END,
      cleaned_at = now()
  WHERE encrypted_payload IS NOT NULL
    AND (raw_expires_at <= now() OR status IN ('published','rejected'));
  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected;
END;
$$;
REVOKE ALL ON FUNCTION pilot_cleanup_import_staging() FROM PUBLIC, anon, authenticated;

-- -----------------------------------------------------------------------------
-- Invitation state. Auth invitations themselves are created only by the
-- server-side service-role client after an authenticated secretariat check.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pilot_user_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id uuid NOT NULL UNIQUE,
  email text NOT NULL,
  invited_role text NOT NULL CHECK (invited_role IN ('secretario','diretor','professor')),
  escola_id uuid REFERENCES escolas(id),
  invited_by uuid NOT NULL REFERENCES users(id),
  accepted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((invited_role = 'secretario') OR escola_id IS NOT NULL)
);
ALTER TABLE pilot_user_invitations ENABLE ROW LEVEL SECURITY;
CREATE POLICY pilot_invitations_select ON pilot_user_invitations FOR SELECT TO authenticated
USING (pilot_is_secretariat() OR auth_user_id = auth.uid());
REVOKE INSERT, UPDATE, DELETE ON pilot_user_invitations FROM anon, authenticated;
GRANT SELECT ON pilot_user_invitations TO authenticated;

-- -----------------------------------------------------------------------------
-- First-party success metrics. No student names or identifiers are accepted.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pilot_metric_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  escola_id uuid REFERENCES escolas(id),
  actor_user_id uuid REFERENCES users(id),
  event_name text NOT NULL CHECK (event_name IN (
    'weekly_school_active','expected_attendance','attendance_recorded',
    'critical_incident','satisfaction_submitted','training_completed'
  )),
  metric_value numeric NOT NULL DEFAULT 1,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  dimensions jsonb NOT NULL DEFAULT '{}'::jsonb,
  CHECK (NOT (dimensions ?| ARRAY['student_id','student_name','cpf','nis','email','phone']))
);
ALTER TABLE pilot_metric_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY pilot_metrics_select ON pilot_metric_events FOR SELECT TO authenticated
USING (pilot_is_secretariat() OR (pilot_current_role() = 'diretor' AND pilot_can_access_school(escola_id)));
REVOKE INSERT, UPDATE, DELETE ON pilot_metric_events FROM anon, authenticated;
GRANT SELECT ON pilot_metric_events TO authenticated;

CREATE OR REPLACE FUNCTION record_pilot_metric_event(
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
DECLARE inserted_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'PILOT_METRIC_AUTH_REQUIRED'; END IF;
  IF p_escola_id IS NOT NULL AND NOT pilot_can_access_school(p_escola_id) THEN
    RAISE EXCEPTION 'PILOT_METRIC_SCHOOL_DENIED';
  END IF;
  IF p_dimensions ?| ARRAY['student_id','student_name','cpf','nis','email','phone'] THEN
    RAISE EXCEPTION 'PILOT_METRIC_PII_REJECTED';
  END IF;
  INSERT INTO pilot_metric_events(escola_id, actor_user_id, event_name, metric_value, dimensions)
  VALUES (p_escola_id, auth.uid(), p_event_name, p_metric_value, p_dimensions)
  RETURNING id INTO inserted_id;
  RETURN inserted_id;
END;
$$;
REVOKE ALL ON FUNCTION record_pilot_metric_event(text,uuid,numeric,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION record_pilot_metric_event(text,uuid,numeric,jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION pilot_dashboard_metrics(p_escola_id uuid DEFAULT NULL)
RETURNS TABLE(metric text, value numeric, target numeric, target_met boolean)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
  WITH scoped AS (
    SELECT * FROM pilot_metric_events e
    WHERE (p_escola_id IS NULL OR e.escola_id = p_escola_id)
      AND (e.escola_id IS NULL OR pilot_can_access_school(e.escola_id))
  ), values_by_metric AS (
    SELECT
      coalesce(sum(metric_value) FILTER (WHERE event_name = 'weekly_school_active'), 0) AS active_schools,
      coalesce(sum(metric_value) FILTER (WHERE event_name = 'expected_attendance'), 0) AS expected_attendance,
      coalesce(sum(metric_value) FILTER (WHERE event_name = 'attendance_recorded'), 0) AS attendance_recorded,
      coalesce(sum(metric_value) FILTER (WHERE event_name = 'critical_incident'), 0) AS critical_incidents,
      coalesce(avg(metric_value) FILTER (WHERE event_name = 'satisfaction_submitted'), 0) AS satisfaction
    FROM scoped
  )
  SELECT 'attendance_capture_percent',
         CASE WHEN expected_attendance > 0 THEN round(attendance_recorded * 100 / expected_attendance, 2) ELSE 0 END,
         90,
         expected_attendance > 0 AND attendance_recorded * 100 / expected_attendance >= 90
  FROM values_by_metric
  UNION ALL SELECT 'critical_incidents', critical_incidents, 0, critical_incidents = 0 FROM values_by_metric
  UNION ALL SELECT 'satisfaction', satisfaction, 4, satisfaction >= 4 FROM values_by_metric;
$$;
REVOKE ALL ON FUNCTION pilot_dashboard_metrics(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION pilot_dashboard_metrics(uuid) TO authenticated;

-- Tombstones prevent a restore from silently resurrecting an authorized
-- technical deletion. Official records remain under municipal TTD/CPAD rules.
CREATE TABLE IF NOT EXISTS pilot_data_tombstones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL,
  source_fingerprint text NOT NULL,
  reason_code text NOT NULL,
  created_by uuid REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(entity_type, source_fingerprint)
);
ALTER TABLE pilot_data_tombstones ENABLE ROW LEVEL SECURITY;
CREATE POLICY pilot_tombstones_select ON pilot_data_tombstones FOR SELECT TO authenticated
USING (pilot_is_secretariat());
REVOKE INSERT, UPDATE, DELETE ON pilot_data_tombstones FROM anon, authenticated;
GRANT SELECT ON pilot_data_tombstones TO authenticated;

-- -----------------------------------------------------------------------------
-- Private storage. Paths start with the school UUID. Storage creation is
-- conditional so the raw-PostgreSQL migration test remains reproducible.
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF to_regclass('storage.buckets') IS NOT NULL THEN
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES ('student-photos', 'student-photos', false, 5242880, ARRAY['image/jpeg','image/png','image/webp'])
    ON CONFLICT (id) DO UPDATE SET public = false;
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES ('pilot-import-staging', 'pilot-import-staging', false, 10485760, ARRAY['text/csv','application/octet-stream'])
    ON CONFLICT (id) DO UPDATE SET public = false;

    EXECUTE 'DROP POLICY IF EXISTS pilot_student_photos_select ON storage.objects';
    EXECUTE 'DROP POLICY IF EXISTS pilot_student_photos_insert ON storage.objects';
    EXECUTE 'DROP POLICY IF EXISTS pilot_student_photos_update ON storage.objects';
    EXECUTE $policy$
      CREATE POLICY pilot_student_photos_select ON storage.objects FOR SELECT TO authenticated
      USING (bucket_id = 'student-photos' AND public.pilot_can_access_school((storage.foldername(name))[1]::uuid))
    $policy$;
    EXECUTE $policy$
      CREATE POLICY pilot_student_photos_insert ON storage.objects FOR INSERT TO authenticated
      WITH CHECK (bucket_id = 'student-photos' AND public.pilot_can_manage_school((storage.foldername(name))[1]::uuid))
    $policy$;
    EXECUTE $policy$
      CREATE POLICY pilot_student_photos_update ON storage.objects FOR UPDATE TO authenticated
      USING (bucket_id = 'student-photos' AND public.pilot_can_manage_school((storage.foldername(name))[1]::uuid))
      WITH CHECK (bucket_id = 'student-photos' AND public.pilot_can_manage_school((storage.foldername(name))[1]::uuid))
    $policy$;
  END IF;
END $$;

-- Explicit grants make the deployed PostgREST contract reproducible instead of
-- relying on dashboard-created defaults. RLS remains the row authorization seam.
GRANT SELECT ON escolas, users, alunos, responsaveis, aluno_responsaveis, turmas,
  matriculas, aulas_abertas, sessoes_aula, frequencia TO authenticated;
GRANT INSERT, UPDATE ON escolas, alunos, responsaveis, aluno_responsaveis, turmas,
  matriculas, aulas_abertas, sessoes_aula, frequencia TO authenticated;
REVOKE DELETE ON escolas, users, alunos, responsaveis, aluno_responsaveis, turmas,
  matriculas, aulas_abertas, sessoes_aula, frequencia FROM authenticated;

GRANT ALL ON pilot_municipality_config, pilot_import_batches, pilot_import_approvals,
  pilot_user_invitations, pilot_data_tombstones, pilot_metric_events, pilot_audit_log TO service_role;
GRANT ALL ON escolas, users, alunos, responsaveis, aluno_responsaveis, turmas,
  matriculas, aulas_abertas, sessoes_aula, frequencia TO service_role;
GRANT EXECUTE ON FUNCTION pilot_cleanup_import_staging() TO service_role;
