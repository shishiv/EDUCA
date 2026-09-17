import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { assertSyntheticPilotSafety, type PilotSafetyEnvironment } from '@/lib/pilot/pilot-safety-gate'
import { requirePilotActor, type PilotActor, type PilotUserRole } from '@/lib/pilot/pilot-server-auth'
import { pilotErrorResponse } from '@/lib/pilot/pilot-api-error'
import { asPilotRpcClient } from '@/lib/pilot/pilot-rpc-client'
import { isDemoSandboxEnabled } from '@/lib/demo-sandbox/demo-sandbox'
import {
  createSupabaseUserLifecyclePorts,
  revokeSyntheticPilotIdentity,
  UserLifecycleError,
  type UserLifecycleRevocationInput,
  type UserLifecycleRevocationResult,
} from '@/lib/services/user-lifecycle'

const safeReceiptCode = z.string().trim().min(1).max(80).regex(/^[A-Za-z0-9][A-Za-z0-9._:-]*$/)
const revocationSchema = z.object({
  release: safeReceiptCode,
  reason: safeReceiptCode.min(3),
})
const routeParamsSchema = z.object({ userId: z.string().uuid() })

export interface RevocationRouteContext {
  params: Promise<{ userId: string }>
}

export interface PilotIdentityRevocationAdapter {
  revoke(input: UserLifecycleRevocationInput): Promise<UserLifecycleRevocationResult>
  recordRevocationAudit(input: UserLifecycleRevocationInput, result: UserLifecycleRevocationResult): Promise<void>
}

export interface RevocationHandlerDependencies {
  isDemoSandboxEnabled(): boolean
  enforcePilotSafety(environment: PilotSafetyEnvironment | undefined): void
  requireActor(allowedRoles: PilotUserRole[]): Promise<PilotActor>
  createAdapter(): PilotIdentityRevocationAdapter
}

const defaultDependencies: RevocationHandlerDependencies = {
  isDemoSandboxEnabled,
  enforcePilotSafety: environment => assertSyntheticPilotSafety('seed', environment),
  requireActor: requirePilotActor,
  createAdapter: createSupabasePilotIdentityRevocationAdapter,
}

/** Enforces pilot revocation gates before the lifecycle adapter changes Auth or profiles. */
export function createRevocationHandler(dependencies: RevocationHandlerDependencies = defaultDependencies) {
  return async function POST(request: Request, context: RevocationRouteContext): Promise<NextResponse> {
    try {
      if (dependencies.isDemoSandboxEnabled()) {
        return NextResponse.json({ error: 'DEMO_AUTH_REVOCATION_NOT_AVAILABLE' }, { status: 404 })
      }

      dependencies.enforcePilotSafety(localE2ESafetyEnvironment())
      const actor = await dependencies.requireActor(['admin', 'secretario'])
      if (actor.schoolId !== null) {
        return NextResponse.json({ error: 'PILOT_AUTH_REVOCATION_MUNICIPAL_OPERATOR_REQUIRED' }, { status: 403 })
      }

      const { userId } = routeParamsSchema.parse(await context.params)
      if (userId === actor.id) {
        return NextResponse.json({ error: 'PILOT_AUTH_REVOCATION_SELF_DENIED' }, { status: 403 })
      }

      const receipt = revocationSchema.parse(await request.json())
      const input: UserLifecycleRevocationInput = { userId, ...receipt }
      const adapter = dependencies.createAdapter()
      const result = await adapter.revoke(input)
      await adapter.recordRevocationAudit(input, result)

      return NextResponse.json({
        revoked: true,
        idempotent: result.idempotent,
        receipt: {
          identity: result.identity,
          role: result.role,
          school: result.schoolId,
          release: input.release,
          reason: input.reason,
          timestamp: result.revokedAt,
        },
      }, { status: 200 })
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json({ error: 'PILOT_AUTH_REVOCATION_INVALID' }, { status: 400 })
      }
      if (error instanceof UserLifecycleError) {
        return userLifecycleRevocationErrorResponse(error)
      }
      if (error instanceof Error && error.message.startsWith('PILOT_SAFETY_GATE')) {
        return NextResponse.json({ error: error.message }, { status: 403 })
      }
      return pilotErrorResponse(error, {
        feature: 'pilot-auth-revocation',
        fallbackCode: 'PILOT_AUTH_REVOCATION_FAILED',
        fallbackStatus: 503,
      })
    }
  }
}

function createSupabasePilotIdentityRevocationAdapter(): PilotIdentityRevocationAdapter {
  const service = createServiceRoleClient()
  return {
    async revoke(input) {
      return revokeSyntheticPilotIdentity(
        createSupabaseUserLifecyclePorts({ serviceClient: service, sessionClient: service }),
        input,
      )
    },
    async recordRevocationAudit(input, result) {
      const supabase = await createClient()
      const { error } = await asPilotRpcClient(supabase).rpc('write_pilot_user_revocation_audit', {
        p_user_id: input.userId,
        p_role: result.role,
        p_escola_id: result.schoolId ?? undefined,
        p_release: input.release,
        p_reason: input.reason,
      })
      if (error) throw new Error(error.message)
    },
  }
}

function localE2ESafetyEnvironment(): PilotSafetyEnvironment | undefined {
  if (process.env.EDUCA_E2E_MODE !== 'true') return undefined
  return {
    pilotMode: 'true',
    syntheticOnly: 'true',
    externalDeployApproved: 'false',
    legalApprovalStatus: 'not_approved',
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  }
}

function userLifecycleRevocationErrorResponse(error: UserLifecycleError): NextResponse {
  if (error.code === 'PROFILE_NOT_FOUND') {
    return NextResponse.json({ error: 'PILOT_AUTH_REVOCATION_TARGET_NOT_FOUND' }, { status: 404 })
  }
  if (error.code === 'REVOCATION_RECEIPT_INVALID') {
    return NextResponse.json({ error: 'PILOT_AUTH_REVOCATION_INVALID' }, { status: 400 })
  }
  if (error.code === 'SYNTHETIC_IDENTITY_REQUIRED' || error.code === 'USER_ROLE_NOT_REVOCABLE') {
    return NextResponse.json({ error: 'PILOT_AUTH_REVOCATION_TARGET_DENIED' }, { status: 403 })
  }
  return NextResponse.json({ error: 'PILOT_AUTH_REVOCATION_INCOMPLETE' }, { status: 503 })
}
