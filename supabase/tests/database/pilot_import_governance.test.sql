BEGIN;

CREATE FUNCTION pg_temp.assert_true(condition boolean, message text)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF condition IS DISTINCT FROM true THEN RAISE EXCEPTION 'assertion failed: %', message; END IF;
END;
$$;

INSERT INTO public.escolas(id, codigo, nome, tipo, ativo)
VALUES
  ('91000000-0000-0000-0000-000000000001', 'SYN-GOV', 'Escola Governanca Sintetica', 'fundamental', true),
  ('91000000-0000-0000-0000-000000000002', 'SYN-GOV-B', 'Escola Governanca B', 'fundamental', true);
INSERT INTO public.users(id, nome, email, tipo_usuario, escola_id, ativo, primeiro_login, senha_padrao)
VALUES
  ('92000000-0000-0000-0000-000000000001', 'Secretaria Governanca', 'secretaria.governanca@synthetic.invalid', 'secretario', NULL, true, false, false),
  ('92000000-0000-0000-0000-000000000002', 'Diretora Governanca', 'diretora.governanca@synthetic.invalid', 'diretor', '91000000-0000-0000-0000-000000000001', true, false, false),
  ('92000000-0000-0000-0000-000000000003', 'Diretora Outra Escola', 'diretora.outra@synthetic.invalid', 'diretor', '91000000-0000-0000-0000-000000000002', true, false, false),
  ('92000000-0000-0000-0000-000000000004', 'Diretora Inativa', 'diretora.inativa@synthetic.invalid', 'diretor', '91000000-0000-0000-0000-000000000001', false, false, false);
INSERT INTO public.turmas(id, import_source_id, nome, serie, turno, ano_letivo, capacidade, escola_id, ativo)
VALUES ('93000000-0000-0000-0000-000000000001', 'SYN-GOV-CLASS', 'Turma Governanca', '1 ano', 'matutino', 2026, 30, '91000000-0000-0000-0000-000000000001', true);

INSERT INTO public.pilot_data_treatment_agreements(
  id, escola_id, reference, version, confirmed, confirmed_at, confirmed_by
) VALUES
  (
    '96000000-0000-0000-0000-000000000001',
    '91000000-0000-0000-0000-000000000001',
    'DPA-SYN-REJECTION-001', 'v1', true, now(),
    '92000000-0000-0000-0000-000000000001'
  ),
  (
    '96000000-0000-0000-0000-000000000002',
    '91000000-0000-0000-0000-000000000001',
    'DPA-SYN-REJECTION-002', 'v1', true, now(),
    '92000000-0000-0000-0000-000000000001'
  );

CREATE FUNCTION pg_temp.insert_rejection_batch(
  batch_id uuid,
  idempotency_key text,
  agreement_id uuid,
  agreement_reference text
)
RETURNS void
LANGUAGE sql
AS $$
  INSERT INTO public.pilot_import_batches(
    id, escola_id, dataset, idempotency_key, content_sha256, encryption_key_id,
    encrypted_payload, iv, auth_tag, validation_report, status, submitted_by,
    import_target, source_mode, encryption_algorithm,
    governance_owner_name, governance_owner_email, governance_owner_user_id,
    governance_owner_authorized_at, submitted_by_name, submitted_by_email,
    processing_agreement_id, processing_agreement_confirmed,
    processing_agreement_reference, processing_agreement_version,
    processing_agreement_recorded_at, processing_agreement_recorded_by,
    processing_agreement_recorded_by_name, processing_agreement_recorded_by_email,
    retention_policy, raw_expires_at, canonical_expires_at, rollback_until,
    source_row_count, canonical_counts, canonical_fingerprint_sha256,
    governance_metadata
  ) VALUES (
    batch_id, '91000000-0000-0000-0000-000000000001', 'students', idempotency_key,
    encode(extensions.digest(idempotency_key, 'sha256'), 'hex'), 'proof-test-v1',
    'rejection-ciphertext', 'rejection-iv', 'rejection-tag',
    '{"valid":true,"validRows":1}'::jsonb, 'pending_approval',
    '92000000-0000-0000-0000-000000000001', 'synthetic_local', 'synthetic',
    'aes-256-gcm', 'Secretaria Governanca', 'secretaria.governanca@synthetic.invalid',
    '92000000-0000-0000-0000-000000000001', now(),
    'Secretaria Governanca', 'secretaria.governanca@synthetic.invalid',
    agreement_id, true, agreement_reference, 'v1', now(),
    '92000000-0000-0000-0000-000000000001', 'Secretaria Governanca',
    'secretaria.governanca@synthetic.invalid', 'proof-only-test',
    now() + interval '1 day', now() + interval '30 days', now() + interval '7 days',
    1, '{"sourceRows":1,"students":1,"guardians":1,"relationships":1,"enrollments":1}'::jsonb,
    repeat('c', 64), '{"owner":{"name":"Secretaria Governanca"}}'::jsonb
  );
$$;

DO $$
BEGIN
  BEGIN
    INSERT INTO public.pilot_import_batches(
      escola_id, dataset, idempotency_key, content_sha256, encryption_key_id,
      encrypted_payload, iv, auth_tag, validation_report, status, submitted_by,
      import_target, source_mode, encryption_algorithm
    ) VALUES (
      '91000000-0000-0000-0000-000000000001', 'students', 'governance-missing-owner',
      'missing-owner-sha256', 'proof-test-v1', 'ciphertext', 'iv', 'tag', '{}'::jsonb,
      'published', '92000000-0000-0000-0000-000000000001', 'isolated_proof', 'synthetic', 'aes-256-gcm'
    );
    RAISE EXCEPTION 'deliberate break did not turn governance red';
  EXCEPTION WHEN check_violation THEN
    IF SQLERRM NOT LIKE '%pilot_import_batches_governance_check%' THEN RAISE; END IF;
  END;
END $$;

DO $$
BEGIN
  BEGIN
    INSERT INTO public.pilot_import_batches(
      escola_id, dataset, idempotency_key, content_sha256, encryption_key_id,
      encrypted_payload, iv, auth_tag, validation_report, status, submitted_by,
      import_target, source_mode, encryption_algorithm,
      governance_owner_name, governance_owner_email, submitted_by_name,
      submitted_by_email, approved_by_name, approved_by_email,
      processing_agreement_reference, processing_agreement_version,
      processing_agreement_recorded_at, processing_agreement_recorded_by,
      retention_policy, raw_expires_at, canonical_expires_at, rollback_until,
      source_row_count, canonical_fingerprint_sha256, governance_fingerprint_sha256
    ) VALUES (
      '91000000-0000-0000-0000-000000000001', 'students', 'governance-invalid-retention',
      'invalid-retention-sha256', 'proof-test-v1', 'ciphertext', 'iv', 'tag', '{}'::jsonb,
      'published', '92000000-0000-0000-0000-000000000001', 'isolated_proof', 'synthetic',
      'aes-256-gcm', 'Owner Governanca', 'owner.governanca@synthetic.invalid',
      'Secretaria Governanca', 'secretaria.governanca@synthetic.invalid',
      'Diretora Governanca', 'diretora.governanca@synthetic.invalid',
      'DPA-SYN-GOV-INVALID', 'v1', now(),
      '92000000-0000-0000-0000-000000000001', 'proof-only-test',
      now() + interval '7 days', now() + interval '30 days', now() + interval '1 day',
      1, repeat('c', 64), repeat('d', 64)
    );
    RAISE EXCEPTION 'deliberate retention break did not turn governance red';
  EXCEPTION WHEN check_violation THEN
    IF SQLERRM NOT LIKE '%pilot_import_batches_governance_check%' THEN RAISE; END IF;
  END;
END $$;

INSERT INTO public.pilot_import_batches(
  id, escola_id, dataset, idempotency_key, content_sha256, encryption_key_id,
  encrypted_payload, iv, auth_tag, validation_report, status, submitted_by, approved_by,
  approved_at, import_target, source_mode, encryption_algorithm,
  governance_owner_name, governance_owner_email, submitted_by_name, submitted_by_email,
  approved_by_name, approved_by_email, processing_agreement_reference,
  processing_agreement_version, processing_agreement_recorded_at,
  processing_agreement_recorded_by, processing_agreement_recorded_by_name,
  processing_agreement_recorded_by_email, retention_policy, raw_expires_at,
  canonical_expires_at, rollback_until, source_row_count, canonical_counts,
  canonical_fingerprint_sha256, governance_fingerprint_sha256, governance_metadata
) VALUES (
  '90000000-0000-0000-0000-000000000001', '91000000-0000-0000-0000-000000000001',
  'students', 'governance-valid', 'governance-valid-sha256', 'proof-test-v1',
  'encrypted-source-ciphertext', 'encrypted-source-iv', 'encrypted-source-tag',
  '{"valid":true,"validRows":1}'::jsonb, 'published', '92000000-0000-0000-0000-000000000001',
  '92000000-0000-0000-0000-000000000002', now(), 'isolated_proof', 'synthetic', 'aes-256-gcm',
  'Owner Governanca', 'owner.governanca@synthetic.invalid',
  'Secretaria Governanca', 'secretaria.governanca@synthetic.invalid',
  'Diretora Governanca', 'diretora.governanca@synthetic.invalid',
  'DPA-SYN-GOV-001', 'v1', now(),
  '92000000-0000-0000-0000-000000000001', 'Secretaria Governanca',
  'secretaria.governanca@synthetic.invalid', 'proof-only-test',
  now() + interval '1 day', now() + interval '30 days', now() + interval '7 days',
  1, '{"sourceRows":1,"students":1,"guardians":1,"relationships":1,"enrollments":1}'::jsonb,
  repeat('a', 64), repeat('b', 64),
  '{"owner":{"name":"Owner Governanca"},"agreement":{"reference":"DPA-SYN-GOV-001"}}'::jsonb
);

INSERT INTO public.responsaveis(
  id, escola_id, import_source_id, nome, cpf, parentesco, telefone, ativo, pilot_import_batch_id
) VALUES (
  '94000000-0000-0000-0000-000000000001', '91000000-0000-0000-0000-000000000001',
  'proof:guardian:governance-student', 'Responsavel Governanca', NULL, 'mae', '11999990000', true,
  '90000000-0000-0000-0000-000000000001'
);
INSERT INTO public.alunos(
  id, escola_id, import_source_id, nome_completo, data_nascimento, sexo, responsavel_id,
  ativo, pilot_import_batch_id
) VALUES (
  '95000000-0000-0000-0000-000000000001', '91000000-0000-0000-0000-000000000001',
  'proof:governance-student', 'Aluno Governanca Sintetico', '2018-05-20', 'M',
  '94000000-0000-0000-0000-000000000001', true, '90000000-0000-0000-0000-000000000001'
);
INSERT INTO public.aluno_responsaveis(aluno_id, responsavel_id, tipo_responsabilidade, pilot_import_batch_id)
VALUES (
  '95000000-0000-0000-0000-000000000001', '94000000-0000-0000-0000-000000000001', 'mae',
  '90000000-0000-0000-0000-000000000001'
);
INSERT INTO public.matriculas(aluno_id, turma_id, ano_letivo, situacao, pilot_import_batch_id)
VALUES (
  '95000000-0000-0000-0000-000000000001', '93000000-0000-0000-0000-000000000001', 2026, 'ativa',
  '90000000-0000-0000-0000-000000000001'
);

SELECT pg_temp.assert_true(
  (SELECT encrypted_payload = 'encrypted-source-ciphertext'
     AND governance_owner_name = 'Owner Governanca'
     AND processing_agreement_recorded_by = '92000000-0000-0000-0000-000000000001'
     AND source_row_count = 1
     AND canonical_counts->>'students' = '1'
     AND canonical_fingerprint_sha256 = repeat('a', 64)
     AND governance_fingerprint_sha256 = repeat('b', 64)
   FROM public.pilot_import_batches
   WHERE id = '90000000-0000-0000-0000-000000000001'),
  'governance, encryption, counts, and fingerprints are persisted'
);

SELECT pg_temp.insert_rejection_batch(
  '90000000-0000-0000-0000-000000000002',
  'governance-rejection-success',
  '96000000-0000-0000-0000-000000000001',
  'DPA-SYN-REJECTION-001'
);
SELECT pg_temp.insert_rejection_batch(
  '90000000-0000-0000-0000-000000000003',
  'governance-rejection-audit-failure',
  '96000000-0000-0000-0000-000000000002',
  'DPA-SYN-REJECTION-002'
);

SELECT pg_temp.assert_true(
  has_function_privilege(
    'service_role',
    'public.pilot_reject_synthetic_import_batch(uuid,uuid,text,text,jsonb)',
    'EXECUTE'
  )
    AND NOT has_function_privilege(
      'authenticated',
      'public.pilot_reject_synthetic_import_batch(uuid,uuid,text,text,jsonb)',
      'EXECUTE'
    ),
  'only the service role can execute the transactional rejection RPC'
);

DO $$
BEGIN
  BEGIN
    PERFORM public.pilot_reject_synthetic_import_batch(
      '90000000-0000-0000-0000-000000000002',
      '92000000-0000-0000-0000-000000000001',
      repeat('d', 64), repeat('e', 64), '{"decision":"rejected"}'::jsonb
    );
    RAISE EXCEPTION 'maker rejected their own import';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM LIKE 'maker rejected their own import' THEN RAISE; END IF;
    IF SQLERRM NOT LIKE 'PILOT_IMPORT_MAKER_CHECKER_DENIED:%' THEN RAISE; END IF;
  END;

  BEGIN
    PERFORM public.pilot_reject_synthetic_import_batch(
      '90000000-0000-0000-0000-000000000002',
      '92000000-0000-0000-0000-000000000003',
      repeat('d', 64), repeat('e', 64), '{"decision":"rejected"}'::jsonb
    );
    RAISE EXCEPTION 'director rejected an import from another school';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM LIKE 'director rejected an import from another school' THEN RAISE; END IF;
    IF SQLERRM NOT LIKE 'PILOT_IMPORT_APPROVER_DENIED:%' THEN RAISE; END IF;
  END;

  BEGIN
    PERFORM public.pilot_reject_synthetic_import_batch(
      '90000000-0000-0000-0000-000000000002',
      '92000000-0000-0000-0000-000000000004',
      repeat('d', 64), repeat('e', 64), '{"decision":"rejected"}'::jsonb
    );
    RAISE EXCEPTION 'inactive director rejected an import';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM LIKE 'inactive director rejected an import' THEN RAISE; END IF;
    IF SQLERRM NOT LIKE 'PILOT_IMPORT_APPROVER_DENIED:%' THEN RAISE; END IF;
  END;
END;
$$;

UPDATE public.pilot_data_treatment_agreements
SET confirmed = false, confirmed_at = NULL, confirmed_by = NULL
WHERE id = '96000000-0000-0000-0000-000000000001';
DO $$
BEGIN
  BEGIN
    PERFORM public.pilot_reject_synthetic_import_batch(
      '90000000-0000-0000-0000-000000000002',
      '92000000-0000-0000-0000-000000000002',
      repeat('d', 64), repeat('e', 64), '{"decision":"rejected"}'::jsonb
    );
    RAISE EXCEPTION 'rejection accepted a withdrawn treatment agreement';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM LIKE 'rejection accepted a withdrawn treatment agreement' THEN RAISE; END IF;
    IF SQLERRM NOT LIKE 'PILOT_IMPORT_TREATMENT_AGREEMENT_REQUIRED:%' THEN RAISE; END IF;
  END;
END;
$$;
UPDATE public.pilot_data_treatment_agreements
SET confirmed = true,
    confirmed_at = now(),
    confirmed_by = '92000000-0000-0000-0000-000000000001'
WHERE id = '96000000-0000-0000-0000-000000000001';

CREATE TEMP TABLE rejection_receipt AS
SELECT *
FROM public.pilot_reject_synthetic_import_batch(
  '90000000-0000-0000-0000-000000000002',
  '92000000-0000-0000-0000-000000000002',
  repeat('d', 64), repeat('e', 64),
  '{"decision":"rejected","governance_recorded":true}'::jsonb
);
SELECT pg_temp.assert_true(
  (SELECT rejected.status = 'rejected'
       AND rejected.cleaned_at IS NULL
       AND rejected.raw_expires_at > now()
       AND rejected.audit_id IS NOT NULL
       AND EXISTS (
         SELECT 1
         FROM public.pilot_audit_log AS audit
         WHERE audit.id = rejected.audit_id
           AND audit.event_type = 'import_rejected'
           AND audit.entity_id = rejected.batch_id::text
       )
   FROM rejection_receipt AS rejected),
  'rejection atomically returns the acknowledged audit receipt'
);
SELECT pg_temp.assert_true(
  (SELECT status = 'rejected'
       AND approved_by = '92000000-0000-0000-0000-000000000002'
       AND approved_by_name = 'Diretora Governanca'
       AND encrypted_payload = 'rejection-ciphertext'
       AND iv = 'rejection-iv'
       AND auth_tag = 'rejection-tag'
       AND cleaned_at IS NULL
       AND governance_fingerprint_sha256 = repeat('e', 64)
   FROM public.pilot_import_batches
   WHERE id = '90000000-0000-0000-0000-000000000002')
    AND (SELECT decision = 'rejected'
           AND approved_by = '92000000-0000-0000-0000-000000000002'
           AND decided_at = (
             SELECT approved_at FROM public.pilot_import_batches
             WHERE id = '90000000-0000-0000-0000-000000000002'
           )
         FROM public.pilot_import_approvals
         WHERE batch_id = '90000000-0000-0000-0000-000000000002'),
  'rejected batch, decision, governance, and ciphertext retention are consistent'
);

CREATE FUNCTION pg_temp.fail_import_rejection_audit()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'forced import rejection audit failure';
END;
$$;
CREATE TRIGGER fail_import_rejection_audit
BEFORE INSERT ON public.pilot_audit_log
FOR EACH ROW
WHEN (NEW.event_type = 'import_rejected')
EXECUTE FUNCTION pg_temp.fail_import_rejection_audit();
DO $$
BEGIN
  BEGIN
    PERFORM public.pilot_reject_synthetic_import_batch(
      '90000000-0000-0000-0000-000000000003',
      '92000000-0000-0000-0000-000000000002',
      repeat('f', 64), repeat('a', 64), '{"decision":"rejected"}'::jsonb
    );
    RAISE EXCEPTION 'rejection survived a failed audit insert';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM LIKE 'rejection survived a failed audit insert' THEN RAISE; END IF;
    IF SQLERRM NOT LIKE 'forced import rejection audit failure' THEN RAISE; END IF;
  END;
END;
$$;
DROP TRIGGER fail_import_rejection_audit ON public.pilot_audit_log;
SELECT pg_temp.assert_true(
  (SELECT status = 'pending_approval'
       AND approved_by IS NULL
       AND governance_fingerprint_sha256 IS NULL
       AND encrypted_payload = 'rejection-ciphertext'
   FROM public.pilot_import_batches
   WHERE id = '90000000-0000-0000-0000-000000000003')
    AND NOT EXISTS (
      SELECT 1 FROM public.pilot_import_approvals
      WHERE batch_id = '90000000-0000-0000-0000-000000000003'
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.pilot_audit_log
      WHERE event_type = 'import_rejected'
        AND entity_id = '90000000-0000-0000-0000-000000000003'
    ),
  'audit failure rolls back rejection state, decision, and governance together'
);

SELECT pg_temp.assert_true(
  public.pilot_cleanup_import_retention() = 0
    AND (SELECT encrypted_payload = 'rejection-ciphertext' AND cleaned_at IS NULL
         FROM public.pilot_import_batches
         WHERE id = '90000000-0000-0000-0000-000000000002'),
  'retention cleanup preserves rejected ciphertext before raw expiry'
);
UPDATE public.pilot_import_batches
SET raw_expires_at = now() - interval '1 minute'
WHERE id = '90000000-0000-0000-0000-000000000002';
CREATE TEMP TABLE rejection_cleanup_receipt AS
SELECT public.pilot_cleanup_import_retention() AS cleaned_count;
SELECT pg_temp.assert_true(
  (SELECT cleaned_count = 1 FROM rejection_cleanup_receipt)
    AND (SELECT status = 'rejected'
           AND encrypted_payload IS NULL
           AND iv IS NULL
           AND auth_tag IS NULL
           AND cleaned_at IS NOT NULL
         FROM public.pilot_import_batches
         WHERE id = '90000000-0000-0000-0000-000000000002'),
  'retention cleanup removes rejected ciphertext only after raw expiry'
);

DO $$
BEGIN
  BEGIN
    UPDATE public.alunos
    SET pilot_import_batch_id = NULL
    WHERE id = '95000000-0000-0000-0000-000000000001';
    RAISE EXCEPTION 'batch immutability deliberate break did not turn red';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM NOT LIKE 'PILOT_IMPORT_BATCH_IMMUTABLE:%' THEN RAISE; END IF;
  END;
END $$;

SELECT pg_temp.assert_true(
  (SELECT final_status = 'rolled_back'
     AND deleted_enrollments = 1
     AND deleted_relationships = 1
     AND deleted_students = 1
     AND deleted_guardians = 1
   FROM public.pilot_rollback_import_batch(
     '90000000-0000-0000-0000-000000000001',
     '92000000-0000-0000-0000-000000000002',
     'synthetic governance rollback rehearsal'
   )),
  'proof rollback reports every deleted canonical row'
);
SELECT pg_temp.assert_true(
  (SELECT status = 'rolled_back'
     AND encrypted_payload IS NULL
     AND rolled_back_by = '92000000-0000-0000-0000-000000000002'
   FROM public.pilot_import_batches
   WHERE id = '90000000-0000-0000-0000-000000000001'),
  'rollback clears ciphertext and records the named actor'
);
SELECT pg_temp.assert_true(
  (SELECT count(*) = 0 FROM public.alunos WHERE pilot_import_batch_id = '90000000-0000-0000-0000-000000000001')
  AND (SELECT count(*) = 0 FROM public.responsaveis WHERE pilot_import_batch_id = '90000000-0000-0000-0000-000000000001')
  AND (SELECT count(*) = 1 FROM public.pilot_data_tombstones WHERE entity_type = 'pilot_import_batch' AND source_fingerprint = 'governance-valid-sha256'),
  'rollback leaves no canonical rows and writes a tombstone'
);

ROLLBACK;
