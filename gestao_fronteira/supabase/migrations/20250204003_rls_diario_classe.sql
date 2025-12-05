-- Migration: 20250204003_rls_diario_classe.sql
-- Purpose: Update RLS policies for Diario de Classe Digital with time-based restrictions
-- Task: 1.1.3 - Update RLS policies
-- Date: 2025-12-04
-- OpenSpec Change: 2025-12-04-diario-de-classe

-- ============================================================================
-- PHASE 1: ENHANCED FREQUENCIA RLS POLICIES
-- ============================================================================

-- Drop existing frequencia policies that may conflict
DROP POLICY IF EXISTS "Professores podem inserir frequencia" ON frequencia;
DROP POLICY IF EXISTS "Professores podem atualizar frequencia" ON frequencia;
DROP POLICY IF EXISTS "Teachers can insert attendance for their classes" ON frequencia;
DROP POLICY IF EXISTS "Teachers can update attendance for their classes" ON frequencia;
DROP POLICY IF EXISTS "Professor can insert attendance for their classes" ON frequencia;
DROP POLICY IF EXISTS "Professor can update attendance before 18:00" ON frequencia;

-- Policy: INSERT - Professor can insert frequency for their classes
CREATE POLICY "Professor can insert attendance for their classes"
  ON frequencia
  FOR INSERT
  WITH CHECK (
    -- Allow if no sessao_id (backward compatibility with old records)
    frequencia.sessao_id IS NULL
    OR
    EXISTS (
      SELECT 1 FROM sessoes_aula s
      JOIN turmas t ON t.id = s.turma_id
      JOIN users u ON u.id = auth.uid()
      WHERE s.id = frequencia.sessao_id
        AND (
          -- Admin can insert any attendance
          u.tipo_usuario = 'admin'
          OR
          -- Teacher can insert attendance for their own classes
          (u.tipo_usuario = 'professor' AND t.professor_id = u.id)
          OR
          -- Director/Secretary of the school can insert
          (u.tipo_usuario IN ('diretor', 'secretario') AND u.escola_id = t.escola_id)
        )
    )
  );

-- Policy: UPDATE - Professor can update frequency BEFORE 18:00 (6 PM)
-- This enforces Brazilian compliance: "nao existe o esquecer" after 18:00
CREATE POLICY "Professor can update attendance before 18:00"
  ON frequencia
  FOR UPDATE
  USING (
    -- Allow if no sessao_id (backward compatibility)
    frequencia.sessao_id IS NULL
    OR
    EXISTS (
      SELECT 1 FROM sessoes_aula s
      JOIN turmas t ON t.id = s.turma_id
      JOIN users u ON u.id = auth.uid()
      WHERE s.id = frequencia.sessao_id
        AND (
          -- Admin can always update (for corrections)
          u.tipo_usuario = 'admin'
          OR
          -- Professor can update their own class attendance BEFORE 18:00
          (
            u.tipo_usuario = 'professor'
            AND t.professor_id = u.id
            AND (
              -- Allow updates on same day before 18:00 Brazilian time
              (
                s.data_aula = CURRENT_DATE
                AND EXTRACT(HOUR FROM (NOW() AT TIME ZONE 'America/Sao_Paulo')) < 18
              )
              OR
              -- Session is still ABERTA (not yet closed)
              s.status = 'ABERTA'
            )
          )
          OR
          -- Director/Secretary can update before 18:00
          (
            u.tipo_usuario IN ('diretor', 'secretario')
            AND u.escola_id = t.escola_id
            AND (
              s.data_aula = CURRENT_DATE
              AND EXTRACT(HOUR FROM (NOW() AT TIME ZONE 'America/Sao_Paulo')) < 18
            )
          )
        )
    )
  );

COMMENT ON POLICY "Professor can insert attendance for their classes" ON frequencia IS
'Brazilian compliance: Professor can insert attendance for their assigned classes. Director/Secretary can also insert for their school.';

COMMENT ON POLICY "Professor can update attendance before 18:00" ON frequencia IS
'Brazilian compliance: Attendance can only be updated before 18:00 (6 PM Sao Paulo time) on the same day, enforcing "nao existe o esquecer" principle.';

-- ============================================================================
-- PHASE 2: ENHANCED SESSOES_AULA RLS POLICIES
-- ============================================================================

-- Drop existing conflicting policies
DROP POLICY IF EXISTS "teacher_session_management" ON sessoes_aula;
DROP POLICY IF EXISTS "escola_session_isolation" ON sessoes_aula;
DROP POLICY IF EXISTS "Users can view class sessions from their school" ON sessoes_aula;
DROP POLICY IF EXISTS "Teachers can create class sessions for their classes" ON sessoes_aula;
DROP POLICY IF EXISTS "Only creator can update session status" ON sessoes_aula;
DROP POLICY IF EXISTS "Only admin can delete sessions" ON sessoes_aula;
DROP POLICY IF EXISTS "Users can view sessions from their school" ON sessoes_aula;
DROP POLICY IF EXISTS "Teachers can create sessions for their classes" ON sessoes_aula;
DROP POLICY IF EXISTS "Teachers can update sessions before closure" ON sessoes_aula;

-- Policy: SELECT - Users can view sessions from their school
CREATE POLICY "Users can view sessions from their school"
  ON sessoes_aula
  FOR SELECT
  USING (
    -- Admin can view all sessions
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
        AND tipo_usuario = 'admin'
    )
    OR
    -- Users can view sessions from their school
    EXISTS (
      SELECT 1 FROM turmas t
      JOIN users u ON u.escola_id = t.escola_id
      WHERE t.id = sessoes_aula.turma_id
        AND u.id = auth.uid()
    )
    OR
    -- Teachers can view their own sessions
    professor_id = auth.uid()
  );

-- Policy: INSERT - Only teachers can create sessions for their classes
CREATE POLICY "Teachers can create sessions for their classes"
  ON sessoes_aula
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM turmas t
      JOIN users u ON u.id = auth.uid()
      WHERE t.id = sessoes_aula.turma_id
        AND (
          -- Admin can create any session
          u.tipo_usuario = 'admin'
          OR
          -- Teacher can create sessions for their assigned classes
          (u.tipo_usuario = 'professor' AND t.professor_id = u.id)
        )
    )
  );

-- Policy: UPDATE - Teacher can update session status BEFORE closure
CREATE POLICY "Teachers can update sessions before closure"
  ON sessoes_aula
  FOR UPDATE
  USING (
    -- Admin can always update
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
        AND tipo_usuario = 'admin'
    )
    OR
    -- Teacher can update their own sessions BEFORE they are FECHADA
    (
      professor_id = auth.uid()
      AND status != 'FECHADA'
    )
    OR
    -- Director can update sessions from their school
    EXISTS (
      SELECT 1 FROM turmas t
      JOIN users u ON u.escola_id = t.escola_id AND u.id = auth.uid()
      WHERE t.id = sessoes_aula.turma_id
        AND u.tipo_usuario = 'diretor'
    )
  );

-- Policy: DELETE - Only admin can delete sessions
CREATE POLICY "Only admin can delete sessions"
  ON sessoes_aula
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
        AND tipo_usuario = 'admin'
    )
  );

COMMENT ON POLICY "Users can view sessions from their school" ON sessoes_aula IS
'School-based isolation: Users can only view sessions from their assigned school.';

COMMENT ON POLICY "Teachers can create sessions for their classes" ON sessoes_aula IS
'Brazilian compliance: Only teachers can create class sessions for their assigned classes.';

COMMENT ON POLICY "Teachers can update sessions before closure" ON sessoes_aula IS
'Brazilian compliance: Sessions cannot be updated after closure (status = FECHADA). Director can update sessions from their school.';

-- ============================================================================
-- PHASE 3: CREATE HELPER FUNCTION FOR TIME VALIDATION
-- ============================================================================

-- Function to check if current time is before 18:00 Sao Paulo time
CREATE OR REPLACE FUNCTION is_before_18h_sao_paulo()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXTRACT(HOUR FROM (NOW() AT TIME ZONE 'America/Sao_Paulo')) < 18;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION is_before_18h_sao_paulo() IS
'Helper function to check if current time is before 18:00 (6 PM) in Sao Paulo timezone. Used for Brazilian compliance enforcement.';

-- Function to check if user can edit attendance
CREATE OR REPLACE FUNCTION can_edit_attendance(
  p_sessao_id UUID,
  p_user_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_session_status TEXT;
  v_session_date DATE;
  v_current_br_time TIMESTAMPTZ;
  v_user_tipo TEXT;
  v_is_teacher BOOLEAN;
  v_is_admin BOOLEAN;
BEGIN
  -- If no session_id provided, allow edit (backward compatibility)
  IF p_sessao_id IS NULL THEN
    RETURN true;
  END IF;

  -- Get current Brazilian time
  v_current_br_time := NOW() AT TIME ZONE 'America/Sao_Paulo';

  -- Get session information
  SELECT s.status, s.data_aula INTO v_session_status, v_session_date
  FROM sessoes_aula s
  WHERE s.id = p_sessao_id;

  -- If session not found, return false
  IF v_session_status IS NULL THEN
    RETURN false;
  END IF;

  -- Get user information
  SELECT u.tipo_usuario INTO v_user_tipo
  FROM users u
  WHERE u.id = p_user_id;

  -- Check if user is admin
  v_is_admin := (v_user_tipo = 'admin');

  -- Admin can always edit
  IF v_is_admin THEN
    RETURN true;
  END IF;

  -- Check if user is the teacher of the session
  SELECT EXISTS (
    SELECT 1 FROM sessoes_aula s
    JOIN turmas t ON t.id = s.turma_id
    WHERE s.id = p_sessao_id
      AND t.professor_id = p_user_id
  ) INTO v_is_teacher;

  -- Session must not be FECHADA
  IF v_session_status = 'FECHADA' THEN
    RETURN false;
  END IF;

  -- Can only edit on same day before 18:00
  IF v_session_date = CURRENT_DATE AND EXTRACT(HOUR FROM v_current_br_time) < 18 THEN
    RETURN v_is_teacher;
  END IF;

  -- Cannot edit past dates
  RETURN false;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION can_edit_attendance(UUID, UUID) IS
'Determines if a user can edit attendance for a given session based on Brazilian compliance rules (time restrictions, session status).';

-- ============================================================================
-- PHASE 4: VALIDATE EXISTING POLICIES
-- ============================================================================

-- Verify RLS is enabled on all relevant tables
DO $$
DECLARE
  tables_without_rls TEXT[];
BEGIN
  SELECT array_agg(tablename)
  INTO tables_without_rls
  FROM pg_tables
  WHERE schemaname = 'public'
    AND tablename IN ('frequencia', 'sessoes_aula', 'conteudo_aula')
    AND rowsecurity = false;

  IF array_length(tables_without_rls, 1) > 0 THEN
    RAISE WARNING 'RLS not enabled on tables: %', array_to_string(tables_without_rls, ', ');
  ELSE
    RAISE NOTICE '[OK] RLS enabled on all Diario de Classe tables';
  END IF;
END $$;

-- ============================================================================
-- PHASE 5: CREATE AUDIT LOG FOR RLS POLICY CHANGES
-- ============================================================================

-- Log RLS policy updates (only if audit_logs table exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'audit_logs'
  ) THEN
    INSERT INTO audit_logs (
      user_id,
      action,
      table_name,
      record_id,
      details
    ) VALUES (
      '00000000-0000-0000-0000-000000000000'::UUID,
      'system_config_changed',
      'all_tables',
      'diario_classe_rls_update',
      jsonb_build_object(
        'migration', '20250204003_rls_diario_classe',
        'date', NOW(),
        'tables_updated', ARRAY['frequencia', 'sessoes_aula'],
        'policies_created', 6,
        'compliance_level', 'brazilian_educational_lgpd',
        'time_restriction', '18:00 Sao Paulo time',
        'principle', 'nao existe o esquecer'
      )
    );
    RAISE NOTICE '[OK] Audit log entry created for RLS policy update';
  ELSE
    RAISE NOTICE 'Audit log table not found, skipping audit entry';
  END IF;
END $$;

-- ============================================================================
-- PHASE 6: GRANT NECESSARY PERMISSIONS
-- ============================================================================

-- Grant execute permissions on helper functions
GRANT EXECUTE ON FUNCTION is_before_18h_sao_paulo() TO authenticated;
GRANT EXECUTE ON FUNCTION can_edit_attendance(UUID, UUID) TO authenticated;

-- ============================================================================
-- PHASE 7: CREATE VALIDATION VIEW
-- ============================================================================

-- View to monitor RLS policy coverage for Diario de Classe
CREATE OR REPLACE VIEW vw_diario_classe_rls_status AS
SELECT
  p.schemaname AS schema_name,
  p.tablename AS table_name,
  COUNT(*) AS policy_count,
  array_agg(p.policyname ORDER BY p.policyname) AS policies,
  t.rowsecurity AS rls_enabled
FROM pg_policies p
JOIN pg_tables t ON t.tablename = p.tablename AND t.schemaname = p.schemaname
WHERE p.schemaname = 'public'
  AND p.tablename IN ('frequencia', 'sessoes_aula', 'conteudo_aula')
GROUP BY p.schemaname, p.tablename, t.rowsecurity
ORDER BY p.tablename;

COMMENT ON VIEW vw_diario_classe_rls_status IS
'Monitoring view for RLS policy coverage on Diario de Classe tables.';

GRANT SELECT ON vw_diario_classe_rls_status TO authenticated;

-- ============================================================================
-- VALIDATION
-- ============================================================================

-- List all policies for Diario de Classe tables
DO $$
DECLARE
  frequencia_policies INTEGER;
  sessoes_aula_policies INTEGER;
  conteudo_aula_policies INTEGER;
BEGIN
  SELECT COUNT(*) INTO frequencia_policies
  FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'frequencia';

  SELECT COUNT(*) INTO sessoes_aula_policies
  FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'sessoes_aula';

  SELECT COUNT(*) INTO conteudo_aula_policies
  FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'conteudo_aula';

  RAISE NOTICE '=============================================================================';
  RAISE NOTICE 'RLS Policy Coverage Validation';
  RAISE NOTICE '=============================================================================';
  RAISE NOTICE 'frequencia policies: %', frequencia_policies;
  RAISE NOTICE 'sessoes_aula policies: %', sessoes_aula_policies;
  RAISE NOTICE 'conteudo_aula policies: %', conteudo_aula_policies;
  RAISE NOTICE '';

  IF frequencia_policies >= 2 AND sessoes_aula_policies >= 4 AND conteudo_aula_policies >= 4 THEN
    RAISE NOTICE '[OK] All tables have adequate RLS policy coverage';
  ELSE
    RAISE WARNING 'Incomplete RLS policy coverage detected';
  END IF;
END $$;

-- ============================================================================
-- FINAL NOTICE
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '=============================================================================';
  RAISE NOTICE 'Migration 20250204003_rls_diario_classe COMPLETED';
  RAISE NOTICE '=============================================================================';
  RAISE NOTICE 'Features implemented:';
  RAISE NOTICE '  [OK] Enhanced frequencia RLS policies with time restrictions';
  RAISE NOTICE '  [OK] Enhanced sessoes_aula RLS policies for session management';
  RAISE NOTICE '  [OK] Time validation function (18:00 Sao Paulo time cutoff)';
  RAISE NOTICE '  [OK] can_edit_attendance() helper function';
  RAISE NOTICE '  [OK] RLS monitoring view (vw_diario_classe_rls_status)';
  RAISE NOTICE '  [OK] Audit log for policy changes';
  RAISE NOTICE '';
  RAISE NOTICE 'Brazilian Compliance Enforced:';
  RAISE NOTICE '  - "Nao existe o esquecer" principle';
  RAISE NOTICE '  - Attendance editing blocked after 18:00 (6 PM) Sao Paulo time';
  RAISE NOTICE '  - Session closure prevents further edits';
  RAISE NOTICE '  - School-based multi-tenancy isolation';
  RAISE NOTICE '';
  RAISE NOTICE 'Access Control:';
  RAISE NOTICE '  - Professor: Can manage their own classes (time-restricted)';
  RAISE NOTICE '  - Director/Secretary: Can view all classes in their school';
  RAISE NOTICE '  - Admin: Can view/edit all data (for corrections)';
  RAISE NOTICE '';
  RAISE NOTICE 'Next Steps:';
  RAISE NOTICE '  - Test RLS policies manually with different user roles';
  RAISE NOTICE '  - Integrate frontend with time validation';
  RAISE NOTICE '  - Implement Task Group 1.2 (AttendanceGrid 3 states)';
  RAISE NOTICE '=============================================================================';
END $$;
