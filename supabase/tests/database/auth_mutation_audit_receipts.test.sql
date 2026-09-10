BEGIN;

CREATE FUNCTION pg_temp.assert_true(condition boolean, message text)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF condition IS DISTINCT FROM true THEN RAISE EXCEPTION 'assertion failed: %', message; END IF;
END;
$$;

CREATE FUNCTION pg_temp.expect_audit_denial(
  event_name text, target_id text, school_id uuid, metadata jsonb, expected_code text
)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  PERFORM public.write_pilot_audit_event(event_name, 'user', target_id, school_id, metadata);
  RAISE EXCEPTION 'audit unexpectedly accepted: %', event_name;
EXCEPTION WHEN raise_exception THEN
  IF SQLERRM NOT LIKE expected_code || ':%' THEN RAISE; END IF;
END;
$$;

INSERT INTO public.escolas(id, codigo, nome, tipo, ativo) VALUES
  ('b5100000-0000-0000-0000-000000000001', 'AUDIT-A', 'Escola Sintética Audit A', 'fundamental', true),
  ('b5100000-0000-0000-0000-000000000002', 'AUDIT-B', 'Escola Sintética Audit B', 'fundamental', true);
INSERT INTO public.users(id, nome, email, tipo_usuario, escola_id, ativo, primeiro_login, senha_padrao) VALUES
  ('b5200000-0000-0000-0000-000000000001', 'Admin Sintético A', 'audit-admin-a@synthetic.invalid', 'admin', 'b5100000-0000-0000-0000-000000000001', true, false, false),
  ('b5200000-0000-0000-0000-000000000002', 'Professor Sintético A', 'audit-prof-a@synthetic.invalid', 'professor', 'b5100000-0000-0000-0000-000000000001', true, false, false),
  ('b5200000-0000-0000-0000-000000000003', 'Professor Sintético B', 'audit-prof-b@synthetic.invalid', 'professor', 'b5100000-0000-0000-0000-000000000002', true, false, false),
  ('b5200000-0000-0000-0000-000000000004', 'Admin Inativo', 'audit-inactive@synthetic.invalid', 'admin', 'b5100000-0000-0000-0000-000000000001', false, false, false);

SELECT pg_temp.assert_true(
  has_function_privilege('authenticated', 'public.write_pilot_audit_event(text,text,text,uuid,jsonb)', 'EXECUTE')
    AND NOT has_function_privilege('anon', 'public.write_pilot_audit_event(text,text,text,uuid,jsonb)', 'EXECUTE'),
  'mutation receipts require an authenticated role'
);

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', 'b5200000-0000-0000-0000-000000000002', true);
SELECT pg_temp.assert_true(
  public.write_pilot_audit_event('profile_updated', 'user', 'b5200000-0000-0000-0000-000000000002', 'b5100000-0000-0000-0000-000000000001', '{}') IS NOT NULL,
  'self profile mutation returns a persisted receipt'
);
SELECT pg_temp.expect_audit_denial('profile_updated', 'b5200000-0000-0000-0000-000000000003', 'b5100000-0000-0000-0000-000000000002', '{}', 'PILOT_AUDIT_ENTITY_DENIED');
SELECT pg_temp.expect_audit_denial('profile_updated', 'b5200000-0000-0000-0000-000000000002', 'b5100000-0000-0000-0000-000000000002', '{}', 'PILOT_AUDIT_SCHOOL_DENIED');
SELECT pg_temp.expect_audit_denial('profile_updated', 'b5200000-0000-0000-0000-000000000002', 'b5100000-0000-0000-0000-000000000001', '{"email":"private@synthetic.invalid"}', 'PILOT_AUDIT_METADATA_NOT_ALLOWED');
SELECT pg_temp.expect_audit_denial('user_updated', 'b5200000-0000-0000-0000-000000000002', 'b5100000-0000-0000-0000-000000000001', '{}', 'PILOT_AUDIT_ROLE_DENIED');

SELECT set_config('request.jwt.claim.sub', 'b5200000-0000-0000-0000-000000000001', true);
SELECT pg_temp.assert_true(
  public.write_pilot_audit_event('user_updated', 'user', 'b5200000-0000-0000-0000-000000000002', 'b5100000-0000-0000-0000-000000000001', '{}') IS NOT NULL,
  'managed profile update returns a receipt'
);
SELECT pg_temp.assert_true(
  public.write_pilot_audit_event('user_status_updated', 'user', 'b5200000-0000-0000-0000-000000000002', 'b5100000-0000-0000-0000-000000000001', '{}') IS NOT NULL,
  'managed status update returns a receipt'
);
SELECT pg_temp.expect_audit_denial('user_updated', 'b5200000-0000-0000-0000-000000000003', 'b5100000-0000-0000-0000-000000000002', '{}', 'PILOT_AUDIT_SCHOOL_DENIED');
SELECT pg_temp.expect_audit_denial('user_status_updated', 'b5200000-0000-0000-0000-000000000002', 'b5100000-0000-0000-0000-000000000002', '{}', 'PILOT_AUDIT_ENTITY_DENIED');
SELECT pg_temp.expect_audit_denial('user_updated', 'b5200000-0000-0000-0000-000000000099', 'b5100000-0000-0000-0000-000000000001', '{}', 'PILOT_AUDIT_ENTITY_DENIED');

SELECT set_config('request.jwt.claim.sub', 'b5200000-0000-0000-0000-000000000004', true);
SELECT pg_temp.expect_audit_denial('user_updated', 'b5200000-0000-0000-0000-000000000002', 'b5100000-0000-0000-0000-000000000001', '{}', 'PILOT_AUDIT_ACTOR_INACTIVE');
SELECT set_config('request.jwt.claim.sub', '', true);
SELECT pg_temp.expect_audit_denial('user_updated', 'b5200000-0000-0000-0000-000000000002', 'b5100000-0000-0000-0000-000000000001', '{}', 'PILOT_AUDIT_AUTH_REQUIRED');

RESET ROLE;
SELECT pg_temp.assert_true(
  (SELECT count(*) = 3 FROM public.pilot_audit_log
    WHERE actor_user_id IN ('b5200000-0000-0000-0000-000000000001', 'b5200000-0000-0000-0000-000000000002')
      AND entity_id = 'b5200000-0000-0000-0000-000000000002'
      AND escola_id = 'b5100000-0000-0000-0000-000000000001'
      AND event_type IN ('profile_updated', 'user_updated', 'user_status_updated')
      AND redacted_metadata = '{}'::jsonb AND correlation_id IS NOT NULL),
  'successful receipts preserve actor, school and target without personal metadata'
);

ROLLBACK;
