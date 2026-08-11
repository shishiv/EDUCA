import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { assertSyntheticPilotSafety } from '@/lib/pilot/pilot-safety-gate'
import { requirePilotActor } from '@/lib/pilot/pilot-server-auth'
import { pilotErrorResponse } from '@/lib/pilot/pilot-api-error'
import { asPilotRpcClient } from '@/lib/pilot/pilot-rpc-client'
import {
  demoSandboxSimulatedSuccessResponse,
  isDemoSandboxEnabled,
} from '@/lib/demo-sandbox/demo-sandbox'
import { writeDemoActionInterceptedAudit } from '@/lib/demo-sandbox/demo-audit'
import {
  createSupabaseUserLifecyclePorts,
  startOrResumeUserRegistration,
  UserLifecycleError,
} from '@/lib/services/user-lifecycle'

const invitationSchema = z.object({
  email: z.string().email().refine(email => email.endsWith('.invalid'), 'Synthetic invitation email required'),
  name: z.string().min(2).max(160),
  role: z.enum(['secretario', 'diretor', 'professor']),
  schoolId: z.string().uuid().nullable(),
})

export async function POST(request: Request) {
  const demoSandbox = isDemoSandboxEnabled()

  try {
    const localE2ESafety = process.env.EDUCA_E2E_MODE === 'true'
      ? {
          pilotMode: 'true',
          syntheticOnly: 'true',
          externalDeployApproved: 'false',
          legalApprovalStatus: 'not_approved',
          supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
        }
      : undefined
    // Standard E2E uses the canonical synthetic seed without switching the
    // Playwright harness into pilot auth mode. The safety gate still rejects
    // any non-local Supabase URL before this route can mutate Auth.
    if (!demoSandbox) assertSyntheticPilotSafety('seed', localE2ESafety)
    const actor = await requirePilotActor(['admin', 'secretario'])
    if (actor.schoolId !== null) return NextResponse.json({ error: 'PILOT_INVITE_SECRETARIAT_REQUIRED' }, { status: 403 })
    const input = invitationSchema.parse(await request.json())
    if (input.role !== 'secretario' && !input.schoolId) return NextResponse.json({ error: 'PILOT_INVITE_SCHOOL_REQUIRED' }, { status: 400 })
    if (input.role === 'secretario' && input.schoolId) return NextResponse.json({ error: 'PILOT_INVITE_SECRETARIAT_MUST_BE_MUNICIPAL' }, { status: 400 })

    if (demoSandbox) {
      const supabase = await createClient()
      if (input.schoolId) {
        const { data: school, error: schoolError } = await supabase
          .from('escolas')
          .select('id')
          .eq('id', input.schoolId)
          .eq('ativo', true)
          .maybeSingle()
        if (schoolError) throw schoolError
        if (!school) return NextResponse.json({ error: 'PILOT_INVITE_SCHOOL_NOT_FOUND' }, { status: 404 })
      }

      const receipt = await writeDemoActionInterceptedAudit(
        asPilotRpcClient(supabase),
        {
          operation: 'demo.auth.invitation',
          entityId: receiptEntityId(input.email),
          schoolId: input.schoolId,
        }
      )
      const response = demoSandboxSimulatedSuccessResponse(
        'demo.auth.invitation',
        {
          invitation: {
            id: receipt.correlationId,
            email: input.email,
            invited_role: input.role,
            escola_id: input.schoolId,
            simulated: true,
          },
        },
        { status: 201, auditId: receipt.auditId, correlationId: receipt.correlationId },
      )

      return response ?? NextResponse.json({ error: 'DEMO_INVITATION_NOT_AVAILABLE' }, { status: 404 })
    }

    const service = createServiceRoleClient()
    if (input.schoolId) {
      const { data: school } = await service.from('escolas').select('id').eq('id', input.schoolId).eq('ativo', true).maybeSingle()
      if (!school) return NextResponse.json({ error: 'PILOT_INVITE_SCHOOL_NOT_FOUND' }, { status: 404 })
    }

    const redirectBase = process.env.NEXT_PUBLIC_APP_URL || 'http://127.0.0.1:3000'
    let registration
    try {
      registration = await startOrResumeUserRegistration(
        createSupabaseUserLifecyclePorts({ serviceClient: service, sessionClient: service }),
        {
          email: input.email,
          name: input.name,
          role: input.role,
          schoolId: input.schoolId,
          invitedBy: actor.id,
        },
        `${redirectBase}/primeiro-acesso`,
      )
    } catch (error) {
      if (error instanceof UserLifecycleError) return userLifecycleErrorResponse(error)
      throw error
    }

    if (!registration.created) {
      const invitation = publicInvitation(registration.invitation)
      if (registration.resumed) {
        return NextResponse.json({
          invitation,
          resumed: true,
          registration: { status: 'incomplete', resumePath: '/primeiro-acesso' },
        }, { status: 200 })
      }
      return NextResponse.json({ error: 'PILOT_INVITE_ALREADY_PENDING', invitation, emailResent: false }, { status: 409 })
    }

    const supabase = await createClient()
    await asPilotRpcClient(supabase).rpc('write_pilot_audit_event', {
      p_event_type: 'user_invited', p_entity_type: 'user', p_entity_id: registration.invitation.auth_user_id,
      p_escola_id: input.schoolId ?? undefined, p_metadata: { role: input.role },
    })
    return NextResponse.json({ invitation: publicInvitation(registration.invitation) }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: 'PILOT_INVITE_INVALID', issues: error.issues.map(issue => ({ path: issue.path, code: issue.code })) }, { status: 400 })
    return pilotErrorResponse(error, { feature: 'pilot-invitations', fallbackCode: 'PILOT_INVITE_FAILED' })
  }
}

function userLifecycleErrorResponse(error: UserLifecycleError): NextResponse {
  if (error.code === 'AUTH_USER_ALREADY_REGISTERED') {
    return NextResponse.json({ error: 'PILOT_INVITE_EMAIL_ALREADY_REGISTERED' }, { status: 409 })
  }

  if (error.code === 'INVITATION_ALREADY_ACCEPTED') {
    return NextResponse.json({ error: 'PILOT_INVITE_ALREADY_ACCEPTED' }, { status: 409 })
  }

  if (error.code === 'PROFILE_INCOMPLETE' || error.code === 'INVITATION_PERSISTENCE_FAILED') {
    return NextResponse.json({
      error: error.code === 'PROFILE_INCOMPLETE'
        ? 'PILOT_INVITE_PROFILE_INCOMPLETE'
        : 'PILOT_INVITE_REGISTRATION_INCOMPLETE',
      completed: false,
      identityPreserved: true,
      registration: { status: 'incomplete', resumePath: error.resumePath },
    }, { status: 503 })
  }

  return NextResponse.json({ error: 'PILOT_INVITE_FAILED' }, { status: 502 })
}

function publicInvitation(invitation: {
  id: string
  email: string
  invited_role: string
  escola_id: string | null
  created_at?: string | null
}) {
  return {
    id: invitation.id,
    email: invitation.email,
    invited_role: invitation.invited_role,
    escola_id: invitation.escola_id,
    ...(invitation.created_at ? { created_at: invitation.created_at } : {}),
  }
}

function receiptEntityId(email: string): string {
  let hash = 0
  for (const character of email) hash = (hash * 31 + character.charCodeAt(0)) >>> 0
  return `invite-${hash.toString(16)}`
}
