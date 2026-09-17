import { describe, expect, it } from 'vitest'
import { AuthApiError, type SupabaseClient, type User } from '@supabase/supabase-js'
import { isPasswordRecoveryCallback, readPasswordRecoveryUser } from '@/lib/password-recovery'
import { recoveryPasswordError } from '@/lib/validation/new-password'

const user: User = { id: 'synthetic-user', aud: 'authenticated', app_metadata: {}, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' }

describe('password recovery validation', () => {
  it.each(['', 'short', 'alllowercase12!', 'ALLUPPERCASE12!', 'NoNumberHere!', 'NoSymbolHere12', `Aa1!${'x'.repeat(125)}`])('rejects an invalid new password', password => {
    expect(recoveryPasswordError(password, password)).toBe('passwordInvalid')
  })

  it('requires confirmation without trimming the password', () => {
    expect(recoveryPasswordError('New-Password-12!', 'New-Password-12! ')).toBe('passwordMismatch')
    expect(recoveryPasswordError('New-Password-12!', 'New-Password-12!')).toBe(null)
    expect(recoveryPasswordError(' New-Password-12! ', ' New-Password-12! ')).toBe(null)
  })

  it('requires callback intent on the exact completion route', () => {
    expect(isPasswordRecoveryCallback(new URL('http://localhost/reset-password/complete?code=synthetic'))).toBe(true)
    for (const route of ['/login?code=synthetic', '/reset-password/complete', '/reset-password/complete?code=', '/reset-password/complete#access_token=synthetic']) {
      expect(isPasswordRecoveryCallback(new URL(route, 'http://localhost'))).toBe(false)
    }
  })
})

describe('recovery initialization decisions', () => {
  // These fixtures prove the application decision, not the SDK exchange.
  // The local AXI browser rehearsal exercises the installed SDK and Auth server.
  function authResult(consume: boolean, rejected = false): Pick<SupabaseClient['auth'], 'initialize' | 'getUser'> {
    return {
      async initialize() {
        if (consume) window.history.replaceState(null, '', '/reset-password/complete')
        return { error: rejected ? new AuthApiError('synthetic expired code', 400, 'flow_state_expired') : null }
      },
      async getUser() { return { data: { user }, error: null } },
    }
  }

  it('rejects an existing session when no verifier consumed the callback code', async () => {
    window.history.replaceState(null, '', '/reset-password/complete?code=synthetic')
    expect(await readPasswordRecoveryUser(authResult(false), true)).toBe(null)
    expect(window.location.search).toBe('')
    window.history.replaceState(null, '', '/reset-password/complete?code=synthetic')
    expect(await readPasswordRecoveryUser(authResult(true), true)).toBe('synthetic-user')
  })

  it('does not infer recovery from a session or from a failed initialization', async () => {
    expect(await readPasswordRecoveryUser(authResult(true), false)).toBe(null)
    expect(await readPasswordRecoveryUser(authResult(true, true), true)).toBe(null)
    expect(await readPasswordRecoveryUser(authResult(true), true)).toBe('synthetic-user')
  })
})
