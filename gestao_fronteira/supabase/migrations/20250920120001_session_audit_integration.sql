-- Enhanced Audit Trail Integration for Session Management
-- Migration: 20250920120001_session_audit_integration.sql
-- Purpose: Integrate session management with existing audit_logs system

-- Function to create audit log entries for session changes
CREATE OR REPLACE FUNCTION create_session_audit_log()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  escola_id_val uuid;
  action_type text;
BEGIN
  -- Determine the escola_id from the turma
  SELECT t.escola_id INTO escola_id_val
  FROM turmas t
  WHERE t.id = COALESCE(NEW.turma_id, OLD.turma_id);

  -- Determine action type
  IF TG_OP = 'INSERT' THEN
    action_type := 'SESSION_CREATED';
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.fase != OLD.fase THEN
      action_type := 'SESSION_PHASE_CHANGED';
    ELSIF NEW.bloqueado != OLD.bloqueado THEN
      action_type := 'SESSION_LOCKED';
    ELSE
      action_type := 'SESSION_UPDATED';
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    action_type := 'SESSION_DELETED';
  END IF;

  -- Insert audit log
  INSERT INTO audit_logs (
    user_id,
    action,
    table_name,
    record_id,
    old_values,
    new_values,
    escola_id,
    details
  ) VALUES (
    COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid),
    action_type,
    'aula_sessions',
    COALESCE(NEW.id, OLD.id)::text,
    CASE WHEN TG_OP != 'INSERT' THEN row_to_json(OLD) ELSE NULL END,
    CASE WHEN TG_OP != 'DELETE' THEN row_to_json(NEW) ELSE NULL END,
    escola_id_val,
    jsonb_build_object(
      'operation', TG_OP,
      'table', TG_TABLE_NAME,
      'timestamp', now(),
      'compliance_context', jsonb_build_object(
        'educational_law', 'Brazilian Educational Law - Attendance Immutability',
        'requirement', 'Não existe o esquecer',
        'session_phase', COALESCE(NEW.fase, OLD.fase),
        'is_locked', COALESCE(NEW.bloqueado, OLD.bloqueado)
      )
    )
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Function to create audit log entries for attendance changes
CREATE OR REPLACE FUNCTION create_attendance_audit_log()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  escola_id_val uuid;
  action_type text;
BEGIN
  -- Determine the escola_id from the aluno
  SELECT a.escola_id INTO escola_id_val
  FROM alunos a
  WHERE a.id = COALESCE(NEW.aluno_id, OLD.aluno_id);

  -- Determine action type
  IF TG_OP = 'INSERT' THEN
    action_type := 'ATTENDANCE_MARKED';
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.presente != OLD.presente THEN
      action_type := 'ATTENDANCE_MODIFIED';
    ELSE
      action_type := 'ATTENDANCE_UPDATED';
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    action_type := 'ATTENDANCE_DELETED';
  END IF;

  -- Insert audit log
  INSERT INTO audit_logs (
    user_id,
    action,
    table_name,
    record_id,
    old_values,
    new_values,
    escola_id,
    details
  ) VALUES (
    COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid),
    action_type,
    'frequencia',
    COALESCE(NEW.id, OLD.id)::text,
    CASE WHEN TG_OP != 'INSERT' THEN row_to_json(OLD) ELSE NULL END,
    CASE WHEN TG_OP != 'DELETE' THEN row_to_json(NEW) ELSE NULL END,
    escola_id_val,
    jsonb_build_object(
      'operation', TG_OP,
      'table', TG_TABLE_NAME,
      'timestamp', now(),
      'compliance_context', jsonb_build_object(
        'educational_law', 'Brazilian Educational Law - Attendance Tracking',
        'requirement', 'Único documento oficial',
        'session_id', COALESCE(NEW.session_id, OLD.session_id),
        'aluno_id', COALESCE(NEW.aluno_id, OLD.aluno_id),
        'presente', COALESCE(NEW.presente, OLD.presente),
        'is_locked', COALESCE(NEW.is_locked, OLD.is_locked)
      )
    )
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create audit triggers for session management
DROP TRIGGER IF EXISTS trigger_session_audit_log ON aula_sessions;
CREATE TRIGGER trigger_session_audit_log
  AFTER INSERT OR UPDATE OR DELETE ON aula_sessions
  FOR EACH ROW
  EXECUTE FUNCTION create_session_audit_log();

-- Create audit triggers for attendance changes
DROP TRIGGER IF EXISTS trigger_attendance_audit_log ON frequencia;
CREATE TRIGGER trigger_attendance_audit_log
  AFTER INSERT OR UPDATE OR DELETE ON frequencia
  FOR EACH ROW
  EXECUTE FUNCTION create_attendance_audit_log();

-- Function to get session audit trail for compliance reporting
CREATE OR REPLACE FUNCTION get_session_audit_trail(
  session_uuid uuid
)
RETURNS TABLE (
  id uuid,
  user_name text,
  action text,
  timestamp timestamptz,
  old_values jsonb,
  new_values jsonb,
  details jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    al.id,
    u.nome_completo as user_name,
    al.action,
    al.timestamp,
    al.old_values,
    al.new_values,
    al.details
  FROM audit_logs al
  LEFT JOIN users u ON al.user_id = u.id
  WHERE al.table_name IN ('aula_sessions', 'frequencia')
    AND (
      al.record_id = session_uuid::text
      OR al.details->>'session_id' = session_uuid::text
    )
  ORDER BY al.timestamp DESC;
END;
$$;

-- Function to get compliance audit report for educational authorities
CREATE OR REPLACE FUNCTION get_compliance_audit_report(
  escola_id_param uuid,
  date_from date,
  date_to date
)
RETURNS TABLE (
  session_date date,
  turma_nome text,
  professor_nome text,
  total_actions bigint,
  session_modifications bigint,
  attendance_modifications bigint,
  locked_sessions bigint,
  compliance_score numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH session_stats AS (
    SELECT
      s.data_aula,
      t.nome as turma_nome,
      u.nome_completo as professor_nome,
      s.id as session_id,
      s.bloqueado
    FROM aula_sessions s
    JOIN turmas t ON s.turma_id = t.id
    JOIN users u ON s.professor_id = u.id
    WHERE t.escola_id = escola_id_param
      AND s.data_aula BETWEEN date_from AND date_to
  ),
  audit_stats AS (
    SELECT
      (al.new_values->>'data_aula')::date as session_date,
      COUNT(*) as total_actions,
      SUM(CASE WHEN al.table_name = 'aula_sessions' THEN 1 ELSE 0 END) as session_modifications,
      SUM(CASE WHEN al.table_name = 'frequencia' THEN 1 ELSE 0 END) as attendance_modifications
    FROM audit_logs al
    WHERE al.escola_id = escola_id_param
      AND al.timestamp::date BETWEEN date_from AND date_to
      AND al.table_name IN ('aula_sessions', 'frequencia')
    GROUP BY (al.new_values->>'data_aula')::date
  )
  SELECT
    ss.data_aula,
    ss.turma_nome,
    ss.professor_nome,
    COALESCE(aus.total_actions, 0),
    COALESCE(aus.session_modifications, 0),
    COALESCE(aus.attendance_modifications, 0),
    SUM(CASE WHEN ss.bloqueado THEN 1 ELSE 0 END) as locked_sessions,
    -- Compliance score: higher is better (fewer modifications = better compliance)
    CASE
      WHEN COALESCE(aus.total_actions, 0) = 0 THEN 100.0
      ELSE GREATEST(0, 100.0 - (COALESCE(aus.total_actions, 0) * 5.0))
    END as compliance_score
  FROM session_stats ss
  LEFT JOIN audit_stats aus ON ss.data_aula = aus.session_date
  GROUP BY ss.data_aula, ss.turma_nome, ss.professor_nome,
           aus.total_actions, aus.session_modifications, aus.attendance_modifications
  ORDER BY ss.data_aula DESC;
END;
$$;

-- Function to validate session integrity using audit trail
CREATE OR REPLACE FUNCTION validate_session_integrity(
  session_uuid uuid
)
RETURNS TABLE (
  is_valid boolean,
  integrity_score numeric,
  issues jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  session_data record;
  calculated_hash text;
  stored_hash text;
  audit_count integer;
  issues_array jsonb := '[]'::jsonb;
  score numeric := 100.0;
BEGIN
  -- Get session data
  SELECT * INTO session_data
  FROM aula_sessions
  WHERE id = session_uuid;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 0.0, '["Session not found"]'::jsonb;
    RETURN;
  END IF;

  -- Check if session should be locked
  IF session_data.data_aula < CURRENT_DATE AND NOT session_data.bloqueado THEN
    issues_array := issues_array || '["Session should be locked but is not"]'::jsonb;
    score := score - 30.0;
  END IF;

  -- Validate hash integrity
  calculated_hash := calculate_session_hash(session_uuid);
  stored_hash := session_data.hash_integridade;

  IF stored_hash IS NOT NULL AND calculated_hash != stored_hash THEN
    issues_array := issues_array || '["Hash integrity validation failed"]'::jsonb;
    score := score - 50.0;
  END IF;

  -- Check for excessive modifications in audit trail
  SELECT COUNT(*) INTO audit_count
  FROM audit_logs
  WHERE record_id = session_uuid::text
    AND action LIKE '%MODIFIED%';

  IF audit_count > 5 THEN
    issues_array := issues_array || format('["Excessive modifications: %s"]', audit_count)::jsonb;
    score := score - (audit_count * 5.0);
  END IF;

  -- Check phase progression validity
  IF session_data.fase = 'bloqueada' AND NOT session_data.bloqueado THEN
    issues_array := issues_array || '["Phase-lock mismatch"]'::jsonb;
    score := score - 25.0;
  END IF;

  RETURN QUERY SELECT
    score >= 80.0,
    GREATEST(0.0, score),
    issues_array;
END;
$$;

-- Create view for audit dashboard
CREATE OR REPLACE VIEW session_audit_dashboard AS
SELECT
  s.id as session_id,
  s.data_aula,
  t.nome as turma,
  u.nome_completo as professor,
  s.fase,
  s.bloqueado,
  s.total_alunos,
  s.total_presentes,
  COALESCE(audit_counts.total_audits, 0) as total_audits,
  COALESCE(audit_counts.recent_changes, 0) as recent_changes,
  CASE
    WHEN s.bloqueado THEN 'Locked'
    WHEN s.data_aula < CURRENT_DATE AND NOT s.bloqueado THEN 'Should be locked'
    WHEN s.fase = 'finalizada' THEN 'Completed'
    WHEN s.fase = 'chamada' THEN 'Active'
    ELSE 'Planning'
  END as status,
  -- Compliance indicator
  CASE
    WHEN s.bloqueado AND s.hash_integridade IS NOT NULL THEN 'Compliant'
    WHEN s.data_aula < CURRENT_DATE AND NOT s.bloqueado THEN 'Non-compliant'
    ELSE 'Pending'
  END as compliance_status
FROM aula_sessions s
JOIN turmas t ON s.turma_id = t.id
JOIN users u ON s.professor_id = u.id
LEFT JOIN (
  SELECT
    record_id::uuid as session_id,
    COUNT(*) as total_audits,
    SUM(CASE WHEN timestamp >= NOW() - INTERVAL '24 hours' THEN 1 ELSE 0 END) as recent_changes
  FROM audit_logs
  WHERE table_name IN ('aula_sessions', 'frequencia')
  GROUP BY record_id::uuid
) audit_counts ON s.id = audit_counts.session_id;

-- Grant necessary permissions
GRANT SELECT ON session_audit_dashboard TO authenticated;
GRANT EXECUTE ON FUNCTION get_session_audit_trail(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_compliance_audit_report(uuid, date, date) TO authenticated;
GRANT EXECUTE ON FUNCTION validate_session_integrity(uuid) TO authenticated;

-- Add helpful comments
COMMENT ON FUNCTION create_session_audit_log() IS 'Creates audit log entries for all session management changes';
COMMENT ON FUNCTION create_attendance_audit_log() IS 'Creates audit log entries for all attendance changes';
COMMENT ON FUNCTION get_session_audit_trail(uuid) IS 'Retrieves complete audit trail for a specific session';
COMMENT ON FUNCTION get_compliance_audit_report(uuid, date, date) IS 'Generates compliance audit report for educational authorities';
COMMENT ON FUNCTION validate_session_integrity(uuid) IS 'Validates session data integrity using audit trail';
COMMENT ON VIEW session_audit_dashboard IS 'Dashboard view for monitoring session compliance and audit status';