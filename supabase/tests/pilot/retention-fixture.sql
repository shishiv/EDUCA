-- Synthetic fixture shared by the SQL contract and the isolated import proof.
-- The caller owns the transaction and the disposable database.
CREATE FUNCTION pg_temp.retention_id(kind integer, number integer) RETURNS uuid
LANGUAGE sql IMMUTABLE AS $$
  SELECT ('f8' || lpad(kind::text, 6, '0') || '-0000-4000-8000-' || lpad(number::text, 12, '0'))::uuid;
$$;

INSERT INTO public.escolas(id, codigo, nome, tipo, ativo)
SELECT pg_temp.retention_id(1, n), 'SYN-F08-' || n, 'Escola sintetica F08 ' || n, 'creche', true
FROM generate_series(1, 2) n;
INSERT INTO public.users(id, nome, email, tipo_usuario, escola_id, ativo)
VALUES
  (pg_temp.retention_id(2, 1), 'Secretaria sintetica F08', 'secretaria.f08@synthetic.invalid', 'secretario', NULL, true),
  (pg_temp.retention_id(2, 2), 'Diretora sintetica F08', 'diretora.f08@synthetic.invalid', 'diretor', pg_temp.retention_id(1, 1), true),
  (pg_temp.retention_id(2, 3), 'Docente sintetica F08', 'docente.f08@synthetic.invalid', 'professor', pg_temp.retention_id(1, 1), true);
INSERT INTO public.pilot_data_treatment_agreements(id, escola_id, reference, version, confirmed, confirmed_at, confirmed_by)
SELECT pg_temp.retention_id(3, n), pg_temp.retention_id(1, n), 'SYN-F08', 'v1', true, now(), pg_temp.retention_id(2, 1)
FROM generate_series(1, 2) n;
INSERT INTO public.turmas(id, escola_id, nome, serie, turno, ano_letivo, professor_id, ativo)
SELECT pg_temp.retention_id(4, n), pg_temp.retention_id(1, n), 'Turma sintetica F08', 'Creche', 'matutino', 2026,
  CASE WHEN n = 1 THEN pg_temp.retention_id(2, 3) END, true
FROM generate_series(1, 2) n;

INSERT INTO public.pilot_import_batches (
  id, escola_id, dataset, idempotency_key, content_sha256, encryption_key_id,
  encrypted_payload, iv, auth_tag, validation_report, status, submitted_by, approved_by,
  approved_at, import_target, source_mode, governance_owner_name, governance_owner_email,
  governance_owner_user_id, governance_owner_authorized_at, approved_by_name, approved_by_email,
  processing_agreement_id, processing_agreement_confirmed, processing_agreement_reference,
  processing_agreement_version, processing_agreement_recorded_at, processing_agreement_recorded_by,
  retention_policy, raw_expires_at, rollback_until, canonical_expires_at,
  source_row_count, canonical_counts, canonical_fingerprint_sha256, governance_fingerprint_sha256
)
SELECT pg_temp.retention_id(5, n), pg_temp.retention_id(1, CASE WHEN n = 3 THEN 2 ELSE 1 END),
  'students', 'synthetic-f08-' || n, encode(sha256(('synthetic-f08-' || n)::bytea), 'hex'), 'synthetic-f08',
  'ciphertext-synthetic-f08', 'iv-synthetic-f08', 'tag-synthetic-f08', '{}', 'published',
  pg_temp.retention_id(2, 1), pg_temp.retention_id(2, 2), now() - interval '40 days',
  CASE WHEN n IN (2, 5, 7, 8) THEN 'synthetic_local' ELSE 'isolated_proof' END,
  CASE WHEN n = 8 THEN 'real' ELSE 'synthetic' END,
  'Owner sintetico F08', 'owner.f08@synthetic.invalid', pg_temp.retention_id(2, 1), now(),
  'Diretora sintetica F08', 'diretora.f08@synthetic.invalid',
  pg_temp.retention_id(3, CASE WHEN n = 3 THEN 2 ELSE 1 END), true, 'SYN-F08', 'v1', now(), pg_temp.retention_id(2, 1),
  'synthetic-fixture-existing-deadlines',
  CASE WHEN n = 3 THEN now() + interval '1 day' ELSE now() - interval '30 days' END,
  CASE WHEN n = 3 THEN now() + interval '7 days' ELSE now() - interval '7 days' END,
  CASE WHEN n = 3 THEN now() + interval '30 days' ELSE now() - interval '1 day' END,
  1, jsonb_build_object('students', CASE WHEN n = 9 THEN 2 ELSE 1 END,
    'guardians', 1, 'relationships', 1, 'enrollments', 1), repeat('a', 64), repeat('b', 64)
FROM generate_series(1, 10) n;

INSERT INTO public.responsaveis(id, escola_id, nome, parentesco, ativo, pilot_import_batch_id)
SELECT pg_temp.retention_id(6, n), pg_temp.retention_id(1, CASE WHEN n = 3 THEN 2 ELSE 1 END),
  'Responsavel sintetico F08', 'mae', true, pg_temp.retention_id(5, n)
FROM generate_series(1, 10) n;
INSERT INTO public.alunos(id, escola_id, nome_completo, data_nascimento, sexo, responsavel_id, ativo, pilot_import_batch_id)
SELECT pg_temp.retention_id(7, n), pg_temp.retention_id(1, CASE WHEN n = 3 THEN 2 ELSE 1 END),
  'Crianca sintetica F08', '2021-01-01', 'F', pg_temp.retention_id(6, n), true, pg_temp.retention_id(5, n)
FROM generate_series(1, 10) n;
INSERT INTO public.aluno_responsaveis(id, aluno_id, responsavel_id, tipo_responsabilidade, pilot_import_batch_id)
SELECT pg_temp.retention_id(8, n), pg_temp.retention_id(7, n), pg_temp.retention_id(6, n), 'mae', pg_temp.retention_id(5, n)
FROM generate_series(1, 10) n;
INSERT INTO public.matriculas(id, aluno_id, turma_id, ano_letivo, situacao, pilot_import_batch_id)
SELECT pg_temp.retention_id(9, n), pg_temp.retention_id(7, n), pg_temp.retention_id(4, CASE WHEN n = 3 THEN 2 ELSE 1 END),
  2026, 'ativa', pg_temp.retention_id(5, n)
FROM generate_series(1, 10) n;
-- Shared state has no import owner. It must not be swept up by batch 7.
INSERT INTO public.aluno_responsaveis(id, aluno_id, responsavel_id, tipo_responsabilidade)
VALUES (pg_temp.retention_id(8, 11), pg_temp.retention_id(7, 8), pg_temp.retention_id(6, 7), 'responsavel');

INSERT INTO public.sessoes_aula(id, turma_id, escola_id, professor_id, data_aula, conteudo_programatico, status)
VALUES (pg_temp.retention_id(10, 1), pg_temp.retention_id(4, 1), pg_temp.retention_id(1, 1),
  pg_temp.retention_id(2, 3), '2026-03-01', 'Sessao sintetica F08', 'ABERTA');
INSERT INTO public.frequencia(id, matricula_id, sessao_id, data_aula, presente, status_presenca)
VALUES (pg_temp.retention_id(11, 1), pg_temp.retention_id(9, 1), pg_temp.retention_id(10, 1), '2026-03-01', true, 'P');

SELECT set_config('request.jwt.claim.sub', pg_temp.retention_id(2, 2)::text, true);
SELECT public.set_school_academic_year(pg_temp.retention_id(1, 1), 2026, '2026-01-01', '2026-12-31');
SELECT public.set_school_periods(pg_temp.retention_id(1, 1), 2026,
  '[{"chave":"primeiro","nome":"Periodo sintetico F08","data_inicio":"2026-01-01","data_fim":"2026-06-30"}]');
SELECT set_config('request.jwt.claim.sub', pg_temp.retention_id(2, 3)::text, true);
INSERT INTO public.vivencias(id, escola_id, aluno_id, matricula_id, turma_id, professor_id,
  data_vivencia, campos_experiencia, descricao, created_by, updated_by)
SELECT pg_temp.retention_id(12, n), pg_temp.retention_id(1, 1), pg_temp.retention_id(7, n),
  pg_temp.retention_id(9, n), pg_temp.retention_id(4, 1), pg_temp.retention_id(2, 3),
  '2026-03-01', ARRAY['eu'], 'Vivencia sintetica protegida F08', pg_temp.retention_id(2, 3), pg_temp.retention_id(2, 3)
FROM unnest(ARRAY[4, 5]) n;
INSERT INTO public.relatorios_descritivos(id, matricula_id, turma_id, professor_id, ano_letivo, semestre, status,
  campo_eu_outro_nos, campo_corpo_gestos, campo_tracos_sons, campo_escuta_fala, campo_espacos_tempos, created_by)
VALUES (pg_temp.retention_id(13, 4), pg_temp.retention_id(9, 4), pg_temp.retention_id(4, 1), pg_temp.retention_id(2, 3),
  2026, 'primeiro', 'rascunho', repeat('a', 50), repeat('b', 50), repeat('c', 50), repeat('d', 50), repeat('e', 50), pg_temp.retention_id(2, 3));
INSERT INTO public.relatorios_descritivos_vivencias(relatorio_id, vivencia_id, escola_id, created_by)
VALUES (pg_temp.retention_id(13, 4), pg_temp.retention_id(12, 4), pg_temp.retention_id(1, 1), pg_temp.retention_id(2, 3));
UPDATE public.relatorios_descritivos SET status = 'finalizado' WHERE id = pg_temp.retention_id(13, 4);
SELECT set_config('request.jwt.claim.sub', '', true);

-- Fault injection happens after relationship and enrollment DELETEs. The
-- exception must roll those changes back and never leak this message to receipts.
CREATE FUNCTION pg_temp.retention_injected_failure() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.id = pg_temp.retention_id(7, 6) THEN
    RAISE EXCEPTION 'private-f08-error: child name and CSV must not escape';
  END IF;
  RETURN OLD;
END;
$$;
CREATE TRIGGER retention_injected_failure BEFORE DELETE ON public.alunos
FOR EACH ROW EXECUTE FUNCTION pg_temp.retention_injected_failure();
