// @vitest-environment node
import { Buffer } from 'node:buffer'
import { describe, expect, it } from 'vitest'
import { authenticatedUserId } from '@/tests/e2e/support/authenticated-user'

const userId = '10000000-0000-0000-0000-000000000001'

function encodedSession(): string {
  const session = JSON.stringify({ user: { id: userId } })
  return `base64-${Buffer.from(session).toString('base64url')}`
}

describe('E2E authenticated school selection', () => {
  it('derives the authenticated identity from the Supabase cookie', () => {
    expect(authenticatedUserId([
      { name: 'sb-local-auth-token', value: encodedSession() },
    ])).toBe(userId)
  })

  it('joins chunked auth cookies before deriving the identity', () => {
    const encoded = encodedSession()
    const splitAt = Math.floor(encoded.length / 2)
    expect(authenticatedUserId([
      { name: 'sb-local-auth-token.1', value: encoded.slice(splitAt) },
      { name: 'sb-local-auth-token.0', value: encoded.slice(0, splitAt) },
    ])).toBe(userId)
  })

  it('ignores absent and malformed auth cookies', () => {
    expect(authenticatedUserId([])).toBeNull()
    expect(authenticatedUserId([{ name: 'sb-local-auth-token', value: 'invalid' }])).toBeNull()
  })
})
