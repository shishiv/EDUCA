# Plan 005: Add rate limiting to API routes — REJECTED

## Status

- **Status**: **REJECTED**
- **Priority**: —
- **Effort**: —
- **Risk**: —
- **Depends on**: —
- **Category**: security
- **Planned at**: commit `7e696f8`, 2026-07-11
- **Rejected at**: 2026-07-11 (deep audit)

## Why rejected

The original plan proposed an **in-memory** `Map` rate limiter inside Next.js route handlers on **Vercel serverless**.

That design is cosmético:

1. Each isolate/cold start gets its own `Map` — limits do not aggregate across instances.
2. Attack traffic spreads across isolates and never hits the per-process ceiling reliably.
3. Gives a false sense of protection in security review / compliance narratives.

## When to reopen

Only as a **new plan** that uses a shared store:

- Upstash Redis / `@upstash/ratelimit`, or
- Vercel Firewall / WAF rules, or
- Supabase / edge gateway limits

Do **not** re-implement Plan 005 as written.

## Replaced by

Nothing in this batch. Rate limiting is deferred until shared infra is chosen. Prefer fixing authz (plans 007–011) first — they reduce abuse surface more than a broken limiter.
