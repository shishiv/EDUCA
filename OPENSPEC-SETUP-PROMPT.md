# 🎯 OpenSpec Setup - Sistema de Gestão Escolar Fronteira/MG

**Contexto:** Projeto com bug crítico de RLS (Row Level Security) bloqueando autenticação. Análise arquitetural completa em [RLS-DEEP-ANALYSIS.md](gestao_fronteira/RLS-DEEP-ANALYSIS.md).

---

## 📋 Prompt para Claude Code / AI Assistant

```
Você é um assistente especializado em spec-driven development usando OpenSpec.

Acabamos de completar uma análise arquitetural profunda do sistema de gestão escolar
(veja gestao_fronteira/RLS-DEEP-ANALYSIS.md e gestao_fronteira/E2E-TESTING-REPORT.md).

Precisamos criar 3 change proposals no formato OpenSpec para implementar as correções
e melhorias identificadas.

IMPORTANTE: Siga EXATAMENTE a estrutura OpenSpec:

openspec/
├── specs/
│   └── (specs existentes - source of truth)
└── changes/
    └── <change-name>/
        ├── proposal.md      # Por que fazer, o que muda
        ├── tasks.md         # Checklist de implementação
        ├── design.md        # Decisões técnicas (opcional)
        └── specs/
            └── <component>/
                └── spec.md  # Delta mostrando mudanças

---

## CHANGE 1: fix-rls-circular-dependencies (URGENTE - 4-6h)

**Objetivo:** Eliminar dependências circulares nas RLS policies que estão bloqueando
o sistema de autenticação.

**Crie:**

1. **openspec/changes/fix-rls-circular-dependencies/proposal.md**

Estrutura:
```markdown
# Proposal: Fix RLS Circular Dependencies

## Problem Statement
Sistema de autenticação completamente bloqueado por dependências circulares nas
RLS policies da tabela `users`. Erro "Database error querying schema" impede login
de 100% dos usuários.

**Severity:** 🔴 CRITICAL - Production system inaccessible

## Root Cause
RLS policies na tabela `public.users` fazem subqueries recursivas na própria tabela:
- Policy executa: `SELECT tipo_usuario FROM users WHERE id = auth.uid()`
- Essa subquery TAMBÉM precisa passar pela RLS policy
- Loop infinito → PostgreSQL mata query → Usuário não consegue acessar

**Evidence:**
- 500 errors durante login (veja E2E-TESTING-REPORT.md)
- 25+ políticas com recursão identificadas
- ~20 rotas bloqueadas por falta de autenticação

## Proposed Solution
Implementar funções SECURITY DEFINER que bypassam RLS:

1. **Helper Functions** (auth schema)
   - `auth.get_user_role()` - Retorna tipo_usuario sem passar por RLS
   - `auth.get_user_escola()` - Retorna escola_id sem passar por RLS
   - `auth.is_admin()` - Verifica se usuário é admin
   - `auth.has_role_or_higher()` - Hierarquia de roles

2. **Policy Rewrite** (public schema)
   - Reescrever 4 policies da tabela `users`
   - Reescrever policies de `escolas`, `turmas`, `alunos`, etc.
   - Substituir subqueries por chamadas a funções SECURITY DEFINER

3. **Automatic Sync Trigger**
   - Trigger em `auth.users` para sincronizar com `public.users`
   - Previne usuários órfãos (existe em auth.users mas não em public.users)

## Success Criteria
- ✅ Login funciona para 100% dos usuários
- ✅ Console sem errors 500 durante autenticação
- ✅ Tempo de login < 2s (p95)
- ✅ E2E testing desbloqueado (~20 rotas testadas)
- ✅ Zero dependências circulares em policies

## Risks & Mitigations
| Risk | Mitigation |
|------|------------|
| SECURITY DEFINER pode criar vulnerabilidades | Usar `SET search_path = public`, validar inputs |
| Trigger de sync pode falhar | Retry logic, logs em audit_logs |
| Performance degradada | Criar índices em users(id, tipo_usuario, escola_id) |

## Estimated Effort
**6 hours** (breakdown em tasks.md)
```

2. **openspec/changes/fix-rls-circular-dependencies/tasks.md**

Estrutura:
```markdown
# Tasks: Fix RLS Circular Dependencies

## Phase 1: Create SECURITY DEFINER Functions (1h)
- [ ] 1.1 Create `auth.get_user_role()` function
- [ ] 1.2 Create `auth.get_user_escola()` function
- [ ] 1.3 Create `auth.is_admin()` function
- [ ] 1.4 Create `auth.has_role_or_higher(TEXT)` function
- [ ] 1.5 Add indexes on `users(id, tipo_usuario, escola_id)`
- [ ] 1.6 Test functions with EXPLAIN ANALYZE

## Phase 2: Rewrite RLS Policies - Core Tables (2h)
- [ ] 2.1 Rewrite `users_select_policy` on public.users
- [ ] 2.2 Rewrite `users_insert_policy` on public.users
- [ ] 2.3 Rewrite `users_update_policy` on public.users
- [ ] 2.4 Rewrite `users_delete_policy` on public.users
- [ ] 2.5 Rewrite policies on `escolas` table
- [ ] 2.6 Rewrite policies on `turmas` table

## Phase 3: Rewrite RLS Policies - Remaining Tables (1h)
- [ ] 3.1 Rewrite policies on `alunos` table
- [ ] 3.2 Rewrite policies on `matriculas` table
- [ ] 3.3 Rewrite policies on `frequencia` table
- [ ] 3.4 Rewrite policies on `notas` table
- [ ] 3.5 Rewrite policies on `responsaveis` table

## Phase 4: Add Automatic Sync Trigger (30min)
- [ ] 4.1 Create `public.handle_new_user()` function
- [ ] 4.2 Create trigger `on_auth_user_created` on auth.users
- [ ] 4.3 Test trigger with new user creation
- [ ] 4.4 Backfill existing users (sync auth.users → public.users)

## Phase 5: Testing & Validation (1.5h)
- [ ] 5.1 Test login as Admin user
- [ ] 5.2 Test login as Diretor user
- [ ] 5.3 Test login as Secretario user
- [ ] 5.4 Test login as Professor user
- [ ] 5.5 Test login as Responsavel user
- [ ] 5.6 Test new user creation via Supabase Auth
- [ ] 5.7 Verify console without 500 errors
- [ ] 5.8 Verify network requests return 200

## Phase 6: Documentation (1h)
- [ ] 6.1 Update E2E-TESTING-REPORT.md with "DESBLOQUEADO" status
- [ ] 6.2 Add comments to SECURITY DEFINER functions
- [ ] 6.3 Add audit log entry for RLS fix
- [ ] 6.4 Update CHANGELOG.md

## Acceptance Criteria
- ✅ All tasks completed and checked
- ✅ Login works for all 5 user roles
- ✅ Console clean (no 500 errors)
- ✅ E2E testing functional (~20 routes accessible)
```

3. **openspec/changes/fix-rls-circular-dependencies/specs/database/rls-policies.md**

Estrutura (DELTA format):
```markdown
# Delta for Database RLS Policies

## ADDED Functions

### Function: auth.get_user_role()
Returns the `tipo_usuario` of the currently authenticated user.

**Security:** SECURITY DEFINER bypasses RLS to prevent circular dependencies.

**Definition:**
```sql
CREATE OR REPLACE FUNCTION auth.get_user_role()
RETURNS TEXT AS $$
  SELECT tipo_usuario FROM public.users WHERE id = auth.uid()
$$ LANGUAGE SQL SECURITY DEFINER STABLE;
```

### Function: auth.get_user_escola()
Returns the `escola_id` of the currently authenticated user.

**Security:** SECURITY DEFINER bypasses RLS to prevent circular dependencies.

### Function: auth.is_admin()
Returns TRUE if the currently authenticated user is an admin.

### Function: auth.has_role_or_higher(TEXT)
Checks if current user has required role or higher in hierarchy.

**Hierarchy:** responsavel (1) < professor (2) < secretario (3) < diretor (4) < admin (5)

## MODIFIED Policies

### Policy: users_select_policy (public.users)

**Before (with circular dependency):**
```sql
CREATE POLICY "users_select_policy" ON users
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND tipo_usuario = 'admin')  -- ❌ RECURSION
    OR escola_id = (SELECT escola_id FROM users WHERE id = auth.uid())  -- ❌ RECURSION
  );
```

**After (no recursion):**
```sql
CREATE POLICY "users_select_policy" ON users
  FOR SELECT
  TO authenticated
  USING (
    id = auth.uid()  -- ✅ User sees own profile
    OR auth.is_admin()  -- ✅ Admin sees all (no recursion)
    OR escola_id = auth.get_user_escola()  -- ✅ School-based isolation (no recursion)
  );
```

### Policy: escolas_select_policy (public.escolas)
**Change:** Replace `EXISTS (SELECT FROM users ...)` with `auth.is_admin()`

### Policy: turmas_select_policy (public.turmas)
**Change:** Replace subqueries with `auth.get_user_escola()`

## ADDED Triggers

### Trigger: on_auth_user_created
Automatically syncs new users from `auth.users` to `public.users`.

**Purpose:** Prevents orphaned auth users (exists in auth.users but not in public.users).

**Definition:**
```sql
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```
```

4. **openspec/changes/fix-rls-circular-dependencies/design.md** (opcional)

Estrutura:
```markdown
# Design: Fix RLS Circular Dependencies

## Architecture Decision

**Chosen Approach:** SECURITY DEFINER helper functions

**Alternatives Considered:**
1. ❌ Single source of truth (auth.users only) - Too many breaking changes
2. ❌ Materialized views - Data staleness issues
3. ❌ Schema-based multi-tenancy - Not supported by Supabase
4. ✅ SECURITY DEFINER functions - Minimal changes, follows Supabase best practices

## Technical Decisions

### Why SECURITY DEFINER?
- Executes with function owner's privileges (bypasses RLS)
- Breaks circular dependency chain
- Official Supabase recommendation for this pattern

### Why auth schema for functions?
- Separates security-critical functions from application logic
- Prevents accidental modification
- Clear ownership and responsibility

### Why automatic sync trigger?
- Prevents manual profile creation errors
- Guarantees data consistency
- Eliminates "orphaned auth users" scenario

## Security Considerations

**SECURITY DEFINER risks:**
- Functions can bypass RLS if not carefully written
- Must use `SET search_path = public` to prevent SQL injection

**Mitigations:**
- All functions are read-only (SELECT only)
- Explicit schema qualification (public.users, not users)
- Input validation in has_role_or_higher()
- Functions are STABLE (cached within transaction)

## Performance Considerations

**Indexes:**
```sql
CREATE INDEX idx_users_auth_uid_tipo ON public.users(id, tipo_usuario);
CREATE INDEX idx_users_auth_uid_escola ON public.users(id, escola_id);
```

**Query Plan Optimization:**
- Functions are marked STABLE → PostgreSQL can cache results
- Indexed lookups on users(id) → O(1) performance
- Eliminates redundant subqueries in policies

## Testing Strategy

**Unit Tests (SQL):**
- Test each SECURITY DEFINER function with all user roles
- Verify functions return correct values
- Test NULL handling (user without profile)

**Integration Tests:**
- Test login flow for all 5 user roles
- Test RLS policies enforce school-based isolation
- Test trigger creates profiles automatically

**E2E Tests:**
- Test complete authentication workflow
- Test cross-school data access (should be blocked)
- Test admin can access all schools
```

---

## CHANGE 2: optimize-rls-performance (ALTA PRIORIDADE - 4-6h)

**Objetivo:** Otimizar performance das RLS policies após correção de bug.

**Crie:**

1. **openspec/changes/optimize-rls-performance/proposal.md**

```markdown
# Proposal: Optimize RLS Performance

## Problem Statement
Após correção do bug de dependência circular, RLS policies funcionam mas podem ter
performance subótima em queries complexas.

## Proposed Solution
1. **Audit RLS Policies** - Verificar todas as ~50 policies em todas as tabelas
2. **Create Indexes** - Adicionar índices para subqueries frequentes
3. **Update Helper Functions** - Atualizar funções existentes com SECURITY DEFINER
4. **Performance Testing** - Benchmark queries antes/depois com EXPLAIN ANALYZE

## Success Criteria
- ✅ Todas as policies auditadas
- ✅ Índices criados para queries lentas
- ✅ Query performance melhorada em 30%+
- ✅ E2E testing coverage 100% (~20 rotas)

## Estimated Effort
**6 hours**
```

2. **openspec/changes/optimize-rls-performance/tasks.md**

```markdown
# Tasks: Optimize RLS Performance

## Phase 1: Audit RLS Policies (2h)
- [ ] 1.1 Review all policies on disciplinas table
- [ ] 1.2 Review all policies on educacenso_exports table
- [ ] 1.3 Review all policies on sessoes_aula table
- [ ] 1.4 Review all policies on responsaveis_alunos table
- [ ] 1.5 Identify subqueries that can be optimized
- [ ] 1.6 Document slow queries with EXPLAIN ANALYZE

## Phase 2: Create Performance Indexes (1h)
- [ ] 2.1 Add index on turmas(escola_id, professor_id)
- [ ] 2.2 Add index on matriculas(turma_id, aluno_id, situacao)
- [ ] 2.3 Add index on frequencia(matricula_id, data_aula)
- [ ] 2.4 Add index on sessoes_aula(turma_id, status)
- [ ] 2.5 Test index usage with EXPLAIN ANALYZE

## Phase 3: Update Helper Functions (2h)
- [ ] 3.1 Update validate_user_school_access() with SECURITY DEFINER
- [ ] 3.2 Update can_modify_attendance() with SECURITY DEFINER
- [ ] 3.3 Test functions with all user roles
- [ ] 3.4 Benchmark performance improvement

## Phase 4: E2E Testing (1h)
- [ ] 4.1 Execute E2E testing suite (~20 rotas)
- [ ] 4.2 Test responsividade (desktop, mobile, tablet)
- [ ] 4.3 Capture screenshots de todas as páginas
- [ ] 4.4 Documentar problemas de UI/UX
- [ ] 4.5 Update E2E-TESTING-REPORT.md com coverage 100%
```

---

## CHANGE 3: evaluate-multitenancy-architecture (MÉDIA PRIORIDADE - 8-12h)

**Objetivo:** Avaliar e propor melhorias arquiteturais de longo prazo para multi-tenancy.

**Crie:**

1. **openspec/changes/evaluate-multitenancy-architecture/proposal.md**

```markdown
# Proposal: Evaluate Multi-Tenancy Architecture

## Problem Statement
Sistema atual usa row-based multi-tenancy com duplicação de dados (auth.users + public.users).
Análise arquitetural completa necessária para determinar melhor abordagem de longo prazo.

## Proposed Solution
1. **Research Phase** - Estudar padrões de multi-tenancy recomendados pelo Supabase
2. **Evaluate Alternatives** - Comparar 5 abordagens arquiteturais
3. **Recommend Solution** - Escolher melhor opção para sistema educacional brasileiro
4. **Implementation Plan** - Criar roadmap de migração (se necessário)

## Success Criteria
- ✅ Documento de análise arquitetural completo
- ✅ Comparação de 5 alternativas (pros/cons/effort)
- ✅ Recomendação final com justificativa
- ✅ Roadmap de implementação (se mudanças necessárias)

## Estimated Effort
**12 hours**
```

2. **openspec/changes/evaluate-multitenancy-architecture/tasks.md**

```markdown
# Tasks: Evaluate Multi-Tenancy Architecture

## Phase 1: Research (4h)
- [ ] 1.1 Study Supabase official multi-tenancy patterns
- [ ] 1.2 Research educational SaaS multi-tenancy examples
- [ ] 1.3 Review LGPD compliance requirements
- [ ] 1.4 Document findings in design.md

## Phase 2: Evaluate Alternatives (4h)
- [ ] 2.1 Evaluate Alternative 1: Row-based + SECURITY DEFINER (current)
- [ ] 2.2 Evaluate Alternative 2: Single source of truth (auth.users only)
- [ ] 2.3 Evaluate Alternative 3: Materialized views
- [ ] 2.4 Evaluate Alternative 4: Schema-based multi-tenancy
- [ ] 2.5 Evaluate Alternative 5: Hybrid approach (profiles + school_members)
- [ ] 2.6 Compare migration complexity, performance, LGPD compliance

## Phase 3: Recommend Solution (2h)
- [ ] 3.1 Choose best alternative with justification
- [ ] 3.2 Create migration path (step-by-step)
- [ ] 3.3 Estimate effort for implementation
- [ ] 3.4 Document risks and mitigations

## Phase 4: Implementation Plan (2h)
- [ ] 4.1 Create detailed SQL for schema changes
- [ ] 4.2 Create data migration scripts
- [ ] 4.3 Create RLS policy updates
- [ ] 4.4 Identify application code changes needed
```

---

## ✅ NEXT STEPS

Após criar estas 3 change proposals:

1. **Review com stakeholders** - Validar escopo e prioridades
2. **Começar por CHANGE 1** - Fix RLS (URGENTE - 4-6h)
3. **Seguir para CHANGE 2** - Optimize RLS (ALTA - 4-6h)
4. **Avaliar necessidade de CHANGE 3** - Arquitetura (MÉDIA - 8-12h)

**Comando para criar:**
```bash
# Claude Code / AI Assistant:
Por favor, crie as 3 change proposals no formato OpenSpec conforme especificado em
OPENSPEC-SETUP-PROMPT.md. Siga EXATAMENTE a estrutura de diretórios e formato de
arquivos descrita.
```

**Validação:**
```bash
openspec list                         # Ver changes criadas
openspec validate fix-rls-circular-dependencies
openspec show fix-rls-circular-dependencies
```
```
