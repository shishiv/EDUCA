import { describe, expect, it } from 'vitest'
import { showDemoCredentialButton } from '@/lib/demo-sandbox/login-demo-credentials'

describe('demo login credentials', () => {
  it('shows the fill button only when the public sandbox flag is exactly true', () => {
    expect(showDemoCredentialButton(undefined)).toBe(false)
    expect(showDemoCredentialButton('')).toBe(false)
    expect(showDemoCredentialButton('false')).toBe(false)
    expect(showDemoCredentialButton('TRUE')).toBe(false)
    expect(showDemoCredentialButton('true')).toBe(true)
  })
})
