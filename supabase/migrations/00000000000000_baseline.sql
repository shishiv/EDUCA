-- Migration: 00000000000000_baseline.sql
-- Baseline schema snapshot capturing existing Supabase tables
-- Created: 2026-01-19
--
-- NOTE: This migration documents existing schema for version control.
-- Tables already exist in production - this file is for reference and new deployments.
--
-- Run with: npx supabase db push (for new environments)
-- Skip for: existing production (tables already exist)
--
-- Schema exported from: lib/database.types.ts (generated from production)

-- =============================================================================
-- Enable required extensions
-- =============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- =============================================================================
-- 1. Core Tables: Schools and Users
-- =============================================================================

-- escolas: Schools table
CREATE TABLE IF NOT EXISTS escolas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo TEXT NOT NULL,
  nome TEXT NOT NULL,
  tipo TEXT NOT NULL,
  ativo BOOLEAN DEFAULT true,
  email TEXT,
  telefone TEXT,
  endereco TEXT,
  diretor_id UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- users: System users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  email TEXT,
  tipo_usuario TEXT NOT NULL,
  escola_id UUID REFERENCES escolas(id),
  ativo BOOLEAN DEFAULT true,
  primeiro_login BOOLEAN DEFAULT true,
  senha_padrao BOOLEAN DEFAULT true,
  data_ultimo_acesso TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Add foreign key constraint for escolas.diretor_id after users table exists
ALTER TABLE escolas
  ADD CONSTRAINT fk_escolas_diretor
  FOREIGN KEY (diretor_id) REFERENCES users(id);

-- Add foreign key constraint for users.escola_id
ALTER TABLE users
  ADD CONSTRAINT fk_users_escola
  FOREIGN KEY (escola_id) REFERENCES escolas(id);

-- =============================================================================
-- 2. Student and Guardian Tables
-- =============================================================================

-- responsaveis: Guardians/Parents table
CREATE TABLE IF NOT EXISTS responsaveis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  cpf TEXT NOT NULL,
  parentesco TEXT NOT NULL,
  telefone TEXT,
  email TEXT,
  endereco TEXT,
  rg TEXT,
  orgao_emissor_rg TEXT,
  data_nascimento DATE,
  nacionalidade TEXT,
  estado_civil TEXT,
  escolaridade TEXT,
  profissao TEXT,
  renda_familiar NUMERIC,
  lgpd_consentimento BOOLEAN DEFAULT false,
  lgpd_data_consentimento TIMESTAMPTZ,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- alunos: Students table
CREATE TABLE IF NOT EXISTS alunos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome_completo TEXT NOT NULL,
  data_nascimento DATE NOT NULL,
  sexo TEXT NOT NULL,
  cpf TEXT,
  rg TEXT,
  nis TEXT,
  bolsa_familia BOOLEAN DEFAULT false,
  nome_mae TEXT,
  nome_pai TEXT,
  telefone TEXT,
  email TEXT,
  endereco TEXT,
  necessidades_especiais TEXT,
  responsavel_id UUID REFERENCES responsaveis(id),
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- aluno_responsaveis: Many-to-many relationship between students and guardians
CREATE TABLE IF NOT EXISTS aluno_responsaveis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id UUID NOT NULL REFERENCES alunos(id),
  responsavel_id UUID NOT NULL REFERENCES responsaveis(id),
  tipo_responsabilidade TEXT NOT NULL,
  prioridade INTEGER DEFAULT 1,
  pode_autorizar_saida BOOLEAN DEFAULT true,
  pode_receber_comunicados BOOLEAN DEFAULT true,
  documento_autorizacao TEXT,
  data_inicio DATE DEFAULT CURRENT_DATE,
  data_fim DATE,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================================================
-- 3. Class and Enrollment Tables
-- =============================================================================

-- turmas: Classes/Groups table
CREATE TABLE IF NOT EXISTS turmas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  serie TEXT NOT NULL,
  turno TEXT NOT NULL,
  ano_letivo INTEGER NOT NULL,
  capacidade INTEGER DEFAULT 30,
  escola_id UUID NOT NULL REFERENCES escolas(id),
  professor_id UUID REFERENCES users(id),
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- matriculas: Enrollments table
CREATE TABLE IF NOT EXISTS matriculas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id UUID NOT NULL REFERENCES alunos(id),
  turma_id UUID NOT NULL REFERENCES turmas(id),
  ano_letivo INTEGER NOT NULL,
  data_matricula DATE DEFAULT CURRENT_DATE,
  situacao TEXT DEFAULT 'ativa',
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================================================
-- 4. Subject and Discipline Tables
-- =============================================================================

-- disciplinas: Subjects/Disciplines table
CREATE TABLE IF NOT EXISTS disciplinas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo TEXT NOT NULL,
  nome TEXT NOT NULL,
  escola_id UUID REFERENCES escolas(id),
  ativa BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================================================
-- 5. Class Session Tables
-- =============================================================================

-- aulas_abertas: Open class sessions
CREATE TABLE IF NOT EXISTS aulas_abertas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  turma_id UUID NOT NULL REFERENCES turmas(id),
  escola_id UUID NOT NULL REFERENCES escolas(id),
  professor_id UUID NOT NULL REFERENCES users(id),
  data_aula DATE DEFAULT CURRENT_DATE,
  disciplina TEXT,
  status TEXT DEFAULT 'aberta',
  tempo_limite_minutos INTEGER DEFAULT 120,
  aberta_em TIMESTAMPTZ DEFAULT now(),
  fechada_em TIMESTAMPTZ,
  travada_em TIMESTAMPTZ,
  observacoes_abertura TEXT,
  observacoes_fechamento TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- sessoes_aula: Class sessions with detailed tracking
CREATE TABLE IF NOT EXISTS sessoes_aula (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  turma_id UUID NOT NULL REFERENCES turmas(id),
  escola_id UUID NOT NULL REFERENCES escolas(id),
  professor_id UUID NOT NULL REFERENCES users(id),
  disciplina_id UUID REFERENCES disciplinas(id),
  data_aula DATE DEFAULT CURRENT_DATE,
  inicio_aula TIME DEFAULT CURRENT_TIME,
  fim_aula TIME,
  duracao_minutos INTEGER DEFAULT 50,
  conteudo_programatico TEXT NOT NULL,
  objetivos_aprendizagem TEXT,
  metodologia TEXT,
  recursos_utilizados TEXT,
  avaliacao_planejada TEXT,
  observacoes TEXT,
  status TEXT DEFAULT 'planejada',
  documento_oficial BOOLEAN DEFAULT false,
  hash_integridade TEXT,
  hash_legal TEXT,
  aberta_em TIMESTAMPTZ,
  fechada_em TIMESTAMPTZ,
  travada_em TIMESTAMPTZ,
  cancelada_em TIMESTAMPTZ,
  auto_fechamento_agendado TIMESTAMPTZ,
  observacoes_fechamento TEXT,
  tempo_total_aula INTERVAL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================================================
-- 6. Attendance Tables
-- =============================================================================

-- frequencia: Attendance records
CREATE TABLE IF NOT EXISTS frequencia (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  matricula_id UUID NOT NULL REFERENCES matriculas(id),
  data_aula DATE NOT NULL,
  presente BOOLEAN DEFAULT false,
  status_presenca TEXT DEFAULT 'nao_marcado',
  justificativa TEXT,
  observacoes TEXT,
  observacoes_frequencia TEXT,
  aula_id UUID REFERENCES aulas_abertas(id),
  sessao_id UUID REFERENCES sessoes_aula(id),
  professor_id UUID REFERENCES users(id),
  documento_oficial BOOLEAN DEFAULT false,
  hash_registro TEXT,
  marcado_por UUID REFERENCES users(id),
  marcado_em TIMESTAMPTZ,
  modificado_em TIMESTAMPTZ,
  travado BOOLEAN DEFAULT false,
  bloqueado BOOLEAN DEFAULT false,
  bloqueado_por UUID REFERENCES users(id),
  bloqueado_em TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================================================
-- 7. Grades Table
-- =============================================================================

-- notas: Student grades
CREATE TABLE IF NOT EXISTS notas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  matricula_id UUID NOT NULL REFERENCES matriculas(id),
  disciplina TEXT NOT NULL,
  nota NUMERIC NOT NULL,
  bimestre INTEGER NOT NULL,
  tipo_avaliacao TEXT NOT NULL,
  data_avaliacao DATE NOT NULL,
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================================================
-- 8. Calendar Table
-- =============================================================================

-- calendario_escolar: School calendar
CREATE TABLE IF NOT EXISTS calendario_escolar (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  escola_id UUID NOT NULL REFERENCES escolas(id),
  titulo TEXT NOT NULL,
  tipo TEXT NOT NULL,
  data_inicio DATE NOT NULL,
  data_fim DATE NOT NULL,
  ano_letivo INTEGER DEFAULT EXTRACT(YEAR FROM CURRENT_DATE),
  descricao TEXT,
  cor TEXT,
  afeta_frequencia BOOLEAN DEFAULT false,
  criado_por UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================================================
-- 9. Configuration Table
-- =============================================================================

-- configs: System configuration
CREATE TABLE IF NOT EXISTS configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chave TEXT NOT NULL,
  valor TEXT NOT NULL,
  categoria TEXT NOT NULL,
  descricao TEXT NOT NULL,
  tipo_valor TEXT DEFAULT 'string',
  valor_padrao TEXT,
  escola_id UUID REFERENCES escolas(id),
  criado_por UUID REFERENCES users(id),
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================================================
-- 10. INEP Codes Table
-- =============================================================================

-- codigos_inep: INEP identification codes
CREATE TABLE IF NOT EXISTS codigos_inep (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entidade_tipo TEXT NOT NULL,
  entidade_id UUID NOT NULL,
  codigo_inep TEXT NOT NULL,
  situacao TEXT DEFAULT 'pendente',
  validado_por UUID REFERENCES users(id),
  data_validacao TIMESTAMPTZ,
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================================================
-- 11. Educacenso Export Table
-- =============================================================================

-- educacenso_exports: Export tracking for MEC
CREATE TABLE IF NOT EXISTS educacenso_exports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  escola_id UUID NOT NULL REFERENCES escolas(id),
  tipo_export TEXT NOT NULL,
  ano_referencia INTEGER NOT NULL,
  status_export TEXT DEFAULT 'pendente',
  data_geracao TIMESTAMPTZ,
  data_envio TIMESTAMPTZ,
  arquivo_gerado TEXT,
  hash_arquivo TEXT,
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================================================
-- 12. Audit Tables
-- =============================================================================

-- audit_logs: General audit logging
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  escola_id UUID REFERENCES escolas(id),
  table_name TEXT NOT NULL,
  record_id TEXT NOT NULL,
  action TEXT NOT NULL,
  old_values JSONB,
  new_values JSONB,
  details JSONB,
  ip_address TEXT,
  user_agent TEXT,
  timestamp TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- audit_sessoes_aula: Session-specific audit
CREATE TABLE IF NOT EXISTS audit_sessoes_aula (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sessao_id UUID NOT NULL REFERENCES sessoes_aula(id),
  usuario_id UUID NOT NULL REFERENCES users(id),
  acao TEXT NOT NULL,
  dados_anteriores JSONB,
  dados_novos JSONB,
  hash_verificacao TEXT NOT NULL,
  ip_usuario INET,
  user_agent TEXT,
  timestamp_acao TIMESTAMPTZ DEFAULT now()
);

-- audit_trail: Comprehensive audit trail
CREATE TABLE IF NOT EXISTS audit_trail (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tabela TEXT NOT NULL,
  registro_id TEXT NOT NULL,
  operacao TEXT NOT NULL,
  usuario_id UUID REFERENCES users(id),
  escola_id UUID REFERENCES escolas(id),
  sessao_id TEXT,
  dados_anteriores JSONB,
  dados_novos JSONB,
  campos_alterados TEXT[],
  justificativa TEXT,
  documento_legal TEXT,
  nivel_criticidade TEXT DEFAULT 'normal',
  ip_address INET,
  user_agent TEXT,
  timestamp_operacao TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================================================
-- 13. Legacy Role-Based Access Tables (from early schema)
-- =============================================================================

-- School: Legacy school table (for backwards compatibility)
CREATE TABLE IF NOT EXISTS "School" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- User: Legacy user table
CREATE TABLE IF NOT EXISTS "User" (
  id UUID PRIMARY KEY,
  email TEXT,
  full_name TEXT,
  school_id UUID NOT NULL REFERENCES "School"(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Role: Role definitions
CREATE TABLE IF NOT EXISTS "Role" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Permission: Permission definitions
CREATE TABLE IF NOT EXISTS "Permission" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- UserRole: User-Role junction
CREATE TABLE IF NOT EXISTS "UserRole" (
  user_id UUID NOT NULL REFERENCES "User"(id),
  role_id UUID NOT NULL REFERENCES "Role"(id),
  PRIMARY KEY (user_id, role_id)
);

-- RolePermission: Role-Permission junction
CREATE TABLE IF NOT EXISTS "RolePermission" (
  role_id UUID NOT NULL REFERENCES "Role"(id),
  permission_id UUID NOT NULL REFERENCES "Permission"(id),
  PRIMARY KEY (role_id, permission_id)
);

-- =============================================================================
-- 14. Indexes for Performance
-- =============================================================================

-- Users indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_escola ON users(escola_id);
CREATE INDEX IF NOT EXISTS idx_users_tipo ON users(tipo_usuario);

-- Alunos indexes
CREATE INDEX IF NOT EXISTS idx_alunos_cpf ON alunos(cpf);
CREATE INDEX IF NOT EXISTS idx_alunos_nis ON alunos(nis);
CREATE INDEX IF NOT EXISTS idx_alunos_nome ON alunos(nome_completo);

-- Turmas indexes
CREATE INDEX IF NOT EXISTS idx_turmas_escola ON turmas(escola_id);
CREATE INDEX IF NOT EXISTS idx_turmas_ano ON turmas(ano_letivo);

-- Matriculas indexes
CREATE INDEX IF NOT EXISTS idx_matriculas_aluno ON matriculas(aluno_id);
CREATE INDEX IF NOT EXISTS idx_matriculas_turma ON matriculas(turma_id);
CREATE INDEX IF NOT EXISTS idx_matriculas_ano ON matriculas(ano_letivo);

-- Frequencia indexes
CREATE INDEX IF NOT EXISTS idx_frequencia_matricula ON frequencia(matricula_id);
CREATE INDEX IF NOT EXISTS idx_frequencia_data ON frequencia(data_aula);
CREATE INDEX IF NOT EXISTS idx_frequencia_aula ON frequencia(aula_id);
CREATE INDEX IF NOT EXISTS idx_frequencia_sessao ON frequencia(sessao_id);

-- Sessoes_aula indexes
CREATE INDEX IF NOT EXISTS idx_sessoes_turma ON sessoes_aula(turma_id);
CREATE INDEX IF NOT EXISTS idx_sessoes_escola ON sessoes_aula(escola_id);
CREATE INDEX IF NOT EXISTS idx_sessoes_professor ON sessoes_aula(professor_id);
CREATE INDEX IF NOT EXISTS idx_sessoes_data ON sessoes_aula(data_aula);
CREATE INDEX IF NOT EXISTS idx_sessoes_status ON sessoes_aula(status);

-- Audit indexes
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_table ON audit_logs(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_trail_tabela ON audit_trail(tabela);
CREATE INDEX IF NOT EXISTS idx_audit_trail_timestamp ON audit_trail(timestamp_operacao);

-- =============================================================================
-- 15. Views
-- =============================================================================

-- View: Bolsa Familia risk students
CREATE OR REPLACE VIEW vw_alunos_risco_bolsa_familia AS
SELECT
  a.id AS aluno_id,
  a.nome_completo,
  a.nis,
  a.bolsa_familia,
  m.id AS matricula_id,
  m.turma_id,
  t.nome AS turma_nome,
  t.serie,
  t.escola_id,
  e.nome AS escola_nome,
  COUNT(CASE WHEN f.presente = true THEN 1 END) AS presencas,
  COUNT(CASE WHEN f.presente = false THEN 1 END) AS faltas,
  COUNT(CASE WHEN f.justificativa IS NOT NULL THEN 1 END) AS atestados,
  COUNT(f.id) AS total_aulas,
  CASE
    WHEN COUNT(f.id) > 0
    THEN ROUND((COUNT(CASE WHEN f.presente = true THEN 1 END)::NUMERIC / COUNT(f.id)) * 100, 2)
    ELSE 0
  END AS percentual_frequencia
FROM alunos a
JOIN matriculas m ON m.aluno_id = a.id
JOIN turmas t ON t.id = m.turma_id
JOIN escolas e ON e.id = t.escola_id
LEFT JOIN frequencia f ON f.matricula_id = m.id
WHERE a.bolsa_familia = true
  AND m.situacao = 'ativa'
GROUP BY a.id, a.nome_completo, a.nis, a.bolsa_familia,
         m.id, m.turma_id, t.nome, t.serie, t.escola_id, e.nome;

-- View: Complete attendance with all details
CREATE OR REPLACE VIEW vw_frequencia_completa AS
SELECT
  f.id,
  f.matricula_id,
  f.data_aula,
  f.presente,
  f.justificativa,
  f.observacoes,
  f.aula_id,
  f.professor_id,
  f.marcado_em,
  f.modificado_em,
  f.travado,
  a.nome_completo AS aluno_nome,
  a.cpf AS aluno_cpf,
  t.nome AS turma_nome,
  t.serie AS turma_serie,
  t.turno AS turma_turno,
  m.ano_letivo,
  m.situacao AS situacao_matricula,
  e.nome AS escola_nome,
  e.codigo AS escola_codigo,
  u.nome AS professor_nome,
  u.email AS professor_email,
  aa.status AS aula_status,
  aa.aberta_em,
  aa.fechada_em,
  aa.travada_em,
  aa.disciplina,
  aa.tempo_limite_minutos,
  CASE
    WHEN aa.travada_em IS NOT NULL THEN false
    WHEN aa.fechada_em IS NULL THEN true
    ELSE EXTRACT(EPOCH FROM (now() - aa.fechada_em))/60 < 60
  END AS pode_modificar,
  CASE
    WHEN aa.fechada_em IS NULL THEN aa.tempo_limite_minutos
    ELSE GREATEST(0, aa.tempo_limite_minutos - EXTRACT(EPOCH FROM (now() - aa.aberta_em))/60)::INTEGER
  END AS minutos_restantes
FROM frequencia f
JOIN matriculas m ON m.id = f.matricula_id
JOIN alunos a ON a.id = m.aluno_id
JOIN turmas t ON t.id = m.turma_id
JOIN escolas e ON e.id = t.escola_id
LEFT JOIN aulas_abertas aa ON aa.id = f.aula_id
LEFT JOIN users u ON u.id = f.professor_id;

-- View: Audit summary
CREATE OR REPLACE VIEW audit_summary AS
SELECT
  DATE(timestamp) AS log_date,
  escola_id,
  action,
  COUNT(*) AS event_count,
  COUNT(DISTINCT user_id) AS unique_users,
  MIN(timestamp) AS first_event,
  MAX(timestamp) AS last_event
FROM audit_logs
GROUP BY DATE(timestamp), escola_id, action
ORDER BY log_date DESC, event_count DESC;

-- =============================================================================
-- 16. Row Level Security (RLS)
-- =============================================================================

-- Enable RLS on all main tables
ALTER TABLE escolas ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE alunos ENABLE ROW LEVEL SECURITY;
ALTER TABLE responsaveis ENABLE ROW LEVEL SECURITY;
ALTER TABLE aluno_responsaveis ENABLE ROW LEVEL SECURITY;
ALTER TABLE turmas ENABLE ROW LEVEL SECURITY;
ALTER TABLE matriculas ENABLE ROW LEVEL SECURITY;
ALTER TABLE disciplinas ENABLE ROW LEVEL SECURITY;
ALTER TABLE frequencia ENABLE ROW LEVEL SECURITY;
ALTER TABLE notas ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessoes_aula ENABLE ROW LEVEL SECURITY;
ALTER TABLE aulas_abertas ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendario_escolar ENABLE ROW LEVEL SECURITY;
ALTER TABLE configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_trail ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_sessoes_aula ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- 17. RLS Policies
-- =============================================================================

-- Escolas: Authenticated users can read escolas
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'escolas_select_authenticated') THEN
    CREATE POLICY escolas_select_authenticated ON escolas
      FOR SELECT TO authenticated USING (true);
  END IF;
END $$;

-- Users: Users can read their own escola's users
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'users_select_same_escola') THEN
    CREATE POLICY users_select_same_escola ON users
      FOR SELECT TO authenticated
      USING (
        escola_id = (SELECT escola_id FROM users WHERE id = auth.uid())
        OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND tipo_usuario IN ('admin', 'gestor_sme'))
      );
  END IF;
END $$;

-- Turmas: Users can read turmas from their escola
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'turmas_select_escola') THEN
    CREATE POLICY turmas_select_escola ON turmas
      FOR SELECT TO authenticated
      USING (
        escola_id = (SELECT escola_id FROM users WHERE id = auth.uid())
        OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND tipo_usuario IN ('admin', 'gestor_sme'))
      );
  END IF;
END $$;

-- Alunos: Read through matriculas
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'alunos_select_via_matricula') THEN
    CREATE POLICY alunos_select_via_matricula ON alunos
      FOR SELECT TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM matriculas m
          JOIN turmas t ON t.id = m.turma_id
          WHERE m.aluno_id = alunos.id
          AND (
            t.escola_id = (SELECT escola_id FROM users WHERE id = auth.uid())
            OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND tipo_usuario IN ('admin', 'gestor_sme'))
          )
        )
      );
  END IF;
END $$;

-- Matriculas: Read from same escola
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'matriculas_select_escola') THEN
    CREATE POLICY matriculas_select_escola ON matriculas
      FOR SELECT TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM turmas t
          WHERE t.id = matriculas.turma_id
          AND (
            t.escola_id = (SELECT escola_id FROM users WHERE id = auth.uid())
            OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND tipo_usuario IN ('admin', 'gestor_sme'))
          )
        )
      );
  END IF;
END $$;

-- Frequencia: Read from same escola
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'frequencia_select_escola') THEN
    CREATE POLICY frequencia_select_escola ON frequencia
      FOR SELECT TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM matriculas m
          JOIN turmas t ON t.id = m.turma_id
          WHERE m.id = frequencia.matricula_id
          AND (
            t.escola_id = (SELECT escola_id FROM users WHERE id = auth.uid())
            OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND tipo_usuario IN ('admin', 'gestor_sme'))
          )
        )
      );
  END IF;
END $$;

-- Sessoes_aula: Read from same escola
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'sessoes_aula_select_escola') THEN
    CREATE POLICY sessoes_aula_select_escola ON sessoes_aula
      FOR SELECT TO authenticated
      USING (
        escola_id = (SELECT escola_id FROM users WHERE id = auth.uid())
        OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND tipo_usuario IN ('admin', 'gestor_sme'))
      );
  END IF;
END $$;

-- Audit_logs: Admin only
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'audit_logs_admin_only') THEN
    CREATE POLICY audit_logs_admin_only ON audit_logs
      FOR SELECT TO authenticated
      USING (
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND tipo_usuario IN ('admin', 'gestor_sme'))
      );
  END IF;
END $$;

-- =============================================================================
-- 18. Helper Functions
-- =============================================================================

-- Function: Check if user is admin
CREATE OR REPLACE FUNCTION auth_is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND tipo_usuario IN ('admin', 'gestor_sme')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Get current user role
CREATE OR REPLACE FUNCTION auth_get_user_role()
RETURNS TEXT AS $$
BEGIN
  RETURN (
    SELECT tipo_usuario FROM users WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Get current user escola
CREATE OR REPLACE FUNCTION auth_get_user_escola()
RETURNS UUID AS $$
BEGIN
  RETURN (
    SELECT escola_id FROM users WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Check if user has role or higher
CREATE OR REPLACE FUNCTION auth_has_role_or_higher(required_role TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  user_role TEXT;
  role_hierarchy TEXT[] := ARRAY['responsavel', 'professor', 'secretario', 'diretor', 'gestor_sme', 'admin'];
  required_idx INT;
  user_idx INT;
BEGIN
  SELECT tipo_usuario INTO user_role FROM users WHERE id = auth.uid();

  IF user_role IS NULL THEN
    RETURN false;
  END IF;

  required_idx := array_position(role_hierarchy, required_role);
  user_idx := array_position(role_hierarchy, user_role);

  IF required_idx IS NULL OR user_idx IS NULL THEN
    RETURN false;
  END IF;

  RETURN user_idx >= required_idx;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Check if session is editable
CREATE OR REPLACE FUNCTION is_session_editable(session_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  session_status TEXT;
  session_travada TIMESTAMPTZ;
BEGIN
  SELECT status, travada_em INTO session_status, session_travada
  FROM sessoes_aula WHERE id = session_id;

  IF session_travada IS NOT NULL THEN
    RETURN false;
  END IF;

  RETURN session_status IN ('aberta', 'em_andamento');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Get session phase
CREATE OR REPLACE FUNCTION get_session_phase(session_id UUID)
RETURNS TEXT AS $$
DECLARE
  session_record RECORD;
BEGIN
  SELECT * INTO session_record FROM sessoes_aula WHERE id = session_id;

  IF session_record.travada_em IS NOT NULL THEN
    RETURN 'travada';
  ELSIF session_record.fechada_em IS NOT NULL THEN
    RETURN 'fechada';
  ELSIF session_record.aberta_em IS NOT NULL THEN
    RETURN 'em_andamento';
  ELSE
    RETURN 'planejada';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- Migration complete
-- =============================================================================
