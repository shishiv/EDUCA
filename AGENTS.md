# EDUCA

<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know
This version has breaking changes - APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.
This block is written and re-added by `next dev` - verify at `node_modules/next/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.
<!-- END:nextjs-agent-rules -->

Read [`CONTEXT.md`](CONTEXT.md) before working. Run application commands from `app/`: `pnpm typecheck`, `pnpm lint`, `pnpm test`, and applicable build or pilot commands listed there.

Supabase typing: `app/types/database.ts` is generated; joined selects (to-one relationships, aliases) are inferred natively by supabase-js - do not add `as any` or `: any` to query results. For dynamic table access, follow the typed-union pattern in `app/lib/api/base.ts` (payloads checked against `Inserts<...>` at the call site).

## Maintaining this file

Keep this file thin. Put durable project context and authoritative commands in `CONTEXT.md`.
