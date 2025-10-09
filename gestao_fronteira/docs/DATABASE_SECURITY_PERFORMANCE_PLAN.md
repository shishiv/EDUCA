# 🔒 Plano de Segurança e Performance do Banco de Dados

**Data**: 2025-10-09
**Projeto**: Sistema de Gestão Educacional - Fronteira/MG
**Status**: Análise Completa | Implementação Pendente

---

## 📊 Resumo Executivo

### Análise de Segurança (Supabase Advisors)
- **27 issues identificados**
  - 🔴 **4 ERROR**: RLS desabilitado (2) + Security Definer Views (2)
  - 🟡 **23 WARN**: Funções com search_path mutável (21) + Auth (2)

### Análise de Performance (Queries Customizadas)
- **Cache Hit Ratio**: 100% (database) e 99.89% (index) ✅ **EXCELENTE**
- **Índices Não Utilizados**: 20 índices com `idx_scan = 0`
- **Foreign Keys Sem Índices**: 8 FKs críticas sem índice ⚠️
- **Table Bloat**: 3 tabelas com >20% dead tuples (users, escolas, configs)
- **Sequential Scans**: Tabelas `disciplinas` (756) e `alunos` (989) com muitos table scans

---

## 🎯 Plano de Ação Consolidado

### FASE 1: Segurança Crítica (ERROR Level) - **PRIORIDADE MÁXIMA**

#### 1.1. Habilitar RLS nas Tabelas Expostas (2 tabelas)

**Issue**: `disciplinas` e `educacenso_exports` não possuem RLS habilitado

**Impacto de Segurança**: 🔴 **CRÍTICO**
Dados sensíveis (disciplinas escolares e exportações INEP) acessíveis sem isolamento multi-escola.

**Solução**:
```sql
-- Migration: enable_rls_missing_tables.sql

-- 1. Habilitar RLS em disciplinas
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

-- 2. Habilitar RLS em educacenso_exports
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
```

**Estimativa de Tempo**: 2 horas (desenvolvimento + testes + validação)

---

#### 1.2. Corrigir Security Definer Views (2 views)

**Issue**: `vw_frequencia_completa` e `audit_summary` usam `SECURITY DEFINER` sem `search_path` fixo

**Impacto de Segurança**: 🔴 **CRÍTICO**
Vulnerabilidade de privilege escalation - usuário malicioso pode criar schemas/funções com mesmo nome e executar código arbitrário com privilégios elevados.

**Solução**:
```sql
-- Migration: fix_security_definer_views.sql

-- 1. Recriar vw_frequencia_completa com SECURITY INVOKER
DROP VIEW IF EXISTS public.vw_frequencia_completa;

CREATE VIEW public.vw_frequencia_completa
WITH (security_invoker = true)  -- ✅ Usa permissões do usuário atual
AS
SELECT
  f.id,
  f.aula_id,
  f.matricula_id,
  f.status,
  f.observacao,
  f.marcado_por,
  f.data_marcacao,
  f.bloqueado,
  f.data_bloqueio,
  m.aluno_id,
  a.nome as aluno_nome,
  t.nome as turma_nome,
  e.nome as escola_nome
FROM public.frequencia f
INNER JOIN public.matriculas m ON f.matricula_id = m.id
INNER JOIN public.alunos a ON m.aluno_id = a.id
INNER JOIN public.turmas t ON m.turma_id = t.id
INNER JOIN public.escolas e ON t.escola_id = e.id;

-- 2. Recriar audit_summary com SECURITY INVOKER
DROP VIEW IF EXISTS public.audit_summary;

CREATE VIEW public.audit_summary
WITH (security_invoker = true)
AS
SELECT
  al.tabela_afetada,
  al.operacao,
  COUNT(*) as total_operacoes,
  MIN(al.data_hora) as primeira_operacao,
  MAX(al.data_hora) as ultima_operacao
FROM public.audit_logs al
GROUP BY al.tabela_afetada, al.operacao;

-- 3. Grant explícito para roles necessários
GRANT SELECT ON public.vw_frequencia_completa TO authenticated;
GRANT SELECT ON public.audit_summary TO authenticated;
```

**Estimativa de Tempo**: 1.5 horas (refatoração + testes de permissões)

---

### FASE 2: Segurança Importante (WARN Level - Funções)

#### 2.1. Fixar search_path em 23 Funções

**Issue**: 23 funções sem `SET search_path` - vulnerabilidade de schema injection

**Impacto de Segurança**: 🟡 **ALTO**
Usuário malicioso pode criar schema malicioso e interceptar chamadas de função.

**Solução**: Adicionar `SET search_path = public, pg_temp` em TODAS as funções

**Funções Afetadas**:
1. `update_aulas_abertas_updated_at()`
2. `lock_attendance_after_hours()`
3. `auto_travar_aula()`
4. `validate_frequencia_imutavel()`
5. `validate_attendance_status()`
6. `validate_attendance_before_aula_aberta()`
7. `validate_single_active_enrollment()`
8. `validate_unique_responsavel_cpf()`
9. `validate_user_escola()`
10. `audit_trigger_function()`
11. `check_wizard_completion()`
12. `finalize_wizard_and_create_users(jsonb, uuid)`
13. `generate_legal_hash(timestamp with time zone, uuid, uuid, text)`
14. `handle_new_user()`
15. `handle_updated_at()`
16. `insert_audit_log()`
17. `log_user_login()`
18. `prevent_aula_modification()`
19. `sync_aulas_abertas()`
20. `update_updated_at_column()`
21. `validate_cpf(text)`
22. `validate_professor_assignment()`
23. `verify_aula_aberta(uuid)`

**Migration Exemplo**:
```sql
-- Migration: fix_function_search_path.sql

-- Exemplo para 1 função (replicar para todas as 23)
CREATE OR REPLACE FUNCTION public.update_aulas_abertas_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp  -- ✅ FIX APLICADO
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- (Repetir para as outras 22 funções...)
```

**Estimativa de Tempo**: 4 horas (refatoração de 23 funções + testes)

---

#### 2.2. Melhorias de Autenticação Supabase

**Issue 1**: Leaked password protection desabilitado
**Issue 2**: MFA options insuficientes

**Solução**:
```sql
-- Migration: enhance_auth_security.sql

-- 1. Habilitar proteção contra senhas vazadas (HaveIBeenPwned.org)
UPDATE auth.config
SET leaked_password_protection = true
WHERE id = 1;

-- 2. Habilitar MFA obrigatório para admins e diretores
-- (Configuração via Supabase Dashboard - não via SQL)
-- Dashboard > Authentication > Providers > Enable Phone/TOTP
```

**Ação Manual Necessária**:
- Acessar Supabase Dashboard
- Authentication > Multi-Factor Authentication
- Habilitar TOTP (Time-based One-Time Password)
- Habilitar SMS (opcional, para backup)

**Estimativa de Tempo**: 1 hora (configuração + testes de login)

---

### FASE 3: Performance - Índices Faltantes em Foreign Keys ⚠️

**Issue**: 8 foreign keys sem índices causam lentidão em JOINs e DELETEs em cascata

**Impacto de Performance**: 🟡 **ALTO**
Queries com JOIN nessas FKs fazem sequential scan completo da tabela.

**Solução**:
```sql
-- Migration: add_missing_fk_indexes.sql

-- 1. audit_trail.escola_id
CREATE INDEX IF NOT EXISTS idx_audit_trail_escola_id
ON public.audit_trail(escola_id);

-- 2. codigos_inep.validado_por
CREATE INDEX IF NOT EXISTS idx_codigos_inep_validado_por
ON public.codigos_inep(validado_por);

-- 3. configs.criado_por
CREATE INDEX IF NOT EXISTS idx_configs_criado_por
ON public.configs(criado_por);

-- 4. educacenso_exports.escola_id
CREATE INDEX IF NOT EXISTS idx_educacenso_exports_escola_id
ON public.educacenso_exports(escola_id);

-- 5. escolas.diretor_id
CREATE INDEX IF NOT EXISTS idx_escolas_diretor_id
ON public.escolas(diretor_id);

-- 6. frequencia.bloqueado_por
CREATE INDEX IF NOT EXISTS idx_frequencia_bloqueado_por
ON public.frequencia(bloqueado_por);

-- 7. frequencia.marcado_por
CREATE INDEX IF NOT EXISTS idx_frequencia_marcado_por
ON public.frequencia(marcado_por);

-- 8. sessoes_aula.disciplina_id
CREATE INDEX IF NOT EXISTS idx_sessoes_aula_disciplina_id
ON public.sessoes_aula(disciplina_id);
```

**Impacto Esperado**:
- ✅ Redução de 80-95% no tempo de JOIN com essas FKs
- ✅ DELETE cascata 10x mais rápido
- ✅ UPDATE em tabelas referenciadas muito mais rápido

**Estimativa de Tempo**: 1 hora (criação + validação de uso com EXPLAIN)

---

### FASE 4: Performance - Otimização de Sequential Scans

**Issue**: Tabelas `disciplinas` (756 seq scans) e `alunos` (989 seq scans) com muitos table scans

**Análise Detalhada**:
```
disciplinas: 756 sequential_scans vs 8 index_scans
alunos: 989 sequential_scans vs 1090 index_scans
```

**Causa**: Queries sem WHERE clause ou com colunas não indexadas

**Solução**:
```sql
-- Migration: optimize_sequential_scans.sql

-- 1. Índice composto para queries comuns em disciplinas
CREATE INDEX IF NOT EXISTS idx_disciplinas_escola_ativo
ON public.disciplinas(escola_id, ativo)
WHERE ativo = true;

-- 2. Índice para busca de alunos por nome (LIKE queries)
CREATE INDEX IF NOT EXISTS idx_alunos_nome_trgm
ON public.alunos USING gin(nome gin_trgm_ops);

-- 3. Habilitar extensão pg_trgm se não existir
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 4. Índice para queries de alunos por escola
CREATE INDEX IF NOT EXISTS idx_alunos_escola_ativo
ON public.alunos(escola_id, ativo)
WHERE ativo = true;
```

**Validação**:
```sql
-- Query de teste para verificar uso de índice
EXPLAIN ANALYZE
SELECT * FROM disciplinas
WHERE escola_id = 'uuid-escola' AND ativo = true;

-- Deve mostrar: "Index Scan using idx_disciplinas_escola_ativo"
```

**Estimativa de Tempo**: 2 horas (análise de queries + criação de índices + EXPLAIN)

---

### FASE 5: Performance - Limpeza de Table Bloat (VACUUM)

**Issue**: 3 tabelas com >20% dead tuples (users: 94.44%, escolas: 47.06%, configs: 38.46%)

**Impacto de Performance**: 🟡 **MÉDIO**
Espaço desperdiçado em disco + queries mais lentas por ler páginas desnecessárias

**Solução**:
```sql
-- Manual: Executar VACUUM FULL em produção (requer lock exclusivo)
VACUUM FULL ANALYZE public.users;
VACUUM FULL ANALYZE public.escolas;
VACUUM FULL ANALYZE public.configs;

-- Configurar autovacuum agressivo para essas tabelas
ALTER TABLE public.users SET (
  autovacuum_vacuum_scale_factor = 0.05,  -- Vacuum a cada 5% de dead tuples
  autovacuum_analyze_scale_factor = 0.02
);

ALTER TABLE public.escolas SET (
  autovacuum_vacuum_scale_factor = 0.05,
  autovacuum_analyze_scale_factor = 0.02
);

ALTER TABLE public.configs SET (
  autovacuum_vacuum_scale_factor = 0.05,
  autovacuum_analyze_scale_factor = 0.02
);
```

**⚠️ IMPORTANTE**: `VACUUM FULL` requer lock exclusivo - executar fora do horário de pico

**Estimativa de Tempo**: 1 hora (execução + validação)

---

### FASE 6: Performance - Remoção de Índices Não Utilizados (Opcional)

**Issue**: 20 índices com `idx_scan = 0` (nunca usados)

**Análise de Risco**: 🟢 **BAIXO**
Índices não utilizados desperdiçam espaço em disco e tornam INSERTs/UPDATEs mais lentos.

**Ação Recomendada**: **NÃO REMOVER AINDA**

**Justificativa**:
- Sistema ainda em desenvolvimento (wizard recém-implementado)
- Índices podem ser usados por funcionalidades futuras
- Custo de manutenção é baixo (total: ~320 kB)

**Revisão Futura**: Após 3 meses em produção, re-analisar com:
```sql
SELECT * FROM pg_stat_user_indexes
WHERE schemaname = 'public' AND idx_scan = 0
ORDER BY pg_relation_size(indexrelid) DESC;
```

**Estimativa de Tempo**: 0 horas (postergar para análise futura)

---

## 📋 Cronograma de Implementação

| Fase | Prioridade | Estimativa | Dependências |
|------|-----------|-----------|--------------|
| FASE 1.1 - RLS Missing Tables | 🔴 CRÍTICA | 2h | Nenhuma |
| FASE 1.2 - Security Definer Views | 🔴 CRÍTICA | 1.5h | Nenhuma |
| FASE 2.1 - Function search_path | 🟡 ALTA | 4h | Nenhuma |
| FASE 2.2 - Auth Enhancements | 🟡 ALTA | 1h | Acesso Supabase Dashboard |
| FASE 3 - FK Indexes | 🟡 ALTA | 1h | Nenhuma |
| FASE 4 - Sequential Scans | 🟡 MÉDIA | 2h | pg_trgm extension |
| FASE 5 - VACUUM Bloat | 🟡 MÉDIA | 1h | Janela de manutenção |
| FASE 6 - Unused Indexes | 🟢 BAIXA | 0h | Postergar 3 meses |

**Total Estimado**: **12.5 horas** de desenvolvimento + testes

---

## ✅ Checklist de Validação Pós-Implementação

### Segurança
- [ ] RLS habilitado em `disciplinas` e `educacenso_exports`
- [ ] Testar acesso cross-school (deve falhar)
- [ ] Views com `security_invoker = true` funcionando
- [ ] Todas as 23 funções com `SET search_path = public, pg_temp`
- [ ] Leaked password protection habilitado no Supabase
- [ ] MFA configurado para admins

### Performance
- [ ] 8 índices FK criados e sendo usados (verificar com `pg_stat_user_indexes`)
- [ ] Sequential scans reduzidos em `disciplinas` e `alunos` (re-executar análise)
- [ ] VACUUM executado com sucesso (verificar `n_dead_tup = 0`)
- [ ] Cache hit ratio mantido > 99%
- [ ] EXPLAIN ANALYZE de queries críticas usando índices

### Testes E2E
- [ ] Login com senha vazada (deve ser bloqueado)
- [ ] Tentativa de acesso a dados de outra escola (deve falhar)
- [ ] Performance de dashboard < 3s
- [ ] Performance de marcação de frequência < 1s por aluno

---

## 📚 Referências

- [Supabase RLS Best Practices](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL SECURITY DEFINER Functions](https://www.postgresql.org/docs/current/sql-createfunction.html#SQL-CREATEFUNCTION-SECURITY)
- [PostgreSQL Performance Tuning](https://wiki.postgresql.org/wiki/Performance_Optimization)
- [pg_trgm Full Text Search](https://www.postgresql.org/docs/current/pgtrgm.html)

---

**Próximos Passos**:
1. Revisar este plano com equipe técnica
2. Priorizar FASE 1 (segurança crítica) para implementação imediata
3. Agendar janela de manutenção para VACUUM FULL
4. Implementar migrations incrementalmente
5. Validar cada fase com testes E2E antes de prosseguir
