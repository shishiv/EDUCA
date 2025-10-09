-- FASE 3: Adicionar índices faltantes em Foreign Keys
-- Prioridade: ALTA 🟡
-- Tempo estimado: 1 hora
-- Issue: 8 foreign keys sem índices causam lentidão em JOINs e DELETEs em cascata

-- ============================================================================
-- CONTEXTO
-- ============================================================================
-- Foreign keys sem índices causam sequential scans completos durante:
-- 1. JOINs em queries
-- 2. DELETE/UPDATE em cascata
-- 3. Verificação de integridade referencial
--
-- Impacto esperado após criação:
-- - Redução de 80-95% no tempo de JOIN
-- - DELETE/UPDATE 10x mais rápido
-- - Verificações de FK instantâneas
-- ============================================================================

-- 1. audit_trail.escola_id
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_trail_escola_id
ON public.audit_trail(escola_id);

COMMENT ON INDEX idx_audit_trail_escola_id IS
'Índice para FK audit_trail.escola_id -> escolas.id.
Otimiza queries de auditoria por escola e DELETEs em cascata.';

-- 2. codigos_inep.validado_por
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_codigos_inep_validado_por
ON public.codigos_inep(validado_por);

COMMENT ON INDEX idx_codigos_inep_validado_por IS
'Índice para FK codigos_inep.validado_por -> users.id.
Otimiza queries de códigos INEP validados por usuário.';

-- 3. configs.criado_por
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_configs_criado_por
ON public.configs(criado_por);

COMMENT ON INDEX idx_configs_criado_por IS
'Índice para FK configs.criado_por -> users.id.
Otimiza queries de configurações criadas por usuário.';

-- 4. educacenso_exports.escola_id
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_educacenso_exports_escola_id
ON public.educacenso_exports(escola_id);

COMMENT ON INDEX idx_educacenso_exports_escola_id IS
'Índice para FK educacenso_exports.escola_id -> escolas.id.
CRÍTICO: Otimiza queries de exports INEP por escola (query muito comum).';

-- 5. escolas.diretor_id
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_escolas_diretor_id
ON public.escolas(diretor_id);

COMMENT ON INDEX idx_escolas_diretor_id IS
'Índice para FK escolas.diretor_id -> users.id.
Otimiza queries de escolas por diretor e DELETEs de usuários.';

-- 6. frequencia.bloqueado_por
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_frequencia_bloqueado_por
ON public.frequencia(bloqueado_por);

COMMENT ON INDEX idx_frequencia_bloqueado_por IS
'Índice para FK frequencia.bloqueado_por -> users.id.
Otimiza auditoria de quem bloqueou registros de frequência.';

-- 7. frequencia.marcado_por
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_frequencia_marcado_por
ON public.frequencia(marcado_por);

COMMENT ON INDEX idx_frequencia_marcado_por IS
'Índice para FK frequencia.marcado_por -> users.id.
Otimiza queries de frequência por professor que marcou.';

-- 8. sessoes_aula.disciplina_id
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sessoes_aula_disciplina_id
ON public.sessoes_aula(disciplina_id);

COMMENT ON INDEX idx_sessoes_aula_disciplina_id IS
'Índice para FK sessoes_aula.disciplina_id -> disciplinas.id.
CRÍTICO: Otimiza JOIN muito comum em dashboard de aulas.';

-- ============================================================================
-- VALIDAÇÃO
-- ============================================================================

-- Verificar se todos os índices foram criados
SELECT
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname IN (
    'idx_audit_trail_escola_id',
    'idx_codigos_inep_validado_por',
    'idx_configs_criado_por',
    'idx_educacenso_exports_escola_id',
    'idx_escolas_diretor_id',
    'idx_frequencia_bloqueado_por',
    'idx_frequencia_marcado_por',
    'idx_sessoes_aula_disciplina_id'
  )
ORDER BY tablename, indexname;

-- Deve retornar 8 índices

-- ============================================================================
-- MONITORAMENTO PÓS-CRIAÇÃO
-- ============================================================================

-- Após 24h, verificar se índices estão sendo usados:
-- SELECT
--   schemaname,
--   tablename,
--   indexname,
--   idx_scan as index_scans,
--   idx_tup_read as tuples_read,
--   idx_tup_fetch as tuples_fetched
-- FROM pg_stat_user_indexes
-- WHERE indexname LIKE 'idx_%_escola_id'
--    OR indexname LIKE 'idx_%_validado_por'
--    OR indexname LIKE 'idx_%_criado_por'
--    OR indexname LIKE 'idx_%_bloqueado_por'
--    OR indexname LIKE 'idx_%_marcado_por'
--    OR indexname LIKE 'idx_%_disciplina_id'
-- ORDER BY idx_scan DESC;
