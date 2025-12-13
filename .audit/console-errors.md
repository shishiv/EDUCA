# Console Errors & Warnings Log

**Date:** 2025-12-13
**Auth:** admin@fronteira.mg.gov.br (authenticated audit)

## Summary

| Type | Count |
|------|-------|
| Critical Errors | 16+ (2 pages) |
| Accessibility Issues | 30+ |
| Warnings | 2 (recurring) |

## Critical Errors

### /dashboard - 4x 400 Errors

```
[error] Failed to load resource: the server responded with a status of 400 ()
```

4 occurrences - some API endpoints failing on main dashboard.

### /dashboard/diario - 12+ Errors (BROKEN)

```
[error] Failed to load resource: the server responded with a status of 400 ()
[error] Error fetching available turmas
[error] Error fetching turmas: [object Object]
[error] Error fetching class diary
[error] Error fetching class diary: [object Object]
```

**Impact:** Class diary module completely non-functional
**Root Cause:** API endpoints returning 400 errors for turmas/diary data

## Accessibility Issues

### Form Field Missing id/name

**Message:**
```
[issue] A form field element should have an id or name attribute
```

**Pages Affected:**

| Page | Count |
|------|-------|
| /dashboard/alunos | 1 |
| /dashboard/usuarios | 1 |
| /dashboard/escolas | 1 |
| /dashboard/turmas | 1 |
| /dashboard/matriculas | 1 |
| /dashboard/notas | 1 |
| /dashboard/configuracoes | 1 |
| /dashboard/responsaveis | 1 |
| /dashboard/alunos/novo | 4 |
| /dashboard/matriculas/nova | 2 |
| /dashboard/turmas/nova | 5 |
| /dashboard/escolas/nova | 1 |
| /dashboard/usuarios/novo | 4 |
| /dashboard/responsaveis/novo | 1 |

**Total:** 25+ instances

### Incorrect Label Usage

**Message:**
```
[issue] Incorrect use of <label for=FORM_ELEMENT>
```

**Pages Affected:**

| Page | Count |
|------|-------|
| /dashboard/configuracoes | 1 |
| /dashboard/sessoes | 1 |
| /dashboard/alunos/novo | 3 |
| /dashboard/matriculas/nova | 1 |
| /dashboard/turmas/nova | 4 |
| /dashboard/usuarios/novo | 2 |
| /dashboard/responsaveis/novo | 1 |

**Total:** 13 instances

### Missing Autocomplete Attribute

**Message:**
```
[issue] An element doesn't have an autocomplete attribute
```

**Pages Affected:**
- /dashboard/alunos/novo (1)
- /dashboard/usuarios/novo (1)
- /dashboard/perfil (1)
- /dashboard/responsaveis/novo (1)

**Total:** 4 instances

## Recurring Warnings

These warnings appear on **most pages**:

### Warning 1: Unused Preload (logo-completo.png)

**Message:**
```
The resource http://localhost:3000/identity/logo-completo.png was preloaded
using link preload but not used within a few seconds from the window's
load event. Please make sure it has an appropriate `as` value and it is
preloaded intentionally.
```

**Root Cause:** Link preload in head for resource that isn't rendered

### Warning 2: Unused Preload (brasao.png)

**Message:**
```
The resource http://localhost:3000/identity/brasao.png was preloaded
using link preload but not used within a few seconds from the window's
load event.
```

**Root Cause:** Same as Warning 1

## By Page (Summary)

### Clean Pages (no issues except recurring warnings)
- /dashboard/frequencia
- /dashboard/relatorios
- /dashboard/atividades
- /diario
- /diario/frequencia
- /relatorios/frequencia
- /relatorios/conteudo
- /relatorios/bolsa-familia (cleanest - no warnings!)

### Pages with Minor Issues
- /dashboard/alunos - 1 form field
- /dashboard/usuarios - 1 form field
- /dashboard/escolas - 1 form field
- /dashboard/turmas - 1 form field
- /dashboard/matriculas - 1 form field
- /dashboard/notas - 1 form field
- /dashboard/responsaveis - 1 form field
- /dashboard/perfil - 1 autocomplete
- /dashboard/sessoes - 1 label

### Pages with Multiple Issues
- /dashboard/configuracoes - 1 form field + 1 label
- /dashboard/alunos/novo - 4 form fields + 3 labels + 1 autocomplete
- /dashboard/matriculas/nova - 2 form fields + 1 label
- /dashboard/turmas/nova - 5 form fields + 4 labels
- /dashboard/escolas/nova - 1 form field
- /dashboard/usuarios/novo - 4 form fields + 2 labels + 1 autocomplete
- /dashboard/responsaveis/novo - 1 form field + 1 label + 1 autocomplete

### Pages with Critical Errors
- /dashboard - 4x 400 errors
- /dashboard/diario - 12+ errors (completely broken)

## Server-Side Warnings

From Next.js dev server:

### 1. ESLint Config Deprecated
```
Invalid next.config.js options detected:
Unrecognized key(s) in object: 'eslint'
```

### 2. Middleware Deprecated
```
The "middleware" file convention is deprecated.
Please use "proxy" instead.
```

## Fix Recommendations

### Priority 1 - Critical
1. Fix /dashboard/diario API endpoints (400 errors)
2. Fix /dashboard API endpoints (400 errors)

### Priority 2 - Accessibility
3. Add id/name to all form inputs (25+ instances)
4. Fix label for associations (13 instances)
5. Add autocomplete attributes (4 instances)

### Priority 3 - Quick Fixes
6. Remove unused preload links for logo-completo.png and brasao.png
7. Remove eslint config from next.config.js
8. Migrate middleware to proxy
