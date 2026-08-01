-- =============================================================================
-- frequencia: unique attendance row per student per class-day
--
-- The attendance server action (mark-attendance.ts) upserts with
-- onConflict 'matricula_id,data_aula' to support its documented toggle
-- behavior (mark once, toggle later). Without this constraint the upsert
-- always fails with "no unique or exclusion constraint matching the ON
-- CONFLICT specification", so no attendance could ever be recorded through
-- the action.
--
-- Domain invariant: one attendance row per student per class-day. The
-- open-session flow already prevents a second open session for the same
-- turma/date, so (matricula_id, data_aula) uniquely identifies the row.
--
-- Attendance is compliance-sensitive: keep this invariant intact together
-- with time-lock and immutability behavior when changing attendance schema.
-- =============================================================================

CREATE UNIQUE INDEX IF NOT EXISTS idx_frequencia_matricula_data
  ON frequencia (matricula_id, data_aula);
