import type { SupabaseClient } from '@supabase/supabase-js'

export function isPasswordRecoveryCallback(url: URL): boolean {
  return url.pathname === '/reset-password/complete' && Boolean(url.searchParams.get('code'))
}

/** The SSR browser client owns PKCE exchange. Never exchange the same code again. */
export async function readPasswordRecoveryUser(auth: Pick<SupabaseClient['auth'], 'initialize' | 'getUser'>, hadCode: boolean): Promise<string | null> {
  const { error } = await auth.initialize()
  // auth-js 2.90.1 emits SIGNED_IN for automatic PKCE, not PASSWORD_RECOVERY.
  // A successful exchange removes code. Without a verifier initialize() can
  // succeed by loading an unrelated existing session while leaving code intact.
  const consumedCode = hadCode && !new URL(window.location.href).searchParams.has('code')
  window.history.replaceState(window.history.state, '', '/reset-password/complete')
  if (error || !consumedCode) return null
  const result = await auth.getUser()
  return result.error ? null : result.data.user?.id ?? null
}
