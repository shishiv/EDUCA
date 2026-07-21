-- Lesson content linked to official class sessions.

BEGIN;

CREATE TABLE IF NOT EXISTS public.conteudo_aula (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sessao_id uuid NOT NULL UNIQUE REFERENCES public.sessoes_aula(id) ON DELETE CASCADE,
  tema text NOT NULL,
  objetivo text NOT NULL,
  habilidades_bncc text[] NOT NULL DEFAULT '{}',
  metodologia text,
  recursos text,
  observacoes text,
  created_by uuid REFERENCES public.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_conteudo_aula_sessao ON public.conteudo_aula(sessao_id);
CREATE INDEX IF NOT EXISTS idx_conteudo_aula_bncc ON public.conteudo_aula USING gin(habilidades_bncc);

ALTER TABLE public.conteudo_aula ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.conteudo_aula TO authenticated;
GRANT ALL ON public.conteudo_aula TO service_role;

DROP POLICY IF EXISTS conteudo_aula_select_authorized ON public.conteudo_aula;
CREATE POLICY conteudo_aula_select_authorized ON public.conteudo_aula
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.sessoes_aula s
      WHERE s.id = conteudo_aula.sessao_id
        AND public.can_access_class(s.turma_id)
    )
  );

DROP POLICY IF EXISTS conteudo_aula_manage_authorized ON public.conteudo_aula;
CREATE POLICY conteudo_aula_manage_authorized ON public.conteudo_aula
  FOR ALL TO authenticated
  USING (
    public.has_any_role('admin', 'diretor', 'professor')
    AND EXISTS (
      SELECT 1 FROM public.sessoes_aula s
      WHERE s.id = conteudo_aula.sessao_id
        AND public.can_access_class(s.turma_id)
    )
  )
  WITH CHECK (
    public.has_any_role('admin', 'diretor', 'professor')
    AND EXISTS (
      SELECT 1 FROM public.sessoes_aula s
      WHERE s.id = conteudo_aula.sessao_id
        AND public.can_access_class(s.turma_id)
    )
  );

DROP POLICY IF EXISTS conteudo_aula_admin ON public.conteudo_aula;
CREATE POLICY conteudo_aula_admin ON public.conteudo_aula
  FOR ALL TO authenticated
  USING (public.has_any_role('admin', 'gestor_sme'))
  WITH CHECK (public.has_any_role('admin', 'gestor_sme'));

COMMIT;
