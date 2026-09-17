BEGIN;

CREATE UNIQUE INDEX configs_class_default_capacity_global
  ON public.configs(chave)
  WHERE chave = 'class_default_capacity' AND escola_id IS NULL;

CREATE UNIQUE INDEX configs_class_default_capacity_school
  ON public.configs(escola_id, chave)
  WHERE chave = 'class_default_capacity' AND escola_id IS NOT NULL;

INSERT INTO public.configs (
  chave, valor, categoria, descricao, tipo_valor, valor_padrao, escola_id, ativo
)
SELECT
  'class_default_capacity', '25', 'turmas',
  'Capacidade padrão para novas turmas', 'integer', '25', NULL, true
WHERE NOT EXISTS (
  SELECT 1
  FROM public.configs
  WHERE chave = 'class_default_capacity' AND escola_id IS NULL
);

ALTER TABLE public.configs
  ADD CONSTRAINT class_default_capacity_config_check
  CHECK (
    chave <> 'class_default_capacity'
    OR CASE WHEN valor ~ '^[0-9]{1,2}$' THEN valor::integer BETWEEN 1 AND 50 ELSE false END
  );

CREATE POLICY class_default_capacity_select_scoped
ON public.configs AS RESTRICTIVE FOR SELECT TO authenticated
USING (
  chave <> 'class_default_capacity'
  OR escola_id IS NULL
  OR public.pilot_can_access_school(escola_id)
);

CREATE POLICY class_default_capacity_no_direct_insert
ON public.configs AS RESTRICTIVE FOR INSERT TO authenticated
WITH CHECK (chave <> 'class_default_capacity');

CREATE POLICY class_default_capacity_no_direct_update
ON public.configs AS RESTRICTIVE FOR UPDATE TO authenticated
USING (chave <> 'class_default_capacity')
WITH CHECK (chave <> 'class_default_capacity');

CREATE POLICY class_default_capacity_no_direct_delete
ON public.configs AS RESTRICTIVE FOR DELETE TO authenticated
USING (chave <> 'class_default_capacity');

CREATE FUNCTION public.get_class_default_capacity(p_school_id uuid)
RETURNS integer
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  configured text;
BEGIN
  IF auth.uid() IS NULL OR p_school_id IS NULL OR NOT public.pilot_can_access_school(p_school_id) THEN
    RAISE EXCEPTION 'CLASS_CAPACITY_READ_DENIED: authorized school actor required';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.escolas WHERE id = p_school_id AND ativo IS TRUE
  ) THEN
    RAISE EXCEPTION 'CLASS_CAPACITY_READ_DENIED: active school required';
  END IF;

  SELECT config.valor
  INTO configured
  FROM public.configs AS config
  WHERE config.chave = 'class_default_capacity'
    AND config.ativo IS TRUE
    AND (config.escola_id = p_school_id OR config.escola_id IS NULL)
  ORDER BY (config.escola_id IS NOT NULL) DESC, config.updated_at DESC, config.created_at DESC, config.id DESC
  LIMIT 1;

  IF configured IS NULL THEN
    RAISE EXCEPTION 'CLASS_CAPACITY_CONFIG_INVALID: active default required';
  END IF;

  RETURN configured::integer;
END;
$$;

CREATE FUNCTION public.set_class_default_capacity(p_school_id uuid, p_capacity integer)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  config_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'CLASS_CAPACITY_WRITE_DENIED: authenticated actor required';
  END IF;
  IF p_capacity IS NULL OR p_capacity NOT BETWEEN 1 AND 50 THEN
    RAISE EXCEPTION 'CLASS_CAPACITY_VALUE_INVALID: capacity must be between 1 and 50';
  END IF;
  IF p_school_id IS NULL THEN
    IF public.pilot_is_secretariat() IS DISTINCT FROM true THEN
      RAISE EXCEPTION 'CLASS_CAPACITY_WRITE_DENIED: municipal secretariat required for the global default';
    END IF;

    UPDATE public.configs
    SET valor = p_capacity::text,
        updated_at = clock_timestamp(),
        ativo = true
    WHERE chave = 'class_default_capacity'
      AND escola_id IS NULL
    RETURNING id INTO config_id;
  ELSE
    IF public.pilot_can_manage_school(p_school_id) IS DISTINCT FROM true THEN
      RAISE EXCEPTION 'CLASS_CAPACITY_WRITE_DENIED: school manager required';
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM public.escolas WHERE id = p_school_id AND ativo IS TRUE
    ) THEN
      RAISE EXCEPTION 'CLASS_CAPACITY_SCHOOL_DENIED: active school required';
    END IF;

    INSERT INTO public.configs (
      chave, valor, categoria, descricao, tipo_valor, valor_padrao, escola_id, criado_por, ativo
    )
    SELECT
      'class_default_capacity', p_capacity::text, default_config.categoria,
      default_config.descricao, default_config.tipo_valor, default_config.valor_padrao,
      p_school_id, auth.uid(), true
    FROM public.configs AS default_config
    WHERE default_config.chave = 'class_default_capacity'
      AND default_config.escola_id IS NULL
      AND default_config.ativo IS TRUE
    ON CONFLICT (escola_id, chave)
      WHERE chave = 'class_default_capacity' AND escola_id IS NOT NULL
    DO UPDATE SET valor = EXCLUDED.valor, ativo = true, updated_at = clock_timestamp()
    RETURNING id INTO config_id;
  END IF;

  IF config_id IS NULL THEN
    RAISE EXCEPTION 'CLASS_CAPACITY_CONFIG_INVALID: active default required';
  END IF;

  INSERT INTO public.audit_trail (
    tabela, registro_id, operacao, usuario_id, escola_id, dados_novos, nivel_criticidade
  ) VALUES (
    'configs', config_id::text, 'update', auth.uid(), p_school_id,
    jsonb_build_object('chave', 'class_default_capacity', 'valor', p_capacity), 'critical'
  );

  RETURN p_capacity;
END;
$$;

REVOKE ALL ON FUNCTION public.get_class_default_capacity(uuid) FROM PUBLIC, anon, service_role;
REVOKE ALL ON FUNCTION public.set_class_default_capacity(uuid, integer) FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.get_class_default_capacity(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_class_default_capacity(uuid, integer) TO authenticated;

COMMIT;
