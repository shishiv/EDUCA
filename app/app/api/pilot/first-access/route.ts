import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { pilotErrorResponse } from '@/lib/pilot/pilot-api-error'
import { asPilotRpcClient } from '@/lib/pilot/pilot-rpc-client'
import {
  demoSandboxSimulatedSuccessResponse,
  isDemoSandboxEnabled,
} from '@/lib/demo-sandbox/demo-sandbox'
import { writeDemoActionInterceptedAudit } from '@/lib/demo-sandbox/demo-audit'
import {
  completePendingUserRegistration,
  createSupabaseUserLifecyclePorts,
  UserLifecycleError,
  type UserLifecycleAuthUser,
} from '@/lib/services/user-lifecycle'

const firstAccessSchema = z.object({
  password: z.string().min(12).max(128).regex(/[A-Z]/).regex(/[a-z]/).regex(/[0-9]/).regex(/[^A-Za-z0-9]/),
})

export async function POST(request: Request) {
  const demoSandbox = isDemoSandboxEnabled()

  try {
    const input = firstAccessSchema.parse(await request.json())
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) return NextResponse.json({ error: 'PILOT_FIRST_ACCESS_AUTH_REQUIRED' }, { status: 401 })

    if (demoSandbox) {
      const service = createServiceRoleClient()
      const { data: invitation, error: invitationError } = await service
        .from('pilot_user_invitations')
        .select('id,accepted_at')
        .eq('auth_user_id', user.id)
        .maybeSingle()
      if (invitationError) throw invitationError
      if (!invitation) return NextResponse.json({ error: 'PILOT_FIRST_ACCESS_INVITATION_REQUIRED' }, { status: 403 })

      const receipt = await writeDemoActionInterceptedAudit(
        asPilotRpcClient(supabase),
        {
          operation: 'demo.auth.first_access',
          entityId: user.id,
        }
      )
      const response = demoSandboxSimulatedSuccessResponse(
        'demo.auth.first_access',
        { completed: true, simulated: true },
        { auditId: receipt.auditId, correlationId: receipt.correlationId },
      )

      return response ?? NextResponse.json({ error: 'DEMO_FIRST_ACCESS_NOT_AVAILABLE' }, { status: 404 })
    }

    const service = createServiceRoleClient()
    let completion
    try {
      const lifecycleUser: UserLifecycleAuthUser = {
        id: user.id,
        email: user.email,
        user_metadata: user.user_metadata,
      }
      completion = await completePendingUserRegistration(
        createSupabaseUserLifecyclePorts({ serviceClient: service, sessionClient: supabase }),
        lifecycleUser,
        input.password,
      )
    } catch (error) {
      if (error instanceof UserLifecycleError) return firstAccessLifecycleErrorResponse(error)
      throw error
    }

    await asPilotRpcClient(supabase).rpc('write_pilot_audit_event', {
      p_event_type: 'first_access_completed', p_entity_type: 'user', p_entity_id: user.id,
      p_metadata: {},
    })
    return NextResponse.json({
      completed: true,
      resumedProfile: completion.resumedProfile,
      idempotentReplay: completion.idempotentReplay,
    })
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: 'PILOT_FIRST_ACCESS_PASSWORD_INVALID' }, { status: 400 })
    return pilotErrorResponse(error, { feature: 'pilot-first-access', fallbackCode: 'PILOT_FIRST_ACCESS_FAILED' })
  }
}

function firstAccessLifecycleErrorResponse(error: UserLifecycleError): NextResponse {
  if (error.code === 'INVITATION_REQUIRED') {
    return NextResponse.json({ error: 'PILOT_FIRST_ACCESS_INVITATION_REQUIRED' }, { status: 403 })
  }

  if (error.code === 'FIRST_ACCESS_PASSWORD_UNCHANGED') {
    return NextResponse.json({ error: 'PILOT_FIRST_ACCESS_PASSWORD_UNCHANGED', completed: false }, { status: 400 })
  }

  if (
    error.code === 'PROFILE_INCOMPLETE' ||
    error.code === 'PROFILE_COMPLETION_FAILED' ||
    error.code === 'INVITATION_COMPLETION_FAILED'
  ) {
    return NextResponse.json({
      error: 'PILOT_FIRST_ACCESS_REGISTRATION_INCOMPLETE',
      completed: false,
      identityPreserved: true,
      registration: { status: 'incomplete', resumePath: error.resumePath },
    }, { status: 503 })
  }

  return NextResponse.json({ error: 'PILOT_FIRST_ACCESS_FAILED' }, { status: 502 })
}
