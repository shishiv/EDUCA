# GATES — issue #19: Educacenso export contract

## Safety boundary

- [x] Worktree is `campaign/leaf-educacenso` and was fast-forwarded to
  `campaign/open-issues-e2e` before edits.
- [x] Scope is limited to an offline, pure, versioned module and its synthetic
  tests/documentation.
- [x] No route, UI, database migration, transmission, deploy, feature enablement,
  or real student/professional data is allowed.
- [x] Existing demo and Pilot Gate blocks remain unchanged; adding a library
  does not authorize either environment to call it.
- [x] Any implemented layout field, position, size, domain, or identifier rule
  must be traceable to a retrieved official INEP artifact.
- [x] No generated output may be described as compliant, accepted, or ready
  for municipal submission merely because it follows the frozen 2026 layout.

## Four passes

### Pass 1 — official contract and local gap map

- [x] Retrieve and preserve citations for the exact official INEP artifact(s).
- [x] Record artifact version, retrieval URL, checksum, scope, and unresolved
  gaps in `docs/plans/educacenso-export-contract.md`.
- [x] Compare official identifiers with the conflicting local 11/12-digit
  validators; do not reconcile them without primary-source evidence.

### Pass 2 — bounded implementation

- [x] Implement only fields and rules explicitly established by the selected
  official artifact, under `app/lib/educacenso/**`.
- [x] Keep the transformation deterministic, side-effect free, and versioned.
- [x] Reject missing/invalid/extra input deterministically; never silently
  coerce unknown regulatory values.

### Pass 3 — synthetic fixtures and adversarial review

- [x] Use obviously synthetic values only; no copied public or private person
  record.
- [x] Add a golden fixture plus positive and negative tests tied to the frozen
  contract.
- [x] Re-check that no API/UI/schema path, Pilot Gate exception, or demo
  capability was introduced.

### Pass 4 — repository verification and handoff

- [x] Run focused tests, typecheck, lint, build, `git diff --check`, and an
  explicit demo/Pilot Gate regression test.
- [x] Review the final diff for invented claims, identifiers, layouts, codes,
  PII, and accidental exposure.
- [x] Commit atomically and leave no staged files.
- [x] Document every unimplemented requirement as a blocked gate with a
  concrete handoff.

Validation completed with 8 focused Educacenso tests, 67 validator regressions,
12 demo/Pilot Gate regressions, 801 passing repository tests (20 skipped),
typecheck, lint with only the 558 pre-existing warnings, and a production build
using synthetic local Supabase placeholders. The official municipality
inspector confirmed the frozen hash, 5,571 unique codes, and both fixture rows;
its tamper control failed closed.

## Abandoned/blocked gates (until new official evidence or approval)

- Full 2026 import/export layout: the official artifacts are now frozen, but
  implementing their 494-field contract and conditional auxiliary-table rules
  remains a separate reviewed slice.
- Full municipality catalog in runtime: blocked until a real caller exists and
  redistribution/license plus update ownership are decided. This slice keeps
  only a two-code, source-row-verified test subset and a reproducible inspector.
- Regulatory validity or Educacenso acceptance: always requires external INEP
  validation; unit tests cannot establish it.
- Real-data mapping, persistence, route, UI, transmission, and operational
  enablement: blocked pending separate privacy, municipal, legal, governance,
  authorization, and Pilot Gate reviews.
