-- ============================================================================
-- Migration: Onboarding Robusto + Role Switcher Enhancement
-- Data: 2025-10-09
-- Descrição:
--   1. Adiciona campos para primeiro login (primeiro_login, senha_padrao)
--   2. Expande tipos de usuário (secretaria_educacao, coordenador_pedagogico)
--   3. Corrige políticas RLS conflitantes
--   4. Implementa segurança enterprise para role switcher
-- ============================================================================

-- ============================================================================
-- PARTE 1: ALTERAÇÕES DE SCHEMA
-- ============================================================================

-- 1.1: Adicionar novos campos na tabela users
ALTER TABLE users
ADD COLUMN IF NOT EXISTS primeiro_login BOOLEAN DEFAULT false;

ALTER TABLE users
ADD COLUMN IF NOT EXISTS senha_padrao BOOLEAN DEFAULT false;

ALTER TABLE users
ADD COLUMN IF NOT EXISTS data_ultimo_acesso TIMESTAMPTZ;

ALTER TABLE users
ADD COLUMN IF NOT EXISTS wizard_completed BOOLEAN DEFAULT false;

-- 1.2: Adicionar campo email na tabela escolas (se não existir)
ALTER TABLE escolas
ADD COLUMN IF NOT EXISTS email TEXT;

-- 1.3: Expandir tipos de usuário
ALTER TABLE users
DROP CONSTRAINT IF EXISTS users_tipo_usuario_check;

ALTER TABLE users
ADD CONSTRAINT users_tipo_usuario_check
CHECK (tipo_usuario IN (
  'admin',
  'diretor',
  'secretario',
  'professor',
  'responsavel',
  'secretaria_educacao',
  'coordenador_pedagogico'
));

-- ============================================================================
-- PARTE 2: POLÍTICAS RLS - ESCOLAS
-- ============================================================================

-- 2.1: Remover políticas conflitantes antigas
DROP POLICY IF EXISTS "escolas_access_control" ON escolas;
DROP POLICY IF EXISTS "Todos podem ver escolas ativas" ON escolas;
DROP POLICY IF EXISTS "Diretores podem ver sua escola" ON escolas;
DROP POLICY IF EXISTS "escolas_select_authenticated" ON escolas;
DROP POLICY IF EXISTS "escolas_insert_authenticated" ON escolas;
DROP POLICY IF EXISTS "escolas_insert_admin_only" ON escolas;
DROP POLICY IF EXISTS "escolas_update_authorized" ON escolas;

-- 2.2: SELECT - Usuários autenticados podem ver escolas
CREATE POLICY "escolas_select_policy"
  ON escolas FOR SELECT
  TO authenticated
  USING (
    -- Escolas ativas visíveis para todos
    ativo = true
    OR
    -- Admin e secretaria educação veem todas as escolas
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND tipo_usuario IN ('admin', 'secretaria_educacao')
    )
    OR
    -- Diretor vê sua própria escola
    diretor_id = auth.uid()
    OR
    -- Usuários da escola podem ver sua escola
    id IN (
      SELECT escola_id FROM users WHERE id = auth.uid()
    )
  );

-- 2.3: INSERT - Apenas admin pode criar escolas
CREATE POLICY "escolas_insert_policy"
  ON escolas FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND tipo_usuario = 'admin'
    )
  );

-- 2.4: UPDATE - Admin ou diretor da própria escola
CREATE POLICY "escolas_update_policy"
  ON escolas FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND (
        tipo_usuario = 'admin'
        OR (tipo_usuario = 'diretor' AND users.escola_id = escolas.id)
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND (
        tipo_usuario = 'admin'
        OR (tipo_usuario = 'diretor' AND users.escola_id = escolas.id)
      )
    )
  );

-- 2.5: DELETE - Apenas admin (soft delete preferível)
CREATE POLICY "escolas_delete_policy"
  ON escolas FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND tipo_usuario = 'admin'
    )
  );

-- ============================================================================
-- PARTE 3: POLÍTICAS RLS - USERS
-- ============================================================================

-- 3.1: Remover políticas conflitantes antigas
DROP POLICY IF EXISTS "Usuários podem ver próprio perfil" ON users;
DROP POLICY IF EXISTS "Admins podem ver todos os usuários" ON users;
DROP POLICY IF EXISTS "users_insert_onboarding" ON users;
DROP POLICY IF EXISTS "users_insert_admin_or_self" ON users;
DROP POLICY IF EXISTS "users_update_authorized" ON users;
DROP POLICY IF EXISTS "users_update_self_or_admin" ON users;

-- 3.2: SELECT - Usuário vê próprio perfil + admin vê todos
CREATE POLICY "users_select_policy"
  ON users FOR SELECT
  TO authenticated
  USING (
    -- Usuário vê próprio perfil
    id = auth.uid()
    OR
    -- Admin vê todos
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND tipo_usuario = 'admin'
    )
    OR
    -- Diretor vê usuários da sua escola
    EXISTS (
      SELECT 1 FROM users AS u
      WHERE u.id = auth.uid()
      AND u.tipo_usuario = 'diretor'
      AND u.escola_id = users.escola_id
    )
    OR
    -- Secretário vê usuários da sua escola
    EXISTS (
      SELECT 1 FROM users AS u
      WHERE u.id = auth.uid()
      AND u.tipo_usuario = 'secretario'
      AND u.escola_id = users.escola_id
    )
  );

-- 3.3: INSERT - Admin cria usuários OU usuário cria próprio registro (onboarding)
CREATE POLICY "users_insert_policy"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Usuário pode inserir próprio registro (durante onboarding)
    id = auth.uid()
    OR
    -- Admin pode criar qualquer usuário
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND tipo_usuario = 'admin'
    )
  );

-- 3.4: UPDATE - Usuário atualiza próprio perfil + admin atualiza qualquer um
CREATE POLICY "users_update_policy"
  ON users FOR UPDATE
  TO authenticated
  USING (
    -- Usuário atualiza próprio perfil
    id = auth.uid()
    OR
    -- Admin atualiza qualquer usuário
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND tipo_usuario = 'admin'
    )
  )
  WITH CHECK (
    -- Mesmas regras para o estado final
    id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND tipo_usuario = 'admin'
    )
  );

-- 3.5: DELETE - Apenas admin (soft delete preferível)
CREATE POLICY "users_delete_policy"
  ON users FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND tipo_usuario = 'admin'
    )
  );

-- ============================================================================
-- PARTE 4: COMENTÁRIOS DE DOCUMENTAÇÃO
-- ============================================================================

COMMENT ON COLUMN users.primeiro_login IS
  'Indica se usuário precisa completar perfil no primeiro acesso. Após completar perfil, este campo é atualizado para false.';

COMMENT ON COLUMN users.senha_padrao IS
  'Indica se usuário está usando senha padrão (ex: Fronteira@2025). Força troca de senha no primeiro login.';

COMMENT ON COLUMN users.data_ultimo_acesso IS
  'Timestamp do último acesso do usuário ao sistema. Atualizado a cada login.';

COMMENT ON POLICY "escolas_select_policy" ON escolas IS
  'Escolas ativas são visíveis para todos. Admin e secretaria_educacao veem todas. Diretor vê sua escola. Usuários veem escola à qual pertencem.';

COMMENT ON POLICY "escolas_insert_policy" ON escolas IS
  'Apenas administradores podem criar novas escolas no sistema.';

COMMENT ON POLICY "users_insert_policy" ON users IS
  'Permite que admin crie usuários via seed/interface OU que usuário crie próprio registro durante onboarding (id = auth.uid()).';

COMMENT ON POLICY "users_update_policy" ON users IS
  'Usuário pode atualizar próprio perfil (incluindo primeiro login). Admin pode atualizar qualquer usuário.';

-- ============================================================================
-- PARTE 5: ÍNDICES PARA PERFORMANCE
-- ============================================================================

-- Índice para consultas por primeiro_login (usado no middleware)
CREATE INDEX IF NOT EXISTS idx_users_primeiro_login
  ON users(primeiro_login)
  WHERE primeiro_login = true;

-- Índice para consultas por senha_padrao
CREATE INDEX IF NOT EXISTS idx_users_senha_padrao
  ON users(senha_padrao)
  WHERE senha_padrao = true;

-- Índice para consultas por data_ultimo_acesso (relatórios de auditoria)
CREATE INDEX IF NOT EXISTS idx_users_data_ultimo_acesso
  ON users(data_ultimo_acesso DESC);

-- ============================================================================
-- PARTE 6: TRIGGER PARA ATUALIZAR DATA_ULTIMO_ACESSO (OPCIONAL)
-- ============================================================================

-- Criar função para atualizar data_ultimo_acesso
CREATE OR REPLACE FUNCTION update_data_ultimo_acesso()
RETURNS TRIGGER AS $$
BEGIN
  NEW.data_ultimo_acesso = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger que dispara a cada UPDATE na tabela users (exceto se já foi atualizado recentemente)
DROP TRIGGER IF EXISTS trigger_update_data_ultimo_acesso ON users;
CREATE TRIGGER trigger_update_data_ultimo_acesso
  BEFORE UPDATE ON users
  FOR EACH ROW
  WHEN (
    NEW.data_ultimo_acesso IS NULL
    OR OLD.data_ultimo_acesso IS NULL
    OR NEW.data_ultimo_acesso < NOW() - INTERVAL '5 minutes'
  )
  EXECUTE FUNCTION update_data_ultimo_acesso();

-- ============================================================================
-- FIM DA MIGRATION
-- ============================================================================

-- Log de conclusão
DO $$
BEGIN
  RAISE NOTICE '✅ Migration 20251009000000_onboarding_and_roles_enhancement aplicada com sucesso!';
  RAISE NOTICE '📌 Novos campos: primeiro_login, senha_padrao, data_ultimo_acesso';
  RAISE NOTICE '📌 Novos roles: secretaria_educacao, coordenador_pedagogico';
  RAISE NOTICE '📌 Políticas RLS atualizadas e otimizadas';
  RAISE NOTICE '📌 Pronto para executar: bun run seed:superadmin';
END $$;
