import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { assertSyntheticPilotSafety } from '@/lib/pilot/pilot-safety-gate'
import { requirePilotActor } from '@/lib/pilot/pilot-server-auth'
import { pilotErrorResponse } from '@/lib/pilot/pilot-api-error'
import { asPilotRpcClient } from '@/lib/pilot/pilot-rpc-client'
import { demoSandboxGuardResponse } from '@/lib/demo-sandbox/demo-sandbox'

const invitationSchema = z.object({
  email: z.string().email().refine(email => email.endsWith('.invalid'), 'Synthetic invitation email required'),
  name: z.string().min(2).max(160),
  role: z.enum(['secretario', 'diretor', 'professor']),
  schoolId: z.string().uuid().nullable(),
})

export async function POST(request: Request) {
  const demoSandboxBlock = demoSandboxGuardResponse()
  if (demoSandboxBlock) return demoSandboxBlock

  try {
    assertSyntheticPilotSafety('seed')
    const actor = await requirePilotActor(['admin', 'secretario'])
    if (actor.schoolId !== null) return NextResponse.json({ error: 'PILOT_INVITE_SECRETARIAT_REQUIRED' }, { status: 403 })
    const input = invitationSchema.parse(await request.json())
    if (input.role !== 'secretario' && !input.schoolId) return NextResponse.json({ error: 'PILOT_INVITE_SCHOOL_REQUIRED' }, { status: 400 })
    if (input.role === 'secretario' && input.schoolId) return NextResponse.json({ error: 'PILOT_INVITE_SECRETARIAT_MUST_BE_MUNICIPAL' }, { status: 400 })

    const service = createServiceRoleClient()
    if (input.schoolId) {
      const { data: school } = await service.from('escolas').select('id').eq('id', input.schoolId).eq('ativo', true).maybeSingle()
      if (!school) return NextResponse.json({ error: 'PILOT_INVITE_SCHOOL_NOT_FOUND' }, { status: 404 })
    }

    const { data: priorInvitations, error: priorInvitationError } = await service
      .from('pilot_user_invitations')
      .select('id,email,invited_role,escola_id,created_at,accepted_at')
      .eq('email', input.email)
      .order('created_at', { ascending: false })
      .limit(1)
    if (priorInvitationError) throw priorInvitationError
    const priorInvitation = priorInvitations?.[0]
    if (priorInvitation?.accepted_at) return NextResponse.json({ error: 'PILOT_INVITE_ALREADY_ACCEPTED' }, { status: 409 })
    if (priorInvitation) {
      const { accepted_at: _acceptedAt, ...invitation } = priorInvitation
      return NextResponse.json({ error: 'PILOT_INVITE_ALREADY_PENDING', invitation, emailResent: false }, { status: 409 })
    }

    const redirectBase = process.env.NEXT_PUBLIC_APP_URL || 'http://127.0.0.1:3000'
    const { data: invited, error: inviteError } = await service.auth.admin.inviteUserByEmail(input.email, {
      redirectTo: `${redirectBase}/primeiro-acesso`,
      data: { synthetic: true, pilot_role: input.role, pilot_school_id: input.schoolId },
    })
    if (inviteError) {
      const alreadyRegistered = /already (been )?registered|already exists|email_exists/i.test(inviteError.message)
      if (alreadyRegistered) return NextResponse.json({ error: 'PILOT_INVITE_EMAIL_ALREADY_REGISTERED' }, { status: 409 })
      throw inviteError
    }
    if (!invited.user) throw new Error('PILOT_INVITE_AUTH_USER_MISSING')

    const { error: profileError } = await service.from('users').upsert({
      id: invited.user.id,
      nome: input.name,
      email: input.email,
      tipo_usuario: input.role,
      escola_id: input.schoolId,
      ativo: true,
      primeiro_login: true,
      senha_padrao: false,
    }, { onConflict: 'id' })
    if (profileError) throw profileError
    const { data: invitation, error: invitationError } = await service.from('pilot_user_invitations').upsert({
      auth_user_id: invited.user.id,
      email: input.email,
      invited_role: input.role,
      escola_id: input.schoolId,
      invited_by: actor.id,
    }, { onConflict: 'auth_user_id' }).select('id,email,invited_role,escola_id,created_at').single()
    if (invitationError) throw invitationError

    const supabase = await createClient()
    await asPilotRpcClient(supabase).rpc('write_pilot_audit_event', {
      p_event_type: 'user_invited', p_entity_type: 'user', p_entity_id: invited.user.id,
      p_escola_id: input.schoolId ?? undefined, p_metadata: { role: input.role },
    })
    return NextResponse.json({ invitation }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: 'PILOT_INVITE_INVALID', issues: error.issues.map(issue => ({ path: issue.path, code: issue.code })) }, { status: 400 })
    return pilotErrorResponse(error, { feature: 'pilot-invitations', fallbackCode: 'PILOT_INVITE_FAILED' })
  }
}
