BEGIN;

CREATE FUNCTION pg_temp.assert_true(condition boolean, message text)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF condition IS DISTINCT FROM true THEN RAISE EXCEPTION 'assertion failed: %', message; END IF;
END;
$$;

INSERT INTO public.escolas(id, codigo, nome, tipo, ativo)
VALUES ('91000000-0000-0000-0000-000000000001', 'SYN-GOV', 'Escola Governanca Sintetica', 'fundamental', true);
INSERT INTO public.users(id, nome, email, tipo_usuario, escola_id, ativo, primeiro_login, senha_padrao)
VALUES
  ('92000000-0000-0000-0000-000000000001', 'Secretaria Governanca', 'secretaria.governanca@synthetic.invalid', 'secretario', NULL, true, false, false),
  ('92000000-0000-0000-0000-000000000002', 'Diretora Governanca', 'diretora.governanca@synthetic.invalid', 'diretor', '91000000-0000-0000-0000-000000000001', true, false, false);
INSERT INTO public.turmas(id, import_source_id, nome, serie, turno, ano_letivo, capacidade, escola_id, ativo)
VALUES ('93000000-0000-0000-0000-000000000001', 'SYN-GOV-CLASS', 'Turma Governanca', '1 ano', 'matutino', 2026, 30, '91000000-0000-0000-0000-000000000001', true);

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
