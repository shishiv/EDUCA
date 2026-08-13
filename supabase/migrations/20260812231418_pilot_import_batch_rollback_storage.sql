-- Complete the synthetic isolated-proof rollback contract.
-- Storage ownership is recorded in storage.objects metadata by the proof runner.
-- This migration never broadens rollback beyond an explicitly isolated batch.

BEGIN;

DROP FUNCTION IF EXISTS public.pilot_rollback_import_batch(uuid, uuid, text);

CREATE FUNCTION public.pilot_rollback_import_batch(
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
  deleted_storage_objects integer,
  storage_object_fingerprints text[],
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
  student_count integer;
  guardian_count integer;
  relationship_count integer;
  enrollment_count integer;
  storage_object_count integer := 0;
  deleted_enrollment_count integer := 0;
  deleted_relationship_count integer := 0;
  deleted_student_count integer := 0;
  deleted_guardian_count integer := 0;
  deleted_storage_object_count integer := 0;
  deleted_storage_fingerprints text[] := ARRAY[]::text[];
  storage_batch_association_expression text;
  storage_fingerprint_expression text;
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
    RETURN QUERY SELECT
      p_batch_id, 0, 0, 0, 0, 0, ARRAY[]::text[], batch_row.status;
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

  IF to_regclass('storage.objects') IS NOT NULL THEN
    SELECT CASE
      WHEN EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'storage'
          AND table_name = 'objects'
          AND column_name = 'user_metadata'
      )
      THEN 'coalesce(user_metadata->>''pilot_import_batch_id'', metadata->>''pilot_import_batch_id'')'
      ELSE 'metadata->>''pilot_import_batch_id'''
    END
    INTO storage_batch_association_expression;

    SELECT CASE
      WHEN EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'storage'
          AND table_name = 'objects'
          AND column_name = 'user_metadata'
      )
      THEN 'coalesce(user_metadata->>''pilot_import_object_fingerprint'', metadata->>''pilot_import_object_fingerprint'', id::text)'
      ELSE 'coalesce(metadata->>''pilot_import_object_fingerprint'', id::text)'
    END
    INTO storage_fingerprint_expression;

    EXECUTE format($query$
      SELECT count(*)::integer
      FROM storage.objects
      WHERE %s = $1::text
    $query$, storage_batch_association_expression)
    INTO storage_object_count
    USING p_batch_id::text;

    EXECUTE format($query$
      SELECT coalesce(array_agg(%s ORDER BY id), ARRAY[]::text[])
      FROM storage.objects
      WHERE %s = $1::text
    $query$, storage_fingerprint_expression, storage_batch_association_expression)
    INTO deleted_storage_fingerprints
    USING p_batch_id::text;
  END IF;

  -- Counts are an ownership receipt, not a deletion selector. A missing batch
  -- association must fail before any canonical row or object is removed.
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
  IF batch_row.canonical_counts ? 'storageObjects'
     AND storage_object_count <> (batch_row.canonical_counts->>'storageObjects')::integer THEN
    RAISE EXCEPTION 'PILOT_IMPORT_ROLLBACK_OWNERSHIP_GAP: Storage object batch association is incomplete';
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

  IF to_regclass('storage.objects') IS NOT NULL THEN
    EXECUTE format($query$
      DELETE FROM storage.objects
      WHERE %s = $1::text
    $query$, storage_batch_association_expression)
    USING p_batch_id::text;
    GET DIAGNOSTICS deleted_storage_object_count = ROW_COUNT;
  END IF;

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
      'deleted_storage_objects', deleted_storage_object_count,
      'storage_object_fingerprint_count', coalesce(array_length(deleted_storage_fingerprints, 1), 0),
      'reason_recorded', true
    )
  );

  RETURN QUERY SELECT
    p_batch_id,
    deleted_enrollment_count,
    deleted_relationship_count,
    deleted_student_count,
    deleted_guardian_count,
    deleted_storage_object_count,
    deleted_storage_fingerprints,
    'rolled_back'::text;
END;
$$;

REVOKE ALL ON FUNCTION public.pilot_rollback_import_batch(uuid, uuid, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.pilot_rollback_import_batch(uuid, uuid, text)
  TO service_role;

COMMIT;
