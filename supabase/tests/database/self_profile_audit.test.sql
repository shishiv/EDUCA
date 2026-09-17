BEGIN;

CREATE FUNCTION pg_temp.assert_true(condition boolean, message text)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF condition IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'assertion failed: %', message;
  END IF;
END;
$$;

CREATE FUNCTION pg_temp.expect_profile_denial(p_nome text, expected_code text)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  PERFORM public.update_current_pilot_profile_name(p_nome);
  RAISE EXCEPTION 'profile update unexpectedly accepted';
EXCEPTION WHEN raise_exception THEN
  IF SQLERRM NOT LIKE expected_code || ':%' THEN
    RAISE;
  END IF;
END;
$$;

INSERT INTO public.escolas(id, codigo, nome, tipo, ativo) VALUES
  ('b5100000-0000-0000-0000-000000000041', 'PROFILE-A', 'Escola Sintética Perfil', 'fundamental', true);
INSERT INTO public.users(id, nome, email, tipo_usuario, escola_id, ativo, primeiro_login, senha_padrao) VALUES
  ('b5200000-0000-0000-0000-000000000041', 'Professor Perfil', 'profile-professor@synthetic.invalid', 'professor', 'b5100000-0000-0000-0000-000000000041', true, false, false),
  ('b5200000-0000-0000-0000-000000000042', 'Responsável Perfil', 'profile-responsavel@synthetic.invalid', 'responsavel', 'b5100000-0000-0000-0000-000000000041', true, false, false);

SELECT pg_temp.assert_true(
  has_function_privilege('authenticated', 'public.update_current_pilot_profile_name(text)', 'EXECUTE')
    AND NOT has_function_privilege('anon', 'public.update_current_pilot_profile_name(text)', 'EXECUTE'),
  'self-profile mutation requires an authenticated role'
);

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', 'b5200000-0000-0000-0000-000000000041', true);
SELECT pg_temp.assert_true(
  (
    SELECT updated.nome = 'Nome Atualizado'
      AND updated.id = 'b5200000-0000-0000-0000-000000000041'
      AND updated.audit_id IS NOT NULL
    FROM public.update_current_pilot_profile_name('  Nome Atualizado  ') AS updated
  ),
  'self profile RPC returns the trimmed profile and audit receipt'
);
SELECT pg_temp.assert_true(
  (SELECT nome = 'Nome Atualizado' FROM public.users WHERE id = 'b5200000-0000-0000-0000-000000000041'),
  'self profile RPC persists the trimmed name'
);
RESET ROLE;
SELECT pg_temp.assert_true(
  (
    SELECT count(*) = 1
    FROM public.pilot_audit_log
    WHERE actor_user_id = 'b5200000-0000-0000-0000-000000000041'
      AND escola_id = 'b5100000-0000-0000-0000-000000000041'
      AND event_type = 'profile_updated'
      AND entity_type = 'user'
      AND entity_id = 'b5200000-0000-0000-0000-000000000041'
      AND redacted_metadata = '{}'::jsonb
  ),
  'self profile RPC records one redacted receipt in the same authorized flow'
);
SET LOCAL ROLE authenticated;
SELECT pg_temp.expect_profile_denial(' ', 'PROFILE_NAME_INVALID');
SELECT pg_temp.assert_true(
  (SELECT nome = 'Nome Atualizado' FROM public.users WHERE id = 'b5200000-0000-0000-0000-000000000041'),
  'invalid profile input leaves the stored name unchanged'
);

SELECT set_config('request.jwt.claim.sub', 'b5200000-0000-0000-0000-000000000042', true);
SELECT pg_temp.expect_profile_denial('Nome Não Autorizado', 'PROFILE_ROLE_DENIED');
SELECT pg_temp.assert_true(
  (SELECT nome = 'Responsável Perfil' FROM public.users WHERE id = 'b5200000-0000-0000-0000-000000000042'),
  'a direct RPC call from an unsupported active role cannot change a profile'
);

RESET ROLE;

-- A receipt failure must roll back the name update in the same transaction.
CREATE FUNCTION pg_temp.reject_profile_receipt()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'SYNTHETIC_AUDIT_FAILURE: injected receipt storage failure';
END;
$$;
CREATE TRIGGER quality_profile_receipt_fault
BEFORE INSERT ON public.pilot_audit_log
FOR EACH ROW WHEN (NEW.event_type = 'profile_updated')
EXECUTE FUNCTION pg_temp.reject_profile_receipt();

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', 'b5200000-0000-0000-0000-000000000041', true);
SELECT pg_temp.expect_profile_denial('Nome Deve Reverter', 'SYNTHETIC_AUDIT_FAILURE');
SELECT pg_temp.assert_true(
  (SELECT nome = 'Nome Atualizado' FROM public.users WHERE id = 'b5200000-0000-0000-0000-000000000041'),
  'receipt failure rolls back the preceding name update'
);
RESET ROLE;
SELECT pg_temp.assert_true(
  (SELECT count(*) = 1 FROM public.pilot_audit_log
   WHERE event_type = 'profile_updated'
     AND entity_id = 'b5200000-0000-0000-0000-000000000041'),
  'a failed update produces no success receipt'
);
DROP TRIGGER quality_profile_receipt_fault ON public.pilot_audit_log;

UPDATE public.users SET ativo = false WHERE id = 'b5200000-0000-0000-0000-000000000041';
SET LOCAL ROLE authenticated;
SELECT pg_temp.expect_profile_denial('Nome Inativo', 'PROFILE_ACTOR_INACTIVE');
SELECT set_config('request.jwt.claim.sub', '', true);
SELECT pg_temp.expect_profile_denial('Nome Anônimo', 'PROFILE_AUTH_REQUIRED');
RESET ROLE;
ROLLBACK;
