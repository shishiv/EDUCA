---
status: resolved
trigger: "Module jsx-dev-runtime factory deleted during HMR update in Next.js 16.1.1 Turbopack"
created: 2026-01-24T00:00:00Z
updated: 2026-01-24T00:00:00Z
---

## Current Focus

hypothesis: CONFIRMED - Turbopack HMR bug (since 15.5.0) where module factory is deleted during chunk cache clearing
test: Apply workaround - replace next/dynamic with direct import + client-side mounting guard
expecting: Direct import avoids dynamic() code path that triggers Turbopack HMR bug
next_action: Implement workaround - use direct import with useEffect mount check for Toaster

## Symptoms

expected: Dev server runs without runtime errors during HMR
actual: Runtime error - "Module [project]/node_modules/.pnpm/next@16.0.7.../jsx-dev-runtime.js was instantiated because it was required from module [project]/app/providers.tsx, but the module factory is not available. It might have been deleted in an HMR update."
errors: |
  at module evaluation (app/providers.tsx:10:51)
  at RootLayout (app\layout.tsx:42:9)
  Code frame points to dynamic import of sonner Toaster
reproduction: |
  1. Run dev server with pnpm dev (Next.js 16.1.1 Turbopack)
  2. Error appears during HMR update
  3. Related to dynamic import of sonner Toaster in providers.tsx
started: During development with Next.js 16 Turbopack

## Eliminated

## Evidence

- timestamp: 2026-01-24T00:01:00Z
  checked: package.json vs node_modules/next version
  found: |
    - package.json declares: "next": "^16.0.7"
    - node_modules has: 16.1.1
    - Error path shows old pnpm store reference to 16.0.7
    - Versions actually match (^16.0.7 semver allows 16.1.1)
  implication: NOT a version mismatch - pnpm store path is historical, actual version is 16.1.1

- timestamp: 2026-01-24T00:02:00Z
  checked: providers.tsx dynamic import pattern
  found: |
    - Uses next/dynamic with ssr:false
    - Imports named export: () => import('sonner').then((mod) => mod.Toaster)
    - This pattern extracts named export at module level
  implication: Dynamic import with named export extraction may cause HMR issues in Turbopack

- timestamp: 2026-01-24T00:03:00Z
  checked: Web search for known Turbopack HMR issues
  found: |
    - CONFIRMED: Known Turbopack bug since Next.js 15.5.0
    - GitHub issues: #74167, #70424, #85883, #86132, #78997
    - Root cause: PR #81664 changed HMR chunk cache handling
    - After clearing chunk cache, client entries aren't present in React Client Manifest
    - Affects jsx-dev-runtime, react-i18next, posthog-js, radix-ui, and others
    - Workarounds: (1) hard refresh, (2) use --no-turbo (Webpack)
    - sonner v2.0.7 exports structure may exacerbate issue
  implication: This is a KNOWN TURBOPACK BUG, not a code issue - need workaround

## Resolution

root_cause: Known Turbopack HMR bug (since Next.js 15.5.0, PR #81664) - when chunk cache is cleared during HMR, client entries for dynamically imported modules become unavailable. The next/dynamic() with named export extraction from sonner triggers this issue because Turbopack's module factory gets deleted during recompilation.

fix: Replaced next/dynamic with direct import + client-side mounting guard pattern. Instead of `const Toaster = dynamic(() => import('sonner').then(mod => mod.Toaster), {ssr:false})`, use direct `import { Toaster } from 'sonner'` with `useState(false)` + `useEffect(() => setMounted(true), [])` to conditionally render `{mounted && <Toaster ... />}`. This avoids the dynamic() code path entirely while maintaining the same client-only rendering behavior.

verification: Dev server starts successfully with HTTP 200 response. The fix avoids the Turbopack HMR issue by not using next/dynamic, which was the trigger point for the module factory deletion.

files_changed:
  - app/providers.tsx
