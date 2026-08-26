-- WhatsApp notification MVP database tests.
-- Runs after all canonical migrations + pilot provisioning against a raw
-- PostgreSQL cluster (see supabase/tests/database/run.sh). Verifies schema
-- invariants, RLS school isolation, the school-sync trigger, the monotonic
-- delivery-status RPC, grants, and the audit trail.

BEGIN;

CREATE FUNCTION pg_temp.assert_true(condition boolean, message text)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF condition IS DISTINCT FROM true THEN RAISE EXCEPTION 'assertion failed: %', message; END IF;
END;
$$;

INSERT INTO escolas(id, codigo, nome, tipo) VALUES
  ('10000000-0000-0000-0000-000000000001','00000001','Escola Sintetica A','fundamental'),
  ('10000000-0000-0000-0000-000000000002','00000002','Escola Sintetica B','fundamental');
INSERT INTO users(id,nome,email,tipo_usuario,escola_id,ativo) VALUES
  ('20000000-0000-0000-0000-000000000001','Secretaria Sintetica','secretaria@synthetic.invalid','secretario',NULL,true),
  ('20000000-0000-0000-0000-000000000002','Diretora A','diretora.a@synthetic.invalid','diretor','10000000-0000-0000-0000-000000000001',true),
  ('20000000-0000-0000-0000-000000000003','Diretora B','diretora.b@synthetic.invalid','diretor','10000000-0000-0000-0000-000000000002',true),
  ('20000000-0000-0000-0000-000000000004','Professor A','prof.a@synthetic.invalid','professor','10000000-0000-0000-0000-000000000001',true);
INSERT INTO responsaveis(id,nome,parentesco,escola_id,telefone) VALUES
  ('30000000-0000-0000-0000-000000000001','Responsavel A','mae','10000000-0000-0000-0000-000000000001','(31) 99999-8888'),
  ('30000000-0000-0000-0000-000000000002','Responsavel B','pai','10000000-0000-0000-0000-000000000002','(32) 98888-7777');
INSERT INTO alunos(id,nome_completo,data_nascimento,sexo,escola_id) VALUES
  ('40000000-0000-0000-0000-000000000001','Aluno A','2018-01-01','M','10000000-0000-0000-0000-000000000001'),
  ('40000000-0000-0000-0000-000000000002','Aluno B','2018-01-01','F','10000000-0000-0000-0000-000000000002');
INSERT INTO aluno_responsaveis(aluno_id,responsavel_id,tipo_responsabilidade) VALUES
  ('40000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000001','mae'),
  ('40000000-0000-0000-0000-000000000002','30000000-0000-0000-0000-000000000002','pai');

-- ---------------------------------------------------------------------------
-- Schema and grants
-- ---------------------------------------------------------------------------
SELECT pg_temp.assert_true(
  (SELECT count(*) = 1 FROM pg_tables WHERE tablename = 'whatsapp_notification_optins')
  AND (SELECT count(*) = 1 FROM pg_tables WHERE tablename = 'whatsapp_notification_messages'),
  'whatsapp tables are deployed'
);
SELECT pg_temp.assert_true(
  NOT has_table_privilege('anon','whatsapp_notification_optins','SELECT')
  AND NOT has_table_privilege('anon','whatsapp_notification_messages','SELECT'),
  'anon has no access to whatsapp tables'
);
SELECT pg_temp.assert_true(
  has_table_privilege('authenticated','whatsapp_notification_messages','INSERT')
  AND has_table_privilege('authenticated','whatsapp_notification_messages','UPDATE'),
  'authenticated staff can insert and advance their own school message rows'
);
SELECT pg_temp.assert_true(
  NOT has_function_privilege('anon','apply_whatsapp_delivery_status(text,text,timestamptz,text)','EXECUTE')
  AND NOT has_function_privilege('authenticated','apply_whatsapp_delivery_status(text,text,timestamptz,text)','EXECUTE'),
  'delivery status RPC is not callable by app roles'
);

-- ---------------------------------------------------------------------------
-- School-sync trigger and consent invariants (as secretariat, bypassing RLS
-- for the fixture, but the trigger still runs)
-- ---------------------------------------------------------------------------
SET LOCAL ROLE postgres;
INSERT INTO whatsapp_notification_optins(responsavel_id, opt_in, consentido_em, registrado_por)
VALUES ('30000000-0000-0000-0000-000000000001', true, now(), '20000000-0000-0000-0000-000000000002');
SELECT pg_temp.assert_true(
  (SELECT escola_id = '10000000-0000-0000-0000-000000000001'
   FROM whatsapp_notification_optins WHERE responsavel_id = '30000000-0000-0000-0000-000000000001'),
  'opt-in inherits the guardian school from the trigger'
);

DO $$
BEGIN
  BEGIN
    INSERT INTO whatsapp_notification_optins(responsavel_id, opt_in, consentido_em)
    VALUES ('30000000-0000-0000-0000-000000000001', true, now())
    ON CONFLICT (responsavel_id, canal) DO NOTHING;
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM NOT LIKE 'PILOT_SAFETY_GATE:%' THEN RAISE; END IF;
  END;
  BEGIN
    INSERT INTO whatsapp_notification_optins(responsavel_id, opt_in)
    VALUES ('30000000-0000-0000-0000-000000000002', true);
    RAISE EXCEPTION 'consent without consentido_em unexpectedly accepted';
  EXCEPTION WHEN check_violation THEN
    NULL;
  END;
END $$;

-- ---------------------------------------------------------------------------
-- RLS: school isolation for opt-ins and messages
-- ---------------------------------------------------------------------------
INSERT INTO whatsapp_notification_optins(responsavel_id, opt_in, consentido_em, registrado_por)
VALUES ('30000000-0000-0000-0000-000000000002', true, now(), '20000000-0000-0000-0000-000000000003');

INSERT INTO whatsapp_notification_messages(responsavel_id, aluno_id, escola_id, tipo, data_aula, idempotency_key)
VALUES
  ('30000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','presenca_falta','2026-08-01','key-school-a-1'),
  ('30000000-0000-0000-0000-000000000002','40000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000002','presenca_falta','2026-08-01','key-school-b-1');

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','20000000-0000-0000-0000-000000000002',true); -- director A
SELECT pg_temp.assert_true((SELECT count(*) = 1 FROM whatsapp_notification_optins), 'director A sees only school A opt-ins');
SELECT pg_temp.assert_true((SELECT count(*) = 1 FROM whatsapp_notification_messages), 'director A sees only school A messages');
SELECT pg_temp.assert_true(
  (SELECT count(*) = 0 FROM whatsapp_notification_messages WHERE escola_id = '10000000-0000-0000-0000-000000000002'),
  'school A cannot read school B messages'
);

-- The staff-session delivery path advances own-school rows (service updates).
UPDATE whatsapp_notification_messages SET status = 'accepted', external_message_id = 'wamid.director.a'
WHERE idempotency_key = 'key-school-a-1';
SELECT pg_temp.assert_true(
  (SELECT status = 'accepted' FROM whatsapp_notification_messages WHERE idempotency_key = 'key-school-a-1'),
  'director A advances own school message rows'
);

DO $$
BEGIN
  UPDATE whatsapp_notification_messages SET status = 'accepted'
  WHERE idempotency_key = 'key-school-b-1';
  IF (SELECT status = 'accepted' FROM whatsapp_notification_messages WHERE idempotency_key = 'key-school-b-1') THEN
    RAISE EXCEPTION 'cross-school update unexpectedly succeeded';
  END IF;
END $$;

DO $$
BEGIN
  BEGIN
    INSERT INTO whatsapp_notification_messages(responsavel_id, aluno_id, escola_id, tipo, data_aula, idempotency_key)
    VALUES ('30000000-0000-0000-0000-000000000002','40000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000002','presenca_falta','2026-08-02','key-cross-school');
    RAISE EXCEPTION 'cross-school insert unexpectedly succeeded';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;
  BEGIN
    INSERT INTO whatsapp_notification_optins(responsavel_id, opt_in, consentido_em)
    VALUES ('30000000-0000-0000-0000-000000000002', true, now());
    RAISE EXCEPTION 'cross-school opt-in unexpectedly succeeded';
  EXCEPTION WHEN insufficient_privilege OR raise_exception THEN
    IF SQLSTATE = 'P0001' AND SQLERRM NOT LIKE 'PILOT_SAFETY_GATE:%' THEN RAISE; END IF;
  END;
END $$;

SELECT set_config('request.jwt.claim.sub','20000000-0000-0000-0000-000000000004',true); -- professor A
SELECT pg_temp.assert_true((SELECT count(*) = 1 FROM whatsapp_notification_messages), 'professor A reads school A messages');
DO $$
BEGIN
  BEGIN
    INSERT INTO whatsapp_notification_messages(responsavel_id, aluno_id, escola_id, tipo, data_aula, idempotency_key)
    VALUES ('30000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','presenca_falta','2026-08-02','key-professor-insert');
    RAISE EXCEPTION 'professor insert unexpectedly succeeded (only directors manage)';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;
END $$;

RESET ROLE;

-- ---------------------------------------------------------------------------
-- Monotonic delivery status RPC (as postgres; the webhook route calls it with
-- the service-role client after signature validation)
-- ---------------------------------------------------------------------------
SELECT pg_temp.assert_true(
  (SELECT count(*) = 1 FROM whatsapp_notification_messages WHERE external_message_id IS NOT NULL),
  'only the director-updated row carries an external id before the RPC tests'
);

UPDATE whatsapp_notification_messages
SET external_message_id = 'wamid.school.a.1'
WHERE idempotency_key = 'key-school-a-1';

SELECT pg_temp.assert_true(
  apply_whatsapp_delivery_status('wamid.school.a.1','sent', now()) = true,
  'sent applies from queued'
);
SELECT pg_temp.assert_true(
  apply_whatsapp_delivery_status('wamid.school.a.1','delivered', now()) = true,
  'delivered applies after sent'
);
SELECT pg_temp.assert_true(
  apply_whatsapp_delivery_status('wamid.school.a.1','delivered', now()) = false,
  'duplicate delivered receipt is a no-op'
);
SELECT pg_temp.assert_true(
  apply_whatsapp_delivery_status('wamid.school.a.1','sent', now()) = false,
  'regression to sent is rejected'
);
SELECT pg_temp.assert_true(
  apply_whatsapp_delivery_status('wamid.school.a.1','read', now()) = true,
  'read applies after delivered'
);
SELECT pg_temp.assert_true(
  (SELECT status = 'read' AND entregue_em IS NOT NULL AND lido_em IS NOT NULL
   FROM whatsapp_notification_messages WHERE idempotency_key = 'key-school-a-1'),
  'read row carries delivery timestamps'
);
SELECT pg_temp.assert_true(
  apply_whatsapp_delivery_status('wamid.school.a.1','failed', now(), '131026') = true,
  'failed applies as the terminal rank'
);
SELECT pg_temp.assert_true(
  apply_whatsapp_delivery_status('wamid.school.a.1','read', now()) = false,
  'failed is terminal: no later status applies'
);
SELECT pg_temp.assert_true(
  (SELECT ultimo_erro_codigo = '131026' FROM whatsapp_notification_messages WHERE idempotency_key = 'key-school-a-1'),
  'failed row records only the numeric error code'
);
SELECT pg_temp.assert_true(
  apply_whatsapp_delivery_status('wamid.desconhecido','delivered', now()) = false,
  'unknown wamid receipts are ignored'
);

-- Blocked rows never move.
UPDATE whatsapp_notification_messages
SET status = 'blocked', bloqueado_motivo = 'opt_out', bloqueado_em = now()
WHERE idempotency_key = 'key-school-b-1';
SELECT pg_temp.assert_true(
  apply_whatsapp_delivery_status(
    (SELECT external_message_id FROM whatsapp_notification_messages WHERE idempotency_key = 'key-school-b-1'),
    'delivered', now()
  ) = false,
  'blocked rows reject webhook status'
);

-- ---------------------------------------------------------------------------
-- Compliance trail: consent and delivery changes land in the audit log
-- ---------------------------------------------------------------------------
SELECT pg_temp.assert_true(
  (SELECT count(*) >= 2 FROM pilot_audit_log WHERE entity_type = 'whatsapp_notification_optins'),
  'opt-in inserts are audit-trailed'
);
SELECT pg_temp.assert_true(
  (SELECT count(*) >= 1 FROM pilot_audit_log WHERE entity_type = 'whatsapp_notification_messages'),
  'message inserts are audit-trailed'
);
SELECT pg_temp.assert_true(
  (SELECT count(*) = 0 FROM pilot_audit_log
   WHERE redacted_metadata ?| ARRAY['telefone','cpf','body','token']),
  'audit trail never carries phones, bodies, or tokens'
);

ROLLBACK;
