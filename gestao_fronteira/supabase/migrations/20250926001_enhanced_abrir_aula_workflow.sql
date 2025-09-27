-- Enhanced Abrir Aula Workflow - Database Foundation
-- Migration: 20250926001_enhanced_abrir_aula_workflow.sql
-- Purpose: Implement three-phase session management with Brazilian legal compliance
-- Date: 2025-09-26

-- Create enhanced sessoes_aula table for class session management
CREATE TABLE IF NOT EXISTS sessoes_aula (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Session identification
    turma_id UUID NOT NULL REFERENCES turmas(id) ON DELETE CASCADE,
    professor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    disciplina_id UUID REFERENCES disciplinas(id), -- Optional subject reference

    -- Session timing
    data_aula DATE NOT NULL DEFAULT CURRENT_DATE,
    hora_inicio TIME,
    hora_fim TIME,

    -- Three-phase workflow status
    status VARCHAR(20) NOT NULL DEFAULT 'PLANEJADA'
        CHECK (status IN ('PLANEJADA', 'ABERTA', 'FECHADA', 'CANCELADA')),

    -- Timestamps for legal compliance
    criada_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    aberta_em TIMESTAMP WITH TIME ZONE,
    fechada_em TIMESTAMP WITH TIME ZONE,
    cancelada_em TIMESTAMP WITH TIME ZONE,

    -- Enhanced workflow fields for specification compliance
    auto_fechamento_agendado TIMESTAMP WITH TIME ZONE,
    observacoes_fechamento TEXT,
    conteudo_ministrado TEXT,

    -- Legal compliance fields
    hash_legal TEXT UNIQUE,

    -- Computed duration field
    tempo_total_aula INTERVAL GENERATED ALWAYS AS (
        CASE
            WHEN fechada_em IS NOT NULL AND aberta_em IS NOT NULL
            THEN fechada_em - aberta_em
            ELSE NULL
        END
    ) STORED,

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Business constraints
    UNIQUE(turma_id, data_aula), -- One session per class per day

    -- State transition constraints
    CONSTRAINT check_status_transitions CHECK (
        (status = 'PLANEJADA' AND aberta_em IS NULL AND fechada_em IS NULL) OR
        (status = 'ABERTA' AND aberta_em IS NOT NULL AND fechada_em IS NULL) OR
        (status = 'FECHADA' AND aberta_em IS NOT NULL AND fechada_em IS NOT NULL) OR
        (status = 'CANCELADA')
    ),

    -- Timing constraints
    CONSTRAINT check_valid_timing CHECK (
        (aberta_em IS NULL OR aberta_em >= criada_em) AND
        (fechada_em IS NULL OR fechada_em >= aberta_em) AND
        (cancelada_em IS NULL OR cancelada_em >= criada_em)
    )
);

-- Create audit_sessoes_aula table for comprehensive legal compliance
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
    CONSTRAINT audit_chronological CHECK (timestamp_acao <= NOW()),

    -- Prevent duplicate audit entries for critical actions
    CONSTRAINT audit_immutable EXCLUDE USING btree (
        sessao_id WITH =,
        timestamp_acao WITH =
    ) WHERE (acao IN ('FECHAR', 'CANCELAR'))
);

-- Add session reference to existing frequencia table
ALTER TABLE frequencia
    ADD COLUMN IF NOT EXISTS aula_session_id UUID REFERENCES sessoes_aula(id);

-- Create performance optimization indexes
-- Composite index for teacher dashboard queries (professor + status + date)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sessoes_aula_professor_status_data
    ON sessoes_aula (professor_id, status, data_aula)
    WHERE status IN ('PLANEJADA', 'ABERTA');

-- Index for auto-closure queries (6 PM São Paulo time)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sessoes_aula_auto_fechamento
    ON sessoes_aula (auto_fechamento_agendado)
    WHERE status = 'ABERTA' AND auto_fechamento_agendado IS NOT NULL;

-- Audit trail performance index
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_sessoes_aula_verificacao
    ON audit_sessoes_aula (sessao_id, timestamp_acao DESC);

-- Legal compliance lookup index
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sessoes_aula_hash_legal
    ON sessoes_aula (hash_legal)
    WHERE hash_legal IS NOT NULL;

-- Additional indexes for common queries
CREATE INDEX IF NOT EXISTS idx_sessoes_aula_turma_data
    ON sessoes_aula (turma_id, data_aula);

CREATE INDEX IF NOT EXISTS idx_sessoes_aula_status
    ON sessoes_aula (status);

CREATE INDEX IF NOT EXISTS idx_sessoes_aula_data_aula
    ON sessoes_aula (data_aula);

CREATE INDEX IF NOT EXISTS idx_audit_sessoes_aula_usuario
    ON audit_sessoes_aula (usuario_id);

CREATE INDEX IF NOT EXISTS idx_audit_sessoes_aula_timestamp
    ON audit_sessoes_aula (timestamp_acao);

-- Enable Row Level Security (RLS) for multi-school isolation
ALTER TABLE sessoes_aula ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_sessoes_aula ENABLE ROW LEVEL SECURITY;

-- RLS Policies for sessoes_aula

-- Teachers can only manage their own sessions
CREATE POLICY "teacher_session_management" ON sessoes_aula
    FOR ALL USING (
        professor_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM users
            WHERE id = auth.uid()
            AND tipo_usuario IN ('admin', 'diretor', 'secretario')
        )
    );

-- School-based isolation for sessions
CREATE POLICY "escola_session_isolation" ON sessoes_aula
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM turmas t
            JOIN users u ON u.id = auth.uid()
            WHERE t.id = turma_id
            AND (u.escola_id = t.escola_id OR u.tipo_usuario = 'admin')
        )
    );

-- RLS Policies for audit_sessoes_aula

-- Audit logs are read-only for compliance (admin/diretor only)
CREATE POLICY "audit_read_only" ON audit_sessoes_aula
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE id = auth.uid()
            AND tipo_usuario IN ('admin', 'diretor')
        )
    );

-- Prevent manual audit log insertion (only triggers can insert)
CREATE POLICY "audit_immutable_insert" ON audit_sessoes_aula
    FOR INSERT WITH CHECK (false);

-- Prevent audit log modifications
CREATE POLICY "audit_no_updates" ON audit_sessoes_aula
    FOR UPDATE USING (false);

-- Prevent audit log deletions
CREATE POLICY "audit_no_deletes" ON audit_sessoes_aula
    FOR DELETE USING (false);

-- Create trigger function for automatic audit logging and hash generation
CREATE OR REPLACE FUNCTION fn_audit_sessao_aula()
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
                WHEN 'FECHADA' THEN acao_audit := 'FECHAR';
                WHEN 'CANCELADA' THEN acao_audit := 'CANCELAR';
                ELSE acao_audit := 'MODIFICAR';
            END CASE;
        ELSE
            acao_audit := 'MODIFICAR';
        END IF;
    END IF;

    -- Generate legal compliance hash for closed sessions
    IF NEW.status = 'FECHADA' AND NEW.hash_legal IS NULL THEN
        hash_dados := encode(
            sha256(
                (NEW.turma_id || NEW.professor_id || NEW.data_aula ||
                 NEW.aberta_em || NEW.fechada_em || COALESCE(NEW.conteudo_ministrado, ''))::bytea
            ), 'hex'
        );
        NEW.hash_legal := hash_dados;
    END IF;

    -- Set auto-closure for opened sessions (6 PM São Paulo time)
    IF NEW.status = 'ABERTA' AND NEW.auto_fechamento_agendado IS NULL THEN
        NEW.auto_fechamento_agendado := (CURRENT_DATE + TIME '18:00:00') AT TIME ZONE 'America/Sao_Paulo';
    END IF;

    -- Create audit record
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

-- Apply audit trigger to sessoes_aula table
DROP TRIGGER IF EXISTS tg_audit_sessao_aula ON sessoes_aula;
CREATE TRIGGER tg_audit_sessao_aula
    BEFORE INSERT OR UPDATE ON sessoes_aula
    FOR EACH ROW
    EXECUTE FUNCTION fn_audit_sessao_aula();

-- Function for automatic session closure at 6 PM São Paulo time
CREATE OR REPLACE FUNCTION fn_auto_fechar_sessoes()
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
        SELECT id, turma_id, professor_id, conteudo_ministrado
        FROM sessoes_aula
        WHERE status = 'ABERTA'
        AND auto_fechamento_agendado <= current_sao_paulo_time
    LOOP
        UPDATE sessoes_aula
        SET
            status = 'FECHADA',
            fechada_em = NOW(),
            conteudo_ministrado = COALESCE(
                sessao_record.conteudo_ministrado,
                'Aula fechada automaticamente às 18:00 (horário de São Paulo)'
            )
        WHERE id = sessao_record.id;

        sessoes_fechadas := sessoes_fechadas + 1;
    END LOOP;

    RETURN sessoes_fechadas;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger
CREATE TRIGGER update_sessoes_aula_updated_at
    BEFORE UPDATE ON sessoes_aula
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create disciplinas table if it doesn't exist (for optional subject reference)
CREATE TABLE IF NOT EXISTS disciplinas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome VARCHAR(100) NOT NULL,
    codigo VARCHAR(20) UNIQUE NOT NULL,
    escola_id UUID REFERENCES escolas(id),
    ativa BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add index for disciplinas
CREATE INDEX IF NOT EXISTS idx_disciplinas_escola
    ON disciplinas (escola_id);

-- Insert basic disciplinas for Brazilian education system
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

-- Comments for documentation
COMMENT ON TABLE sessoes_aula IS 'Sessões de aula com controle de três fases (planejada, aberta, fechada) para conformidade legal brasileira';
COMMENT ON TABLE audit_sessoes_aula IS 'Trilha de auditoria para sessões de aula - implementa o princípio "não existe o esquecer"';
COMMENT ON COLUMN sessoes_aula.hash_legal IS 'Hash SHA-256 para verificação de integridade legal dos registros de frequência';
COMMENT ON COLUMN sessoes_aula.auto_fechamento_agendado IS 'Timestamp para fechamento automático às 18h (horário de São Paulo)';
COMMENT ON FUNCTION fn_auto_fechar_sessoes() IS 'Função para fechamento automático de sessões às 18h (horário de São Paulo)';

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Enhanced Abrir Aula Workflow migration completed successfully';
    RAISE NOTICE 'Created tables: sessoes_aula, audit_sessoes_aula, disciplinas';
    RAISE NOTICE 'Applied RLS policies and performance indexes';
    RAISE NOTICE 'Legal compliance features: hash generation, audit trail, Brazilian timezone support';
END
$$;