# Visual Audit Report - EDUCA

**Date:** 2025-12-13
**Auditor:** Claude (via Chrome DevTools MCP)
**Dev Server:** http://localhost:3000
**Auth:** admin@fronteira.mg.gov.br

## Executive Summary

| Category | Count |
|----------|-------|
| Pages Audited | 30 |
| Critical Errors | 2 pages |
| Accessibility Issues | 15+ pages |
| Recurring Warnings | 2 (on most pages) |
| Clean Pages | 8 |

**Critical Issues Found:**
1. `/dashboard/diario` - Multiple 400 errors, API failing
2. `/dashboard` - 4x 400 errors on API calls

## Pages Audited

### Public Pages

| Page | URL | Status | Errors | Warnings |
|------|-----|--------|--------|----------|
| Home | / | ✅ | 0 | 1 |
| Login | /login | ✅ | 0 | 3 |
| Showcase | /showcase | ✅ | 0 | 2 |
| Platform Names | /platform-names | ✅ | 0 | 2 |

### Dashboard - Main

| Page | URL | Status | Errors | Issues |
|------|-----|--------|--------|--------|
| Dashboard | /dashboard | ⚠️ | 4x 400 | API errors |
| Alunos | /dashboard/alunos | ✅ | 0 | 1 form field |
| Usuarios | /dashboard/usuarios | ✅ | 0 | 1 form field |
| Escolas | /dashboard/escolas | ✅ | 0 | 1 form field |
| Turmas | /dashboard/turmas | ✅ | 0 | 1 form field |
| Matriculas | /dashboard/matriculas | ✅ | 0 | 1 form field |
| Frequencia | /dashboard/frequencia | ✅ | 0 | 0 |
| Diario | /dashboard/diario | ❌ | 12+ | API failing |
| Notas | /dashboard/notas | ✅ | 0 | 1 form field |
| Relatorios | /dashboard/relatorios | ✅ | 0 | 0 |
| Configuracoes | /dashboard/configuracoes | ✅ | 0 | 2 issues |
| Perfil | /dashboard/perfil | ✅ | 0 | 1 autocomplete |
| Sessoes | /dashboard/sessoes | ✅ | 0 | 1 label |
| Responsaveis | /dashboard/responsaveis | ✅ | 0 | 1 form field |
| Atividades | /dashboard/atividades | ✅ | 0 | 0 |

### Dashboard - Forms (New/Edit)

| Page | URL | Form Field Issues | Label Issues | Autocomplete |
|------|-----|-------------------|--------------|--------------|
| Novo Aluno | /dashboard/alunos/novo | 4 | 3 | 1 |
| Nova Matricula | /dashboard/matriculas/nova | 2 | 1 | 0 |
| Nova Turma | /dashboard/turmas/nova | 5 | 4 | 0 |
| Nova Escola | /dashboard/escolas/nova | 1 | 0 | 0 |
| Novo Usuario | /dashboard/usuarios/novo | 4 | 2 | 1 |
| Novo Responsavel | /dashboard/responsaveis/novo | 1 | 1 | 1 |

### Diario Module (Separate)

| Page | URL | Status | Errors |
|------|-----|--------|--------|
| Diario Root | /diario | ✅ | 0 |
| Diario Frequencia | /diario/frequencia | ✅ | 0 |

### Relatorios Module (Separate)

| Page | URL | Status | Errors |
|------|-----|--------|--------|
| Frequencia | /relatorios/frequencia | ✅ | 0 |
| Conteudo | /relatorios/conteudo | ✅ | 0 |
| Bolsa Familia | /relatorios/bolsa-familia | ✅ | 0 (cleanest!) |

## Critical Issues

### 1. /dashboard/diario - API Failures (CRITICAL)

```
[error] Failed to load resource: 400
[error] Error fetching available turmas
[error] Error fetching class diary
```

**Root Cause:** API endpoint returning 400 errors
**Impact:** Class diary functionality completely broken
**Fix Priority:** P0 - Immediate

### 2. /dashboard - Multiple 400 Errors

```
[error] Failed to load resource: 400 (4 occurrences)
```

**Impact:** Some dashboard data may not load
**Fix Priority:** P1 - High

## Accessibility Issues Summary

### Form Fields Missing id/name Attribute

This issue appears on **15+ pages**. Affects:
- All list pages with search/filter inputs
- All form pages (novo/edit)

**Fix:** Add `id` or `name` attributes to all form inputs

### Incorrect Label Usage

```
[issue] Incorrect use of <label for=FORM_ELEMENT>
```

**Affected Pages:**
- /dashboard/alunos/novo (3 instances)
- /dashboard/turmas/nova (4 instances)
- /dashboard/usuarios/novo (2 instances)
- /dashboard/configuracoes (1 instance)
- /dashboard/sessoes (1 instance)
- /dashboard/responsaveis/novo (1 instance)
- /dashboard/matriculas/nova (1 instance)

**Fix:** Ensure label `for` attribute matches input `id`

### Missing Autocomplete Attribute

```
[issue] An element doesn't have an autocomplete attribute
```

**Affected Pages:**
- /dashboard/alunos/novo
- /dashboard/usuarios/novo
- /dashboard/perfil
- /dashboard/responsaveis/novo

**Fix:** Add `autocomplete` attribute to form inputs (email, name, etc.)

## Recurring Warnings

These appear on **most pages**:

### 1. Unused Preload - logo-completo.png
```
The resource /identity/logo-completo.png was preloaded using link preload
but not used within a few seconds from the window's load event.
```

### 2. Unused Preload - brasao.png
```
The resource /identity/brasao.png was preloaded using link preload
but not used within a few seconds from the window's load event.
```

**Fix:** Remove unused preload links from `<head>` or use the resources

## Screenshots Captured

```
.audit/screenshots/desktop/
├── home.png
├── login.png
├── dashboard.png
├── dashboard-authenticated.png
├── alunos.png
├── usuarios.png
├── escolas.png
├── turmas.png
├── matriculas.png
├── frequencia.png
├── diario.png
├── notas.png
├── relatorios.png
├── configuracoes.png
├── alunos-novo.png
├── matriculas-nova.png
├── turmas-nova.png
├── escolas-nova.png
├── usuarios-novo.png
├── perfil.png
├── sessoes.png
├── responsaveis.png
├── responsaveis-novo.png
├── atividades.png
├── diario-root.png
├── diario-frequencia.png
├── relatorios-frequencia.png
├── relatorios-conteudo.png
├── relatorios-bolsa-familia.png
├── showcase.png
└── platform-names.png
```

## Priority Matrix

| Priority | Issue | Pages Affected | Effort |
|----------|-------|----------------|--------|
| P0 | /dashboard/diario API errors | 1 | Medium |
| P1 | /dashboard 400 errors | 1 | Medium |
| P2 | Form field id/name missing | 15+ | Low each |
| P2 | Incorrect label for | 7 | Low each |
| P3 | Missing autocomplete | 4 | Low |
| P3 | Unused preload warnings | All | 5 min |

## Recommendations

### Immediate (P0/P1)
1. **Fix /dashboard/diario API** - Investigate 400 errors in class diary endpoints
2. **Fix /dashboard API calls** - Check which endpoints are failing

### Short-term (P2)
3. **Accessibility sweep** - Add id/name to all form inputs
4. **Label associations** - Fix all `<label for>` issues
5. **Autocomplete attributes** - Add to all personal data inputs

### Quick Wins (P3)
6. **Remove unused preloads** - Edit layout.tsx or head component
7. **Fix logo aspect ratio** - Add `height: auto` to Image styles

## TypeScript Errors

See separate file: `.audit/typescript-errors.txt`

~30 TypeScript errors found, mainly in:
- `lib/validation/attendance-workflow-validation.ts`
- `lib/services/attendance-workflow.ts`
- `lib/services/index.ts`
- `supabase/functions/auto-lock-sessions/index.ts` (Deno)

## Server Warnings

### next.config.js Issues
1. `eslint` configuration no longer supported in next.config.js
2. `middleware` file convention deprecated, use `proxy` instead

## Next Steps

1. ✅ Complete visual audit - DONE
2. Fix P0/P1 critical API errors
3. Run accessibility sweep
4. Create roadmap based on findings
