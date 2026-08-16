BEGIN;

-- Independent PostgreSQL contract for the governed pilot security boundary.
-- Every browser-role assertion runs as authenticated with a real JWT subject.
CREATE FUNCTION pg_temp.assert_true(condition boolean, message text)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  IF condition IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'assertion failed: %', message;
  END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- Synthetic fixture for two schools, three browser roles, and two classes in A
-- ---------------------------------------------------------------------------
INSERT INTO public.escolas(id, codigo, nome, tipo, ativo)
VALUES
  ('98000000-0000-0000-0000-000000000001', 'SEC-A', 'Escola Hardening A', 'fundamental', true),
  ('98000000-0000-0000-0000-000000000002', 'SEC-B', 'Escola Hardening B', 'fundamental', true);

INSERT INTO public.users(id, nome, email, tipo_usuario, escola_id, ativo, primeiro_login, senha_padrao)
VALUES
  ('98100000-0000-0000-0000-000000000001', 'Secretaria Hardening', 'secretaria.hardening@synthetic.invalid', 'secretario', NULL, true, false, false),
  ('98100000-0000-0000-0000-000000000002', 'Diretora Hardening A', 'diretora.hardening.a@synthetic.invalid', 'diretor', '98000000-0000-0000-0000-000000000001', true, false, false),
  ('98100000-0000-0000-0000-000000000003', 'Diretora Hardening B', 'diretora.hardening.b@synthetic.invalid', 'diretor', '98000000-0000-0000-0000-000000000002', true, false, false),
  ('98100000-0000-0000-0000-000000000004', 'Professor Hardening A', 'professor.hardening.a@synthetic.invalid', 'professor', '98000000-0000-0000-0000-000000000001', true, false, false);
INSERT INTO public.pilot_data_treatment_agreements(
  id, escola_id, reference, version, confirmed, confirmed_at, confirmed_by
) VALUES (
  '98800000-0000-0000-0000-000000000001',
  '98000000-0000-0000-0000-000000000001',
  'DPA-SYN-HARDENING-001', 'v1', true, now() - interval '1 minute',
  '98100000-0000-0000-0000-000000000001'
);

INSERT INTO public.turmas(id, nome, serie, turno, ano_letivo, escola_id, professor_id, ativo)
VALUES
  ('98200000-0000-0000-0000-000000000001', 'Turma Titular A', '1 ano', 'matutino', 2026, '98000000-0000-0000-0000-000000000001', '98100000-0000-0000-0000-000000000004', true),
  ('98200000-0000-0000-0000-000000000002', 'Turma Não Titular A', '2 ano', 'vespertino', 2026, '98000000-0000-0000-0000-000000000001', '98100000-0000-0000-0000-000000000002', true),
  ('98200000-0000-0000-0000-000000000003', 'Turma B', '1 ano', 'matutino', 2026, '98000000-0000-0000-0000-000000000002', '98100000-0000-0000-0000-000000000003', true);

INSERT INTO public.alunos(id, escola_id, nome_completo, data_nascimento, sexo, ativo)
VALUES
  ('98300000-0000-0000-0000-000000000001', '98000000-0000-0000-0000-000000000001', 'Aluno Hardening A1', DATE '2018-01-01', 'M', true),
  ('98300000-0000-0000-0000-000000000002', '98000000-0000-0000-0000-000000000001', 'Aluno Hardening A2', DATE '2018-02-01', 'F', true),
  ('98300000-0000-0000-0000-000000000003', '98000000-0000-0000-0000-000000000002', 'Aluno Hardening B1', DATE '2018-03-01', 'M', true);

INSERT INTO public.matriculas(id, aluno_id, turma_id, ano_letivo, situacao)
VALUES
  ('98400000-0000-0000-0000-000000000001', '98300000-0000-0000-0000-000000000001', '98200000-0000-0000-0000-000000000001', 2026, 'ativa'),
  ('98400000-0000-0000-0000-000000000002', '98300000-0000-0000-0000-000000000002', '98200000-0000-0000-0000-000000000002', 2026, 'ativa'),
  ('98400000-0000-0000-0000-000000000003', '98300000-0000-0000-0000-000000000003', '98200000-0000-0000-0000-000000000003', 2026, 'ativa');

INSERT INTO public.sessoes_aula(
  id, turma_id, escola_id, professor_id, data_aula, status,
  conteudo_programatico, aberta_em
)
VALUES
  ('98500000-0000-0000-0000-000000000001', '98200000-0000-0000-0000-000000000001', '98000000-0000-0000-0000-000000000001', '98100000-0000-0000-0000-000000000004', DATE '2026-08-10', 'ABERTA', 'Conteúdo titular', now()),
  ('98500000-0000-0000-0000-000000000002', '98200000-0000-0000-0000-000000000002', '98000000-0000-0000-0000-000000000001', '98100000-0000-0000-0000-000000000002', DATE '2026-08-10', 'ABERTA', 'Conteúdo não titular', now()),
  ('98500000-0000-0000-0000-000000000003', '98200000-0000-0000-0000-000000000003', '98000000-0000-0000-0000-000000000002', '98100000-0000-0000-0000-000000000003', DATE '2026-08-10', 'ABERTA', 'Conteúdo escola B', now());

INSERT INTO public.conteudo_aula(
  id, sessao_id, tema, objetivo, habilidades_bncc, created_by
)
VALUES (
  '98600000-0000-0000-0000-000000000001',
  '98500000-0000-0000-0000-000000000002',
  'Conteúdo não titular',
  'Provar o limite de turma',
  ARRAY['SEC-HARDENING'],
  '98100000-0000-0000-0000-000000000002'
);

INSERT INTO public.relatorios_descritivos(
  id, matricula_id, turma_id, professor_id, ano_letivo, semestre, status,
  campo_eu_outro_nos, campo_corpo_gestos, campo_tracos_sons,
  campo_escuta_fala, campo_espacos_tempos, created_by
)
VALUES (
  '98700000-0000-0000-0000-000000000001',
  '98400000-0000-0000-0000-000000000001',
  '98200000-0000-0000-0000-000000000001',
  '98100000-0000-0000-0000-000000000004',
  2026,
  'primeiro',
  'rascunho',
  'Campo sintético um',
  'Campo sintético dois',
  'Campo sintético três',
  'Campo sintético quatro',
  'Campo sintético cinco',
  '98100000-0000-0000-0000-000000000004'
);

INSERT INTO public.responsaveis(
  id, escola_id, nome, parentesco, telefone, ativo
)
VALUES (
  '98800000-0000-0000-0000-000000000001',
  '98000000-0000-0000-0000-000000000001',
  'Responsável Hardening',
  'mae',
  '11999990000',
  true
);

-- The policy names below are tripwires. A legacy policy returning to the
-- schema must make this contract fail before a real pilot is admitted.
SELECT pg_temp.assert_true(
  NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND policyname IN (
        'admin_full_access',
        'school_staff_manage_alunos',
        'school_staff_manage_responsaveis',
        'school_staff_manage_links',
        'school_staff_manage_turmas',
        'school_staff_manage_matriculas',
        'academic_manage_frequencia',
        'academic_manage_notas',
        'academic_manage_sessoes',
        'users_select_authorized',
        'turmas_select_authorized',
        'alunos_select_authorized',
        'matriculas_select_authorized',
        'frequencia_select_authorized',
        'sessoes_aula_select_authorized',
        'aulas_abertas_select_authorized',
        'conteudo_aula_select_authorized',
        'conteudo_aula_manage_authorized',
        'conteudo_aula_admin',
        'Professors can manage reports for their turmas',
        'Directors can view reports from their escola',
        'Admin can view all reports'
      )
  ),
  'legacy permissive policies are absent after the pilot gate'
);
SELECT pg_temp.assert_true(
  NOT has_table_privilege('authenticated', 'conteudo_aula', 'DELETE')
    AND NOT has_table_privilege('authenticated', 'relatorios_descritivos', 'DELETE')
    AND NOT has_table_privilege('authenticated', 'whatsapp_notification_optins', 'DELETE'),
  'browser roles have no delete privilege for diary, reports, or consent'
);
SELECT pg_temp.assert_true(
  has_function_privilege('service_role', 'public.pilot_cleanup_import_staging()', 'EXECUTE')
    AND NOT has_function_privilege('authenticated', 'public.pilot_cleanup_import_staging()', 'EXECUTE')
    AND has_function_privilege('service_role', 'public.pilot_rollback_import_batch(uuid,uuid,text)', 'EXECUTE')
    AND NOT has_function_privilege('authenticated', 'public.pilot_rollback_import_batch(uuid,uuid,text)', 'EXECUTE'),
  'cleanup and rollback are service-role-only'
);
SELECT pg_temp.assert_true(
  (SELECT reloptions @> ARRAY['security_invoker=true']
   FROM pg_class WHERE oid = 'public.vw_frequencia_condicionalidade'::regclass)
    AND has_table_privilege('authenticated', 'public.vw_frequencia_condicionalidade', 'SELECT')
    AND NOT has_table_privilege('authenticated', 'public.vw_alunos_risco_bolsa_familia', 'SELECT')
    AND has_function_privilege('authenticated', 'public.get_attendance_conditionality(date,date,uuid,uuid)', 'EXECUTE'),
  'new conditionality RPC/view is released while the legacy view stays revoked'
);

-- ---------------------------------------------------------------------------
-- Real negative authorization checks for all three pilot roles
-- ---------------------------------------------------------------------------
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '98100000-0000-0000-0000-000000000001', true);
SELECT pg_temp.assert_true(
  (SELECT count(*) >= 3 FROM public.alunos),
  'secretariat reads both schools'
);
SELECT pg_temp.assert_true((SELECT count(*) = 3 FROM public.get_attendance_conditionality(DATE '2026-08-01', DATE '2026-08-31', NULL, NULL)), 'secretariat reads all conditionality rows');
SELECT pg_temp.assert_true((SELECT count(*) = 3 FROM public.vw_frequencia_condicionalidade), 'secretariat reads the new conditionality view');
SELECT pg_temp.assert_true(NOT public.pilot_can_manage_school('98000000-0000-0000-0000-000000000001'), 'secretariat cannot manage a school');
DO $$
BEGIN
  BEGIN
    PERFORM public.record_pilot_metric_event('attendance_recorded', '98000000-0000-0000-0000-000000000001', 1, '{}'::jsonb);
    RAISE EXCEPTION 'secretariat metric write unexpectedly succeeded';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM LIKE 'secretariat metric write unexpectedly succeeded' THEN RAISE; END IF;
  END;
END;
$$;

DO $$
BEGIN
  BEGIN
    INSERT INTO public.alunos(id, escola_id, nome_completo, data_nascimento, sexo)
    VALUES ('98300000-0000-0000-0000-000000000010', '98000000-0000-0000-0000-000000000001', 'Escrita Secretaria', DATE '2018-04-01', 'F');
    RAISE EXCEPTION 'secretariat student write unexpectedly succeeded';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM LIKE 'secretariat student write unexpectedly succeeded' THEN RAISE; END IF;
  END;
END;
$$;

DO $$
BEGIN
  BEGIN
    INSERT INTO public.conteudo_aula(id, sessao_id, tema, objetivo, created_by)
    VALUES ('98600000-0000-0000-0000-000000000010', '98500000-0000-0000-0000-000000000001', 'Escrita Secretaria', 'Negar', '98100000-0000-0000-0000-000000000001');
    RAISE EXCEPTION 'secretariat diary write unexpectedly succeeded';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM LIKE 'secretariat diary write unexpectedly succeeded' THEN RAISE; END IF;
  END;
END;
$$;

SELECT set_config('request.jwt.claim.sub', '98100000-0000-0000-0000-000000000002', true);
SELECT pg_temp.assert_true((SELECT count(*) = 2 FROM public.alunos), 'director reads only the own school');
SELECT pg_temp.assert_true((SELECT count(*) = 2 FROM public.get_attendance_conditionality(DATE '2026-08-01', DATE '2026-08-31', NULL, NULL)), 'director conditionality is school scoped');
SELECT pg_temp.assert_true((SELECT count(*) = 2 FROM public.vw_frequencia_condicionalidade), 'director conditionality view is school scoped');

DO $$
BEGIN
  BEGIN
    INSERT INTO public.alunos(id, escola_id, nome_completo, data_nascimento, sexo)
    VALUES ('98300000-0000-0000-0000-000000000011', '98000000-0000-0000-0000-000000000002', 'Escrita Diretora Cruzada', DATE '2018-04-02', 'F');
    RAISE EXCEPTION 'cross-school director write unexpectedly succeeded';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM LIKE 'cross-school director write unexpectedly succeeded' THEN RAISE; END IF;
  END;
END;
$$;

SELECT set_config('request.jwt.claim.sub', '98100000-0000-0000-0000-000000000004', true);
SELECT pg_temp.assert_true((SELECT count(*) = 1 FROM public.turmas), 'teacher reads only the titular class');
SELECT pg_temp.assert_true((SELECT count(*) = 1 FROM public.matriculas), 'teacher enrollment read is titular-class scoped');
SELECT pg_temp.assert_true((SELECT count(*) = 1 FROM public.get_attendance_conditionality(DATE '2026-08-01', DATE '2026-08-31', NULL, NULL)), 'teacher conditionality is titular-class scoped');
SELECT pg_temp.assert_true((SELECT count(*) = 1 FROM public.vw_frequencia_condicionalidade), 'teacher conditionality view is titular-class scoped');

DO $$
BEGIN
  BEGIN
    INSERT INTO public.conteudo_aula(id, sessao_id, tema, objetivo, habilidades_bncc, created_by)
    VALUES ('98600000-0000-0000-0000-000000000011', '98500000-0000-0000-0000-000000000002', 'Escrita fora da titularidade', 'Negar', ARRAY['NEGAR'], '98100000-0000-0000-0000-000000000004');
    RAISE EXCEPTION 'teacher non-titular diary write unexpectedly succeeded';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM LIKE 'teacher non-titular diary write unexpectedly succeeded' THEN RAISE; END IF;
  END;
END;
$$;

INSERT INTO public.conteudo_aula(id, sessao_id, tema, objetivo, habilidades_bncc, created_by)
VALUES (
  '98600000-0000-0000-0000-000000000012',
  '98500000-0000-0000-0000-000000000001',
  'Escrita titular',
  'Registrar conteúdo',
  ARRAY['TITULAR'],
  '98100000-0000-0000-0000-000000000004'
);
SELECT pg_temp.assert_true((SELECT count(*) = 1 FROM public.conteudo_aula WHERE id = '98600000-0000-0000-0000-000000000012'), 'teacher can write titular diary content');

DO $$
BEGIN
  BEGIN
    DELETE FROM public.conteudo_aula WHERE id = '98600000-0000-0000-0000-000000000012';
    RAISE EXCEPTION 'authenticated diary delete unexpectedly succeeded';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM LIKE 'authenticated diary delete unexpectedly succeeded' THEN RAISE; END IF;
  END;
END;
$$;

SELECT pg_temp.assert_true((SELECT count(*) = 1 FROM public.relatorios_descritivos), 'teacher can read the released descriptive report');

-- Director can update own-school diary content but cannot cross the school.
SELECT set_config('request.jwt.claim.sub', '98100000-0000-0000-0000-000000000002', true);
UPDATE public.conteudo_aula SET observacoes = 'Atualizado pela diretora' WHERE id = '98600000-0000-0000-0000-000000000001';
SELECT pg_temp.assert_true((SELECT observacoes = 'Atualizado pela diretora' FROM public.conteudo_aula WHERE id = '98600000-0000-0000-0000-000000000001'), 'director can update own-school diary content');

SELECT set_config('request.jwt.claim.sub', '98100000-0000-0000-0000-000000000003', true);
SELECT pg_temp.assert_true((SELECT count(*) = 0 FROM public.relatorios_descritivos), 'other director cannot read another school report');
DO $$
BEGIN
  BEGIN
    UPDATE public.conteudo_aula SET observacoes = 'Atualização cruzada' WHERE id = '98600000-0000-0000-0000-000000000001';
    IF FOUND THEN RAISE EXCEPTION 'cross-school director diary update unexpectedly succeeded'; END IF;
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM LIKE 'cross-school director diary update unexpectedly succeeded' THEN RAISE; END IF;
  END;
END;
$$;

-- ---------------------------------------------------------------------------
-- Consent, event ownership, and append-only audit receipts
-- ---------------------------------------------------------------------------
SELECT set_config('request.jwt.claim.sub', '98100000-0000-0000-0000-000000000002', true);
INSERT INTO public.whatsapp_notification_optins(
  id, responsavel_id, escola_id, canal, opt_in, consentido_em, registrado_por
)
VALUES (
  '98900000-0000-0000-0000-000000000001',
  '98800000-0000-0000-0000-000000000001',
  '98000000-0000-0000-0000-000000000002',
  'whatsapp', true, now(), '98100000-0000-0000-0000-000000000002'
);
SELECT pg_temp.assert_true(
  (SELECT escola_id = '98000000-0000-0000-0000-000000000001' AND registrado_por = '98100000-0000-0000-0000-000000000002'
   FROM public.whatsapp_notification_optins WHERE id = '98900000-0000-0000-0000-000000000001'),
  'consent school and actor are derived and bounded'
);
SELECT pg_temp.assert_true(
  public.pilot_current_role() = 'diretor'
    AND public.pilot_current_school_id() = '98000000-0000-0000-0000-000000000001',
  'director identity is current before consent audit'
);
SELECT public.write_pilot_audit_event(
  'whatsapp_optin_changed', 'responsavel',
  '98800000-0000-0000-0000-000000000001',
  '98000000-0000-0000-0000-000000000001',
  jsonb_build_object('canal', 'whatsapp', 'opt_in', true)
);

SELECT set_config('request.jwt.claim.sub', '98100000-0000-0000-0000-000000000001', true);
DO $$
DECLARE
  changed integer;
BEGIN
  UPDATE public.whatsapp_notification_optins
  SET opt_in = false, cancelado_em = now(), registrado_por = '98100000-0000-0000-0000-000000000001'
  WHERE id = '98900000-0000-0000-0000-000000000001';
  GET DIAGNOSTICS changed = ROW_COUNT;
  IF changed <> 0 THEN RAISE EXCEPTION 'secretariat consent update unexpectedly succeeded'; END IF;
END;
$$;

SELECT set_config('request.jwt.claim.sub', '98100000-0000-0000-0000-000000000004', true);
DO $$
BEGIN
  BEGIN
    PERFORM public.write_pilot_audit_event('arbitrary_event', 'arbitrary_entity', 'arbitrary-id', NULL, '{}'::jsonb);
    RAISE EXCEPTION 'arbitrary audit event unexpectedly succeeded';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM LIKE 'arbitrary audit event unexpectedly succeeded' THEN RAISE; END IF;
  END;
END;
$$;

RESET ROLE;
SELECT pg_temp.assert_true(
  (SELECT count(*) >= 1 FROM public.pilot_audit_log WHERE entity_type = 'conteudo_aula' AND event_type = 'insert')
    AND (SELECT count(*) >= 1 FROM public.pilot_audit_log WHERE entity_type = 'relatorios_descritivos' AND event_type = 'insert')
    AND (SELECT count(*) >= 1 FROM public.pilot_audit_log WHERE entity_type = 'whatsapp_notification_optins' AND event_type = 'insert')
    AND (SELECT count(*) >= 1 FROM public.pilot_audit_log WHERE event_type = 'whatsapp_optin_changed')
    AND NOT EXISTS (
      SELECT 1 FROM public.pilot_audit_log
      WHERE redacted_metadata ?| ARRAY['cpf', 'nis', 'rg', 'password', 'senha']
    ),
  'diary, report, consent, and metadata redaction events are audited'
);

-- ---------------------------------------------------------------------------
-- Service cleanup receipt and rollback denial
-- ---------------------------------------------------------------------------
RESET ROLE;
INSERT INTO public.pilot_import_batches(
  id, escola_id, dataset, idempotency_key, content_sha256, encryption_key_id,
  encrypted_payload, iv, auth_tag, validation_report, status, submitted_by,
  raw_expires_at, import_target, source_mode, encryption_algorithm,
  governance_owner_name, governance_owner_email, governance_owner_user_id,
  governance_owner_authorized_at, processing_agreement_id,
  processing_agreement_confirmed, processing_agreement_reference,
  processing_agreement_version, processing_agreement_recorded_at,
  processing_agreement_recorded_by, retention_policy, canonical_expires_at,
  rollback_until, source_row_count, canonical_fingerprint_sha256
)
VALUES (
  '99000000-0000-0000-0000-000000000001',
  '98000000-0000-0000-0000-000000000001',
  'students', 'security-cleanup', repeat('c', 64), 'security-test-v1',
  'ciphertext', 'iv', 'tag', '{}'::jsonb, 'pending_approval',
  '98100000-0000-0000-0000-000000000001', now() - interval '1 hour',
  'synthetic_local', 'synthetic', 'aes-256-gcm',
  'Secretaria Hardening', 'secretaria.hardening@synthetic.invalid',
  '98100000-0000-0000-0000-000000000001', now() - interval '1 minute',
  '98800000-0000-0000-0000-000000000001', true,
  'DPA-SYN-HARDENING-001', 'v1', now() - interval '1 minute',
  '98100000-0000-0000-0000-000000000001', 'synthetic-cleanup-test',
  now() + interval '30 days', now() + interval '7 days', 1, repeat('a', 64)
);

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '98100000-0000-0000-0000-000000000001', true);
DO $$
BEGIN
  BEGIN
    PERFORM public.pilot_cleanup_import_staging();
    RAISE EXCEPTION 'authenticated cleanup unexpectedly succeeded';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM LIKE 'authenticated cleanup unexpectedly succeeded' THEN RAISE; END IF;
  END;
END;
$$;
DO $$
BEGIN
  BEGIN
    PERFORM public.pilot_rollback_import_batch(
      '99000000-0000-0000-0000-000000000001',
      '98100000-0000-0000-0000-000000000002',
      'unauthorized rollback'
    );
    RAISE EXCEPTION 'authenticated rollback unexpectedly succeeded';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM LIKE 'authenticated rollback unexpectedly succeeded' THEN RAISE; END IF;
  END;
END;
$$;
RESET ROLE;

SET LOCAL ROLE service_role;
SELECT pg_temp.assert_true((SELECT public.pilot_cleanup_import_staging() = 1), 'service cleanup clears expired ciphertext');
RESET ROLE;
SELECT pg_temp.assert_true(
  (SELECT encrypted_payload IS NULL AND status = 'cleaned' FROM public.pilot_import_batches WHERE id = '99000000-0000-0000-0000-000000000001')
    AND (SELECT count(*) = 1 FROM public.pilot_audit_log WHERE event_type = 'import_staging_cleaned' AND entity_id = '99000000-0000-0000-0000-000000000001'),
  'cleanup leaves a receipt without exposing plaintext'
);

-- ---------------------------------------------------------------------------
-- Deliberate breaks: each permissive return must turn its independent oracle red
-- ---------------------------------------------------------------------------
SAVEPOINT deliberate_delete_break;
GRANT DELETE ON public.conteudo_aula TO authenticated;
CREATE POLICY pilot_security_deliberate_delete_break
ON public.conteudo_aula
FOR DELETE TO authenticated
USING (true);
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '98100000-0000-0000-0000-000000000004', true);
DELETE FROM public.conteudo_aula WHERE id = '98600000-0000-0000-0000-000000000012';
RESET ROLE;
DO $$
BEGIN
  BEGIN
    PERFORM pg_temp.assert_true(
      (SELECT count(*) = 1 FROM public.conteudo_aula WHERE id = '98600000-0000-0000-0000-000000000012'),
      'deliberate DELETE policy break was not detected'
    );
    RAISE EXCEPTION 'deliberate DELETE break did not turn red';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM NOT LIKE 'assertion failed: deliberate DELETE policy break was not detected' THEN RAISE; END IF;
  END;
END;
$$;
ROLLBACK TO SAVEPOINT deliberate_delete_break;

SAVEPOINT deliberate_write_break;
GRANT INSERT ON public.alunos TO authenticated;
CREATE POLICY pilot_security_deliberate_cross_school_break
ON public.alunos
FOR INSERT TO authenticated
WITH CHECK (true);
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '98100000-0000-0000-0000-000000000004', true);
INSERT INTO public.alunos(id, escola_id, nome_completo, data_nascimento, sexo)
VALUES ('98300000-0000-0000-0000-000000000099', '98000000-0000-0000-0000-000000000002', 'Break Cross School', DATE '2018-05-01', 'F');
RESET ROLE;
DO $$
BEGIN
  BEGIN
    PERFORM pg_temp.assert_true(
      (SELECT count(*) = 0 FROM public.alunos WHERE id = '98300000-0000-0000-0000-000000000099'),
      'deliberate permissive write policy break was not detected'
    );
    RAISE EXCEPTION 'deliberate permissive write break did not turn red';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM NOT LIKE 'assertion failed: deliberate permissive write policy break was not detected' THEN RAISE; END IF;
  END;
END;
$$;
ROLLBACK TO SAVEPOINT deliberate_write_break;

RESET ROLE;
ROLLBACK;
