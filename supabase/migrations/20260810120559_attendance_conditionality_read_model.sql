-- Canonical attendance conditionality read model.
--
-- Legal floors are encoded only in the read model:
--   * 4 to 6 years incomplete: 60 percent;
--   * 6 to 18 years incomplete without completed basic education: 75 percent.
--
-- Municipal early-warning margins are data. They belong to a municipality, carry
-- an effective period and explicit precedence, and resolve through a persisted
-- fallback row. The application must consume get_attendance_conditionality()
-- instead of embedding municipal percentages in code.

BEGIN;

-- -----------------------------------------------------------------------------
-- Municipality scope for schools
-- -----------------------------------------------------------------------------
-- EDUCA runs one dedicated project per municipality today. The existing
-- pilot_municipality_config row is still the municipality entity, so every
-- school keeps an explicit scope without inventing a student completion field.
ALTER TABLE public.escolas
  ADD COLUMN IF NOT EXISTS municipio_id uuid;

DO $$
DECLARE
  default_municipality_id uuid;
BEGIN
  SELECT id
  INTO default_municipality_id
  FROM public.pilot_municipality_config
  ORDER BY created_at, id
  LIMIT 1;

  IF default_municipality_id IS NULL THEN
    RAISE EXCEPTION
      'ATTENDANCE_CONDITIONALITY_MUNICIPALITY_REQUIRED: pilot_municipality_config has no municipality';
  END IF;

  UPDATE public.escolas
  SET municipio_id = default_municipality_id
  WHERE municipio_id IS NULL;
END;
$$;

ALTER TABLE public.escolas
  ALTER COLUMN municipio_id SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.escolas'::regclass
      AND conname = 'escolas_municipio_id_fkey'
  ) THEN
    ALTER TABLE public.escolas
      ADD CONSTRAINT escolas_municipio_id_fkey
      FOREIGN KEY (municipio_id)
      REFERENCES public.pilot_municipality_config(id);
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS idx_escolas_municipio
  ON public.escolas(municipio_id);

COMMENT ON COLUMN public.escolas.municipio_id IS
  'Municipality scope used to resolve persisted attendance margins';

CREATE OR REPLACE FUNCTION public.assign_school_municipality()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  default_municipality_id uuid;
BEGIN
  IF NEW.municipio_id IS NULL THEN
    SELECT id
    INTO default_municipality_id
    FROM public.pilot_municipality_config
    ORDER BY created_at, id
    LIMIT 1;

    IF default_municipality_id IS NULL THEN
      RAISE EXCEPTION
        'ATTENDANCE_CONDITIONALITY_MUNICIPALITY_REQUIRED: cannot create school without a municipality';
    END IF;

    NEW.municipio_id := default_municipality_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS assign_school_municipality ON public.escolas;
CREATE TRIGGER assign_school_municipality
BEFORE INSERT ON public.escolas
FOR EACH ROW
EXECUTE FUNCTION public.assign_school_municipality();

REVOKE ALL ON FUNCTION public.assign_school_municipality() FROM PUBLIC;

-- -----------------------------------------------------------------------------
-- Persisted municipality margins and resolution audit
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.attendance_municipal_thresholds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  municipality_id uuid NOT NULL REFERENCES public.pilot_municipality_config(id),
  scope text NOT NULL DEFAULT 'municipio'
    CHECK (scope = 'municipio'),
  valid_from date NOT NULL,
  valid_until date,
  precedence integer NOT NULL DEFAULT 100
    CHECK (precedence >= 0),
  municipal_warning_percent numeric(5,2) NOT NULL
    CHECK (municipal_warning_percent > 0 AND municipal_warning_percent <= 100),
  municipal_critical_percent numeric(5,2) NOT NULL
    CHECK (municipal_critical_percent > 0 AND municipal_critical_percent < municipal_warning_percent),
  defined_by uuid REFERENCES public.users(id),
  defined_at timestamptz NOT NULL DEFAULT now(),
  source text NOT NULL,
  is_fallback boolean NOT NULL DEFAULT false,
  fallback_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (valid_until IS NULL OR valid_until >= valid_from),
  CHECK (is_fallback OR defined_by IS NOT NULL),
  CHECK (NOT is_fallback OR fallback_reason IS NOT NULL)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_attendance_municipal_threshold_fallback
  ON public.attendance_municipal_thresholds(municipality_id)
  WHERE is_fallback;

CREATE INDEX IF NOT EXISTS idx_attendance_municipal_threshold_resolution
  ON public.attendance_municipal_thresholds(
    municipality_id,
    valid_from,
    valid_until,
    precedence DESC,
    defined_at DESC
  );

COMMENT ON TABLE public.attendance_municipal_thresholds IS
  'Persisted municipality-scoped early-warning margins. Legal floors never live here.';
COMMENT ON COLUMN public.attendance_municipal_thresholds.precedence IS
  'Higher precedence wins when multiple valid municipality rows overlap.';
COMMENT ON COLUMN public.attendance_municipal_thresholds.is_fallback IS
  'Marks the persisted municipality row used when no dated row applies.';
COMMENT ON COLUMN public.attendance_municipal_thresholds.defined_by IS
  'User who defined this municipality margin; null only for a system fallback row.';
COMMENT ON COLUMN public.attendance_municipal_thresholds.defined_at IS
  'Timestamp at which the municipality margin was defined.';

CREATE OR REPLACE FUNCTION public.prepare_attendance_municipal_threshold_metadata()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF auth.uid() IS NOT NULL THEN
    NEW.defined_by := auth.uid();
  END IF;
  NEW.defined_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prepare_attendance_municipal_threshold_metadata
  ON public.attendance_municipal_thresholds;
CREATE TRIGGER prepare_attendance_municipal_threshold_metadata
BEFORE INSERT ON public.attendance_municipal_thresholds
FOR EACH ROW
EXECUTE FUNCTION public.prepare_attendance_municipal_threshold_metadata();

REVOKE ALL ON FUNCTION public.prepare_attendance_municipal_threshold_metadata() FROM PUBLIC;

CREATE TABLE IF NOT EXISTS public.attendance_municipal_threshold_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  threshold_id uuid NOT NULL,
  municipality_id uuid NOT NULL,
  operation text NOT NULL CHECK (operation = 'INSERT'),
  performed_by uuid REFERENCES public.users(id),
  performed_at timestamptz NOT NULL DEFAULT now(),
  snapshot jsonb NOT NULL
);

ALTER TABLE public.attendance_municipal_threshold_audit ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.attendance_municipal_threshold_audit FROM anon, authenticated;
GRANT ALL ON public.attendance_municipal_threshold_audit TO service_role;

CREATE OR REPLACE FUNCTION public.audit_attendance_municipal_threshold_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.attendance_municipal_threshold_audit (
    threshold_id,
    municipality_id,
    operation,
    performed_by,
    snapshot
  )
  VALUES (
    NEW.id,
    NEW.municipality_id,
    'INSERT',
    coalesce(auth.uid(), NEW.defined_by),
    jsonb_build_object(
      'scope', NEW.scope,
      'valid_from', NEW.valid_from,
      'valid_until', NEW.valid_until,
      'precedence', NEW.precedence,
      'municipal_warning_percent', NEW.municipal_warning_percent,
      'municipal_critical_percent', NEW.municipal_critical_percent,
      'defined_by', NEW.defined_by,
      'defined_at', NEW.defined_at,
      'source', NEW.source,
      'is_fallback', NEW.is_fallback,
      'fallback_reason', NEW.fallback_reason
    )
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS audit_attendance_municipal_threshold_insert
  ON public.attendance_municipal_thresholds;
CREATE TRIGGER audit_attendance_municipal_threshold_insert
AFTER INSERT ON public.attendance_municipal_thresholds
FOR EACH ROW
EXECUTE FUNCTION public.audit_attendance_municipal_threshold_insert();

CREATE OR REPLACE FUNCTION public.prevent_attendance_municipal_threshold_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION
    'ATTENDANCE_MUNICIPAL_THRESHOLD_APPEND_ONLY: add a new dated row instead of changing history';
END;
$$;

DROP TRIGGER IF EXISTS prevent_attendance_municipal_threshold_update
  ON public.attendance_municipal_thresholds;
CREATE TRIGGER prevent_attendance_municipal_threshold_update
BEFORE UPDATE OR DELETE ON public.attendance_municipal_thresholds
FOR EACH ROW
EXECUTE FUNCTION public.prevent_attendance_municipal_threshold_mutation();

REVOKE ALL ON FUNCTION public.audit_attendance_municipal_threshold_insert() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.prevent_attendance_municipal_threshold_mutation() FROM PUBLIC;

ALTER TABLE public.attendance_municipal_thresholds ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS attendance_municipal_thresholds_select
  ON public.attendance_municipal_thresholds;
CREATE POLICY attendance_municipal_thresholds_select
ON public.attendance_municipal_thresholds
FOR SELECT TO authenticated
USING (
  (SELECT public.pilot_current_role()) IN ('admin', 'secretario', 'diretor', 'professor')
  AND EXISTS (
    SELECT 1
    FROM public.escolas AS school
    WHERE school.municipio_id = attendance_municipal_thresholds.municipality_id
      AND public.pilot_can_access_school(school.id)
  )
);

DROP POLICY IF EXISTS attendance_municipal_thresholds_insert
  ON public.attendance_municipal_thresholds;
CREATE POLICY attendance_municipal_thresholds_insert
ON public.attendance_municipal_thresholds
FOR INSERT TO authenticated
WITH CHECK (
  (SELECT public.pilot_is_secretariat())
  AND defined_by = (SELECT auth.uid())
  AND municipality_id = (
    SELECT id
    FROM public.pilot_municipality_config
    ORDER BY created_at, id
    LIMIT 1
  )
);

REVOKE UPDATE, DELETE ON public.attendance_municipal_thresholds FROM anon, authenticated;
GRANT SELECT, INSERT ON public.attendance_municipal_thresholds TO authenticated;
GRANT ALL ON public.attendance_municipal_thresholds TO service_role;

-- This is a persisted bootstrap fallback for the synthetic municipality. It is
-- data, not an application default. A real municipality replaces it with a
-- dated row defined by an authorized municipal user.
INSERT INTO public.attendance_municipal_thresholds (
  municipality_id,
  scope,
  valid_from,
  precedence,
  municipal_warning_percent,
  municipal_critical_percent,
  source,
  is_fallback,
  fallback_reason
)
SELECT
  municipality.id,
  'municipio',
  DATE '1900-01-01',
  0,
  85,
  80,
  'migration_bootstrap_fallback',
  true,
  'Nenhuma margem municipal datada foi definida; usar a margem persistida de fallback.'
FROM public.pilot_municipality_config AS municipality
WHERE NOT EXISTS (
  SELECT 1
  FROM public.attendance_municipal_thresholds AS existing
  WHERE existing.municipality_id = municipality.id
    AND existing.is_fallback
);

-- -----------------------------------------------------------------------------
-- Canonical margin resolver
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.resolve_municipal_attendance_margin(
  p_municipality_id uuid,
  p_reference_date date
)
RETURNS TABLE (
  threshold_id uuid,
  municipality_id uuid,
  scope text,
  valid_from date,
  valid_until date,
  precedence integer,
  municipal_warning_percent numeric,
  municipal_critical_percent numeric,
  defined_by uuid,
  defined_at timestamptz,
  source text,
  is_fallback boolean,
  fallback_reason text
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
  SELECT
    threshold.id,
    threshold.municipality_id,
    threshold.scope,
    threshold.valid_from,
    threshold.valid_until,
    threshold.precedence,
    threshold.municipal_warning_percent,
    threshold.municipal_critical_percent,
    threshold.defined_by,
    threshold.defined_at,
    threshold.source,
    threshold.is_fallback,
    threshold.fallback_reason
  FROM public.attendance_municipal_thresholds AS threshold
  WHERE threshold.municipality_id = p_municipality_id
    AND (
      (
        NOT threshold.is_fallback
        AND threshold.valid_from <= p_reference_date
        AND (
          threshold.valid_until IS NULL
          OR threshold.valid_until >= p_reference_date
        )
      )
      OR threshold.is_fallback
    )
  ORDER BY
    CASE
      WHEN NOT threshold.is_fallback
       AND threshold.valid_from <= p_reference_date
       AND (
         threshold.valid_until IS NULL
         OR threshold.valid_until >= p_reference_date
       )
      THEN 0
      ELSE 1
    END,
    threshold.precedence DESC,
    threshold.valid_from DESC,
    threshold.defined_at DESC,
    threshold.id DESC
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.resolve_municipal_attendance_margin(uuid, date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_municipal_attendance_margin(uuid, date) TO authenticated, service_role;

-- -----------------------------------------------------------------------------
-- Canonical attendance and conditionality read model
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_attendance_conditionality(
  p_start_date date,
  p_end_date date,
  p_escola_id uuid DEFAULT NULL,
  p_turma_id uuid DEFAULT NULL
)
RETURNS TABLE (
  matricula_id uuid,
  aluno_id uuid,
  aluno_nome text,
  nis text,
  is_bolsa_familia boolean,
  data_nascimento date,
  idade_anos integer,
  educacao_basica_concluida boolean,
  turma_id uuid,
  turma_nome text,
  turma_serie text,
  etapa_ensino text,
  escola_id uuid,
  escola_nome text,
  municipio_id uuid,
  total_aulas bigint,
  presencas bigint,
  faltas bigint,
  atestados bigint,
  percentual_frequencia numeric,
  tem_dados_frequencia boolean,
  condicionalidade_legal text,
  piso_legal_percent numeric,
  condicionalidade_legal_status text,
  margem_municipal_id uuid,
  margem_municipal_critica_percent numeric,
  margem_municipal_alerta_percent numeric,
  margem_municipal_status text,
  margem_municipal_precedencia integer,
  margem_municipal_origem text,
  margem_municipal_definida_por uuid,
  margem_municipal_definida_em timestamptz,
  margem_municipal_fallback boolean,
  margem_municipal_fallback_motivo text,
  margem_municipal_vigencia_inicio date,
  margem_municipal_vigencia_fim date
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
  WITH params AS (
    SELECT p_start_date AS start_date, p_end_date AS end_date
    WHERE p_start_date <= p_end_date
  ),
  active_enrollments AS (
    SELECT
      enrollment.id AS matricula_id,
      student.id AS aluno_id,
      student.nome_completo AS aluno_nome,
      student.nis,
      (coalesce(student.bolsa_familia, false) OR nullif(btrim(student.nis), '') IS NOT NULL)
        AS is_bolsa_familia,
      student.data_nascimento,
      EXTRACT(YEAR FROM age(params.end_date, student.data_nascimento))::integer AS idade_anos,
      EXISTS (
        SELECT 1
        FROM public.matriculas AS completed_enrollment
        JOIN public.turmas AS completed_class
          ON completed_class.id = completed_enrollment.turma_id
        WHERE completed_enrollment.aluno_id = student.id
          AND lower(coalesce(completed_enrollment.situacao, '')) LIKE 'conclu%'
          AND (
            completed_class.etapa_ensino IN ('EM', 'EJA')
            OR lower(coalesce(completed_class.serie, '')) LIKE '%ensino médio%'
            OR lower(coalesce(completed_class.serie, '')) LIKE '%ensino medio%'
          )
      ) AS educacao_basica_concluida,
      enrollment.turma_id,
      class.id AS class_id,
      class.nome AS turma_nome,
      class.serie AS turma_serie,
      class.etapa_ensino,
      school.id AS escola_id,
      school.nome AS escola_nome,
      school.municipio_id,
      params.start_date,
      params.end_date
    FROM params
    JOIN public.matriculas AS enrollment ON enrollment.situacao = 'ativa'
    JOIN public.alunos AS student ON student.id = enrollment.aluno_id
    JOIN public.turmas AS class ON class.id = enrollment.turma_id
    JOIN public.escolas AS school ON school.id = class.escola_id
    WHERE student.ativo = true
      AND class.ativo = true
      AND (p_escola_id IS NULL OR school.id = p_escola_id)
      AND (p_turma_id IS NULL OR class.id = p_turma_id)
  ),
  attendance_counts AS (
    SELECT
      frequency.matricula_id,
      count(*) FILTER (
        WHERE coalesce(frequency.status_presenca, 'NAO_MARCADO') <> 'NAO_MARCADO'
      ) AS total_aulas,
      count(*) FILTER (
        WHERE coalesce(frequency.status_presenca, 'NAO_MARCADO') IN ('P', 'J', 'A')
      ) AS presencas,
      count(*) FILTER (
        WHERE coalesce(frequency.status_presenca, 'NAO_MARCADO') = 'F'
      ) AS faltas,
      count(*) FILTER (WHERE frequency.status_presenca = 'A') AS atestados
    FROM public.frequencia AS frequency
    JOIN params ON true
    WHERE frequency.data_aula BETWEEN params.start_date AND params.end_date
    GROUP BY frequency.matricula_id
  )
  SELECT
    enrollment.matricula_id,
    enrollment.aluno_id,
    enrollment.aluno_nome,
    enrollment.nis,
    enrollment.is_bolsa_familia,
    enrollment.data_nascimento,
    enrollment.idade_anos,
    enrollment.educacao_basica_concluida,
    enrollment.class_id,
    enrollment.turma_nome,
    enrollment.turma_serie,
    enrollment.etapa_ensino,
    enrollment.escola_id,
    enrollment.escola_nome,
    enrollment.municipio_id,
    coalesce(attendance.total_aulas, 0)::bigint,
    coalesce(attendance.presencas, 0)::bigint,
    coalesce(attendance.faltas, 0)::bigint,
    coalesce(attendance.atestados, 0)::bigint,
    coalesce(
      round(
        100.0 * attendance.presencas / nullif(attendance.total_aulas, 0),
        2
      ),
      0
    )::numeric,
    coalesce(attendance.total_aulas, 0) > 0,
    CASE
      WHEN NOT enrollment.is_bolsa_familia
        OR enrollment.idade_anos < 4
        OR enrollment.idade_anos >= 18
        OR (
          enrollment.idade_anos >= 6
          AND enrollment.idade_anos < 18
          AND enrollment.educacao_basica_concluida
        )
        THEN NULL
      WHEN enrollment.idade_anos >= 4 AND enrollment.idade_anos < 6
        THEN '4_A_6_ANOS_INCOMPLETOS'
      WHEN enrollment.idade_anos >= 6 AND enrollment.idade_anos < 18
        THEN '6_A_18_ANOS_INCOMPLETOS_SEM_CONCLUSAO_DA_EDUCACAO_BASICA'
      ELSE NULL
    END,
    CASE
      WHEN enrollment.is_bolsa_familia
       AND enrollment.idade_anos >= 4
       AND enrollment.idade_anos < 6
        THEN 60::numeric
      WHEN enrollment.is_bolsa_familia
       AND enrollment.idade_anos >= 6
       AND enrollment.idade_anos < 18
       AND NOT enrollment.educacao_basica_concluida
        THEN 75::numeric
      ELSE NULL
    END,
    CASE
      WHEN NOT enrollment.is_bolsa_familia
        OR enrollment.idade_anos < 4
        OR enrollment.idade_anos >= 18
        OR (
          enrollment.idade_anos >= 6
          AND enrollment.idade_anos < 18
          AND enrollment.educacao_basica_concluida
        )
        THEN 'NAO_APLICAVEL'
      WHEN coalesce(attendance.total_aulas, 0) = 0
        THEN 'SEM_DADOS'
      WHEN coalesce(attendance.presencas, 0) * 100.0
             / nullif(attendance.total_aulas, 0)
           < CASE
               WHEN enrollment.idade_anos >= 4 AND enrollment.idade_anos < 6 THEN 60
               ELSE 75
             END
        THEN 'CRITICO'
      ELSE 'CONFORME'
    END,
    margin.threshold_id,
    margin.municipal_critical_percent,
    margin.municipal_warning_percent,
    CASE
      WHEN NOT enrollment.is_bolsa_familia THEN 'NAO_APLICAVEL'
      WHEN coalesce(attendance.total_aulas, 0) = 0 THEN 'SEM_DADOS'
      WHEN margin.threshold_id IS NULL THEN 'NAO_CONFIGURADA'
      WHEN coalesce(attendance.presencas, 0) * 100.0
             / nullif(attendance.total_aulas, 0)
           < margin.municipal_critical_percent
        THEN 'CRITICO'
      WHEN coalesce(attendance.presencas, 0) * 100.0
             / nullif(attendance.total_aulas, 0)
           < margin.municipal_warning_percent
        THEN 'ALERTA'
      ELSE 'CONFORME'
    END,
    margin.precedence,
    margin.source,
    margin.defined_by,
    margin.defined_at,
    margin.is_fallback,
    margin.fallback_reason,
    margin.valid_from,
    margin.valid_until
  FROM active_enrollments AS enrollment
  LEFT JOIN attendance_counts AS attendance
    ON attendance.matricula_id = enrollment.matricula_id
  LEFT JOIN LATERAL public.resolve_municipal_attendance_margin(
    enrollment.municipio_id,
    enrollment.end_date
  ) AS margin ON true;
$$;

REVOKE ALL ON FUNCTION public.get_attendance_conditionality(date, date, uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_attendance_conditionality(date, date, uuid, uuid) TO authenticated, service_role;

-- The parameterized function is the canonical query for arbitrary periods. The
-- view makes the same read model discoverable to SQL/reporting consumers for the
-- current month without creating a second threshold implementation.
DROP VIEW IF EXISTS public.vw_frequencia_condicionalidade;
CREATE VIEW public.vw_frequencia_condicionalidade
WITH (security_invoker = true)
AS
SELECT *
FROM public.get_attendance_conditionality(
  date_trunc('month', current_date)::date,
  current_date,
  NULL,
  NULL
);

REVOKE ALL ON public.vw_frequencia_condicionalidade FROM anon;
GRANT SELECT ON public.vw_frequencia_condicionalidade TO authenticated;

COMMIT;
