BEGIN;

CREATE TABLE public.anos_letivos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  escola_id uuid NOT NULL REFERENCES public.escolas(id) ON DELETE RESTRICT,
  ano integer NOT NULL,
  data_inicio date NOT NULL,
  data_fim date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT anos_letivos_escola_ano_unique UNIQUE (escola_id, ano),
  CONSTRAINT anos_letivos_periodo_valido CHECK (data_inicio <= data_fim)
);

CREATE INDEX anos_letivos_escola_periodo_idx
ON public.anos_letivos(escola_id, data_inicio, data_fim);

ALTER TABLE public.anos_letivos ENABLE ROW LEVEL SECURITY;

CREATE POLICY anos_letivos_select
ON public.anos_letivos
FOR SELECT TO authenticated
USING (public.pilot_can_access_school(escola_id));

CREATE POLICY anos_letivos_insert
ON public.anos_letivos
FOR INSERT TO authenticated
WITH CHECK (public.pilot_can_manage_school(escola_id));

CREATE POLICY anos_letivos_update
ON public.anos_letivos
FOR UPDATE TO authenticated
USING (public.pilot_can_manage_school(escola_id))
WITH CHECK (public.pilot_can_manage_school(escola_id));

INSERT INTO public.anos_letivos(escola_id, ano, data_inicio, data_fim)
SELECT
  school.id,
  EXTRACT(YEAR FROM CURRENT_DATE)::integer,
  date_trunc('year', CURRENT_DATE)::date,
  (date_trunc('year', CURRENT_DATE) + interval '1 year - 1 day')::date
FROM public.escolas AS school
ON CONFLICT (escola_id, ano) DO NOTHING;

CREATE OR REPLACE FUNCTION public.create_default_school_academic_year()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  default_year integer := EXTRACT(YEAR FROM CURRENT_DATE)::integer;
BEGIN
  INSERT INTO public.anos_letivos(escola_id, ano, data_inicio, data_fim)
  VALUES (
    NEW.id,
    default_year,
    make_date(default_year, 1, 1),
    make_date(default_year, 12, 31)
  )
  ON CONFLICT (escola_id, ano) DO NOTHING;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.create_default_school_academic_year() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER create_default_school_academic_year
AFTER INSERT ON public.escolas
FOR EACH ROW
EXECUTE FUNCTION public.create_default_school_academic_year();

CREATE OR REPLACE FUNCTION public.get_school_academic_year(
  p_escola_id uuid,
  p_ano integer
)
RETURNS SETOF public.anos_letivos
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF p_ano IS NULL THEN
    RAISE EXCEPTION 'ACADEMIC_YEAR_REQUIRED' USING ERRCODE = '22023';
  END IF;

  IF NOT public.pilot_can_access_school(p_escola_id) THEN
    RAISE EXCEPTION 'ACADEMIC_YEAR_READ_DENIED' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT academic_year.*
  FROM public.anos_letivos AS academic_year
  WHERE academic_year.escola_id = p_escola_id
    AND academic_year.ano = p_ano;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_school_academic_year(
  p_escola_id uuid,
  p_ano integer,
  p_data_inicio date,
  p_data_fim date
)
RETURNS SETOF public.anos_letivos
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF p_ano IS NULL OR p_data_inicio IS NULL OR p_data_fim IS NULL OR p_data_inicio > p_data_fim THEN
    RAISE EXCEPTION 'ACADEMIC_YEAR_INVALID' USING ERRCODE = '22023';
  END IF;

  IF NOT public.pilot_can_manage_school(p_escola_id) THEN
    RAISE EXCEPTION 'ACADEMIC_YEAR_WRITE_DENIED' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  INSERT INTO public.anos_letivos(escola_id, ano, data_inicio, data_fim)
  VALUES (p_escola_id, p_ano, p_data_inicio, p_data_fim)
  ON CONFLICT (escola_id, ano) DO UPDATE
  SET data_inicio = EXCLUDED.data_inicio,
      data_fim = EXCLUDED.data_fim,
      updated_at = now()
  RETURNING *;
END;
$$;

REVOKE ALL ON TABLE public.anos_letivos FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_school_academic_year(uuid, integer) FROM PUBLIC, anon, service_role;
REVOKE ALL ON FUNCTION public.set_school_academic_year(uuid, integer, date, date) FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.get_school_academic_year(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_school_academic_year(uuid, integer, date, date) TO authenticated;

COMMIT;
