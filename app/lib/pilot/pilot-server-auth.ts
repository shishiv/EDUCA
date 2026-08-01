import { createClient } from '@/lib/supabase/server'

export type PilotUserRole = 'admin' | 'secretario' | 'diretor' | 'professor'

export interface PilotActor {
  id: string
  role: PilotUserRole
  schoolId: string | null
  email: string | null
}

/** Resolves the active pilot actor from the verified Supabase session. */
export async function requirePilotActor(allowedRoles: PilotUserRole[]): Promise<PilotActor> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) throw new Error('PILOT_AUTH_REQUIRED')

  const { data: profile, error: profileError } = await supabase
    .from('users')
    .select('id,tipo_usuario,escola_id,email,ativo')
    .eq('id', user.id)
    .eq('ativo', true)
    .single()

  if (profileError || !profile || !allowedRoles.includes(profile.tipo_usuario as PilotUserRole)) {
    throw new Error('PILOT_ROLE_DENIED')
  }

  return { id: profile.id, role: profile.tipo_usuario as PilotUserRole, schoolId: profile.escola_id, email: profile.email }
}
