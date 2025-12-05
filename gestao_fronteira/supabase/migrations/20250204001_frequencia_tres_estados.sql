-- Migration: 20250204001_frequencia_tres_estados.sql
-- Purpose: Extend frequencia table to support 3-state attendance (P, F, A)
-- Task: 1.1.1 - Create migration for 3-state attendance
-- Date: 2025-12-04
-- OpenSpec Change: 2025-12-04-diario-de-classe

-- ============================================================================
-- PHASE 1: ADD THREE-STATE ATTENDANCE COLUMN
-- ============================================================================

-- Create ENUM type for attendance status if not exists
DO $$ BEGIN
  CREATE TYPE status_presenca_enum AS ENUM ('P', 'F', 'A');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add new column for three-state attendance
ALTER TABLE frequencia
  ADD COLUMN IF NOT EXISTS status_presenca status_presenca_enum;

-- Add comment for documentation
COMMENT ON COLUMN frequencia.status_presenca IS
'Three-state attendance status: P (Presente), F (Falta), A (Falta Justificada). Brazilian educational compliance for Diário de Classe Digital.';

-- ============================================================================
-- PHASE 2: MAINTAIN BACKWARD COMPATIBILITY
-- ============================================================================

-- Create trigger function to sync 'presente' column based on 'status_presenca'
-- This maintains backward compatibility with existing code
CREATE OR REPLACE FUNCTION sync_frequencia_presente()
RETURNS TRIGGER AS $$
BEGIN
  -- When status_presenca is set, update 'presente' for backward compatibility
  IF NEW.status_presenca IS NOT NULL THEN
    NEW.presente := CASE
      WHEN NEW.status_presenca = 'P' THEN true
      WHEN NEW.status_presenca IN ('F', 'A') THEN false
      ELSE NEW.presente
    END;
  END IF;

  -- When 'presente' is set without status_presenca, infer status_presenca
  IF NEW.status_presenca IS NULL AND NEW.presente IS NOT NULL THEN
    NEW.status_presenca := CASE
      WHEN NEW.presente = true THEN 'P'::status_presenca_enum
      WHEN NEW.presente = false THEN 'F'::status_presenca_enum
      ELSE NULL
    END;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply sync trigger
DROP TRIGGER IF EXISTS trigger_sync_frequencia_presente ON frequencia;
CREATE TRIGGER trigger_sync_frequencia_presente
  BEFORE INSERT OR UPDATE ON frequencia
  FOR EACH ROW
  EXECUTE FUNCTION sync_frequencia_presente();

COMMENT ON FUNCTION sync_frequencia_presente() IS
'Maintains backward compatibility between old boolean "presente" field and new three-state "status_presenca" field.';

-- ============================================================================
-- PHASE 3: MIGRATE EXISTING DATA
-- ============================================================================

-- Update existing records to populate status_presenca from 'presente'
UPDATE frequencia
SET status_presenca = CASE
  WHEN presente = true THEN 'P'::status_presenca_enum
  WHEN presente = false AND justificativa IS NOT NULL AND justificativa != '' THEN 'A'::status_presenca_enum
  WHEN presente = false THEN 'F'::status_presenca_enum
  ELSE NULL
END
WHERE status_presenca IS NULL;

-- Log migration statistics
DO $$
DECLARE
  total_records INTEGER;
  migrated_records INTEGER;
  presente_count INTEGER;
  falta_count INTEGER;
  justificada_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_records FROM frequencia;
  SELECT COUNT(*) INTO migrated_records FROM frequencia WHERE status_presenca IS NOT NULL;
  SELECT COUNT(*) INTO presente_count FROM frequencia WHERE status_presenca = 'P';
  SELECT COUNT(*) INTO falta_count FROM frequencia WHERE status_presenca = 'F';
  SELECT COUNT(*) INTO justificada_count FROM frequencia WHERE status_presenca = 'A';

  RAISE NOTICE '=============================================================================';
  RAISE NOTICE 'Three-State Attendance Migration Statistics';
  RAISE NOTICE '=============================================================================';
  RAISE NOTICE 'Total frequencia records: %', total_records;
  RAISE NOTICE 'Records migrated: %', migrated_records;
  RAISE NOTICE '  - Presente (P): %', presente_count;
  RAISE NOTICE '  - Falta (F): %', falta_count;
  RAISE NOTICE '  - Falta Justificada (A): %', justificada_count;
  RAISE NOTICE '=============================================================================';
END $$;

-- ============================================================================
-- PHASE 4: ADD PERFORMANCE INDEXES
-- ============================================================================

-- Index for queries filtering by attendance status
CREATE INDEX IF NOT EXISTS idx_frequencia_status_presenca
  ON frequencia(status_presenca);

-- Composite index for common queries (sessao_id + status)
CREATE INDEX IF NOT EXISTS idx_frequencia_sessao_status
  ON frequencia(sessao_id, status_presenca)
  WHERE status_presenca IS NOT NULL;

-- ============================================================================
-- PHASE 5: VALIDATION
-- ============================================================================

-- Ensure no NULL status_presenca for records with valid sessao_id
DO $$
DECLARE
  invalid_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO invalid_count
  FROM frequencia
  WHERE sessao_id IS NOT NULL
    AND status_presenca IS NULL
    AND presente IS NULL;

  IF invalid_count > 0 THEN
    RAISE WARNING 'Found % frequencia records with sessao_id but no status_presenca or presente value', invalid_count;
  ELSE
    RAISE NOTICE 'Data Validation: All frequencia records have valid attendance status';
  END IF;
END $$;

-- ============================================================================
-- FINAL NOTICE
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '=============================================================================';
  RAISE NOTICE 'Migration 20250204001_frequencia_tres_estados COMPLETED';
  RAISE NOTICE '=============================================================================';
  RAISE NOTICE 'Features implemented:';
  RAISE NOTICE '  ✓ Three-state attendance (P, F, A)';
  RAISE NOTICE '  ✓ Backward compatibility with boolean "presente" field';
  RAISE NOTICE '  ✓ Automatic sync between status_presenca and presente';
  RAISE NOTICE '  ✓ Data migration from existing records';
  RAISE NOTICE '  ✓ Performance indexes for attendance queries';
  RAISE NOTICE '';
  RAISE NOTICE 'Next Steps:';
  RAISE NOTICE '  - Update UI components to use status_presenca instead of presente';
  RAISE NOTICE '  - Create conteudo_aula table (Task 1.1.2)';
  RAISE NOTICE '  - Update RLS policies (Task 1.1.3)';
  RAISE NOTICE '=============================================================================';
END $$;
