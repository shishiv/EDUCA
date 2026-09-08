import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { assertSyntheticPilotSafety, type PilotSafetyEnvironment } from '@/lib/pilot/pilot-safety-gate'
import { requirePilotActor, type PilotActor, type PilotUserRole } from '@/lib/pilot/pilot-server-auth'
import { pilotErrorResponse } from '@/lib/pilot/pilot-api-error'
import { asPilotRpcClient } from '@/lib/pilot/pilot-rpc-client'
import {
  demoSandboxSimulatedSuccessResponse,
  isDemoSandboxEnabled,
} from '@/lib/demo-sandbox/demo-sandbox'
import { writeDemoActionInterceptedAudit, type DemoActionAuditReceipt } from '@/lib/demo-sandbox/demo-audit'
import {
  createSupabaseUserLifecyclePorts,
  startOrResumeUserRegistration,
  UserLifecycleError,
  type UserLifecycleInvitation,
  type UserLifecycleRegistrationResult,
} from '@/lib/services/user-lifecycle'

const invitationSchema = z.object({
  email: z.string().email().refine(email => email.endsWith('.invalid'), 'Synthetic invitation email required'),
  name: z.string().min(2).max(160),
  role: z.enum(['secretario', 'diretor', 'professor']),
  schoolId: z.string().uuid().nullable(),
})

export type InvitationRouteInput = z.infer<typeof invitationSchema>

export interface PilotInvitationAdapter {
  hasActiveSchool(schoolId: string): Promise<boolean>
  startRegistration(input: InvitationRouteInput, invitedBy: string): Promise<UserLifecycleRegistrationResult>
  ensureInvitationAudit(invitation: UserLifecycleInvitation): Promise<boolean>
}

export interface DemoInvitationAdapter {
  hasActiveSchool(schoolId: string): Promise<boolean>
  recordInterceptedInvitation(input: InvitationRouteInput): Promise<DemoActionAuditReceipt>
}

export interface InvitationHandlerDependencies {
  isDemoSandboxEnabled(): boolean
  enforcePilotSafety(environment: PilotSafetyEnvironment | undefined): void
  requireActor(allowedRoles: PilotUserRole[]): Promise<PilotActor>
  createPilotAdapter(): PilotInvitationAdapter
  createDemoAdapter(): DemoInvitationAdapter
}

const defaultDependencies: InvitationHandlerDependencies = {
  isDemoSandboxEnabled,
  enforcePilotSafety: environment => assertSyntheticPilotSafety('seed', environment),
  requireActor: requirePilotActor,
  createPilotAdapter: createSupabasePilotInvitationAdapter,
  createDemoAdapter: createSupabaseDemoInvitationAdapter,
}

/** Handles invitation policy while adapters own lifecycle and persistence effects. */
export function createInvitationHandler(dependencies: InvitationHandlerDependencies = defaultDependencies) {
  return async function POST(request: Request): Promise<NextResponse> {
    const demoSandbox = dependencies.isDemoSandboxEnabled()

    try {
      if (!demoSandbox) dependencies.enforcePilotSafety(localE2ESafetyEnvironment())
      const actor = await dependencies.requireActor(['admin', 'secretario'])
      if (actor.schoolId !== null) return NextResponse.json({ error: 'PILOT_INVITE_SECRETARIAT_REQUIRED' }, { status: 403 })

      const input = invitationSchema.parse(await request.json())
      if (input.role !== 'secretario' && !input.schoolId) return NextResponse.json({ error: 'PILOT_INVITE_SCHOOL_REQUIRED' }, { status: 400 })
      if (input.role === 'secretario' && input.schoolId) return NextResponse.json({ error: 'PILOT_INVITE_SECRETARIAT_MUST_BE_MUNICIPAL' }, { status: 400 })

      if (demoSandbox) return runDemoInvitation(dependencies.createDemoAdapter(), input)
      return runPilotInvitation(dependencies.createPilotAdapter(), input, actor.id)
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json({ error: 'PILOT_INVITE_INVALID', issues: error.issues.map(issue => ({ path: issue.path, code: issue.code })) }, { status: 400 })
      }
      return pilotErrorResponse(error, { feature: 'pilot-invitations', fallbackCode: 'PILOT_INVITE_FAILED' })
    }
  }
}

function createSupabasePilotInvitationAdapter(): PilotInvitationAdapter {
  const service = createServiceRoleClient()
  return {
    async hasActiveSchool(schoolId) {
      const { data: school } = await service.from('escolas').select('id').eq('id', schoolId).eq('ativo', true).maybeSingle()
      return school !== null
    },
    async startRegistration(input, invitedBy) {
      const redirectBase = process.env.NEXT_PUBLIC_APP_URL || 'http://127.0.0.1:3000'
      return startOrResumeUserRegistration(
        createSupabaseUserLifecyclePorts({ serviceClient: service, sessionClient: service }),
        { ...input, invitedBy },
        `${redirectBase}/primeiro-acesso`,
      )
    },
    async ensureInvitationAudit(invitation) {
      const supabase = await createClient()
      const { data, error } = await asPilotRpcClient(supabase).rpc('ensure_pilot_invitation_audit', {
        p_invitation_id: invitation.id,
      })
      return !error && data !== null
    },
  }
}

function createSupabaseDemoInvitationAdapter(): DemoInvitationAdapter {
  return {
    async hasActiveSchool(schoolId) {
      const supabase = await createClient()
      const { data: school, error } = await supabase
        .from('escolas')
        .select('id')
        .eq('id', schoolId)
        .eq('ativo', true)
        .maybeSingle()
      if (error) throw error
      return school !== null
    },
    async recordInterceptedInvitation(input) {
      const supabase = await createClient()
      return writeDemoActionInterceptedAudit(
        asPilotRpcClient(supabase),
        {
          operation: 'demo.auth.invitation',
          entityId: receiptEntityId(input.email),
          schoolId: input.schoolId,
        },
      )
    },
  }
}

async function runDemoInvitation(adapter: DemoInvitationAdapter, input: InvitationRouteInput): Promise<NextResponse> {
  if (input.schoolId && !await adapter.hasActiveSchool(input.schoolId)) {
    return NextResponse.json({ error: 'PILOT_INVITE_SCHOOL_NOT_FOUND' }, { status: 404 })
  }

  const receipt = await adapter.recordInterceptedInvitation(input)
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

async function runPilotInvitation(adapter: PilotInvitationAdapter, input: InvitationRouteInput, actorId: string): Promise<NextResponse> {
  if (input.schoolId && !await adapter.hasActiveSchool(input.schoolId)) {
    return NextResponse.json({ error: 'PILOT_INVITE_SCHOOL_NOT_FOUND' }, { status: 404 })
  }

  let registration: UserLifecycleRegistrationResult
  try {
    registration = await adapter.startRegistration(input, actorId)
  } catch (error) {
    if (error instanceof UserLifecycleError) return userLifecycleErrorResponse(error)
    throw error
  }

  if (!await adapter.ensureInvitationAudit(registration.invitation)) {
    return NextResponse.json({ error: 'PILOT_INVITE_AUDIT_INCOMPLETE', completed: false }, { status: 503 })
  }
  const invitation = publicInvitation(registration.invitation)
  if (!registration.created) {
    if (registration.resumed) {
      return NextResponse.json({
        invitation,
        resumed: true,
        registration: { status: 'incomplete', resumePath: '/primeiro-acesso' },
      }, { status: 200 })
    }
    return NextResponse.json({ error: 'PILOT_INVITE_ALREADY_PENDING', invitation, emailResent: false }, { status: 409 })
  }

  return NextResponse.json({ invitation }, { status: 201 })
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

function userLifecycleErrorResponse(error: UserLifecycleError): NextResponse {
  if (error.code === 'AUTH_USER_ALREADY_REGISTERED') {
    return NextResponse.json({ error: 'PILOT_INVITE_EMAIL_ALREADY_REGISTERED' }, { status: 409 })
  }
  if (error.code === 'INVITATION_ALREADY_ACCEPTED') {
    return NextResponse.json({ error: 'PILOT_INVITE_ALREADY_ACCEPTED' }, { status: 409 })
  }
  if (error.code === 'PROFILE_INCOMPLETE' || error.code === 'INVITATION_PERSISTENCE_FAILED') {
    return NextResponse.json({
      error: error.code === 'PROFILE_INCOMPLETE' ? 'PILOT_INVITE_PROFILE_INCOMPLETE' : 'PILOT_INVITE_REGISTRATION_INCOMPLETE',
      completed: false,
      identityPreserved: true,
      registration: { status: 'incomplete', resumePath: error.resumePath },
    }, { status: 503 })
  }
  return NextResponse.json({ error: 'PILOT_INVITE_FAILED' }, { status: 502 })
}

function publicInvitation(invitation: UserLifecycleInvitation) {
  const result = {
    id: invitation.id,
    email: invitation.email,
    invited_role: invitation.invited_role,
    escola_id: invitation.escola_id,
  }
  if (invitation.created_at) return { ...result, created_at: invitation.created_at }
  return result
}

function receiptEntityId(email: string): string {
  let hash = 0
  for (const character of email) hash = (hash * 31 + character.charCodeAt(0)) >>> 0
  return `invite-${hash.toString(16)}`
}
