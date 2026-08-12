BEGIN;

CREATE FUNCTION pg_temp.assert_true(condition boolean, message text)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF condition IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'assertion failed: %', message;
  END IF;
END;
$$;

CREATE FUNCTION pg_temp.insert_isolated_batch(
  p_id uuid,
  p_content_sha256 text,
  p_target text,
  p_status text,
  p_rollback_until timestamptz,
  p_canonical_counts jsonb
)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO public.pilot_import_batches(
    id, escola_id, dataset, idempotency_key, content_sha256, encryption_key_id,
    encrypted_payload, iv, auth_tag, validation_report, status, submitted_by,
    approved_by, approved_at, import_target, source_mode, encryption_algorithm,
    governance_owner_name, governance_owner_email, submitted_by_name,
    submitted_by_email, approved_by_name, approved_by_email,
    processing_agreement_reference, processing_agreement_version,
    processing_agreement_recorded_at, processing_agreement_recorded_by,
    processing_agreement_recorded_by_name, processing_agreement_recorded_by_email,
    retention_policy, raw_expires_at, canonical_expires_at, rollback_until,
    source_row_count, canonical_counts, canonical_fingerprint_sha256,
    governance_fingerprint_sha256, governance_metadata
  ) VALUES (
    p_id, '96000000-0000-0000-0000-000000000001', 'students',
    'rollback-' || p_id::text, p_content_sha256, 'rollback-test-v1',
    'ciphertext-' || p_id::text, 'iv-' || p_id::text, 'tag-' || p_id::text,
    '{}'::jsonb, p_status, '97000000-0000-0000-0000-000000000001',
    '97000000-0000-0000-0000-000000000002', now(), p_target, 'synthetic',
    'aes-256-gcm', 'Owner Rollback Sintetico', 'owner.rollback@synthetic.invalid',
    'Secretaria Rollback Sintetica', 'secretaria.rollback@synthetic.invalid',
    'Diretora Rollback Sintetica', 'diretora.rollback@synthetic.invalid',
    'DPA-SYN-ROLLBACK-001', 'v1', now(),
    '97000000-0000-0000-0000-000000000001', 'Secretaria Rollback Sintetica',
    'secretaria.rollback@synthetic.invalid', 'proof-only-test',
    CASE WHEN p_rollback_until <= now()
      THEN p_rollback_until - interval '1 hour'
      ELSE now() + interval '1 day'
    END,
    now() + interval '30 days', p_rollback_until, 1, p_canonical_counts,
    repeat('a', 64), repeat('b', 64), '{}'::jsonb
  );
END;
$$;

CREATE FUNCTION pg_temp.assert_rollback_rejected(
  p_batch_id uuid,
  p_actor_id uuid,
  p_reason text,
  p_error_prefix text
)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  BEGIN
    PERFORM public.pilot_rollback_import_batch(p_batch_id, p_actor_id, p_reason);
    RAISE EXCEPTION 'rollback rejection did not turn red: %', p_error_prefix;
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM NOT LIKE p_error_prefix || '%' THEN
      RAISE;
    END IF;
  END;
END;
$$;

INSERT INTO public.escolas(id, codigo, nome, tipo, ativo)
VALUES ('96000000-0000-0000-0000-000000000001', 'SYN-ROLLBACK', 'Escola Rollback Sintetica', 'fundamental', true);
INSERT INTO public.users(id, nome, email, tipo_usuario, escola_id, ativo, primeiro_login, senha_padrao)
VALUES
  ('97000000-0000-0000-0000-000000000001', 'Secretaria Rollback Sintetica', 'secretaria.rollback@synthetic.invalid', 'secretario', NULL, true, false, false),
  ('97000000-0000-0000-0000-000000000002', 'Diretora Rollback Sintetica', 'diretora.rollback@synthetic.invalid', 'diretor', '96000000-0000-0000-0000-000000000001', true, false, false);
INSERT INTO public.turmas(id, import_source_id, nome, serie, turno, ano_letivo, capacidade, escola_id, ativo)
VALUES ('98000000-0000-0000-0000-000000000001', 'SYN-ROLLBACK-CLASS', 'Turma Rollback Sintetica', '1 ano', 'matutino', 2026, 30, '96000000-0000-0000-0000-000000000001', true);

CREATE SCHEMA storage;
CREATE TABLE storage.buckets (
  id text PRIMARY KEY,
  name text NOT NULL,
  public boolean NOT NULL DEFAULT false
);
CREATE TABLE storage.objects (
  id uuid PRIMARY KEY,
  bucket_id text NOT NULL REFERENCES storage.buckets(id),
  name text NOT NULL,
  metadata jsonb,
  user_metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT USAGE ON SCHEMA storage TO service_role;
GRANT ALL ON storage.buckets, storage.objects TO service_role;
INSERT INTO storage.buckets(id, name, public)
VALUES ('pilot-import-staging', 'pilot-import-staging', false);

SELECT pg_temp.insert_isolated_batch(
  '99000000-0000-0000-0000-000000000001',
  repeat('c', 64),
  'isolated_proof',
  'published',
  now() + interval '7 days',
  '{"sourceRows":1,"students":1,"guardians":1,"relationships":1,"enrollments":1,"storageObjects":1}'::jsonb
);
SELECT pg_temp.insert_isolated_batch(
  '99000000-0000-0000-0000-000000000002',
  repeat('d', 64),
  'isolated_proof',
  'published',
  now() + interval '7 days',
  '{"sourceRows":1,"students":1,"guardians":1,"relationships":1,"enrollments":1,"storageObjects":1}'::jsonb
);
SELECT pg_temp.insert_isolated_batch(
  '99000000-0000-0000-0000-000000000003',
  repeat('e', 64),
  'synthetic_local',
  'published',
  now() + interval '7 days',
  '{}'::jsonb
);
SELECT pg_temp.insert_isolated_batch(
  '99000000-0000-0000-0000-000000000004',
  repeat('f', 64),
  'isolated_proof',
  'published',
  now() - interval '1 hour',
  '{}'::jsonb
);

INSERT INTO public.responsaveis(
  id, escola_id, import_source_id, nome, parentesco, telefone, ativo, pilot_import_batch_id
) VALUES
  ('99100000-0000-0000-0000-000000000001', '96000000-0000-0000-0000-000000000001', 'proof:rollback:guardian-a', 'Responsavel Rollback A', 'mae', '11999991001', true, '99000000-0000-0000-0000-000000000001'),
  ('99100000-0000-0000-0000-000000000002', '96000000-0000-0000-0000-000000000001', 'proof:rollback:guardian-b', 'Responsavel Rollback B', 'pai', '11999991002', true, '99000000-0000-0000-0000-000000000002');
INSERT INTO public.alunos(
  id, escola_id, import_source_id, nome_completo, data_nascimento, sexo,
  responsavel_id, ativo, pilot_import_batch_id
) VALUES
  ('99200000-0000-0000-0000-000000000001', '96000000-0000-0000-0000-000000000001', 'proof:rollback:student-a', 'Aluno Rollback A', '2018-05-20', 'M', '99100000-0000-0000-0000-000000000001', true, '99000000-0000-0000-0000-000000000001'),
  ('99200000-0000-0000-0000-000000000002', '96000000-0000-0000-0000-000000000001', 'proof:rollback:student-b', 'Aluno Rollback B', '2018-06-21', 'F', '99100000-0000-0000-0000-000000000002', true, '99000000-0000-0000-0000-000000000002');
INSERT INTO public.aluno_responsaveis(aluno_id, responsavel_id, tipo_responsabilidade, pilot_import_batch_id)
VALUES
  ('99200000-0000-0000-0000-000000000001', '99100000-0000-0000-0000-000000000001', 'mae', '99000000-0000-0000-0000-000000000001'),
  ('99200000-0000-0000-0000-000000000002', '99100000-0000-0000-0000-000000000002', 'pai', '99000000-0000-0000-0000-000000000002');
INSERT INTO public.matriculas(id, aluno_id, turma_id, ano_letivo, situacao, pilot_import_batch_id)
VALUES
  ('99500000-0000-0000-0000-000000000001', '99200000-0000-0000-0000-000000000001', '98000000-0000-0000-0000-000000000001', 2026, 'ativa', '99000000-0000-0000-0000-000000000001'),
  ('99500000-0000-0000-0000-000000000002', '99200000-0000-0000-0000-000000000002', '98000000-0000-0000-0000-000000000001', 2026, 'ativa', '99000000-0000-0000-0000-000000000002');
INSERT INTO storage.objects(id, bucket_id, name, metadata, user_metadata)
VALUES
  ('99300000-0000-0000-0000-000000000001', 'pilot-import-staging', 'proof/99000000-0000-0000-0000-000000000001/source.csv', jsonb_build_object('pilot_import_batch_id', '99000000-0000-0000-0000-000000000001', 'pilot_import_object_fingerprint', repeat('1', 64)), jsonb_build_object('pilot_import_batch_id', '99000000-0000-0000-0000-000000000001', 'pilot_import_object_fingerprint', repeat('1', 64))),
  ('99300000-0000-0000-0000-000000000002', 'pilot-import-staging', 'proof/99000000-0000-0000-0000-000000000002/source.csv', jsonb_build_object('pilot_import_batch_id', '99000000-0000-0000-0000-000000000002', 'pilot_import_object_fingerprint', repeat('2', 64)), jsonb_build_object('pilot_import_batch_id', '99000000-0000-0000-0000-000000000002', 'pilot_import_object_fingerprint', repeat('2', 64)));
INSERT INTO public.sessoes_aula(
  id, turma_id, escola_id, professor_id, data_aula, conteudo_programatico, status
) VALUES (
  '99600000-0000-0000-0000-000000000001',
  '98000000-0000-0000-0000-000000000001',
  '96000000-0000-0000-0000-000000000001',
  '97000000-0000-0000-0000-000000000002',
  '2026-08-12', 'synthetic dependency session', 'ABERTA'
);

SET LOCAL ROLE service_role;

-- Missing, demo-target, wrong-target, and expired batches are rejected before mutation.
SELECT pg_temp.assert_rollback_rejected(
  '99000000-0000-0000-0000-000000000099',
  '97000000-0000-0000-0000-000000000002',
  'missing batch rejection',
  'PILOT_IMPORT_ROLLBACK_BATCH_NOT_FOUND'
);
SELECT pg_temp.assert_rollback_rejected(
  '99000000-0000-0000-0000-000000000003',
  '97000000-0000-0000-0000-000000000002',
  'synthetic demo target rejection',
  'PILOT_IMPORT_ROLLBACK_TARGET_DENIED'
);
SELECT pg_temp.assert_rollback_rejected(
  '99000000-0000-0000-0000-000000000004',
  '97000000-0000-0000-0000-000000000002',
  'expired rollback rejection',
  'PILOT_IMPORT_ROLLBACK_EXPIRED'
);
SELECT pg_temp.assert_true(
  (SELECT status = 'published' AND encrypted_payload IS NOT NULL AND iv IS NOT NULL AND auth_tag IS NOT NULL
   FROM public.pilot_import_batches
   WHERE id = '99000000-0000-0000-0000-000000000004'),
  'rejected batches remain unchanged'
);

-- Attendance dependency is checked before any canonical or Storage mutation.
SAVEPOINT attendance_dependency_rejection;
INSERT INTO public.frequencia(id, matricula_id, sessao_id, data_aula, presente, status_presenca)
VALUES ('99400000-0000-0000-0000-000000000001', '99500000-0000-0000-0000-000000000001', '99600000-0000-0000-0000-000000000001', '2026-08-12', true, 'P');
SELECT pg_temp.assert_rollback_rejected(
  '99000000-0000-0000-0000-000000000001',
  '97000000-0000-0000-0000-000000000002',
  'attendance dependency rejection',
  'PILOT_IMPORT_ROLLBACK_DEPENDENCY'
);
SELECT pg_temp.assert_true(
  (SELECT count(*) = 1 FROM public.alunos WHERE pilot_import_batch_id = '99000000-0000-0000-0000-000000000001')
    AND (SELECT count(*) = 1 FROM storage.objects WHERE coalesce(user_metadata->>'pilot_import_batch_id', metadata->>'pilot_import_batch_id') = '99000000-0000-0000-0000-000000000001')
    AND (SELECT status = 'published' FROM public.pilot_import_batches WHERE id = '99000000-0000-0000-0000-000000000001'),
  'attendance rejection leaves the batch untouched'
);
ROLLBACK TO SAVEPOINT attendance_dependency_rejection;

-- A guardian linked by another batch is checked before any mutation.
SAVEPOINT shared_guardian_rejection;
INSERT INTO public.aluno_responsaveis(aluno_id, responsavel_id, tipo_responsabilidade, pilot_import_batch_id)
VALUES ('99200000-0000-0000-0000-000000000002', '99100000-0000-0000-0000-000000000001', 'responsavel', '99000000-0000-0000-0000-000000000002');
SELECT pg_temp.assert_rollback_rejected(
  '99000000-0000-0000-0000-000000000001',
  '97000000-0000-0000-0000-000000000002',
  'shared guardian rejection',
  'PILOT_IMPORT_ROLLBACK_SHARED_GUARDIAN'
);
SELECT pg_temp.assert_true(
  (SELECT count(*) = 1 FROM public.alunos WHERE pilot_import_batch_id = '99000000-0000-0000-0000-000000000001')
    AND (SELECT count(*) = 1 FROM storage.objects WHERE coalesce(user_metadata->>'pilot_import_batch_id', metadata->>'pilot_import_batch_id') = '99000000-0000-0000-0000-000000000001')
    AND (SELECT status = 'published' FROM public.pilot_import_batches WHERE id = '99000000-0000-0000-0000-000000000001'),
  'shared guardian rejection leaves the batch untouched'
);
ROLLBACK TO SAVEPOINT shared_guardian_rejection;

-- Deliberately removing one batch association must turn the independent oracle red.
SAVEPOINT deliberate_batch_association_break;
RESET ROLE;
ALTER TABLE public.alunos DISABLE TRIGGER pilot_import_batch_immutable;
UPDATE public.alunos
SET pilot_import_batch_id = NULL
WHERE id = '99200000-0000-0000-0000-000000000002';
ALTER TABLE public.alunos ENABLE TRIGGER pilot_import_batch_immutable;
SET LOCAL ROLE service_role;
SELECT pg_temp.assert_rollback_rejected(
  '99000000-0000-0000-0000-000000000002',
  '97000000-0000-0000-0000-000000000002',
  'deliberate missing batch association',
  'PILOT_IMPORT_ROLLBACK_OWNERSHIP_GAP'
);
SELECT pg_temp.assert_true(
  (SELECT status = 'published' FROM public.pilot_import_batches WHERE id = '99000000-0000-0000-0000-000000000002')
    AND (SELECT count(*) = 1 FROM public.responsaveis WHERE pilot_import_batch_id = '99000000-0000-0000-0000-000000000002')
    AND (SELECT count(*) = 1 FROM storage.objects WHERE coalesce(user_metadata->>'pilot_import_batch_id', metadata->>'pilot_import_batch_id') = '99000000-0000-0000-0000-000000000002'),
  'deliberate association break did not mutate another batch'
);
ROLLBACK TO SAVEPOINT deliberate_batch_association_break;

-- A valid rollback removes exactly one batch, clears all ciphertext parts, and preserves evidence.
SELECT pg_temp.assert_true(
  (SELECT final_status = 'rolled_back'
     AND deleted_enrollments = 1
     AND deleted_relationships = 1
     AND deleted_students = 1
     AND deleted_guardians = 1
     AND deleted_storage_objects = 1
     AND cardinality(storage_object_fingerprints) = 1
   FROM public.pilot_rollback_import_batch(
     '99000000-0000-0000-0000-000000000001',
     '97000000-0000-0000-0000-000000000002',
     'synthetic isolated rollback positive case'
   )),
  'valid rollback returns exact canonical and Storage counts'
);
SELECT pg_temp.assert_true(
  (SELECT status = 'rolled_back'
          AND encrypted_payload IS NULL
          AND iv IS NULL
          AND auth_tag IS NULL
          AND rolled_back_by = '97000000-0000-0000-0000-000000000002'
   FROM public.pilot_import_batches
   WHERE id = '99000000-0000-0000-0000-000000000001'),
  'valid rollback clears ciphertext, IV, and tag'
);
SELECT pg_temp.assert_true(
  (SELECT count(*) = 0 FROM public.alunos WHERE pilot_import_batch_id = '99000000-0000-0000-0000-000000000001')
    AND (SELECT count(*) = 0 FROM public.responsaveis WHERE pilot_import_batch_id = '99000000-0000-0000-0000-000000000001')
    AND (SELECT count(*) = 0 FROM public.aluno_responsaveis WHERE pilot_import_batch_id = '99000000-0000-0000-0000-000000000001')
    AND (SELECT count(*) = 0 FROM public.matriculas WHERE pilot_import_batch_id = '99000000-0000-0000-0000-000000000001')
    AND (SELECT count(*) = 0 FROM storage.objects WHERE coalesce(user_metadata->>'pilot_import_batch_id', metadata->>'pilot_import_batch_id') = '99000000-0000-0000-0000-000000000001'),
  'valid rollback removes only rows and Storage objects owned by the requested batch'
);
SELECT pg_temp.assert_true(
  (SELECT status = 'published' FROM public.pilot_import_batches WHERE id = '99000000-0000-0000-0000-000000000002')
    AND (SELECT count(*) = 1 FROM public.alunos WHERE pilot_import_batch_id = '99000000-0000-0000-0000-000000000002')
    AND (SELECT count(*) = 1 FROM public.responsaveis WHERE pilot_import_batch_id = '99000000-0000-0000-0000-000000000002')
    AND (SELECT count(*) = 1 FROM public.aluno_responsaveis WHERE pilot_import_batch_id = '99000000-0000-0000-0000-000000000002')
    AND (SELECT count(*) = 1 FROM public.matriculas WHERE pilot_import_batch_id = '99000000-0000-0000-0000-000000000002')
    AND (SELECT count(*) = 1 FROM storage.objects WHERE coalesce(user_metadata->>'pilot_import_batch_id', metadata->>'pilot_import_batch_id') = '99000000-0000-0000-0000-000000000002'),
  'rollback does not change another batch'
);
SELECT pg_temp.assert_true(
  (SELECT count(*) = 1
     AND bool_and(NOT (redacted_metadata ?| ARRAY['cpf','nis','rg','password','senha','health','saude','deficiencia','race','cor_raca']))
     AND bool_and(redacted_metadata->>'deleted_storage_objects' = '1')
   FROM public.pilot_audit_log
   WHERE event_type = 'import_rolled_back'
     AND entity_type = 'pilot_import_batch'
     AND entity_id = '99000000-0000-0000-0000-000000000001'),
  'rollback keeps one redacted audit receipt'
);
SELECT pg_temp.assert_true(
  (SELECT count(*) = 1
   FROM public.pilot_data_tombstones
   WHERE entity_type = 'pilot_import_batch'
     AND source_fingerprint = repeat('c', 64)
     AND reason_code = 'pilot_import_rollback'),
  'rollback keeps one tombstone'
);

SELECT pg_temp.assert_true(
  (SELECT final_status = 'rolled_back'
          AND deleted_enrollments = 0
          AND deleted_relationships = 0
          AND deleted_students = 0
          AND deleted_guardians = 0
          AND deleted_storage_objects = 0
          AND cardinality(storage_object_fingerprints) = 0
   FROM public.pilot_rollback_import_batch(
     '99000000-0000-0000-0000-000000000001',
     '97000000-0000-0000-0000-000000000002',
     'synthetic isolated rollback replay'
   )),
  'rollback replay is idempotent and reports zero mutations'
);
SELECT pg_temp.assert_true(
  (SELECT count(*) = 1 FROM public.pilot_data_tombstones WHERE entity_type = 'pilot_import_batch' AND source_fingerprint = repeat('c', 64))
    AND (SELECT count(*) = 1 FROM public.pilot_audit_log WHERE event_type = 'import_rolled_back' AND entity_id = '99000000-0000-0000-0000-000000000001'),
  'rollback replay does not duplicate tombstone or rollback audit'
);

ROLLBACK;
