---
phase: 18-database-types-regeneration
plan: 04
subsystem: api-routes
tags: [supabase, typescript, column-names, frequencia, sessoes]
dependency_graph:
  requires: [18-02]
  provides: ["corrected-api-queries", "async-cookies-pattern"]
  affects: [18-05, 18-06]
tech_stack:
  added: []
  patterns: ["async-cookies", "type-safe-joins", "matricula-based-attendance"]
file_tracking:
  created: []
  modified:
    - gestao_fronteira/app/api/frequencia/marcar/route.ts
    - gestao_fronteira/app/api/frequencia/sessao/[aula_id]/route.ts
    - gestao_fronteira/app/api/sessoes/aula/[id]/frequencia/batch/route.ts
    - gestao_fronteira/app/api/sessoes/aula/[id]/status/route.ts
    - gestao_fronteira/app/api/sessoes/aula/[id]/cancelar/route.ts
decisions:
  - id: matricula-based-attendance
    choice: "Use matricula_id for attendance records"
    reason: "Database schema uses matricula_id, not aluno_id - attendance is tied to enrollment"
  - id: escola-id-direct
    choice: "Use escola_id directly from sessoes_aula"
    reason: "sessoes_aula has escola_id column, no need to join turmas for school filtering"
  - id: async-cookies
    choice: "await cookies() for Next.js 15"
    reason: "cookies() is now async in Next.js 15, must be awaited before calling methods"
metrics:
  duration: "15 minutes"
  completed: "2026-01-24"
---

# Phase 18 Plan 04: Fix API Route Column Name Mismatches Summary

Corrected Supabase query column names in API routes to match the production database schema revealed by types regeneration.

## What Was Done

### Task 1: attendance/trends route (No changes needed)

The attendance/trends route was already correctly implemented using `matricula_id`. Verified it passes type checking.

### Task 2: sessoes/aula/abrir route (No changes needed)

The abrir route was already correctly implemented with:
- `escola_id: turma.escola_id`
- `inicio_aula` and `fim_aula`
- `created_at` (auto-generated)

### Task 3: Fix frequencia and session routes

**frequencia/marcar/route.ts:**
- Added `await cookies()` for Next.js 15 compatibility
- Fixed logger.error formatting to use proper signature

**frequencia/sessao/[aula_id]/route.ts:**
- Added `await cookies()` for Next.js 15
- Changed `role` to `tipo_usuario` for user type check
- Changed `status` to `situacao` for matricula filtering
- Changed `aluno_id` to `matricula_id` for frequencia queries
- Changed `nome` to `nome_completo` for student names
- Used `escola_id` directly from `aulas_abertas` instead of joining turmas
- Changed `data` to `data_aula` for date filtering

**sessoes/aula/[id]/frequencia/batch/route.ts:**
- Changed `aluno_id` to `matricula_id` throughout
- Changed `aula_session_id` to `sessao_id`
- Changed `is_locked` to `bloqueado/travado`
- Changed `horario_marcacao` to `marcado_em`
- Changed `created_by/updated_by` to `marcado_por`
- Added `data_aula` required field to inserts
- Added `status_presenca` field
- Changed `ativo` to `situacao === 'ativa'` for enrollment checks
- Fixed logger formatting
- Added explicit types to filter callbacks

**sessoes/aula/[id]/status/route.ts:**
- Changed `criada_em` to `created_at`
- Changed `conteudo_ministrado` to `conteudo_programatico`
- Changed `nome_completo` to `nome`
- Used `escola_id` directly from sessoes_aula
- Added type-safe access for join results
- Fixed logger formatting

**sessoes/aula/[id]/cancelar/route.ts:**
- Changed `aluno_id` to `matricula_id`
- Changed `aula_session_id` to `sessao_id`
- Changed `criada_em` to `created_at`
- Changed `conteudo_ministrado` to `conteudo_programatico`
- Changed `nome_completo` to `nome`
- Used `escola_id` directly from sessoes_aula
- Added type-safe access for join results
- Fixed logger formatting

## Key Column Mappings

| Old Name | Correct Name | Table |
|----------|--------------|-------|
| aluno_id | matricula_id | frequencia |
| aula_session_id | sessao_id | frequencia |
| hora_inicio | inicio_aula | sessoes_aula |
| hora_fim | fim_aula | sessoes_aula |
| criada_em | created_at | sessoes_aula |
| conteudo_ministrado | conteudo_programatico | sessoes_aula |
| nome_completo | nome | users |
| role | tipo_usuario | users |
| ativo | situacao | matriculas |
| status | situacao | matriculas |
| is_locked | bloqueado/travado | frequencia |

## Verification

```bash
# API route type errors: 0
pnpm typecheck 2>&1 | grep -E "app/api/frequencia|app/api/sessoes|app/api/attendance" | wc -l
# Result: 0
```

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Users table column names**
- Issue: Users table uses `nome` not `nome_completo`, `tipo_usuario` not `role`
- Fix: Updated all user queries to use correct column names

**2. [Rule 2 - Missing Critical] Matriculas status column**
- Issue: Matriculas uses `situacao` not `status` or `ativo` boolean
- Fix: Changed enrollment checks to use `situacao === 'ativa'`

**3. [Rule 1 - Bug] Type-unsafe join access**
- Issue: Accessing .escola_id on turmas join when it returns an array
- Fix: Use `escola_id` directly from sessoes_aula which has the column

## Files Modified

| File | Changes |
|------|---------|
| `app/api/frequencia/marcar/route.ts` | async cookies(), logger formatting |
| `app/api/frequencia/sessao/[aula_id]/route.ts` | Complete rewrite with correct columns |
| `app/api/sessoes/aula/[id]/frequencia/batch/route.ts` | Complete rewrite with correct columns |
| `app/api/sessoes/aula/[id]/status/route.ts` | Column fixes, type safety |
| `app/api/sessoes/aula/[id]/cancelar/route.ts` | Column fixes, type safety |

## Commit

```
941f0ad fix(18-04): fix API route column name mismatches
```
