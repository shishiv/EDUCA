---
name: supabase-typing
description: Use when changing Supabase queries, generated database types, or dynamic table access.
user-invocable: false
metadata:
  internal: true
---

# Supabase typing

`app/types/database.ts` is generated. Joined selects, including to-one relationships and aliases, are inferred natively by supabase-js. Keep query results typed without `as any` or `: any`.

For dynamic table access, follow the typed-union pattern in `app/lib/api/base.ts`; check payloads against `Inserts<...>` at the call site.
