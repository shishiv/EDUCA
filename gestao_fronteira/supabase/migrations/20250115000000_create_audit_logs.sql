-- Audit Logs Table for Brazilian Educational Compliance
-- This migration creates the audit_logs table required for regulatory compliance
-- T030-T032 Implementation

-- Create audit_logs table
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    action TEXT NOT NULL,
    table_name TEXT NOT NULL,
    record_id TEXT NOT NULL,
    old_values JSONB,
    new_values JSONB,
    timestamp TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    escola_id UUID,
    details JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_name ON audit_logs(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_escola_id ON audit_logs(escola_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_record_id ON audit_logs(record_id);

-- Create compound indexes for common queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_escola_timestamp ON audit_logs(escola_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_timestamp ON audit_logs(user_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action_timestamp ON audit_logs(action, timestamp DESC);

-- Add foreign key constraints
ALTER TABLE audit_logs
ADD CONSTRAINT fk_audit_logs_user_id
FOREIGN KEY (user_id) REFERENCES users(id)
ON DELETE CASCADE;

ALTER TABLE audit_logs
ADD CONSTRAINT fk_audit_logs_escola_id
FOREIGN KEY (escola_id) REFERENCES escolas(id)
ON DELETE CASCADE;

-- Enable Row Level Security (RLS) for multi-tenancy
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see audit logs from their own school
-- Admins (escola_id = null) can see all logs
CREATE POLICY "Users can view audit logs from their school" ON audit_logs
    FOR SELECT
    USING (
        -- Admin users can see all logs
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = auth.uid()
            AND u.tipo_usuario = 'admin'
            AND u.ativo = true
        )
        OR
        -- Non-admin users can only see logs from their school
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = auth.uid()
            AND u.escola_id = audit_logs.escola_id
            AND u.ativo = true
        )
        OR
        -- Users can always see their own actions
        user_id = auth.uid()
    );

-- RLS Policy: Only authenticated users can insert audit logs
CREATE POLICY "Authenticated users can insert audit logs" ON audit_logs
    FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

-- RLS Policy: Audit logs cannot be updated or deleted (immutable for compliance)
CREATE POLICY "Audit logs are immutable" ON audit_logs
    FOR UPDATE
    USING (false);

CREATE POLICY "Audit logs cannot be deleted" ON audit_logs
    FOR DELETE
    USING (false);

-- Create audit log retention policy (keep logs for 7 years as per Brazilian law)
-- This would be implemented as a scheduled job in production
COMMENT ON TABLE audit_logs IS 'Audit logs for Brazilian educational compliance. Retention: 7 years minimum.';

-- Create function to automatically log table changes
CREATE OR REPLACE FUNCTION log_table_changes()
RETURNS TRIGGER AS $$
BEGIN
    -- Only log for specific critical tables
    IF TG_TABLE_NAME IN ('users', 'alunos', 'frequencia', 'notas', 'matriculas', 'turmas', 'escolas') THEN
        INSERT INTO audit_logs (
            user_id,
            action,
            table_name,
            record_id,
            old_values,
            new_values,
            escola_id
        ) VALUES (
            COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::UUID),
            CASE
                WHEN TG_OP = 'INSERT' THEN TG_TABLE_NAME || '_created'
                WHEN TG_OP = 'UPDATE' THEN TG_TABLE_NAME || '_updated'
                WHEN TG_OP = 'DELETE' THEN TG_TABLE_NAME || '_deleted'
            END,
            TG_TABLE_NAME,
            CASE
                WHEN TG_OP = 'DELETE' THEN OLD.id::TEXT
                ELSE NEW.id::TEXT
            END,
            CASE
                WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD)
                WHEN TG_OP = 'UPDATE' THEN to_jsonb(OLD)
                ELSE NULL
            END,
            CASE
                WHEN TG_OP = 'DELETE' THEN NULL
                ELSE to_jsonb(NEW)
            END,
            CASE
                WHEN TG_OP = 'DELETE' THEN OLD.escola_id
                ELSE NEW.escola_id
            END
        );
    END IF;

    RETURN CASE
        WHEN TG_OP = 'DELETE' THEN OLD
        ELSE NEW
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers for automatic audit logging on critical tables
-- These triggers ensure all data changes are logged automatically

-- Users table
DROP TRIGGER IF EXISTS audit_users_changes ON users;
CREATE TRIGGER audit_users_changes
    AFTER INSERT OR UPDATE OR DELETE ON users
    FOR EACH ROW EXECUTE FUNCTION log_table_changes();

-- Students table
DROP TRIGGER IF EXISTS audit_alunos_changes ON alunos;
CREATE TRIGGER audit_alunos_changes
    AFTER INSERT OR UPDATE OR DELETE ON alunos
    FOR EACH ROW EXECUTE FUNCTION log_table_changes();

-- Attendance table (CRITICAL for Brazilian compliance)
DROP TRIGGER IF EXISTS audit_frequencia_changes ON frequencia;
CREATE TRIGGER audit_frequencia_changes
    AFTER INSERT OR UPDATE OR DELETE ON frequencia
    FOR EACH ROW EXECUTE FUNCTION log_table_changes();

-- Grades table
DROP TRIGGER IF EXISTS audit_notas_changes ON notas;
CREATE TRIGGER audit_notas_changes
    AFTER INSERT OR UPDATE OR DELETE ON notas
    FOR EACH ROW EXECUTE FUNCTION log_table_changes();

-- Enrollments table
DROP TRIGGER IF EXISTS audit_matriculas_changes ON matriculas;
CREATE TRIGGER audit_matriculas_changes
    AFTER INSERT OR UPDATE OR DELETE ON matriculas
    FOR EACH ROW EXECUTE FUNCTION log_table_changes();

-- Classes table
DROP TRIGGER IF EXISTS audit_turmas_changes ON turmas;
CREATE TRIGGER audit_turmas_changes
    AFTER INSERT OR UPDATE OR DELETE ON turmas
    FOR EACH ROW EXECUTE FUNCTION log_table_changes();

-- Schools table
DROP TRIGGER IF EXISTS audit_escolas_changes ON escolas;
CREATE TRIGGER audit_escolas_changes
    AFTER INSERT OR UPDATE OR DELETE ON escolas
    FOR EACH ROW EXECUTE FUNCTION log_table_changes();

-- Create view for audit log summaries
CREATE OR REPLACE VIEW audit_summary AS
SELECT
    DATE(timestamp) as log_date,
    escola_id,
    action,
    COUNT(*) as event_count,
    COUNT(DISTINCT user_id) as unique_users,
    MIN(timestamp) as first_event,
    MAX(timestamp) as last_event
FROM audit_logs
WHERE timestamp >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(timestamp), escola_id, action
ORDER BY log_date DESC, event_count DESC;

-- Grant permissions
GRANT SELECT ON audit_logs TO authenticated;
GRANT INSERT ON audit_logs TO authenticated;
GRANT SELECT ON audit_summary TO authenticated;

-- Add comments for documentation
COMMENT ON COLUMN audit_logs.user_id IS 'ID of the user who performed the action';
COMMENT ON COLUMN audit_logs.action IS 'Type of action performed (e.g., attendance_marked, user_created)';
COMMENT ON COLUMN audit_logs.table_name IS 'Name of the affected database table';
COMMENT ON COLUMN audit_logs.record_id IS 'ID of the affected record';
COMMENT ON COLUMN audit_logs.old_values IS 'Previous values before the change (JSON)';
COMMENT ON COLUMN audit_logs.new_values IS 'New values after the change (JSON)';
COMMENT ON COLUMN audit_logs.escola_id IS 'School ID for multi-tenant access control';
COMMENT ON COLUMN audit_logs.details IS 'Additional context and metadata (JSON)';

-- Create function to clean old audit logs (for maintenance)
CREATE OR REPLACE FUNCTION cleanup_old_audit_logs()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Delete audit logs older than 7 years (Brazilian legal requirement)
    DELETE FROM audit_logs
    WHERE timestamp < NOW() - INTERVAL '7 years';

    GET DIAGNOSTICS deleted_count = ROW_COUNT;

    -- Log the cleanup operation
    INSERT INTO audit_logs (user_id, action, table_name, record_id, details)
    VALUES (
        '00000000-0000-0000-0000-000000000000'::UUID,
        'system_maintenance',
        'audit_logs',
        'cleanup',
        jsonb_build_object('deleted_records', deleted_count, 'retention_policy', '7_years')
    );

    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Note: In production, schedule this function to run monthly
-- Example: SELECT cron.schedule('cleanup-audit-logs', '0 2 1 * *', 'SELECT cleanup_old_audit_logs();');