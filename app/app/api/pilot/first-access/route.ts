import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { pilotErrorResponse } from '@/lib/pilot/pilot-api-error'
import { asPilotRpcClient } from '@/lib/pilot/pilot-rpc-client'
import { demoSandboxGuardResponse } from '@/lib/demo-sandbox/demo-sandbox'

const firstAccessSchema = z.object({
  password: z.string().min(12).max(128).regex(/[A-Z]/).regex(/[a-z]/).regex(/[0-9]/).regex(/[^A-Za-z0-9]/),
})

export async function POST(request: Request) {
  const demoSandboxBlock = demoSandboxGuardResponse('auth_mutation')
  if (demoSandboxBlock) return demoSandboxBlock

  try {
    const input = firstAccessSchema.parse(await request.json())
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) return NextResponse.json({ error: 'PILOT_FIRST_ACCESS_AUTH_REQUIRED' }, { status: 401 })

    const service = createServiceRoleClient()
    const { data: invitation } = await service.from('pilot_user_invitations').select('id,accepted_at').eq('auth_user_id', user.id).maybeSingle()
    if (!invitation) return NextResponse.json({ error: 'PILOT_FIRST_ACCESS_INVITATION_REQUIRED' }, { status: 403 })
    if (invitation.accepted_at) return NextResponse.json({ completed: true, idempotentReplay: true })

    const { error: passwordError } = await supabase.auth.updateUser({ password: input.password })
    if (passwordError?.code === 'same_password') {
      return NextResponse.json({ error: 'PILOT_FIRST_ACCESS_PASSWORD_UNCHANGED', completed: false }, { status: 400 })
    }
    if (passwordError) throw passwordError

    const now = new Date().toISOString()
    const { error: profileError } = await service.from('users').update({ primeiro_login: false, senha_padrao: false, data_ultimo_acesso: now }).eq('id', user.id)
    if (profileError) throw profileError
    const { error: inviteError } = await service.from('pilot_user_invitations').update({ accepted_at: now }).eq('id', invitation.id)
    if (inviteError) throw inviteError
    await asPilotRpcClient(supabase).rpc('write_pilot_audit_event', {
      p_event_type: 'first_access_completed', p_entity_type: 'user', p_entity_id: user.id,
      p_metadata: {},
    })
    return NextResponse.json({ completed: true })
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: 'PILOT_FIRST_ACCESS_PASSWORD_INVALID' }, { status: 400 })
    return pilotErrorResponse(error, { feature: 'pilot-first-access', fallbackCode: 'PILOT_FIRST_ACCESS_FAILED' })
  }
}
