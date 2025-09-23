-- Enhanced "Abrir aula" Workflow - Database Foundation
-- Migration: 20250920120000_enhanced_abrir_aula_workflow.sql
-- Purpose: Implement three-phase session management with automatic locking and immutability

-- Create aula_sessions table for session management
CREATE TABLE IF NOT EXISTS aula_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  turma_id uuid NOT NULL REFERENCES turmas(id) ON DELETE CASCADE,
  professor_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  data_aula date NOT NULL,
  fase varchar(20) NOT NULL DEFAULT 'planejamento'
    CHECK (fase IN ('planejamento', 'chamada', 'finalizada', 'bloqueada')),
  bloqueado boolean NOT NULL DEFAULT false,
  bloqueado_em timestamp with time zone,
  hash_integridade text,
  observacoes text,
  total_alunos integer DEFAULT 0,
  total_presentes integer DEFAULT 0,
  total_ausentes integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,

  -- Business constraints
  CONSTRAINT unique_session_per_day UNIQUE (turma_id, data_aula),
  CONSTRAINT valid_attendance_counts CHECK (
    total_alunos >= 0 AND
    total_presentes >= 0 AND
    total_ausentes >= 0 AND
    total_presentes + total_ausentes <= total_alunos
  ),
  CONSTRAINT lock_consistency CHECK (
    (bloqueado = true AND bloqueado_em IS NOT NULL) OR
    (bloqueado = false AND bloqueado_em IS NULL)
  )
);

-- Add session reference to frequencia table
ALTER TABLE frequencia ADD COLUMN IF NOT EXISTS session_id uuid REFERENCES aula_sessions(id);
ALTER TABLE frequencia ADD COLUMN IF NOT EXISTS hash_integridade text;
ALTER TABLE frequencia ADD COLUMN IF NOT EXISTS is_locked boolean DEFAULT false;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_aula_sessions_turma_data ON aula_sessions(turma_id, data_aula);
CREATE INDEX IF NOT EXISTS idx_aula_sessions_professor ON aula_sessions(professor_id);
CREATE INDEX IF NOT EXISTS idx_aula_sessions_fase ON aula_sessions(fase);
CREATE INDEX IF NOT EXISTS idx_aula_sessions_bloqueado ON aula_sessions(bloqueado);
CREATE INDEX IF NOT EXISTS idx_aula_sessions_data_aula ON aula_sessions(data_aula);
CREATE INDEX IF NOT EXISTS idx_frequencia_session_id ON frequencia(session_id);

-- Create composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_aula_sessions_turma_data_fase ON aula_sessions(turma_id, data_aula, fase);
CREATE INDEX IF NOT EXISTS idx_frequencia_session_aluno ON frequencia(session_id, aluno_id);

-- Function to calculate session hash for integrity validation
CREATE OR REPLACE FUNCTION calculate_session_hash(session_uuid uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  session_data record;
  attendance_data text;
  combined_data text;
BEGIN
  -- Get session data
  SELECT turma_id, professor_id, data_aula, fase, total_alunos, total_presentes, total_ausentes
  INTO session_data
  FROM aula_sessions
  WHERE id = session_uuid;

  -- Get attendance data hash
  SELECT string_agg(
    aluno_id::text || presente::text || data::text,
    '' ORDER BY aluno_id
  ) INTO attendance_data
  FROM frequencia
  WHERE session_id = session_uuid;

  -- Combine data for hash
  combined_data := session_data.turma_id::text ||
                   session_data.professor_id::text ||
                   session_data.data_aula::text ||
                   session_data.fase ||
                   COALESCE(session_data.total_alunos, 0)::text ||
                   COALESCE(session_data.total_presentes, 0)::text ||
                   COALESCE(session_data.total_ausentes, 0)::text ||
                   COALESCE(attendance_data, '');

  -- Return MD5 hash
  RETURN md5(combined_data);
END;
$$;

-- Function to auto-lock daily sessions at 18:00
CREATE OR REPLACE FUNCTION auto_lock_daily_sessions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_brazil_time timestamp with time zone;
  lock_cutoff_time time;
BEGIN
  -- Get current Brazil time (UTC-3)
  current_brazil_time := now() AT TIME ZONE 'America/Sao_Paulo';
  lock_cutoff_time := '18:00:00'::time;

  -- Lock sessions that should be automatically locked
  UPDATE aula_sessions
  SET
    bloqueado = true,
    bloqueado_em = current_brazil_time,
    fase = CASE
      WHEN fase = 'planejamento' THEN 'bloqueada'
      WHEN fase = 'chamada' THEN 'bloqueada'
      ELSE 'bloqueada'
    END,
    hash_integridade = calculate_session_hash(id),
    updated_at = current_brazil_time
  WHERE
    bloqueado = false
    AND (
      -- Sessions from previous days
      data_aula < current_brazil_time::date
      OR
      -- Sessions from today after 18:00
      (data_aula = current_brazil_time::date AND current_brazil_time::time >= lock_cutoff_time)
    );

  -- Also lock related attendance records
  UPDATE frequencia
  SET
    is_locked = true,
    hash_integridade = md5(
      aluno_id::text || session_id::text || presente::text || data::text
    )
  WHERE session_id IN (
    SELECT id FROM aula_sessions WHERE bloqueado = true
  ) AND is_locked = false;

END;
$$;

-- Function to update session statistics
CREATE OR REPLACE FUNCTION update_session_stats(session_uuid uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  stats record;
BEGIN
  -- Calculate attendance statistics
  SELECT
    COUNT(*) as total,
    SUM(CASE WHEN presente THEN 1 ELSE 0 END) as presentes,
    SUM(CASE WHEN NOT presente THEN 1 ELSE 0 END) as ausentes
  INTO stats
  FROM frequencia
  WHERE session_id = session_uuid;

  -- Update session with calculated stats
  UPDATE aula_sessions
  SET
    total_alunos = stats.total,
    total_presentes = stats.presentes,
    total_ausentes = stats.ausentes,
    updated_at = now()
  WHERE id = session_uuid;
END;
$$;

-- Function to get session statistics for reporting
CREATE OR REPLACE FUNCTION get_session_statistics(
  escola_id_param uuid,
  date_from date,
  date_to date
)
RETURNS TABLE (
  total_sessions bigint,
  completed_sessions bigint,
  locked_sessions bigint,
  avg_attendance_rate numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*) as total_sessions,
    SUM(CASE WHEN fase IN ('finalizada', 'bloqueada') THEN 1 ELSE 0 END) as completed_sessions,
    SUM(CASE WHEN bloqueado THEN 1 ELSE 0 END) as locked_sessions,
    COALESCE(
      AVG(
        CASE
          WHEN total_alunos > 0 THEN (total_presentes::numeric / total_alunos::numeric) * 100
          ELSE NULL
        END
      ), 0
    ) as avg_attendance_rate
  FROM aula_sessions s
  JOIN turmas t ON s.turma_id = t.id
  WHERE t.escola_id = escola_id_param
    AND s.data_aula BETWEEN date_from AND date_to;
END;
$$;

-- Trigger function to prevent modification of locked sessions
CREATE OR REPLACE FUNCTION prevent_locked_session_modification()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Check if session is locked
  IF OLD.bloqueado = true THEN
    RAISE EXCEPTION 'Cannot modify locked session. Session ID: %', OLD.id;
  END IF;

  -- Check if trying to unlock a session (only admins should do this through special procedures)
  IF NEW.bloqueado = false AND OLD.bloqueado = true THEN
    RAISE EXCEPTION 'Cannot unlock session without proper authorization. Session ID: %', OLD.id;
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger function to prevent modification of locked attendance
CREATE OR REPLACE FUNCTION prevent_locked_attendance_modification()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  session_locked boolean;
BEGIN
  -- Check if the associated session is locked
  SELECT bloqueado INTO session_locked
  FROM aula_sessions
  WHERE id = COALESCE(NEW.session_id, OLD.session_id);

  IF session_locked = true THEN
    RAISE EXCEPTION 'Cannot modify attendance for locked session. Session ID: %',
      COALESCE(NEW.session_id, OLD.session_id);
  END IF;

  -- Also check if frequency record itself is locked
  IF TG_OP = 'UPDATE' AND OLD.is_locked = true THEN
    RAISE EXCEPTION 'Cannot modify locked attendance record. Record ID: %', OLD.id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Trigger function to automatically update session hash on changes
CREATE OR REPLACE FUNCTION update_session_hash()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Update hash when session enters finalizada or bloqueada phase
  IF NEW.fase IN ('finalizada', 'bloqueada') AND
     (OLD.fase IS NULL OR OLD.fase NOT IN ('finalizada', 'bloqueada')) THEN
    NEW.hash_integridade := calculate_session_hash(NEW.id);
  END IF;

  -- Always update the updated_at timestamp
  NEW.updated_at := now();

  RETURN NEW;
END;
$$;

-- Trigger function to update attendance hash
CREATE OR REPLACE FUNCTION update_attendance_hash()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Calculate hash for attendance record
  NEW.hash_integridade := md5(
    NEW.aluno_id::text ||
    COALESCE(NEW.session_id::text, '') ||
    NEW.presente::text ||
    NEW.data::text
  );

  -- Update session statistics if session_id exists
  IF NEW.session_id IS NOT NULL THEN
    PERFORM update_session_stats(NEW.session_id);
  END IF;

  RETURN NEW;
END;
$$;

-- Create triggers
DROP TRIGGER IF EXISTS trigger_prevent_locked_session_modification ON aula_sessions;
CREATE TRIGGER trigger_prevent_locked_session_modification
  BEFORE UPDATE ON aula_sessions
  FOR EACH ROW
  EXECUTE FUNCTION prevent_locked_session_modification();

DROP TRIGGER IF EXISTS trigger_update_session_hash ON aula_sessions;
CREATE TRIGGER trigger_update_session_hash
  BEFORE INSERT OR UPDATE ON aula_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_session_hash();

DROP TRIGGER IF EXISTS trigger_prevent_locked_attendance_modification ON frequencia;
CREATE TRIGGER trigger_prevent_locked_attendance_modification
  BEFORE UPDATE OR DELETE ON frequencia
  FOR EACH ROW
  EXECUTE FUNCTION prevent_locked_attendance_modification();

DROP TRIGGER IF EXISTS trigger_update_attendance_hash ON frequencia;
CREATE TRIGGER trigger_update_attendance_hash
  BEFORE INSERT OR UPDATE ON frequencia
  FOR EACH ROW
  EXECUTE FUNCTION update_attendance_hash();

-- Enable RLS on aula_sessions table
ALTER TABLE aula_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for aula_sessions
-- Policy for professors: can view/edit sessions for their classes
CREATE POLICY "professors_own_sessions" ON aula_sessions
  FOR ALL
  TO authenticated
  USING (
    professor_id = auth.uid() OR
    turma_id IN (
      SELECT t.id FROM turmas t
      WHERE t.professor_id = auth.uid()
    )
  )
  WITH CHECK (
    professor_id = auth.uid() OR
    turma_id IN (
      SELECT t.id FROM turmas t
      WHERE t.professor_id = auth.uid()
    )
  );

-- Policy for directors and admins: can view all sessions in their school
CREATE POLICY "admin_school_sessions" ON aula_sessions
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      JOIN turmas t ON t.id = aula_sessions.turma_id
      WHERE u.id = auth.uid()
        AND u.escola_id = t.escola_id
        AND u.tipo_usuario IN ('admin', 'diretor', 'secretario')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u
      JOIN turmas t ON t.id = aula_sessions.turma_id
      WHERE u.id = auth.uid()
        AND u.escola_id = t.escola_id
        AND u.tipo_usuario IN ('admin', 'diretor', 'secretario')
    )
  );

-- Enhanced RLS policy for frequencia with session context
CREATE POLICY "frequencia_session_based" ON frequencia
  FOR ALL
  TO authenticated
  USING (
    -- Allow if user has access to the session
    session_id IN (
      SELECT id FROM aula_sessions
      WHERE professor_id = auth.uid()
         OR turma_id IN (
           SELECT t.id FROM turmas t
           WHERE t.professor_id = auth.uid()
         )
    )
    OR
    -- Fallback to existing school-based access
    EXISTS (
      SELECT 1 FROM users u
      JOIN alunos a ON a.escola_id = u.escola_id
      WHERE u.id = auth.uid()
        AND a.id = frequencia.aluno_id
    )
  )
  WITH CHECK (
    -- Same logic for INSERT/UPDATE
    session_id IN (
      SELECT id FROM aula_sessions
      WHERE professor_id = auth.uid()
         OR turma_id IN (
           SELECT t.id FROM turmas t
           WHERE t.professor_id = auth.uid()
         )
    )
    OR
    EXISTS (
      SELECT 1 FROM users u
      JOIN alunos a ON a.escola_id = u.escola_id
      WHERE u.id = auth.uid()
        AND a.id = frequencia.aluno_id
    )
  );

-- Create scheduled job for auto-locking (requires pg_cron extension)
-- This will run every hour to check for sessions that should be locked
SELECT cron.schedule(
  'auto-lock-sessions',
  '0 * * * *', -- Run every hour
  'SELECT auto_lock_daily_sessions();'
);

-- Add helpful comments
COMMENT ON TABLE aula_sessions IS 'Session management for Enhanced Abrir aula Workflow with automatic locking';
COMMENT ON COLUMN aula_sessions.fase IS 'Session phase: planejamento, chamada, finalizada, bloqueada';
COMMENT ON COLUMN aula_sessions.hash_integridade IS 'MD5 hash for session data integrity validation';
COMMENT ON COLUMN aula_sessions.bloqueado IS 'Whether session is locked and immutable';
COMMENT ON FUNCTION auto_lock_daily_sessions() IS 'Automatically locks sessions at 18:00 Brazilian time';
COMMENT ON FUNCTION calculate_session_hash(uuid) IS 'Calculates integrity hash for session data';

-- Insert initial data for testing (optional)
-- This can be removed in production
INSERT INTO aula_sessions (turma_id, professor_id, data_aula, observacoes)
SELECT
  t.id,
  t.professor_id,
  CURRENT_DATE,
  'Initial session for Enhanced Abrir aula Workflow testing'
FROM turmas t
WHERE t.professor_id IS NOT NULL
LIMIT 1
ON CONFLICT (turma_id, data_aula) DO NOTHING;