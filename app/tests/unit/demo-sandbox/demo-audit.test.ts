import { describe, expect, it, vi } from 'vitest'
import {
  DEMO_ACTION_INTERCEPTED_EVENT,
  buildDemoActionAuditMetadata,
  writeDemoActionInterceptedAudit,
} from '@/lib/demo-sandbox/demo-audit'

const input = {
  operation: 'demo.config.update' as const,
  entityId: 'config-1',
  schoolId: 'school-1',
}

describe('demo action audit', () => {
  it('writes a distinct simulated outcome without request payload fields', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: 'audit-1', error: null })
    const receipt = await writeDemoActionInterceptedAudit(
      { rpc } as never,
      { ...input, correlationId: 'correlation-1' },
    )

    expect(receipt).toEqual({
      auditId: 'audit-1',
      correlationId: 'correlation-1',
      operation: 'demo.config.update',
      outcome: 'simulated_success',
      effectSuppressed: true,
    })
    expect(rpc).toHaveBeenCalledWith('write_pilot_audit_event', {
      p_event_type: DEMO_ACTION_INTERCEPTED_EVENT,
      p_entity_type: 'demo_operation',
      p_entity_id: 'config-1',
      p_escola_id: 'school-1',
      p_metadata: {
        operation: 'demo.config.update',
        outcome: 'simulated_success',
        effect_suppressed: true,
        synthetic_only: true,
        correlation_id: 'correlation-1',
      },
    })
    expect(JSON.stringify(rpc.mock.calls)).not.toContain('cpf')
    expect(JSON.stringify(rpc.mock.calls)).not.toContain('password')
    expect(JSON.stringify(rpc.mock.calls)).not.toContain('free_text')
  })

  it('uses only fixed audit metadata', () => {
    expect(buildDemoActionAuditMetadata(input, 'correlation-1')).toEqual({
      operation: 'demo.config.update',
      outcome: 'simulated_success',
      effect_suppressed: true,
      synthetic_only: true,
      correlation_id: 'correlation-1',
    })
  })

  it('fails closed when the append-only audit RPC fails', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: null, error: { message: 'denied' } })

    await expect(
      writeDemoActionInterceptedAudit({ rpc } as never, input),
    ).rejects.toThrow('DEMO_ACTION_AUDIT_FAILED')
  })
})
