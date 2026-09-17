BEGIN;
\ir ../pilot/retention-fixture.sql

CREATE FUNCTION pg_temp.assert_retention(ok boolean, message text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF ok IS DISTINCT FROM true THEN RAISE EXCEPTION 'F08_RETENTION_ASSERTION: %', message; END IF;
END;
$$;

CREATE FUNCTION pg_temp.retention_canonical_snapshot(n integer) RETURNS jsonb LANGUAGE sql AS $$
  SELECT jsonb_build_object(
    'students', (SELECT jsonb_agg(to_jsonb(a) ORDER BY id) FROM public.alunos a WHERE pilot_import_batch_id = pg_temp.retention_id(5, n)),
    'guardians', (SELECT jsonb_agg(to_jsonb(r) ORDER BY id) FROM public.responsaveis r WHERE pilot_import_batch_id = pg_temp.retention_id(5, n)),
    'relationships', (SELECT jsonb_agg(to_jsonb(r) ORDER BY id) FROM public.aluno_responsaveis r WHERE responsavel_id = pg_temp.retention_id(6, n)),
    'enrollments', (SELECT jsonb_agg(to_jsonb(m) ORDER BY id) FROM public.matriculas m WHERE pilot_import_batch_id = pg_temp.retention_id(5, n)),
    'attendance', (SELECT jsonb_agg(to_jsonb(f) ORDER BY id) FROM public.frequencia f WHERE matricula_id = pg_temp.retention_id(9, n)),
    'experiences', (SELECT jsonb_agg(to_jsonb(v) ORDER BY id) FROM public.vivencias v WHERE matricula_id = pg_temp.retention_id(9, n)),
    'fields', (SELECT jsonb_agg(to_jsonb(c) ORDER BY id) FROM public.vivencias_campos_experiencia c WHERE vivencia_id = pg_temp.retention_id(12, n)),
    'reports', (SELECT jsonb_agg(to_jsonb(r) ORDER BY id) FROM public.relatorios_descritivos r WHERE matricula_id = pg_temp.retention_id(9, n)),
    'sources', (SELECT jsonb_agg(to_jsonb(s) ORDER BY id) FROM public.relatorios_descritivos_vivencias s WHERE relatorio_id = pg_temp.retention_id(13, n))
  );
$$;
CREATE TEMP TABLE retention_before AS
SELECT n, pg_temp.retention_canonical_snapshot(n) AS snapshot FROM generate_series(1, 10) n;
CREATE TEMP TABLE retention_deadlines AS
SELECT id, raw_expires_at, canonical_expires_at, rollback_until, retention_policy, governance_metadata
FROM public.pilot_import_batches;
CREATE TEMP TABLE untouched_batches AS
SELECT * FROM public.pilot_import_batches WHERE id IN (pg_temp.retention_id(5, 3), pg_temp.retention_id(5, 8));
CREATE TEMP TABLE school_b_before AS
SELECT to_jsonb(e) AS school,
  (SELECT jsonb_agg(to_jsonb(t) ORDER BY id) FROM public.turmas t WHERE escola_id = e.id) AS classes,
  (SELECT jsonb_agg(to_jsonb(y) ORDER BY id) FROM public.anos_letivos y WHERE escola_id = e.id) AS years
FROM public.escolas e WHERE id = pg_temp.retention_id(1, 2);

SELECT pg_temp.assert_retention(
  (SELECT status = 'finalizado' AND fontes_snapshot IS NOT NULL FROM public.relatorios_descritivos WHERE id = pg_temp.retention_id(13, 4)),
  'fixture has a truly finalized report with a captured source');
SELECT pg_temp.assert_retention(
  NOT has_function_privilege('anon', 'public.pilot_cleanup_import_retention_results()', 'EXECUTE')
  AND NOT has_function_privilege('authenticated', 'public.pilot_cleanup_import_retention_results()', 'EXECUTE'),
  'detailed retention must not broaden browser access');

-- A receipt-write failure occurs after canonical deletion. Its outer
-- subtransaction must restore that batch without undoing other successes.
SAVEPOINT receipt_failure;
CREATE FUNCTION pg_temp.retention_audit_failure() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.event_type = 'import_retention_result' AND NEW.entity_id = pg_temp.retention_id(5, 2)::text THEN
    RAISE EXCEPTION 'private-f08-audit-error';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER retention_audit_failure BEFORE INSERT ON public.pilot_audit_log
FOR EACH ROW EXECUTE FUNCTION pg_temp.retention_audit_failure();
SET LOCAL ROLE service_role;
CREATE TEMP TABLE audit_failure_results AS SELECT * FROM public.pilot_cleanup_import_retention_results();
RESET ROLE;
SELECT pg_temp.assert_retention(
  (SELECT raw_payload_status = 'failed' AND canonical_status = 'failed' AND reason_code = 'batch_failed'
   FROM audit_failure_results WHERE batch_id = pg_temp.retention_id(5, 2))
  AND (SELECT snapshot = pg_temp.retention_canonical_snapshot(2) FROM retention_before WHERE n = 2)
  AND (SELECT encrypted_payload IS NOT NULL AND status = 'published' FROM public.pilot_import_batches WHERE id = pg_temp.retention_id(5, 2))
  AND (SELECT count(*) = 0 FROM public.pilot_data_tombstones WHERE source_fingerprint = encode(sha256('synthetic-f08-2'::bytea), 'hex'))
  AND (SELECT canonical_status = 'deleted' FROM audit_failure_results WHERE batch_id = pg_temp.retention_id(5, 10)),
  'receipt failure restores its batch and tombstone but not another successful cleanup');
ROLLBACK TO SAVEPOINT receipt_failure;

SET LOCAL ROLE service_role;
CREATE TEMP TABLE retention_results AS SELECT * FROM public.pilot_cleanup_import_retention_results();
RESET ROLE;
SELECT pg_temp.assert_retention(
  (SELECT jsonb_agg(jsonb_build_array(batch_id, raw_payload_status, canonical_status, reason_code) ORDER BY batch_id)
   FROM retention_results WHERE escola_id = pg_temp.retention_id(1, 1)) =
  (SELECT jsonb_agg(jsonb_build_array(pg_temp.retention_id(5, n), 'cleaned', outcome, reason) ORDER BY n)
   FROM (VALUES
     (1, 'preserved_dependency', 'dependency'), (2, 'deleted', 'retention_expired'),
     (4, 'preserved_dependency', 'dependency'), (5, 'preserved_dependency', 'dependency'),
     (6, 'failed', 'rollback_failed'), (7, 'preserved_dependency', 'dependency'),
     (9, 'failed', 'ownership_gap'), (10, 'deleted', 'retention_expired')
   ) expected(n, outcome, reason)),
  'expired batches have independent redacted outcomes, including failure before a later removable batch');
SELECT pg_temp.assert_retention((SELECT count(*) = 8 FROM retention_results), 'only due synthetic batches are attempted');
SELECT pg_temp.assert_retention(
  (SELECT bool_and(snapshot = pg_temp.retention_canonical_snapshot(n)) FROM retention_before WHERE n NOT IN (2, 10)),
  'blocked, failed, shared, real-mode sentinel and foreign-school rows remain byte-equivalent');
SELECT pg_temp.assert_retention(
  (SELECT bool_and(pg_temp.retention_canonical_snapshot(n) =
    '{"students":null,"guardians":null,"relationships":null,"enrollments":null,"attendance":null,"experiences":null,"fields":null,"reports":null,"sources":null}'::jsonb)
   FROM unnest(ARRAY[2, 10]) n),
  'both synthetic-local and proof-only independent batches are fully removed');
SELECT pg_temp.assert_retention(
  NOT EXISTS (SELECT * FROM untouched_batches EXCEPT SELECT * FROM public.pilot_import_batches),
  'school B and real-mode sentinel batches keep ciphertext, deadlines and state');
SELECT pg_temp.assert_retention(
  (SELECT to_jsonb(e) = b.school
    AND (SELECT jsonb_agg(to_jsonb(t) ORDER BY id) FROM public.turmas t WHERE escola_id = e.id) = b.classes
    AND (SELECT jsonb_agg(to_jsonb(y) ORDER BY id) FROM public.anos_letivos y WHERE escola_id = e.id) = b.years
   FROM public.escolas e CROSS JOIN school_b_before b WHERE e.id = pg_temp.retention_id(1, 2)),
  'school B school, classes and periods are intact');
SELECT pg_temp.assert_retention(
  NOT EXISTS (SELECT * FROM retention_deadlines EXCEPT SELECT id, raw_expires_at, canonical_expires_at, rollback_until, retention_policy, governance_metadata FROM public.pilot_import_batches),
  'no persisted retention deadline, policy or purpose is rewritten');
SELECT pg_temp.assert_retention(
  (SELECT count(*) = 8 AND bool_and(encrypted_payload IS NULL AND iv IS NULL AND auth_tag IS NULL)
   FROM public.pilot_import_batches WHERE id IN (SELECT batch_id FROM retention_results)),
  'raw expiry still removes the entire envelope even when canonical disposal is blocked');
SELECT pg_temp.assert_retention(
  (SELECT count(*) = 8 AND bool_and(redacted_metadata = jsonb_build_object(
    'raw_payload_status', r.raw_payload_status, 'canonical_status', r.canonical_status, 'reason_code', r.reason_code))
   FROM public.pilot_audit_log a JOIN retention_results r ON a.entity_id = r.batch_id::text
   WHERE a.event_type = 'import_retention_result'),
  'audit keeps exactly the allowlisted result, never exception messages or row content');
SELECT pg_temp.assert_retention(
  (SELECT count(*) = 2 FROM public.pilot_data_tombstones WHERE source_fingerprint IN
    (SELECT content_sha256 FROM public.pilot_import_batches WHERE id IN (pg_temp.retention_id(5, 2), pg_temp.retention_id(5, 10)))),
  'only eliminated batches have tombstones');

-- Retry does not resurrect ciphertext or duplicate successful rollback evidence.
SET LOCAL ROLE service_role;
SELECT pg_temp.assert_retention(public.pilot_cleanup_import_retention() = 0, 'legacy scalar retry reports no additional cleanup');
RESET ROLE;
SELECT pg_temp.assert_retention(
  (SELECT count(*) = 2 FROM public.pilot_audit_log WHERE event_type = 'import_rolled_back'
   AND entity_id IN (pg_temp.retention_id(5, 2)::text, pg_temp.retention_id(5, 10)::text)),
  'retry does not duplicate rollback audit');
SELECT pg_temp.assert_retention(
  (SELECT count(*) = 2 FROM public.pilot_data_tombstones WHERE source_fingerprint IN
    (SELECT content_sha256 FROM public.pilot_import_batches WHERE id IN (pg_temp.retention_id(5, 2), pg_temp.retention_id(5, 10)))),
  'retry does not duplicate tombstones');
SELECT pg_temp.assert_retention(
  (SELECT bool_and(snapshot = pg_temp.retention_canonical_snapshot(n)) FROM retention_before WHERE n NOT IN (2, 10)),
  'retry still protects canonical dependencies');

-- Removing only the injected fault permits recovery of the failed batch. No
-- dependency is discarded to turn the proof green.
DROP TRIGGER retention_injected_failure ON public.alunos;
SET LOCAL ROLE service_role;
CREATE TEMP TABLE retention_recovered AS SELECT * FROM public.pilot_cleanup_import_retention_results();
RESET ROLE;
SELECT pg_temp.assert_retention(
  (SELECT canonical_status = 'deleted' AND raw_payload_status = 'not_due' FROM retention_recovered WHERE batch_id = pg_temp.retention_id(5, 6))
  AND (SELECT count(*) = 1 FROM public.pilot_data_tombstones WHERE source_fingerprint = encode(sha256('synthetic-f08-6'::bytea), 'hex')),
  'failed batch can be retried independently without losing earlier results');

ROLLBACK;
