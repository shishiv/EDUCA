-- Make pilot import rejection one governed transaction and keep encrypted source
-- material until the existing raw retention deadline.

BEGIN;

CREATE OR REPLACE FUNCTION public.pilot_reject_synthetic_import_batch(
  p_batch_id uuid,
  p_approver_user_id uuid,
  p_report_sha256 text,
  p_governance_fingerprint_sha256 text,
  p_governance_metadata jsonb
)
RETURNS TABLE(
  batch_id uuid,
  status text,
  approved_at timestamptz,
  cleaned_at timestamptz,
  raw_expires_at timestamptz,
  audit_id uuid
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  batch_row public.pilot_import_batches%ROWTYPE;
  approver_row public.users%ROWTYPE;
  agreement_row public.pilot_data_treatment_agreements%ROWTYPE;
  decision_timestamp timestamptz := now();
  inserted_audit_id uuid;
BEGIN
  IF current_user NOT IN ('postgres', 'service_role') THEN
    RAISE EXCEPTION 'PILOT_IMPORT_REJECTION_ROLE_DENIED: service role is required';
  END IF;

  IF p_report_sha256 !~ '^[0-9a-f]{64}$'
     OR p_governance_fingerprint_sha256 !~ '^[0-9a-f]{64}$'
     OR jsonb_typeof(p_governance_metadata) IS DISTINCT FROM 'object' THEN
    RAISE EXCEPTION 'PILOT_IMPORT_REJECTION_GOVERNANCE_INVALID: complete governance evidence is required';
  END IF;

  SELECT * INTO batch_row
  FROM public.pilot_import_batches
  WHERE id = p_batch_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'PILOT_IMPORT_BATCH_NOT_FOUND: import batch does not exist';
  END IF;
  IF batch_row.import_target <> 'synthetic_local' THEN
    RAISE EXCEPTION 'PILOT_IMPORT_REJECTION_TARGET_DENIED: only synthetic local imports can be rejected by this route';
  END IF;
  IF batch_row.status <> 'pending_approval' THEN
    RAISE EXCEPTION 'PILOT_IMPORT_REJECTION_STATE_DENIED: batch is not awaiting approval';
  END IF;
  IF batch_row.submitted_by = p_approver_user_id THEN
    RAISE EXCEPTION 'PILOT_IMPORT_MAKER_CHECKER_DENIED: submitter cannot reject the same batch';
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
    AND confirmed = true
    AND confirmed_at IS NOT NULL
    AND confirmed_by IS NOT NULL;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'PILOT_IMPORT_TREATMENT_AGREEMENT_REQUIRED: a confirmed treatment agreement must be on file';
  END IF;

  UPDATE public.pilot_import_batches
  SET status = 'rejected',
      approved_by = p_approver_user_id,
      approved_by_name = approver_row.nome,
      approved_by_email = approver_row.email,
      approved_at = decision_timestamp,
      governance_fingerprint_sha256 = p_governance_fingerprint_sha256,
      governance_metadata = p_governance_metadata
  WHERE id = p_batch_id;

  INSERT INTO public.pilot_import_approvals(
    batch_id, escola_id, submitted_by, approved_by, decision, report_sha256, decided_at
  ) VALUES (
    p_batch_id, batch_row.escola_id, batch_row.submitted_by,
    p_approver_user_id, 'rejected', p_report_sha256, decision_timestamp
  );

  INSERT INTO public.pilot_audit_log(
    actor_user_id, escola_id, event_type, entity_type, entity_id, redacted_metadata
  ) VALUES (
    p_approver_user_id,
    batch_row.escola_id,
    'import_rejected',
    'pilot_import_batch',
    p_batch_id::text,
    jsonb_build_object(
      'dataset', batch_row.dataset,
      'decision', 'rejected',
      'report_sha256', p_report_sha256,
      'governance_fingerprint_sha256', p_governance_fingerprint_sha256,
      'governance_recorded', true,
      'plaintext_stored', false,
      'ciphertext_retained_until', batch_row.raw_expires_at
    )
  ) RETURNING id INTO inserted_audit_id;

  RETURN QUERY
  SELECT
    p_batch_id,
    'rejected'::text,
    decision_timestamp,
    batch_row.cleaned_at,
    batch_row.raw_expires_at,
    inserted_audit_id;
END;
$$;

REVOKE ALL ON FUNCTION public.pilot_reject_synthetic_import_batch(uuid, uuid, text, text, jsonb)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.pilot_reject_synthetic_import_batch(uuid, uuid, text, text, jsonb)
  TO service_role;

-- pilot_cleanup_import_retention() superseded this helper and is the only cleanup
-- contract allowed to remove ciphertext.
DROP FUNCTION IF EXISTS public.pilot_cleanup_import_staging();

COMMIT;
