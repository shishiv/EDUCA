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
type ServerClient = Awaited<ReturnType<typeof createClient>>
type ServiceClient = ReturnType<typeof createServiceRoleClient>

export async function POST(request: Request) {
  try {
    const input = firstAccessSchema.parse(await request.json())
    const supabase = await createClient()
    const user = await getAuthenticatedUser(supabase)
    if (!user) return NextResponse.json({ error: 'PILOT_FIRST_ACCESS_AUTH_REQUIRED' }, { status: 401 })

    const service = createServiceRoleClient()
    if (isDemoSandboxEnabled()) return handleDemoFirstAccess(supabase, service, user.id)

    const revoked = await isRevokedLifecycleProfile(service, user.id)
    if (revoked) return NextResponse.json({ error: 'PILOT_FIRST_ACCESS_REVOKED' }, { status: 403 })

    try {
      const completion = await completeFirstAccess(supabase, service, user, input.password)
      return writeFirstAccessReceipt(supabase, user.id, completion)
    } catch (error) {
      if (error instanceof UserLifecycleError) return firstAccessLifecycleErrorResponse(error)
      throw error
    }
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: 'PILOT_FIRST_ACCESS_PASSWORD_INVALID' }, { status: 400 })
    return pilotErrorResponse(error, { feature: 'pilot-first-access', fallbackCode: 'PILOT_FIRST_ACCESS_FAILED' })
  }
}

async function getAuthenticatedUser(supabase: ServerClient): Promise<UserLifecycleAuthUser | null> {
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return null
  return { id: user.id, email: user.email, user_metadata: user.user_metadata }
}

async function handleDemoFirstAccess(supabase: ServerClient, service: ServiceClient, userId: string): Promise<NextResponse> {
  const { data: invitation, error } = await service
    .from('pilot_user_invitations')
    .select('id,accepted_at')
    .eq('auth_user_id', userId)
    .maybeSingle()
  if (error) throw error
  if (!invitation) return NextResponse.json({ error: 'PILOT_FIRST_ACCESS_INVITATION_REQUIRED' }, { status: 403 })

  const receipt = await writeDemoActionInterceptedAudit(asPilotRpcClient(supabase), {
    operation: 'demo.auth.first_access', entityId: userId,
  })
  return demoSandboxSimulatedSuccessResponse(
    'demo.auth.first_access',
    { completed: true, simulated: true },
    { auditId: receipt.auditId, correlationId: receipt.correlationId },
  ) ?? NextResponse.json({ error: 'DEMO_FIRST_ACCESS_NOT_AVAILABLE' }, { status: 404 })
}

async function isRevokedLifecycleProfile(service: ServiceClient, userId: string): Promise<boolean> {
  const { data, error } = await service.from('users').select('ativo').eq('id', userId).maybeSingle()
  if (error) throw error
  return data?.ativo === false
}

async function completeFirstAccess(
  supabase: ServerClient,
  service: ServiceClient,
  user: UserLifecycleAuthUser,
  password: string,
) {
  return completePendingUserRegistration(
    createSupabaseUserLifecyclePorts({ serviceClient: service, sessionClient: supabase }),
    user,
    password,
  )
}

async function writeFirstAccessReceipt(
  supabase: ServerClient,
  userId: string,
  completion: Awaited<ReturnType<typeof completeFirstAccess>>,
): Promise<NextResponse> {
  const { data, error } = await asPilotRpcClient(supabase).rpc('write_pilot_audit_event', {
    p_event_type: 'first_access_completed', p_entity_type: 'user', p_entity_id: userId, p_metadata: {},
  })
  if (error || !data) return NextResponse.json({ error: 'PILOT_FIRST_ACCESS_AUDIT_INCOMPLETE', completed: false }, { status: 503 })
  return NextResponse.json({
    completed: true,
    resumedProfile: completion.resumedProfile,
    idempotentReplay: completion.idempotentReplay,
  })
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
