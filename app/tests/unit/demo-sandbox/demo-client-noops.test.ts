import { describe, expect, it } from 'vitest'
import {
  parseDemoActionAuditReceipt,
  recordDemoClientAction,
  type DemoAuditTransport,
  type DemoAuditTransportResponse,
} from '@/lib/demo-sandbox/demo-audit-client'
import type { DemoActionAuditInput } from '@/lib/demo-sandbox/demo-audit'

class RecordedDemoTransport implements DemoAuditTransport {
  readonly inputs: Array<{ operation: string; entityId?: string | null; schoolId?: string | null }> = []

  async post(input: Omit<DemoActionAuditInput, 'correlationId'>): Promise<DemoAuditTransportResponse> {
    this.inputs.push(input)
    return {
      ok: true,
      json: async () => ({
        success: true,
        demo: {
          operation: input.operation,
          outcome: 'simulated_success',
          effect_suppressed: true,
          synthetic_only: true,
          correlation_id: 'correlation-1',
          audit_id: 'audit-1',
        },
      }),
    }
  }
}

describe('demo client no-op receipts', () => {
  it('records the intended mutation while returning a truthful simulated receipt', async () => {
    const transport = new RecordedDemoTransport()

    await expect(recordDemoClientAction({
      operation: 'demo.config.update',
      entityId: 'config-1',
      schoolId: null,
    }, transport)).resolves.toEqual({
      auditId: 'audit-1',
      correlationId: 'correlation-1',
      operation: 'demo.config.update',
      outcome: 'simulated_success',
      effectSuppressed: true,
    })

    expect(transport.inputs).toEqual([{
      operation: 'demo.config.update',
      entityId: 'config-1',
      schoolId: null,
    }])
  })

  it('rejects malformed audit responses before callers can present success', () => {
    expect(() => parseDemoActionAuditReceipt(
      { ok: true, json: async () => ({}) },
      { demo: { operation: 'demo.feature_flag.toggle' } },
    )).toThrow('DEMO_ACTION_AUDIT_FAILED')
  })
})
