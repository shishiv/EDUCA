-- WhatsApp notification delivery ownership database tests.
-- Runs after all canonical migrations + pilot provisioning against a raw
-- PostgreSQL cluster (see supabase/tests/database/run.sh).

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
INSERT INTO turmas(id,nome,serie,turno,ano_letivo,escola_id,professor_id) VALUES
  ('41000000-0000-0000-0000-000000000001','Turma WhatsApp A','1 ano','matutino',2026,'10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000004'),
  ('41000000-0000-0000-0000-000000000002','Turma WhatsApp B','1 ano','matutino',2026,'10000000-0000-0000-0000-000000000002',NULL);
INSERT INTO matriculas(id,aluno_id,turma_id,ano_letivo,situacao) VALUES
  ('42000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000001','41000000-0000-0000-0000-000000000001',2026,'ativa'),
  ('42000000-0000-0000-0000-000000000002','40000000-0000-0000-0000-000000000002','41000000-0000-0000-0000-000000000002',2026,'ativa');
INSERT INTO sessoes_aula(
  id,turma_id,escola_id,professor_id,data_aula,status,conteudo_programatico
) VALUES
  ('43000000-0000-0000-0000-000000000001','41000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000004','2026-08-06','FECHADA','Chamada sintetica'),
  ('43000000-0000-0000-0000-000000000002','41000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000003','2026-08-06','FECHADA','Chamada sintetica'),
  ('43000000-0000-0000-0000-000000000003','41000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000004','2026-08-07','FECHADA','Chamada sintetica');
INSERT INTO frequencia(id,matricula_id,sessao_id,data_aula,status_presenca) VALUES
  ('44000000-0000-0000-0000-000000000001','42000000-0000-0000-0000-000000000001','43000000-0000-0000-0000-000000000001','2026-08-06','F'),
  ('44000000-0000-0000-0000-000000000002','42000000-0000-0000-0000-000000000002','43000000-0000-0000-0000-000000000002','2026-08-06','F'),
  ('44000000-0000-0000-0000-000000000003','42000000-0000-0000-0000-000000000001','43000000-0000-0000-0000-000000000003','2026-08-07','F');

-- ---------------------------------------------------------------------------
-- Schema, grants, and delivery mutation boundary
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
  NOT has_table_privilege('authenticated','whatsapp_notification_messages','INSERT')
  AND NOT has_table_privilege('authenticated','whatsapp_notification_messages','UPDATE')
  AND NOT has_table_privilege('authenticated','whatsapp_notification_optins','INSERT')
  AND NOT has_table_privilege('authenticated','whatsapp_notification_optins','UPDATE'),
  'authenticated clients cannot bypass governed enqueue or consent RPCs'
);
SELECT pg_temp.assert_true(
  has_schema_privilege('authenticated', 'auth', 'USAGE')
  AND has_function_privilege('authenticated', 'auth.uid()', 'EXECUTE'),
  'authenticated invoker RPCs can resolve the request-scoped auth uid helper'
);
SELECT pg_temp.assert_true(
  has_function_privilege(
    'authenticated',
    'claim_whatsapp_notifications(uuid,integer,integer,uuid,integer)',
    'EXECUTE'
  )
  AND has_function_privilege(
    'authenticated',
    'complete_whatsapp_notification_delivery(uuid,uuid,text,text,text,text,integer)',
    'EXECUTE'
  )
  AND has_function_privilege(
    'authenticated',
    'set_guardian_whatsapp_opt_in(uuid,boolean,uuid)',
    'EXECUTE'
  )
  AND has_function_privilege(
    'authenticated',
    'enqueue_guardian_whatsapp_attendance_notification(uuid,uuid,text,date,uuid)',
    'EXECUTE'
  ),
  'authenticated staff use governed enqueue, claim, completion, and opt-in RPCs'
);
SELECT pg_temp.assert_true(
  NOT has_function_privilege(
    'anon',
    'claim_whatsapp_notifications(uuid,integer,integer,uuid,integer)',
    'EXECUTE'
  )
  AND NOT has_function_privilege(
    'anon',
    'complete_whatsapp_notification_delivery(uuid,uuid,text,text,text,text,integer)',
    'EXECUTE'
  )
  AND NOT has_function_privilege(
    'anon',
    'set_guardian_whatsapp_opt_in(uuid,boolean,uuid)',
    'EXECUTE'
  )
  AND NOT has_function_privilege(
    'anon',
    'enqueue_guardian_whatsapp_attendance_notification(uuid,uuid,text,date,uuid)',
    'EXECUTE'
  ),
  'anon cannot call whatsapp mutation RPCs'
);
SELECT pg_temp.assert_true(
  NOT has_function_privilege('anon','apply_whatsapp_delivery_status(text,text,timestamptz,text)','EXECUTE')
  AND NOT has_function_privilege('authenticated','apply_whatsapp_delivery_status(text,text,timestamptz,text)','EXECUTE'),
  'delivery status RPC is reserved for the signed webhook service path'
);

-- ---------------------------------------------------------------------------
-- School-sync trigger and consent invariants
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
    INSERT INTO whatsapp_notification_optins(responsavel_id, opt_in)
    VALUES ('30000000-0000-0000-0000-000000000002', true);
    RAISE EXCEPTION 'consent without consentido_em unexpectedly accepted';
  EXCEPTION WHEN check_violation THEN
    NULL;
  END;
END $$;

RESET ROLE;
CREATE FUNCTION pg_temp.reject_whatsapp_enqueue_audit()
RETURNS trigger
LANGUAGE plpgsql
AS $failure$
BEGIN
  IF NEW.event_type = 'whatsapp_notification_enqueued' THEN
    RAISE EXCEPTION 'synthetic enqueue audit failure';
  END IF;
  RETURN NEW;
END;
$failure$;
CREATE TRIGGER reject_whatsapp_enqueue_audit
BEFORE INSERT ON pilot_audit_log
FOR EACH ROW EXECUTE FUNCTION pg_temp.reject_whatsapp_enqueue_audit();

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','20000000-0000-0000-0000-000000000002',true); -- director A
DO $$
BEGIN
  BEGIN
    PERFORM enqueue_guardian_whatsapp_attendance_notification(
      '30000000-0000-0000-0000-000000000001',
      '40000000-0000-0000-0000-000000000001',
      'presenca_falta',
      '2026-08-07',
      '20000000-0000-0000-0000-000000000002'
    );
    RAISE EXCEPTION 'enqueue unexpectedly committed without its audit receipt';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'synthetic enqueue audit failure' THEN RAISE; END IF;
  END;
END $$;
SELECT pg_temp.assert_true(
  (SELECT count(*) = 0
   FROM whatsapp_notification_messages
   WHERE data_aula = '2026-08-07'),
  'enqueue audit failure rolls back the notification decision atomically'
);

RESET ROLE;
DROP TRIGGER reject_whatsapp_enqueue_audit ON pilot_audit_log;

INSERT INTO whatsapp_notification_optins(responsavel_id, opt_in, consentido_em, registrado_por)
VALUES ('30000000-0000-0000-0000-000000000002', true, now(), '20000000-0000-0000-0000-000000000003');

INSERT INTO whatsapp_notification_messages(
  id, responsavel_id, aluno_id, escola_id, tipo, data_aula, idempotency_key, proxima_tentativa
)
VALUES
  ('60000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','presenca_falta','2026-08-01','key-school-a-1',clock_timestamp() - interval '1 minute'),
  ('60000000-0000-0000-0000-000000000002','30000000-0000-0000-0000-000000000002','40000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000002','presenca_falta','2026-08-01','key-school-b-1',clock_timestamp() - interval '1 minute');

-- ---------------------------------------------------------------------------
-- RLS, atomic claim ownership, completion token, retry, and terminal failure
-- ---------------------------------------------------------------------------
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','20000000-0000-0000-0000-000000000002',true); -- director A
SELECT pg_temp.assert_true((SELECT count(*) = 1 FROM whatsapp_notification_optins), 'director A sees only school A opt-ins');
SELECT pg_temp.assert_true((SELECT count(*) = 1 FROM whatsapp_notification_messages), 'director A sees only school A messages');
SELECT pg_temp.assert_true(
  (SELECT count(*) = 0 FROM whatsapp_notification_messages WHERE escola_id = '10000000-0000-0000-0000-000000000002'),
  'school A cannot read school B messages'
);

CREATE TEMP TABLE governed_enqueue_receipt AS
SELECT *
FROM enqueue_guardian_whatsapp_attendance_notification(
  '30000000-0000-0000-0000-000000000001',
  '40000000-0000-0000-0000-000000000001',
  'presenca_falta',
  '2026-08-06',
  '20000000-0000-0000-0000-000000000002'
);
SELECT pg_temp.assert_true(
  (SELECT status = 'queued' AND duplicated = false AND audit_id IS NOT NULL
   FROM governed_enqueue_receipt)
  AND (SELECT count(*) = 1
       FROM whatsapp_notification_messages
       WHERE id = (SELECT message_id FROM governed_enqueue_receipt)
         AND escola_id = '10000000-0000-0000-0000-000000000001'
         AND criado_por = '20000000-0000-0000-0000-000000000002'
         AND tentativas = 0
         AND status = 'queued'),
  'governed enqueue derives scope, forces initial state, and returns an audit receipt'
);
SELECT pg_temp.assert_true(
  (SELECT duplicated = true AND audit_id IS NOT NULL
   FROM enqueue_guardian_whatsapp_attendance_notification(
     '30000000-0000-0000-0000-000000000001',
     '40000000-0000-0000-0000-000000000001',
     'presenca_falta',
     '2026-08-06',
     '20000000-0000-0000-0000-000000000002'
   ))
  AND (SELECT count(*) = 1
       FROM whatsapp_notification_messages
       WHERE id = (SELECT message_id FROM governed_enqueue_receipt)),
  'governed enqueue replay returns a receipt without duplicating the message'
);

DO $$
BEGIN
  BEGIN
    PERFORM enqueue_guardian_whatsapp_attendance_notification(
      '30000000-0000-0000-0000-000000000001',
      '40000000-0000-0000-0000-000000000001',
      'presenca_presente',
      '2026-08-06',
      '20000000-0000-0000-0000-000000000002'
    );
    RAISE EXCEPTION 'notification without matching attendance unexpectedly enqueued';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM NOT LIKE 'WHATSAPP_ENQUEUE_CONTEXT_DENIED:%' THEN RAISE; END IF;
  END;
END $$;

DO $$
BEGIN
  BEGIN
    UPDATE whatsapp_notification_messages SET status = 'accepted'
    WHERE idempotency_key = 'key-school-a-1';
    RAISE EXCEPTION 'direct delivery-state update unexpectedly succeeded';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;
END $$;

DO $$
DECLARE
  message_id uuid;
  first_claim_count integer;
  second_claim_count integer;
BEGIN
  SELECT id INTO message_id
  FROM whatsapp_notification_messages
  WHERE idempotency_key = 'key-school-a-1';

  SELECT count(*) INTO first_claim_count
  FROM claim_whatsapp_notifications(
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', 5, 1, message_id, 300
  );
  SELECT count(*) INTO second_claim_count
  FROM claim_whatsapp_notifications(
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2', 5, 1, message_id, 300
  );

  PERFORM pg_temp.assert_true(first_claim_count = 1, 'the first worker claims the due message');
  PERFORM pg_temp.assert_true(second_claim_count = 0, 'an active lease excludes a second worker');
  PERFORM pg_temp.assert_true(
    NOT complete_whatsapp_notification_delivery(
      message_id,
      'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2',
      'accepted',
      'wamid.wrong-token'
    ),
    'a worker cannot complete another worker claim'
  );
  PERFORM pg_temp.assert_true(
    complete_whatsapp_notification_delivery(
      message_id,
      'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',
      'accepted',
      'wamid.school.a.1'
    ),
    'the claim owner completes the delivery'
  );
END $$;

SELECT pg_temp.assert_true(
  (SELECT status = 'accepted'
      AND tentativas = 1
      AND claim_token IS NULL
      AND claim_expires_at IS NULL
   FROM whatsapp_notification_messages WHERE idempotency_key = 'key-school-a-1'),
  'completion clears claim ownership and preserves the claimed attempt count'
);

SELECT pg_temp.assert_true(
  (SELECT count(*) = 0
   FROM claim_whatsapp_notifications(
     'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3', 5, 1,
     '60000000-0000-0000-0000-000000000002', 300
   )),
  'a director cannot claim another school message'
);

SELECT pg_temp.assert_true(
  to_regprocedure('claim_whatsapp_notifications(uuid,timestamptz,integer,integer,uuid,integer)') IS NULL,
  'claim has no caller-controlled timestamp overload'
);

DO $$
BEGIN
  BEGIN
    INSERT INTO whatsapp_notification_messages(
      responsavel_id, aluno_id, escola_id, tipo, data_aula, idempotency_key,
      status, external_message_id
    ) VALUES (
      '30000000-0000-0000-0000-000000000001',
      '40000000-0000-0000-0000-000000000001',
      '10000000-0000-0000-0000-000000000001',
      'presenca_falta', '2026-08-02', 'key-forged-terminal',
      'accepted', 'wamid.forged'
    );
    RAISE EXCEPTION 'direct enqueue with forged state unexpectedly succeeded';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;
  BEGIN
    UPDATE whatsapp_notification_optins
    SET opt_in = false, consentido_em = NULL, cancelado_em = now()
    WHERE responsavel_id = '30000000-0000-0000-0000-000000000001';
    RAISE EXCEPTION 'direct consent update unexpectedly succeeded';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;
END $$;

RESET ROLE;
INSERT INTO whatsapp_notification_messages(
  id, responsavel_id, aluno_id, escola_id, tipo, data_aula, idempotency_key, proxima_tentativa
) VALUES (
  '60000000-0000-0000-0000-000000000003',
  '30000000-0000-0000-0000-000000000001',
  '40000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000001',
  'presenca_falta',
  '2026-08-02',
  'key-retry-a-1',
  clock_timestamp() + interval '1 day'
);

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','20000000-0000-0000-0000-000000000002',true); -- director A

SELECT pg_temp.assert_true(
  (SELECT count(*) = 0
   FROM claim_whatsapp_notifications(
     'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1', 5, 1,
     '60000000-0000-0000-0000-000000000003', 300
   )),
  'a future due time cannot be accelerated by the caller'
);

RESET ROLE;
UPDATE whatsapp_notification_messages
SET proxima_tentativa = clock_timestamp() - interval '1 second'
WHERE id = '60000000-0000-0000-0000-000000000003';
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','20000000-0000-0000-0000-000000000002',true); -- director A

DO $$
DECLARE
  retry_due timestamptz;
BEGIN
  PERFORM claim_whatsapp_notifications(
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1', 5, 1,
    '60000000-0000-0000-0000-000000000003', 300
  );
  PERFORM pg_temp.assert_true(
    complete_whatsapp_notification_delivery(
      '60000000-0000-0000-0000-000000000003',
      'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1',
      'retry',
      p_retry_delay_seconds => 300
    ),
    'the claim owner can schedule a transient retry'
  );
  SELECT proxima_tentativa INTO retry_due
  FROM whatsapp_notification_messages
  WHERE id = '60000000-0000-0000-0000-000000000003';
  PERFORM pg_temp.assert_true(
    retry_due > clock_timestamp() + interval '4 minutes',
    'retry due time is derived from the database clock'
  );
  PERFORM pg_temp.assert_true(
    (SELECT count(*) = 0
     FROM claim_whatsapp_notifications(
       'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2', 5, 1,
       '60000000-0000-0000-0000-000000000003', 300
     )),
    'retry cannot be claimed before its due time'
  );
END $$;

RESET ROLE;
UPDATE whatsapp_notification_messages
SET proxima_tentativa = clock_timestamp() - interval '1 second'
WHERE id = '60000000-0000-0000-0000-000000000003';
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','20000000-0000-0000-0000-000000000002',true); -- director A

DO $$
BEGIN
  PERFORM claim_whatsapp_notifications(
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb3', 5, 1,
    '60000000-0000-0000-0000-000000000003', 300
  );
  PERFORM pg_temp.assert_true(
    complete_whatsapp_notification_delivery(
      '60000000-0000-0000-0000-000000000003',
      'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb3',
      'failed',
      p_failure_code => '131026'
    ),
    'a permanent failure completes the active claim'
  );
  PERFORM pg_temp.assert_true(
    (SELECT count(*) = 0
     FROM claim_whatsapp_notifications(
       'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb4', 5, 1,
       '60000000-0000-0000-0000-000000000003', 300
     )),
    'a permanently failed message never reenters retry'
  );
END $$;

RESET ROLE;
INSERT INTO whatsapp_notification_messages(
  id, responsavel_id, aluno_id, escola_id, tipo, data_aula, idempotency_key,
  status, tentativas, proxima_tentativa, claim_token, claim_expires_at
) VALUES
  (
    '60000000-0000-0000-0000-000000000004',
    '30000000-0000-0000-0000-000000000001',
    '40000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000001',
    'presenca_falta', '2026-08-03', 'key-expired-a-1',
    'processing', 1, clock_timestamp() - interval '1 hour',
    'dddddddd-dddd-dddd-dddd-ddddddddddd1', clock_timestamp() - interval '1 second'
  ),
  (
    '60000000-0000-0000-0000-000000000005',
    '30000000-0000-0000-0000-000000000001',
    '40000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000001',
    'presenca_falta', '2026-08-04', 'key-last-crash-a-1',
    'processing', 5, clock_timestamp() - interval '1 hour',
    'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee1', clock_timestamp() - interval '1 second'
  );

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','20000000-0000-0000-0000-000000000002',true); -- director A
SELECT pg_temp.assert_true(
  NOT complete_whatsapp_notification_delivery(
    '60000000-0000-0000-0000-000000000004',
    'dddddddd-dddd-dddd-dddd-ddddddddddd1',
    'delivered',
    'wamid.expired'
  ),
  'an expired claim cannot complete after losing its lease'
);
SELECT pg_temp.assert_true(
  (SELECT count(*) = 0
   FROM claim_whatsapp_notifications(
     'dddddddd-dddd-dddd-dddd-ddddddddddd2', 5, 1,
     '60000000-0000-0000-0000-000000000004', 300
   )),
  'an expired dispatch is not sent again by a new owner'
);
SELECT pg_temp.assert_true(
  (SELECT count(*) = 0
   FROM claim_whatsapp_notifications(
     'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee2', 5, 1,
     '60000000-0000-0000-0000-000000000005', 300
   )),
  'an expired final claim is not leased again'
);
SELECT pg_temp.assert_true(
  (SELECT status = 'delivery_unknown'
      AND ultimo_erro_codigo IS NULL
      AND claim_token IS NULL
      AND claim_expires_at IS NULL
      AND reconciliation_required_at IS NOT NULL
   FROM whatsapp_notification_messages
   WHERE id = '60000000-0000-0000-0000-000000000005'),
  'an expired dispatch requires reconciliation regardless of attempt count'
);
SELECT pg_temp.assert_true(
  (SELECT status = 'delivery_unknown'
      AND ultimo_erro_codigo IS NULL
      AND reconciliation_required_at IS NOT NULL
   FROM whatsapp_notification_messages
   WHERE id = '60000000-0000-0000-0000-000000000004'),
  'an expired claim records an indeterminate delivery outcome'
);

SELECT set_config('request.jwt.claim.sub','20000000-0000-0000-0000-000000000004',true); -- professor A
SELECT pg_temp.assert_true((SELECT count(*) = 5 FROM whatsapp_notification_messages), 'professor A reads school A messages');
SELECT pg_temp.assert_true(
  (SELECT count(*) = 0
   FROM claim_whatsapp_notifications(
     'cccccccc-cccc-cccc-cccc-ccccccccccc1', 5, 50, NULL, 300
   )),
  'a professor cannot claim delivery work'
);
DO $$
BEGIN
  BEGIN
    INSERT INTO whatsapp_notification_messages(responsavel_id, aluno_id, escola_id, tipo, data_aula, idempotency_key)
    VALUES ('30000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','presenca_falta','2026-08-05','key-professor-insert');
    RAISE EXCEPTION 'professor insert unexpectedly succeeded (only directors manage)';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;
END $$;
RESET ROLE;

-- ---------------------------------------------------------------------------
-- Webhook state machine: read is terminal; accepted/sent may fail terminally
-- ---------------------------------------------------------------------------
SELECT pg_temp.assert_true(
  apply_whatsapp_delivery_status('wamid.school.a.1','sent', now()) = true,
  'sent applies after provider acceptance'
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
  apply_whatsapp_delivery_status('wamid.school.a.1','failed', now(), '131026') = false,
  'read cannot regress to failed'
);
SELECT pg_temp.assert_true(
  (SELECT status = 'read'
      AND entregue_em IS NOT NULL
      AND lido_em IS NOT NULL
      AND ultimo_erro_codigo IS NULL
   FROM whatsapp_notification_messages WHERE idempotency_key = 'key-school-a-1'),
  'a rejected failure receipt leaves the read row unchanged'
);

UPDATE whatsapp_notification_messages
SET status = 'accepted', external_message_id = 'wamid.school.b.1', ultimo_status_em = now()
WHERE idempotency_key = 'key-school-b-1';
SELECT pg_temp.assert_true(
  apply_whatsapp_delivery_status('wamid.school.b.1','failed', now(), '131026') = true,
  'accepted may transition to terminal failed'
);
SELECT pg_temp.assert_true(
  apply_whatsapp_delivery_status('wamid.school.b.1','delivered', now()) = false,
  'failed is terminal for later webhook receipts'
);
SELECT pg_temp.assert_true(
  (SELECT status = 'failed' AND ultimo_erro_codigo = '131026'
   FROM whatsapp_notification_messages WHERE idempotency_key = 'key-school-b-1'),
  'terminal webhook failure records only the provider error code'
);
SELECT pg_temp.assert_true(
  apply_whatsapp_delivery_status('wamid.desconhecido','delivered', now()) = false,
  'unknown provider receipts are ignored'
);

-- ---------------------------------------------------------------------------
-- Atomic opt-in mutation and acknowledged audit receipt
-- ---------------------------------------------------------------------------
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','20000000-0000-0000-0000-000000000002',true); -- director A
SELECT pg_temp.assert_true(
  (SELECT audit_id IS NOT NULL
      AND responsavel_id = '30000000-0000-0000-0000-000000000001'
      AND opt_in = false
      AND cancelado_em IS NOT NULL
   FROM set_guardian_whatsapp_opt_in(
     '30000000-0000-0000-0000-000000000001',
     false,
     '20000000-0000-0000-0000-000000000002'
   )),
  'opt-in mutation returns its committed audit receipt id'
);
SELECT pg_temp.assert_true(
  EXISTS (
    SELECT 1
    FROM pilot_audit_log
    WHERE event_type = 'whatsapp_optin_changed'
      AND actor_user_id = '20000000-0000-0000-0000-000000000002'
      AND entity_id = '30000000-0000-0000-0000-000000000001'
      AND redacted_metadata = '{"canal":"whatsapp","opt_in":false}'::jsonb
  ),
  'the receipt identifies an append-only redacted consent audit event'
);

RESET ROLE;
CREATE FUNCTION pg_temp.reject_whatsapp_optin_audit()
RETURNS trigger
LANGUAGE plpgsql
AS $failure$
BEGIN
  IF NEW.event_type = 'whatsapp_optin_changed' THEN
    RAISE EXCEPTION 'synthetic audit failure';
  END IF;
  RETURN NEW;
END;
$failure$;
CREATE TRIGGER reject_whatsapp_optin_audit
BEFORE INSERT ON pilot_audit_log
FOR EACH ROW EXECUTE FUNCTION pg_temp.reject_whatsapp_optin_audit();

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','20000000-0000-0000-0000-000000000002',true); -- director A
DO $$
BEGIN
  BEGIN
    PERFORM set_guardian_whatsapp_opt_in(
      '30000000-0000-0000-0000-000000000001',
      true,
      '20000000-0000-0000-0000-000000000002'
    );
    RAISE EXCEPTION 'opt-in unexpectedly committed without an audit receipt';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'synthetic audit failure' THEN RAISE; END IF;
  END;
END $$;
SELECT pg_temp.assert_true(
  (SELECT opt_in = false
      AND cancelado_em IS NOT NULL
      AND consentido_em IS NULL
   FROM whatsapp_notification_optins
   WHERE responsavel_id = '30000000-0000-0000-0000-000000000001'),
  'audit failure rolls back the consent mutation atomically'
);

RESET ROLE;
DROP TRIGGER reject_whatsapp_optin_audit ON pilot_audit_log;

-- ---------------------------------------------------------------------------
-- Compliance trail never stores direct contact or message content
-- ---------------------------------------------------------------------------
SELECT pg_temp.assert_true(
  (SELECT count(*) >= 2 FROM pilot_audit_log WHERE entity_type = 'whatsapp_notification_optins'),
  'opt-in table mutations are audit-trailed'
);
SELECT pg_temp.assert_true(
  (SELECT count(*) >= 1 FROM pilot_audit_log WHERE entity_type = 'whatsapp_notification_messages'),
  'message mutations are audit-trailed'
);
SELECT pg_temp.assert_true(
  (SELECT count(*) = 0 FROM pilot_audit_log
   WHERE redacted_metadata ?| ARRAY['telefone','cpf','body','token']),
  'audit trail never carries phones, bodies, or claim tokens'
);

ROLLBACK;
