-- Migration: 20250204002_conteudo_aula_bncc.sql
-- Purpose: Create conteudo_aula table for BNCC-aligned lesson planning
-- Task: 1.1.2 - Create conteudo_aula table (BNCC)
-- Date: 2025-12-04
-- OpenSpec Change: 2025-12-04-diario-de-classe

-- ============================================================================
-- PHASE 1: CREATE CONTEUDO_AULA TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS conteudo_aula (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Foreign key to session (aulas_abertas/sessoes_aula)
  sessao_id UUID NOT NULL REFERENCES sessoes_aula(id) ON DELETE CASCADE,

  -- Lesson planning fields (BNCC-aligned)
  tema TEXT NOT NULL,
  objetivo TEXT NOT NULL,
  habilidades_bncc TEXT[] DEFAULT '{}',
  metodologia TEXT,
  recursos TEXT,
  observacoes TEXT,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id),

  -- Business constraints
  CONSTRAINT unique_conteudo_per_sessao UNIQUE(sessao_id)
);

-- ============================================================================
-- PHASE 2: ADD INDEXES FOR PERFORMANCE
-- ============================================================================

-- Index for queries by session
CREATE INDEX IF NOT EXISTS idx_conteudo_aula_sessao
  ON conteudo_aula(sessao_id);

-- Index for queries by turma and date (via sessao)
CREATE INDEX IF NOT EXISTS idx_conteudo_aula_turma_data
  ON conteudo_aula(sessao_id)
  INCLUDE (tema, objetivo);

-- GIN index for BNCC skills array searches
CREATE INDEX IF NOT EXISTS idx_conteudo_aula_habilidades_bncc
  ON conteudo_aula USING GIN(habilidades_bncc);

-- Index for created_by for audit purposes
CREATE INDEX IF NOT EXISTS idx_conteudo_aula_created_by
  ON conteudo_aula(created_by);

-- Index for temporal queries
CREATE INDEX IF NOT EXISTS idx_conteudo_aula_created_at
  ON conteudo_aula(created_at DESC);

-- ============================================================================
-- PHASE 3: CREATE TRIGGER FOR UPDATED_AT
-- ============================================================================

-- Trigger to automatically update updated_at timestamp
CREATE TRIGGER update_conteudo_aula_updated_at
  BEFORE UPDATE ON conteudo_aula
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TRIGGER update_conteudo_aula_updated_at ON conteudo_aula IS
'Automatically updates updated_at timestamp on record modifications.';

-- ============================================================================
-- PHASE 4: ENABLE ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE conteudo_aula ENABLE ROW LEVEL SECURITY;

-- Policy: SELECT - Users can view lesson content from their school
DROP POLICY IF EXISTS "Users can view lesson content from their school" ON conteudo_aula;
CREATE POLICY "Users can view lesson content from their school"
  ON conteudo_aula
  FOR SELECT
  USING (
    -- Admin can view all lesson content
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
        AND tipo_usuario = 'admin'
    )
    OR
    -- Users can view lesson content from sessions in their school
    EXISTS (
      SELECT 1 FROM sessoes_aula s
      JOIN turmas t ON t.id = s.turma_id
      JOIN users u ON u.escola_id = t.escola_id
      WHERE s.id = conteudo_aula.sessao_id
        AND u.id = auth.uid()
    )
    OR
    -- Teachers can view their own lesson content
    EXISTS (
      SELECT 1 FROM sessoes_aula s
      WHERE s.id = conteudo_aula.sessao_id
        AND s.professor_id = auth.uid()
    )
  );

-- Policy: INSERT - Only teachers can create lesson content for their sessions
DROP POLICY IF EXISTS "Teachers can create lesson content for their sessions" ON conteudo_aula;
CREATE POLICY "Teachers can create lesson content for their sessions"
  ON conteudo_aula
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM sessoes_aula s
      JOIN users u ON u.id = auth.uid()
      WHERE s.id = conteudo_aula.sessao_id
        AND (
          -- Admin can create any lesson content
          u.tipo_usuario = 'admin'
          OR
          -- Teacher can create content for their own sessions
          (u.tipo_usuario = 'professor' AND s.professor_id = u.id)
        )
    )
  );

-- Policy: UPDATE - Only creator can update lesson content
DROP POLICY IF EXISTS "Only creator can update lesson content" ON conteudo_aula;
CREATE POLICY "Only creator can update lesson content"
  ON conteudo_aula
  FOR UPDATE
  USING (
    -- Admin can update any lesson content
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
        AND tipo_usuario = 'admin'
    )
    OR
    -- Creator can update their own lesson content
    created_by = auth.uid()
    OR
    -- Teacher of the session can update
    EXISTS (
      SELECT 1 FROM sessoes_aula s
      WHERE s.id = conteudo_aula.sessao_id
        AND s.professor_id = auth.uid()
    )
  );

-- Policy: DELETE - Only admin can delete lesson content
DROP POLICY IF EXISTS "Only admin can delete lesson content" ON conteudo_aula;
CREATE POLICY "Only admin can delete lesson content"
  ON conteudo_aula
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
        AND tipo_usuario = 'admin'
    )
  );

-- ============================================================================
-- PHASE 5: ADD TABLE AND COLUMN COMMENTS
-- ============================================================================

COMMENT ON TABLE conteudo_aula IS
'Lesson content planning aligned with Brazilian BNCC (Base Nacional Comum Curricular). Links to sessoes_aula for Diário de Classe Digital.';

COMMENT ON COLUMN conteudo_aula.sessao_id IS
'Foreign key to sessoes_aula. Each session can have one lesson plan.';

COMMENT ON COLUMN conteudo_aula.tema IS
'Lesson theme/topic (required). Example: "Adição e Subtração de Números Naturais"';

COMMENT ON COLUMN conteudo_aula.objetivo IS
'Learning objectives for the lesson (required). Example: "Compreender operações básicas de adição"';

COMMENT ON COLUMN conteudo_aula.habilidades_bncc IS
'Array of BNCC skill codes. Example: ["EF01MA06", "EF01MA08"]. See https://basenacionalcomum.mec.gov.br/';

COMMENT ON COLUMN conteudo_aula.metodologia IS
'Teaching methodology used. Example: "Aula expositiva com atividades práticas"';

COMMENT ON COLUMN conteudo_aula.recursos IS
'Teaching resources used. Example: "Quadro branco, material dourado, livro didático"';

COMMENT ON COLUMN conteudo_aula.observacoes IS
'Additional observations or notes about the lesson.';

COMMENT ON POLICY "Users can view lesson content from their school" ON conteudo_aula IS
'School-based isolation: Users can only view lesson content from sessions in their school.';

COMMENT ON POLICY "Teachers can create lesson content for their sessions" ON conteudo_aula IS
'Brazilian compliance: Only teachers can plan lessons for their own class sessions.';

-- ============================================================================
-- PHASE 6: CREATE HELPER FUNCTION FOR BNCC VALIDATION
-- ============================================================================

-- Function to validate BNCC skill codes format
CREATE OR REPLACE FUNCTION validate_bncc_skills(skills TEXT[])
RETURNS BOOLEAN AS $$
BEGIN
  -- BNCC skill codes follow pattern: EF[0-9]{2}[A-Z]{2}[0-9]{2}
  -- Example: EF01MA06 (Ensino Fundamental, 1º ano, Matemática, skill 06)
  RETURN (
    skills IS NULL OR
    array_length(skills, 1) IS NULL OR
    NOT EXISTS (
      SELECT 1 FROM unnest(skills) AS skill
      WHERE skill !~ '^EF[0-9]{2}[A-Z]{2}[0-9]{2}$'
    )
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION validate_bncc_skills(TEXT[]) IS
'Validates BNCC skill codes format. Pattern: EF[year][subject][skill_number]. Example: EF01MA06';

-- Add CHECK constraint for BNCC skills validation
ALTER TABLE conteudo_aula
  ADD CONSTRAINT check_bncc_skills_format
  CHECK (validate_bncc_skills(habilidades_bncc));

-- ============================================================================
-- PHASE 7: CREATE VIEW FOR EASY QUERYING
-- ============================================================================

-- Create view joining conteudo_aula with session and class information
CREATE OR REPLACE VIEW vw_conteudo_aula_detalhado AS
SELECT
  ca.id,
  ca.sessao_id,
  ca.tema,
  ca.objetivo,
  ca.habilidades_bncc,
  ca.metodologia,
  ca.recursos,
  ca.observacoes,
  ca.created_at,
  ca.updated_at,
  ca.created_by,
  -- Session information
  s.data_aula,
  s.hora_inicio,
  s.hora_fim,
  s.status AS status_sessao,
  -- Class information
  t.id AS turma_id,
  t.nome AS turma_nome,
  t.serie AS turma_serie,
  t.ano_letivo,
  -- School information
  e.id AS escola_id,
  e.nome AS escola_nome,
  -- Teacher information
  u.id AS professor_id,
  u.nome AS professor_nome
FROM conteudo_aula ca
JOIN sessoes_aula s ON s.id = ca.sessao_id
JOIN turmas t ON t.id = s.turma_id
JOIN escolas e ON e.id = t.escola_id
JOIN users u ON u.id = s.professor_id;

COMMENT ON VIEW vw_conteudo_aula_detalhado IS
'Detailed view of lesson content with session, class, school, and teacher information for easy reporting.';

-- Grant SELECT on view to authenticated users
GRANT SELECT ON vw_conteudo_aula_detalhado TO authenticated;

-- ============================================================================
-- PHASE 8: VALIDATION
-- ============================================================================

DO $$
DECLARE
  table_count INTEGER;
  index_count INTEGER;
  policy_count INTEGER;
BEGIN
  -- Check table was created
  SELECT COUNT(*) INTO table_count
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name = 'conteudo_aula';

  -- Check indexes were created
  SELECT COUNT(*) INTO index_count
  FROM pg_indexes
  WHERE schemaname = 'public'
    AND tablename = 'conteudo_aula';

  -- Check RLS policies were created
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'conteudo_aula';

  IF table_count = 1 AND index_count >= 5 AND policy_count >= 4 THEN
    RAISE NOTICE 'Data Validation: conteudo_aula table created successfully';
    RAISE NOTICE '  - Table exists: %', table_count = 1;
    RAISE NOTICE '  - Indexes created: %', index_count;
    RAISE NOTICE '  - RLS policies created: %', policy_count;
  ELSE
    RAISE WARNING 'Data Validation: Incomplete migration';
    RAISE WARNING '  - Table exists: % (expected: 1)', table_count;
    RAISE WARNING '  - Indexes created: % (expected: >= 5)', index_count;
    RAISE WARNING '  - RLS policies created: % (expected: >= 4)', policy_count;
  END IF;
END $$;

-- ============================================================================
-- FINAL NOTICE
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '=============================================================================';
  RAISE NOTICE 'Migration 20250204002_conteudo_aula_bncc COMPLETED';
  RAISE NOTICE '=============================================================================';
  RAISE NOTICE 'Features implemented:';
  RAISE NOTICE '  ✓ conteudo_aula table with BNCC alignment';
  RAISE NOTICE '  ✓ Foreign key to sessoes_aula (one lesson plan per session)';
  RAISE NOTICE '  ✓ BNCC skills array with validation (EF format)';
  RAISE NOTICE '  ✓ Performance indexes (sessao, turma, BNCC skills)';
  RAISE NOTICE '  ✓ RLS policies for school-based isolation';
  RAISE NOTICE '  ✓ Detailed view (vw_conteudo_aula_detalhado)';
  RAISE NOTICE '  ✓ BNCC skill code validation function';
  RAISE NOTICE '';
  RAISE NOTICE 'BNCC Skill Code Format: EF[year][subject][number]';
  RAISE NOTICE '  Example: EF01MA06 (1st year, Mathematics, skill 06)';
  RAISE NOTICE '';
  RAISE NOTICE 'Next Steps:';
  RAISE NOTICE '  - Update RLS policies for time-based editing restrictions (Task 1.1.3)';
  RAISE NOTICE '  - Integrate with frontend lesson planning UI';
  RAISE NOTICE '  - Populate BNCC skills reference table (optional)';
  RAISE NOTICE '=============================================================================';
END $$;
