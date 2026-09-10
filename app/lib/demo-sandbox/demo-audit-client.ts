import { z } from 'zod'
import type {
  DemoActionAuditInput,
  DemoActionAuditReceipt,
} from '@/lib/demo-sandbox/demo-audit'

export interface DemoAuditTransportResponse {
  ok: boolean
  json(): Promise<DemoAuditResponsePayload>
}

export interface DemoAuditTransport {
  post(input: Omit<DemoActionAuditInput, 'correlationId'>): Promise<DemoAuditTransportResponse>
}

const demoActionOperationSchema = z.enum([
  'demo.config.update',
  'demo.config.reset',
  'demo.feature_flag.toggle',
  'demo.user.status_update',
  'demo.pilot.import',
  'demo.pilot.import_approval',
  'demo.pilot.import_rollback',
  'demo.auth.invitation',
  'demo.auth.first_access',
])

const demoAuditResponseSchema = z.object({
  demo: z.object({
    operation: demoActionOperationSchema,
    outcome: z.literal('simulated_success'),
    effect_suppressed: z.literal(true),
    synthetic_only: z.literal(true),
    correlation_id: z.string().min(1),
    audit_id: z.string().min(1),
  }),
  error: z.string().optional(),
})

export interface DemoAuditResponsePayload {
  demo?: {
    operation?: string
    outcome?: string
    effect_suppressed?: boolean
    synthetic_only?: boolean
    correlation_id?: string
    audit_id?: string
  }
  error?: string
}

export function createFetchDemoAuditTransport(
  request: typeof fetch = fetch,
): DemoAuditTransport {
  return {
    async post(input) {
      return request('/api/demo/audit', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(input),
      })
    },
  }
}

export function parseDemoActionAuditReceipt(
  response: DemoAuditTransportResponse,
  payload: DemoAuditResponsePayload,
): DemoActionAuditReceipt {
  const result = demoAuditResponseSchema.safeParse(payload)
  if (!response.ok || !result.success) throw new Error('DEMO_ACTION_AUDIT_FAILED')

  return {
    auditId: result.data.demo.audit_id,
    correlationId: result.data.demo.correlation_id,
    operation: result.data.demo.operation,
    outcome: result.data.demo.outcome,
    effectSuppressed: result.data.demo.effect_suppressed,
  }
}

/** Records a redacted simulated action through the authenticated demo API. */
export async function recordDemoClientAction(
  input: Omit<DemoActionAuditInput, 'correlationId'>,
  transport: DemoAuditTransport = createFetchDemoAuditTransport(),
): Promise<DemoActionAuditReceipt> {
  const response = await transport.post(input)
  const payload = await response.json().catch((): DemoAuditResponsePayload => ({}))
  return parseDemoActionAuditReceipt(response, payload)
}
