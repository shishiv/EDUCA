BEGIN;

-- An empty, persisted definition is deliberately not a pedagogical calendar.
ALTER TABLE public.anos_letivos
  ADD COLUMN periodos jsonb NOT NULL DEFAULT '[]'::jsonb;

CREATE FUNCTION public.validate_school_periods()
RETURNS trigger LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$
DECLARE
  period jsonb;
  seen_keys text[] := ARRAY[]::text[];
BEGIN
  IF jsonb_typeof(NEW.periodos) <> 'array' OR jsonb_array_length(NEW.periodos) > 6 THEN
    RAISE EXCEPTION 'SCHOOL_PERIODS_INVALID' USING ERRCODE = '22023';
  END IF;
  FOR period IN SELECT value FROM jsonb_array_elements(NEW.periodos) LOOP
    IF jsonb_typeof(period) <> 'object'
      OR NOT period ?& ARRAY['chave', 'nome', 'data_inicio', 'data_fim']
      OR jsonb_typeof(period->'chave') <> 'string' OR jsonb_typeof(period->'nome') <> 'string'
      OR jsonb_typeof(period->'data_inicio') <> 'string' OR jsonb_typeof(period->'data_fim') <> 'string'
      OR (period - ARRAY['chave', 'nome', 'data_inicio', 'data_fim']) <> '{}'::jsonb
      OR coalesce(period->>'chave', '') NOT IN ('primeiro', 'segundo', 'bimestre_1', 'bimestre_2', 'bimestre_3', 'bimestre_4')
      OR coalesce(char_length(btrim(period->>'nome')), 0) NOT BETWEEN 1 AND 100
      OR coalesce(period->>'data_inicio', '') !~ '^\d{4}-\d{2}-\d{2}$'
      OR coalesce(period->>'data_fim', '') !~ '^\d{4}-\d{2}-\d{2}$'
      OR (period->>'data_inicio')::date > (period->>'data_fim')::date
      OR (period->>'data_inicio')::date < NEW.data_inicio
      OR (period->>'data_fim')::date > NEW.data_fim
      OR period->>'chave' = ANY(seen_keys)
    THEN
      RAISE EXCEPTION 'SCHOOL_PERIODS_INVALID' USING ERRCODE = '22023';
    END IF;
    seen_keys := array_append(seen_keys, period->>'chave');
  END LOOP;
  IF EXISTS (
    SELECT 1 FROM jsonb_array_elements(NEW.periodos) a, jsonb_array_elements(NEW.periodos) b
    WHERE a->>'chave' < b->>'chave'
      AND (a->>'chave' LIKE 'bimestre_%') = (b->>'chave' LIKE 'bimestre_%')
      AND (a->>'data_inicio')::date <= (b->>'data_fim')::date
      AND (b->>'data_inicio')::date <= (a->>'data_fim')::date
  ) THEN
    RAISE EXCEPTION 'SCHOOL_PERIODS_OVERLAP' USING ERRCODE = '22023';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER school_periods_validation BEFORE INSERT OR UPDATE ON public.anos_letivos
FOR EACH ROW EXECUTE FUNCTION public.validate_school_periods();
REVOKE ALL ON FUNCTION public.validate_school_periods() FROM PUBLIC, anon, authenticated, service_role;

CREATE FUNCTION public.set_school_periods(p_escola_id uuid, p_ano integer, p_periodos jsonb)
RETURNS SETOF public.anos_letivos LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public AS $$
BEGIN
  IF public.pilot_current_role() IS DISTINCT FROM 'diretor'
    OR NOT public.pilot_can_manage_school(p_escola_id) THEN
    RAISE EXCEPTION 'SCHOOL_PERIODS_WRITE_DENIED' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY UPDATE public.anos_letivos
  SET periodos = p_periodos, updated_at = clock_timestamp()
  WHERE escola_id = p_escola_id AND ano = p_ano RETURNING *;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'ACADEMIC_YEAR_REQUIRED' USING ERRCODE = '22023';
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.set_school_periods(uuid, integer, jsonb) FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.set_school_periods(uuid, integer, jsonb) TO authenticated;
CREATE TRIGGER school_periods_audit AFTER UPDATE OF periodos ON public.anos_letivos
FOR EACH ROW EXECUTE FUNCTION public.vivencia_audit_change();

-- One immutable report-owned snapshot avoids duplicating narrative text in both
-- the legacy link table and the report. Legacy links remain intact and audited.
ALTER TABLE public.relatorios_descritivos ADD COLUMN fontes_snapshot jsonb;
COMMENT ON COLUMN public.relatorios_descritivos.fontes_snapshot IS
  'Versioned, database-derived Vivência and period snapshot. NULL on legacy reports; never backfilled from live sources.';

CREATE FUNCTION public.preview_descriptive_report_sources(p_matricula_id uuid, p_ano integer, p_semestre text)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = pg_catalog, public AS $$
DECLARE
  enrollment public.matriculas;
  class public.turmas;
  academic_year public.anos_letivos;
  period jsonb;
  sources jsonb;
BEGIN
  SELECT * INTO enrollment FROM public.matriculas WHERE id = p_matricula_id;
  SELECT * INTO class FROM public.turmas WHERE id = enrollment.turma_id;
  IF class.id IS NULL THEN
    RAISE EXCEPTION 'DESCRIPTIVE_REPORT_SOURCES_DENIED' USING ERRCODE = '42501';
  END IF;
  IF current_setting('role', true) <> 'service_role' AND (
    NOT public.pilot_can_access_school(class.escola_id)
    OR coalesce(public.pilot_current_role(), '') NOT IN ('admin', 'secretario', 'diretor', 'professor')
    OR (public.pilot_current_role() = 'professor' AND NOT public.pilot_teacher_owns_class(class.id))
  ) THEN
    RAISE EXCEPTION 'DESCRIPTIVE_REPORT_SOURCES_DENIED' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO academic_year FROM public.anos_letivos
  WHERE escola_id = class.escola_id AND ano = p_ano;
  SELECT value INTO period FROM jsonb_array_elements(academic_year.periodos)
  WHERE value->>'chave' = p_semestre AND p_semestre IN ('primeiro', 'segundo');
  IF period IS NULL THEN
    RETURN jsonb_build_object('periodo', NULL, 'fontes', '[]'::jsonb);
  END IF;
  SELECT coalesce(jsonb_agg(to_jsonb(v) ORDER BY v.data_vivencia, v.id), '[]'::jsonb)
  INTO sources FROM public.vivencias v
  WHERE v.escola_id = class.escola_id AND v.aluno_id = enrollment.aluno_id
    AND v.matricula_id = enrollment.id AND v.turma_id = class.id
    AND v.data_vivencia BETWEEN (period->>'data_inicio')::date AND (period->>'data_fim')::date;
  RETURN jsonb_build_object('periodo', period || jsonb_build_object(
    'ano_letivo_id', academic_year.id, 'ano', academic_year.ano, 'escola_id', class.escola_id
  ), 'fontes', sources);
END;
$$;
REVOKE ALL ON FUNCTION public.preview_descriptive_report_sources(uuid, integer, text) FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.preview_descriptive_report_sources(uuid, integer, text) TO authenticated, service_role;

CREATE FUNCTION public.capture_descriptive_report_sources()
RETURNS trigger LANGUAGE plpgsql SET search_path = pg_catalog, public, extensions AS $$
DECLARE
  captured jsonb;
BEGIN
  IF (TG_OP = 'INSERT' AND NEW.fontes_snapshot IS NOT NULL)
    OR (TG_OP = 'UPDATE' AND NEW.fontes_snapshot IS DISTINCT FROM OLD.fontes_snapshot) THEN
    RAISE EXCEPTION 'DESCRIPTIVE_REPORT_SNAPSHOT_DERIVED' USING ERRCODE = '23514';
  END IF;
  IF NEW.status <> 'finalizado' THEN RETURN NEW; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.matriculas WHERE id = NEW.matricula_id AND turma_id = NEW.turma_id) THEN
    RAISE EXCEPTION 'DESCRIPTIVE_REPORT_SOURCE_SCOPE_MISMATCH' USING ERRCODE = '23514';
  END IF;
  -- Invoker trigger: browser actors retain school/titular checks. The already
  -- privileged service role must also supply real sources and a configured period.
  captured := public.preview_descriptive_report_sources(NEW.matricula_id, NEW.ano_letivo, NEW.semestre);
  IF captured->'periodo' = 'null'::jsonb THEN
    RAISE EXCEPTION 'DESCRIPTIVE_REPORT_PERIOD_NOT_CONFIGURED' USING ERRCODE = '23514';
  END IF;
  IF jsonb_array_length(captured->'fontes') = 0 THEN
    RAISE EXCEPTION 'DESCRIPTIVE_REPORT_SOURCES_EMPTY' USING ERRCODE = '23514';
  END IF;
  NEW.fontes_snapshot := captured || jsonb_build_object(
    'versao', 'vivencias-v1',
    'algoritmo', 'SHA-256/postgresql-jsonb-v1',
    'fingerprint', encode(sha256(convert_to(captured::text, 'UTF8')), 'hex'),
    'capturado_por', NEW.finalizado_por,
    'capturado_em', NEW.finalizado_em
  );
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.capture_descriptive_report_sources() FROM PUBLIC, anon, authenticated, service_role;
CREATE TRIGGER descriptive_report_snapshot_guard BEFORE INSERT OR UPDATE ON public.relatorios_descritivos
FOR EACH ROW EXECUTE FUNCTION public.capture_descriptive_report_sources();

COMMIT;
