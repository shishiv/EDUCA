# Prompt: System Audit Research

## Objective
Execute a comprehensive audit of the EDUCA system to identify all current problems, technical debt, and areas requiring attention.

## Context
- Project: EDUCA - Educational management system (Next.js 15 + Supabase)
- Location: `gestao_fronteira/`
- Skills available: `visual-debugging`, `codebase-cleanup`
- Issue tracking: Beads (`bd` commands)

## Research Tasks

### 1. Visual Audit (Use skill: visual-debugging)

**Prerequisite:** Dev server running (`pnpm dev` in `gestao_fronteira/`)

Execute the visual-debugging skill to:
- Navigate all 38 pages
- Capture screenshots at 3 viewport sizes
- Collect console errors and warnings
- Generate `.audit/AUDIT-REPORT.md`

**Pages to audit:**
```
/                           # Landing
/login                      # Auth
/dashboard                  # Main dashboard
/dashboard/alunos           # Students list
/dashboard/alunos/novo      # New student
/dashboard/alunos/[id]      # Student detail
/dashboard/turmas           # Classes list
/dashboard/turmas/nova      # New class
/dashboard/turmas/[id]      # Class detail
/dashboard/escolas          # Schools list
/dashboard/escolas/nova     # New school
/dashboard/escolas/[id]     # School detail
/dashboard/frequencia       # Attendance
/dashboard/notas            # Grades
/dashboard/diario           # Class diary
/dashboard/sessoes          # Sessions
/dashboard/relatorios       # Reports
/dashboard/usuarios         # Users
/dashboard/responsaveis     # Guardians
/dashboard/matriculas       # Enrollments
/dashboard/configuracoes    # Settings
/dashboard/perfil           # Profile
... (and all nested routes)
```

### 2. TypeScript Errors Analysis

Run `pnpm typecheck` and categorize errors:

```bash
cd gestao_fronteira && pnpm typecheck 2>&1 | tee .audit/typescript-errors.txt
```

**Categorize by:**
- File location (lib/, components/, app/)
- Error type (type mismatch, missing types, etc.)
- Severity (blocking build vs warnings)

**Known issues from previous analysis:**
- `lib/validation/attendance-workflow-validation.ts` - Status type issues
- `lib/validation/descriptive-report.ts` - Zod validation
- `lib/validation/lesson-content.ts` - Type mismatch
- `supabase/functions/auto-lock-sessions/index.ts` - Deno module issues

### 3. Database Migrations Analysis

List and analyze all 42 migrations:

```bash
# Get migration list from Supabase MCP
mcp__supabase__list_migrations
```

**Identify:**
- Duplicate migrations (same functionality, different versions)
- Obsolete migrations (features that were removed)
- RLS policy rewrites (multiple versions)
- Consolidation opportunities

**Group migrations by purpose:**
- Schema creation
- RLS policies
- Performance indexes
- Feature additions
- Bug fixes

### 4. Component Analysis

Map component usage and dependencies:

```bash
# Count component usage
for dir in components/*/; do
  name=$(basename "$dir")
  count=$(grep -r "from.*components/$name" --include="*.tsx" --include="*.ts" app/ | wc -l)
  echo "$name: $count imports"
done
```

**Identify:**
- Unused components (0 imports)
- Over-used components (potential for optimization)
- Missing barrel exports (directories without index.ts)
- Large files (>500 lines)

### 5. API Routes Analysis

Audit API routes in `app/api/`:

```bash
ls -la gestao_fronteira/app/api/
```

**Check:**
- Active vs deprecated routes
- Route naming consistency (Portuguese vs English)
- Duplicate functionality
- Missing error handling

### 6. Dependencies Analysis

```bash
cd gestao_fronteira && npx depcheck
```

**Identify:**
- Unused dependencies
- Missing peer dependencies
- Outdated packages with security issues

## Output

Create `.prompts/003-system-audit-research/system-audit.md` with:

```markdown
# System Audit Report

**Date:** {date}
**Auditor:** Claude

## Executive Summary
[1-2 paragraph overview of findings]

## Visual Audit Results
- Pages audited: X
- Pages with errors: X
- Pages with warnings: X
- Responsiveness issues: X

See: .audit/AUDIT-REPORT.md

## TypeScript Errors
| Category | Count | Priority |
|----------|-------|----------|
| Type mismatches | X | High |
| Missing types | X | Medium |
| Deno issues | X | Low |

### Critical Errors
[List blocking errors]

### Files Requiring Attention
[List files with most errors]

## Database Migrations
| Category | Count |
|----------|-------|
| Total migrations | 42 |
| Duplicate/obsolete | X |
| RLS rewrites | X |

### Consolidation Opportunities
[List migrations that can be combined]

### Obsolete Migrations
[List migrations for features that no longer exist]

## Component Analysis
| Metric | Count |
|--------|-------|
| Total components | X |
| Unused components | X |
| Missing barrel exports | X |
| Large files (>500 lines) | X |

### Unused Components
[List for removal]

### Components Needing Refactor
[List with reasons]

## API Routes
| Status | Count |
|--------|-------|
| Active | X |
| Deprecated | X |
| Duplicate | X |

### Issues Found
[List naming inconsistencies, duplicates, etc.]

## Dependencies
| Status | Count |
|--------|-------|
| Total | X |
| Unused | X |
| Outdated | X |

### Unused Dependencies
[List for removal]

## Priority Matrix

| Issue | Impact | Effort | Priority |
|-------|--------|--------|----------|
| [Issue 1] | High | Low | P1 |
| [Issue 2] | High | High | P2 |
| [Issue 3] | Low | Low | P3 |

## Recommendations

### Immediate (P1)
1. [Action item]
2. [Action item]

### Short-term (P2)
1. [Action item]
2. [Action item]

### Long-term (P3)
1. [Action item]
2. [Action item]

<metadata>
<confidence>high</confidence>
<dependencies>
- Chrome DevTools MCP for visual audit
- Dev server running for page navigation
- Supabase MCP for migrations
</dependencies>
<open_questions>
- [Any questions that arose during research]
</open_questions>
<assumptions>
- Dev server accessible at localhost:3000
- All MCP servers connected
</assumptions>
</metadata>
```

## Success Criteria
- [ ] Visual audit completed with screenshots
- [ ] TypeScript errors categorized
- [ ] Migrations analyzed for consolidation
- [ ] Components mapped for usage
- [ ] API routes audited
- [ ] Dependencies checked
- [ ] Priority matrix created
- [ ] Recommendations documented
