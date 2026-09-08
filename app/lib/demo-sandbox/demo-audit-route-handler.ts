import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { asPilotRpcClient } from '@/lib/pilot/pilot-rpc-client'
import { pilotErrorResponse } from '@/lib/pilot/pilot-api-error'
import { requirePilotActor } from '@/lib/pilot/pilot-server-auth'
import {
  isDemoSandboxEnabled,
  demoSandboxSimulatedSuccessResponse,
} from '@/lib/demo-sandbox/demo-sandbox'
import {
  writeDemoActionInterceptedAudit,
  type DemoActionAuditInput,
  type DemoActionAuditReceipt,
  type DemoActionOperation,
} from '@/lib/demo-sandbox/demo-audit'

const demoAuditRequestSchema = z.object({
  operation: z.enum([
    'demo.config.update',
    'demo.config.reset',
    'demo.feature_flag.toggle',
    'demo.user.status_update',
  ]),
  entityId: z.string().max(160).nullable().optional(),
  schoolId: z.string().uuid().nullable().optional(),
})

function canRecordDemoOperation(role: string, operation: DemoActionOperation): boolean {
  if (operation === 'demo.user.status_update' || operation === 'demo.feature_flag.toggle') {
    return role === 'admin'
  }
  return role === 'admin' || role === 'diretor'
}

export interface DemoAuditRouteDependencies {
  isDemoSandboxEnabled(): boolean
  requireActor(): ReturnType<typeof requirePilotActor>
  schoolExists(schoolId: string): Promise<boolean>
  writeAudit(input: DemoActionAuditInput): Promise<DemoActionAuditReceipt>
  simulatedSuccessResponse: typeof demoSandboxSimulatedSuccessResponse
}

type AuthorizedDemoAuditRequest = {
  input: DemoActionAuditInput
}

type DemoAuditAuthorizationResult =
  | AuthorizedDemoAuditRequest
  | { response: NextResponse }

function createDefaultDependencies(): DemoAuditRouteDependencies {
  return {
    isDemoSandboxEnabled,
    requireActor: () => requirePilotActor(['admin', 'diretor']),
    async schoolExists(schoolId) {
      const supabase = await createClient()
      const { data: school, error } = await supabase
        .from('escolas')
        .select('id')
        .eq('id', schoolId)
        .eq('ativo', true)
        .maybeSingle()
      if (error) throw error
      return Boolean(school)
    },
    async writeAudit(input) {
      const supabase = await createClient()
      return writeDemoActionInterceptedAudit(asPilotRpcClient(supabase), input)
    },
    simulatedSuccessResponse: demoSandboxSimulatedSuccessResponse,
  }
}

function unavailableResponse(): NextResponse {
  return NextResponse.json({ error: 'DEMO_AUDIT_NOT_AVAILABLE' }, { status: 404 })
}

async function authorizeDemoAuditRequest(
  request: Request,
  dependencies: DemoAuditRouteDependencies,
): Promise<DemoAuditAuthorizationResult> {
  const actor = await dependencies.requireActor()
  const input = demoAuditRequestSchema.parse(await request.json())

  if (!canRecordDemoOperation(actor.role, input.operation)) {
    return { response: NextResponse.json({ error: 'DEMO_AUDIT_ROLE_DENIED' }, { status: 403 }) }
  }

  if (input.schoolId && actor.schoolId !== null && input.schoolId !== actor.schoolId) {
    return { response: NextResponse.json({ error: 'DEMO_AUDIT_SCHOOL_DENIED' }, { status: 403 }) }
  }

  if (input.schoolId && !await dependencies.schoolExists(input.schoolId)) {
    return { response: NextResponse.json({ error: 'DEMO_AUDIT_SCHOOL_NOT_FOUND' }, { status: 404 }) }
  }

  return { input }
}

function simulatedAuditResponse(
  input: DemoActionAuditInput,
  receipt: DemoActionAuditReceipt,
  dependencies: DemoAuditRouteDependencies,
): NextResponse {
  return dependencies.simulatedSuccessResponse(
    input.operation,
    undefined,
    { auditId: receipt.auditId, correlationId: receipt.correlationId },
  ) ?? unavailableResponse()
}

export function createDemoAuditPostHandler(
  dependencies: DemoAuditRouteDependencies = createDefaultDependencies(),
) {
  return async function POST(request: Request) {
    if (!dependencies.isDemoSandboxEnabled()) {
      return unavailableResponse()
    }

    try {
      const authorization = await authorizeDemoAuditRequest(request, dependencies)
      if ('response' in authorization) return authorization.response

      const receipt = await dependencies.writeAudit(authorization.input)
      return simulatedAuditResponse(authorization.input, receipt, dependencies)
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json({ error: 'DEMO_AUDIT_INVALID' }, { status: 400 })
      }
      return pilotErrorResponse(error, {
        feature: 'demo-audit',
        fallbackCode: 'DEMO_AUDIT_FAILED',
        fallbackStatus: 400,
      })
    }
  }
}
