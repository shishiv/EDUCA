-- ============================================================================
-- Migration: Diary Performance Indexes
-- Task 5.2.3: Database query optimization for Diario de Classe
-- Date: 2025-12-05
-- ============================================================================
--
-- This migration adds performance indexes for the Diario de Classe feature
-- to optimize common query patterns identified in the performance audit.
--
-- Query Patterns Optimized:
-- 1. Loading lessons by turma with attendance stats
-- 2. Session lookup by turma and date
-- 3. Attendance records by session
-- 4. Risk calculation (students at risk)
-- 5. Content lookup by session
-- ============================================================================

-- ============================================================================
-- 1. Index for sessoes_aula - Turma + Date lookups
-- ============================================================================
-- Used by: /diario, /diario/frequencia
-- Query pattern: SELECT * FROM sessoes_aula WHERE turma_id = $1 ORDER BY data_aula DESC

CREATE INDEX IF NOT EXISTS idx_sessoes_aula_turma_data_desc
  ON sessoes_aula(turma_id, data_aula DESC);

-- Index for session lookup by turma + specific date
-- Used by: Session creation/lookup in frequencia page
CREATE INDEX IF NOT EXISTS idx_sessoes_aula_turma_data_exact
  ON sessoes_aula(turma_id, data_aula);

-- ============================================================================
-- 2. Index for frequencia - Session-based lookups
-- ============================================================================
-- Used by: Attendance stats aggregation, attendance grid
-- Query pattern: SELECT * FROM frequencia WHERE sessao_id = $1

CREATE INDEX IF NOT EXISTS idx_frequencia_sessao_id
  ON frequencia(sessao_id);

-- Composite index for session + status (for fast aggregation)
-- Used by: Calculating attendance stats (P/F/A counts)
CREATE INDEX IF NOT EXISTS idx_frequencia_sessao_status
  ON frequencia(sessao_id, status_presenca);

-- Index for bulk lookups (multiple sessions)
-- Used by: Loading attendance for lesson list
CREATE INDEX IF NOT EXISTS idx_frequencia_sessao_in
  ON frequencia(sessao_id)
  INCLUDE (presente, status_presenca);

-- ============================================================================
-- 3. Index for frequencia - Matricula-based lookups (Risk calculation)
-- ============================================================================
-- Used by: Risk calculation, student attendance history
-- Query pattern: SELECT * FROM frequencia WHERE matricula_id IN ($1, $2, ...)

CREATE INDEX IF NOT EXISTS idx_frequencia_matricula_id
  ON frequencia(matricula_id);

-- Composite index for risk calculation (status aggregation by student)
CREATE INDEX IF NOT EXISTS idx_frequencia_matricula_status
  ON frequencia(matricula_id, status_presenca);

-- ============================================================================
-- 4. Index for conteudo_aula - Session lookups
-- ============================================================================
-- Used by: Loading lesson content
-- Query pattern: SELECT * FROM conteudo_aula WHERE sessao_id = $1
-- Note: Will only apply if conteudo_aula table exists

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'conteudo_aula') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_conteudo_aula_sessao ON conteudo_aula(sessao_id)';
  END IF;
END $$;

-- ============================================================================
-- 5. Index for matriculas - Turma lookups for risk calculation
-- ============================================================================
-- Used by: Risk calculation (loading all students in turma)
-- Query pattern: SELECT * FROM matriculas WHERE turma_id = $1 AND situacao = 'ativa'

CREATE INDEX IF NOT EXISTS idx_matriculas_turma_situacao
  ON matriculas(turma_id, situacao);

-- ============================================================================
-- 6. Index for turmas - Common filters
-- ============================================================================
-- Used by: Turma dropdowns filtered by escola or professor
-- Query patterns:
--   SELECT * FROM turmas WHERE escola_id = $1 AND ativo = true
--   SELECT * FROM turmas WHERE professor_id = $1 AND ativo = true

CREATE INDEX IF NOT EXISTS idx_turmas_escola_ativo
  ON turmas(escola_id, ativo);

CREATE INDEX IF NOT EXISTS idx_turmas_professor_ativo
  ON turmas(professor_id, ativo);

-- ============================================================================
-- 7. Partial index for active sessions (optimization)
-- ============================================================================
-- Used by: Filtering open/active sessions
-- Only indexes sessions that are not cancelled

CREATE INDEX IF NOT EXISTS idx_sessoes_aula_active
  ON sessoes_aula(turma_id, data_aula DESC)
  WHERE status != 'CANCELADA';

-- ============================================================================
-- Index Statistics Update
-- ============================================================================
-- Update statistics for query planner optimization

ANALYZE sessoes_aula;
ANALYZE frequencia;
ANALYZE matriculas;
ANALYZE turmas;

-- Conditional analyze for conteudo_aula
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'conteudo_aula') THEN
    EXECUTE 'ANALYZE conteudo_aula';
  END IF;
END $$;

-- ============================================================================
-- Comments for documentation
-- ============================================================================

COMMENT ON INDEX idx_sessoes_aula_turma_data_desc IS
  'Performance index for lesson list queries ordered by date (Task 5.2.3)';

COMMENT ON INDEX idx_frequencia_sessao_status IS
  'Performance index for attendance stats aggregation (Task 5.2.3)';

COMMENT ON INDEX idx_frequencia_matricula_status IS
  'Performance index for student risk calculation (Task 5.2.3)';

COMMENT ON INDEX idx_matriculas_turma_situacao IS
  'Performance index for turma student lookups (Task 5.2.3)';
