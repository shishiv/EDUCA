BEGIN;

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

INSERT INTO public.escolas(id, codigo, nome, tipo, ativo)
VALUES
  ('97000000-0000-0000-0000-000000000001', 'MUNICIPAL-A', 'Escola Municipal Sintética A', 'fundamental', true),
  ('97000000-0000-0000-0000-000000000002', 'MUNICIPAL-B', 'Escola Municipal Sintética B', 'fundamental', true);

INSERT INTO public.users(id, nome, email, tipo_usuario, escola_id, ativo, primeiro_login, senha_padrao)
VALUES
  ('97100000-0000-0000-0000-000000000001', 'Secretaria Municipal Sintética', 'secretaria.municipal@synthetic.invalid', 'secretario', NULL, true, false, false),
  ('97100000-0000-0000-0000-000000000002', 'Direção Municipal A', 'direcao.municipal.a@synthetic.invalid', 'diretor', '97000000-0000-0000-0000-000000000001', true, false, false),
  ('97100000-0000-0000-0000-000000000003', 'Direção Municipal B', 'direcao.municipal.b@synthetic.invalid', 'diretor', '97000000-0000-0000-0000-000000000002', true, false, false);

SELECT pg_temp.assert_true(
  (SELECT count(*) = 3
   FROM public.configs
   WHERE escola_id IS NULL
     AND (chave, valor) IN (
       ('municipal_name', 'Município'),
       ('municipal_education_department', 'Secretaria de Educação'),
       ('municipal_state', 'UF')
     )),
  'neutral municipal defaults are seeded in the database'
);

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '97100000-0000-0000-0000-000000000002', true);

SELECT pg_temp.assert_true(
  (SELECT municipality_name = 'Município'
    AND educacenso_deadline IS NULL
   FROM public.get_municipal_settings('97000000-0000-0000-0000-000000000001', EXTRACT(YEAR FROM CURRENT_DATE)::integer)),
  'a director resolves the neutral municipal defaults for the own school'
);

DO $$
BEGIN
  PERFORM * FROM public.get_municipal_settings('97000000-0000-0000-0000-000000000002', EXTRACT(YEAR FROM CURRENT_DATE)::integer);
  RAISE EXCEPTION 'director read another school municipal settings';
EXCEPTION
  WHEN OTHERS THEN
    IF SQLERRM NOT LIKE 'PILOT_MUNICIPAL_SETTINGS_SCHOOL_DENIED%' THEN RAISE; END IF;
END;
$$;

DO $$
BEGIN
  PERFORM * FROM public.get_municipal_settings('97000000-0000-0000-0000-000000000099', EXTRACT(YEAR FROM CURRENT_DATE)::integer);
  RAISE EXCEPTION 'director read an unknown school municipal setting';
EXCEPTION
  WHEN OTHERS THEN
    IF SQLERRM NOT LIKE 'PILOT_MUNICIPAL_SETTINGS_SCHOOL_DENIED%' THEN RAISE; END IF;
END;
$$;

DO $$
BEGIN
  PERFORM * FROM public.set_municipal_settings(
    '97000000-0000-0000-0000-000000000001', 'Direção não autorizada', 'Secretaria', 'UF', '', '', '',
    EXTRACT(YEAR FROM CURRENT_DATE)::integer, NULL
  );
  RAISE EXCEPTION 'director changed municipal settings';
EXCEPTION
  WHEN OTHERS THEN
    IF SQLERRM NOT LIKE 'PILOT_MUNICIPAL_SETTINGS_WRITE_DENIED%' THEN RAISE; END IF;
END;
$$;

SELECT set_config('request.jwt.claim.sub', '97100000-0000-0000-0000-000000000001', true);

SELECT public.set_municipal_settings(
  NULL, 'Município Configurado', 'Secretaria Configurada', 'SP', '11999990000', 'dpo@synthetic.invalid', 'Rua Sintética',
  EXTRACT(YEAR FROM CURRENT_DATE)::integer, make_date(EXTRACT(YEAR FROM CURRENT_DATE)::integer, 8, 31)
);

SELECT public.set_municipal_settings(
  '97000000-0000-0000-0000-000000000002', 'Município Escola B', 'Secretaria Escola B', 'SP', '', '', '',
  EXTRACT(YEAR FROM CURRENT_DATE)::integer, make_date(EXTRACT(YEAR FROM CURRENT_DATE)::integer, 9, 15)
);

SELECT pg_temp.assert_true(
  (SELECT municipality_name = 'Município Configurado'
    AND educacenso_deadline = make_date(EXTRACT(YEAR FROM CURRENT_DATE)::integer, 8, 31)
   FROM public.get_municipal_settings(NULL, EXTRACT(YEAR FROM CURRENT_DATE)::integer)),
  'a municipal administrator updates the global identity and annual deadline'
);

SELECT set_config('request.jwt.claim.sub', '97100000-0000-0000-0000-000000000003', true);

SELECT pg_temp.assert_true(
  (SELECT municipality_name = 'Município Escola B'
    AND educacenso_deadline = make_date(EXTRACT(YEAR FROM CURRENT_DATE)::integer, 9, 15)
   FROM public.get_municipal_settings('97000000-0000-0000-0000-000000000002', EXTRACT(YEAR FROM CURRENT_DATE)::integer)),
  'a school override wins only for its own school'
);

DO $$
BEGIN
  PERFORM * FROM public.get_municipal_settings('97000000-0000-0000-0000-000000000001', EXTRACT(YEAR FROM CURRENT_DATE)::integer);
  RAISE EXCEPTION 'director B read school A municipal settings';
EXCEPTION
  WHEN OTHERS THEN
    IF SQLERRM NOT LIKE 'PILOT_MUNICIPAL_SETTINGS_SCHOOL_DENIED%' THEN RAISE; END IF;
END;
$$;

SELECT set_config('request.jwt.claim.sub', '97100000-0000-0000-0000-000000000002', true);

SELECT pg_temp.assert_true(
  (SELECT municipality_name = 'Município Configurado'
    AND educacenso_deadline = make_date(EXTRACT(YEAR FROM CURRENT_DATE)::integer, 8, 31)
   FROM public.get_municipal_settings('97000000-0000-0000-0000-000000000001', EXTRACT(YEAR FROM CURRENT_DATE)::integer)),
  'school A keeps the municipal default instead of school B override'
);

SELECT pg_temp.assert_true(
  (SELECT count(*) = 0 FROM public.configs WHERE escola_id = '97000000-0000-0000-0000-000000000002' AND chave = 'municipal_name'),
  'RLS hides another school municipal override'
);

ROLLBACK;
