BEGIN;

-- The pair is one value: a school override cannot mix half of a municipal policy.
INSERT INTO public.configs (chave, valor, categoria, descricao, tipo_valor, valor_padrao, escola_id, ativo)
VALUES ('attendance_alert_bands', '{"reference":80,"attention":85}', 'municipal',
  'Faixas gerais de frequência, sem efeito sobre condicionalidade Bolsa Família',
  'json', '{"reference":80,"attention":85}', NULL, true);

ALTER TABLE public.configs ADD CONSTRAINT attendance_alert_bands_valid CHECK (
  CASE WHEN chave = 'attendance_alert_bands' THEN COALESCE(
    jsonb_typeof(valor::jsonb) = 'object'
    AND jsonb_typeof(valor::jsonb->'reference') = 'number'
    AND jsonb_typeof(valor::jsonb->'attention') = 'number'
    AND (valor::jsonb - 'reference' - 'attention') = '{}'::jsonb
    AND (valor::jsonb->>'reference')::numeric > 0
    AND (valor::jsonb->>'reference')::numeric < (valor::jsonb->>'attention')::numeric
    AND (valor::jsonb->>'attention')::numeric <= 100, false)
  ELSE true END
);

DROP INDEX public.configs_municipal_settings_default;
DROP INDEX public.configs_municipal_settings_school;
CREATE UNIQUE INDEX configs_municipal_settings_default ON public.configs(chave)
WHERE escola_id IS NULL AND (
  chave IN ('municipal_name', 'municipal_education_department', 'municipal_state',
    'municipal_contact_phone', 'municipal_dpo_email', 'municipal_dpo_address', 'attendance_alert_bands')
  OR chave ~ '^educacenso_deadline_[0-9]{4}$'
);
CREATE UNIQUE INDEX configs_municipal_settings_school ON public.configs(escola_id, chave)
WHERE escola_id IS NOT NULL AND (
  chave IN ('municipal_name', 'municipal_education_department', 'municipal_state',
    'municipal_contact_phone', 'municipal_dpo_email', 'municipal_dpo_address', 'attendance_alert_bands')
  OR chave ~ '^educacenso_deadline_[0-9]{4}$'
);

DROP POLICY municipal_settings_select_scoped ON public.configs;
CREATE POLICY municipal_settings_select_scoped ON public.configs
AS RESTRICTIVE FOR SELECT TO authenticated USING (
  NOT (chave IN ('municipal_name', 'municipal_education_department', 'municipal_state',
    'municipal_contact_phone', 'municipal_dpo_email', 'municipal_dpo_address', 'attendance_alert_bands')
    OR chave ~ '^educacenso_deadline_[0-9]{4}$')
  OR public.pilot_is_secretariat()
  OR (public.pilot_current_role() IN ('diretor', 'professor')
    AND public.pilot_current_school_id() IS NOT NULL
    AND (escola_id IS NULL OR escola_id = public.pilot_current_school_id()))
);

-- Replace, never overload, the existing municipal RPCs and restore their ACLs.
DROP FUNCTION public.set_municipal_settings(uuid, text, text, text, text, text, text, integer, date);
DROP FUNCTION public.get_municipal_settings(uuid, integer);

CREATE FUNCTION public.get_municipal_settings(p_escola_id uuid, p_ano integer)
RETURNS TABLE(municipality_name text, education_department_name text, state text,
  contact_phone text, dpo_email text, dpo_address text, educacenso_deadline date, attendance_bands jsonb)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  bands jsonb;
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
  IF p_escola_id IS NOT NULL AND (
    NOT EXISTS (SELECT 1 FROM public.escolas WHERE id = p_escola_id)
    OR NOT COALESCE(public.pilot_can_access_school(p_escola_id), false)
  ) THEN
    RAISE EXCEPTION 'PILOT_MUNICIPAL_SETTINGS_SCHOOL_DENIED';
  END IF;

  SELECT c.valor::jsonb INTO bands FROM public.configs c
  WHERE c.chave = 'attendance_alert_bands' AND c.ativo = true
    AND (c.escola_id = p_escola_id OR c.escola_id IS NULL)
  ORDER BY c.escola_id NULLS LAST LIMIT 1;
  IF bands IS NULL THEN
    RAISE EXCEPTION 'PILOT_MUNICIPAL_SETTINGS_ATTENDANCE_BANDS_MISSING';
  END IF;

  RETURN QUERY
  WITH resolved AS (
    SELECT DISTINCT ON (c.chave) c.chave, c.valor FROM public.configs c
    WHERE c.escola_id = p_escola_id OR c.escola_id IS NULL
    ORDER BY c.chave, c.escola_id NULLS LAST
  )
  SELECT
    (SELECT valor FROM resolved WHERE chave = 'municipal_name'),
    (SELECT valor FROM resolved WHERE chave = 'municipal_education_department'),
    (SELECT valor FROM resolved WHERE chave = 'municipal_state'),
    (SELECT valor FROM resolved WHERE chave = 'municipal_contact_phone'),
    (SELECT valor FROM resolved WHERE chave = 'municipal_dpo_email'),
    (SELECT valor FROM resolved WHERE chave = 'municipal_dpo_address'),
    NULLIF((SELECT valor FROM resolved WHERE chave = format('educacenso_deadline_%s', p_ano)), '')::date,
    bands;
END;
$$;

CREATE FUNCTION public.set_municipal_settings(
  p_escola_id uuid, p_municipality_name text, p_education_department_name text,
  p_state text, p_contact_phone text, p_dpo_email text, p_dpo_address text,
  p_educacenso_year integer, p_educacenso_deadline date, p_attendance_bands jsonb
)
RETURNS TABLE(municipality_name text, education_department_name text, state text,
  contact_phone text, dpo_email text, dpo_address text, educacenso_deadline date, attendance_bands jsonb)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  previous_bands jsonb;
  bands_config_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'PILOT_MUNICIPAL_SETTINGS_AUTH_REQUIRED';
  END IF;
  IF NOT COALESCE(public.pilot_is_secretariat(), false) THEN
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
  IF NOT COALESCE(
    jsonb_typeof(p_attendance_bands) = 'object'
    AND jsonb_typeof(p_attendance_bands->'reference') = 'number'
    AND jsonb_typeof(p_attendance_bands->'attention') = 'number'
    AND (p_attendance_bands - 'reference' - 'attention') = '{}'::jsonb
    AND (p_attendance_bands->>'reference')::numeric > 0
    AND (p_attendance_bands->>'reference')::numeric < (p_attendance_bands->>'attention')::numeric
    AND (p_attendance_bands->>'attention')::numeric <= 100, false) THEN
    RAISE EXCEPTION 'PILOT_MUNICIPAL_SETTINGS_ATTENDANCE_BANDS_INVALID';
  END IF;

  -- Serialize municipal writes, including first school override creation.
  LOCK TABLE public.configs IN SHARE ROW EXCLUSIVE MODE;
  SELECT valor::jsonb INTO previous_bands FROM public.configs
  WHERE chave = 'attendance_alert_bands' AND escola_id IS NOT DISTINCT FROM p_escola_id;

  WITH input(chave, valor, categoria, descricao, tipo_valor, valor_padrao) AS (
    VALUES
      ('municipal_name', trim(p_municipality_name), 'municipal', 'Nome do município', 'string', 'Município'),
      ('municipal_education_department', trim(p_education_department_name), 'municipal', 'Nome da secretaria de educação', 'string', 'Secretaria de Educação'),
      ('municipal_state', trim(p_state), 'municipal', 'Sigla do estado', 'string', 'UF'),
      ('municipal_contact_phone', trim(p_contact_phone), 'municipal', 'Telefone de contato municipal', 'string', ''),
      ('municipal_dpo_email', trim(p_dpo_email), 'municipal', 'E-mail do encarregado de dados', 'string', ''),
      ('municipal_dpo_address', trim(p_dpo_address), 'municipal', 'Endereço do encarregado de dados', 'string', ''),
      (format('educacenso_deadline_%s', p_educacenso_year), COALESCE(p_educacenso_deadline::text, ''), 'municipal', 'Prazo anual do Educacenso', 'date', ''),
      ('attendance_alert_bands', p_attendance_bands::text, 'municipal', 'Faixas gerais de frequência, sem efeito sobre condicionalidade Bolsa Família', 'json', NULL)
  ), updated AS (
    UPDATE public.configs AS config SET valor = input.valor, updated_at = now(), ativo = true
    FROM input WHERE config.escola_id IS NOT DISTINCT FROM p_escola_id AND config.chave = input.chave
    RETURNING config.id
  )
  INSERT INTO public.configs (chave, valor, categoria, descricao, tipo_valor, valor_padrao, escola_id, criado_por, ativo)
  SELECT input.chave, input.valor, input.categoria, input.descricao, input.tipo_valor, input.valor_padrao, p_escola_id, auth.uid(), true
  FROM input WHERE NOT EXISTS (
    SELECT 1 FROM public.configs AS config
    WHERE config.escola_id IS NOT DISTINCT FROM p_escola_id AND config.chave = input.chave
  );

  SELECT id INTO STRICT bands_config_id FROM public.configs
  WHERE chave = 'attendance_alert_bands' AND escola_id IS NOT DISTINCT FROM p_escola_id;
  INSERT INTO public.audit_trail (
    tabela, registro_id, operacao, usuario_id, escola_id, dados_anteriores, dados_novos, nivel_criticidade
  ) VALUES (
    'configs', bands_config_id::text, CASE WHEN previous_bands IS NULL THEN 'insert' ELSE 'update' END,
    auth.uid(), p_escola_id,
    jsonb_build_object('chave', 'attendance_alert_bands', 'valor', previous_bands),
    jsonb_build_object('chave', 'attendance_alert_bands', 'valor', p_attendance_bands), 'critical'
  );

  RETURN QUERY SELECT * FROM public.get_municipal_settings(p_escola_id, p_educacenso_year);
END;
$$;

REVOKE ALL ON FUNCTION public.get_municipal_settings(uuid, integer) FROM PUBLIC, anon, service_role;
REVOKE ALL ON FUNCTION public.set_municipal_settings(uuid, text, text, text, text, text, text, integer, date, jsonb) FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.get_municipal_settings(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_municipal_settings(uuid, text, text, text, text, text, text, integer, date, jsonb) TO authenticated;

COMMIT;
