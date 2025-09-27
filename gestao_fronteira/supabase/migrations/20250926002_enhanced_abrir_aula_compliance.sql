-- Enhanced Abrir Aula Workflow - Compliance Enhancements
-- Migration: 20250926002_enhanced_abrir_aula_compliance.sql
-- Purpose: Enhance existing sessoes_aula table with Brazilian legal compliance
-- Date: 2025-09-26

-- Add missing compliance fields to existing sessoes_aula table
ALTER TABLE sessoes_aula
    ADD COLUMN IF NOT EXISTS auto_fechamento_agendado TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS observacoes_fechamento TEXT,
    ADD COLUMN IF NOT EXISTS hash_legal TEXT UNIQUE,
    ADD COLUMN IF NOT EXISTS disciplina_id UUID REFERENCES disciplinas(id),
    ADD COLUMN IF NOT EXISTS aberta_em TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS fechada_em TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS cancelada_em TIMESTAMP WITH TIME ZONE;

-- Update status field to support new values (keeping backward compatibility)
ALTER TABLE sessoes_aula
    DROP CONSTRAINT IF EXISTS sessoes_aula_status_check;

ALTER TABLE sessoes_aula
    ADD CONSTRAINT sessoes_aula_status_check
    CHECK (status IN ('aberta', 'fechada', 'travada', 'PLANEJADA', 'ABERTA', 'FECHADA', 'CANCELADA'));

-- Add computed duration field
ALTER TABLE sessoes_aula
    ADD COLUMN IF NOT EXISTS tempo_total_aula INTERVAL GENERATED ALWAYS AS (
        CASE
            WHEN fechada_em IS NOT NULL AND aberta_em IS NOT NULL
            THEN fechada_em - aberta_em
            ELSE NULL
        END
    ) STORED;

-- Create disciplinas table if it doesn't exist
CREATE TABLE IF NOT EXISTS disciplinas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome VARCHAR(100) NOT NULL,
    codigo VARCHAR(20) UNIQUE NOT NULL,
    escola_id UUID REFERENCES escolas(id),
    ativa BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert basic Brazilian education disciplines
INSERT INTO disciplinas (nome, codigo) VALUES
    ('Língua Portuguesa', 'LP'),
    ('Matemática', 'MAT'),
    ('História', 'HIS'),
    ('Geografia', 'GEO'),
    ('Ciências', 'CIE'),
    ('Educação Física', 'EF'),
    ('Arte', 'ART'),
    ('Inglês', 'ING')
ON CONFLICT (codigo) DO NOTHING;

-- Create specific audit table for sessoes_aula (separate from general audit_trail)
CREATE TABLE IF NOT EXISTS audit_sessoes_aula (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Reference to session being audited
    sessao_id UUID NOT NULL REFERENCES sessoes_aula(id) ON DELETE CASCADE,

    -- Action tracking
    acao VARCHAR(50) NOT NULL CHECK (acao IN ('CRIAR', 'ABRIR', 'FECHAR', 'CANCELAR', 'MODIFICAR')),

    -- User tracking
    usuario_id UUID NOT NULL REFERENCES users(id),

    -- Timing
    timestamp_acao TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Change tracking
    dados_anteriores JSONB,
    dados_novos JSONB,

    -- Network tracking for compliance
    ip_usuario INET,
    user_agent TEXT,

    -- Legal compliance hash
    hash_verificacao TEXT NOT NULL,

    -- Ensure chronological order
    CONSTRAINT audit_chronological CHECK (timestamp_acao <= NOW())
);

-- Create performance optimization indexes for enhanced workflow
-- Teacher dashboard queries (professor + status + date)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sessoes_aula_professor_status_data
    ON sessoes_aula (professor_id, status, data_aula)
    WHERE status IN ('PLANEJADA', 'ABERTA', 'aberta');

-- Auto-closure queries (6 PM São Paulo time)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sessoes_aula_auto_fechamento
    ON sessoes_aula (auto_fechamento_agendado)
    WHERE status IN ('ABERTA', 'aberta') AND auto_fechamento_agendado IS NOT NULL;

-- Legal compliance lookup index
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sessoes_aula_hash_legal
    ON sessoes_aula (hash_legal)
    WHERE hash_legal IS NOT NULL;

-- Audit trail performance indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_sessoes_aula_verificacao
    ON audit_sessoes_aula (sessao_id, timestamp_acao DESC);

CREATE INDEX IF NOT EXISTS idx_audit_sessoes_aula_usuario
    ON audit_sessoes_aula (usuario_id);

CREATE INDEX IF NOT EXISTS idx_audit_sessoes_aula_timestamp
    ON audit_sessoes_aula (timestamp_acao);

-- Disciplinas index
CREATE INDEX IF NOT EXISTS idx_disciplinas_escola
    ON disciplinas (escola_id);

-- Enable RLS on new audit table
ALTER TABLE audit_sessoes_aula ENABLE ROW LEVEL SECURITY;

-- RLS Policies for audit_sessoes_aula
-- Audit logs are read-only for compliance (admin/diretor only)
CREATE POLICY "audit_sessoes_read_only" ON audit_sessoes_aula
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE id = auth.uid()
            AND tipo_usuario IN ('admin', 'diretor')
        )
    );

-- Prevent manual audit log operations (only triggers can insert)
CREATE POLICY "audit_sessoes_no_insert" ON audit_sessoes_aula
    FOR INSERT WITH CHECK (false);

CREATE POLICY "audit_sessoes_no_updates" ON audit_sessoes_aula
    FOR UPDATE USING (false);

CREATE POLICY "audit_sessoes_no_deletes" ON audit_sessoes_aula
    FOR DELETE USING (false);

-- Enhanced RLS policies for sessoes_aula
-- Update existing policies or create new ones for enhanced workflow

-- Teachers can only manage their own sessions with enhanced status support
DROP POLICY IF EXISTS "teacher_session_management" ON sessoes_aula;
CREATE POLICY "enhanced_teacher_session_access" ON sessoes_aula
    FOR ALL USING (
        professor_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM users
            WHERE id = auth.uid()
            AND tipo_usuario IN ('admin', 'diretor', 'secretario')
        )
    );

-- Create enhanced audit trigger function for sessoes_aula
CREATE OR REPLACE FUNCTION fn_enhanced_audit_sessao_aula()
RETURNS TRIGGER AS $$
DECLARE
    acao_audit VARCHAR(50);
    hash_dados TEXT;
    current_user_id UUID;
    user_ip TEXT;
BEGIN
    -- Get current user ID from JWT token or session
    current_user_id := COALESCE(
        (current_setting('request.jwt.claims', true)::json->>'sub')::uuid,
        (current_setting('app.user_id', true))::uuid
    );

    -- Get user IP address
    user_ip := COALESCE(
        current_setting('request.headers', true)::json->>'cf-connecting-ip',
        current_setting('app.client_ip', true),
        '127.0.0.1'
    );

    -- Determine action type based on operation and status changes
    IF TG_OP = 'INSERT' THEN
        acao_audit := 'CRIAR';
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.status != NEW.status THEN
            CASE NEW.status
                WHEN 'ABERTA' THEN acao_audit := 'ABRIR';
                WHEN 'aberta' THEN acao_audit := 'ABRIR';
                WHEN 'FECHADA' THEN acao_audit := 'FECHAR';
                WHEN 'fechada' THEN acao_audit := 'FECHAR';
                WHEN 'CANCELADA' THEN acao_audit := 'CANCELAR';
                WHEN 'travada' THEN acao_audit := 'FECHAR';
                ELSE acao_audit := 'MODIFICAR';
            END CASE;
        ELSE
            acao_audit := 'MODIFICAR';
        END IF;
    END IF;

    -- Generate legal compliance hash for closed sessions
    IF NEW.status IN ('FECHADA', 'fechada', 'travada') AND NEW.hash_legal IS NULL THEN
        hash_dados := encode(
            sha256(
                (NEW.turma_id || NEW.professor_id || NEW.data_aula ||
                 COALESCE(NEW.aberta_em, NEW.inicio_aula) ||
                 COALESCE(NEW.fechada_em, NEW.fim_aula) ||
                 COALESCE(NEW.conteudo_programatico, ''))::bytea
            ), 'hex'
        );
        NEW.hash_legal := hash_dados;
    END IF;

    -- Set auto-closure for opened sessions (6 PM São Paulo time)
    IF NEW.status IN ('ABERTA', 'aberta') AND NEW.auto_fechamento_agendado IS NULL THEN
        NEW.auto_fechamento_agendado := (CURRENT_DATE + TIME '18:00:00') AT TIME ZONE 'America/Sao_Paulo';
    END IF;

    -- Set aberta_em timestamp if opening session
    IF NEW.status IN ('ABERTA', 'aberta') AND NEW.aberta_em IS NULL THEN
        NEW.aberta_em := NOW();
    END IF;

    -- Set fechada_em timestamp if closing session
    IF NEW.status IN ('FECHADA', 'fechada', 'travada') AND NEW.fechada_em IS NULL THEN
        NEW.fechada_em := NOW();
    END IF;

    -- Create audit record in specific sessoes_aula audit table
    INSERT INTO audit_sessoes_aula (
        sessao_id,
        acao,
        usuario_id,
        dados_anteriores,
        dados_novos,
        ip_usuario,
        hash_verificacao
    ) VALUES (
        NEW.id,
        acao_audit,
        current_user_id,
        CASE WHEN TG_OP = 'UPDATE' THEN row_to_json(OLD) ELSE NULL END,
        row_to_json(NEW),
        user_ip::inet,
        encode(sha256((NEW.id || NOW() || random())::text::bytea), 'hex')
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply enhanced audit trigger to sessoes_aula table
DROP TRIGGER IF EXISTS tg_enhanced_audit_sessao_aula ON sessoes_aula;
CREATE TRIGGER tg_enhanced_audit_sessao_aula
    BEFORE INSERT OR UPDATE ON sessoes_aula
    FOR EACH ROW
    EXECUTE FUNCTION fn_enhanced_audit_sessao_aula();

-- Enhanced auto-closure function for 6 PM São Paulo time
CREATE OR REPLACE FUNCTION fn_auto_fechar_sessoes_enhanced()
RETURNS INTEGER AS $$
DECLARE
    sessoes_fechadas INTEGER := 0;
    sessao_record RECORD;
    current_sao_paulo_time TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Get current time in São Paulo timezone
    current_sao_paulo_time := NOW() AT TIME ZONE 'America/Sao_Paulo';

    -- Close sessions that should auto-close
    FOR sessao_record IN
        SELECT id, turma_id, professor_id, conteudo_programatico
        FROM sessoes_aula
        WHERE status IN ('ABERTA', 'aberta')
        AND auto_fechamento_agendado <= current_sao_paulo_time
    LOOP
        UPDATE sessoes_aula
        SET
            status = 'fechada',
            fechada_em = NOW(),
            fim_aula = NOW(),
            observacoes_fechamento = COALESCE(
                observacoes_fechamento,
                'Aula fechada automaticamente às 18:00 (horário de São Paulo)'
            )
        WHERE id = sessao_record.id;

        sessoes_fechadas := sessoes_fechadas + 1;
    END LOOP;

    RETURN sessoes_fechadas;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add state transition constraints to ensure valid workflow
ALTER TABLE sessoes_aula
    ADD CONSTRAINT IF NOT EXISTS check_enhanced_status_transitions CHECK (
        -- Allow existing states for backward compatibility
        (status IN ('aberta', 'fechada', 'travada')) OR
        -- New enhanced states with proper transitions
        (status = 'PLANEJADA' AND aberta_em IS NULL AND fechada_em IS NULL) OR
        (status = 'ABERTA' AND aberta_em IS NOT NULL AND fechada_em IS NULL) OR
        (status = 'FECHADA' AND aberta_em IS NOT NULL AND fechada_em IS NOT NULL) OR
        (status = 'CANCELADA')
    );

-- Add timing constraints
ALTER TABLE sessoes_aula
    ADD CONSTRAINT IF NOT EXISTS check_valid_enhanced_timing CHECK (
        (aberta_em IS NULL OR aberta_em >= created_at) AND
        (fechada_em IS NULL OR fechada_em >= COALESCE(aberta_em, inicio_aula)) AND
        (cancelada_em IS NULL OR cancelada_em >= created_at)
    );

-- Comments for documentation
COMMENT ON COLUMN sessoes_aula.hash_legal IS 'Hash SHA-256 para verificação de integridade legal dos registros de frequência';
COMMENT ON COLUMN sessoes_aula.auto_fechamento_agendado IS 'Timestamp para fechamento automático às 18h (horário de São Paulo)';
COMMENT ON COLUMN sessoes_aula.tempo_total_aula IS 'Duração calculada automaticamente da aula (fechada_em - aberta_em)';
COMMENT ON TABLE audit_sessoes_aula IS 'Trilha de auditoria específica para sessões de aula - implementa o princípio "não existe o esquecer"';
COMMENT ON FUNCTION fn_auto_fechar_sessoes_enhanced() IS 'Função aprimorada para fechamento automático de sessões às 18h (horário de São Paulo)';

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Enhanced Abrir Aula Compliance migration completed successfully';
    RAISE NOTICE 'Enhanced existing sessoes_aula table with Brazilian legal compliance';
    RAISE NOTICE 'Created audit_sessoes_aula table for session-specific auditing';
    RAISE NOTICE 'Applied enhanced RLS policies and performance indexes';
    RAISE NOTICE 'Legal compliance features: hash generation, audit trail, Brazilian timezone support';
    RAISE NOTICE 'Backward compatibility maintained with existing status values';
END
$$;