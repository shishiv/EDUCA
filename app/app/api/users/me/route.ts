import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { asPilotRpcClient } from '@/lib/pilot/pilot-rpc-client'

const profileSchema = z.object({
  nome: z.string().trim().min(2).max(160),
}).strict()

/** Updates only the authenticated actor's display profile and verifies its audit receipt. */
export async function PATCH(request: Request) {
  try {
    const input = profileSchema.parse(await request.json())
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) return NextResponse.json({ error: 'PROFILE_AUTH_REQUIRED' }, { status: 401 })

    const { data: profile, error: profileError } = await supabase
      .from('users')
      .update({ nome: input.nome })
      .eq('id', user.id)
      .eq('ativo', true)
      .select('id,nome,email,tipo_usuario,escola_id,ativo')
      .maybeSingle()
    if (profileError) throw profileError
    if (!profile) return NextResponse.json({ error: 'PROFILE_NOT_FOUND' }, { status: 404 })

    const { data: receipt, error: auditError } = await asPilotRpcClient(supabase).rpc<string>('write_pilot_audit_event', {
      p_event_type: 'profile_updated',
      p_entity_type: 'user',
      p_entity_id: user.id,
      p_escola_id: profile.escola_id ?? undefined,
      p_metadata: {},
    })
    if (auditError || !receipt) return NextResponse.json({ error: 'PROFILE_AUDIT_INCOMPLETE', completed: false }, { status: 503 })
    return NextResponse.json({ profile, receipt })
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: 'PROFILE_INVALID' }, { status: 400 })
    return NextResponse.json({ error: 'PROFILE_UPDATE_FAILED' }, { status: 503 })
  }
}
