# EDUCA - Database Cleanup Plan

**Data:** 2025-12-13
**Objetivo:** Consolidar 42 migrations em ~15, eliminar duplicações

---

## Resumo Executivo

| Categoria | Atual | Meta | Ação |
|-----------|-------|------|------|
| Migrations totais | 42 | ~15 | Consolidar |
| RLS migrations | 17 | 2 | Reescrever |
| Index migrations | 5 | 1 | Unificar |
| Migrations duplicadas | 2+ | 0 | Remover |
| Tabelas | 18 | 18 | Manter |

---

## Análise de Migrations

### Categorização Completa

#### Core Schema (MANTER - 3)
```
20250910054340_initial_schema
20250915014103_gestao_fronteira_educational_schema
20250915103938_create_audit_logs
```

#### RLS Policies (CONSOLIDAR - 17 → 2)
```
20250915112703_enable_rls_security
20250918053341_simple_rls_policies_aulas_abertas
20250926053352_create_rls_policies_and_functions
20251007070900_fix_onboarding_rls
20251008011149_fix_onboarding_rls          ← DUPLICADO!
20251011123449_fix_security_definer_views
20251011123840_fix_delete_rls_policies
20251018150800_fix_users_rls_infinite_recursion
20251018151040_fix_users_rls_security_definer_v2
20251115230631_create_rls_helper_functions
20251115230856_rewrite_rls_policies_core
20251115231139_rewrite_rls_policies_remaining_fixed
20251116043118_rewrite_disciplinas_rls_policies
20251116043144_rewrite_educacenso_exports_rls_policies
20251116043216_rewrite_sessoes_aula_rls_policies
20251116043247_rewrite_aluno_responsaveis_rls_policies
```

#### Performance Indexes (CONSOLIDAR - 5 → 1)
```
20250918053537_create_simple_performance_indexes
20250926053336_create_performance_indexes_simple
20251002104123_performance_indexes_corrected
20251011123753_optimize_sequential_scans
20251116043356_create_performance_indexes
```

#### Feature Migrations (REVISAR - 17)
```
20250918053116_create_aulas_abertas_table
20250918053151_enhance_frequencia_for_aulas_abertas
20250918053636_create_aulas_abertas_procedures
20250920034449_enhance_attendance_and_guardian_management
20250926053240_create_disciplinas_table
20250926053254_enhance_sessoes_aula_compliance
20250926053309_create_audit_sessoes_aula
20250926053415_create_enhanced_audit_function
20250926053431_create_audit_trigger_and_auto_closure
20250929090707_add_email_to_escolas
20250929113638_create_configs_table
20250930114001_20250930_complete_abrir_aula_workflow_spec_v3
20251005050221_migrate_aulas_to_sessoes_corrected
20251011123211_enable_rls_missing_tables
20251016130411_remove_wizard_completed_field
20251115231242_add_auth_sync_trigger
20251205102855_add_nis_bolsa_familia
```

---

## Tabelas Atuais (18)

| Tabela | RLS | Rows | Relacionamentos |
|--------|-----|------|-----------------|
| users | ✅ | 0 | escola_id → escolas |
| escolas | ✅ | 0 | diretor_id → users |
| responsaveis | ✅ | 0 | - |
| alunos | ✅ | 0 | responsavel_id → responsaveis |
| turmas | ✅ | 0 | escola_id, professor_id |
| matriculas | ✅ | 0 | aluno_id, turma_id |
| frequencia | ✅ | 0 | matricula_id, sessao_id |
| notas | ✅ | 0 | matricula_id |
| audit_logs | ✅ | 0 | user_id, escola_id |
| aulas_abertas | ✅ | 0 | turma_id, professor_id |
| sessoes_aula | ✅ | 0 | turma_id, professor_id, disciplina_id |
| aluno_responsaveis | ✅ | 0 | aluno_id, responsavel_id |
| codigos_inep | ✅ | 0 | validado_por |
| educacenso_exports | ✅ | 0 | escola_id |
| audit_trail | ✅ | 0 | usuario_id, escola_id |
| disciplinas | ✅ | 0 | escola_id |
| audit_sessoes_aula | ✅ | 0 | sessao_id, usuario_id |
| configs | ✅ | 0 | escola_id, criado_por |

**Observação:** Todas as tabelas têm RLS habilitado ✅

---

## Plano de Consolidação

### Etapa 1: Snapshot do Estado Atual

```bash
# Gerar dump do schema atual
supabase db dump --schema public > schema_backup_20251213.sql

# Exportar lista de migrations
supabase db migrations list > migrations_backup.txt
```

### Etapa 2: Criar Migrations Consolidadas

#### Nova Migration: `consolidated_rls_policies`

Combinar todas as 17 migrations de RLS em uma única:

```sql
-- Migration: consolidated_rls_policies
-- Consolida todas as políticas RLS do sistema

-- 1. Helper functions
CREATE OR REPLACE FUNCTION public.get_user_escola_id()
RETURNS uuid AS $$
  SELECT escola_id FROM public.users WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.users
    WHERE id = auth.uid()
    AND tipo_usuario = 'admin'
  )
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- 2. Políticas por tabela
-- [Incluir todas as políticas finais de cada tabela]
```

#### Nova Migration: `consolidated_indexes`

Combinar todas as 5 migrations de índices:

```sql
-- Migration: consolidated_indexes
-- Todos os índices de performance do sistema

-- Foreign keys
CREATE INDEX IF NOT EXISTS idx_users_escola_id ON public.users(escola_id);
CREATE INDEX IF NOT EXISTS idx_turmas_escola_id ON public.turmas(escola_id);
CREATE INDEX IF NOT EXISTS idx_turmas_professor_id ON public.turmas(professor_id);
CREATE INDEX IF NOT EXISTS idx_matriculas_aluno_id ON public.matriculas(aluno_id);
CREATE INDEX IF NOT EXISTS idx_matriculas_turma_id ON public.matriculas(turma_id);
CREATE INDEX IF NOT EXISTS idx_frequencia_matricula_id ON public.frequencia(matricula_id);
CREATE INDEX IF NOT EXISTS idx_frequencia_sessao_id ON public.frequencia(sessao_id);
CREATE INDEX IF NOT EXISTS idx_frequencia_data_aula ON public.frequencia(data_aula);
CREATE INDEX IF NOT EXISTS idx_notas_matricula_id ON public.notas(matricula_id);
CREATE INDEX IF NOT EXISTS idx_sessoes_aula_turma_id ON public.sessoes_aula(turma_id);
CREATE INDEX IF NOT EXISTS idx_sessoes_aula_data ON public.sessoes_aula(data_aula);

-- Composite indexes
CREATE INDEX IF NOT EXISTS idx_frequencia_matricula_data
ON public.frequencia(matricula_id, data_aula);

CREATE INDEX IF NOT EXISTS idx_notas_matricula_bimestre
ON public.notas(matricula_id, bimestre);
```

### Etapa 3: Validação

```sql
-- Verificar RLS habilitado em todas as tabelas
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND rowsecurity = false;

-- Verificar políticas existentes
SELECT tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename;

-- Verificar índices
SELECT indexname, tablename
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename;
```

### Etapa 4: Limpeza (Apenas após validação completa)

**ATENÇÃO:** Esta etapa só deve ser executada em ambiente de desenvolvimento primeiro.

```sql
-- Listar migrations que serão removidas
-- (apenas para documentação, remoção manual)
```

---

## Migrations Duplicadas

### fix_onboarding_rls (aparece 2x)

```
20251007070900_fix_onboarding_rls
20251008011149_fix_onboarding_rls
```

**Ação:** Verificar se ambas têm conteúdo diferente. Se idênticas, marcar segunda para remoção.

---

## Riscos e Mitigações

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|-----------|
| Perda de dados | Baixa | Alto | Backup completo antes |
| RLS quebrado | Média | Alto | Testar cada tabela |
| Índices faltando | Baixa | Médio | Validar performance |
| Rollback necessário | Média | Médio | Manter backup do schema |

---

## Checklist de Execução

### Preparação
- [ ] Backup completo do banco
- [ ] Exportar schema atual
- [ ] Documentar políticas RLS atuais
- [ ] Documentar índices atuais

### Consolidação
- [ ] Criar migration consolidada de RLS
- [ ] Criar migration consolidada de índices
- [ ] Testar em ambiente local
- [ ] Validar todas as tabelas

### Validação
- [ ] Testar CRUD em cada tabela
- [ ] Verificar RLS funcionando
- [ ] Testar performance de queries
- [ ] Validar relacionamentos

### Limpeza
- [ ] Remover migrations obsoletas (dev)
- [ ] Testar em staging
- [ ] Aplicar em produção
- [ ] Monitorar erros

---

## Resultado Esperado

### Antes
```
supabase/migrations/
├── 20250910054340_initial_schema.sql
├── 20250915014103_gestao_fronteira_educational_schema.sql
├── ... (42 arquivos)
└── 20251205102855_add_nis_bolsa_familia.sql
```

### Depois
```
supabase/migrations/
├── 20250910054340_initial_schema.sql
├── 20250915014103_gestao_fronteira_educational_schema.sql
├── 20250915103938_create_audit_logs.sql
├── 20250918_aulas_abertas_feature.sql (consolidado)
├── 20250920_attendance_guardian.sql
├── 20250926_disciplinas_sessoes.sql (consolidado)
├── 20250929_escolas_configs.sql (consolidado)
├── 20250930_abrir_aula_workflow.sql
├── 20251005_migrate_aulas_sessoes.sql
├── 20251115_consolidated_rls_policies.sql (NOVO)
├── 20251115_consolidated_indexes.sql (NOVO)
├── 20251115_auth_sync_trigger.sql
└── 20251205_nis_bolsa_familia.sql
```

**De 42 para ~13 migrations**

---

## Próximos Passos

1. **Criar branch:** `fix/database-consolidation`
2. **Executar backup:** Schema e migrations atuais
3. **Desenvolver:** Migrations consolidadas
4. **Testar:** Em ambiente local
5. **Validar:** Todas as funcionalidades
6. **Aplicar:** Em produção

---

## Referências

- [Supabase Migrations Docs](https://supabase.com/docs/guides/database/migrations)
- [PostgreSQL RLS](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [Audit Report](../../.audit/AUDIT-REPORT.md)
