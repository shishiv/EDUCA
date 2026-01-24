# Phase 20: UI/UX Fixes - Context

**Gathered:** 2026-01-24
**Status:** Ready for planning

<domain>
## Phase Boundary

Fix two specific UI/UX issues: duplicate sonner toasts appearing simultaneously, and a dialog component with double close buttons. Both issues have been investigated and root causes identified.

</domain>

<decisions>
## Implementation Decisions

### UIX-01: Duplicate Toast Fix

**Root cause identified:**
Two separate `<Toaster>` components are rendering simultaneously:
1. `app/providers.tsx` line 35: `<Toaster position="top-right" richColors closeButton />` (imports directly from `sonner`)
2. `app/(dashboard)/layout.tsx` line 30: `<Toaster />` (imports from `@/components/ui/sonner`)

**Result:** Every toast appears twice — once in each position with different configs.

**Fix approach:**
- Remove one of the Toasters (keep the one in dashboard layout since it has the custom styling)
- Ensure consistent positioning across the app

### UIX-02: Double Close Button Fix

**Root cause identified:**
`components/ui/dialog.tsx` (lines 47-50) automatically renders a close button (X) inside `DialogContent`. However, `components/diary/ClassDiaryDetail.tsx` (lines 108-112) adds an explicit `<DialogClose>` with another X icon in the dialog header.

**Affected files:**
- `components/diary/ClassDiaryDetail.tsx` — manual close button in header (REMOVE THIS)

**Fix approach:**
- Remove the manual `<DialogClose>` from ClassDiaryDetail.tsx
- The built-in close button from DialogContent is sufficient

### Claude's Discretion
- Whether to add a code comment explaining that DialogContent includes a close button by default
- Testing approach to verify fixes

</decisions>

<specifics>
## Specific Ideas

- Both fixes are targeted removals — no new code needed
- Toast should use the styled version from `@/components/ui/sonner` with custom theming
- Keep position consistent (bottom-right as configured in the styled Toaster)

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 20-ui-ux-fixes*
*Context gathered: 2026-01-24*
