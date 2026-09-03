BEGIN;

INSERT INTO public.configs (chave, valor, categoria, descricao, tipo_valor, valor_padrao, escola_id, ativo)
VALUES
  ('municipal_name', 'Município', 'municipal', 'Nome do município', 'string', 'Município', NULL, true),
  ('municipal_education_department', 'Secretaria de Educação', 'municipal', 'Nome da secretaria de educação', 'string', 'Secretaria de Educação', NULL, true),
  ('municipal_state', 'UF', 'municipal', 'Sigla do estado', 'string', 'UF', NULL, true),
  ('municipal_contact_phone', '', 'municipal', 'Telefone de contato municipal', 'string', '', NULL, true),
  ('municipal_dpo_email', '', 'municipal', 'E-mail do encarregado de dados', 'string', '', NULL, true),
  ('municipal_dpo_address', '', 'municipal', 'Endereço do encarregado de dados', 'string', '', NULL, true),
  (format('educacenso_deadline_%s', EXTRACT(YEAR FROM CURRENT_DATE)::integer), '', 'municipal', 'Prazo anual do Educacenso', 'date', '', NULL, true)
ON CONFLICT DO NOTHING;

CREATE UNIQUE INDEX IF NOT EXISTS configs_municipal_settings_default
ON public.configs(chave)
WHERE escola_id IS NULL
  AND (
    chave IN (
      'municipal_name',
      'municipal_education_department',
      'municipal_state',
      'municipal_contact_phone',
      'municipal_dpo_email',
      'municipal_dpo_address'
    )
    OR chave ~ '^educacenso_deadline_[0-9]{4}$'
  );

CREATE UNIQUE INDEX IF NOT EXISTS configs_municipal_settings_school
ON public.configs(escola_id, chave)
WHERE escola_id IS NOT NULL
  AND (
    chave IN (
      'municipal_name',
      'municipal_education_department',
      'municipal_state',
      'municipal_contact_phone',
      'municipal_dpo_email',
      'municipal_dpo_address'
    )
    OR chave ~ '^educacenso_deadline_[0-9]{4}$'
  );

DROP POLICY IF EXISTS municipal_settings_select_scoped ON public.configs;
CREATE POLICY municipal_settings_select_scoped
ON public.configs
AS RESTRICTIVE
FOR SELECT TO authenticated
USING (
  NOT (
    chave IN (
      'municipal_name',
      'municipal_education_department',
      'municipal_state',
      'municipal_contact_phone',
      'municipal_dpo_email',
      'municipal_dpo_address'
    )
    OR chave ~ '^educacenso_deadline_[0-9]{4}$'
  )
  OR public.pilot_is_secretariat()
  OR (
    public.pilot_current_role() IN ('diretor', 'professor')
    AND public.pilot_current_school_id() IS NOT NULL
    AND (escola_id IS NULL OR escola_id = public.pilot_current_school_id())
  )
);

CREATE OR REPLACE FUNCTION public.get_municipal_settings(
  p_escola_id uuid,
  p_ano integer
)
RETURNS TABLE(
  municipality_name text,
  education_department_name text,
  state text,
  contact_phone text,
  dpo_email text,
  dpo_address text,
  educacenso_deadline date
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'PILOT_MUNICIPAL_SETTINGS_AUTH_REQUIRED';
  END IF;
  IF p_ano IS NULL OR p_ano NOT BETWEEN 2000 AND 2100 THEN
    RAISE EXCEPTION 'PILOT_MUNICIPAL_SETTINGS_YEAR_INVALID';
  END IF;
  IF p_escola_id IS NULL AND NOT public.pilot_is_secretariat() THEN
    RAISE EXCEPTION 'PILOT_MUNICIPAL_SETTINGS_SCHOOL_REQUIRED';
  END IF;
  IF p_escola_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.escolas WHERE id = p_escola_id) THEN
    RAISE EXCEPTION 'PILOT_MUNICIPAL_SETTINGS_SCHOOL_DENIED';
  END IF;
  IF p_escola_id IS NOT NULL AND NOT public.pilot_can_access_school(p_escola_id) THEN
    RAISE EXCEPTION 'PILOT_MUNICIPAL_SETTINGS_SCHOOL_DENIED';
  END IF;

  RETURN QUERY
  SELECT
    COALESCE(
      (SELECT config.valor FROM public.configs AS config WHERE p_escola_id IS NOT NULL AND config.escola_id = p_escola_id AND config.chave = 'municipal_name'),
      (SELECT config.valor FROM public.configs AS config WHERE config.escola_id IS NULL AND config.chave = 'municipal_name')
    ),
    COALESCE(
      (SELECT config.valor FROM public.configs AS config WHERE p_escola_id IS NOT NULL AND config.escola_id = p_escola_id AND config.chave = 'municipal_education_department'),
      (SELECT config.valor FROM public.configs AS config WHERE config.escola_id IS NULL AND config.chave = 'municipal_education_department')
    ),
    COALESCE(
      (SELECT config.valor FROM public.configs AS config WHERE p_escola_id IS NOT NULL AND config.escola_id = p_escola_id AND config.chave = 'municipal_state'),
      (SELECT config.valor FROM public.configs AS config WHERE config.escola_id IS NULL AND config.chave = 'municipal_state')
    ),
    COALESCE(
      (SELECT config.valor FROM public.configs AS config WHERE p_escola_id IS NOT NULL AND config.escola_id = p_escola_id AND config.chave = 'municipal_contact_phone'),
      (SELECT config.valor FROM public.configs AS config WHERE config.escola_id IS NULL AND config.chave = 'municipal_contact_phone')
    ),
    COALESCE(
      (SELECT config.valor FROM public.configs AS config WHERE p_escola_id IS NOT NULL AND config.escola_id = p_escola_id AND config.chave = 'municipal_dpo_email'),
      (SELECT config.valor FROM public.configs AS config WHERE config.escola_id IS NULL AND config.chave = 'municipal_dpo_email')
    ),
    COALESCE(
      (SELECT config.valor FROM public.configs AS config WHERE p_escola_id IS NOT NULL AND config.escola_id = p_escola_id AND config.chave = 'municipal_dpo_address'),
      (SELECT config.valor FROM public.configs AS config WHERE config.escola_id IS NULL AND config.chave = 'municipal_dpo_address')
    ),
    NULLIF(COALESCE(
      (SELECT config.valor FROM public.configs AS config WHERE p_escola_id IS NOT NULL AND config.escola_id = p_escola_id AND config.chave = format('educacenso_deadline_%s', p_ano)),
      (SELECT config.valor FROM public.configs AS config WHERE config.escola_id IS NULL AND config.chave = format('educacenso_deadline_%s', p_ano))
    ), '')::date;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_municipal_settings(
  p_escola_id uuid,
  p_municipality_name text,
  p_education_department_name text,
  p_state text,
  p_contact_phone text,
  p_dpo_email text,
  p_dpo_address text,
  p_educacenso_year integer,
  p_educacenso_deadline date
)
RETURNS TABLE(
  municipality_name text,
  education_department_name text,
  state text,
  contact_phone text,
  dpo_email text,
  dpo_address text,
  educacenso_deadline date
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'PILOT_MUNICIPAL_SETTINGS_AUTH_REQUIRED';
  END IF;
  IF NOT public.pilot_is_secretariat() THEN
    RAISE EXCEPTION 'PILOT_MUNICIPAL_SETTINGS_WRITE_DENIED';
  END IF;
  IF p_escola_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.escolas WHERE id = p_escola_id) THEN
    RAISE EXCEPTION 'PILOT_MUNICIPAL_SETTINGS_SCHOOL_DENIED';
  END IF;
  IF p_educacenso_year IS NULL OR p_educacenso_year NOT BETWEEN 2000 AND 2100 THEN
    RAISE EXCEPTION 'PILOT_MUNICIPAL_SETTINGS_YEAR_INVALID';
  END IF;
  IF p_educacenso_deadline IS NOT NULL AND EXTRACT(YEAR FROM p_educacenso_deadline)::integer <> p_educacenso_year THEN
    RAISE EXCEPTION 'PILOT_MUNICIPAL_SETTINGS_DEADLINE_INVALID';
  END IF;
  IF p_municipality_name IS NULL OR char_length(trim(p_municipality_name)) NOT BETWEEN 1 AND 120
    OR p_education_department_name IS NULL OR char_length(trim(p_education_department_name)) NOT BETWEEN 1 AND 120
    OR p_state IS NULL OR char_length(trim(p_state)) NOT BETWEEN 1 AND 40
    OR p_contact_phone IS NULL OR char_length(trim(p_contact_phone)) > 100
    OR p_dpo_email IS NULL OR char_length(trim(p_dpo_email)) > 255
    OR (trim(p_dpo_email) <> '' AND trim(p_dpo_email) !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$')
    OR p_dpo_address IS NULL OR char_length(trim(p_dpo_address)) > 500 THEN
    RAISE EXCEPTION 'PILOT_MUNICIPAL_SETTINGS_VALUE_INVALID';
  END IF;

  WITH input(chave, valor, categoria, descricao, tipo_valor, valor_padrao) AS (
    VALUES
      ('municipal_name', trim(p_municipality_name), 'municipal', 'Nome do município', 'string', 'Município'),
      ('municipal_education_department', trim(p_education_department_name), 'municipal', 'Nome da secretaria de educação', 'string', 'Secretaria de Educação'),
      ('municipal_state', trim(p_state), 'municipal', 'Sigla do estado', 'string', 'UF'),
      ('municipal_contact_phone', trim(p_contact_phone), 'municipal', 'Telefone de contato municipal', 'string', ''),
      ('municipal_dpo_email', trim(p_dpo_email), 'municipal', 'E-mail do encarregado de dados', 'string', ''),
      ('municipal_dpo_address', trim(p_dpo_address), 'municipal', 'Endereço do encarregado de dados', 'string', ''),
      (format('educacenso_deadline_%s', p_educacenso_year), COALESCE(p_educacenso_deadline::text, ''), 'municipal', 'Prazo anual do Educacenso', 'date', '')
  ), updated AS (
    UPDATE public.configs AS config
    SET valor = input.valor,
        updated_at = now(),
        ativo = true
    FROM input
    WHERE config.escola_id IS NOT DISTINCT FROM p_escola_id
      AND config.chave = input.chave
    RETURNING config.id
  )
  INSERT INTO public.configs (chave, valor, categoria, descricao, tipo_valor, valor_padrao, escola_id, criado_por, ativo)
  SELECT input.chave, input.valor, input.categoria, input.descricao, input.tipo_valor, input.valor_padrao, p_escola_id, auth.uid(), true
  FROM input
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.configs AS config
    WHERE config.escola_id IS NOT DISTINCT FROM p_escola_id
      AND config.chave = input.chave
  );

  RETURN QUERY SELECT * FROM public.get_municipal_settings(p_escola_id, p_educacenso_year);
END;
$$;

REVOKE ALL ON FUNCTION public.get_municipal_settings(uuid, integer) FROM PUBLIC, anon, service_role;
REVOKE ALL ON FUNCTION public.set_municipal_settings(uuid, text, text, text, text, text, text, integer, date) FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.get_municipal_settings(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_municipal_settings(uuid, text, text, text, text, text, text, integer, date) TO authenticated;

COMMIT;
