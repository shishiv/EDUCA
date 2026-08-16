-- Add the named-owner and confirmed-treatment-agreement gates to governed imports.
-- The source CSV remains application-encrypted with PILOT_IMPORT_ENCRYPTION_KEY.

BEGIN;

CREATE TABLE IF NOT EXISTS public.pilot_data_treatment_agreements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  escola_id uuid NOT NULL REFERENCES public.escolas(id),
  reference text NOT NULL,
  version text NOT NULL,
  confirmed boolean NOT NULL DEFAULT false,
  confirmed_at timestamptz,
  confirmed_by uuid REFERENCES public.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (escola_id, reference, version),
  CHECK (
    (confirmed = true AND confirmed_at IS NOT NULL AND confirmed_by IS NOT NULL)
    OR (confirmed = false AND confirmed_at IS NULL AND confirmed_by IS NULL)
  )
);

ALTER TABLE public.pilot_data_treatment_agreements ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.pilot_data_treatment_agreements FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.pilot_data_treatment_agreements TO service_role;

CREATE INDEX IF NOT EXISTS idx_pilot_treatment_agreements_lookup
  ON public.pilot_data_treatment_agreements(escola_id, reference, version, confirmed);

ALTER TABLE public.pilot_import_batches
  ADD COLUMN IF NOT EXISTS processing_agreement_id uuid REFERENCES public.pilot_data_treatment_agreements(id),
  ADD COLUMN IF NOT EXISTS processing_agreement_confirmed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS governance_owner_user_id uuid REFERENCES public.users(id),
  ADD COLUMN IF NOT EXISTS governance_owner_authorized_at timestamptz;

ALTER TABLE public.pilot_import_batches
  DROP CONSTRAINT IF EXISTS pilot_import_batches_governance_check;

ALTER TABLE public.pilot_import_batches
  ADD CONSTRAINT pilot_import_batches_governance_check
  CHECK (
    import_target NOT IN ('synthetic_local', 'isolated_proof')
    OR (
      import_target = 'isolated_proof'
      AND length(trim(coalesce(governance_owner_name, ''))) BETWEEN 2 AND 160
      AND position('@' IN coalesce(governance_owner_email, '')) > 1
      AND length(trim(coalesce(processing_agreement_reference, ''))) BETWEEN 2 AND 200
      AND length(trim(coalesce(processing_agreement_version, ''))) BETWEEN 1 AND 80
      AND processing_agreement_recorded_at IS NOT NULL
      AND processing_agreement_recorded_by IS NOT NULL
      AND length(trim(coalesce(approved_by_name, ''))) BETWEEN 2 AND 160
      AND position('@' IN coalesce(approved_by_email, '')) > 1
      AND source_row_count IS NOT NULL
      AND source_row_count > 0
      AND canonical_fingerprint_sha256 IS NOT NULL
      AND governance_fingerprint_sha256 IS NOT NULL
      AND retention_policy IS NOT NULL
      AND canonical_expires_at IS NOT NULL
      AND rollback_until IS NOT NULL
      AND raw_expires_at < canonical_expires_at
      AND raw_expires_at < rollback_until
      AND rollback_until < canonical_expires_at
    )
    OR (
      import_target = 'synthetic_local'
      AND length(trim(coalesce(governance_owner_name, ''))) BETWEEN 2 AND 160
      AND position('@' IN coalesce(governance_owner_email, '')) > 1
      AND governance_owner_user_id IS NOT NULL
      AND governance_owner_authorized_at IS NOT NULL
      AND processing_agreement_id IS NOT NULL
      AND processing_agreement_confirmed = true
      AND length(trim(coalesce(processing_agreement_reference, ''))) BETWEEN 2 AND 200
      AND length(trim(coalesce(processing_agreement_version, ''))) BETWEEN 1 AND 80
      AND processing_agreement_recorded_at IS NOT NULL
      AND processing_agreement_recorded_by IS NOT NULL
      AND (
        status IN ('pending_approval', 'cleaned', 'rolled_back')
        OR (
          length(trim(coalesce(approved_by_name, ''))) BETWEEN 2 AND 160
          AND position('@' IN coalesce(approved_by_email, '')) > 1
          AND governance_fingerprint_sha256 IS NOT NULL
        )
      )
      AND source_row_count IS NOT NULL
      AND source_row_count > 0
      AND canonical_fingerprint_sha256 IS NOT NULL
      AND retention_policy IS NOT NULL
      AND canonical_expires_at IS NOT NULL
      AND rollback_until IS NOT NULL
      AND raw_expires_at < canonical_expires_at
      AND raw_expires_at < rollback_until
      AND rollback_until < canonical_expires_at
    )
  ) NOT VALID;

-- This trigger is the database backstop. It prevents a service-role caller from
-- writing canonical rows when the batch skipped either governance gate.
CREATE OR REPLACE FUNCTION public.pilot_require_governed_import_batch()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  batch_row record;
  agreement_row record;
  owner_role text;
BEGIN
  IF NEW.pilot_import_batch_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT
    batch.id,
    batch.escola_id,
    batch.import_target,
    batch.processing_agreement_id,
    batch.processing_agreement_confirmed,
    batch.governance_owner_user_id
  INTO batch_row
  FROM public.pilot_import_batches AS batch
  WHERE batch.id = NEW.pilot_import_batch_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'PILOT_IMPORT_BATCH_NOT_FOUND: canonical row batch does not exist';
  END IF;

  IF batch_row.import_target <> 'synthetic_local' THEN
    RETURN NEW;
  END IF;

  IF batch_row.processing_agreement_confirmed IS DISTINCT FROM true
     OR batch_row.governance_owner_user_id IS NULL THEN
    RAISE EXCEPTION 'PILOT_IMPORT_GOVERNANCE_REQUIRED: owner and confirmed treatment agreement are required';
  END IF;

  SELECT agreement.id, agreement.confirmed, agreement.escola_id
  INTO agreement_row
  FROM public.pilot_data_treatment_agreements AS agreement
  WHERE agreement.id = batch_row.processing_agreement_id
    AND agreement.escola_id = batch_row.escola_id
    AND agreement.confirmed = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'PILOT_IMPORT_TREATMENT_AGREEMENT_REQUIRED: a confirmed treatment agreement must be on file';
  END IF;

  SELECT tipo_usuario
  INTO owner_role
  FROM public.users
  WHERE id = batch_row.governance_owner_user_id
    AND ativo = true;

  IF owner_role NOT IN ('admin', 'secretario') THEN
    RAISE EXCEPTION 'PILOT_IMPORT_OWNER_DENIED: active secretary or designated operator is required';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.pilot_require_governed_import_batch() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.pilot_require_governed_import_batch() TO service_role;

DO $$
BEGIN
  EXECUTE 'DROP TRIGGER IF EXISTS pilot_require_governed_import_batch ON public.alunos';
  EXECUTE 'CREATE TRIGGER pilot_require_governed_import_batch BEFORE INSERT OR UPDATE ON public.alunos FOR EACH ROW EXECUTE FUNCTION public.pilot_require_governed_import_batch()';
  EXECUTE 'DROP TRIGGER IF EXISTS pilot_require_governed_import_batch ON public.responsaveis';
  EXECUTE 'CREATE TRIGGER pilot_require_governed_import_batch BEFORE INSERT OR UPDATE ON public.responsaveis FOR EACH ROW EXECUTE FUNCTION public.pilot_require_governed_import_batch()';
  EXECUTE 'DROP TRIGGER IF EXISTS pilot_require_governed_import_batch ON public.aluno_responsaveis';
  EXECUTE 'CREATE TRIGGER pilot_require_governed_import_batch BEFORE INSERT OR UPDATE ON public.aluno_responsaveis FOR EACH ROW EXECUTE FUNCTION public.pilot_require_governed_import_batch()';
  EXECUTE 'DROP TRIGGER IF EXISTS pilot_require_governed_import_batch ON public.matriculas';
  EXECUTE 'CREATE TRIGGER pilot_require_governed_import_batch BEFORE INSERT OR UPDATE ON public.matriculas FOR EACH ROW EXECUTE FUNCTION public.pilot_require_governed_import_batch()';
END;
$$;

-- Publish the canonical projection in one database transaction. The route decrypts
-- and validates the CSV first, then this service-role RPC makes partial imports
-- impossible if any class, conflict, or canonical insert fails.
CREATE OR REPLACE FUNCTION public.pilot_publish_synthetic_import_batch(
  p_batch_id uuid,
  p_approver_user_id uuid,
  p_report_sha256 text,
  p_rows jsonb,
  p_canonical_counts jsonb,
  p_canonical_fingerprint_sha256 text,
  p_governance_fingerprint_sha256 text,
  p_governance_metadata jsonb
)
RETURNS TABLE(
  batch_id uuid,
  status text,
  published_at timestamptz,
  cleaned_at timestamptz,
  raw_expires_at timestamptz
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  batch_row public.pilot_import_batches%ROWTYPE;
  approver_row public.users%ROWTYPE;
  agreement_row public.pilot_data_treatment_agreements%ROWTYPE;
  class_row public.turmas%ROWTYPE;
  csv_row record;
  school_code text;
  guardian_id uuid;
  student_id uuid;
  published_timestamp timestamptz;
  imported_row_count integer := 0;
BEGIN
  IF current_user NOT IN ('postgres', 'service_role') THEN
    RAISE EXCEPTION 'PILOT_IMPORT_PUBLISH_ROLE_DENIED: service role is required';
  END IF;

  SELECT * INTO batch_row
  FROM public.pilot_import_batches
  WHERE id = p_batch_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'PILOT_IMPORT_BATCH_NOT_FOUND: import batch does not exist';
  END IF;
  IF batch_row.import_target <> 'synthetic_local' THEN
    RAISE EXCEPTION 'PILOT_IMPORT_PUBLISH_TARGET_DENIED: only synthetic local imports can be published by this route';
  END IF;
  IF batch_row.status <> 'pending_approval' THEN
    RAISE EXCEPTION 'PILOT_IMPORT_PUBLISH_STATE_DENIED: batch is not awaiting approval';
  END IF;
  IF batch_row.submitted_by = p_approver_user_id THEN
    RAISE EXCEPTION 'PILOT_IMPORT_MAKER_CHECKER_DENIED: submitter cannot approve the same batch';
  END IF;

  SELECT * INTO approver_row
  FROM public.users
  WHERE id = p_approver_user_id
    AND ativo = true;
  IF NOT FOUND
     OR approver_row.tipo_usuario <> 'diretor'
     OR approver_row.escola_id IS DISTINCT FROM batch_row.escola_id THEN
    RAISE EXCEPTION 'PILOT_IMPORT_APPROVER_DENIED: active director of the import school is required';
  END IF;

  IF batch_row.processing_agreement_confirmed IS DISTINCT FROM true
     OR batch_row.processing_agreement_id IS NULL THEN
    RAISE EXCEPTION 'PILOT_IMPORT_TREATMENT_AGREEMENT_REQUIRED: a confirmed treatment agreement must be on file';
  END IF;
  SELECT * INTO agreement_row
  FROM public.pilot_data_treatment_agreements
  WHERE id = batch_row.processing_agreement_id
    AND escola_id = batch_row.escola_id
    AND confirmed = true;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'PILOT_IMPORT_TREATMENT_AGREEMENT_REQUIRED: a confirmed treatment agreement must be on file';
  END IF;

  IF jsonb_typeof(p_rows) <> 'array' OR jsonb_array_length(p_rows) = 0 THEN
    RAISE EXCEPTION 'PILOT_IMPORT_ROWS_REQUIRED: validated CSV rows are required';
  END IF;
  IF p_canonical_counts->>'students' IS DISTINCT FROM jsonb_array_length(p_rows)::text THEN
    RAISE EXCEPTION 'PILOT_IMPORT_COUNTS_MISMATCH: canonical row count does not match the validated CSV';
  END IF;

  SELECT codigo INTO school_code
  FROM public.escolas
  WHERE id = batch_row.escola_id
    AND ativo = true;
  IF school_code IS NULL THEN
    RAISE EXCEPTION 'PILOT_IMPORT_SCHOOL_NOT_FOUND: import school does not exist';
  END IF;

  UPDATE public.pilot_import_batches
  SET status = 'approved',
      approved_by = p_approver_user_id,
      approved_by_name = approver_row.nome,
      approved_by_email = approver_row.email,
      approved_at = now(),
      governance_fingerprint_sha256 = p_governance_fingerprint_sha256,
      governance_metadata = p_governance_metadata,
      canonical_counts = p_canonical_counts,
      canonical_fingerprint_sha256 = p_canonical_fingerprint_sha256
  WHERE id = p_batch_id;

  INSERT INTO public.pilot_import_approvals(
    batch_id, escola_id, submitted_by, approved_by, decision, report_sha256, decided_at
  )
  VALUES (
    p_batch_id, batch_row.escola_id, batch_row.submitted_by,
    p_approver_user_id, 'approved', p_report_sha256, now()
  );

  FOR csv_row IN
    SELECT *
    FROM jsonb_to_recordset(p_rows) AS input(
      source_id text,
      school_code text,
      class_code text,
      student_name text,
      birth_date date,
      sex text,
      guardian_name text,
      guardian_phone text,
      guardian_relationship text
    )
  LOOP
    IF csv_row.school_code IS DISTINCT FROM school_code THEN
      RAISE EXCEPTION 'PILOT_IMPORT_SCHOOL_MISMATCH: CSV row belongs to another school';
    END IF;

    SELECT * INTO class_row
    FROM public.turmas
    WHERE escola_id = batch_row.escola_id
      AND import_source_id = csv_row.class_code
      AND ativo = true
    LIMIT 1;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'PILOT_IMPORT_CLASS_NOT_FOUND: CSV class does not exist in the import school';
    END IF;

    IF EXISTS (
      SELECT 1 FROM public.responsaveis
      WHERE escola_id = batch_row.escola_id
        AND import_source_id = 'guardian:' || csv_row.source_id
    ) THEN
      RAISE EXCEPTION 'PILOT_IMPORT_SOURCE_CONFLICT: guardian source identity already exists';
    END IF;
    IF EXISTS (
      SELECT 1 FROM public.alunos
      WHERE escola_id = batch_row.escola_id
        AND import_source_id = csv_row.source_id
    ) THEN
      RAISE EXCEPTION 'PILOT_IMPORT_SOURCE_CONFLICT: student source identity already exists';
    END IF;

    INSERT INTO public.responsaveis(
      escola_id, import_source_id, nome, cpf, parentesco, telefone, ativo, pilot_import_batch_id
    )
    VALUES (
      batch_row.escola_id, 'guardian:' || csv_row.source_id, csv_row.guardian_name,
      NULL, csv_row.guardian_relationship, csv_row.guardian_phone, true, p_batch_id
    )
    RETURNING id INTO guardian_id;

    INSERT INTO public.alunos(
      escola_id, import_source_id, nome_completo, data_nascimento, sexo,
      responsavel_id, ativo, pilot_import_batch_id
    )
    VALUES (
      batch_row.escola_id, csv_row.source_id, csv_row.student_name, csv_row.birth_date,
      csv_row.sex, guardian_id, true, p_batch_id
    )
    RETURNING id INTO student_id;

    INSERT INTO public.aluno_responsaveis(
      aluno_id, responsavel_id, tipo_responsabilidade, pilot_import_batch_id
    )
    VALUES (student_id, guardian_id, csv_row.guardian_relationship, p_batch_id);

    INSERT INTO public.matriculas(
      aluno_id, turma_id, ano_letivo, situacao, observacoes, pilot_import_batch_id
    )
    VALUES (
      student_id, class_row.id, class_row.ano_letivo, 'ativa',
      'synthetic pilot CSV import', p_batch_id
    );

    imported_row_count := imported_row_count + 1;
  END LOOP;

  published_timestamp := now();
  UPDATE public.pilot_import_batches
  SET status = 'published',
      published_at = published_timestamp
  WHERE id = p_batch_id;

  INSERT INTO public.pilot_audit_log(
    actor_user_id, escola_id, event_type, entity_type, entity_id, redacted_metadata
  )
  VALUES (
    p_approver_user_id, batch_row.escola_id, 'import_published',
    'pilot_import_batch', p_batch_id::text,
    jsonb_build_object(
      'dataset', 'students',
      'row_count', imported_row_count,
      'canonical_counts', p_canonical_counts,
      'canonical_fingerprint_sha256', p_canonical_fingerprint_sha256,
      'governance_recorded', true,
      'plaintext_stored', false
    )
  );

  RETURN QUERY SELECT
    p_batch_id,
    'published'::text,
    published_timestamp,
    batch_row.cleaned_at,
    batch_row.raw_expires_at;
END;
$$;

REVOKE ALL ON FUNCTION public.pilot_publish_synthetic_import_batch(uuid, uuid, text, jsonb, jsonb, text, text, jsonb)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.pilot_publish_synthetic_import_batch(uuid, uuid, text, jsonb, jsonb, text, text, jsonb)
  TO service_role;

-- The browser route uses synthetic_local. Keep the proof-only rollback function
-- unchanged for its Storage contract and add a matching canonical-only path.
CREATE OR REPLACE FUNCTION public.pilot_rollback_synthetic_import_batch(
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
  enrollment_count integer;
  relationship_count integer;
  student_count integer;
  guardian_count integer;
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
  IF batch_row.import_target <> 'synthetic_local' THEN
    RAISE EXCEPTION 'PILOT_IMPORT_ROLLBACK_TARGET_DENIED: browser rollback only accepts synthetic local imports';
  END IF;
  IF batch_row.status = 'rolled_back' THEN
    RETURN QUERY SELECT p_batch_id, 0, 0, 0, 0, batch_row.status;
    RETURN;
  END IF;
  IF batch_row.status IN ('rejected', 'cleaned') THEN
    RAISE EXCEPTION 'PILOT_IMPORT_ROLLBACK_STATE_DENIED: batch is not canonical data';
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
        OR (actor.tipo_usuario = 'diretor' AND actor.escola_id = batch_row.escola_id)
      )
  ) THEN
    RAISE EXCEPTION 'PILOT_IMPORT_ROLLBACK_ACTOR_REQUIRED: active governance actor is required';
  END IF;

  SELECT count(*) INTO enrollment_count
  FROM public.matriculas
  WHERE pilot_import_batch_id = p_batch_id;
  SELECT count(*) INTO relationship_count
  FROM public.aluno_responsaveis
  WHERE pilot_import_batch_id = p_batch_id;
  SELECT count(*) INTO student_count
  FROM public.alunos
  WHERE pilot_import_batch_id = p_batch_id;
  SELECT count(*) INTO guardian_count
  FROM public.responsaveis
  WHERE pilot_import_batch_id = p_batch_id;

  IF batch_row.canonical_counts ? 'enrollments'
     AND enrollment_count <> (batch_row.canonical_counts->>'enrollments')::integer THEN
    RAISE EXCEPTION 'PILOT_IMPORT_ROLLBACK_OWNERSHIP_GAP: enrollment batch association is incomplete';
  END IF;
  IF batch_row.canonical_counts ? 'relationships'
     AND relationship_count <> (batch_row.canonical_counts->>'relationships')::integer THEN
    RAISE EXCEPTION 'PILOT_IMPORT_ROLLBACK_OWNERSHIP_GAP: relationship batch association is incomplete';
  END IF;
  IF batch_row.canonical_counts ? 'students'
     AND student_count <> (batch_row.canonical_counts->>'students')::integer THEN
    RAISE EXCEPTION 'PILOT_IMPORT_ROLLBACK_OWNERSHIP_GAP: student batch association is incomplete';
  END IF;
  IF batch_row.canonical_counts ? 'guardians'
     AND guardian_count <> (batch_row.canonical_counts->>'guardians')::integer THEN
    RAISE EXCEPTION 'PILOT_IMPORT_ROLLBACK_OWNERSHIP_GAP: guardian batch association is incomplete';
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

  INSERT INTO public.pilot_data_tombstones(entity_type, source_fingerprint, reason_code, created_by)
  VALUES ('pilot_import_batch', batch_row.content_sha256, 'pilot_import_rollback', p_actor_user_id)
  ON CONFLICT (entity_type, source_fingerprint) DO NOTHING;

  INSERT INTO public.pilot_audit_log(
    actor_user_id, escola_id, event_type, entity_type, entity_id, redacted_metadata
  )
  VALUES (
    p_actor_user_id,
    batch_row.escola_id,
    'import_rolled_back',
    'pilot_import_batch',
    p_batch_id::text,
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

REVOKE ALL ON FUNCTION public.pilot_rollback_synthetic_import_batch(uuid, uuid, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.pilot_rollback_synthetic_import_batch(uuid, uuid, text)
  TO service_role;

-- Raw ciphertext is purgeable at raw_expires_at. Canonical synthetic_local rows
-- are purged at canonical_expires_at through the same exact-batch rollback path.
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
          WHEN import_target IN ('synthetic_local', 'isolated_proof')
            OR status IN ('published', 'rejected') THEN status
          ELSE 'cleaned'
        END,
        cleaned_at = coalesce(cleaned_at, now())
    WHERE id = batch_row.id;

    INSERT INTO public.pilot_audit_log(
      actor_user_id, escola_id, event_type, entity_type, entity_id, redacted_metadata
    )
    VALUES (
      NULL, batch_row.escola_id, 'import_payload_cleaned', 'pilot_import_batch',
      batch_row.id::text,
      jsonb_build_object('reason', 'raw_payload_expired', 'plaintext_stored', false)
    );
    affected := affected + 1;
  END LOOP;

  FOR expired_batch IN
    SELECT id, coalesce(approved_by, submitted_by) AS actor_user_id, import_target
    FROM public.pilot_import_batches
    WHERE import_target IN ('synthetic_local', 'isolated_proof')
      AND status IN ('approved', 'published')
      AND canonical_expires_at IS NOT NULL
      AND canonical_expires_at <= now()
  LOOP
    IF expired_batch.import_target = 'synthetic_local' THEN
      PERFORM public.pilot_rollback_synthetic_import_batch(
        expired_batch.id,
        expired_batch.actor_user_id,
        'retention_expired'
      );
    ELSE
      PERFORM public.pilot_rollback_import_batch(
        expired_batch.id,
        expired_batch.actor_user_id,
        'retention_expired'
      );
    END IF;
    affected := affected + 1;
  END LOOP;

  RETURN affected;
END;
$$;

REVOKE ALL ON FUNCTION public.pilot_cleanup_import_retention() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.pilot_cleanup_import_retention() TO service_role;

COMMIT;
