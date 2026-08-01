/**
 * demo-sandbox.ts
 *
 * Runtime guard for the EDUCA public demo sandbox (issue #23).
 *
 * When NEXT_PUBLIC_DEMO_SANDBOX=true the instance is a shared public demo:
 *  - signup is disabled (Supabase project setting documented in DEMO.md; the
 *    app has no signup UI, and the canonical schema grants no INSERT on
 *    `users` to authenticated, so no visitor can create an app profile);
 *  - destructive product actions are blocked here (API prefix guard) AND at
 *    the database seam (canonical migration REVOKEs DELETE from
 *    authenticated), so the demo dataset can only be replaced by the weekly
 *    reset workflow.
 *
 * This is deliberately separate from the session-scoped "demo mode" used for
 * attendance demonstrations (contexts/demo-mode-context.tsx): that flag
 * elevates an admin temporarily, it never disables writes.
 */

import { NextResponse } from 'next/server'

/** Env flag that switches the instance into public demo sandbox mode. */
export const DEMO_SANDBOX_ENV_KEY = 'NEXT_PUBLIC_DEMO_SANDBOX'

export function isDemoSandboxEnabled(env: Record<string, string | undefined> = process.env): boolean {
  return env[DEMO_SANDBOX_ENV_KEY] === 'true' || env.DEMO_SANDBOX === 'true'
}

/**
 * Admin data-management APIs that mutate or ingest data. Blocked wholesale in
 * demo sandbox mode so visitors cannot corrupt the shared dataset (imports,
 * invitations, approvals). Core demo flows (attendance marking, opening and
 * closing class sessions) stay enabled - the weekly reset restores them.
 */
export const DEMO_SANDBOX_BLOCKED_API_PREFIXES = [
  '/api/pilot/imports',
  '/api/pilot/invitations',
] as const

export function isDemoSandboxBlockedApiPath(pathname: string): boolean {
  return DEMO_SANDBOX_BLOCKED_API_PREFIXES.some(prefix =>
    pathname === prefix || pathname.startsWith(`${prefix}/`)
  )
}

/**
 * Returns a 403 response when demo sandbox mode is active, null otherwise.
 * Route handlers call this at the top of mutating handlers (defense in depth
 * with the middleware, which cannot rely on route internals).
 */
export function demoSandboxGuardResponse(): NextResponse | null {
  if (!isDemoSandboxEnabled()) return null
  return NextResponse.json(
    {
      error: 'DEMO_SANDBOX_READ_ONLY',
      message: 'Operacao indisponivel no sandbox publico de demonstracao.',
    },
    { status: 403 }
  )
}
