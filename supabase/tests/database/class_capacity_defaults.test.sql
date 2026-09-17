BEGIN;

CREATE FUNCTION pg_temp.assert_true(condition boolean, message text)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF condition IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'assertion failed: %', message;
  END IF;
END;
$$;

CREATE FUNCTION pg_temp.assert_denied(statement text, expected_prefix text)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  BEGIN
    EXECUTE statement;
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM LIKE expected_prefix || '%' THEN RETURN; END IF;
    RAISE;
  END;
  RAISE EXCEPTION 'statement unexpectedly allowed: %', statement;
END;
$$;

INSERT INTO public.escolas(id, codigo, nome, tipo, ativo) VALUES
  ('c8100000-0000-0000-0000-000000000001', 'CAP-A', 'Capacity A', 'fundamental', true),
  ('c8100000-0000-0000-0000-000000000002', 'CAP-B', 'Capacity B', 'fundamental', true);
INSERT INTO public.users(id, nome, email, tipo_usuario, escola_id, ativo) VALUES
  ('c8200000-0000-0000-0000-000000000001', 'Secretariat', 'capacity.secretary@synthetic.invalid', 'secretario', NULL, true),
  ('c8200000-0000-0000-0000-000000000002', 'Director A', 'capacity.director.a@synthetic.invalid', 'diretor', 'c8100000-0000-0000-0000-000000000001', true),
  ('c8200000-0000-0000-0000-000000000003', 'Director B', 'capacity.director.b@synthetic.invalid', 'diretor', 'c8100000-0000-0000-0000-000000000002', true),
  ('c8200000-0000-0000-0000-000000000004', 'Teacher A', 'capacity.teacher.a@synthetic.invalid', 'professor', 'c8100000-0000-0000-0000-000000000001', true);

SELECT pg_temp.assert_true(
  (SELECT valor = '25' AND valor_padrao = '25' AND escola_id IS NULL
   FROM public.configs
   WHERE chave = 'class_default_capacity' AND escola_id IS NULL),
  'database seeds the global class capacity default'
);
SELECT pg_temp.assert_true(
  NOT has_function_privilege('anon', 'public.set_class_default_capacity(uuid, integer)', 'EXECUTE'),
  'anonymous callers cannot mutate class capacity defaults'
);

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', 'c8200000-0000-0000-0000-000000000002', true);
SELECT pg_temp.assert_true(
  public.get_class_default_capacity('c8100000-0000-0000-0000-000000000001') = 25,
  'director resolves the seeded global default'
);
SELECT public.set_class_default_capacity('c8100000-0000-0000-0000-000000000001', 18);
SELECT public.set_class_default_capacity('c8100000-0000-0000-0000-000000000001', 19);
SELECT pg_temp.assert_true(
  public.get_class_default_capacity('c8100000-0000-0000-0000-000000000001') = 19
  AND (SELECT count(*) = 1 FROM public.configs
       WHERE chave = 'class_default_capacity' AND escola_id = 'c8100000-0000-0000-0000-000000000001'),
  'director upserts exactly one own-school override'
);
SELECT pg_temp.assert_denied(
  $$SELECT public.set_class_default_capacity('c8100000-0000-0000-0000-000000000002', 20)$$,
  'CLASS_CAPACITY_WRITE_DENIED:'
);
UPDATE public.configs
SET valor = '20'
WHERE chave = 'class_default_capacity'
  AND escola_id = 'c8100000-0000-0000-0000-000000000001';
SELECT pg_temp.assert_true(
  (SELECT valor = '19' FROM public.configs
   WHERE chave = 'class_default_capacity' AND escola_id = 'c8100000-0000-0000-0000-000000000001'),
  'direct table updates cannot change the governed override'
);

SELECT set_config('request.jwt.claim.sub', 'c8200000-0000-0000-0000-000000000003', true);
SELECT pg_temp.assert_true(
  public.get_class_default_capacity('c8100000-0000-0000-0000-000000000002') = 25,
  'another school keeps the global default'
);
SELECT pg_temp.assert_denied(
  $$SELECT public.get_class_default_capacity('c8100000-0000-0000-0000-000000000001')$$,
  'CLASS_CAPACITY_READ_DENIED:'
);

SELECT set_config('request.jwt.claim.sub', 'c8200000-0000-0000-0000-000000000004', true);
SELECT pg_temp.assert_denied(
  $$SELECT public.set_class_default_capacity('c8100000-0000-0000-0000-000000000001', 20)$$,
  'CLASS_CAPACITY_WRITE_DENIED:'
);

SELECT set_config('request.jwt.claim.sub', 'c8200000-0000-0000-0000-000000000001', true);
SELECT public.set_class_default_capacity(NULL, 30);
SELECT pg_temp.assert_true(
  public.get_class_default_capacity('c8100000-0000-0000-0000-000000000002') = 30,
  'secretariat updates the global default for schools without an override'
);
SELECT pg_temp.assert_denied(
  $$SELECT public.set_class_default_capacity(NULL, 51)$$,
  'CLASS_CAPACITY_VALUE_INVALID:'
);

RESET ROLE;
SELECT pg_temp.assert_true(
  EXISTS (
    SELECT 1 FROM public.audit_trail
    WHERE tabela = 'configs'
      AND dados_novos->>'chave' = 'class_default_capacity'
      AND usuario_id = 'c8200000-0000-0000-0000-000000000002'
      AND escola_id = 'c8100000-0000-0000-0000-000000000001'
  ),
  'school override mutation is audited with actor and school'
);

ROLLBACK;
