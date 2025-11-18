# Change: Organize Codebase Foundation

## Why

Documentation sprawl (47 files) and scattered code organization make it difficult to onboard developers, find authoritative information, and maintain code quality standards needed for production deployment.

## What Changes

- **Documentation Consolidation**: Merge 47 docs into single `MASTER-DOCUMENTATION.md` with 8-chapter structure
- **Code Organization**: Group lib/ modules by domain, remove unused models/validators
- **Reference Updates**: Update CLAUDE.md and AGENTS.md to reference consolidated docs
- **OpenSpec Foundation**: Create specs for surface-chores (immediate) and deep-cleaning (future)

## Impact

**Affected specs:**
- surface-chores (new): Documentation consolidation + superficial code cleanup
- deep-cleaning (new): Console log replacement + TypeScript fixes + deep refactoring

**Affected code:**
- ~35 documentation files consolidated or archived
- ~10 unused code files removed (models, validators)
- lib/ directory restructured by domain
- CLAUDE.md and AGENTS.md references updated

**Time estimate:** 8-12 hours (surface chores only)

---

## Overview (Extended)

**Current State:**
- ✅ 90% production-ready (all 6 critical bugs fixed)
- ⚠️ 47 documentation files scattered across codebase
- ⚠️ 651 TypeScript errors (schema drift + Next.js 15 API changes)
- ⚠️ 646 console.* calls in 84 files (bypassing centralized logger)
- ⚠️ Duplicate API routes (`/sessions` vs `/sessoes-aula`)
- ⚠️ Legacy code and unused models still present

**Problem Statement:**
Documentation sprawl and code organization issues make it difficult to:
1. Onboard new developers or AI assistants
2. Find authoritative information (multiple conflicting sources)
3. Maintain code quality and compliance standards
4. Continue development without tripping over technical debt

## Goals

### Phase 1: Surface Chores (IMMEDIATE - This Change)
1. **Documentation Consolidation**: Merge 47 docs into single `MASTER-DOCUMENTATION.md` with navigable chapters
2. **File Cleanup**: Archive/delete obsolete documentation files
3. **Superficial Code Organization**: Remove obvious dead code, organize imports, clean up file structure
4. **OpenSpec Foundation**: Create specs for ongoing maintenance

### Phase 2: Deep Cleaning (FUTURE - Separate Change)
1. **Console Cleanup**: Replace 646 console.* calls with structured logger
2. **TypeScript Fixes**: Resolve 651 type errors (schema regeneration + API updates)
3. **API Route Consolidation**: Merge duplicate routes
4. **Dead Code Removal**: Remove unused models, validators, components
5. **Performance Optimization**: Bundle analysis and optimization

## Scope

### In Scope (Surface Chores)
- ✅ Consolidate all documentation into `MASTER-DOCUMENTATION.md`
- ✅ Archive session reports (claudedocs/) with SUPERSEDED markers
- ✅ Remove duplicate/obsolete README files
- ✅ Organize lib/ structure (group related modules)
- ✅ Clean up test documentation (consolidate 7 auth test docs)
- ✅ Update CLAUDE.md references to point to MASTER-DOCUMENTATION.md
- ✅ Create OpenSpec specs for surface-chores and deep-cleaning

### Out of Scope (Deep Cleaning - Future)
- ❌ TypeScript error fixes (651 errors)
- ❌ Console log replacement (646 instances)
- ❌ API route refactoring
- ❌ Database schema updates
- ❌ Performance optimization

## Success Criteria

1. **Documentation:**
   - Single source of truth: `MASTER-DOCUMENTATION.md` with table of contents
   - All 47 docs consolidated or archived
   - Clear navigation with chapter structure
   - CLAUDE.md references updated

2. **Code Organization:**
   - No duplicate README files in lib/ subdirectories
   - Obsolete files marked SUPERSEDED or deleted
   - Clear lib/ structure with grouped modules

3. **Developer Experience:**
   - New developers/AI can find information in <2 minutes
   - Single command to access all documentation
   - Clear distinction between active docs and archives

4. **OpenSpec Foundation:**
   - Specs created for surface-chores and deep-cleaning
   - Tasks defined for deep-cleaning phase
   - Clear maintenance workflow established

## Impact Analysis

### Benefits
- ✅ Faster onboarding (single source of truth)
- ✅ Reduced confusion (no conflicting documentation)
- ✅ Easier maintenance (clear structure)
- ✅ Foundation for future work (clean slate)
- ✅ Better AI assistant performance (clear context)

### Risks
- ⚠️ Information loss if consolidation misses important details
- ⚠️ Broken references to deleted files
- ⚠️ Time investment (8-12h estimated)

### Mitigation
- Archive files instead of deleting (can recover if needed)
- Search codebase for references before deletion
- Validate all internal links after consolidation

## Dependencies

### Upstream (Blockers)
- None (can start immediately)

### Downstream (Enabled by this change)
- ✅ Deep cleaning phase (console logs, TypeScript fixes)
- ✅ Enhanced "Abrir aula" workflow (clearer codebase)
- ✅ INEP integration (clearer architecture)
- ✅ Future AI-assisted development (better context)

## Related Changes

- **Future:** `deep-cleaning-codebase` - Console logs, TypeScript fixes, refactoring
- **Future:** `typescript-strict-compliance` - Fix 651 type errors
- **Future:** `api-route-consolidation` - Merge duplicate routes

## Implementation Notes

### Documentation Structure
```
MASTER-DOCUMENTATION.md
├── Chapter 1: Project Overview
│   ├── 1.1 README (project intro)
│   ├── 1.2 CLAUDE.md (AI assistant instructions)
│   ├── 1.3 AGENTS.md (agent instructions)
├── Chapter 2: Status & Progress
│   ├── 2.1 BUGS-ANALYSIS.md (current status)
│   ├── 2.2 CHANGELOG.md (version history)
│   ├── 2.3 NEXT-STEPS.md (roadmap)
├── Chapter 3: Architecture
│   ├── 3.1 Services Layer (lib/services/)
│   ├── 3.2 Validation System (lib/validation/)
│   ├── 3.3 Barrel Exports (code organization)
├── Chapter 4: Product & Business
│   ├── 4.1 Mission & Vision
│   ├── 4.2 Roadmap (product/)
│   ├── 4.3 Tech Stack
├── Chapter 5: Testing & QA
│   ├── 5.1 Test Strategy
│   ├── 5.2 Auth Testing (tests/e2e/auth/)
│   ├── 5.3 Chrome DevTools Validation
├── Chapter 6: Deployment & Operations
│   ├── 6.1 DEPLOYMENT.md
│   ├── 6.2 MIGRATION-GUIDE.md
├── Chapter 7: Code Guidelines
│   ├── 7.1 Chrome DevTools Workflow
│   ├── 7.2 Specialist Agent Prompts
├── Chapter 8: Archives
│   ├── 8.1 Session Reports (claudedocs/)
│   ├── 8.2 Manual Test Results
│   ├── 8.3 Historical Analysis
```

### Files to Archive (with SUPERSEDED marker)
- `claudedocs/*.md` (session reports - historical only)
- `lib/services/*.md` (consolidate into Chapter 3)
- `lib/validation/*.md` (consolidate into Chapter 3)
- `tests/e2e/auth/*.md` (consolidate into Chapter 5)
- `product/*.md` (consolidate into Chapter 4)

### Files to Delete
- Duplicate README.md in lib/ subdirectories
- Obsolete implementation summaries
- Temporary analysis documents

## Validation

### Pre-Deployment Checks
- [ ] MASTER-DOCUMENTATION.md has complete table of contents
- [ ] All original content preserved (nothing lost)
- [ ] CLAUDE.md references updated
- [ ] openspec validate passes
- [ ] No broken internal links

### Post-Deployment Validation
- [ ] Can navigate entire documentation from MASTER-DOCUMENTATION.md
- [ ] AI assistants can find information quickly
- [ ] No confusion about which doc is authoritative

## Rollback Plan

If consolidation causes issues:
1. Git revert to previous commit
2. All original files still in git history
3. Archived files can be restored from archive section
