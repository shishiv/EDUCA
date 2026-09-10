BEGIN;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.relatorios_descritivos
    WHERE (status = 'rascunho' AND (finalizado_em IS NOT NULL OR finalizado_por IS NOT NULL))
       OR (
         status = 'finalizado'
         AND (
           finalizado_em IS NULL
           OR finalizado_por IS NULL
           OR char_length(btrim(coalesce(campo_eu_outro_nos, ''))) NOT BETWEEN 50 AND 2000
           OR char_length(btrim(coalesce(campo_corpo_gestos, ''))) NOT BETWEEN 50 AND 2000
           OR char_length(btrim(coalesce(campo_tracos_sons, ''))) NOT BETWEEN 50 AND 2000
           OR char_length(btrim(coalesce(campo_escuta_fala, ''))) NOT BETWEEN 50 AND 2000
           OR char_length(btrim(coalesce(campo_espacos_tempos, ''))) NOT BETWEEN 50 AND 2000
         )
       )
  ) THEN
    RAISE EXCEPTION 'DESCRIPTIVE_REPORT_EXISTING_FINALIZATION_INVALID';
  END IF;
END;
$$;

ALTER TABLE public.relatorios_descritivos
  ADD CONSTRAINT relatorios_descritivos_finalization_consistent
  CHECK (
    (status = 'rascunho' AND finalizado_em IS NULL AND finalizado_por IS NULL)
    OR
    (
      status = 'finalizado'
      AND finalizado_em IS NOT NULL
      AND finalizado_por IS NOT NULL
      AND char_length(btrim(coalesce(campo_eu_outro_nos, ''))) BETWEEN 50 AND 2000
      AND char_length(btrim(coalesce(campo_corpo_gestos, ''))) BETWEEN 50 AND 2000
      AND char_length(btrim(coalesce(campo_tracos_sons, ''))) BETWEEN 50 AND 2000
      AND char_length(btrim(coalesce(campo_escuta_fala, ''))) BETWEEN 50 AND 2000
      AND char_length(btrim(coalesce(campo_espacos_tempos, ''))) BETWEEN 50 AND 2000
    )
  );

CREATE OR REPLACE FUNCTION public.enforce_descriptive_report_finalization()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
DECLARE
  actor_id uuid := auth.uid();
  trusted_system_write boolean := current_user IN ('postgres', 'service_role');
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.status = 'finalizado' THEN
    RAISE EXCEPTION 'DESCRIPTIVE_REPORT_FINALIZED_IMMUTABLE'
      USING ERRCODE = '23514';
  END IF;

  IF NEW.status = 'rascunho' THEN
    IF NEW.finalizado_em IS NOT NULL OR NEW.finalizado_por IS NOT NULL THEN
      RAISE EXCEPTION 'DESCRIPTIVE_REPORT_DRAFT_FINALIZATION_INVALID'
        USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
  END IF;

  IF char_length(btrim(coalesce(NEW.campo_eu_outro_nos, ''))) NOT BETWEEN 50 AND 2000
    OR char_length(btrim(coalesce(NEW.campo_corpo_gestos, ''))) NOT BETWEEN 50 AND 2000
    OR char_length(btrim(coalesce(NEW.campo_tracos_sons, ''))) NOT BETWEEN 50 AND 2000
    OR char_length(btrim(coalesce(NEW.campo_escuta_fala, ''))) NOT BETWEEN 50 AND 2000
    OR char_length(btrim(coalesce(NEW.campo_espacos_tempos, ''))) NOT BETWEEN 50 AND 2000
  THEN
    RAISE EXCEPTION 'DESCRIPTIVE_REPORT_FINALIZATION_FIELDS_INVALID'
      USING ERRCODE = '23514';
  END IF;

  IF actor_id IS NOT NULL THEN
    IF NEW.professor_id IS DISTINCT FROM actor_id THEN
      RAISE EXCEPTION 'DESCRIPTIVE_REPORT_FINALIZER_MUST_BE_REPORT_PROFESSOR'
        USING ERRCODE = '23514';
    END IF;

    NEW.finalizado_por := actor_id;
    NEW.finalizado_em := clock_timestamp();
    RETURN NEW;
  END IF;

  IF trusted_system_write THEN
    IF NEW.finalizado_por IS NULL OR NEW.finalizado_em IS NULL THEN
      RAISE EXCEPTION 'DESCRIPTIVE_REPORT_TRUSTED_FINALIZATION_REQUIRES_ACTOR_AND_TIME'
        USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'DESCRIPTIVE_REPORT_FINALIZATION_REQUIRES_AUTHENTICATED_ACTOR'
    USING ERRCODE = '23514';
END;
$$;

REVOKE ALL ON FUNCTION public.enforce_descriptive_report_finalization()
FROM PUBLIC, anon, authenticated, service_role;

DROP TRIGGER IF EXISTS descriptive_report_finalization_guard
ON public.relatorios_descritivos;

CREATE TRIGGER descriptive_report_finalization_guard
BEFORE INSERT OR UPDATE ON public.relatorios_descritivos
FOR EACH ROW
EXECUTE FUNCTION public.enforce_descriptive_report_finalization();

COMMENT ON FUNCTION public.enforce_descriptive_report_finalization() IS
  'Derives authenticated descriptive-report finalization metadata and makes finalized rows immutable.';

CREATE OR REPLACE FUNCTION public.validate_vivencia_report_source()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  report_matricula_id uuid;
  report_school_id uuid;
  report_status text;
  vivencia_matricula_id uuid;
  vivencia_school_id uuid;
BEGIN
  SELECT r.matricula_id, t.escola_id, r.status
  INTO report_matricula_id, report_school_id, report_status
  FROM public.relatorios_descritivos AS r
  JOIN public.turmas AS t ON t.id = r.turma_id
  WHERE r.id = NEW.relatorio_id
  FOR SHARE OF r;

  SELECT v.matricula_id, v.escola_id
  INTO vivencia_matricula_id, vivencia_school_id
  FROM public.vivencias AS v
  WHERE v.id = NEW.vivencia_id;

  IF report_matricula_id IS NULL
    OR vivencia_matricula_id IS NULL
    OR report_matricula_id IS DISTINCT FROM vivencia_matricula_id
    OR report_school_id IS DISTINCT FROM vivencia_school_id
    OR NEW.escola_id IS DISTINCT FROM report_school_id
  THEN
    RAISE EXCEPTION 'VIVENCIA_REPORT_SOURCE_SCOPE_MISMATCH';
  END IF;

  IF report_status = 'finalizado' THEN
    RAISE EXCEPTION 'DESCRIPTIVE_REPORT_FINALIZED_SOURCES_IMMUTABLE'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.validate_vivencia_report_source() IS
  'Validates report-source scope and rejects new or changed Vivência links after report finalization.';

COMMIT;
