import { describe, expect, it } from 'vitest'
import {
  demoSandboxSimulatedSuccessResponse,
  getDemoSandboxBlockedReason,
  isDemoSandboxHardBlockedPath,
} from '@/lib/demo-sandbox/demo-sandbox'
import type { DemoActionOperation } from '@/lib/demo-sandbox/demo-audit'

const demoEnvironment = { NEXT_PUBLIC_DEMO_SANDBOX: 'true' }

const interceptedOperations: DemoActionOperation[] = [
  'demo.pilot.import',
  'demo.pilot.import_approval',
  'demo.pilot.import_rollback',
  'demo.auth.invitation',
  'demo.auth.first_access',
]

describe('demo simulated-success route contracts', () => {
  it.each(interceptedOperations)('marks %s as synthetic and effect-suppressed', async operation => {
    const response = demoSandboxSimulatedSuccessResponse(
      operation,
      undefined,
      { auditId: 'audit-1', correlationId: 'correlation-1' },
      demoEnvironment,
    )

    expect(response).not.toBeNull()
    const body = await response?.json()
    expect(body).toMatchObject({
      success: true,
      demo: {
        operation,
        outcome: 'simulated_success',
        effect_suppressed: true,
        synthetic_only: true,
        audit_id: 'audit-1',
      },
    })
  })

  it('keeps external effects hard-blocked while allowing route-specific simulated handlers', () => {
    expect(getDemoSandboxBlockedReason('/api/pilot/imports')).toBe('dataset_ingest')
    expect(isDemoSandboxHardBlockedPath('/api/pilot/imports', demoEnvironment)).toBe(false)
    expect(isDemoSandboxHardBlockedPath('/api/educacenso/export', demoEnvironment)).toBe(true)
  })
})
