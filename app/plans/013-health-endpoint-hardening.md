# Plan 013: Harden `/api/health` information exposure

> Drift check: `git diff --stat 7e696f8..HEAD -- app/api/health/route.ts`

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: security
- **Planned at**: commit `7e696f8`, 2026-07-11

## Why this matters

`GET /api/health` is unauthenticated and returns:

- overall status, per-check status, response times
- `metrics` / system metrics
- `environment` (`NODE_ENV`)
- `version`

Useful for uptime monitors, but also a free reconnaissance endpoint. HEAD is appropriately minimal.

## Current state

- `app/api/health/route.ts` — `GET` builds rich JSON; `HEAD` only checks DB ping
- No shared secret / admin gate

## Commands

| Purpose | Command | Expected |
|---------|---------|----------|
| Typecheck | `pnpm typecheck` | 0 |
| Manual | `curl -sI` / `curl -s` health | shape matches design |

## Scope

**In scope**: `app/api/health/route.ts` (+ optional env example comment in `.env.local.example`)

**Out of scope**: full metrics product; Grafana; auth for all APIs

## Steps

### Step 1: Split public vs detailed health

**Public (default GET, no auth):**

```json
{ "status": "healthy|degraded|unhealthy", "timestamp": "…" }
```

Optional: `responseTime` only.

**Detailed GET** when header or query present:

- `Authorization: Bearer <HEALTH_CHECK_TOKEN>` or  
- `?token=` compared to `process.env.HEALTH_CHECK_TOKEN`

Detailed may include checks[], metrics, version.

If `HEALTH_CHECK_TOKEN` unset in production, detailed stays disabled (public minimal only).

### Step 2: Keep HEAD lightweight

Unchanged: 200/503 only.

### Step 3: Avoid leaking internal errors

On failure, public body should not include raw DB error strings. Log server-side via `logger`.

### Step 4: Document

Add to `.env.local.example`:

```bash
# Optional: enables detailed GET /api/health
# HEALTH_CHECK_TOKEN=
```

Do not commit real tokens.

### Step 5: Verify

```bash
pnpm typecheck
```

Manual: unauthenticated GET is minimal; with token, detailed works.

## Done criteria

- [ ] Unauthenticated GET does not expose metrics/env/version (or only status)
- [ ] Detailed path gated by env token
- [ ] HEAD still works for monitors
- [ ] typecheck green
- [ ] README updated

## STOP conditions

- External monitor depends on current rich JSON — document migration for monitor config before merging

## Maintenance notes

- UptimeRobot should use HEAD or minimal GET
