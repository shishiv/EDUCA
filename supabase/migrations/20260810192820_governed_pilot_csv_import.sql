-- Governed CSV import contract for an isolated pilot proof database.
--
-- This migration does not authorize real data in production or the public demo.
-- `import_target = isolated_proof` is accepted only by the proof runner, which
-- requires a local database whose name starts with `educa_pilot_proof_`.

-- -----------------------------------------------------------------------------
-- Import governance, retention, and receipt metadata.
-- -----------------------------------------------------------------------------
ALTER TABLE public.pilot_import_batches
  ADD COLUMN IF NOT EXISTS import_target text NOT NULL DEFAULT 'synthetic_local',
  ADD COLUMN IF NOT EXISTS source_mode text NOT NULL DEFAULT 'synthetic',
  ADD COLUMN IF NOT EXISTS encryption_algorithm text NOT NULL DEFAULT 'aes-256-gcm',
  ADD COLUMN IF NOT EXISTS governance_owner_name text,
  ADD COLUMN IF NOT EXISTS governance_owner_email text,
  ADD COLUMN IF NOT EXISTS submitted_by_name text,
  ADD COLUMN IF NOT EXISTS submitted_by_email text,
  ADD COLUMN IF NOT EXISTS approved_by_name text,
  ADD COLUMN IF NOT EXISTS approved_by_email text,
  ADD COLUMN IF NOT EXISTS processing_agreement_reference text,
  ADD COLUMN IF NOT EXISTS processing_agreement_version text,
  ADD COLUMN IF NOT EXISTS processing_agreement_recorded_at timestamptz,
  ADD COLUMN IF NOT EXISTS processing_agreement_recorded_by uuid REFERENCES public.users(id),
  ADD COLUMN IF NOT EXISTS processing_agreement_recorded_by_name text,
  ADD COLUMN IF NOT EXISTS processing_agreement_recorded_by_email text,
  ADD COLUMN IF NOT EXISTS retention_policy text,
  ADD COLUMN IF NOT EXISTS canonical_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS rollback_until timestamptz,
  ADD COLUMN IF NOT EXISTS source_row_count integer,
  ADD COLUMN IF NOT EXISTS canonical_counts jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS canonical_fingerprint_sha256 text,
  ADD COLUMN IF NOT EXISTS database_fingerprint_sha256 text,
  ADD COLUMN IF NOT EXISTS governance_fingerprint_sha256 text,
  ADD COLUMN IF NOT EXISTS governance_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS rolled_back_at timestamptz,
  ADD COLUMN IF NOT EXISTS rolled_back_by uuid REFERENCES public.users(id),
  ADD COLUMN IF NOT EXISTS rollback_reason text;

ALTER TABLE public.pilot_import_batches
  DROP CONSTRAINT IF EXISTS pilot_import_batches_status_check;
ALTER TABLE public.pilot_import_batches
  ADD CONSTRAINT pilot_import_batches_status_check
  CHECK (status IN ('pending_approval','approved','published','rejected','cleaned','rolled_back'));

ALTER TABLE public.pilot_import_batches
  ADD CONSTRAINT pilot_import_batches_target_check
  CHECK (import_target IN ('synthetic_local', 'isolated_proof'));
ALTER TABLE public.pilot_import_batches
  ADD CONSTRAINT pilot_import_batches_source_mode_check
  CHECK (source_mode IN ('synthetic', 'real'));
ALTER TABLE public.pilot_import_batches
  ADD CONSTRAINT pilot_import_batches_encryption_check
  CHECK (encryption_algorithm = 'aes-256-gcm');
ALTER TABLE public.pilot_import_batches
  ADD CONSTRAINT pilot_import_batches_governance_check
  CHECK (
    import_target <> 'isolated_proof'
    OR (
      length(trim(coalesce(governance_owner_name, ''))) BETWEEN 2 AND 160
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
      AND raw_expires_at <= canonical_expires_at
      AND rollback_until <= canonical_expires_at
    )
  );

CREATE INDEX IF NOT EXISTS idx_pilot_import_batches_target_status
  ON public.pilot_import_batches(import_target, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pilot_import_batches_retention
  ON public.pilot_import_batches(raw_expires_at, canonical_expires_at);

-- Canonical rows carry the batch that created them. This makes rollback precise
-- and prevents a source fingerprint from being the only deletion selector.
ALTER TABLE public.alunos
  ADD COLUMN IF NOT EXISTS pilot_import_batch_id uuid REFERENCES public.pilot_import_batches(id);
ALTER TABLE public.responsaveis
  ADD COLUMN IF NOT EXISTS pilot_import_batch_id uuid REFERENCES public.pilot_import_batches(id);
ALTER TABLE public.aluno_responsaveis
  ADD COLUMN IF NOT EXISTS pilot_import_batch_id uuid REFERENCES public.pilot_import_batches(id);
ALTER TABLE public.matriculas
  ADD COLUMN IF NOT EXISTS pilot_import_batch_id uuid REFERENCES public.pilot_import_batches(id);

CREATE INDEX IF NOT EXISTS idx_alunos_pilot_import_batch ON public.alunos(pilot_import_batch_id);
CREATE INDEX IF NOT EXISTS idx_responsaveis_pilot_import_batch ON public.responsaveis(pilot_import_batch_id);
CREATE INDEX IF NOT EXISTS idx_aluno_responsaveis_pilot_import_batch ON public.aluno_responsaveis(pilot_import_batch_id);
CREATE INDEX IF NOT EXISTS idx_matriculas_pilot_import_batch ON public.matriculas(pilot_import_batch_id);

CREATE OR REPLACE FUNCTION public.pilot_block_import_batch_reassignment()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.pilot_import_batch_id IS DISTINCT FROM NEW.pilot_import_batch_id THEN
    RAISE EXCEPTION 'PILOT_IMPORT_BATCH_IMMUTABLE: canonical row batch ownership cannot change';
  END IF;
  RETURN NEW;
END;
$$;

DO $$
DECLARE table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY['alunos','responsaveis','aluno_responsaveis','matriculas']
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS pilot_import_batch_immutable ON public.%I', table_name);
    EXECUTE format(
      'CREATE TRIGGER pilot_import_batch_immutable BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.pilot_block_import_batch_reassignment()',
      table_name
    );
  END LOOP;
END $$;

REVOKE ALL ON FUNCTION public.pilot_block_import_batch_reassignment() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.pilot_block_import_batch_reassignment() TO service_role;

-- -----------------------------------------------------------------------------
-- Transactional rollback for proof-only imports.
-- -----------------------------------------------------------------------------
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
  IF p_reason <> 'retention_expired' AND (p_actor_user_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = p_actor_user_id AND ativo = true
  )) THEN
    RAISE EXCEPTION 'PILOT_IMPORT_ROLLBACK_ACTOR_REQUIRED: active governance actor is required';
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

  SELECT count(*) INTO attendance_count
  FROM public.frequencia f
  JOIN public.matriculas m ON m.id = f.matricula_id
  WHERE m.pilot_import_batch_id = p_batch_id;
  IF attendance_count > 0 THEN
    RAISE EXCEPTION 'PILOT_IMPORT_ROLLBACK_DEPENDENCY: canonical attendance exists for this batch';
  END IF;

  SELECT count(*) INTO shared_guardian_count
  FROM public.responsaveis r
  JOIN public.aluno_responsaveis ar ON ar.responsavel_id = r.id
  WHERE r.pilot_import_batch_id = p_batch_id
    AND ar.pilot_import_batch_id IS DISTINCT FROM p_batch_id;
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

  DELETE FROM public.responsaveis r
  WHERE r.pilot_import_batch_id = p_batch_id
    AND NOT EXISTS (
      SELECT 1 FROM public.aluno_responsaveis ar
      WHERE ar.responsavel_id = r.id
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

REVOKE ALL ON FUNCTION public.pilot_rollback_import_batch(uuid, uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.pilot_rollback_import_batch(uuid, uuid, text) TO service_role;

-- Raw ciphertext follows raw_expires_at. Canonical proof rows remain until the
-- explicit rollback operation or the separately recorded canonical expiry rule.
CREATE OR REPLACE FUNCTION public.pilot_cleanup_import_retention()
RETURNS integer
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  affected integer := 0;
  expired_batch record;
BEGIN
  IF current_user NOT IN ('postgres', 'service_role') THEN
    RAISE EXCEPTION 'PILOT_IMPORT_RETENTION_ROLE_DENIED: service role is required';
  END IF;

  UPDATE public.pilot_import_batches
  SET encrypted_payload = NULL,
      iv = NULL,
      auth_tag = NULL,
      status = CASE
        WHEN import_target = 'isolated_proof' OR status IN ('published', 'rejected') THEN status
        ELSE 'cleaned'
      END,
      cleaned_at = coalesce(cleaned_at, now())
  WHERE encrypted_payload IS NOT NULL
    AND raw_expires_at <= now();
  GET DIAGNOSTICS affected = ROW_COUNT;

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

REVOKE ALL ON FUNCTION public.pilot_cleanup_import_retention() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.pilot_cleanup_import_retention() TO service_role;

GRANT ALL ON public.pilot_import_batches, public.pilot_import_approvals TO service_role;
GRANT ALL ON public.alunos, public.responsaveis, public.aluno_responsaveis, public.matriculas TO service_role;
GRANT ALL ON public.pilot_data_tombstones, public.pilot_audit_log TO service_role;
