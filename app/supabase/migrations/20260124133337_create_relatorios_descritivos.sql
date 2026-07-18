-- Relatorios Descritivos table for BNCC Campos de Experiencia reports
-- Referenced by: gestao_fronteira/app/(dashboard)/dashboard/alunos/[id]/diario/relatorio/page.tsx
-- Migration: 20260124133337_create_relatorios_descritivos
-- Phase: 18-01 Database Types Regeneration

CREATE TABLE IF NOT EXISTS public.relatorios_descritivos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  matricula_id uuid NOT NULL REFERENCES public.matriculas(id) ON DELETE RESTRICT,
  turma_id uuid NOT NULL REFERENCES public.turmas(id) ON DELETE RESTRICT,
  professor_id uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  ano_letivo integer NOT NULL,
  semestre text NOT NULL CHECK (semestre IN ('primeiro', 'segundo')),
  status text NOT NULL DEFAULT 'rascunho' CHECK (status IN ('rascunho', 'finalizado')),

  -- BNCC Campos de Experiencia da Educacao Infantil
  campo_eu_outro_nos text,      -- "O eu, o outro e o nos"
  campo_corpo_gestos text,      -- "Corpo, gestos e movimentos"
  campo_tracos_sons text,       -- "Tracos, sons, cores e formas"
  campo_escuta_fala text,       -- "Escuta, fala, pensamento e imaginacao"
  campo_espacos_tempos text,    -- "Espacos, tempos, quantidades..."

  observacoes_gerais text,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES public.users(id),
  finalizado_em timestamptz,
  finalizado_por uuid REFERENCES public.users(id),

  UNIQUE(matricula_id, ano_letivo, semestre)
);

-- Index for common query patterns
CREATE INDEX IF NOT EXISTS idx_relatorios_descritivos_matricula ON public.relatorios_descritivos(matricula_id);
CREATE INDEX IF NOT EXISTS idx_relatorios_descritivos_turma ON public.relatorios_descritivos(turma_id);
CREATE INDEX IF NOT EXISTS idx_relatorios_descritivos_professor ON public.relatorios_descritivos(professor_id);
CREATE INDEX IF NOT EXISTS idx_relatorios_descritivos_ano_semestre ON public.relatorios_descritivos(ano_letivo, semestre);

-- Enable RLS
ALTER TABLE public.relatorios_descritivos ENABLE ROW LEVEL SECURITY;

-- RLS Policies (follow sessoes_aula pattern)
-- Professors can manage reports for their turmas
CREATE POLICY "Professors can manage reports for their turmas"
  ON public.relatorios_descritivos
  FOR ALL
  USING (
    professor_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.turmas t
      WHERE t.id = relatorios_descritivos.turma_id
      AND t.professor_id = auth.uid()
    )
  );

-- Directors/Secretarios can view reports from their escola
CREATE POLICY "Directors can view reports from their escola"
  ON public.relatorios_descritivos
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.turmas t
      JOIN public.escolas e ON t.escola_id = e.id
      JOIN public.users u ON u.escola_id = e.id
      WHERE t.id = relatorios_descritivos.turma_id
      AND u.id = auth.uid()
      AND u.tipo_usuario IN ('diretor', 'secretario', 'coordenador_pedagogico')
    )
  );

-- Admin can view all reports
CREATE POLICY "Admin can view all reports"
  ON public.relatorios_descritivos
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
      AND u.tipo_usuario IN ('admin', 'secretaria_educacao')
    )
  );

-- Comment on table
COMMENT ON TABLE public.relatorios_descritivos IS 'Relatorios descritivos de desenvolvimento (BNCC Campos de Experiencia) para Educacao Infantil';
