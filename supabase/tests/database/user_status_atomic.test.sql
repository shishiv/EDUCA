BEGIN;
CREATE FUNCTION pg_temp.assert_status(ok boolean, label text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN IF ok IS DISTINCT FROM true THEN RAISE EXCEPTION 'F04 assertion failed: %', label; END IF; END $$;
CREATE FUNCTION pg_temp.status_denied(actor_id uuid, target_id uuid, desired boolean, expected text)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  PERFORM set_config('request.jwt.claim.sub', actor_id::text, true);
  BEGIN
    PERFORM public.set_governed_user_status(target_id, desired);
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM = expected THEN RETURN; END IF;
    RAISE;
  END;
  RAISE EXCEPTION 'F04 unexpected success, expected %', expected;
END $$;

INSERT INTO public.escolas(id,codigo,nome,tipo) VALUES
 ('f0400000-0000-4000-8000-000000000001','F04-A','F04 Sintética A','fundamental'),
 ('f0400000-0000-4000-8000-000000000002','F04-B','F04 Sintética B','fundamental');
INSERT INTO public.users(id,nome,email,tipo_usuario,escola_id,ativo) VALUES
 ('f0410000-0000-4000-8000-000000000001','F04 municipal','f04-municipal@synthetic.invalid','admin',NULL,true),
 ('f0410000-0000-4000-8000-000000000002','F04 admin A','f04-admin@synthetic.invalid','admin','f0400000-0000-4000-8000-000000000001',true),
 ('f0410000-0000-4000-8000-000000000003','F04 inactive','f04-inactive@synthetic.invalid','admin',NULL,false),
 ('f0410000-0000-4000-8000-000000000004','F04 secretary','f04-secretary@synthetic.invalid','secretario',NULL,true),
 ('f0410000-0000-4000-8000-000000000005','F04 target A','f04-target-a@synthetic.invalid','professor','f0400000-0000-4000-8000-000000000001',true),
 ('f0410000-0000-4000-8000-000000000006','F04 target B','f04-target-b@synthetic.invalid','professor','f0400000-0000-4000-8000-000000000002',true);

SELECT pg_temp.assert_status(
 has_function_privilege('authenticated','public.set_governed_user_status(uuid,boolean)','EXECUTE')
 AND NOT has_function_privilege('anon','public.set_governed_user_status(uuid,boolean)','EXECUTE')
 AND NOT has_table_privilege('authenticated','public.users','UPDATE')
 AND NOT has_table_privilege('authenticated','public.pilot_audit_log','INSERT'), 'RPC only; no broad browser writes');
SELECT pg_temp.assert_status((SELECT relrowsecurity FROM pg_class WHERE oid='public.users'::regclass), 'RLS retained');

SET LOCAL ROLE authenticated;
SELECT pg_temp.status_denied('f0410000-0000-4000-8000-000000000003','f0410000-0000-4000-8000-000000000005',false,'PILOT_USER_STATUS_ROLE_DENIED');
SELECT pg_temp.status_denied('f0410000-0000-4000-8000-000000000004','f0410000-0000-4000-8000-000000000005',false,'PILOT_USER_STATUS_ROLE_DENIED');
SELECT pg_temp.status_denied('f0410000-0000-4000-8000-000000000002','f0410000-0000-4000-8000-000000000006',false,'PILOT_USER_STATUS_SCHOOL_DENIED');
SELECT pg_temp.status_denied('f0410000-0000-4000-8000-000000000002','f0410000-0000-4000-8000-000000000001',false,'PILOT_USER_STATUS_SCHOOL_DENIED');
SELECT pg_temp.status_denied('f0410000-0000-4000-8000-000000000001','f0410000-0000-4000-8000-000000000099',false,'PILOT_USER_STATUS_TARGET_NOT_FOUND');
SELECT pg_temp.status_denied('f0410000-0000-4000-8000-000000000099','f0410000-0000-4000-8000-000000000005',false,'PILOT_USER_STATUS_ROLE_DENIED');
SELECT pg_temp.status_denied('f0410000-0000-4000-8000-000000000001','f0410000-0000-4000-8000-000000000005',NULL,'PILOT_USER_STATUS_INVALID');
SELECT pg_temp.status_denied(NULL,'f0410000-0000-4000-8000-000000000005',false,'PILOT_USER_STATUS_AUTH_REQUIRED');

-- Only the semantic receipt fails. The generic users audit trigger remains enabled.
RESET ROLE;
CREATE FUNCTION pg_temp.fail_status_receipt() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.event_type = 'user_status_updated' THEN
    IF current_setting('f04.suppress_receipt', true) = 'true' THEN RETURN NULL; END IF;
    RAISE EXCEPTION 'F04_RECEIPT_FAILURE';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER f04_receipt_failure BEFORE INSERT ON public.pilot_audit_log
FOR EACH ROW EXECUTE FUNCTION pg_temp.fail_status_receipt();
SET LOCAL ROLE authenticated;
SELECT pg_temp.status_denied('f0410000-0000-4000-8000-000000000002','f0410000-0000-4000-8000-000000000005',false,'F04_RECEIPT_FAILURE');
SELECT set_config('f04.suppress_receipt','true',true);
SELECT pg_temp.status_denied('f0410000-0000-4000-8000-000000000002','f0410000-0000-4000-8000-000000000005',false,'PILOT_USER_STATUS_AUDIT_INCOMPLETE');
RESET ROLE;
SELECT pg_temp.assert_status((SELECT ativo FROM public.users WHERE id='f0410000-0000-4000-8000-000000000005'), 'receipt failure and suppression preserve active=true');
SELECT pg_temp.assert_status(NOT EXISTS(SELECT 1 FROM public.pilot_audit_log WHERE entity_id='f0410000-0000-4000-8000-000000000005' AND event_type IN ('user_status_updated','update')), 'no partial semantic or generic update receipt');
DROP TRIGGER f04_receipt_failure ON public.pilot_audit_log;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','f0410000-0000-4000-8000-000000000002',true);
SELECT pg_temp.assert_status((SELECT user_id='f0410000-0000-4000-8000-000000000005' AND ativo=false AND audit_id IS NOT NULL FROM public.set_governed_user_status('f0410000-0000-4000-8000-000000000005',false)), 'same-school admin deactivates with receipt');
SELECT pg_temp.assert_status((SELECT ativo=false AND audit_id IS NOT NULL FROM public.set_governed_user_status('f0410000-0000-4000-8000-000000000005',false)), 'retry is desired-state idempotent');
RESET ROLE;
SELECT pg_temp.assert_status((SELECT count(*)=2 FROM public.pilot_audit_log WHERE event_type='user_status_updated' AND entity_id='f0410000-0000-4000-8000-000000000005'), 'one receipt per accepted command');
SELECT pg_temp.assert_status(EXISTS(SELECT 1 FROM public.pilot_audit_log WHERE event_type='user_status_updated' AND entity_id='f0410000-0000-4000-8000-000000000005' AND actor_user_id='f0410000-0000-4000-8000-000000000002' AND escola_id='f0400000-0000-4000-8000-000000000001' AND redacted_metadata='{"previous_active":false,"active":false,"changed":false}'), 'no-op receipt is truthful and server-scoped');

-- Activation also rolls back. An inactive target is allowed; an inactive actor is not.
CREATE TRIGGER f04_receipt_failure BEFORE INSERT ON public.pilot_audit_log FOR EACH ROW EXECUTE FUNCTION pg_temp.fail_status_receipt();
SELECT set_config('f04.suppress_receipt','false',true);
SET LOCAL ROLE authenticated;
SELECT pg_temp.status_denied('f0410000-0000-4000-8000-000000000001','f0410000-0000-4000-8000-000000000005',true,'F04_RECEIPT_FAILURE');
RESET ROLE;
SELECT pg_temp.assert_status((SELECT ativo=false FROM public.users WHERE id='f0410000-0000-4000-8000-000000000005'), 'failed activation preserves active=false');
DROP TRIGGER f04_receipt_failure ON public.pilot_audit_log;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','f0410000-0000-4000-8000-000000000001',true);
SELECT pg_temp.assert_status((SELECT ativo=true AND audit_id IS NOT NULL FROM public.set_governed_user_status('f0410000-0000-4000-8000-000000000005',true)), 'municipal admin activates inactive target');
SELECT pg_temp.assert_status((SELECT ativo=false AND audit_id IS NOT NULL FROM public.set_governed_user_status('f0410000-0000-4000-8000-000000000006',false)), 'municipal admin reaches school B');
SELECT pg_temp.assert_status((SELECT ativo=false AND audit_id IS NOT NULL FROM public.set_governed_user_status('f0410000-0000-4000-8000-000000000001',false)), 'existing self-deactivation authority is preserved');
SELECT pg_temp.status_denied('f0410000-0000-4000-8000-000000000001','f0410000-0000-4000-8000-000000000001',true,'PILOT_USER_STATUS_ROLE_DENIED');
ROLLBACK;
\echo F04_USER_STATUS_ATOMIC_OK
