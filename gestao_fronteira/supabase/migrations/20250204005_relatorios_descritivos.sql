/**
 * Migration: Relatorios Descritivos para Educacao Infantil
 * Task Group 3.2: Sistema de Relatorios Descritivos
 * OpenSpec Change: 2025-12-04-diario-de-classe
 *
 * This migration creates the descriptive reports table for Early Childhood Education
 * (Educacao Infantil) following BNCC's 5 Experience Fields (Campos de Experiencia).
 *
 * BNCC Experience Fields:
 * 1. EO - O eu, o outro e o nos
 * 2. CG - Corpo, gestos e movimentos
 * 3. TS - Tracos, sons, cores e formas
 * 4. EF - Escuta, fala, pensamento e imaginacao
 * 5. ET - Espacos, tempos, quantidades, relacoes e transformacoes
 */

-- ============================================================================
-- REPORT STATUS ENUM
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'report_status') THEN
    CREATE TYPE report_status AS ENUM ('rascunho', 'finalizado');
  END IF;
END $$;

-- ============================================================================
-- SEMESTER ENUM
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'semestre_tipo') THEN
    CREATE TYPE semestre_tipo AS ENUM ('primeiro', 'segundo');
  END IF;
END $$;

-- ============================================================================
-- RELATORIOS_DESCRITIVOS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS relatorios_descritivos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Student and Class Reference
  matricula_id UUID NOT NULL REFERENCES matriculas(id) ON DELETE CASCADE,
  turma_id UUID NOT NULL REFERENCES turmas(id) ON DELETE CASCADE,

  -- Teacher who created the report
  professor_id UUID NOT NULL REFERENCES users(id),

  -- Period
  ano_letivo INTEGER NOT NULL,
  semestre semestre_tipo NOT NULL,

  -- Status
  status report_status NOT NULL DEFAULT 'rascunho',

  -- 5 Experience Fields - Text descriptions for each
  -- Field 1: O eu, o outro e o nos
  campo_eu_outro_nos TEXT,

  -- Field 2: Corpo, gestos e movimentos
  campo_corpo_gestos TEXT,

  -- Field 3: Tracos, sons, cores e formas
  campo_tracos_sons TEXT,

  -- Field 4: Escuta, fala, pensamento e imaginacao
  campo_escuta_fala TEXT,

  -- Field 5: Espacos, tempos, quantidades, relacoes e transformacoes
  campo_espacos_tempos TEXT,

  -- General Observations
  observacoes_gerais TEXT,

  -- Auto-save draft data (JSON for flexibility)
  draft_data JSONB,
  last_draft_saved_at TIMESTAMPTZ,

  -- Finalization
  finalizado_em TIMESTAMPTZ,
  finalizado_por UUID REFERENCES users(id),

  -- Audit fields
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES users(id),

  -- Constraints
  CONSTRAINT unique_report_per_student_semester UNIQUE (matricula_id, ano_letivo, semestre)
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Index for querying by student
CREATE INDEX IF NOT EXISTS idx_relatorios_descritivos_matricula
  ON relatorios_descritivos(matricula_id);

-- Index for querying by class
CREATE INDEX IF NOT EXISTS idx_relatorios_descritivos_turma
  ON relatorios_descritivos(turma_id);

-- Index for querying by teacher
CREATE INDEX IF NOT EXISTS idx_relatorios_descritivos_professor
  ON relatorios_descritivos(professor_id);

-- Index for querying by period
CREATE INDEX IF NOT EXISTS idx_relatorios_descritivos_periodo
  ON relatorios_descritivos(ano_letivo, semestre);

-- Index for querying by status
CREATE INDEX IF NOT EXISTS idx_relatorios_descritivos_status
  ON relatorios_descritivos(status);

-- Composite index for common queries
CREATE INDEX IF NOT EXISTS idx_relatorios_descritivos_turma_periodo
  ON relatorios_descritivos(turma_id, ano_letivo, semestre);

-- ============================================================================
-- UPDATED_AT TRIGGER
-- ============================================================================

CREATE OR REPLACE FUNCTION update_relatorios_descritivos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_relatorios_descritivos_updated_at
  ON relatorios_descritivos;

CREATE TRIGGER trigger_update_relatorios_descritivos_updated_at
  BEFORE UPDATE ON relatorios_descritivos
  FOR EACH ROW
  EXECUTE FUNCTION update_relatorios_descritivos_updated_at();

-- ============================================================================
-- FINALIZATION TRIGGER
-- ============================================================================

-- Automatically set finalizado_em when status changes to 'finalizado'
CREATE OR REPLACE FUNCTION set_relatorio_finalizado()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'finalizado' AND OLD.status = 'rascunho' THEN
    NEW.finalizado_em = now();
    NEW.finalizado_por = auth.uid();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_set_relatorio_finalizado
  ON relatorios_descritivos;

CREATE TRIGGER trigger_set_relatorio_finalizado
  BEFORE UPDATE ON relatorios_descritivos
  FOR EACH ROW
  EXECUTE FUNCTION set_relatorio_finalizado();

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE relatorios_descritivos ENABLE ROW LEVEL SECURITY;

-- Policy: Teachers can view their own reports
CREATE POLICY "Teachers can view own reports"
  ON relatorios_descritivos FOR SELECT
  TO authenticated
  USING (
    professor_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND tipo_usuario IN ('admin', 'diretor', 'secretario')
    )
  );

-- Policy: Teachers can create reports for their classes
CREATE POLICY "Teachers can create reports"
  ON relatorios_descritivos FOR INSERT
  TO authenticated
  WITH CHECK (
    professor_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM turmas t
      WHERE t.id = turma_id
      AND t.professor_id = auth.uid()
    )
  );

-- Policy: Teachers can update their draft reports
CREATE POLICY "Teachers can update draft reports"
  ON relatorios_descritivos FOR UPDATE
  TO authenticated
  USING (
    professor_id = auth.uid()
    AND status = 'rascunho'
  )
  WITH CHECK (
    professor_id = auth.uid()
  );

-- Policy: Admins can update any report
CREATE POLICY "Admins can update any report"
  ON relatorios_descritivos FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND tipo_usuario = 'admin'
    )
  );

-- Policy: Only admins can delete reports
CREATE POLICY "Only admins can delete reports"
  ON relatorios_descritivos FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND tipo_usuario = 'admin'
    )
  );

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to get current semester based on date
CREATE OR REPLACE FUNCTION get_current_semester(check_date DATE DEFAULT CURRENT_DATE)
RETURNS semestre_tipo AS $$
BEGIN
  -- First semester: February to July
  -- Second semester: August to December
  IF EXTRACT(MONTH FROM check_date) <= 7 THEN
    RETURN 'primeiro'::semestre_tipo;
  ELSE
    RETURN 'segundo'::semestre_tipo;
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to check if a report exists for a student/period
CREATE OR REPLACE FUNCTION report_exists_for_period(
  p_matricula_id UUID,
  p_ano_letivo INTEGER,
  p_semestre semestre_tipo
)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM relatorios_descritivos
    WHERE matricula_id = p_matricula_id
    AND ano_letivo = p_ano_letivo
    AND semestre = p_semestre
  );
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- VIEW FOR DETAILED REPORTS
-- ============================================================================

CREATE OR REPLACE VIEW vw_relatorios_descritivos_detalhado AS
SELECT
  r.id,
  r.matricula_id,
  r.turma_id,
  r.professor_id,
  r.ano_letivo,
  r.semestre,
  r.status,
  r.campo_eu_outro_nos,
  r.campo_corpo_gestos,
  r.campo_tracos_sons,
  r.campo_escuta_fala,
  r.campo_espacos_tempos,
  r.observacoes_gerais,
  r.draft_data,
  r.last_draft_saved_at,
  r.finalizado_em,
  r.created_at,
  r.updated_at,
  -- Student info
  a.id AS aluno_id,
  a.nome_completo AS aluno_nome,
  a.data_nascimento AS aluno_nascimento,
  -- Class info
  t.nome AS turma_nome,
  t.serie AS turma_serie,
  -- School info
  e.id AS escola_id,
  e.nome AS escola_nome,
  -- Teacher info
  u.nome AS professor_nome,
  -- Calculated fields
  CASE
    WHEN r.campo_eu_outro_nos IS NOT NULL AND r.campo_eu_outro_nos != '' THEN 1 ELSE 0
  END +
  CASE
    WHEN r.campo_corpo_gestos IS NOT NULL AND r.campo_corpo_gestos != '' THEN 1 ELSE 0
  END +
  CASE
    WHEN r.campo_tracos_sons IS NOT NULL AND r.campo_tracos_sons != '' THEN 1 ELSE 0
  END +
  CASE
    WHEN r.campo_escuta_fala IS NOT NULL AND r.campo_escuta_fala != '' THEN 1 ELSE 0
  END +
  CASE
    WHEN r.campo_espacos_tempos IS NOT NULL AND r.campo_espacos_tempos != '' THEN 1 ELSE 0
  END AS campos_preenchidos,
  5 AS total_campos
FROM relatorios_descritivos r
JOIN matriculas m ON r.matricula_id = m.id
JOIN alunos a ON m.aluno_id = a.id
JOIN turmas t ON r.turma_id = t.id
JOIN escolas e ON t.escola_id = e.id
JOIN users u ON r.professor_id = u.id;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE relatorios_descritivos IS
  'Relatorios descritivos semestrais para Educacao Infantil, baseados nos 5 Campos de Experiencia da BNCC';

COMMENT ON COLUMN relatorios_descritivos.campo_eu_outro_nos IS
  'Campo de Experiencia 1: O eu, o outro e o nos - Desenvolvimento da identidade pessoal e social';

COMMENT ON COLUMN relatorios_descritivos.campo_corpo_gestos IS
  'Campo de Experiencia 2: Corpo, gestos e movimentos - Exploracao do corpo e expressao corporal';

COMMENT ON COLUMN relatorios_descritivos.campo_tracos_sons IS
  'Campo de Experiencia 3: Tracos, sons, cores e formas - Exploracao artistica';

COMMENT ON COLUMN relatorios_descritivos.campo_escuta_fala IS
  'Campo de Experiencia 4: Escuta, fala, pensamento e imaginacao - Desenvolvimento da linguagem';

COMMENT ON COLUMN relatorios_descritivos.campo_espacos_tempos IS
  'Campo de Experiencia 5: Espacos, tempos, quantidades, relacoes e transformacoes - Nocoes espaciais e temporais';

COMMENT ON COLUMN relatorios_descritivos.draft_data IS
  'JSON data for auto-save functionality, stores work-in-progress content';

COMMENT ON COLUMN relatorios_descritivos.status IS
  'Report status: rascunho (draft) or finalizado (finalized)';
