-- Keep the existing governed import approval schema while making the G2
-- retention order explicit for already-deployed proof databases.
-- This does not authorize legal basis, controller identity, or contracting.

ALTER TABLE public.pilot_import_batches
  DROP CONSTRAINT IF EXISTS pilot_import_batches_governance_check;

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
      AND raw_expires_at < canonical_expires_at
      AND raw_expires_at < rollback_until
      AND rollback_until < canonical_expires_at
    )
  );
