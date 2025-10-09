-- FASE 1.1: Habilitar RLS nas tabelas expostas (disciplinas e educacenso_exports)
-- Prioridade: CRÍTICA 🔴
-- Tempo estimado: 2 horas
-- Issue: 2 tabelas sem RLS habilitado - dados sensíveis expostos

-- ============================================================================
-- 1. HABILITAR RLS EM DISCIPLINAS
-- ============================================================================

ALTER TABLE public.disciplinas ENABLE ROW LEVEL SECURITY;

-- Policy: Apenas usuários da mesma escola podem ver disciplinas
CREATE POLICY "Users can view disciplines from their school"
  ON public.disciplinas
  FOR SELECT
  USING (
    escola_id IN (
      SELECT escola_id FROM public.users WHERE id = auth.uid()
    )
  );

-- Policy: Apenas admin e diretor podem criar disciplinas
CREATE POLICY "Admin and directors can create disciplines"
  ON public.disciplinas
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
        AND tipo_usuario IN ('admin', 'diretor')
        AND escola_id = disciplinas.escola_id
    )
  );

-- Policy: Apenas admin e diretor podem atualizar disciplinas
CREATE POLICY "Admin and directors can update disciplines"
  ON public.disciplinas
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
        AND tipo_usuario IN ('admin', 'diretor')
        AND escola_id = disciplinas.escola_id
    )
  );

-- Policy: Apenas admin pode deletar disciplinas
CREATE POLICY "Only admin can delete disciplines"
  ON public.disciplinas
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND tipo_usuario = 'admin'
    )
  );

-- ============================================================================
-- 2. HABILITAR RLS EM EDUCACENSO_EXPORTS
-- ============================================================================

ALTER TABLE public.educacenso_exports ENABLE ROW LEVEL SECURITY;

-- Policy: Apenas usuários da mesma escola podem ver exports
CREATE POLICY "Users can view exports from their school"
  ON public.educacenso_exports
  FOR SELECT
  USING (
    escola_id IN (
      SELECT escola_id FROM public.users WHERE id = auth.uid()
    )
  );

-- Policy: Apenas admin e diretor podem criar exports
CREATE POLICY "Admin and directors can create exports"
  ON public.educacenso_exports
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
        AND tipo_usuario IN ('admin', 'diretor')
        AND escola_id = educacenso_exports.escola_id
    )
  );

-- Policy: Apenas admin pode deletar exports
CREATE POLICY "Only admin can delete exports"
  ON public.educacenso_exports
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND tipo_usuario = 'admin'
    )
  );

-- ============================================================================
-- VALIDAÇÃO
-- ============================================================================

-- Verificar se RLS está habilitado
SELECT
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('disciplinas', 'educacenso_exports');

-- Deve retornar rls_enabled = true para ambas
