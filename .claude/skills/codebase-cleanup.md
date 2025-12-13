# Skill: Codebase Cleanup

Systematic 4-phase methodology for cleaning up codebases, reducing technical debt, and improving maintainability.

## When to Use

- After major feature implementations
- Before production releases
- During technical debt sprints
- When codebase grows unwieldy
- Before onboarding new team members

## Phases

### Phase 1: Dead Code Identification

**Goal:** Identify unused code without removing yet.

```bash
# Find components not imported anywhere
grep -r "import.*ComponentName" --include="*.tsx" --include="*.ts" .

# Find unused exports
grep -r "export.*functionName" --include="*.ts" .

# Check for orphaned API routes (routes with no frontend calls)
grep -r "api/routeName" --include="*.tsx" --include="*.ts" app/ components/ lib/
```

**Checklist:**
- [ ] List all components and check import counts
- [ ] Identify API routes with no frontend consumers
- [ ] Find exports with zero imports
- [ ] Document files for removal (don't delete yet)

### Phase 2: API Route Consolidation

**Goal:** Standardize and consolidate API structure.

**Naming Convention Check:**
- Choose ONE language for route names (e.g., Portuguese: `/api/alunos/`, `/api/turmas/`)
- Remove English/Portuguese duplicates (e.g., `/api/students/` vs `/api/alunos/`)
- Use nested structure: `/api/[resource]/[action]/` not `/api/[resource]-[action]/`

**Actions:**
```bash
# Find duplicate routes (same functionality, different names)
ls -la app/api/

# Check for similar route patterns
find app/api -name "route.ts" | xargs grep -l "similar_table_name"
```

**Checklist:**
- [ ] Audit all API routes
- [ ] Identify duplicates (same table, different paths)
- [ ] Plan migration path (which to keep, which to remove)
- [ ] Update frontend imports before removing routes
- [ ] Remove deprecated routes

### Phase 3: Component Organization

**Goal:** Improve component discoverability and reduce imports.

**Barrel Exports:**
Create `index.ts` for each component directory:
```typescript
// components/students/index.ts
export { StudentForm } from './student-form'
export { StudentList } from './student-list'
export { StudentCard } from './student-card'
export type { StudentFormData } from './types'
```

**File Naming:**
- Use kebab-case: `student-form.tsx` not `StudentForm.tsx`
- Group related files in directories
- Remove prefix redundancy: `components/students/form.tsx` not `components/students/student-form.tsx`

**Actions:**
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

### Phase 4: Dependencies & Configuration

**Goal:** Optimize package.json and config files.

**Dependencies Audit:**
```bash
# List all dependencies
cat package.json | jq '.dependencies, .devDependencies'

# Find unused dependencies (requires depcheck)
npx depcheck

# Check for duplicate type packages
grep "@types" package.json
```

**Configuration Files:**
- `tsconfig.json` - Remove unused paths
- `next.config.js` - Remove deprecated options
- `vercel.json` - Remove catch-all rewrites that break APIs
- `components.json` - Verify file references exist

**Checklist:**
- [ ] Remove unused dependencies
- [ ] Move `@types/*` to devDependencies
- [ ] Verify all config file references are valid
- [ ] Remove problematic catch-all rewrites
- [ ] Consolidate duplicate utility modules

## Validation Module Consolidation

When consolidating validation/utility modules:

1. **Choose canonical location:** e.g., `lib/validation/`
2. **Create backward-compatible aliases:**
   ```typescript
   // Keep old function names working
   export const validatePhone = validateBrazilianPhone
   export const formatPhone = formatBrazilianPhone
   ```
3. **Update all imports:**
   ```bash
   # Find files importing from old location
   grep -r "@/lib/validators" --include="*.ts" --include="*.tsx"

   # Replace imports
   sed -i 's/@\/lib\/validators/@\/lib\/validation/g' file.ts
   ```
4. **Remove old directory after all imports updated**

## Execution Order

1. **Analysis First:** Run Phase 1 completely before making changes
2. **Backend Before Frontend:** Phase 2 (APIs) before Phase 3 (Components)
3. **Deps Last:** Phase 4 after code changes to accurately detect unused deps
4. **Commit Per Phase:** One commit per phase for easy rollback

## Metrics to Track

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

## Safety Checks

Before each phase:
- [ ] All tests pass: `pnpm test`
- [ ] TypeScript compiles: `pnpm typecheck`
- [ ] Build succeeds: `pnpm build`
- [ ] Git status clean (commit before starting)

After each phase:
- [ ] Run same checks
- [ ] Visual spot-check in browser
- [ ] Commit with descriptive message

## Anti-Patterns to Avoid

1. **Don't delete without searching:** Always grep before removing
2. **Don't break barrel exports:** Update index.ts when removing components
3. **Don't remove "unused" deps that are used dynamically:** Check for `require()` and dynamic imports
4. **Don't consolidate different implementations:** Audit algorithm correctness before merging (e.g., CPF validators)
5. **Don't remove type exports:** They may be used in external packages

## Example Commit Messages

```
refactor(cleanup): Phase 1 - identify dead code (-0 lines, analysis only)
refactor(cleanup): Phase 2 - consolidate API routes (-X lines)
refactor(cleanup): Phase 3 - organize components, add barrel exports (-X lines)
refactor(cleanup): Phase 4 - remove unused deps, fix configs (-X lines)
```

## Beads Integration

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
