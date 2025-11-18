# Tasks: Organize Codebase Foundation

**Change ID:** `organize-codebase-foundation`
**Estimated Time:** 8-12 hours
**Parallelization:** Tasks 1-3 can run in parallel

---

## Phase 1: Surface Chores (IMMEDIATE)

### Task 1: Documentation Inventory & Analysis (1h)
**Dependencies:** None
**Verification:** Complete inventory of all 47 docs with categorization

1.1. Create comprehensive inventory of all 47 .md files
1.2. Categorize by topic (Project, Testing, Product, Architecture, etc.)
1.3. Identify duplicates and conflicts
1.4. Map which content goes to which MASTER-DOCUMENTATION.md chapter
1.5. Identify files safe to delete vs archive vs consolidate

**Output:**
- `docs-inventory.json` (structured categorization)
- Consolidation map (source → destination chapter)

---

### Task 2: Create MASTER-DOCUMENTATION.md Structure (2h)
**Dependencies:** Task 1
**Verification:** Complete chapter structure with navigation

2.1. Create MASTER-DOCUMENTATION.md skeleton with 8 chapters
2.2. Add table of contents with anchor links
2.3. Add chapter summaries and navigation hints
2.4. Create archive section structure for historical docs
2.5. Validate markdown rendering and link structure

**Output:**
- `gestao_fronteira/MASTER-DOCUMENTATION.md` with complete structure

---

### Task 3: Consolidate Core Documentation (3h)
**Dependencies:** Task 2
**Verification:** All core docs merged, no content loss

**Chapter 1: Project Overview**
3.1. Merge README.md (16K) → 1.1 Project Introduction
3.2. Copy CLAUDE.md (660B) → 1.2 AI Assistant Instructions
3.3. Copy AGENTS.md (660B) → 1.3 Agent Instructions

**Chapter 2: Status & Progress**
3.4. Copy BUGS-ANALYSIS.md (18K) → 2.1 Bug Status
3.5. Copy CHANGELOG.md (9.1K) → 2.2 Version History
3.6. Copy NEXT-STEPS.md (9.4K) → 2.3 Roadmap & Next Steps

**Chapter 3: Architecture**
3.7. Consolidate lib/services/*.md (5 files, 52K) → 3.1 Services Layer
3.8. Consolidate lib/validation/*.md (4 files, 66K) → 3.2 Validation System
3.9. Merge BARREL_EXPORTS_*.md (2 files, 18K) → 3.3 Code Organization

**Chapter 4: Product & Business**
3.10. Merge product/mission*.md (2 files, 7.5K) → 4.1 Mission & Vision
3.11. Consolidate product/roadmap*.md (3 files, 39K) → 4.2 Product Roadmap
3.12. Copy product/tech-stack.md (7.1K) → 4.3 Technology Stack

**Output:**
- MASTER-DOCUMENTATION.md Chapters 1-4 complete (estimated 180K)

---

### Task 4: Consolidate Testing & Deployment Docs (2h)
**Dependencies:** Task 2
**Verification:** Testing and deployment sections complete

**Chapter 5: Testing & QA**
4.1. Consolidate tests/e2e/auth/*.md (7 files, 77K) → 5.1 Auth Testing
4.2. Copy CHROME-DEVTOOLS-VALIDATION-GUIDE.md (17K) → 5.2 UI/UX Validation
4.3. Merge __tests__/manual/*.md (2 files, 14K) → 5.3 Manual Test Results

**Chapter 6: Deployment & Operations**
4.4. Copy DEPLOYMENT.md (1.3K) → 6.1 Deployment Guide
4.5. Copy MIGRATION-GUIDE.md (11K) → 6.2 Migration Guide
4.6. Extract deployment sections from other docs

**Chapter 7: Code Guidelines**
4.7. Copy Chrome DevTools workflow → 7.1 UI/UX Testing
4.8. Copy SPECIALIST-AGENTS-PROMPTS.md (44K) → 7.2 AI Development Patterns

**Output:**
- MASTER-DOCUMENTATION.md Chapters 5-7 complete

---

### Task 5: Archive Historical Documentation (1h)
**Dependencies:** Tasks 3, 4
**Verification:** All session reports archived with SUPERSEDED markers

**Chapter 8: Archives**
5.1. Archive claudedocs/*.md (2 files, 27K) → 8.1 Session Reports
5.2. Archive VALIDATION_CENTRALIZATION_REPORT.md (13K) → 8.2 Historical Analysis
5.3. Archive SINGLE-SCHOOL-READINESS-ASSESSMENT.md (25K) → 8.3 Assessment Reports
5.4. Add "SUPERSEDED - See MASTER-DOCUMENTATION.md Chapter X" headers to archived files
5.5. Add archive index with dates and context

**Output:**
- MASTER-DOCUMENTATION.md Chapter 8 complete
- All archived files marked SUPERSEDED

---

### Task 6: Update References & Links (1h)
**Dependencies:** Tasks 3, 4, 5
**Verification:** No broken links, all references updated

6.1. Update CLAUDE.md to reference MASTER-DOCUMENTATION.md chapters
6.2. Update AGENTS.md to point to consolidated docs
6.3. Search codebase for markdown file references and update paths
6.4. Validate all internal links in MASTER-DOCUMENTATION.md
6.5. Update .github/ or docs/ references if present

**Validation Commands:**
```bash
# Find all references to old docs
rg -n "\.md" --type ts --type tsx gestao_fronteira/

# Validate markdown links
npx markdown-link-check gestao_fronteira/MASTER-DOCUMENTATION.md
```

**Output:**
- All references point to MASTER-DOCUMENTATION.md
- Zero broken internal links

---

### Task 7: Clean Up Obsolete Files (1h)
**Dependencies:** Task 6
**Verification:** Clean file structure, no duplicates

7.1. Delete duplicate README.md files in lib/ subdirectories:
   - `lib/hooks/README.md` (consolidated)
   - `lib/services/README.md` (consolidated)
   - `lib/validation/README.md` (consolidated)
   - `components/identity/README.md` (consolidated)

7.2. Delete temporary analysis files:
   - `BARREL_EXPORTS_IMPLEMENTATION.md`
   - `BARREL_EXPORTS_SUMMARY.md`
   - `VALIDATION_CENTRALIZATION_REPORT.md`

7.3. Move archived session reports:
   - `claudedocs/*.md` → `docs/archive/sessions/`

7.4. Clean up test documentation:
   - Consolidate `tests/e2e/auth/*.md` into single test guide

**Files to Keep:**
- MASTER-DOCUMENTATION.md (new single source of truth)
- CLAUDE.md (AI assistant entry point)
- AGENTS.md (agent instructions)
- BUGS-ANALYSIS.md (live status tracking)
- CHANGELOG.md (version history)
- README.md (quick start / GitHub front page)

**Output:**
- ~35 files deleted or archived
- Clear documentation structure

---

### Task 8: Superficial Code Organization (2h)
**Dependencies:** None (can run in parallel)
**Verification:** Cleaner lib/ structure, no obvious dead code

8.1. **Group lib/ modules by domain:**
   ```
   lib/
   ├── api/           # API client functions (existing)
   ├── auth/          # Authentication & authorization
   ├── validation/    # Brazilian data validation (existing)
   ├── services/      # Business logic services (existing)
   ├── hooks/         # React hooks (existing)
   ├── supabase/      # Database client (existing)
   ├── utils/         # Generic utilities
   └── models/        # TypeScript types & constants
   ```

8.2. **Remove obviously unused models:**
   - `lib/models/audit-checklist.ts` (not referenced)
   - `lib/models/mockup-inventory.ts` (not referenced)
   - `lib/models/mcp-configuration.ts` (not referenced)

8.3. **Consolidate duplicate validators:**
   - Delete `lib/validators/cpf.ts` (use `lib/validators/brazilian.ts`)
   - Delete `lib/validators/phone.ts` (use `lib/validators/brazilian.ts`)

8.4. **Organize component READMEs:**
   - Keep only top-level README if needed
   - Document component usage in code comments instead

**Validation:**
```bash
# Check for unused files
npx depcheck gestao_fronteira/

# Find unreferenced files
rg -l "audit-checklist|mockup-inventory|mcp-configuration" gestao_fronteira/
```

**Output:**
- Cleaner lib/ structure
- ~10 unused files removed
- No duplicate validators

---

### Task 9: Validation & Testing (30min)
**Dependencies:** All previous tasks
**Verification:** All checks pass

9.1. Run OpenSpec validation:
   ```bash
   openspec validate organize-codebase-foundation --strict
   ```

9.2. Validate MASTER-DOCUMENTATION.md:
   - All chapters have content
   - Table of contents is accurate
   - No broken internal links
   - Archive index is complete

9.3. Check for broken references:
   ```bash
   # Search for references to deleted files
   rg -n "lib/services/README|lib/validation/README" gestao_fronteira/
   ```

9.4. Verify file structure:
   ```bash
   # Count remaining .md files (should be ~10-12)
   find gestao_fronteira -name "*.md" ! -path "*/node_modules/*" | wc -l
   ```

**Pass Criteria:**
- [ ] OpenSpec validation passes
- [ ] MASTER-DOCUMENTATION.md renders correctly
- [ ] No broken references in codebase
- [ ] ~35 fewer .md files
- [ ] All content preserved (nothing lost)

**Output:**
- Validation report
- Updated CHANGELOG.md entry

---

## Phase 2: Deep Cleaning (FUTURE - Separate Change)

### Task 10: Replace Console Logs with Logger (8h)
**Dependencies:** Surface chores complete
**Verification:** Zero console.* calls, all using structured logger

10.1. Create automated script to replace console.* patterns
10.2. Review 646 instances across 84 files
10.3. Add proper feature context to each logger call
10.4. Test logging output in development
10.5. Verify no console.* remains

**Estimated:** 8 hours (646 instances / ~80 per hour)

---

### Task 11: Fix TypeScript Errors (12h)
**Dependencies:** Surface chores complete
**Verification:** Zero TypeScript errors, strict mode passes

11.1. Regenerate Supabase types from schema
11.2. Fix Next.js 15 API changes (cookies async)
11.3. Fix null safety issues (proper guards)
11.4. Fix schema drift errors
11.5. Validate with `pnpm typecheck`

**Estimated:** 12 hours (651 errors / ~50 per hour)

---

### Task 12: Consolidate API Routes (4h)
**Dependencies:** TypeScript fixes complete
**Verification:** No duplicate routes, clear naming

12.1. Merge `/api/sessions` and `/api/sessoes-aula`
12.2. Standardize Portuguese vs English naming
12.3. Update all route references
12.4. Add deprecation warnings to old routes
12.5. Test all API endpoints

**Estimated:** 4 hours

---

### Task 13: Dead Code Removal (6h)
**Dependencies:** API consolidation complete
**Verification:** No unused imports, components, or functions

13.1. Run depcheck to find unused dependencies
13.2. Remove unused components
13.3. Remove unused utility functions
13.4. Clean up unused types
13.5. Verify app still works

**Estimated:** 6 hours

---

## Summary

**Phase 1 (IMMEDIATE):** 8-12 hours
- Tasks 1-9: Documentation consolidation + superficial code cleanup

**Phase 2 (FUTURE):** 30 hours
- Tasks 10-13: Deep cleaning (console logs, TypeScript, refactoring)

**Total Estimated Time:** 38-42 hours across both phases
