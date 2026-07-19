-- Migration: 20260719031000_add_censo_escolar_fields.sql
-- Minimum Censo Escolar fields identified by BM10.
-- All columns remain nullable so existing rows are preserved. Defaults are
-- limited to values documented as safe by the domain research.

-- =============================================================================
-- 1. Student Censo Escolar fields (Record 30)
-- =============================================================================
ALTER TABLE public.alunos
  ADD COLUMN IF NOT EXISTS cor_raca TEXT,
  ADD COLUMN IF NOT EXISTS zona_residencial TEXT DEFAULT 'urbana',
  ADD COLUMN IF NOT EXISTS transporte_escolar BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS tipo_deficiencia TEXT[];

ALTER TABLE public.alunos
  ADD CONSTRAINT alunos_cor_raca_check
    CHECK (cor_raca IN ('nao_declarada', 'branca', 'preta', 'parda', 'amarela', 'indigena')),
  ADD CONSTRAINT alunos_zona_residencial_check
    CHECK (zona_residencial IN ('urbana', 'rural'));

COMMENT ON COLUMN public.alunos.cor_raca IS 'Cor ou raca declarada para o Censo Escolar (Record 30)';
COMMENT ON COLUMN public.alunos.zona_residencial IS 'Zona de residencia informada ao Censo Escolar';
COMMENT ON COLUMN public.alunos.transporte_escolar IS 'Indica uso de transporte escolar';
COMMENT ON COLUMN public.alunos.tipo_deficiencia IS 'Tipos de deficiencia informados ao Censo Escolar';

-- =============================================================================
-- 2. Class teaching-stage fields (Record 20)
-- =============================================================================
ALTER TABLE public.turmas
  ADD COLUMN IF NOT EXISTS etapa_ensino TEXT,
  ADD COLUMN IF NOT EXISTS tipo_mediacao TEXT DEFAULT 'presencial',
  ADD COLUMN IF NOT EXISTS tempo_integral BOOLEAN DEFAULT false;

ALTER TABLE public.turmas
  ADD CONSTRAINT turmas_etapa_ensino_check
    CHECK (etapa_ensino IN ('EI', 'AI', 'AF', 'EM', 'EJA', 'EP')),
  ADD CONSTRAINT turmas_tipo_mediacao_check
    CHECK (tipo_mediacao IN ('presencial', 'semi_presencial', 'ead'));

COMMENT ON COLUMN public.turmas.etapa_ensino IS 'Etapa de ensino INEP da turma';
COMMENT ON COLUMN public.turmas.tipo_mediacao IS 'Tipo de mediacao didatico-pedagogica da turma';
COMMENT ON COLUMN public.turmas.tempo_integral IS 'Indica turma em tempo integral';

-- =============================================================================
-- 3. School infrastructure fields (Record 00)
-- =============================================================================
ALTER TABLE public.escolas
  ADD COLUMN IF NOT EXISTS in_biblioteca BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS in_laboratorio_informatica BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS in_internet BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS in_acessibilidade BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS in_quadra_esportes BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS in_refeitorio BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS localizacao_diferenciada TEXT;

ALTER TABLE public.escolas
  ADD CONSTRAINT escolas_localizacao_diferenciada_check
    CHECK (localizacao_diferenciada IN ('indigena', 'quilombola', 'assentamento', 'nenhuma'));

COMMENT ON COLUMN public.escolas.in_biblioteca IS 'Indica existencia de biblioteca na escola';
COMMENT ON COLUMN public.escolas.in_laboratorio_informatica IS 'Indica existencia de laboratorio de informatica na escola';
COMMENT ON COLUMN public.escolas.in_internet IS 'Indica disponibilidade de internet na escola';
COMMENT ON COLUMN public.escolas.in_acessibilidade IS 'Indica infraestrutura de acessibilidade na escola';
COMMENT ON COLUMN public.escolas.in_quadra_esportes IS 'Indica existencia de quadra de esportes na escola';
COMMENT ON COLUMN public.escolas.in_refeitorio IS 'Indica existencia de refeitorio na escola';
COMMENT ON COLUMN public.escolas.localizacao_diferenciada IS 'Localizacao diferenciada declarada no Censo Escolar';
