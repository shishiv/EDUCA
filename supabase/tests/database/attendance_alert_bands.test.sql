BEGIN;
CREATE FUNCTION pg_temp.assert_true(condition boolean, message text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF condition IS DISTINCT FROM true THEN RAISE EXCEPTION 'assertion failed: %', message; END IF;
END;
$$;
CREATE FUNCTION pg_temp.set_bands(school uuid, bands jsonb) RETURNS void LANGUAGE sql AS $$
  SELECT public.set_municipal_settings(school, 'Município Sintético', 'Secretaria', 'UF', '', '', '', 2026, NULL, bands);
$$;
CREATE FUNCTION pg_temp.denied(statement text, expected_error text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  EXECUTE statement;
  RAISE EXCEPTION 'statement unexpectedly succeeded: %', statement;
EXCEPTION WHEN OTHERS THEN
  IF SQLERRM NOT LIKE expected_error || '%' THEN RAISE; END IF;
END;
$$;

INSERT INTO public.escolas(id, codigo, nome, tipo, ativo) VALUES
  ('99000000-0000-0000-0000-000000000001', 'BANDS-A', 'Escola Sintética A', 'fundamental', true),
  ('99000000-0000-0000-0000-000000000002', 'BANDS-B', 'Escola Sintética B', 'fundamental', true);
INSERT INTO public.users(id, nome, email, tipo_usuario, escola_id, ativo, primeiro_login, senha_padrao) VALUES
  ('99100000-0000-0000-0000-000000000001', 'Secretaria', 'bands.secretaria@synthetic.invalid', 'secretario', NULL, true, false, false),
  ('99100000-0000-0000-0000-000000000002', 'Admin', 'bands.admin@synthetic.invalid', 'admin', NULL, true, false, false),
  ('99100000-0000-0000-0000-000000000003', 'Direção A', 'bands.direcao@synthetic.invalid', 'diretor', '99000000-0000-0000-0000-000000000001', true, false, false),
  ('99100000-0000-0000-0000-000000000004', 'Professor A', 'bands.prof@synthetic.invalid', 'professor', '99000000-0000-0000-0000-000000000001', true, false, false),
  ('99100000-0000-0000-0000-000000000005', 'Secretário escolar', 'bands.school@synthetic.invalid', 'secretario', '99000000-0000-0000-0000-000000000001', true, false, false),
  ('99100000-0000-0000-0000-000000000006', 'Inativo', 'bands.inactive@synthetic.invalid', 'admin', NULL, false, false, false);

SELECT pg_temp.assert_true((SELECT valor::jsonb = '{"reference":80,"attention":85}'::jsonb
  FROM public.configs WHERE chave = 'attendance_alert_bands' AND escola_id IS NULL), 'persisted seeded pair');
SELECT pg_temp.assert_true(to_regprocedure('public.set_municipal_settings(uuid,text,text,text,text,text,text,integer,date)') IS NULL, 'obsolete writable entry point removed');
SELECT pg_temp.assert_true(NOT has_function_privilege('anon', 'public.set_municipal_settings(uuid,text,text,text,text,text,text,integer,date,jsonb)', 'EXECUTE')
  AND NOT has_function_privilege('service_role', 'public.set_municipal_settings(uuid,text,text,text,text,text,text,integer,date,jsonb)', 'EXECUTE'), 'no elevated or anonymous execution grant');

SET LOCAL ROLE anon;
SELECT pg_temp.denied($q$SELECT pg_temp.set_bands(NULL, '{"reference":80,"attention":85}')$q$, 'permission denied for function set_municipal_settings');
SET LOCAL ROLE service_role;
SELECT pg_temp.denied($q$SELECT pg_temp.set_bands(NULL, '{"reference":80,"attention":85}')$q$, 'permission denied for function set_municipal_settings');
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '99100000-0000-0000-0000-000000000001', true);
SELECT pg_temp.set_bands(NULL, '{"reference":78,"attention":88}');
SELECT pg_temp.set_bands('99000000-0000-0000-0000-000000000001', '{"reference":90,"attention":95}');
SELECT pg_temp.denied($q$SELECT pg_temp.set_bands('99000000-0000-0000-0000-000000000099', '{"reference":80,"attention":85}')$q$, 'PILOT_MUNICIPAL_SETTINGS_SCHOOL_DENIED');
SELECT pg_temp.assert_true((SELECT attendance_bands = '{"reference":78,"attention":88}'::jsonb FROM public.get_municipal_settings('99000000-0000-0000-0000-000000000002', 2026)), 'school B inherits edited default, not A override');

SELECT pg_temp.set_bands('99000000-0000-0000-0000-000000000002', '{"reference":82,"attention":91}');

DO $$
DECLARE invalid jsonb;
BEGIN
  FOREACH invalid IN ARRAY ARRAY[NULL, '{}'::jsonb, '{"reference":0,"attention":85}'::jsonb,
    '{"reference":-1,"attention":85}', '{"reference":85,"attention":85}',
    '{"reference":90,"attention":85}', '{"reference":80,"attention":101}',
    '{"reference":"80","attention":85}', '{"reference":80,"attention":85,"other":1}'] LOOP
    PERFORM pg_temp.denied(format('SELECT pg_temp.set_bands(NULL, %L::jsonb)', invalid), 'PILOT_MUNICIPAL_SETTINGS_ATTENDANCE_BANDS_INVALID');
  END LOOP;
END;
$$;
SELECT pg_temp.assert_true((SELECT attendance_bands = '{"reference":78,"attention":88}'::jsonb FROM public.get_municipal_settings(NULL, 2026)), 'invalid writes preserve the previous pair');
SELECT set_config('request.jwt.claim.sub', '99100000-0000-0000-0000-000000000002', true);
SELECT pg_temp.set_bands(NULL, '{"reference":79.5,"attention":89.5}');

DO $$
DECLARE actor text;
BEGIN
  FOREACH actor IN ARRAY ARRAY['99100000-0000-0000-0000-000000000003', '99100000-0000-0000-0000-000000000004',
    '99100000-0000-0000-0000-000000000005', '99100000-0000-0000-0000-000000000006', '99100000-0000-0000-0000-000000000099'] LOOP
    PERFORM set_config('request.jwt.claim.sub', actor, true);
    PERFORM pg_temp.denied($q$SELECT pg_temp.set_bands(NULL, '{"reference":70,"attention":75}')$q$, 'PILOT_MUNICIPAL_SETTINGS_WRITE_DENIED');
    PERFORM pg_temp.denied($q$SELECT pg_temp.set_bands('99000000-0000-0000-0000-000000000001', '{"reference":70,"attention":75}')$q$, 'PILOT_MUNICIPAL_SETTINGS_WRITE_DENIED');
    IF actor IN ('99100000-0000-0000-0000-000000000006', '99100000-0000-0000-0000-000000000099') THEN
      PERFORM pg_temp.denied($q$SELECT * FROM public.get_municipal_settings('99000000-0000-0000-0000-000000000001', 2026)$q$, 'PILOT_MUNICIPAL_SETTINGS_SCHOOL_DENIED');
    ELSE
      PERFORM pg_temp.assert_true((SELECT attendance_bands = '{"reference":90,"attention":95}'::jsonb FROM public.get_municipal_settings('99000000-0000-0000-0000-000000000001', 2026)), 'authorized school read resolves whole override');
      PERFORM pg_temp.denied($q$SELECT * FROM public.get_municipal_settings('99000000-0000-0000-0000-000000000002', 2026)$q$, 'PILOT_MUNICIPAL_SETTINGS_SCHOOL_DENIED');
      PERFORM pg_temp.assert_true((SELECT count(*) = 0 FROM public.configs WHERE chave = 'attendance_alert_bands' AND escola_id = '99000000-0000-0000-0000-000000000002'), 'foreign overrides hidden by RLS');
    END IF;
  END LOOP;
END;
$$;

-- Even the municipal actor cannot bypass the RPC with a direct table mutation.
SELECT set_config('request.jwt.claim.sub', '99100000-0000-0000-0000-000000000001', true);
WITH changed AS (UPDATE public.configs SET valor = '{"reference":10,"attention":20}' WHERE chave = 'attendance_alert_bands' RETURNING id)
SELECT pg_temp.assert_true((SELECT count(*) = 0 FROM changed), 'direct update denied');
SELECT pg_temp.assert_true((SELECT attendance_bands = '{"reference":90,"attention":95}'::jsonb FROM public.get_municipal_settings('99000000-0000-0000-0000-000000000001', 2026)), 'later default changes do not overwrite school override');
RESET ROLE;
SELECT pg_temp.assert_true((SELECT count(*) = 4 FROM public.audit_trail WHERE dados_novos->>'chave' = 'attendance_alert_bands'
  AND usuario_id IN ('99100000-0000-0000-0000-000000000001', '99100000-0000-0000-0000-000000000002')), 'only successful writes audited transactionally');
SELECT pg_temp.assert_true(EXISTS(SELECT 1 FROM public.audit_trail WHERE dados_anteriores->'valor' = '{"reference":78,"attention":88}'::jsonb
  AND dados_novos->'valor' = '{"reference":79.5,"attention":89.5}'::jsonb AND escola_id IS NULL), 'audit records before and after plus scope');
DELETE FROM public.configs WHERE chave = 'attendance_alert_bands'
  AND (escola_id IS NULL OR escola_id = '99000000-0000-0000-0000-000000000002');
SET LOCAL ROLE authenticated;
SELECT pg_temp.denied($q$SELECT * FROM public.get_municipal_settings('99000000-0000-0000-0000-000000000002', 2026)$q$, 'PILOT_MUNICIPAL_SETTINGS_ATTENDANCE_BANDS_MISSING');
SELECT pg_temp.assert_true((SELECT attendance_bands = '{"reference":90,"attention":95}'::jsonb FROM public.get_municipal_settings('99000000-0000-0000-0000-000000000001', 2026)), 'valid override remains usable without default');
ROLLBACK;
