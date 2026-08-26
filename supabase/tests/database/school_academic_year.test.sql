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

SELECT pg_temp.assert_true(
  EXISTS (
    SELECT 1
    FROM public.anos_letivos
    WHERE escola_id = 'a9000000-0000-0000-0000-000000000001'
      AND ano = EXTRACT(YEAR FROM CURRENT_DATE)::integer
      AND data_inicio = date_trunc('year', CURRENT_DATE)::date
      AND data_fim = (date_trunc('year', CURRENT_DATE) + interval '1 year - 1 day')::date
  ),
  'an existing school receives the current product default without changing other years'
);

INSERT INTO public.escolas(id, codigo, nome, tipo, ativo)
VALUES
  (
    'a9000000-0000-0000-0000-000000000002',
    'ANO-LETIVO-A',
    'Escola Ano Letivo A',
    'fundamental',
    true
  ),
  (
    'a9000000-0000-0000-0000-000000000003',
    'ANO-LETIVO-B',
    'Escola Ano Letivo B',
    'fundamental',
    true
  );

SELECT pg_temp.assert_true(
  (
    SELECT count(*) = 2
      AND bool_and(data_inicio = date_trunc('year', CURRENT_DATE)::date)
      AND bool_and(data_fim = (date_trunc('year', CURRENT_DATE) + interval '1 year - 1 day')::date)
    FROM public.anos_letivos
    WHERE escola_id IN (
      'a9000000-0000-0000-0000-000000000002',
      'a9000000-0000-0000-0000-000000000003'
    )
      AND ano = EXTRACT(YEAR FROM CURRENT_DATE)::integer
  ),
  'each newly created school receives its own persisted default'
);

INSERT INTO public.users(id, nome, email, tipo_usuario, escola_id, ativo, primeiro_login, senha_padrao)
VALUES
  (
    'a9100000-0000-0000-0000-000000000001',
    'Direcao Ano Letivo A',
    'direcao.ano.a@synthetic.invalid',
    'diretor',
    'a9000000-0000-0000-0000-000000000002',
    true,
    false,
    false
  ),
  (
    'a9100000-0000-0000-0000-000000000002',
    'Professor Ano Letivo A',
    'professor.ano.a@synthetic.invalid',
    'professor',
    'a9000000-0000-0000-0000-000000000002',
    true,
    false,
    false
  );

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', 'a9100000-0000-0000-0000-000000000001', true);

SELECT public.set_school_academic_year(
  'a9000000-0000-0000-0000-000000000002',
  EXTRACT(YEAR FROM CURRENT_DATE)::integer - 1,
  make_date(EXTRACT(YEAR FROM CURRENT_DATE)::integer - 1, 1, 1),
  make_date(EXTRACT(YEAR FROM CURRENT_DATE)::integer - 1, 12, 31)
);

SELECT public.set_school_academic_year(
  'a9000000-0000-0000-0000-000000000002',
  EXTRACT(YEAR FROM CURRENT_DATE)::integer,
  make_date(EXTRACT(YEAR FROM CURRENT_DATE)::integer, 2, 2),
  make_date(EXTRACT(YEAR FROM CURRENT_DATE)::integer, 12, 18)
);

SELECT pg_temp.assert_true(
  (
    SELECT count(*) = 1
      AND bool_and(data_inicio = make_date(EXTRACT(YEAR FROM CURRENT_DATE)::integer, 2, 2))
      AND bool_and(data_fim = make_date(EXTRACT(YEAR FROM CURRENT_DATE)::integer, 12, 18))
    FROM public.get_school_academic_year(
      'a9000000-0000-0000-0000-000000000002',
      EXTRACT(YEAR FROM CURRENT_DATE)::integer
    )
  ),
  'a director can update the own-school academic year'
);

SELECT pg_temp.assert_true(
  (
    SELECT count(*) = 1
      AND bool_and(data_inicio = make_date(EXTRACT(YEAR FROM CURRENT_DATE)::integer - 1, 1, 1))
      AND bool_and(data_fim = make_date(EXTRACT(YEAR FROM CURRENT_DATE)::integer - 1, 12, 31))
    FROM public.get_school_academic_year(
      'a9000000-0000-0000-0000-000000000002',
      EXTRACT(YEAR FROM CURRENT_DATE)::integer - 1
    )
  ),
  'updating the current year preserves the prior academic year'
);

DO $$
BEGIN
  PERFORM *
  FROM public.get_school_academic_year(
    'a9000000-0000-0000-0000-000000000003',
    EXTRACT(YEAR FROM CURRENT_DATE)::integer
  );
  RAISE EXCEPTION 'director read another school academic year';
EXCEPTION
  WHEN insufficient_privilege THEN NULL;
END;
$$;

DO $$
BEGIN
  PERFORM *
  FROM public.set_school_academic_year(
    'a9000000-0000-0000-0000-000000000003',
    EXTRACT(YEAR FROM CURRENT_DATE)::integer,
    make_date(EXTRACT(YEAR FROM CURRENT_DATE)::integer, 2, 3),
    make_date(EXTRACT(YEAR FROM CURRENT_DATE)::integer, 12, 19)
  );
  RAISE EXCEPTION 'director updated another school academic year';
EXCEPTION
  WHEN insufficient_privilege THEN NULL;
END;
$$;

SELECT set_config('request.jwt.claim.sub', 'a9100000-0000-0000-0000-000000000002', true);

DO $$
BEGIN
  PERFORM *
  FROM public.set_school_academic_year(
    'a9000000-0000-0000-0000-000000000002',
    EXTRACT(YEAR FROM CURRENT_DATE)::integer,
    make_date(EXTRACT(YEAR FROM CURRENT_DATE)::integer, 3, 1),
    make_date(EXTRACT(YEAR FROM CURRENT_DATE)::integer, 12, 20)
  );
  RAISE EXCEPTION 'teacher updated an academic year';
EXCEPTION
  WHEN insufficient_privilege THEN NULL;
END;
$$;

SELECT pg_temp.assert_true(
  (
    SELECT count(*) = 1
      AND bool_and(data_inicio = make_date(EXTRACT(YEAR FROM CURRENT_DATE)::integer, 2, 2))
      AND bool_and(data_fim = make_date(EXTRACT(YEAR FROM CURRENT_DATE)::integer, 12, 18))
    FROM public.get_school_academic_year(
      'a9000000-0000-0000-0000-000000000002',
      EXTRACT(YEAR FROM CURRENT_DATE)::integer
    )
  ),
  'an unauthorized update leaves the stored dates unchanged'
);

DO $$
BEGIN
  DELETE FROM public.anos_letivos
  WHERE escola_id = 'a9000000-0000-0000-0000-000000000002';
  RAISE EXCEPTION 'authenticated user deleted academic year history';
EXCEPTION
  WHEN insufficient_privilege THEN NULL;
END;
$$;

ROLLBACK;
