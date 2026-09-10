# C06 - governed management mutation boundary

- Decision date: 2026-09-08
- Scope: browser mutations for `escolas`, `turmas`, and `matriculas`
- Status: implementation and focused lint complete; the isolated raw-PostgreSQL chain remains the final database proof.

## Decision

Authenticated browser callers do not receive table `INSERT`, `UPDATE`, or
`DELETE` privileges on `escolas`, `turmas`, or `matriculas`. They must use the
following security-definer RPCs, which re-read relationships and role scope in
the transaction and write an append-only governed audit receipt:

- `create_governed_school`
- `update_governed_school`
- `assign_governed_school_director`
- `write_governed_turma`
- `create_governed_enrollment`
- `update_governed_enrollment`

RLS remains the read boundary. `service_role` and raw PostgreSQL fixtures are
not browser callers and remain able to build isolated synthetic fixtures.

The direct `escolas` DML revoke is material. The prior RLS policy allowed a
municipal admin or secretariat caller to write a school through PostgREST. That
bypassed `update_governed_school` and therefore left no governed receipt. The
canonical validator now proves that the authorized school update returns an
RPC receipt and that direct PostgREST update fails for admin, secretariat,
director, and teacher callers.

## Verified mutation inventory

The initial bounded `rg` census was followed by a per-chain scanner so a later
`.from(...)` call cannot be mistaken for a mutation of an earlier table:

```bash
python3 - <<'PY'
from pathlib import Path
import re

pattern = re.compile(
    r"\\.from\\(\\s*(['\\\"])(?:escolas|turmas|matriculas)\\1\\s*\\)"
    r"(?:(?!\\.from\\().){0,2000}?\\.(?:insert|update|upsert|delete)\\(",
    re.S,
)
for path in sorted(Path('app').rglob('*')):
    if path.suffix in {'.ts', '.tsx'} and pattern.search(path.read_text(errors='ignore')):
        print(path)
PY
```

The scanner returns these nine files. None is an operational browser write
path.

| File | Classification | Why the direct write remains |
| --- | --- | --- |
| `app/lib/seed-data.ts` | Dormant legacy development seed module; no import sites in `app/` | It is not an operational path. C06 revokes stop it from becoming a browser bypass; delete or replace it if development seeding is revived. |
| `app/scripts/seed-e2e.ts` | Local-only E2E seed | Requires an `sb_secret_` service key and rejects a non-loopback URL. |
| `app/scripts/seed-pilot-synthetic.ts` | Synthetic pilot seed | Uses the service client after the synthetic-pilot safety gate. |
| `app/scripts/seed-superadmin.ts` | Legacy service-role seed | It is outside the browser path. It must not be used for a municipal environment without a separate review of its credentials and seeded values. |
| `app/scripts/validate-pilot-canonical.ts` | Canonical browser-boundary validator | The remaining direct `escolas` update is intentional and must fail; the positive case uses `update_governed_school`. |
| `app/tests/e2e/diary/canonical-lesson.spec.ts` | Disposable diary fixture | Builds fixture rows using a local service-role client. |
| `app/tests/e2e/pilot/capacity-contract.spec.ts` | Disposable capacity fixture and cleanup | Fixture setup/cleanup use service role; concurrent actor attempts use `create_governed_enrollment` over PostgREST. |
| `app/tests/e2e/pilot/security-hardening.spec.ts` | Security fixture and recovery proof | Creates and removes synthetic rows with a local service-role client. |
| `app/tests/live/attendance-auth.live.test.ts` | Opt-in live authentication fixture | Runs only with `EDUCA_LIVE_SUPABASE=1` and uses the service-role admin client for setup and cleanup. |

A read-only census of `.from('escolas'|'turmas'|'matriculas')` returns 52 files.
Those reads remain governed by RLS and are outside C06's write-boundary scope.

## Database-contract alignment

`pilot_foundation.test.sql` no longer expects a director to insert a matrícula
directly. It proves the direct denial, then creates a valid enrollment through
`create_governed_enrollment`.

The capacity E2E retains its concurrent capacity assertion at the real
PostgREST boundary. Its two authenticated attempts now call
`create_governed_enrollment`; the existing atomic enrollment-capacity trigger
still governs the underlying insert. The RPC locks that turma `FOR UPDATE`
before it writes, matching the trigger's lock mode and avoiding a concurrent
`FOR SHARE` to `FOR UPDATE` lock-upgrade deadlock.

`governed_management_mutations.test.sql` stores the created class UUID in a
transaction-local setting before it switches to the other director. This lets
the cross-school authorization proof target a real hidden class without
relaxing RLS or depending on a forbidden read.

## Validation state and follow-up

Focused ESLint passed on the governed validator, capacity contract, and
NovaTurma component. The authoritative pending check is:

```bash
supabase/tests/database/run.sh
```

It must pass after the current migration and SQL-contract changes. The full
application typecheck depends on demo mocks supporting `rpc`; that test
transport update is tracked alongside the current C06 UI migration. No C12
operations-runner work is included in this decision.
