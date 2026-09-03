BEGIN;

CREATE OR REPLACE FUNCTION public.vivencias_valid_campos(input_campos text[])
RETURNS boolean
LANGUAGE sql
IMMUTABLE
STRICT
SET search_path = pg_catalog
AS $$
  SELECT cardinality(input_campos) BETWEEN 1 AND 5
    AND input_campos <@ ARRAY['eu', 'corpo', 'tracos', 'escuta', 'espacos']::text[]
    AND cardinality(input_campos) = (
      SELECT count(DISTINCT campo)
      FROM unnest(input_campos) AS campos(campo)
    );
$$;

CREATE TABLE IF NOT EXISTS public.vivencias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  escola_id uuid NOT NULL REFERENCES public.escolas(id) ON DELETE RESTRICT,
  aluno_id uuid NOT NULL REFERENCES public.alunos(id) ON DELETE RESTRICT,
  matricula_id uuid NOT NULL REFERENCES public.matriculas(id) ON DELETE RESTRICT,
  turma_id uuid NOT NULL REFERENCES public.turmas(id) ON DELETE RESTRICT,
  professor_id uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  data_vivencia date NOT NULL,
  campos_experiencia text[] NOT NULL,
  descricao text NOT NULL,
  observacoes text,
  escopo text NOT NULL DEFAULT 'individual' CHECK (escopo IN ('individual', 'coletiva')),
  created_by uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  updated_by uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT vivencias_campos_check CHECK (public.vivencias_valid_campos(campos_experiencia)),
  CONSTRAINT vivencias_descricao_check CHECK (char_length(btrim(descricao)) BETWEEN 20 AND 2000),
  CONSTRAINT vivencias_observacoes_check CHECK (observacoes IS NULL OR char_length(observacoes) <= 500)
);

CREATE TABLE IF NOT EXISTS public.vivencias_campos_experiencia (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vivencia_id uuid NOT NULL REFERENCES public.vivencias(id) ON DELETE CASCADE,
  escola_id uuid NOT NULL REFERENCES public.escolas(id) ON DELETE RESTRICT,
  campo text NOT NULL CHECK (campo IN ('eu', 'corpo', 'tracos', 'escuta', 'espacos')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (vivencia_id, campo)
);

CREATE TABLE IF NOT EXISTS public.relatorios_descritivos_vivencias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  relatorio_id uuid NOT NULL REFERENCES public.relatorios_descritivos(id) ON DELETE RESTRICT,
  vivencia_id uuid NOT NULL REFERENCES public.vivencias(id) ON DELETE RESTRICT,
  escola_id uuid NOT NULL REFERENCES public.escolas(id) ON DELETE RESTRICT,
  created_by uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (relatorio_id, vivencia_id)
);

CREATE INDEX IF NOT EXISTS idx_vivencias_aluno_data
  ON public.vivencias(aluno_id, data_vivencia DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_vivencias_turma_data
  ON public.vivencias(turma_id, data_vivencia DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_vivencias_escola_data
  ON public.vivencias(escola_id, data_vivencia DESC);
CREATE INDEX IF NOT EXISTS idx_vivencias_professor_data
  ON public.vivencias(professor_id, data_vivencia DESC);
CREATE INDEX IF NOT EXISTS idx_vivencias_campos_vivencia
  ON public.vivencias_campos_experiencia(vivencia_id);
CREATE INDEX IF NOT EXISTS idx_vivencias_campos_escola
  ON public.vivencias_campos_experiencia(escola_id, campo);
CREATE INDEX IF NOT EXISTS idx_relatorios_descritivos_vivencias_relatorio
  ON public.relatorios_descritivos_vivencias(relatorio_id);
CREATE INDEX IF NOT EXISTS idx_relatorios_descritivos_vivencias_vivencia
  ON public.relatorios_descritivos_vivencias(vivencia_id);

CREATE OR REPLACE FUNCTION public.validate_vivencia_identity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  enrollment_aluno_id uuid;
  enrollment_turma_id uuid;
  enrollment_situacao text;
  class_school_id uuid;
  class_professor_id uuid;
  student_school_id uuid;
BEGIN
  IF TG_OP = 'UPDATE' AND (
    OLD.escola_id IS DISTINCT FROM NEW.escola_id
    OR OLD.aluno_id IS DISTINCT FROM NEW.aluno_id
    OR OLD.matricula_id IS DISTINCT FROM NEW.matricula_id
    OR OLD.turma_id IS DISTINCT FROM NEW.turma_id
    OR OLD.professor_id IS DISTINCT FROM NEW.professor_id
    OR OLD.created_by IS DISTINCT FROM NEW.created_by
  ) THEN
    RAISE EXCEPTION 'VIVENCIA_IDENTITY_IMMUTABLE';
  END IF;

  SELECT m.aluno_id, m.turma_id, m.situacao, t.escola_id, t.professor_id, a.escola_id
  INTO enrollment_aluno_id, enrollment_turma_id, enrollment_situacao,
    class_school_id, class_professor_id, student_school_id
  FROM public.matriculas AS m
  JOIN public.turmas AS t ON t.id = m.turma_id
  JOIN public.alunos AS a ON a.id = m.aluno_id
  WHERE m.id = NEW.matricula_id;

  IF enrollment_aluno_id IS NULL
    OR enrollment_aluno_id IS DISTINCT FROM NEW.aluno_id
    OR enrollment_turma_id IS DISTINCT FROM NEW.turma_id
    OR class_school_id IS DISTINCT FROM NEW.escola_id
    OR (student_school_id IS NOT NULL AND student_school_id IS DISTINCT FROM NEW.escola_id)
    OR class_professor_id IS DISTINCT FROM NEW.professor_id
  THEN
    RAISE EXCEPTION 'VIVENCIA_SCOPE_MISMATCH';
  END IF;

  IF TG_OP = 'INSERT' AND enrollment_situacao IS DISTINCT FROM 'ativa' THEN
    RAISE EXCEPTION 'VIVENCIA_ENROLLMENT_INACTIVE';
  END IF;

  IF NEW.data_vivencia > (now() AT TIME ZONE 'America/Sao_Paulo')::date THEN
    RAISE EXCEPTION 'VIVENCIA_DATE_IN_FUTURE';
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_vivencia_campos()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  DELETE FROM public.vivencias_campos_experiencia
  WHERE vivencia_id = NEW.id;

  INSERT INTO public.vivencias_campos_experiencia(vivencia_id, escola_id, campo)
  SELECT NEW.id, NEW.escola_id, campo
  FROM unnest(NEW.campos_experiencia) AS campos(campo);

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.validate_vivencia_report_source()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  report_matricula_id uuid;
  report_school_id uuid;
  vivencia_matricula_id uuid;
  vivencia_school_id uuid;
BEGIN
  SELECT r.matricula_id, t.escola_id
  INTO report_matricula_id, report_school_id
  FROM public.relatorios_descritivos AS r
  JOIN public.turmas AS t ON t.id = r.turma_id
  WHERE r.id = NEW.relatorio_id;

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

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.vivencia_audit_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  row_data jsonb;
  old_data jsonb;
  school_id uuid;
  record_id text;
BEGIN
  row_data := CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE to_jsonb(NEW) END;
  old_data := CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) ELSE '{}'::jsonb END;
  record_id := coalesce(row_data->>'id', row_data->>'vivencia_id', row_data->>'relatorio_id');
  school_id := NULLIF(row_data->>'escola_id', '')::uuid;

  INSERT INTO public.audit_trail(
    tabela, registro_id, operacao, usuario_id, escola_id,
    dados_anteriores, dados_novos, justificativa, nivel_criticidade
  )
  VALUES (
    TG_TABLE_NAME, record_id, lower(TG_OP), auth.uid(), school_id,
    CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN old_data ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN row_data ELSE NULL END,
    'vivencia narrative lifecycle', 'normal'
  );

  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;

DROP TRIGGER IF EXISTS vivencias_identity ON public.vivencias;
CREATE TRIGGER vivencias_identity
BEFORE INSERT OR UPDATE ON public.vivencias
FOR EACH ROW EXECUTE FUNCTION public.validate_vivencia_identity();

DROP TRIGGER IF EXISTS vivencias_sync_campos ON public.vivencias;
CREATE TRIGGER vivencias_sync_campos
AFTER INSERT OR UPDATE OF campos_experiencia, escola_id ON public.vivencias
FOR EACH ROW EXECUTE FUNCTION public.sync_vivencia_campos();

DROP TRIGGER IF EXISTS relatorios_descritivos_vivencias_scope ON public.relatorios_descritivos_vivencias;
CREATE TRIGGER relatorios_descritivos_vivencias_scope
BEFORE INSERT OR UPDATE ON public.relatorios_descritivos_vivencias
FOR EACH ROW EXECUTE FUNCTION public.validate_vivencia_report_source();

DROP TRIGGER IF EXISTS vivencias_audit_trail ON public.vivencias;
CREATE TRIGGER vivencias_audit_trail
AFTER INSERT OR UPDATE OR DELETE ON public.vivencias
FOR EACH ROW EXECUTE FUNCTION public.vivencia_audit_change();

DROP TRIGGER IF EXISTS vivencias_campos_audit_trail ON public.vivencias_campos_experiencia;
CREATE TRIGGER vivencias_campos_audit_trail
AFTER INSERT OR UPDATE OR DELETE ON public.vivencias_campos_experiencia
FOR EACH ROW EXECUTE FUNCTION public.vivencia_audit_change();

DROP TRIGGER IF EXISTS relatorios_descritivos_vivencias_audit_trail ON public.relatorios_descritivos_vivencias;
CREATE TRIGGER relatorios_descritivos_vivencias_audit_trail
AFTER INSERT OR UPDATE OR DELETE ON public.relatorios_descritivos_vivencias
FOR EACH ROW EXECUTE FUNCTION public.vivencia_audit_change();

DROP TRIGGER IF EXISTS pilot_audit_core_change ON public.vivencias;
CREATE TRIGGER pilot_audit_core_change
AFTER INSERT OR UPDATE OR DELETE ON public.vivencias
FOR EACH ROW EXECUTE FUNCTION public.pilot_audit_core_change();

DROP TRIGGER IF EXISTS pilot_audit_core_change ON public.vivencias_campos_experiencia;
CREATE TRIGGER pilot_audit_core_change
AFTER INSERT OR UPDATE OR DELETE ON public.vivencias_campos_experiencia
FOR EACH ROW EXECUTE FUNCTION public.pilot_audit_core_change();

DROP TRIGGER IF EXISTS pilot_audit_core_change ON public.relatorios_descritivos_vivencias;
CREATE TRIGGER pilot_audit_core_change
AFTER INSERT OR UPDATE OR DELETE ON public.relatorios_descritivos_vivencias
FOR EACH ROW EXECUTE FUNCTION public.pilot_audit_core_change();

ALTER TABLE public.vivencias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vivencias_campos_experiencia ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.relatorios_descritivos_vivencias ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS vivencias_select ON public.vivencias;
CREATE POLICY vivencias_select ON public.vivencias
FOR SELECT TO authenticated
USING (
  public.pilot_can_access_school(escola_id)
  AND (
    public.pilot_current_role() <> 'professor'
    OR public.pilot_teacher_owns_class(turma_id)
  )
);

DROP POLICY IF EXISTS vivencias_insert ON public.vivencias;
CREATE POLICY vivencias_insert ON public.vivencias
FOR INSERT TO authenticated
WITH CHECK (
  public.pilot_current_role() = 'professor'
  AND professor_id = auth.uid()
  AND created_by = auth.uid()
  AND updated_by = auth.uid()
  AND public.pilot_teacher_owns_class(turma_id)
  AND public.pilot_can_access_school(escola_id)
);

DROP POLICY IF EXISTS vivencias_update ON public.vivencias;
CREATE POLICY vivencias_update ON public.vivencias
FOR UPDATE TO authenticated
USING (
  public.pilot_current_role() = 'professor'
  AND professor_id = auth.uid()
  AND public.pilot_teacher_owns_class(turma_id)
)
WITH CHECK (
  public.pilot_current_role() = 'professor'
  AND professor_id = auth.uid()
  AND created_by = auth.uid()
  AND updated_by = auth.uid()
  AND public.pilot_teacher_owns_class(turma_id)
);

DROP POLICY IF EXISTS vivencias_delete ON public.vivencias;
CREATE POLICY vivencias_delete ON public.vivencias
FOR DELETE TO authenticated
USING (
  public.pilot_current_role() = 'professor'
  AND professor_id = auth.uid()
  AND public.pilot_teacher_owns_class(turma_id)
);

DROP POLICY IF EXISTS vivencias_campos_select ON public.vivencias_campos_experiencia;
CREATE POLICY vivencias_campos_select ON public.vivencias_campos_experiencia
FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1
  FROM public.vivencias AS vivencia
  WHERE vivencia.id = vivencia_id
    AND public.pilot_can_access_school(vivencia.escola_id)
    AND (
      public.pilot_current_role() <> 'professor'
      OR public.pilot_teacher_owns_class(vivencia.turma_id)
    )
));

DROP POLICY IF EXISTS relatorios_descritivos_vivencias_select ON public.relatorios_descritivos_vivencias;
CREATE POLICY relatorios_descritivos_vivencias_select ON public.relatorios_descritivos_vivencias
FOR SELECT TO authenticated
USING (
  public.pilot_can_access_school(escola_id)
  AND (
    public.pilot_current_role() <> 'professor'
    OR EXISTS (
      SELECT 1
      FROM public.vivencias AS vivencia
      WHERE vivencia.id = vivencia_id
        AND public.pilot_teacher_owns_class(vivencia.turma_id)
    )
  )
);

DROP POLICY IF EXISTS relatorios_descritivos_vivencias_insert ON public.relatorios_descritivos_vivencias;
CREATE POLICY relatorios_descritivos_vivencias_insert ON public.relatorios_descritivos_vivencias
FOR INSERT TO authenticated
WITH CHECK (
  public.pilot_current_role() = 'professor'
  AND created_by = auth.uid()
  AND public.pilot_can_access_school(escola_id)
  AND EXISTS (
    SELECT 1
    FROM public.relatorios_descritivos AS report
    JOIN public.vivencias AS vivencia ON vivencia.matricula_id = report.matricula_id
    WHERE report.id = relatorio_id
      AND vivencia.id = vivencia_id
      AND report.professor_id = auth.uid()
      AND public.pilot_teacher_owns_class(vivencia.turma_id)
  )
);

REVOKE ALL ON public.vivencias, public.vivencias_campos_experiencia,
  public.relatorios_descritivos_vivencias FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vivencias TO authenticated;
GRANT SELECT ON public.vivencias_campos_experiencia TO authenticated;
GRANT SELECT, INSERT ON public.relatorios_descritivos_vivencias TO authenticated;
GRANT ALL ON public.vivencias, public.vivencias_campos_experiencia,
  public.relatorios_descritivos_vivencias TO service_role;
REVOKE UPDATE, DELETE ON public.vivencias_campos_experiencia,
  public.relatorios_descritivos_vivencias FROM authenticated;

COMMIT;
