import { describe, expect, it } from 'vitest'
import { isInvalidRefreshTokenError, isSupabaseAuthCookieName } from '@/lib/auth-session-recovery'

describe('invalid Supabase session recovery', () => {
  it('recognizes missing and invalid refresh tokens', () => {
    expect(isInvalidRefreshTokenError({ code: 'refresh_token_not_found' })).toBe(true)
    expect(isInvalidRefreshTokenError(new Error('Invalid Refresh Token: Refresh Token Not Found'))).toBe(true)
    expect(isInvalidRefreshTokenError({ code: 'validation_failed', message: 'Refresh token is not valid' })).toBe(true)
    expect(isInvalidRefreshTokenError(new Error('network unavailable'))).toBe(false)
  })

  it('clears only Supabase auth cookies', () => {
    expect(isSupabaseAuthCookieName('sb-local-auth-token')).toBe(true)
    expect(isSupabaseAuthCookieName('sb-local-auth-token.0')).toBe(true)
    expect(isSupabaseAuthCookieName('session')).toBe(false)
    expect(isSupabaseAuthCookieName('developer-profile')).toBe(false)
  })
})
