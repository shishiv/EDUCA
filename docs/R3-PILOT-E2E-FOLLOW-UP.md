# R3 follow-up: legacy pilot E2E runner

R1 intentionally does not repair `app/scripts/run-pilot-e2e.sh`.

Evidence from the current branch:

- `app/scripts/run-pilot-e2e.sh` reads the shared local Supabase status and does not create a disposable Supabase project.
- The runner exports numbered app URLs (`http://127.0.0.1:3000`) and invokes the default Playwright configuration.
- `app/playwright.config.ts` keeps `http://localhost:3000` as the web-server URL, so the legacy path does not satisfy the named-server contract.
- The default pilot run executes the entire `tests/e2e/pilot` contract set, not one bounded browser session.
- The current Playwright list receipt was `23 tests in 11 files`, including capacity, CSV import, invitations, descriptive reporting, and security-hardening contracts.
- Those contracts have different fixtures, roles, and cleanup expectations. Combining them remains a separate R3 scope.

R1 uses `app/scripts/run-pilot-canonical-e2e.sh`, an isolated Supabase project, the current pilot gate, a synthetic teacher identity, portless, and one canonical attendance spec. R3 should reconcile the legacy runner only after its broader contract set has an explicit isolation and cleanup design.
