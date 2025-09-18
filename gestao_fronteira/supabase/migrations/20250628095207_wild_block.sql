/*
  # Schema completo para Sistema de Gestão Escolar - Fronteira/MG

  1. Novas Tabelas
    - `users` - Usuários do sistema com diferentes perfis
    - `escolas` - Unidades escolares do município
    - `alunos` - Cadastro completo dos estudantes
    - `responsaveis` - Responsáveis pelos alunos
    - `turmas` - Classes organizadas por série e escola
    - `matriculas` - Vínculos entre alunos e turmas
    - `frequencia` - Controle diário de presença
    - `notas` - Avaliações e notas dos alunos

  2. Segurança
    - RLS habilitado em todas as tabelas
    - Políticas específicas por tipo de usuário
    - Restrições de acesso baseadas em perfil e escola

  3. Relacionamentos
    - Foreign keys para garantir integridade
    - Índices para otimizar consultas
    - Constraints para validação de dados
*/

-- Criar extensão para UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tabela de usuários (profiles)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE,
  nome TEXT NOT NULL,
  tipo_usuario TEXT NOT NULL CHECK (tipo_usuario IN ('admin', 'diretor', 'secretario', 'professor', 'responsavel')),
  escola_id UUID,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de escolas
CREATE TABLE IF NOT EXISTS escolas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome TEXT NOT NULL,
  codigo TEXT UNIQUE NOT NULL,
  endereco TEXT,
  telefone TEXT,
  tipo TEXT NOT NULL CHECK (tipo IN ('creche', 'pre_escola', 'fundamental')),
  diretor_id UUID,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de responsáveis
CREATE TABLE IF NOT EXISTS responsaveis (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome TEXT NOT NULL,
  cpf TEXT UNIQUE NOT NULL,
  telefone TEXT,
  email TEXT,
  parentesco TEXT NOT NULL,
  endereco TEXT,
  profissao TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de alunos
CREATE TABLE IF NOT EXISTS alunos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome_completo TEXT NOT NULL,
  data_nascimento DATE NOT NULL,
  cpf TEXT UNIQUE,
  rg TEXT,
  sexo TEXT NOT NULL CHECK (sexo IN ('M', 'F')),
  endereco TEXT,
  telefone TEXT,
  email TEXT,
  nome_mae TEXT,
  nome_pai TEXT,
  responsavel_id UUID REFERENCES responsaveis(id),
  necessidades_especiais TEXT,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de turmas
CREATE TABLE IF NOT EXISTS turmas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome TEXT NOT NULL,
  ano_letivo INTEGER NOT NULL,
  serie TEXT NOT NULL,
  escola_id UUID NOT NULL REFERENCES escolas(id),
  professor_id UUID REFERENCES users(id),
  capacidade INTEGER NOT NULL DEFAULT 25,
  turno TEXT NOT NULL CHECK (turno IN ('matutino', 'vespertino', 'integral')),
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de matrículas
CREATE TABLE IF NOT EXISTS matriculas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  aluno_id UUID NOT NULL REFERENCES alunos(id),
  turma_id UUID NOT NULL REFERENCES turmas(id),
  ano_letivo INTEGER NOT NULL,
  data_matricula DATE NOT NULL DEFAULT CURRENT_DATE,
  situacao TEXT NOT NULL DEFAULT 'ativa' CHECK (situacao IN ('ativa', 'transferida', 'concluida', 'cancelada')),
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(aluno_id, turma_id, ano_letivo)
);

-- Tabela de frequência
CREATE TABLE IF NOT EXISTS frequencia (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  matricula_id UUID NOT NULL REFERENCES matriculas(id),
  data_aula DATE NOT NULL,
  presente BOOLEAN NOT NULL DEFAULT false,
  justificativa TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(matricula_id, data_aula)
);

-- Tabela de notas
CREATE TABLE IF NOT EXISTS notas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  matricula_id UUID NOT NULL REFERENCES matriculas(id),
  disciplina TEXT NOT NULL,
  bimestre INTEGER NOT NULL CHECK (bimestre BETWEEN 1 AND 4),
  nota DECIMAL(4,2) NOT NULL CHECK (nota BETWEEN 0 AND 10),
  tipo_avaliacao TEXT NOT NULL,
  data_avaliacao DATE NOT NULL,
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Adicionar foreign keys que dependem de outras tabelas
ALTER TABLE users ADD CONSTRAINT fk_users_escola FOREIGN KEY (escola_id) REFERENCES escolas(id);
ALTER TABLE escolas ADD CONSTRAINT fk_escolas_diretor FOREIGN KEY (diretor_id) REFERENCES users(id);

-- Criar índices para otimização
CREATE INDEX IF NOT EXISTS idx_users_escola ON users(escola_id);
CREATE INDEX IF NOT EXISTS idx_users_tipo ON users(tipo_usuario);
CREATE INDEX IF NOT EXISTS idx_alunos_responsavel ON alunos(responsavel_id);
CREATE INDEX IF NOT EXISTS idx_turmas_escola ON turmas(escola_id);
CREATE INDEX IF NOT EXISTS idx_turmas_professor ON turmas(professor_id);
CREATE INDEX IF NOT EXISTS idx_matriculas_aluno ON matriculas(aluno_id);
CREATE INDEX IF NOT EXISTS idx_matriculas_turma ON matriculas(turma_id);
CREATE INDEX IF NOT EXISTS idx_frequencia_matricula ON frequencia(matricula_id);
CREATE INDEX IF NOT EXISTS idx_notas_matricula ON notas(matricula_id);

-- Habilitar RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE escolas ENABLE ROW LEVEL SECURITY;
ALTER TABLE alunos ENABLE ROW LEVEL SECURITY;
ALTER TABLE responsaveis ENABLE ROW LEVEL SECURITY;
ALTER TABLE turmas ENABLE ROW LEVEL SECURITY;
ALTER TABLE matriculas ENABLE ROW LEVEL SECURITY;
ALTER TABLE frequencia ENABLE ROW LEVEL SECURITY;
ALTER TABLE notas ENABLE ROW LEVEL SECURITY;

-- Políticas de segurança para users
CREATE POLICY "Usuários podem ver próprio perfil"
  ON users FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Admins podem ver todos os usuários"
  ON users FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND tipo_usuario = 'admin'
    )
  );

-- Políticas para escolas
CREATE POLICY "Todos podem ver escolas ativas"
  ON escolas FOR SELECT
  TO authenticated
  USING (ativo = true);

CREATE POLICY "Diretores podem ver sua escola"
  ON escolas FOR SELECT
  TO authenticated
  USING (
    diretor_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND tipo_usuario IN ('admin', 'secretario')
    )
  );

-- Políticas para alunos
CREATE POLICY "Usuários autenticados podem ver alunos"
  ON alunos FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND tipo_usuario IN ('admin', 'secretario', 'diretor', 'professor')
    )
  );

-- Políticas para responsáveis
CREATE POLICY "Usuários podem ver responsáveis"
  ON responsaveis FOR SELECT
  TO authenticated
  USING (true);

-- Políticas para turmas
CREATE POLICY "Usuários podem ver turmas"
  ON turmas FOR SELECT
  TO authenticated
  USING (true);

-- Políticas para matrículas
CREATE POLICY "Usuários podem ver matrículas"
  ON matriculas FOR SELECT
  TO authenticated
  USING (true);

-- Políticas para frequência
CREATE POLICY "Usuários podem ver frequência"
  ON frequencia FOR SELECT
  TO authenticated
  USING (true);

-- Políticas para notas
CREATE POLICY "Usuários podem ver notas"
  ON notas FOR SELECT
  TO authenticated
  USING (true);

-- Inserir dados de exemplo
INSERT INTO escolas (id, nome, codigo, endereco, telefone, tipo) VALUES
  ('550e8400-e29b-41d4-a716-446655440001', 'CEMEI Pequenos Passos', 'FRT001', 'Rua das Flores, 123 - Centro', '(34) 3555-0001', 'creche'),
  ('550e8400-e29b-41d4-a716-446655440002', 'EMEI Jardim da Infância', 'FRT002', 'Av. Educação, 456 - Vila Nova', '(34) 3555-0002', 'pre_escola'),
  ('550e8400-e29b-41d4-a716-446655440003', 'EMEF Professor João Silva', 'FRT003', 'Praça da Escola, 789 - São José', '(34) 3555-0003', 'fundamental');

INSERT INTO users (id, email, nome, tipo_usuario, escola_id) VALUES
  ('550e8400-e29b-41d4-a716-446655440010', 'admin@fronteira.mg.gov.br', 'Administrador do Sistema', 'admin', null),
  ('550e8400-e29b-41d4-a716-446655440011', 'maria.santos@fronteira.mg.gov.br', 'Maria Santos', 'diretor', '550e8400-e29b-41d4-a716-446655440001'),
  ('550e8400-e29b-41d4-a716-446655440012', 'carlos.oliveira@fronteira.mg.gov.br', 'Carlos Oliveira', 'diretor', '550e8400-e29b-41d4-a716-446655440002'),
  ('550e8400-e29b-41d4-a716-446655440013', 'ana.pereira@fronteira.mg.gov.br', 'Ana Pereira', 'diretor', '550e8400-e29b-41d4-a716-446655440003');

-- Atualizar diretores das escolas
UPDATE escolas SET diretor_id = '550e8400-e29b-41d4-a716-446655440011' WHERE id = '550e8400-e29b-41d4-a716-446655440001';
UPDATE escolas SET diretor_id = '550e8400-e29b-41d4-a716-446655440012' WHERE id = '550e8400-e29b-41d4-a716-446655440002';
UPDATE escolas SET diretor_id = '550e8400-e29b-41d4-a716-446655440013' WHERE id = '550e8400-e29b-41d4-a716-446655440003';

INSERT INTO responsaveis (id, nome, cpf, telefone, email, parentesco) VALUES
  ('650e8400-e29b-41d4-a716-446655440001', 'José da Silva', '12345678901', '(34) 99999-0001', 'jose.silva@email.com', 'Pai'),
  ('650e8400-e29b-41d4-a716-446655440002', 'Maria Oliveira', '12345678902', '(34) 99999-0002', 'maria.oliveira@email.com', 'Mãe'),
  ('650e8400-e29b-41d4-a716-446655440003', 'Carlos Santos', '12345678903', '(34) 99999-0003', 'carlos.santos@email.com', 'Pai');

INSERT INTO alunos (id, nome_completo, data_nascimento, cpf, sexo, nome_mae, nome_pai, responsavel_id) VALUES
  ('750e8400-e29b-41d4-a716-446655440001', 'Pedro Silva Santos', '2020-03-15', null, 'M', 'Ana Silva', 'José Santos', '650e8400-e29b-41d4-a716-446655440001'),
  ('750e8400-e29b-41d4-a716-446655440002', 'Julia Oliveira Costa', '2019-07-22', null, 'F', 'Maria Oliveira', 'João Costa', '650e8400-e29b-41d4-a716-446655440002'),
  ('750e8400-e29b-41d4-a716-446655440003', 'Lucas Santos Pereira', '2015-11-08', '12345678904', 'M', 'Carmen Santos', 'Carlos Pereira', '650e8400-e29b-41d4-a716-446655440003');

INSERT INTO turmas (id, nome, ano_letivo, serie, escola_id, capacidade, turno) VALUES
  ('850e8400-e29b-41d4-a716-446655440001', 'Berçário A', 2024, 'Berçário', '550e8400-e29b-41d4-a716-446655440001', 15, 'integral'),
  ('850e8400-e29b-41d4-a716-446655440002', 'Maternal B', 2024, 'Maternal', '550e8400-e29b-41d4-a716-446655440001', 20, 'matutino'),
  ('850e8400-e29b-41d4-a716-446655440003', 'Pré I A', 2024, 'Pré I', '550e8400-e29b-41d4-a716-446655440002', 25, 'matutino'),
  ('850e8400-e29b-41d4-a716-446655440004', '5º Ano A', 2024, '5º Ano', '550e8400-e29b-41d4-a716-446655440003', 30, 'matutino');

INSERT INTO matriculas (id, aluno_id, turma_id, ano_letivo, data_matricula, situacao) VALUES
  ('950e8400-e29b-41d4-a716-446655440001', '750e8400-e29b-41d4-a716-446655440001', '850e8400-e29b-41d4-a716-446655440001', 2024, '2024-02-01', 'ativa'),
  ('950e8400-e29b-41d4-a716-446655440002', '750e8400-e29b-41d4-a716-446655440002', '850e8400-e29b-41d4-a716-446655440003', 2024, '2024-02-01', 'ativa'),
  ('950e8400-e29b-41d4-a716-446655440003', '750e8400-e29b-41d4-a716-446655440003', '850e8400-e29b-41d4-a716-446655440004', 2024, '2024-02-01', 'ativa');