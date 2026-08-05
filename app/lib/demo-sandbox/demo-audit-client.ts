import type {
  DemoActionAuditInput,
  DemoActionAuditReceipt,
} from '@/lib/demo-sandbox/demo-audit'

/** Records a redacted simulated action through the authenticated demo API. */
export async function recordDemoClientAction(
  input: Omit<DemoActionAuditInput, 'correlationId'>
): Promise<DemoActionAuditReceipt> {
  const response = await fetch('/api/demo/audit', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  })
  const result = await response.json().catch(() => ({})) as {
    error?: string
    demo?: {
      operation?: DemoActionAuditReceipt['operation']
      outcome?: 'simulated_success'
      effect_suppressed?: true
      synthetic_only?: true
      correlation_id?: string
      audit_id?: string
    }
  }
  const demo = result.demo

  if (
    !response.ok ||
    !demo?.operation ||
    demo.outcome !== 'simulated_success' ||
    demo.effect_suppressed !== true ||
    demo.synthetic_only !== true ||
    !demo.correlation_id ||
    !demo.audit_id
  ) {
    throw new Error(result.error ?? 'DEMO_ACTION_AUDIT_FAILED')
  }

  return {
    auditId: demo.audit_id,
    correlationId: demo.correlation_id,
    operation: demo.operation,
    outcome: demo.outcome,
    effectSuppressed: demo.effect_suppressed,
  }
}
