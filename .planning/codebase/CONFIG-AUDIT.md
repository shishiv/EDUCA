# Configuration Audit Report

**Audit Date:** 2026-01-24
**Scope:** Phase 15.2 - Project Configuration Audit
**Focus:** ESLint, dependencies, TypeScript, Next.js configuration

## Summary

This document captures the configuration modernization performed in Phase 15.2, including what was changed, what was deferred, and recommendations for future maintenance.

## Changes Made

### Plan 15.2-01: ESLint Configuration

**Problem:** ESLint was completely broken with "Converting circular structure to JSON" error.

**Root Cause:** Using `FlatCompat` from `@eslint/eslintrc` to wrap legacy `eslint-config-next` caused circular references.

**Solution:**

| Before | After |
|--------|-------|
| `FlatCompat` wrapper | Direct `eslint-config-next` import |
| Broken (0 files linted) | Working (715 issues found) |
| Complex adapter code | Native flat config array |

**Files Modified:**
- `gestao_fronteira/eslint.config.mjs` - Rewrote to use native flat config
- `gestao_fronteira/package.json` - Added `typescript-eslint` dependency

**Commit:** `cc71f80`

---

### Plan 15.2-02: Dependency Cleanup

**Problem:** Unused dependencies and incorrect categorization.

**Changes:**

| Category | Count | Details |
|----------|-------|---------|
| Unused runtime deps removed | 10 | Radix components, recharts, zustand, etc. |
| Build-time deps moved to devDeps | 6 | @types/*, autoprefixer, postcss, typescript |
| Unnecessary deps removed | 1 | @eslint/eslintrc (no longer needed) |

**Removed Dependencies:**
- `@radix-ui/react-collapsible` - No Collapsible component used
- `@radix-ui/react-radio-group` - RadioGroup from dropdown-menu used instead
- `@radix-ui/react-slider` - No Slider component used
- `@radix-ui/react-toggle` - No Toggle import found
- `@radix-ui/react-toggle-group` - No ToggleGroup component used
- `input-otp` - No InputOTP component used
- `vaul` - No Drawer from vaul used
- `recharts` - BarChart3 is from lucide-react
- `zustand` - No zustand store pattern used
- `react-resizable-panels` - No ResizablePanel component used

**Moved to devDependencies:**
- `@types/node`
- `@types/react`
- `@types/react-dom`
- `autoprefixer`
- `postcss`
- `typescript`

**Commits:** `72c520b`, `a7e000f`

---

### Plan 15.2-03: TypeScript & Next.js Configuration

**Problem:** Outdated settings (es5 target from 2015).

**Changes:**

| File | Setting | Before | After |
|------|---------|--------|-------|
| tsconfig.json | target | "es5" | "es2023" |
| next.config.js | comments | "Next.js 15" | "Next.js 16+" |
| next.config.js | optimizePackageImports | included 'recharts' | removed (dep deleted) |

**Why es2023:**
- ES5 is 10+ years outdated (from 2015)
- All modern browsers support ES2023
- Smaller output, better performance
- Node.js 20+ (LTS) fully supports ES2023

**Commits:** `c93e581`, `b7727af`

---

## Deferred Work (Wave 3)

These items were identified in research but deferred due to scope and risk:

### 1. Tailwind CSS v4 Migration

| Aspect | Details |
|--------|---------|
| Current | Tailwind CSS 3.3.3 |
| Latest | Tailwind CSS 4.x |
| Breaking Changes | YES - CSS-first config, tailwind.config.js replaced |
| Migration Effort | HIGH - Requires `npx @tailwindcss/upgrade` codemod |
| Recommendation | Separate phase, test thoroughly |

### 2. Zod v4 Migration

| Aspect | Details |
|--------|---------|
| Current | Zod 3.25.76 |
| Latest | Zod 4.x |
| Breaking Changes | YES - Error API changes |
| Migration Effort | MEDIUM - Use `zod-v3-to-v4` codemod |
| Recommendation | Separate phase after Tailwind |

### 3. Zustand v5 Migration

| Aspect | Details |
|--------|---------|
| Current | N/A (removed in 15.2-02) |
| Latest | Zustand 5.x |
| Breaking Changes | YES - API changes |
| Migration Effort | N/A |
| Recommendation | Not needed (dependency removed) |

---

## Remaining Outdated Dependencies

Run `pnpm outdated` for current status. As of audit date:

| Package | Type | Risk | Notes |
|---------|------|------|-------|
| tailwindcss | Major (3->4) | HIGH | CSS-first migration |
| zod | Major (3->4) | MEDIUM | Error API changes |
| jspdf | Major (3->4) | MEDIUM | Check usage first |
| react-resizable-panels | Major (3->4) | LOW | Already removed |
| tailwind-merge | Major (2->3) | MEDIUM | Depends on Tailwind 4 |
| lucide-react | Minor | LOW | Safe to update |
| @supabase/ssr | Minor | LOW | Safe to update |
| vercel | Major (48->50) | LOW | CLI tool only |

---

## Known Issues

### Pre-existing Build Failure

**Issue:** `pnpm build` and `pnpm typecheck` fail with database type errors.

**Error:**
```
Argument of type '"relatorios_descritivos"' is not assignable to parameter of type '"alunos" | ...
```

**Root Cause:** Database schema has tables that aren't in `types/database.ts`.

**Missing Tables:**
- `relatorios_descritivos`
- `calendario_escolar`
- Others added via migrations but not type-regenerated

**Fix Required:**
```bash
cd gestao_fronteira
npx supabase gen types typescript --local > types/database.ts
```

**Note:** This is a pre-existing issue documented in STATE.md. Not caused by Phase 15.2 changes.

---

## Maintenance Commands

### Check for Updates
```bash
cd gestao_fronteira
pnpm outdated
```

### Check Unused Dependencies
```bash
cd gestao_fronteira
npx knip --dependencies
```

### Safe Updates (Minor/Patch)
```bash
cd gestao_fronteira
pnpm update --recursive
```

### Interactive Update (Major Versions)
```bash
cd gestao_fronteira
pnpm update --interactive --latest
```

### Regenerate Database Types
```bash
cd gestao_fronteira
npx supabase gen types typescript --local > types/database.ts
```

---

## ESLint Status Post-Migration

After fixing ESLint, the linter now reports real code issues:

| Category | Count |
|----------|-------|
| Errors | 236 |
| Warnings | 479 |
| **Total** | **715** |

**Most Common Issues:**
- `@typescript-eslint/no-explicit-any` (warnings)
- `@typescript-eslint/no-unused-vars` (errors)
- `react-hooks/exhaustive-deps` (warnings)

**Recommendation:** Address in future cleanup phase with `pnpm lint:fix`.

---

## Configuration Files Reference

| File | Purpose | Status |
|------|---------|--------|
| `eslint.config.mjs` | ESLint flat config | MODERNIZED |
| `tsconfig.json` | TypeScript compiler options | MODERNIZED |
| `next.config.js` | Next.js settings | UPDATED |
| `package.json` | Dependencies | CLEANED |
| `tailwind.config.ts` | Tailwind CSS | UNCHANGED (v3) |
| `vitest.config.ts` | Unit testing | UNCHANGED |
| `playwright.config.ts` | E2E testing | UNCHANGED |

---

## Audit Methodology

1. **Research Phase:** Analyzed configuration with `pnpm lint`, `pnpm outdated`, `npx knip`
2. **Wave 1:** Fixed critical ESLint breakage
3. **Wave 2:** Removed unused deps, modernized TypeScript target
4. **Documentation:** This audit report

**Tools Used:**
- `knip` - Dead dependency detection
- `pnpm outdated` - Version analysis
- `eslint --debug` - Configuration debugging

---

*Last updated: 2026-01-24*
*Phase: 15.2-audit-project-configuration*
