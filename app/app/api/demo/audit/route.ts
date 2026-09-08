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
} from '@/lib/demo-sandbox/demo-audit'
import type { PilotActor } from '@/lib/pilot/pilot-server-auth'

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

type DemoAuditRequest = z.infer<typeof demoAuditRequestSchema>

export interface DemoAuditDatabase {
  activeSchoolExists(schoolId: string): Promise<boolean>
  writeAudit(input: DemoActionAuditInput): Promise<DemoActionAuditReceipt>
}

export interface DemoAuditRoutePorts {
  requireActor(): Promise<PilotActor>
  createDatabase(): Promise<DemoAuditDatabase>
}

function canRecordDemoOperation(role: string, operation: DemoAuditRequest['operation']): boolean {
  if (operation === 'demo.user.status_update' || operation === 'demo.feature_flag.toggle') {
    return role === 'admin'
  }
  return role === 'admin' || role === 'diretor'
}

function getScopeError(actor: PilotActor, input: DemoAuditRequest): NextResponse | null {
  if (!canRecordDemoOperation(actor.role, input.operation)) {
    return NextResponse.json({ error: 'DEMO_AUDIT_ROLE_DENIED' }, { status: 403 })
  }
  if (input.schoolId && actor.schoolId !== null && input.schoolId !== actor.schoolId) {
    return NextResponse.json({ error: 'DEMO_AUDIT_SCHOOL_DENIED' }, { status: 403 })
  }
  return null
}

async function getSchoolError(
  database: DemoAuditDatabase,
  schoolId: string | null | undefined,
): Promise<NextResponse | null> {
  if (!schoolId) return null

  if (!await database.activeSchoolExists(schoolId)) {
    return NextResponse.json({ error: 'DEMO_AUDIT_SCHOOL_NOT_FOUND' }, { status: 404 })
  }
  return null
}

async function createDemoAuditDatabase(): Promise<DemoAuditDatabase> {
  const supabase = await createClient()
  return {
    async activeSchoolExists(schoolId) {
      const { data, error } = await supabase
        .from('escolas')
        .select('id')
        .eq('id', schoolId)
        .eq('ativo', true)
        .maybeSingle()

      if (error) throw error
      return data !== null
    },
    writeAudit: (input) => writeDemoActionInterceptedAudit(asPilotRpcClient(supabase), input),
  }
}

const defaultPorts = {
  requireActor: () => requirePilotActor(['admin', 'diretor']),
  createDatabase: createDemoAuditDatabase,
} satisfies DemoAuditRoutePorts

export function createDemoAuditPost(ports: DemoAuditRoutePorts) {
  return async function post(request: Request) {
    if (!isDemoSandboxEnabled()) {
      return NextResponse.json({ error: 'DEMO_AUDIT_NOT_AVAILABLE' }, { status: 404 })
    }

    try {
      const actor = await ports.requireActor()
      const input = demoAuditRequestSchema.parse(await request.json())

      const scopeError = getScopeError(actor, input)
      if (scopeError) return scopeError

      const database = await ports.createDatabase()
      const schoolError = await getSchoolError(database, input.schoolId)
      if (schoolError) return schoolError

      const receipt = await database.writeAudit(input)
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
}

export const POST = createDemoAuditPost(defaultPorts)
