# EDUCA - Roadmap MVP 2025

**Data:** 2025-12-13
**Objetivo:** Sistema funcional para início do ano letivo 2025
**Baseline:** Auditoria visual completa (30 páginas, 31 screenshots)

---

## Resumo Executivo

| Fase | Prioridade | Esforço | Status |
|------|------------|---------|--------|
| 1. Critical Fixes | P0 | 1-2 dias | Pendente |
| 2. Database Cleanup | P1 | 1 dia | Pendente |
| 3. Accessibility Fixes | P2 | 2-3 dias | Pendente |
| 4. BNCC Compliance | P2 | 3-5 dias | Pendente |
| 5. Quick Wins | P3 | 1 dia | Pendente |
| 6. Visual Identity | P3 | Aguardando | Bloqueado |

---

## Fase 1: Critical Fixes (P0)

### 1.1 API Errors - /dashboard/diario

**Problema:** 12+ erros 400 na página, módulo completamente quebrado

```
[error] Failed to load resource: 400
[error] Error fetching available turmas
[error] Error fetching class diary
```

**Impacto:** Diário de classe não funciona
**Arquivos prováveis:**
- `app/api/turmas/route.ts`
- `app/api/sessoes/aula/route.ts`
- `app/(dashboard)/dashboard/diario/page.tsx`

**Ação:**
1. Investigar endpoints retornando 400
2. Verificar validação de parâmetros
3. Testar com dados de seed

---

### 1.2 API Errors - /dashboard

**Problema:** 4x erros 400 no dashboard principal

**Impacto:** Dados do dashboard podem não carregar
**Arquivos prováveis:**
- `app/api/` (múltiplos endpoints)
- `app/(dashboard)/dashboard/page.tsx`

**Ação:**
1. Identificar quais endpoints falham
2. Verificar autenticação/headers
3. Corrigir validações

---

## Fase 2: Database Cleanup (P1)

**Ver:** [database-cleanup.md](../005-database-cleanup-plan/database-cleanup.md)

### Resumo

| Categoria | Atual | Meta |
|-----------|-------|------|
| Migrations totais | 42 | ~15 |
| RLS policies migrations | 17 | 2 |
| Index migrations | 5 | 1 |

**Ações principais:**
1. Consolidar 17 migrations de RLS em 2
2. Consolidar 5 migrations de índices em 1
3. Remover migrations duplicadas (ex: fix_onboarding_rls aparece 2x)
4. Gerar schema consolidado

---

## Fase 3: Accessibility Fixes (P2)

### 3.1 Form Fields Missing id/name

**Total:** 25+ instâncias em 15+ páginas

**Páginas mais afetadas:**
| Página | Issues |
|--------|--------|
| /dashboard/turmas/nova | 5 |
| /dashboard/alunos/novo | 4 |
| /dashboard/usuarios/novo | 4 |
| /dashboard/matriculas/nova | 2 |

**Fix padrão:**
```tsx
// Antes
<Input placeholder="Nome" />

// Depois
<Input id="nome" name="nome" placeholder="Nome" />
```

---

### 3.2 Incorrect Label Usage

**Total:** 13 instâncias

**Páginas afetadas:**
- /dashboard/turmas/nova (4)
- /dashboard/alunos/novo (3)
- /dashboard/usuarios/novo (2)
- Outros (4)

**Fix padrão:**
```tsx
// Antes
<Label htmlFor="wrong-id">Nome</Label>
<Input id="different-id" />

// Depois
<Label htmlFor="nome">Nome</Label>
<Input id="nome" />
```

---

### 3.3 Missing Autocomplete

**Total:** 4 instâncias

**Campos afetados:**
- Email inputs
- Name inputs
- Password inputs (se houver)

**Fix:**
```tsx
<Input
  id="email"
  type="email"
  autoComplete="email"
/>
```

---

## Fase 4: BNCC Compliance (P2)

### 4.1 Notas - Estrutura BNCC

**Requisito:** Sistema de notas compatível com BNCC

**Componentes:**
- Avaliações por competências
- Relatórios descritivos
- Indicadores de aprendizagem

**Arquivos:**
- `components/grades/`
- `app/(dashboard)/dashboard/notas/`
- `app/api/notas/`

---

### 4.2 Relatórios - Formato BNCC

**Requisito:** Relatórios seguindo diretrizes BNCC

**Tipos de relatório:**
- Boletim escolar
- Relatório de frequência
- Relatório Bolsa Família (já funcional!)
- Parecer descritivo

**Arquivos:**
- `components/reports/`
- `app/(dashboard)/dashboard/relatorios/`

---

### 4.3 Campos Educacenso

**Requisito:** Conformidade com Educacenso/INEP

**Tabela existente:** `educacenso_exports`
**Campos obrigatórios:** CPF, NIS, raça, transporte

**Status:** Estrutura existe, validar preenchimento

---

## Fase 5: Quick Wins (P3)

### 5.1 Remover Preloads Não Utilizados

**Problema:** Warnings em todas as páginas
```
The resource /identity/logo-completo.png was preloaded but not used
The resource /identity/brasao.png was preloaded but not used
```

**Fix:** Editar layout ou head component
**Esforço:** 5 minutos

---

### 5.2 Atualizar next.config.js

**Problema:**
```
Unrecognized key(s) in object: 'eslint'
```

**Fix:** Remover config de eslint obsoleto
**Esforço:** 2 minutos

---

### 5.3 Migrar Middleware para Proxy

**Problema:**
```
The "middleware" file convention is deprecated. Please use "proxy" instead.
```

**Fix:** Atualizar convenção de middleware
**Esforço:** 30 minutos

---

## Fase 6: Visual Identity (P3) - BLOQUEADO

**Status:** Aguardando input do usuário

**Requisitos pendentes:**
- [ ] Site de referência para design
- [ ] Preferências de cores
- [ ] Logo definitivo

**Quando desbloqueado:**
1. Definir paleta de cores
2. Criar design tokens
3. Atualizar componentes shadcn/ui
4. Aplicar identidade visual

---

## Páginas por Status

### ✅ Funcionais (sem erros críticos)

| Página | Issues Menores |
|--------|----------------|
| /dashboard/frequencia | 0 |
| /dashboard/relatorios | 0 |
| /dashboard/atividades | 0 |
| /diario | 0 |
| /diario/frequencia | 0 |
| /relatorios/frequencia | 0 |
| /relatorios/conteudo | 0 |
| /relatorios/bolsa-familia | 0 (cleanest!) |

### ⚠️ Funcionais com issues menores

| Página | Form Field | Label | Autocomplete |
|--------|------------|-------|--------------|
| /dashboard/alunos | 1 | - | - |
| /dashboard/usuarios | 1 | - | - |
| /dashboard/escolas | 1 | - | - |
| /dashboard/turmas | 1 | - | - |
| /dashboard/matriculas | 1 | - | - |
| /dashboard/notas | 1 | - | - |
| /dashboard/responsaveis | 1 | - | - |
| /dashboard/perfil | - | - | 1 |
| /dashboard/sessoes | - | 1 | - |
| /dashboard/configuracoes | 1 | 1 | - |

### ❌ Com erros críticos

| Página | Tipo | Prioridade |
|--------|------|------------|
| /dashboard | 4x 400 errors | P1 |
| /dashboard/diario | 12+ errors | P0 |

---

## Métricas de Sucesso

### MVP Mínimo (Ano Letivo 2025)

- [ ] Zero erros 400 nas páginas principais
- [ ] Diário de classe funcional
- [ ] Frequência registrando corretamente
- [ ] Relatório Bolsa Família exportando
- [ ] Todas as páginas acessíveis (WCAG 2.1 AA)

### Ideal

- [ ] BNCC compliance em notas
- [ ] Relatórios descritivos
- [ ] Identidade visual aplicada
- [ ] Testes unitários restaurados
- [ ] Zero TypeScript errors

---

## Próximos Passos

1. **Imediato:** Investigar e corrigir /dashboard/diario
2. **Esta semana:** Completar Fase 1 (Critical Fixes)
3. **Próxima semana:** Fases 2-3 (Database + Accessibility)
4. **Antes do ano letivo:** Fase 4 (BNCC)

---

## Referências

- [Audit Report](.audit/AUDIT-REPORT.md)
- [Console Errors](.audit/console-errors.md)
- [Database Cleanup Plan](../005-database-cleanup-plan/database-cleanup.md)
- [Screenshots](.audit/screenshots/desktop/)
