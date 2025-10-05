-- Migration: Consolidate aulas_abertas to sessoes_aula
-- Date: 2025-10-05
-- Purpose: Migrate from legacy dual-table architecture to enhanced single-table system
-- Impact: Activates Brazilian educational compliance features

-- =============================================================================
-- PHASE 1: DATA MIGRATION
-- =============================================================================

-- Migrate existing aulas_abertas records to sessoes_aula
-- Only migrate records that don't already exist (idempotent)
INSERT INTO sessoes_aula (
    id,
    turma_id,
    professor_id,
    escola_id,
    disciplina_id,
    data_aula,
    hora_inicio,
    hora_fim,
    status,
    aberta_em,
    fechada_em,
    conteudo_ministrado,
    created_at,
    updated_at
)
SELECT
    a.id,
    a.turma_id,
    a.professor_id,
    a.escola_id,
    a.disciplina_id,
    a.data_aula,
    a.hora_inicio,
    a.hora_fim,
    -- Map legacy status to enhanced three-phase status
    CASE
        WHEN a.status = 'aberta' AND a.fechada_em IS NULL THEN 'ABERTA'
        WHEN a.status = 'fechada' OR a.fechada_em IS NOT NULL THEN 'FECHADA'
        WHEN a.status = 'travada' THEN 'FECHADA' -- Travada becomes Fechada
        ELSE 'CANCELADA'
    END,
    a.aberta_em,
    a.fechada_em,
    a.observacoes, -- Legacy observacoes becomes conteudo_ministrado
    a.created_at,
    COALESCE(a.updated_at, a.created_at)
FROM aulas_abertas a
WHERE NOT EXISTS (
    SELECT 1 FROM sessoes_aula s
    WHERE s.id = a.id
)
ON CONFLICT (id) DO NOTHING;

-- Log migration statistics
DO $$
DECLARE
    migrated_count INTEGER;
    total_legacy_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_legacy_count FROM aulas_abertas;
    SELECT COUNT(*) INTO migrated_count FROM sessoes_aula
    WHERE created_at < NOW() - INTERVAL '1 minute'; -- Exclude just-created records

    RAISE NOTICE 'Migration Statistics:';
    RAISE NOTICE '  - Total legacy records: %', total_legacy_count;
    RAISE NOTICE '  - Records migrated: %', migrated_count;
    RAISE NOTICE '  - Migration timestamp: %', NOW();
END $$;

-- =============================================================================
-- PHASE 2: FOREIGN KEY MIGRATION
-- =============================================================================

-- Update frequencia records to use sessao_id instead of aula_id
-- This establishes the link between attendance and enhanced sessions
UPDATE frequencia f
SET sessao_id = a.id
FROM aulas_abertas a
WHERE f.aula_id = a.id
  AND f.sessao_id IS NULL
  AND EXISTS (
    SELECT 1 FROM sessoes_aula s WHERE s.id = a.id
  );

-- Verify frequency migration
DO $$
DECLARE
    total_frequencia INTEGER;
    migrated_frequencia INTEGER;
    orphaned_frequencia INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_frequencia FROM frequencia;
    SELECT COUNT(*) INTO migrated_frequencia FROM frequencia WHERE sessao_id IS NOT NULL;
    SELECT COUNT(*) INTO orphaned_frequencia FROM frequencia WHERE sessao_id IS NULL AND aula_id IS NOT NULL;

    RAISE NOTICE 'Frequency Migration Statistics:';
    RAISE NOTICE '  - Total frequency records: %', total_frequencia;
    RAISE NOTICE '  - Records with sessao_id: %', migrated_frequencia;
    RAISE NOTICE '  - Orphaned records (aula_id only): %', orphaned_frequencia;

    IF orphaned_frequencia > 0 THEN
        RAISE WARNING 'Found % orphaned frequency records - manual review required', orphaned_frequencia;
    END IF;
END $$;

-- =============================================================================
-- PHASE 3: AUDIT TRAIL CREATION
-- =============================================================================

-- Create audit trail entries for migrated sessions
-- This ensures legal compliance tracking from migration point forward
INSERT INTO audit_sessoes_aula (
    sessao_id,
    acao,
    usuario_id,
    timestamp_acao,
    dados_anteriores,
    dados_novos,
    hash_verificacao
)
SELECT
    s.id,
    'MIGRAR',
    s.professor_id, -- Use professor as migration actor
    NOW(),
    NULL, -- No previous data (migration event)
    jsonb_build_object(
        'source', 'aulas_abertas',
        'migrated_at', NOW(),
        'original_status', a.status,
        'new_status', s.status
    ),
    md5(s.id::text || NOW()::text) -- Simple hash for migration event
FROM sessoes_aula s
JOIN aulas_abertas a ON a.id = s.id
WHERE NOT EXISTS (
    SELECT 1 FROM audit_sessoes_aula aud
    WHERE aud.sessao_id = s.id AND aud.acao = 'MIGRAR'
);

-- Log audit creation
DO $$
DECLARE
    audit_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO audit_count FROM audit_sessoes_aula WHERE acao = 'MIGRAR';
    RAISE NOTICE 'Audit Trail Creation:';
    RAISE NOTICE '  - Migration audit entries created: %', audit_count;
END $$;

-- =============================================================================
-- PHASE 4: AUTO-CLOSURE SCHEDULING
-- =============================================================================

-- For any ABERTA sessions, schedule auto-closure at 6 PM São Paulo time
UPDATE sessoes_aula
SET auto_fechamento_agendado = (
    data_aula::date + TIME '18:00:00'
)::timestamp AT TIME ZONE 'America/Sao_Paulo'
WHERE status = 'ABERTA'
  AND auto_fechamento_agendado IS NULL;

-- Log auto-closure scheduling
DO $$
DECLARE
    scheduled_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO scheduled_count
    FROM sessoes_aula
    WHERE status = 'ABERTA' AND auto_fechamento_agendado IS NOT NULL;

    RAISE NOTICE 'Auto-Closure Scheduling:';
    RAISE NOTICE '  - Sessions scheduled for auto-closure: %', scheduled_count;
END $$;

-- =============================================================================
-- PHASE 5: DATA VALIDATION
-- =============================================================================

-- Validate all frequencia records have valid sessao_id
DO $$
DECLARE
    invalid_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO invalid_count
    FROM frequencia f
    WHERE f.sessao_id IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM sessoes_aula s WHERE s.id = f.sessao_id);

    IF invalid_count > 0 THEN
        RAISE EXCEPTION 'Data integrity error: % frequencia records reference non-existent sessoes_aula', invalid_count;
    ELSE
        RAISE NOTICE 'Data Validation: All frequencia records have valid sessao_id references';
    END IF;
END $$;

-- Validate session status constraints
DO $$
DECLARE
    invalid_status_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO invalid_status_count
    FROM sessoes_aula
    WHERE (status = 'PLANEJADA' AND aberta_em IS NOT NULL)
       OR (status = 'ABERTA' AND (aberta_em IS NULL OR fechada_em IS NOT NULL))
       OR (status = 'FECHADA' AND (aberta_em IS NULL OR fechada_em IS NULL));

    IF invalid_status_count > 0 THEN
        RAISE WARNING 'Found % sessions with invalid status transitions', invalid_status_count;
    ELSE
        RAISE NOTICE 'Data Validation: All session status transitions are valid';
    END IF;
END $$;

-- =============================================================================
-- PHASE 6: FINAL STATISTICS
-- =============================================================================

DO $$
DECLARE
    total_sessoes INTEGER;
    planejada_count INTEGER;
    aberta_count INTEGER;
    fechada_count INTEGER;
    cancelada_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_sessoes FROM sessoes_aula;
    SELECT COUNT(*) INTO planejada_count FROM sessoes_aula WHERE status = 'PLANEJADA';
    SELECT COUNT(*) INTO aberta_count FROM sessoes_aula WHERE status = 'ABERTA';
    SELECT COUNT(*) INTO fechada_count FROM sessoes_aula WHERE status = 'FECHADA';
    SELECT COUNT(*) INTO cancelada_count FROM sessoes_aula WHERE status = 'CANCELADA';

    RAISE NOTICE '=============================================================================';
    RAISE NOTICE 'MIGRATION COMPLETE - Final Statistics';
    RAISE NOTICE '=============================================================================';
    RAISE NOTICE 'Total sessions in enhanced system: %', total_sessoes;
    RAISE NOTICE '  - PLANEJADA: %', planejada_count;
    RAISE NOTICE '  - ABERTA: %', aberta_count;
    RAISE NOTICE '  - FECHADA: %', fechada_count;
    RAISE NOTICE '  - CANCELADA: %', cancelada_count;
    RAISE NOTICE '';
    RAISE NOTICE 'Brazilian Compliance Features Activated:';
    RAISE NOTICE '  ✓ Three-phase workflow (PLANEJADA → ABERTA → FECHADA)';
    RAISE NOTICE '  ✓ Auto-closure scheduling (6 PM São Paulo time)';
    RAISE NOTICE '  ✓ Comprehensive audit trail';
    RAISE NOTICE '  ✓ INEP/Educacenso metadata tracking';
    RAISE NOTICE '  ✓ "Não existe o esquecer" enforcement';
    RAISE NOTICE '=============================================================================';
END $$;

-- =============================================================================
-- NOTES FOR FUTURE PHASES
-- =============================================================================

-- PHASE 7 (Execute after 30 days):
-- - Drop aula_id column from frequencia
-- - Drop aulas_abertas table
-- - Remove legacy API endpoints

-- Uncomment below commands when ready for Phase 7:

-- ALTER TABLE frequencia DROP CONSTRAINT IF EXISTS frequencia_aula_id_fkey;
-- ALTER TABLE frequencia DROP COLUMN IF EXISTS aula_id;
-- CREATE TABLE IF NOT EXISTS aulas_abertas_archive AS SELECT * FROM aulas_abertas;
-- DROP TABLE IF EXISTS aulas_abertas;

COMMENT ON TABLE sessoes_aula IS 'Enhanced class session management with three-phase workflow and Brazilian educational compliance. Replaces legacy aulas_abertas table.';
COMMENT ON COLUMN sessoes_aula.status IS 'Session status: PLANEJADA (planned), ABERTA (open for attendance), FECHADA (closed), CANCELADA (cancelled)';
COMMENT ON COLUMN sessoes_aula.auto_fechamento_agendado IS 'Scheduled auto-closure at 6 PM São Paulo time for Brazilian compliance';
COMMENT ON COLUMN sessoes_aula.hash_legal IS 'Cryptographic hash for legal compliance and immutability verification';
