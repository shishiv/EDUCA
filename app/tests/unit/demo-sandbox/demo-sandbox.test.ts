// @vitest-environment node
import { describe, expect, it } from 'vitest'
import {
  DEMO_SANDBOX_BLOCKED_API_PREFIXES,
  isDemoSandboxBlockedApiPath,
  isDemoSandboxEnabled,
} from '@/lib/demo-sandbox/demo-sandbox'

describe('demo sandbox guard', () => {
  it('so ativa com o flag explicito NEXT_PUBLIC_DEMO_SANDBOX=true (ou DEMO_SANDBOX)', () => {
    expect(isDemoSandboxEnabled({})).toBe(false)
    expect(isDemoSandboxEnabled({ NEXT_PUBLIC_DEMO_SANDBOX: 'false' })).toBe(false)
    expect(isDemoSandboxEnabled({ NEXT_PUBLIC_DEMO_SANDBOX: 'true' })).toBe(true)
    expect(isDemoSandboxEnabled({ DEMO_SANDBOX: 'true' })).toBe(true)
  })

  it('bloqueia exatamente os prefixos de gestao de dados do admin', () => {
    expect(DEMO_SANDBOX_BLOCKED_API_PREFIXES).toContain('/api/pilot/imports')
    expect(DEMO_SANDBOX_BLOCKED_API_PREFIXES).toContain('/api/pilot/invitations')
    expect(isDemoSandboxBlockedApiPath('/api/pilot/imports')).toBe(true)
    expect(isDemoSandboxBlockedApiPath('/api/pilot/imports/abc123/approval')).toBe(true)
    expect(isDemoSandboxBlockedApiPath('/api/pilot/invitations')).toBe(true)
    // fluxos centrais do demo permanecem liberados
    expect(isDemoSandboxBlockedApiPath('/api/frequencia/marcar')).toBe(false)
    expect(isDemoSandboxBlockedApiPath('/api/sessoes/aula/abrir')).toBe(false)
    expect(isDemoSandboxBlockedApiPath('/api/dashboard/alerts')).toBe(false)
    expect(isDemoSandboxBlockedApiPath('/api/pilot/metrics')).toBe(false)
  })
})
