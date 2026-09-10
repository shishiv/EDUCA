BEGIN;

CREATE UNIQUE INDEX configs_attendance_cutoff_default
  ON public.configs(chave)
  WHERE chave = 'attendance_daily_cutoff' AND escola_id IS NULL;
CREATE UNIQUE INDEX configs_attendance_cutoff_school
  ON public.configs(escola_id, chave)
  WHERE chave = 'attendance_daily_cutoff' AND escola_id IS NOT NULL;

INSERT INTO public.configs(chave, valor, categoria, descricao, tipo_valor, valor_padrao, escola_id, ativo)
VALUES ('attendance_daily_cutoff', '18:00:00', 'attendance',
  'Horário de encerramento ordinário da chamada em São Paulo', 'string', '18:00:00', NULL, true);

ALTER TABLE public.configs ADD CONSTRAINT attendance_daily_cutoff_config_check
CHECK (chave <> 'attendance_daily_cutoff' OR (
  valor ~ '^([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$' OR valor = '24:00:00'
));

CREATE POLICY attendance_cutoff_config_select_scoped
ON public.configs AS RESTRICTIVE FOR SELECT TO authenticated
USING (chave <> 'attendance_daily_cutoff' OR (
  public.attendance_current_role() IN ('professor', 'diretor')
  AND public.attendance_current_school_id() IS NOT NULL
  AND (escola_id IS NULL OR escola_id = public.attendance_current_school_id())
));
CREATE POLICY attendance_cutoff_config_no_direct_insert
ON public.configs AS RESTRICTIVE FOR INSERT TO authenticated
WITH CHECK (chave <> 'attendance_daily_cutoff');
CREATE POLICY attendance_cutoff_config_no_direct_update
ON public.configs AS RESTRICTIVE FOR UPDATE TO authenticated
USING (chave <> 'attendance_daily_cutoff') WITH CHECK (chave <> 'attendance_daily_cutoff');
CREATE POLICY attendance_cutoff_config_no_direct_delete
ON public.configs AS RESTRICTIVE FOR DELETE TO authenticated
USING (chave <> 'attendance_daily_cutoff');

-- Internal resolver. Browser callers receive the captured session deadline;
-- only the school director may change the policy for future openings.
CREATE FUNCTION public.attendance_daily_cutoff(p_school_id uuid)
RETURNS time LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE configured text;
BEGIN
  SELECT valor INTO configured FROM public.configs
  WHERE chave = 'attendance_daily_cutoff' AND ativo = true
    AND (escola_id = p_school_id OR escola_id IS NULL)
  ORDER BY escola_id NULLS LAST LIMIT 1;
  IF configured IS NULL THEN
    RAISE EXCEPTION 'ATTENDANCE_CUTOFF_CONFIG_INVALID: active default required';
  END IF;
  RETURN configured::time;
END;
$$;
REVOKE ALL ON FUNCTION public.attendance_daily_cutoff(uuid) FROM PUBLIC, anon, authenticated, service_role;

CREATE FUNCTION public.set_attendance_daily_cutoff(p_school_id uuid, p_cutoff time)
RETURNS time LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE config_id uuid;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.users AS u JOIN public.escolas AS e ON e.id = u.escola_id
    WHERE u.id = auth.uid() AND u.ativo = true AND e.ativo = true
      AND u.tipo_usuario = 'diretor' AND u.escola_id = p_school_id
  ) THEN
    RAISE EXCEPTION 'ATTENDANCE_CUTOFF_WRITE_DENIED: school director required';
  END IF;
  IF p_cutoff IS NULL THEN
    RAISE EXCEPTION 'ATTENDANCE_CUTOFF_VALUE_INVALID: a daily cutoff is required';
  END IF;
  INSERT INTO public.configs(chave, valor, categoria, descricao, tipo_valor, valor_padrao, escola_id, criado_por, ativo)
  SELECT 'attendance_daily_cutoff', p_cutoff::text, 'attendance',
    'Horário de encerramento ordinário da chamada em São Paulo', 'string', c.valor,
    p_school_id, auth.uid(), true
  FROM public.configs AS c
  WHERE c.chave = 'attendance_daily_cutoff' AND c.escola_id IS NULL AND c.ativo = true
  ON CONFLICT (escola_id, chave) WHERE chave = 'attendance_daily_cutoff' AND escola_id IS NOT NULL
  DO UPDATE SET valor = EXCLUDED.valor, ativo = true, updated_at = clock_timestamp()
  RETURNING id INTO config_id;
  IF config_id IS NULL THEN
    RAISE EXCEPTION 'ATTENDANCE_CUTOFF_CONFIG_INVALID: active default required';
  END IF;
  INSERT INTO public.audit_trail(tabela, registro_id, operacao, usuario_id, escola_id, dados_novos, nivel_criticidade)
  VALUES ('configs', config_id::text, 'update', auth.uid(), p_school_id,
    jsonb_build_object('chave', 'attendance_daily_cutoff', 'valor', p_cutoff::text), 'critical');
  RETURN p_cutoff;
END;
$$;
REVOKE ALL ON FUNCTION public.set_attendance_daily_cutoff(uuid, time) FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.set_attendance_daily_cutoff(uuid, time) TO authenticated;

CREATE FUNCTION public.attendance_capture_opening_cutoff()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
  opening boolean := TG_OP = 'INSERT';
  observed_now timestamptz := clock_timestamp();
  captured_deadline timestamptz;
BEGIN
  -- Trusted migrations and synthetic seed imports preserve historical rows.
  IF auth.uid() IS NULL THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' THEN
    IF OLD.status <> 'PLANEJADA' AND NEW.status = 'PLANEJADA' THEN
      RAISE EXCEPTION 'ATTENDANCE_SESSION_TRANSITION_INVALID: an opened session cannot return to planning';
    END IF;
    opening := OLD.status = 'PLANEJADA' AND NEW.status = 'ABERTA';
    IF NOT opening AND NEW.auto_fechamento_agendado IS DISTINCT FROM OLD.auto_fechamento_agendado THEN
      RAISE EXCEPTION 'ATTENDANCE_CUTOFF_IMMUTABLE: an existing session keeps its captured deadline';
    END IF;
    IF NOT opening AND NEW.aberta_em IS DISTINCT FROM OLD.aberta_em THEN
      RAISE EXCEPTION 'ATTENDANCE_OPEN_TIME_IMMUTABLE: an existing session keeps its opening timestamp';
    END IF;
  END IF;
  IF NOT opening THEN RETURN NEW; END IF;
  IF NEW.status <> 'ABERTA' THEN
    RAISE EXCEPTION 'ATTENDANCE_OPEN_STATUS_INVALID: an authenticated opening must start open';
  END IF;
  IF NEW.data_aula IS DISTINCT FROM (observed_now AT TIME ZONE 'America/Sao_Paulo')::date THEN
    RAISE EXCEPTION 'ATTENDANCE_OPEN_DATE_NOT_CURRENT: opening requires the current Sao Paulo date';
  END IF;
  captured_deadline := (NEW.data_aula + public.attendance_daily_cutoff(NEW.escola_id)) AT TIME ZONE 'America/Sao_Paulo';
  IF observed_now >= captured_deadline
     OR (NEW.auto_fechamento_agendado IS NOT NULL AND NEW.auto_fechamento_agendado <= observed_now) THEN
    RAISE EXCEPTION 'ATTENDANCE_OPEN_CUTOFF_PASSED: opening deadline has expired';
  END IF;
  NEW.auto_fechamento_agendado := captured_deadline;
  NEW.aberta_em := observed_now;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.attendance_capture_opening_cutoff() FROM PUBLIC, anon, authenticated, service_role;
CREATE TRIGGER attendance_capture_opening_cutoff
BEFORE INSERT OR UPDATE ON public.sessoes_aula
FOR EACH ROW EXECUTE FUNCTION public.attendance_capture_opening_cutoff();

COMMIT;
