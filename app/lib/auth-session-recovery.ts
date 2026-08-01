/** Identifies Supabase errors that mean the browser's refresh token is no longer valid. */
export function isInvalidRefreshTokenError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const candidate = error as { code?: unknown; message?: unknown; name?: unknown }
  const code = typeof candidate.code === 'string' ? candidate.code.toLowerCase() : ''
  const message = typeof candidate.message === 'string' ? candidate.message.toLowerCase() : ''
  return code === 'refresh_token_not_found'
    || message.includes('invalid refresh token')
    || message.includes('refresh token not found')
    || message.includes('refresh token is not valid')
    || message.includes('refresh_token_not_found')
}

/** Matches only Supabase auth cookies, never unrelated browser or developer state. */
export function isSupabaseAuthCookieName(name: string): boolean {
  return name.startsWith('sb-') && name.includes('-auth-token')
}
