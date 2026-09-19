import { afterEach, describe, expect, it, vi } from 'vitest'
import { getDemoLoginCredentials } from '@/lib/demo-sandbox/login-demo-credentials'

afterEach(() => vi.unstubAllEnvs())

describe('demo login credentials', () => {
  it('provides the public sandbox persona only when the public flag is exactly true', () => {
    vi.stubEnv('NEXT_PUBLIC_DEMO_SANDBOX', undefined)
    vi.stubEnv('DEMO_SANDBOX', 'true')
    for (const flag of [undefined, '', 'false', 'TRUE']) {
      expect(getDemoLoginCredentials(flag)).toBeNull()
    }
    const credentials = getDemoLoginCredentials('true')
    expect(credentials?.email).toBe('demo@educa.app.br')
    expect(Boolean(credentials?.password)).toBe(true)
  })
})
