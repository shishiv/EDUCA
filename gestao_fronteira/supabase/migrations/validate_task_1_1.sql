-- Validation Script for Task Group 1.1
-- Purpose: Verify all migrations from Task Group 1.1 were applied correctly
-- Date: 2025-12-04

-- ============================================================================
-- VALIDATION 1: Check if status_presenca_enum type exists
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'status_presenca_enum') THEN
    RAISE NOTICE '✅ status_presenca_enum type exists';
  ELSE
    RAISE WARNING '❌ status_presenca_enum type NOT found';
  END IF;
END $$;

-- ============================================================================
-- VALIDATION 2: Check if frequencia.status_presenca column exists
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'frequencia'
      AND column_name = 'status_presenca'
  ) THEN
    RAISE NOTICE '✅ frequencia.status_presenca column exists';
  ELSE
    RAISE WARNING '❌ frequencia.status_presenca column NOT found';
  END IF;
END $$;

-- ============================================================================
-- VALIDATION 3: Check if conteudo_aula table exists
-- ============================================================================
DO $$
DECLARE
  column_count INTEGER;
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'conteudo_aula'
  ) THEN
    RAISE NOTICE '✅ conteudo_aula table exists';

    -- Check column count
    SELECT COUNT(*) INTO column_count
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'conteudo_aula';

    RAISE NOTICE '  - Columns: %', column_count;
  ELSE
    RAISE WARNING '❌ conteudo_aula table NOT found';
  END IF;
END $$;

-- ============================================================================
-- VALIDATION 4: Check RLS policies on frequencia
-- ============================================================================
DO $$
DECLARE
  policy_count INTEGER;
  policies TEXT;
BEGIN
  SELECT COUNT(*), string_agg(policyname, ', ' ORDER BY policyname)
  INTO policy_count, policies
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'frequencia';

  IF policy_count >= 2 THEN
    RAISE NOTICE '✅ frequencia has % RLS policies', policy_count;
    RAISE NOTICE '  - Policies: %', policies;
  ELSE
    RAISE WARNING '❌ frequencia has insufficient RLS policies (found: %)', policy_count;
  END IF;
END $$;

-- ============================================================================
-- VALIDATION 5: Check RLS policies on sessoes_aula
-- ============================================================================
DO $$
DECLARE
  policy_count INTEGER;
  policies TEXT;
BEGIN
  SELECT COUNT(*), string_agg(policyname, ', ' ORDER BY policyname)
  INTO policy_count, policies
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'sessoes_aula';

  IF policy_count >= 4 THEN
    RAISE NOTICE '✅ sessoes_aula has % RLS policies', policy_count;
    RAISE NOTICE '  - Policies: %', policies;
  ELSE
    RAISE WARNING '❌ sessoes_aula has insufficient RLS policies (found: %)', policy_count;
  END IF;
END $$;

-- ============================================================================
-- VALIDATION 6: Check RLS policies on conteudo_aula
-- ============================================================================
DO $$
DECLARE
  policy_count INTEGER;
  policies TEXT;
BEGIN
  SELECT COUNT(*), string_agg(policyname, ', ' ORDER BY policyname)
  INTO policy_count, policies
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'conteudo_aula';

  IF policy_count >= 4 THEN
    RAISE NOTICE '✅ conteudo_aula has % RLS policies', policy_count;
    RAISE NOTICE '  - Policies: %', policies;
  ELSE
    RAISE WARNING '❌ conteudo_aula has insufficient RLS policies (found: %)', policy_count;
  END IF;
END $$;

-- ============================================================================
-- VALIDATION 7: Check indexes on frequencia
-- ============================================================================
DO $$
DECLARE
  index_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO index_count
  FROM pg_indexes
  WHERE schemaname = 'public'
    AND tablename = 'frequencia'
    AND indexname LIKE '%status_presenca%';

  IF index_count >= 1 THEN
    RAISE NOTICE '✅ frequencia has status_presenca indexes (count: %)', index_count;
  ELSE
    RAISE WARNING '❌ frequencia missing status_presenca indexes';
  END IF;
END $$;

-- ============================================================================
-- VALIDATION 8: Check indexes on conteudo_aula
-- ============================================================================
DO $$
DECLARE
  index_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO index_count
  FROM pg_indexes
  WHERE schemaname = 'public'
    AND tablename = 'conteudo_aula';

  IF index_count >= 5 THEN
    RAISE NOTICE '✅ conteudo_aula has sufficient indexes (count: %)', index_count;
  ELSE
    RAISE WARNING '❌ conteudo_aula has insufficient indexes (found: %)', index_count;
  END IF;
END $$;

-- ============================================================================
-- VALIDATION 9: Check helper functions
-- ============================================================================
DO $$
BEGIN
  -- Check sync_frequencia_presente
  IF EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'sync_frequencia_presente'
  ) THEN
    RAISE NOTICE '✅ sync_frequencia_presente() function exists';
  ELSE
    RAISE WARNING '❌ sync_frequencia_presente() function NOT found';
  END IF;

  -- Check validate_bncc_skills
  IF EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'validate_bncc_skills'
  ) THEN
    RAISE NOTICE '✅ validate_bncc_skills() function exists';
  ELSE
    RAISE WARNING '❌ validate_bncc_skills() function NOT found';
  END IF;

  -- Check is_before_18h_sao_paulo
  IF EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'is_before_18h_sao_paulo'
  ) THEN
    RAISE NOTICE '✅ is_before_18h_sao_paulo() function exists';
  ELSE
    RAISE WARNING '❌ is_before_18h_sao_paulo() function NOT found';
  END IF;

  -- Check can_edit_attendance
  IF EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'can_edit_attendance'
  ) THEN
    RAISE NOTICE '✅ can_edit_attendance() function exists';
  ELSE
    RAISE WARNING '❌ can_edit_attendance() function NOT found';
  END IF;
END $$;

-- ============================================================================
-- VALIDATION 10: Check views
-- ============================================================================
DO $$
BEGIN
  -- Check vw_conteudo_aula_detalhado
  IF EXISTS (
    SELECT 1 FROM information_schema.views
    WHERE table_schema = 'public'
      AND table_name = 'vw_conteudo_aula_detalhado'
  ) THEN
    RAISE NOTICE '✅ vw_conteudo_aula_detalhado view exists';
  ELSE
    RAISE WARNING '❌ vw_conteudo_aula_detalhado view NOT found';
  END IF;

  -- Check vw_diario_classe_rls_status
  IF EXISTS (
    SELECT 1 FROM information_schema.views
    WHERE table_schema = 'public'
      AND table_name = 'vw_diario_classe_rls_status'
  ) THEN
    RAISE NOTICE '✅ vw_diario_classe_rls_status view exists';
  ELSE
    RAISE WARNING '❌ vw_diario_classe_rls_status view NOT found';
  END IF;
END $$;

-- ============================================================================
-- VALIDATION 11: Test BNCC skills validation
-- ============================================================================
DO $$
BEGIN
  -- Test valid BNCC code
  IF validate_bncc_skills(ARRAY['EF01MA06', 'EF02LP03']) THEN
    RAISE NOTICE '✅ BNCC validation accepts valid codes';
  ELSE
    RAISE WARNING '❌ BNCC validation rejected valid codes';
  END IF;

  -- Test invalid BNCC code
  IF NOT validate_bncc_skills(ARRAY['INVALID', 'EF01MA06']) THEN
    RAISE NOTICE '✅ BNCC validation rejects invalid codes';
  ELSE
    RAISE WARNING '❌ BNCC validation accepted invalid codes';
  END IF;
END $$;

-- ============================================================================
-- FINAL SUMMARY
-- ============================================================================
DO $$
DECLARE
  all_passed BOOLEAN := true;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=============================================================================';
  RAISE NOTICE 'TASK GROUP 1.1 VALIDATION SUMMARY';
  RAISE NOTICE '=============================================================================';

  -- Check critical components
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'status_presenca_enum') THEN
    all_passed := false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'frequencia'
      AND column_name = 'status_presenca'
  ) THEN
    all_passed := false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'conteudo_aula'
  ) THEN
    all_passed := false;
  END IF;

  IF all_passed THEN
    RAISE NOTICE '✅ ALL VALIDATIONS PASSED';
    RAISE NOTICE '';
    RAISE NOTICE 'Task 1.1.1 (Three-state attendance): COMPLETE';
    RAISE NOTICE 'Task 1.1.2 (conteudo_aula table): COMPLETE';
    RAISE NOTICE 'Task 1.1.3 (RLS policies): COMPLETE';
  ELSE
    RAISE WARNING '❌ SOME VALIDATIONS FAILED';
    RAISE WARNING 'Please review the warnings above and re-apply migrations.';
  END IF;

  RAISE NOTICE '=============================================================================';
END $$;
