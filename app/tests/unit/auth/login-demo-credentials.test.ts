import { describe, expect, it } from 'vitest'
import { showDemoCredentialButton } from '@/lib/demo-sandbox/login-demo-credentials'

describe('demo login credentials', () => {
  it('shows the fill button only when the public sandbox flag is truthy', () => {
    expect(showDemoCredentialButton(undefined)).toBe(false)
    expect(showDemoCredentialButton('')).toBe(false)
    expect(showDemoCredentialButton('true')).toBe(true)
  })
})
