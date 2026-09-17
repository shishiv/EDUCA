-- Retention is still synthetic-only and uses the deadlines already on each batch.
-- Each result separates raw cleanup from canonical disposal. A blocked canonical
-- rollback must neither restore expired ciphertext nor undo another batch.
BEGIN;

CREATE OR REPLACE FUNCTION public.pilot_cleanup_import_retention_results()
RETURNS TABLE (
  batch_id uuid,
  escola_id uuid,
  raw_payload_status text,
  canonical_status text,
  reason_code text
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  candidate record;
  batch_row public.pilot_import_batches%ROWTYPE;
BEGIN
  IF current_user NOT IN ('postgres', 'service_role') THEN
    RAISE EXCEPTION 'PILOT_IMPORT_RETENTION_ROLE_DENIED: service role is required';
  END IF;

  FOR candidate IN
    SELECT batch.id, batch.escola_id
    FROM public.pilot_import_batches AS batch
    WHERE batch.source_mode = 'synthetic'
      AND batch.import_target IN ('synthetic_local', 'isolated_proof')
      AND (
        (batch.encrypted_payload IS NOT NULL AND batch.raw_expires_at <= now())
        OR (batch.status IN ('approved', 'published') AND batch.canonical_expires_at <= now())
      )
    ORDER BY batch.id
  LOOP
    batch_id := candidate.id;
    escola_id := candidate.escola_id;
    raw_payload_status := 'not_due';
    canonical_status := 'not_due';
    reason_code := 'not_due';

    BEGIN
      -- Recheck under the rollback's own row lock. A concurrent cleanup that
      -- already completed is not a second deletion or a second tombstone.
      SELECT * INTO batch_row
      FROM public.pilot_import_batches AS batch
      WHERE batch.id = candidate.id
      FOR UPDATE;
      IF NOT FOUND OR batch_row.source_mode <> 'synthetic'
        OR batch_row.import_target NOT IN ('synthetic_local', 'isolated_proof') THEN
        CONTINUE;
      END IF;
      IF NOT (
        (batch_row.encrypted_payload IS NOT NULL AND batch_row.raw_expires_at <= now())
        OR (batch_row.status IN ('approved', 'published') AND batch_row.canonical_expires_at <= now())
      ) THEN
        CONTINUE;
      END IF;

      IF batch_row.encrypted_payload IS NOT NULL AND batch_row.raw_expires_at <= now() THEN
        BEGIN
          UPDATE public.pilot_import_batches AS batch
          SET encrypted_payload = NULL, iv = NULL, auth_tag = NULL,
              cleaned_at = coalesce(batch.cleaned_at, now())
          WHERE batch.id = candidate.id;
          INSERT INTO public.pilot_audit_log (
            actor_user_id, escola_id, event_type, entity_type, entity_id, redacted_metadata
          ) VALUES (
            NULL, batch_row.escola_id, 'import_payload_cleaned', 'pilot_import_batch', candidate.id::text,
            jsonb_build_object('reason', 'raw_payload_expired', 'plaintext_stored', false)
          );
          raw_payload_status := 'cleaned';
        EXCEPTION WHEN OTHERS THEN
          raw_payload_status := 'failed';
        END;
      END IF;

      IF batch_row.status IN ('approved', 'published') AND batch_row.canonical_expires_at <= now() THEN
        BEGIN
          IF batch_row.import_target = 'synthetic_local' THEN
            PERFORM public.pilot_rollback_synthetic_import_batch(
              candidate.id, coalesce(batch_row.approved_by, batch_row.submitted_by), 'retention_expired'
            );
          ELSE
            PERFORM public.pilot_rollback_import_batch(
              candidate.id, coalesce(batch_row.approved_by, batch_row.submitted_by), 'retention_expired'
            );
          END IF;
          canonical_status := 'deleted';
          reason_code := 'retention_expired';
        EXCEPTION
          -- RESTRICT protects Vivências, finalized reports and other referenced
          -- rows. Preserve all canonical changes in this subtransaction.
          WHEN foreign_key_violation OR restrict_violation THEN
            canonical_status := 'preserved_dependency';
            reason_code := 'dependency';
          WHEN OTHERS THEN
            IF SQLSTATE = 'P0001' AND (
              SQLERRM LIKE 'PILOT_IMPORT_ROLLBACK_DEPENDENCY:%'
              OR SQLERRM LIKE 'PILOT_IMPORT_ROLLBACK_SHARED_GUARDIAN:%'
            ) THEN
              canonical_status := 'preserved_dependency';
              reason_code := 'dependency';
            ELSE
              canonical_status := 'failed';
              reason_code := CASE
                WHEN SQLSTATE = 'P0001' AND SQLERRM LIKE 'PILOT_IMPORT_ROLLBACK_OWNERSHIP_GAP:%'
                  THEN 'ownership_gap'
                ELSE 'rollback_failed'
              END;
            END IF;
        END;
      END IF;

      -- No SQLERRM, row values, names or dependency details leave the boundary.
      -- A preserved or failed batch remains eligible for a later manual retry.
      INSERT INTO public.pilot_audit_log (
        actor_user_id, escola_id, event_type, entity_type, entity_id, redacted_metadata
      ) VALUES (
        NULL, batch_row.escola_id, 'import_retention_result', 'pilot_import_batch', candidate.id::text,
        jsonb_build_object(
          'raw_payload_status', raw_payload_status,
          'canonical_status', canonical_status,
          'reason_code', reason_code
        )
      );
    EXCEPTION WHEN OTHERS THEN
      -- Even an audit/write failure rolls back only this batch. The caller still
      -- receives a redacted failure, never a false success for rolled-back work.
      raw_payload_status := 'failed';
      canonical_status := 'failed';
      reason_code := 'batch_failed';
    END;
    RETURN NEXT;
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.pilot_cleanup_import_retention_results() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.pilot_cleanup_import_retention_results() TO service_role;

-- Keep the existing scalar RPC for browser callers. Its historical unit is
-- operations (raw cleanup + canonical rollback), not distinct batches. Detailed
-- callers use the result RPC, including when an audit-write failure prevents
-- persistence of a batch receipt.
CREATE OR REPLACE FUNCTION public.pilot_cleanup_import_retention()
RETURNS integer
LANGUAGE sql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
  SELECT coalesce(sum(
    (result.raw_payload_status = 'cleaned')::integer +
    (result.canonical_status = 'deleted')::integer
  ), 0)::integer
  FROM public.pilot_cleanup_import_retention_results() AS result;
$$;

REVOKE ALL ON FUNCTION public.pilot_cleanup_import_retention() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.pilot_cleanup_import_retention() TO service_role;

COMMIT;
