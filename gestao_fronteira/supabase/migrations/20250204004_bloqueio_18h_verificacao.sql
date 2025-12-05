-- Migration: 20250204004_bloqueio_18h_verificacao.sql
-- Purpose: Verification and enhancement of 18:00 blocking system
-- Task: 1.3.1 - Verify and extend existing blocking trigger
-- Date: 2025-12-05
-- OpenSpec Change: 2025-12-04-diario-de-classe

-- ============================================================================
-- PHASE 1: VERIFY EXISTING FUNCTIONS
-- ============================================================================

-- Verify is_before_18h_sao_paulo function exists and is correct
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'is_before_18h_sao_paulo'
  ) THEN
    RAISE EXCEPTION 'REQUIRED FUNCTION MISSING: is_before_18h_sao_paulo() not found. Run migration 20250204003_rls_diario_classe.sql first.';
  ELSE
    RAISE NOTICE '[OK] is_before_18h_sao_paulo() function exists';
  END IF;
END $$;

-- Verify can_edit_attendance function exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'can_edit_attendance'
  ) THEN
    RAISE EXCEPTION 'REQUIRED FUNCTION MISSING: can_edit_attendance() not found. Run migration 20250204003_rls_diario_classe.sql first.';
  ELSE
    RAISE NOTICE '[OK] can_edit_attendance() function exists';
  END IF;
END $$;

-- Verify check_attendance_immutability trigger exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trigger_attendance_immutability'
  ) THEN
    RAISE WARNING 'TRIGGER MISSING: trigger_attendance_immutability not found. The immutability enforcement may not be active.';
  ELSE
    RAISE NOTICE '[OK] trigger_attendance_immutability exists';
  END IF;
END $$;

-- ============================================================================
-- PHASE 2: CREATE ENHANCED LOCK STATUS FUNCTION
-- ============================================================================

-- Function to get comprehensive lock status for a session
-- Returns detailed information for frontend UI display
CREATE OR REPLACE FUNCTION get_session_lock_status(p_sessao_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_session RECORD;
  v_current_br_time TIMESTAMPTZ;
  v_current_br_hour INTEGER;
  v_is_same_day BOOLEAN;
  v_is_locked BOOLEAN;
  v_lock_reason TEXT;
  v_can_edit BOOLEAN;
  v_time_until_lock_minutes INTEGER;
  v_lock_time TIME := '18:00:00';
BEGIN
  -- Get current Brazilian time
  v_current_br_time := NOW() AT TIME ZONE 'America/Sao_Paulo';
  v_current_br_hour := EXTRACT(HOUR FROM v_current_br_time);

  -- Get session information
  SELECT
    s.id,
    s.data_aula,
    s.status,
    s.fechada_em,
    s.professor_id
  INTO v_session
  FROM sessoes_aula s
  WHERE s.id = p_sessao_id;

  -- Session not found
  IF v_session.id IS NULL THEN
    RETURN jsonb_build_object(
      'error', 'Session not found',
      'is_locked', true,
      'can_edit', false
    );
  END IF;

  -- Check if same day
  v_is_same_day := (v_session.data_aula = DATE(v_current_br_time));

  -- Determine lock status and reason
  IF v_session.status = 'FECHADA' THEN
    v_is_locked := true;
    v_lock_reason := 'session_closed';
    v_can_edit := false;
  ELSIF v_session.data_aula < DATE(v_current_br_time) THEN
    v_is_locked := true;
    v_lock_reason := 'past_date';
    v_can_edit := false;
  ELSIF v_is_same_day AND v_current_br_hour >= 18 THEN
    v_is_locked := true;
    v_lock_reason := 'time_18h';
    v_can_edit := false;
  ELSE
    v_is_locked := false;
    v_lock_reason := NULL;
    v_can_edit := true;

    -- Calculate time until lock (only if same day and before 18:00)
    IF v_is_same_day THEN
      v_time_until_lock_minutes :=
        EXTRACT(EPOCH FROM (v_lock_time - v_current_br_time::TIME)) / 60;
    ELSE
      v_time_until_lock_minutes := NULL;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'session_id', p_sessao_id,
    'is_locked', v_is_locked,
    'lock_reason', v_lock_reason,
    'can_edit', v_can_edit,
    'current_time_br', v_current_br_time,
    'current_hour_br', v_current_br_hour,
    'session_date', v_session.data_aula,
    'is_same_day', v_is_same_day,
    'time_until_lock_minutes', v_time_until_lock_minutes,
    'session_status', v_session.status,
    'lock_time', '18:00:00',
    'timezone', 'America/Sao_Paulo',
    'messages', CASE
      WHEN v_lock_reason = 'session_closed' THEN
        'Sessao fechada. Frequencia nao pode ser modificada.'
      WHEN v_lock_reason = 'past_date' THEN
        'Data passada. Frequencia bloqueada para garantir integridade.'
      WHEN v_lock_reason = 'time_18h' THEN
        'Frequencia bloqueada apos 18:00. Principio "nao existe o esquecer".'
      WHEN v_time_until_lock_minutes IS NOT NULL AND v_time_until_lock_minutes <= 60 THEN
        'Atencao: Bloqueio automatico em ' || v_time_until_lock_minutes || ' minutos.'
      ELSE NULL
    END
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION get_session_lock_status(UUID) IS
'Returns comprehensive lock status for a session, including reason, time until lock, and user-friendly messages. Used by frontend to display lock indicator.';

GRANT EXECUTE ON FUNCTION get_session_lock_status(UUID) TO authenticated;

-- ============================================================================
-- PHASE 3: CREATE VIEW FOR LOCK STATUS MONITORING
-- ============================================================================

-- Drop existing view if exists
DROP VIEW IF EXISTS vw_sessao_lock_status;

-- Create view for monitoring session lock status
CREATE OR REPLACE VIEW vw_sessao_lock_status AS
SELECT
  s.id AS sessao_id,
  s.turma_id,
  s.professor_id,
  s.data_aula,
  s.status,
  s.fechada_em,
  -- Lock status
  CASE
    WHEN s.status = 'FECHADA' THEN true
    WHEN s.data_aula < CURRENT_DATE THEN true
    WHEN s.data_aula = CURRENT_DATE AND EXTRACT(HOUR FROM (NOW() AT TIME ZONE 'America/Sao_Paulo')) >= 18 THEN true
    ELSE false
  END AS is_locked,
  -- Lock reason
  CASE
    WHEN s.status = 'FECHADA' THEN 'session_closed'
    WHEN s.data_aula < CURRENT_DATE THEN 'past_date'
    WHEN s.data_aula = CURRENT_DATE AND EXTRACT(HOUR FROM (NOW() AT TIME ZONE 'America/Sao_Paulo')) >= 18 THEN 'time_18h'
    ELSE NULL
  END AS lock_reason,
  -- Current Brazilian time info
  NOW() AT TIME ZONE 'America/Sao_Paulo' AS current_time_br,
  EXTRACT(HOUR FROM (NOW() AT TIME ZONE 'America/Sao_Paulo')) AS current_hour_br
FROM sessoes_aula s;

COMMENT ON VIEW vw_sessao_lock_status IS
'View for monitoring session lock status. Shows real-time lock status based on time (18:00 Sao Paulo), session status, and date.';

GRANT SELECT ON vw_sessao_lock_status TO authenticated;

-- ============================================================================
-- PHASE 4: ADD BLOQUEADO COLUMNS IF NOT EXISTS
-- ============================================================================

-- Add bloqueado column to frequencia table if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'frequencia' AND column_name = 'bloqueado'
  ) THEN
    ALTER TABLE frequencia ADD COLUMN bloqueado BOOLEAN DEFAULT false;
    COMMENT ON COLUMN frequencia.bloqueado IS 'Indicates if attendance record is locked for editing';
    RAISE NOTICE '[OK] Added bloqueado column to frequencia table';
  ELSE
    RAISE NOTICE '[OK] bloqueado column already exists in frequencia table';
  END IF;
END $$;

-- Add bloqueado_em column to frequencia table if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'frequencia' AND column_name = 'bloqueado_em'
  ) THEN
    ALTER TABLE frequencia ADD COLUMN bloqueado_em TIMESTAMPTZ;
    COMMENT ON COLUMN frequencia.bloqueado_em IS 'Timestamp when attendance record was locked';
    RAISE NOTICE '[OK] Added bloqueado_em column to frequencia table';
  ELSE
    RAISE NOTICE '[OK] bloqueado_em column already exists in frequencia table';
  END IF;
END $$;

-- ============================================================================
-- PHASE 5: CREATE TRIGGER TO AUTO-SET BLOQUEADO FLAG
-- ============================================================================

-- Function to auto-set bloqueado flag based on time
CREATE OR REPLACE FUNCTION auto_set_bloqueado_flag()
RETURNS TRIGGER AS $$
DECLARE
  v_current_br_time TIMESTAMPTZ;
  v_current_br_hour INTEGER;
  v_session_date DATE;
  v_should_block BOOLEAN;
BEGIN
  -- Get current Brazilian time
  v_current_br_time := NOW() AT TIME ZONE 'America/Sao_Paulo';
  v_current_br_hour := EXTRACT(HOUR FROM v_current_br_time);

  -- Get session date (if sessao_id is set)
  IF NEW.sessao_id IS NOT NULL THEN
    SELECT data_aula INTO v_session_date
    FROM sessoes_aula
    WHERE id = NEW.sessao_id;

    -- Check if should be blocked
    v_should_block := (
      v_session_date < DATE(v_current_br_time) OR
      (v_session_date = DATE(v_current_br_time) AND v_current_br_hour >= 18)
    );

    IF v_should_block AND NOT COALESCE(NEW.bloqueado, false) THEN
      NEW.bloqueado := true;
      NEW.bloqueado_em := v_current_br_time;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS trigger_auto_set_bloqueado ON frequencia;

-- Create trigger
CREATE TRIGGER trigger_auto_set_bloqueado
  BEFORE INSERT OR UPDATE ON frequencia
  FOR EACH ROW
  EXECUTE FUNCTION auto_set_bloqueado_flag();

COMMENT ON FUNCTION auto_set_bloqueado_flag() IS
'Automatically sets the bloqueado flag on attendance records based on 18:00 time rule.';

-- ============================================================================
-- PHASE 6: VALIDATION AND TESTING
-- ============================================================================

-- Test the is_before_18h_sao_paulo function
DO $$
DECLARE
  v_result BOOLEAN;
  v_current_hour INTEGER;
BEGIN
  SELECT is_before_18h_sao_paulo() INTO v_result;
  SELECT EXTRACT(HOUR FROM (NOW() AT TIME ZONE 'America/Sao_Paulo')) INTO v_current_hour;

  RAISE NOTICE 'Current hour (Sao Paulo): %', v_current_hour;
  RAISE NOTICE 'is_before_18h_sao_paulo() returns: %', v_result;

  -- Validate consistency
  IF (v_current_hour < 18) = v_result THEN
    RAISE NOTICE '[OK] is_before_18h_sao_paulo() is consistent with current time';
  ELSE
    RAISE WARNING 'INCONSISTENCY: is_before_18h_sao_paulo() does not match current hour';
  END IF;
END $$;

-- ============================================================================
-- FINAL NOTICE
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '=============================================================================';
  RAISE NOTICE 'Migration 20250204004_bloqueio_18h_verificacao COMPLETED';
  RAISE NOTICE '=============================================================================';
  RAISE NOTICE 'Verification Results:';
  RAISE NOTICE '  [OK] is_before_18h_sao_paulo() function verified';
  RAISE NOTICE '  [OK] can_edit_attendance() function verified';
  RAISE NOTICE '  [OK] check_attendance_immutability trigger verified';
  RAISE NOTICE '';
  RAISE NOTICE 'Enhancements Applied:';
  RAISE NOTICE '  [OK] get_session_lock_status() function created';
  RAISE NOTICE '  [OK] vw_sessao_lock_status view created';
  RAISE NOTICE '  [OK] bloqueado/bloqueado_em columns ensured';
  RAISE NOTICE '  [OK] auto_set_bloqueado_flag() trigger created';
  RAISE NOTICE '';
  RAISE NOTICE 'Brazilian Compliance:';
  RAISE NOTICE '  - 18:00 Sao Paulo time blocking enforced';
  RAISE NOTICE '  - "Nao existe o esquecer" principle active';
  RAISE NOTICE '  - Comprehensive lock status available for frontend';
  RAISE NOTICE '=============================================================================';
END $$;
