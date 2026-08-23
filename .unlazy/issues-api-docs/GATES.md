# GATES — issue #20: API Reference Foundation

## Scope

Implement a reproducible API reference for the public surface of:
- `app/lib/api/**`
- `app/lib/services/**`
- `app/lib/utils.ts`

## Deliverables

1. TypeDoc configuration (`app/typedoc.json`)
2. `docs:api` script in `app/package.json`
3. TSDoc annotations on every exported symbol that forms the public contract
4. Generated reference output (`docs/api/`)
5. Verify: typecheck, lint, generation passes

## Constraints

- No runtime changes
- No route, UI, schema, README root, or deploy changes
- Correct the old `web/lib` path reference to `app/lib`
- Document auth/RLS, errors, and mode availability per contract
- Examples must compile (verified by typecheck)
- Own only `app/package.json` and `app/pnpm-lock.yaml` in this wave

## Pass 1: Foundation
- [ ] Add `typedoc` devDependency
- [ ] Create `app/typedoc.json` with entryPoints, tsconfig, out
- [ ] Add `docs:api` script
- [ ] Add `docs/api/` to `.gitignore`

## Pass 2: Public surface TSDoc
- [ ] Annotate `app/lib/api/base.ts` exports
- [ ] Annotate `app/lib/api/` domain services (public exports only)
- [ ] Annotate `app/lib/services/**` public exports
- [ ] Annotate `app/lib/utils.ts`
- [ ] Mark internal helpers with `@internal`

## Pass 3: Contracts and examples
- [ ] Document auth requirements per service
- [ ] Document RLS expectations
- [ ] Document error codes and types
- [ ] Document mode availability (pilot, demo, production)
- [ ] Add compilable `@example` blocks where useful

## Pass 4: Verification
- [ ] `pnpm docs:api` generates without error
- [ ] `pnpm typecheck` passes
- [ ] `pnpm lint` passes
- [ ] `pnpm test` passes (existing tests unbroken)
- [ ] Generated output is deterministic (re-run produces same structure)
- [ ] Commit atomically

## Acceptance

- Deterministic generation
- No runtime symbol left undocumented in the public surface
- Examples compile and don't suggest auth/RLS bypass
