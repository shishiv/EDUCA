BEGIN;

CREATE FUNCTION pg_temp.assert_invitation_audit(condition boolean, message text)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF condition IS DISTINCT FROM true THEN RAISE EXCEPTION 'assertion failed: %', message; END IF;
END;
$$;

INSERT INTO public.escolas(id, codigo, nome, tipo, ativo) VALUES
  ('ad100000-0000-4000-8000-000000000001', 'INV-AUDIT', 'Escola Sintética Convite', 'fundamental', true);
INSERT INTO public.users(id, nome, email, tipo_usuario, escola_id, ativo, primeiro_login, senha_padrao) VALUES
  ('ad200000-0000-4000-8000-000000000001', 'Secretaria Sintética', 'invite-secretary@synthetic.invalid', 'secretario', NULL, true, false, false),
  ('ad200000-0000-4000-8000-000000000002', 'Professor Sintético', 'invite-teacher@synthetic.invalid', 'professor', 'ad100000-0000-4000-8000-000000000001', true, true, true),
  ('ad200000-0000-4000-8000-000000000003', 'Secretaria Inativa', 'invite-inactive@synthetic.invalid', 'secretario', NULL, false, false, false),
  ('ad200000-0000-4000-8000-000000000004', 'Direção Sintética', 'invite-director@synthetic.invalid', 'diretor', 'ad100000-0000-4000-8000-000000000001', true, false, false);
INSERT INTO public.pilot_user_invitations(id, auth_user_id, email, invited_role, escola_id, invited_by) VALUES
  ('ad300000-0000-4000-8000-000000000001', 'ad200000-0000-4000-8000-000000000002', 'invite-teacher@synthetic.invalid', 'professor', 'ad100000-0000-4000-8000-000000000001', 'ad200000-0000-4000-8000-000000000001');

CREATE FUNCTION pg_temp.reject_invitation_audit() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.event_type = 'user_invited' AND current_setting('quality.invitation_audit_fail', true) = 'true' THEN
    RAISE EXCEPTION 'SYNTHETIC_AUDIT_STORAGE_FAILURE';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER invitation_audit_failure BEFORE INSERT ON public.pilot_audit_log
FOR EACH ROW EXECUTE FUNCTION pg_temp.reject_invitation_audit();

SELECT pg_temp.assert_invitation_audit(
  NOT has_function_privilege('anon', 'public.ensure_pilot_invitation_audit(uuid)', 'EXECUTE'),
  'anonymous callers cannot recover invitation receipts'
);
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', 'ad200000-0000-4000-8000-000000000001', true);
SELECT set_config('quality.invitation_audit_fail', 'true', true);
DO $$ BEGIN
  PERFORM public.ensure_pilot_invitation_audit('ad300000-0000-4000-8000-000000000001');
  RAISE EXCEPTION 'failed audit storage was accepted';
EXCEPTION WHEN raise_exception THEN
  IF SQLERRM <> 'SYNTHETIC_AUDIT_STORAGE_FAILURE' THEN RAISE; END IF;
END; $$;
SELECT pg_temp.assert_invitation_audit(
  NOT EXISTS (SELECT 1 FROM public.pilot_audit_log WHERE entity_id = 'ad200000-0000-4000-8000-000000000002' AND event_type = 'user_invited'),
  'a failed receipt is not reported as persisted'
);
SELECT set_config('quality.invitation_audit_fail', 'false', true);
SELECT set_config('quality.invitation_receipt', public.ensure_pilot_invitation_audit('ad300000-0000-4000-8000-000000000001')::text, true);
SELECT pg_temp.assert_invitation_audit(
  public.ensure_pilot_invitation_audit('ad300000-0000-4000-8000-000000000001')::text = current_setting('quality.invitation_receipt'),
  'retry acknowledges the same persisted receipt'
);
SELECT pg_temp.assert_invitation_audit(
  (SELECT count(*) = 1 FROM public.pilot_audit_log
    WHERE entity_id = 'ad200000-0000-4000-8000-000000000002' AND event_type = 'user_invited'
      AND actor_user_id = 'ad200000-0000-4000-8000-000000000001'
      AND escola_id = 'ad100000-0000-4000-8000-000000000001'
      AND redacted_metadata = '{"role":"professor"}'::jsonb),
  'recovery derives school and role from the invitation and writes one redacted receipt'
);
DO $$ BEGIN
  PERFORM public.ensure_pilot_invitation_audit('ad300000-0000-4000-8000-000000000099');
  RAISE EXCEPTION 'missing invitation was accepted';
EXCEPTION WHEN raise_exception THEN
  IF SQLERRM NOT LIKE 'PILOT_INVITE_AUDIT_NOT_FOUND:%' THEN RAISE; END IF;
END; $$;
DO $$ DECLARE actor_id text; BEGIN
  FOREACH actor_id IN ARRAY ARRAY[
    'ad200000-0000-4000-8000-000000000002',
    'ad200000-0000-4000-8000-000000000003',
    'ad200000-0000-4000-8000-000000000004', ''
  ] LOOP
    PERFORM set_config('request.jwt.claim.sub', actor_id, true);
    BEGIN
      PERFORM public.ensure_pilot_invitation_audit('ad300000-0000-4000-8000-000000000001');
      RAISE EXCEPTION 'unauthorized actor was accepted';
    EXCEPTION WHEN raise_exception THEN
      IF SQLERRM NOT LIKE 'PILOT_INVITE_AUDIT_ACTOR_DENIED:%' THEN RAISE; END IF;
    END;
  END LOOP;
END; $$;
RESET ROLE;
ROLLBACK;
