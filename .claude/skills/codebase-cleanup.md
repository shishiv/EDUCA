---
name: codebase-cleanup
description: Executes systematic 4-phase methodology for cleaning up codebases. Use after major features, before releases, during tech debt sprints, or when codebase grows unwieldy.
---

<objective>
Reduce technical debt and improve maintainability through a structured 4-phase cleanup process:
1. Dead Code Identification (analysis only)
2. API Route Consolidation
3. Component Organization
4. Dependencies & Configuration

Each phase builds on the previous. Commit after each phase for easy rollback.
</objective>

<quick_start>
**Before starting ANY phase:**
```bash
pnpm typecheck && pnpm build  # MUST pass
git status                     # MUST be clean
```

**Phase execution order:** Analysis → APIs → Components → Dependencies

**After EACH phase:**
```bash
pnpm typecheck && pnpm build  # Verify nothing broke
git add -A && git commit -m "refactor(cleanup): Phase X - description"
```
</quick_start>

<phases>

<phase name="1" title="Dead Code Identification">
**Goal:** Identify unused code WITHOUT removing yet.

**Commands:**
```bash
# Find components not imported anywhere
grep -r "import.*ComponentName" --include="*.tsx" --include="*.ts" .

# Find unused exports
grep -r "export.*functionName" --include="*.ts" .

# Check for orphaned API routes
grep -r "api/routeName" --include="*.tsx" --include="*.ts" app/ components/ lib/
```

**Checklist:**
- [ ] List all components and check import counts
- [ ] Identify API routes with no frontend consumers
- [ ] Find exports with zero imports
- [ ] Document files for removal (don't delete yet)

**Output:** List of files to review in subsequent phases.
</phase>

<phase name="2" title="API Route Consolidation">
**Goal:** Standardize and consolidate API structure.

**Naming conventions:**
- Choose ONE language for routes (e.g., Portuguese: `/api/alunos/`, `/api/turmas/`)
- Remove duplicates (e.g., `/api/students/` vs `/api/alunos/`)
- Use nested structure: `/api/[resource]/[action]/` not `/api/[resource]-[action]/`

**Commands:**
```bash
# List all API routes
ls -la app/api/

# Find duplicate routes
find app/api -name "route.ts" | xargs grep -l "table_name"
```

**Checklist:**
- [ ] Audit all API routes
- [ ] Identify duplicates (same table, different paths)
- [ ] Plan migration path (which to keep, which to remove)
- [ ] Update frontend imports BEFORE removing routes
- [ ] Remove deprecated routes
</phase>

<phase name="3" title="Component Organization">
**Goal:** Improve discoverability and reduce imports.

**Barrel exports:** Create `index.ts` for each component directory:
```typescript
// components/students/index.ts
export { StudentForm } from './student-form'
export { StudentList } from './student-list'
export type { StudentFormData } from './types'
```

**File naming:** Use kebab-case (`student-form.tsx` not `StudentForm.tsx`)

**Commands:**
```bash
# Find directories without index.ts
find components -type d ! -exec test -e "{}/index.ts" \; -print

# Find large files that should be split (>500 lines)
find components -name "*.tsx" -exec wc -l {} \; | awk '$1 > 500'
```

**Checklist:**
- [ ] Create barrel exports for all component directories
- [ ] Remove unused UI components
- [ ] Split files >500 lines into logical units
- [ ] Standardize file naming convention
- [ ] Update imports to use barrel exports
</phase>

<phase name="4" title="Dependencies & Configuration">
**Goal:** Optimize package.json and config files.

**Commands:**
```bash
# List all dependencies
cat package.json | jq '.dependencies, .devDependencies'

# Find unused dependencies
npx depcheck

# Check for duplicate type packages
grep "@types" package.json
```

**Config files to check:**
- `tsconfig.json` - Remove unused paths
- `next.config.js` - Remove deprecated options
- `vercel.json` - Remove catch-all rewrites that break APIs
- `components.json` - Verify file references exist

**Checklist:**
- [ ] Remove unused dependencies
- [ ] Move `@types/*` to devDependencies
- [ ] Verify all config file references are valid
- [ ] Consolidate duplicate utility modules
</phase>

</phases>

<safety_checklist>
**MUST do before each phase:**
- All tests pass: `pnpm test`
- TypeScript compiles: `pnpm typecheck`
- Build succeeds: `pnpm build`
- Git status clean (commit before starting)

**MUST do after each phase:**
- Run same checks above
- Visual spot-check in browser
- Commit with descriptive message
</safety_checklist>

<anti_patterns>
**NEVER do these:**
1. Delete without searching - ALWAYS grep before removing
2. Break barrel exports - Update index.ts when removing components
3. Remove "unused" deps used dynamically - Check for `require()` and dynamic imports
4. Consolidate different implementations - Audit algorithm correctness first
5. Remove type exports - May be used in external packages
</anti_patterns>

<metrics>
Track before/after:

| Metric | Before | After |
|--------|--------|-------|
| Total files | | |
| Lines of code | | |
| Dependencies | | |
| API routes | | |
| Components | | |

Use `cloc` for line counts:
```bash
cloc --exclude-dir=node_modules,.next --include-lang=TypeScript,JavaScript .
```
</metrics>

<commit_messages>
```
refactor(cleanup): Phase 1 - identify dead code (analysis only)
refactor(cleanup): Phase 2 - consolidate API routes (-X files)
refactor(cleanup): Phase 3 - organize components, add barrel exports (-X files)
refactor(cleanup): Phase 4 - remove unused deps, fix configs (-X deps)
```
</commit_messages>

<beads_integration>
Track cleanup as issues:
```bash
bd create --title="Codebase cleanup Phase 1: Analysis" --type=task
bd create --title="Codebase cleanup Phase 2: API consolidation" --type=task
bd create --title="Codebase cleanup Phase 3: Component organization" --type=task
bd create --title="Codebase cleanup Phase 4: Dependencies" --type=task

# Add dependencies (each phase depends on previous)
bd dep add <phase2-id> <phase1-id>
bd dep add <phase3-id> <phase2-id>
bd dep add <phase4-id> <phase3-id>
```
</beads_integration>

<success_criteria>
Cleanup is complete when:
- All 4 phases executed in order
- `pnpm typecheck` passes
- `pnpm build` succeeds
- Each phase has its own commit
- Metrics show reduction in files/deps
- No regressions in functionality
</success_criteria>
