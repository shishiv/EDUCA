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

export async function POST(request: Request) {
  if (!isDemoSandboxEnabled()) {
    return NextResponse.json({ error: 'DEMO_AUDIT_NOT_AVAILABLE' }, { status: 404 })
  }

  try {
    const actor = await requirePilotActor(['admin', 'diretor'])
    const input = demoAuditRequestSchema.parse(await request.json())

    if (!canRecordDemoOperation(actor.role, input.operation)) {
      return NextResponse.json({ error: 'DEMO_AUDIT_ROLE_DENIED' }, { status: 403 })
    }

    if (input.schoolId && actor.schoolId !== null && input.schoolId !== actor.schoolId) {
      return NextResponse.json({ error: 'DEMO_AUDIT_SCHOOL_DENIED' }, { status: 403 })
    }

    const supabase = await createClient()
    if (input.schoolId) {
      const { data: school, error: schoolError } = await supabase
        .from('escolas')
        .select('id')
        .eq('id', input.schoolId)
        .eq('ativo', true)
        .maybeSingle()

      if (schoolError) throw schoolError
      if (!school) return NextResponse.json({ error: 'DEMO_AUDIT_SCHOOL_NOT_FOUND' }, { status: 404 })
    }

    const receipt = await writeDemoActionInterceptedAudit(
      asPilotRpcClient(supabase),
      input
    )
    const response = demoSandboxSimulatedSuccessResponse(
      input.operation,
      {},
      { auditId: receipt.auditId, correlationId: receipt.correlationId },
    )

    return response ?? NextResponse.json({ error: 'DEMO_AUDIT_NOT_AVAILABLE' }, { status: 404 })
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
