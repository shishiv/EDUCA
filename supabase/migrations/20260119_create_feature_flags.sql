-- Migration: 20260119_create_feature_flags.sql
-- Feature Flags System for per-escola module rollout
--
-- Tables created:
--   - feature_flags: Flag definitions (name, description, soft delete)
--   - escola_feature_flags: Per-school enablement with audit trail
--
-- Initial flags: nutricao, estoque_escolar (both disabled by default)

-- =============================================================================
-- 1. Create feature_flags table (flag definitions)
-- =============================================================================
CREATE TABLE IF NOT EXISTS feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flag_name TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,  -- soft delete support
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index for flag name lookups
CREATE INDEX IF NOT EXISTS idx_feature_flags_name ON feature_flags(flag_name);

-- =============================================================================
-- 2. Create escola_feature_flags junction table (per-escola enablement)
-- =============================================================================
CREATE TABLE IF NOT EXISTS escola_feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  escola_id UUID NOT NULL REFERENCES escolas(id) ON DELETE CASCADE,
  flag_id UUID NOT NULL REFERENCES feature_flags(id) ON DELETE CASCADE,
  enabled BOOLEAN DEFAULT false,
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID REFERENCES users(id),
  CONSTRAINT unique_escola_flag UNIQUE(escola_id, flag_id)
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_escola_feature_flags_escola ON escola_feature_flags(escola_id);
CREATE INDEX IF NOT EXISTS idx_escola_feature_flags_flag ON escola_feature_flags(flag_id);

-- =============================================================================
-- 3. Enable Row Level Security
-- =============================================================================
ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE escola_feature_flags ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- 4. RLS Policies for feature_flags
-- =============================================================================

-- All authenticated users can read active flags
CREATE POLICY "Authenticated users can read active flags"
  ON feature_flags FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Admin/gestor_sme can manage all flags (insert/update/delete)
CREATE POLICY "Admin can manage flags"
  ON feature_flags FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.tipo_usuario IN ('admin', 'gestor_sme')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.tipo_usuario IN ('admin', 'gestor_sme')
    )
  );

-- =============================================================================
-- 5. RLS Policies for escola_feature_flags
-- =============================================================================

-- Users can read their own escola's flags OR admin can read all
CREATE POLICY "Users can read own escola flags"
  ON escola_feature_flags FOR SELECT
  TO authenticated
  USING (
    escola_id IN (
      SELECT escola_id FROM users WHERE id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.tipo_usuario IN ('admin', 'gestor_sme')
    )
  );

-- Admin/gestor_sme can manage all escola flags
CREATE POLICY "Admin can manage escola flags"
  ON escola_feature_flags FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.tipo_usuario IN ('admin', 'gestor_sme')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.tipo_usuario IN ('admin', 'gestor_sme')
    )
  );

-- =============================================================================
-- 6. Triggers for updated_at
-- =============================================================================

-- Trigger function for updating updated_at timestamp
CREATE OR REPLACE FUNCTION update_feature_flags_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for feature_flags
DROP TRIGGER IF EXISTS trigger_feature_flags_updated_at ON feature_flags;
CREATE TRIGGER trigger_feature_flags_updated_at
  BEFORE UPDATE ON feature_flags
  FOR EACH ROW EXECUTE FUNCTION update_feature_flags_updated_at();

-- Trigger for escola_feature_flags
DROP TRIGGER IF EXISTS trigger_escola_feature_flags_updated_at ON escola_feature_flags;
CREATE TRIGGER trigger_escola_feature_flags_updated_at
  BEFORE UPDATE ON escola_feature_flags
  FOR EACH ROW EXECUTE FUNCTION update_feature_flags_updated_at();

-- =============================================================================
-- 7. Seed initial flags (disabled by default for all schools)
-- =============================================================================
INSERT INTO feature_flags (flag_name, description)
VALUES
  ('nutricao', 'Modulo de gestao nutricional escolar'),
  ('estoque_escolar', 'Modulo de controle de estoque escolar')
ON CONFLICT (flag_name) DO NOTHING;

-- =============================================================================
-- Migration complete
-- =============================================================================
