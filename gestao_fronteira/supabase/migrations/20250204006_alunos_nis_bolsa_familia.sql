-- Migration: Add NIS field to alunos table for Bolsa Familia integration
-- Task 4.2.1: Implementar identificacao de alunos com NIS
-- OpenSpec Change: 2025-12-04-diario-de-classe
--
-- NIS (Numero de Identificacao Social) is required for Bolsa Familia program tracking.
-- Students with NIS who fall below 80% attendance are at risk of losing benefits.
--
-- Reference: Brazilian Bolsa Familia conditionalities require minimum 85% attendance
-- for ages 6-15 and 75% for ages 16-17. We use 80% as threshold for early warning.

-- ============================================================================
-- STEP 1: Add NIS column to alunos table
-- ============================================================================

-- Add NIS column if it doesn't exist
ALTER TABLE public.alunos
ADD COLUMN IF NOT EXISTS nis VARCHAR(11);

-- NIS format: 11 digits (e.g., 12345678901)
-- Add comment explaining the field
COMMENT ON COLUMN public.alunos.nis IS 'Numero de Identificacao Social para programa Bolsa Familia. Formato: 11 digitos.';

-- ============================================================================
-- STEP 2: Create index for efficient NIS queries
-- ============================================================================

-- Index for filtering students with NIS (Bolsa Familia beneficiaries)
CREATE INDEX IF NOT EXISTS idx_alunos_nis
ON public.alunos(nis)
WHERE nis IS NOT NULL;

-- ============================================================================
-- STEP 3: Create validation function for NIS format
-- ============================================================================

-- Function to validate NIS format (11 digits)
CREATE OR REPLACE FUNCTION public.validate_nis(p_nis VARCHAR)
RETURNS BOOLEAN
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  -- NIS must be exactly 11 digits
  IF p_nis IS NULL THEN
    RETURN TRUE; -- NULL is valid (not all students have NIS)
  END IF;

  -- Check if NIS is exactly 11 digits
  IF LENGTH(p_nis) != 11 THEN
    RETURN FALSE;
  END IF;

  -- Check if NIS contains only digits
  IF NOT p_nis ~ '^[0-9]{11}$' THEN
    RETURN FALSE;
  END IF;

  RETURN TRUE;
END;
$$;

-- Add check constraint for NIS validation
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_alunos_nis_format'
  ) THEN
    ALTER TABLE public.alunos
    ADD CONSTRAINT chk_alunos_nis_format
    CHECK (validate_nis(nis));
  END IF;
END;
$$;

-- ============================================================================
-- STEP 4: Create Bolsa Familia frequency calculation function
-- ============================================================================

-- Function to calculate Bolsa Familia frequency for a student
-- Per Task 4.2.2: Atestado = presenca (falta justificada) for 80% calculation
CREATE OR REPLACE FUNCTION public.calculate_bolsa_familia_frequency(
  p_aluno_id UUID,
  p_data_inicio DATE DEFAULT NULL,
  p_data_fim DATE DEFAULT NULL
)
RETURNS TABLE (
  aluno_id UUID,
  aluno_nome VARCHAR,
  nis VARCHAR,
  total_aulas INTEGER,
  total_presencas INTEGER,
  total_faltas INTEGER,
  total_atestados INTEGER,
  frequencia_percentual NUMERIC(5,2),
  em_risco BOOLEAN,
  status_bolsa_familia VARCHAR
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  v_data_inicio DATE;
  v_data_fim DATE;
BEGIN
  -- Default date range: current academic year
  v_data_inicio := COALESCE(p_data_inicio, DATE_TRUNC('year', CURRENT_DATE)::DATE);
  v_data_fim := COALESCE(p_data_fim, CURRENT_DATE);

  RETURN QUERY
  WITH attendance_data AS (
    SELECT
      a.id AS aluno_id,
      a.nome_completo AS aluno_nome,
      a.nis,
      COUNT(f.id) AS total_aulas,
      -- Presencas: P (Presente) + A (Atestado) count as "present" for Bolsa Familia
      COUNT(CASE WHEN f.status_presenca IN ('P', 'A') OR (f.status_presenca IS NULL AND f.presente = true) THEN 1 END) AS total_presencas,
      -- Faltas: F (Falta) only
      COUNT(CASE WHEN f.status_presenca = 'F' OR (f.status_presenca IS NULL AND f.presente = false) THEN 1 END) AS total_faltas,
      -- Atestados: A only (for detailed reporting)
      COUNT(CASE WHEN f.status_presenca = 'A' THEN 1 END) AS total_atestados
    FROM public.alunos a
    INNER JOIN public.matriculas m ON a.id = m.aluno_id AND m.situacao = 'ativo'
    LEFT JOIN public.frequencia f ON m.id = f.matricula_id
      AND f.data_aula >= v_data_inicio
      AND f.data_aula <= v_data_fim
    WHERE a.id = p_aluno_id
    GROUP BY a.id, a.nome_completo, a.nis
  )
  SELECT
    ad.aluno_id,
    ad.aluno_nome,
    ad.nis,
    ad.total_aulas::INTEGER,
    ad.total_presencas::INTEGER,
    ad.total_faltas::INTEGER,
    ad.total_atestados::INTEGER,
    CASE
      WHEN ad.total_aulas > 0 THEN ROUND((ad.total_presencas::NUMERIC / ad.total_aulas * 100), 2)
      ELSE 0
    END AS frequencia_percentual,
    CASE
      WHEN ad.total_aulas > 0 AND (ad.total_presencas::NUMERIC / ad.total_aulas * 100) < 80 THEN TRUE
      ELSE FALSE
    END AS em_risco,
    CASE
      WHEN ad.total_aulas = 0 THEN 'Sem Aulas Registradas'
      WHEN (ad.total_presencas::NUMERIC / ad.total_aulas * 100) >= 80 THEN 'Regular'
      WHEN (ad.total_presencas::NUMERIC / ad.total_aulas * 100) >= 75 THEN 'Alerta'
      ELSE 'Critico'
    END AS status_bolsa_familia
  FROM attendance_data ad;
END;
$$;

-- ============================================================================
-- STEP 5: Create function to get all Bolsa Familia students at risk
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_bolsa_familia_students_at_risk(
  p_escola_id UUID DEFAULT NULL,
  p_turma_id UUID DEFAULT NULL,
  p_data_inicio DATE DEFAULT NULL,
  p_data_fim DATE DEFAULT NULL,
  p_threshold NUMERIC DEFAULT 80
)
RETURNS TABLE (
  aluno_id UUID,
  aluno_nome VARCHAR,
  nis VARCHAR,
  turma_id UUID,
  turma_nome VARCHAR,
  serie VARCHAR,
  escola_id UUID,
  escola_nome VARCHAR,
  total_aulas INTEGER,
  total_presencas INTEGER,
  total_faltas INTEGER,
  total_atestados INTEGER,
  frequencia_percentual NUMERIC(5,2),
  status_bolsa_familia VARCHAR
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  v_data_inicio DATE;
  v_data_fim DATE;
BEGIN
  -- Default date range: current academic year
  v_data_inicio := COALESCE(p_data_inicio, DATE_TRUNC('year', CURRENT_DATE)::DATE);
  v_data_fim := COALESCE(p_data_fim, CURRENT_DATE);

  RETURN QUERY
  WITH attendance_summary AS (
    SELECT
      a.id AS aluno_id,
      a.nome_completo AS aluno_nome,
      a.nis,
      t.id AS turma_id,
      t.nome AS turma_nome,
      t.serie,
      e.id AS escola_id,
      e.nome AS escola_nome,
      COUNT(f.id) AS total_aulas,
      -- Presencas: P (Presente) + A (Atestado) count as "present" for Bolsa Familia
      COUNT(CASE WHEN f.status_presenca IN ('P', 'A') OR (f.status_presenca IS NULL AND f.presente = true) THEN 1 END) AS total_presencas,
      -- Faltas: F (Falta) only
      COUNT(CASE WHEN f.status_presenca = 'F' OR (f.status_presenca IS NULL AND f.presente = false) THEN 1 END) AS total_faltas,
      -- Atestados: A only
      COUNT(CASE WHEN f.status_presenca = 'A' THEN 1 END) AS total_atestados
    FROM public.alunos a
    INNER JOIN public.matriculas m ON a.id = m.aluno_id AND m.situacao = 'ativo'
    INNER JOIN public.turmas t ON m.turma_id = t.id
    INNER JOIN public.escolas e ON t.escola_id = e.id
    LEFT JOIN public.frequencia f ON m.id = f.matricula_id
      AND f.data_aula >= v_data_inicio
      AND f.data_aula <= v_data_fim
    WHERE
      a.nis IS NOT NULL  -- Only students with NIS (Bolsa Familia beneficiaries)
      AND (p_escola_id IS NULL OR e.id = p_escola_id)
      AND (p_turma_id IS NULL OR t.id = p_turma_id)
    GROUP BY a.id, a.nome_completo, a.nis, t.id, t.nome, t.serie, e.id, e.nome
  )
  SELECT
    asum.aluno_id,
    asum.aluno_nome,
    asum.nis,
    asum.turma_id,
    asum.turma_nome,
    asum.serie,
    asum.escola_id,
    asum.escola_nome,
    asum.total_aulas::INTEGER,
    asum.total_presencas::INTEGER,
    asum.total_faltas::INTEGER,
    asum.total_atestados::INTEGER,
    CASE
      WHEN asum.total_aulas > 0 THEN ROUND((asum.total_presencas::NUMERIC / asum.total_aulas * 100), 2)
      ELSE 0
    END AS frequencia_percentual,
    CASE
      WHEN asum.total_aulas = 0 THEN 'Sem Aulas Registradas'
      WHEN (asum.total_presencas::NUMERIC / asum.total_aulas * 100) >= 80 THEN 'Regular'
      WHEN (asum.total_presencas::NUMERIC / asum.total_aulas * 100) >= 75 THEN 'Alerta'
      ELSE 'Critico'
    END AS status_bolsa_familia
  FROM attendance_summary asum
  WHERE
    asum.total_aulas > 0
    AND (asum.total_presencas::NUMERIC / asum.total_aulas * 100) < p_threshold
  ORDER BY
    (asum.total_presencas::NUMERIC / asum.total_aulas * 100) ASC,  -- Most critical first
    asum.aluno_nome ASC;
END;
$$;

-- ============================================================================
-- STEP 6: Create view for Bolsa Familia report
-- ============================================================================

CREATE OR REPLACE VIEW public.vw_bolsa_familia_frequencia AS
WITH attendance_data AS (
  SELECT
    a.id AS aluno_id,
    a.nome_completo AS aluno_nome,
    a.nis,
    a.data_nascimento,
    t.id AS turma_id,
    t.nome AS turma_nome,
    t.serie,
    t.turno,
    e.id AS escola_id,
    e.nome AS escola_nome,
    m.id AS matricula_id,
    m.ano_letivo,
    COUNT(f.id) AS total_aulas,
    COUNT(CASE WHEN f.status_presenca IN ('P', 'A') OR (f.status_presenca IS NULL AND f.presente = true) THEN 1 END) AS total_presencas,
    COUNT(CASE WHEN f.status_presenca = 'F' OR (f.status_presenca IS NULL AND f.presente = false) THEN 1 END) AS total_faltas,
    COUNT(CASE WHEN f.status_presenca = 'A' THEN 1 END) AS total_atestados
  FROM public.alunos a
  INNER JOIN public.matriculas m ON a.id = m.aluno_id AND m.situacao = 'ativo'
  INNER JOIN public.turmas t ON m.turma_id = t.id
  INNER JOIN public.escolas e ON t.escola_id = e.id
  LEFT JOIN public.frequencia f ON m.id = f.matricula_id
    AND EXTRACT(YEAR FROM f.data_aula) = m.ano_letivo
  WHERE a.nis IS NOT NULL
  GROUP BY a.id, a.nome_completo, a.nis, a.data_nascimento,
           t.id, t.nome, t.serie, t.turno,
           e.id, e.nome, m.id, m.ano_letivo
)
SELECT
  ad.*,
  CASE
    WHEN ad.total_aulas > 0 THEN ROUND((ad.total_presencas::NUMERIC / ad.total_aulas * 100), 2)
    ELSE 0
  END AS frequencia_percentual,
  CASE
    WHEN ad.total_aulas = 0 THEN 'sem_aulas'
    WHEN (ad.total_presencas::NUMERIC / ad.total_aulas * 100) >= 80 THEN 'regular'
    WHEN (ad.total_presencas::NUMERIC / ad.total_aulas * 100) >= 75 THEN 'alerta'
    ELSE 'critico'
  END AS status_bolsa_familia,
  CASE
    WHEN ad.total_aulas > 0 AND (ad.total_presencas::NUMERIC / ad.total_aulas * 100) < 80 THEN TRUE
    ELSE FALSE
  END AS em_risco
FROM attendance_data ad;

-- Add comment to view
COMMENT ON VIEW public.vw_bolsa_familia_frequencia IS 'View para relatorio Bolsa Familia - lista alunos com NIS e calcula frequencia. Atestado (A) conta como presenca conforme condicionalidades educacionais.';

-- ============================================================================
-- STEP 7: Grant permissions
-- ============================================================================

-- Grant execute on functions to authenticated users
GRANT EXECUTE ON FUNCTION public.validate_nis(VARCHAR) TO authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_bolsa_familia_frequency(UUID, DATE, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_bolsa_familia_students_at_risk(UUID, UUID, DATE, DATE, NUMERIC) TO authenticated;

-- Grant select on view to authenticated users
GRANT SELECT ON public.vw_bolsa_familia_frequencia TO authenticated;

-- ============================================================================
-- Migration Complete
-- ============================================================================
