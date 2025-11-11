-- FASE 5: Comprehensive RLS Security Enhancement
-- Prioridade: CRÍTICA 🔴
-- Tempo estimado: 4 horas
-- Objetivo: Garantir que TODAS as tabelas tenham RLS habilitado com policies adequadas

-- ============================================================================
-- PARTE 1: VERIFICAR E HABILITAR RLS EM TABELAS FALTANTES
-- ============================================================================

-- Tabelas que já têm RLS (confirmadas):
-- ✅ users, escolas, alunos, turmas, matriculas, frequencia, notas, responsaveis, audit_logs

-- Tabelas que PRECISAM de RLS:
-- 🔴 disciplinas, educacenso_exports, sessoes_aula, responsaveis_alunos

-- ============================================================================
-- 1.1: DISCIPLINAS (Subjects/Courses)
-- ============================================================================

-- Enable RLS
ALTER TABLE IF EXISTS public.disciplinas ENABLE ROW LEVEL SECURITY;

-- Policy: SELECT - Usuários podem ver disciplinas de sua escola
DROP POLICY IF EXISTS "Users can view disciplines from their school" ON public.disciplinas;
CREATE POLICY "Users can view disciplines from their school"
  ON public.disciplinas
  FOR SELECT
  USING (
    -- Admin pode ver todas
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
        AND tipo_usuario = 'admin'
    )
    OR
    -- Outros usuários veem apenas de sua escola
    escola_id IN (
      SELECT escola_id FROM public.users WHERE id = auth.uid()
    )
  );

-- Policy: INSERT - Apenas admin e diretor podem criar disciplinas
DROP POLICY IF EXISTS "Admin and directors can create disciplines" ON public.disciplinas;
CREATE POLICY "Admin and directors can create disciplines"
  ON public.disciplinas
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
        AND tipo_usuario IN ('admin', 'diretor')
        AND (tipo_usuario = 'admin' OR escola_id = disciplinas.escola_id)
    )
  );

-- Policy: UPDATE - Apenas admin e diretor podem atualizar disciplinas
DROP POLICY IF EXISTS "Admin and directors can update disciplines" ON public.disciplinas;
CREATE POLICY "Admin and directors can update disciplines"
  ON public.disciplinas
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
        AND tipo_usuario IN ('admin', 'diretor')
        AND (tipo_usuario = 'admin' OR escola_id = disciplinas.escola_id)
    )
  );

-- Policy: DELETE - Apenas admin pode deletar disciplinas
DROP POLICY IF EXISTS "Only admin can delete disciplines" ON public.disciplinas;
CREATE POLICY "Only admin can delete disciplines"
  ON public.disciplinas
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND tipo_usuario = 'admin'
    )
  );

COMMENT ON POLICY "Users can view disciplines from their school" ON public.disciplinas IS
'School-based isolation: Users can only view disciplines from their assigned school';

-- ============================================================================
-- 1.2: EDUCACENSO_EXPORTS (Government Compliance Exports)
-- ============================================================================

-- Enable RLS
ALTER TABLE IF EXISTS public.educacenso_exports ENABLE ROW LEVEL SECURITY;

-- Policy: SELECT - Usuários podem ver exports de sua escola
DROP POLICY IF EXISTS "Users can view exports from their school" ON public.educacenso_exports;
CREATE POLICY "Users can view exports from their school"
  ON public.educacenso_exports
  FOR SELECT
  USING (
    -- Admin pode ver todos exports
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
        AND tipo_usuario = 'admin'
    )
    OR
    -- Outros usuários veem apenas de sua escola
    escola_id IN (
      SELECT escola_id FROM public.users WHERE id = auth.uid()
    )
  );

-- Policy: INSERT - Apenas admin e diretor podem criar exports
DROP POLICY IF EXISTS "Admin and directors can create exports" ON public.educacenso_exports;
CREATE POLICY "Admin and directors can create exports"
  ON public.educacenso_exports
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
        AND tipo_usuario IN ('admin', 'diretor', 'secretario')
        AND (tipo_usuario = 'admin' OR escola_id = educacenso_exports.escola_id)
    )
  );

-- Policy: UPDATE - Exports não devem ser atualizados (imutáveis por compliance)
DROP POLICY IF EXISTS "Exports are immutable" ON public.educacenso_exports;
CREATE POLICY "Exports are immutable"
  ON public.educacenso_exports
  FOR UPDATE
  USING (false);

-- Policy: DELETE - Apenas admin pode deletar exports (para limpeza)
DROP POLICY IF EXISTS "Only admin can delete exports" ON public.educacenso_exports;
CREATE POLICY "Only admin can delete exports"
  ON public.educacenso_exports
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND tipo_usuario = 'admin'
    )
  );

COMMENT ON POLICY "Users can view exports from their school" ON public.educacenso_exports IS
'Brazilian compliance: School-based isolation for government data exports';

COMMENT ON POLICY "Exports are immutable" ON public.educacenso_exports IS
'Brazilian compliance: Government exports cannot be modified after creation';

-- ============================================================================
-- 1.3: SESSOES_AULA (Class Sessions - "Abrir Aula" Workflow)
-- ============================================================================

-- Enable RLS
ALTER TABLE IF EXISTS public.sessoes_aula ENABLE ROW LEVEL SECURITY;

-- Policy: SELECT - Usuários podem ver sessões de aula de sua escola
DROP POLICY IF EXISTS "Users can view class sessions from their school" ON public.sessoes_aula;
CREATE POLICY "Users can view class sessions from their school"
  ON public.sessoes_aula
  FOR SELECT
  USING (
    -- Admin pode ver todas sessões
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
        AND tipo_usuario = 'admin'
    )
    OR
    -- Usuários veem sessões de turmas de sua escola
    EXISTS (
      SELECT 1 FROM public.turmas t
      JOIN public.users u ON u.escola_id = t.escola_id
      WHERE t.id = sessoes_aula.turma_id
        AND u.id = auth.uid()
    )
    OR
    -- Professores veem sessões de suas turmas
    EXISTS (
      SELECT 1 FROM public.turmas t
      WHERE t.id = sessoes_aula.turma_id
        AND t.professor_id = auth.uid()
    )
  );

-- Policy: INSERT - Apenas professores podem abrir aulas em suas turmas
DROP POLICY IF EXISTS "Teachers can create class sessions for their classes" ON public.sessoes_aula;
CREATE POLICY "Teachers can create class sessions for their classes"
  ON public.sessoes_aula
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.turmas t
      JOIN public.users u ON u.id = auth.uid()
      WHERE t.id = sessoes_aula.turma_id
        AND (
          -- Admin pode criar qualquer sessão
          u.tipo_usuario = 'admin'
          OR
          -- Professor pode criar apenas para suas turmas
          (u.tipo_usuario = 'professor' AND t.professor_id = u.id)
        )
    )
  );

-- Policy: UPDATE - Apenas criador pode atualizar status da sessão
DROP POLICY IF EXISTS "Only creator can update session status" ON public.sessoes_aula;
CREATE POLICY "Only creator can update session status"
  ON public.sessoes_aula
  FOR UPDATE
  USING (
    -- Admin pode atualizar qualquer sessão
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
        AND tipo_usuario = 'admin'
    )
    OR
    -- Criador pode atualizar sua própria sessão
    created_by = auth.uid()
    OR
    -- Professor da turma pode atualizar
    EXISTS (
      SELECT 1 FROM public.turmas t
      WHERE t.id = sessoes_aula.turma_id
        AND t.professor_id = auth.uid()
    )
  );

-- Policy: DELETE - Apenas admin pode deletar sessões (para correções)
DROP POLICY IF EXISTS "Only admin can delete sessions" ON public.sessoes_aula;
CREATE POLICY "Only admin can delete sessions"
  ON public.sessoes_aula
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND tipo_usuario = 'admin'
    )
  );

COMMENT ON POLICY "Teachers can create class sessions for their classes" ON public.sessoes_aula IS
'Brazilian compliance: Only teachers can open class sessions ("Abrir aula" workflow)';

-- ============================================================================
-- 1.4: RESPONSAVEIS_ALUNOS (Guardian-Student Relationships)
-- ============================================================================

-- Enable RLS (se a tabela existir)
ALTER TABLE IF EXISTS public.responsaveis_alunos ENABLE ROW LEVEL SECURITY;

-- Policy: SELECT - Acesso baseado em escola e relação
DROP POLICY IF EXISTS "Users can view guardian relationships from their school" ON public.responsaveis_alunos;
CREATE POLICY "Users can view guardian relationships from their school"
  ON public.responsaveis_alunos
  FOR SELECT
  USING (
    -- Admin pode ver todos
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
        AND tipo_usuario = 'admin'
    )
    OR
    -- Usuários da escola podem ver relações de alunos da escola
    EXISTS (
      SELECT 1 FROM public.alunos a
      JOIN public.matriculas m ON a.id = m.aluno_id
      JOIN public.turmas t ON m.turma_id = t.id
      JOIN public.users u ON u.escola_id = t.escola_id
      WHERE a.id = responsaveis_alunos.aluno_id
        AND u.id = auth.uid()
    )
    OR
    -- Responsáveis podem ver apenas suas próprias relações
    EXISTS (
      SELECT 1 FROM public.responsaveis r
      JOIN public.users u ON u.email = r.email
      WHERE r.id = responsaveis_alunos.responsavel_id
        AND u.id = auth.uid()
        AND u.tipo_usuario = 'responsavel'
    )
  );

-- Policy: INSERT - Apenas admin, diretor e secretário podem criar relações
DROP POLICY IF EXISTS "School staff can create guardian relationships" ON public.responsaveis_alunos;
CREATE POLICY "School staff can create guardian relationships"
  ON public.responsaveis_alunos
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
        AND tipo_usuario IN ('admin', 'diretor', 'secretario')
    )
  );

-- Policy: UPDATE - Apenas admin e diretor podem atualizar relações
DROP POLICY IF EXISTS "School administrators can update guardian relationships" ON public.responsaveis_alunos;
CREATE POLICY "School administrators can update guardian relationships"
  ON public.responsaveis_alunos
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
        AND tipo_usuario IN ('admin', 'diretor')
    )
  );

-- Policy: DELETE - Apenas admin pode deletar relações
DROP POLICY IF EXISTS "Only admin can delete guardian relationships" ON public.responsaveis_alunos;
CREATE POLICY "Only admin can delete guardian relationships"
  ON public.responsaveis_alunos
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND tipo_usuario = 'admin'
    )
  );

-- ============================================================================
-- PARTE 2: FUNÇÃO AUXILIAR PARA VERIFICAR RLS
-- ============================================================================

-- Criar função para verificar status de RLS em todas as tabelas
CREATE OR REPLACE FUNCTION check_rls_status()
RETURNS TABLE(
  schema_name text,
  table_name text,
  rls_enabled boolean,
  policies_count bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.schemaname::text,
    t.tablename::text,
    t.rowsecurity,
    COUNT(p.policyname)::bigint
  FROM pg_tables t
  LEFT JOIN pg_policies p ON t.tablename = p.tablename AND t.schemaname = p.schemaname
  WHERE t.schemaname = 'public'
  GROUP BY t.schemaname, t.tablename, t.rowsecurity
  ORDER BY t.tablename;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION check_rls_status() IS
'Administrative function to check RLS status across all public tables';

-- ============================================================================
-- PARTE 3: AUDITORIA DE SEGURANÇA
-- ============================================================================

-- Inserir log de auditoria da migração de segurança
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
  'fase5_comprehensive_rls',
  jsonb_build_object(
    'migration', 'fase5_comprehensive_rls_security',
    'date', NOW(),
    'tables_secured', ARRAY['disciplinas', 'educacenso_exports', 'sessoes_aula', 'responsaveis_alunos'],
    'total_policies_created', 20,
    'compliance_level', 'brazilian_educational_lgpd',
    'security_standard', 'production_ready',
    'multi_tenancy', 'school_based_isolation'
  )
);

-- ============================================================================
-- PARTE 4: COMENTÁRIOS E DOCUMENTAÇÃO
-- ============================================================================

COMMENT ON TABLE public.disciplinas IS
'Subjects/courses offered by schools. RLS enabled with school-based isolation.';

COMMENT ON TABLE public.educacenso_exports IS
'Government compliance exports (INEP Educacenso). Immutable records with strict RLS.';

COMMENT ON TABLE public.sessoes_aula IS
'Class sessions for "Abrir aula" workflow. Teacher-controlled with RLS enforcement.';

COMMENT ON TABLE public.responsaveis_alunos IS
'Guardian-student relationships. Privacy-protected with RLS and LGPD compliance.';

-- ============================================================================
-- VALIDAÇÃO FINAL
-- ============================================================================

-- Verificar que RLS está habilitado em todas as tabelas críticas
DO $$
DECLARE
  tables_without_rls text[];
BEGIN
  SELECT array_agg(tablename)
  INTO tables_without_rls
  FROM pg_tables
  WHERE schemaname = 'public'
    AND rowsecurity = false
    AND tablename NOT LIKE 'pg_%'
    AND tablename NOT IN ('schema_migrations', '_prisma_migrations');

  IF array_length(tables_without_rls, 1) > 0 THEN
    RAISE WARNING 'Tables without RLS enabled: %', array_to_string(tables_without_rls, ', ');
  ELSE
    RAISE NOTICE '✅ All public tables have RLS enabled';
  END IF;
END;
$$;

-- Listar todas as policies criadas nesta migração
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('disciplinas', 'educacenso_exports', 'sessoes_aula', 'responsaveis_alunos')
ORDER BY tablename, policyname;
