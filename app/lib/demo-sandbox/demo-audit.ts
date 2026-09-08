import type { PilotRpcResult } from '@/lib/pilot/pilot-rpc-client'

export const DEMO_ACTION_INTERCEPTED_EVENT = 'demo_action_intercepted' as const

export type DemoActionOperation =
  | 'demo.config.update'
  | 'demo.config.reset'
  | 'demo.feature_flag.toggle'
  | 'demo.user.status_update'
  | 'demo.pilot.import'
  | 'demo.pilot.import_approval'
  | 'demo.pilot.import_rollback'
  | 'demo.auth.invitation'
  | 'demo.auth.first_access'

export interface DemoActionAuditInput {
  operation: DemoActionOperation
  entityId?: string | null
  schoolId?: string | null
  correlationId?: string
}

export interface DemoActionAuditReceipt {
  auditId: string
  correlationId: string
  operation: DemoActionOperation
  outcome: 'simulated_success'
  effectSuppressed: true
}

export interface WritePilotAuditEventArgs {
  [key: string]: string | null | DemoActionAuditMetadata
  p_event_type: typeof DEMO_ACTION_INTERCEPTED_EVENT
  p_entity_type: 'demo_operation'
  p_entity_id: string | null
  p_escola_id: string | null
  p_metadata: DemoActionAuditMetadata
}

/** Narrow RPC port used by the demo audit writer. */
export interface DemoAuditRpcClient {
  rpc(
    functionName: 'write_pilot_audit_event',
    args: WritePilotAuditEventArgs,
  ): Promise<PilotRpcResult<string>>
}

export interface DemoActionAuditMetadata {
  operation: DemoActionOperation
  outcome: 'simulated_success'
  effect_suppressed: true
  synthetic_only: true
  correlation_id: string
}

/** Builds fixed, redacted metadata for an intercepted demo operation. */
export function buildDemoActionAuditMetadata(
  input: DemoActionAuditInput,
  correlationId: string
): DemoActionAuditMetadata {
  return {
    operation: input.operation,
    outcome: 'simulated_success',
    effect_suppressed: true,
    synthetic_only: true,
    correlation_id: correlationId,
  }
}

/** Writes only the truthful simulated outcome to the append-only pilot audit RPC. */
export async function writeDemoActionInterceptedAudit(
  client: DemoAuditRpcClient,
  input: DemoActionAuditInput
): Promise<DemoActionAuditReceipt> {
  const correlationId = input.correlationId ?? crypto.randomUUID()
  const { data, error } = await client.rpc('write_pilot_audit_event', {
    p_event_type: DEMO_ACTION_INTERCEPTED_EVENT,
    p_entity_type: 'demo_operation',
    p_entity_id: input.entityId ?? null,
    p_escola_id: input.schoolId ?? null,
    p_metadata: buildDemoActionAuditMetadata(input, correlationId),
  })

  if (error || !data) {
    throw new Error('DEMO_ACTION_AUDIT_FAILED')
  }

  return {
    auditId: data,
    correlationId,
    operation: input.operation,
    outcome: 'simulated_success',
    effectSuppressed: true,
  }
}
