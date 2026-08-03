-- =============================================================================
-- Historical day-level frequency index
--
-- This migration records the older day-level invariant. The canonical
-- attendance flow is session-scoped and supersedes this index in
-- 20260803095753_educa_attendance_canonical_flow.sql.
--
-- Keep this migration in order for existing migration histories. The later
-- migration drops this index only after checking and preserving all rows.
-- =============================================================================

CREATE UNIQUE INDEX IF NOT EXISTS idx_frequencia_matricula_data
  ON frequencia (matricula_id, data_aula);
