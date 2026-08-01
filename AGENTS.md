# EDUCA

Read [`CONTEXT.md`](CONTEXT.md) before working. Run application commands from `app/`: `pnpm typecheck`, `pnpm lint`, `pnpm test`, and applicable build or pilot commands listed there.

Supabase typing: `app/types/database.ts` is generated; joined selects (to-one relationships, aliases) are inferred natively by supabase-js - do not add `as any` or `: any` to query results. For dynamic table access, follow the typed-union pattern in `app/lib/api/base.ts` (payloads checked against `Inserts<...>` at the call site).

## Maintaining this file

Keep this file thin. Put durable project context and authoritative commands in `CONTEXT.md`.
