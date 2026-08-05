// @vitest-environment node
import { describe, expect, it } from 'vitest'
import {
  DEMO_SANDBOX_BLOCKED_API_PREFIXES,
  DEMO_SANDBOX_BLOCKED_EFFECTS,
  DEMO_SANDBOX_CAPABILITIES,
  DEMO_SANDBOX_SIMULATED_API_PREFIXES,
  demoSandboxGuardResponse,
  demoSandboxSimulatedSuccessResponse,
  getDemoSandboxBlockedReason,
  isDemoSandboxBlockedApiPath,
  isDemoSandboxCapabilityAllowed,
  isDemoSandboxEnabled,
  isDemoSandboxPilotPathAllowed,
  isDemoSandboxSimulatedApiPath,
  isDemoSandboxHardBlockedPath,
  resolveDemoSandboxCapability,
} from '@/lib/demo-sandbox/demo-sandbox'

describe('demo sandbox guard', () => {
  it('so ativa com o flag explicito NEXT_PUBLIC_DEMO_SANDBOX=true (ou DEMO_SANDBOX)', () => {
    expect(isDemoSandboxEnabled({})).toBe(false)
    expect(isDemoSandboxEnabled({ NEXT_PUBLIC_DEMO_SANDBOX: 'false' })).toBe(false)
    expect(isDemoSandboxEnabled({ NEXT_PUBLIC_DEMO_SANDBOX: 'true' })).toBe(true)
    expect(isDemoSandboxEnabled({ DEMO_SANDBOX: 'true' })).toBe(true)
  })

  it('bloqueia exatamente os prefixos de gestao de dados e efeitos externos', () => {
    expect(DEMO_SANDBOX_BLOCKED_API_PREFIXES).toContain('/api/pilot/imports')
    expect(DEMO_SANDBOX_BLOCKED_API_PREFIXES).toContain('/api/pilot/invitations')
    expect(DEMO_SANDBOX_BLOCKED_API_PREFIXES).toContain('/api/educacenso')
    expect(DEMO_SANDBOX_BLOCKED_API_PREFIXES).toContain('/api/whatsapp/webhook')
    expect(DEMO_SANDBOX_BLOCKED_EFFECTS).toContain('real_whatsapp_delivery')
    expect(DEMO_SANDBOX_BLOCKED_EFFECTS).toContain('real_pii_export')
    expect(isDemoSandboxBlockedApiPath('/api/pilot/imports')).toBe(true)
    expect(isDemoSandboxBlockedApiPath('/api/pilot/imports/abc123/approval')).toBe(true)
    expect(isDemoSandboxBlockedApiPath('/api/pilot/invitations')).toBe(true)
    expect(isDemoSandboxBlockedApiPath('/api/educacenso/export')).toBe(true)
    expect(isDemoSandboxBlockedApiPath('/api/reports/educacenso')).toBe(true)
    expect(isDemoSandboxBlockedApiPath('/api/export/pii')).toBe(true)
    expect(isDemoSandboxBlockedApiPath('/api/whatsapp/webhook')).toBe(true)
    // fluxos centrais do demo permanecem liberados
    expect(isDemoSandboxBlockedApiPath('/api/frequencia/marcar')).toBe(false)
    expect(isDemoSandboxBlockedApiPath('/api/sessoes/aula/abrir')).toBe(false)
    expect(isDemoSandboxBlockedApiPath('/api/dashboard/alerts')).toBe(false)
    expect(isDemoSandboxBlockedApiPath('/api/pilot/metrics')).toBe(false)
  })

  it('libera cada capacidade nomeada somente no flag demo', () => {
    const demoEnv = { NEXT_PUBLIC_DEMO_SANDBOX: 'true' }
    for (const capability of DEMO_SANDBOX_CAPABILITIES) {
      const samplePath = capability.routePrefixes[0] ?? capability.apiPrefixes[0]
      if (!samplePath) continue
      expect(resolveDemoSandboxCapability(samplePath)).toBe(capability.id)
      expect(isDemoSandboxCapabilityAllowed(samplePath, demoEnv)).toBe(true)
    }

    expect(isDemoSandboxCapabilityAllowed('/dashboard/notas', {})).toBe(false)
    expect(isDemoSandboxPilotPathAllowed('/dashboard/notas', demoEnv)).toBe(true)
    expect(isDemoSandboxPilotPathAllowed('/dashboard/notas', {})).toBe(false)
  })

  it('lets authenticated route handlers own the simulated API response', () => {
    const demoEnv = { NEXT_PUBLIC_DEMO_SANDBOX: 'true' }
    expect(DEMO_SANDBOX_SIMULATED_API_PREFIXES).toContain('/api/pilot/imports')
    expect(isDemoSandboxSimulatedApiPath('/api/pilot/imports/abc123')).toBe(true)
    expect(isDemoSandboxSimulatedApiPath('/api/educacenso/export')).toBe(false)
    expect(isDemoSandboxHardBlockedPath('/api/educacenso/export', demoEnv)).toBe(true)
    expect(isDemoSandboxHardBlockedPath('/api/whatsapp/webhook', demoEnv)).toBe(true)
    expect(isDemoSandboxHardBlockedPath('/api/pilot/imports', demoEnv)).toBe(false)
    expect(isDemoSandboxHardBlockedPath('/dashboard/educacenso', demoEnv)).toBe(false)

    const response = demoSandboxSimulatedSuccessResponse(
      'demo.config.update',
      { config: { id: 'config-1', valor: 'demo' } },
      { auditId: 'audit-1', correlationId: 'correlation-1' },
      demoEnv,
    )

    expect(response?.status).toBe(200)
    expect(response?.headers.get('x-educa-demo-outcome')).toBe('simulated_success')
    return response?.json().then(body => {
      expect(body).toMatchObject({
        success: true,
        config: { id: 'config-1', valor: 'demo' },
        demo: {
          operation: 'demo.config.update',
          outcome: 'simulated_success',
          effect_suppressed: true,
          synthetic_only: true,
          audit_id: 'audit-1',
          correlation_id: 'correlation-1',
        },
      })
    })
  })

  it('does not build a simulated success response outside the demo', () => {
    expect(demoSandboxSimulatedSuccessResponse('demo.config.update', {}, {}, {})).toBeNull()
  })

  it('mantem bloqueados Educacenso, webhook e rotas nao inventariadas', async () => {
    const demoEnv = { NEXT_PUBLIC_DEMO_SANDBOX: 'true' }
    expect(getDemoSandboxBlockedReason('/api/educacenso/export')).toBe('external_effect')
    expect(getDemoSandboxBlockedReason('/dashboard/relatorios/educacenso')).toBe('external_effect')
    expect(getDemoSandboxBlockedReason('/api/pilot/imports')).toBe('dataset_ingest')
    expect(getDemoSandboxBlockedReason('/api/pilot/invitations')).toBe('auth_mutation')
    expect(resolveDemoSandboxCapability('/api/educacenso/export')).toBeNull()
    expect(resolveDemoSandboxCapability('/api/reports/educacenso')).toBeNull()
    expect(resolveDemoSandboxCapability('/api/unknown-future-effect')).toBeNull()
    expect(isDemoSandboxCapabilityAllowed('/api/educacenso/export', demoEnv)).toBe(false)

    const externalResponse = demoSandboxGuardResponse('external_effect', demoEnv)
    expect(externalResponse?.status).toBe(403)
    await expect(externalResponse?.json()).resolves.toMatchObject({ error: 'DEMO_EXTERNAL_EFFECT_BLOCKED' })
  })
})
