import { NextResponse } from 'next/server'
import { z } from 'zod'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { createClient } from '@/lib/supabase/server'
import { asPilotRpcClient } from '@/lib/pilot/pilot-rpc-client'
import { requirePilotActor } from '@/lib/pilot/pilot-server-auth'
import { pilotErrorResponse } from '@/lib/pilot/pilot-api-error'

const profileInput = z.object({ nome: z.string().trim().min(2).max(160) }).strict()
type UpdatedProfile = Pick<Database['public']['Tables']['users']['Row'],
  'id' | 'nome' | 'email' | 'tipo_usuario' | 'escola_id' | 'ativo'>

export interface SelfProfileStore {
  renameAndRecord(name: string): Promise<{ profile: UpdatedProfile; receipt: string } | null>
}

export function createSupabaseSelfProfileStore(
  session: SupabaseClient<Database>,
): SelfProfileStore {
  return {
    async renameAndRecord(name) {
      const { data, error } = await asPilotRpcClient(session).rpc(
        'update_current_pilot_profile_name',
        { p_nome: name },
      )
      if (error) throw error
      const result = data?.[0]
      if (!result) return null
      return {
        profile: {
          id: result.id,
          nome: result.nome,
          email: result.email,
          tipo_usuario: result.tipo_usuario,
          escola_id: result.escola_id,
          ativo: result.ativo,
        },
        receipt: result.audit_id,
      }
    },
  }
}

interface SelfProfileDependencies {
  requireActor: typeof requirePilotActor
  store: () => Promise<SelfProfileStore>
}

const production: SelfProfileDependencies = {
  requireActor: requirePilotActor,
  store: async () => createSupabaseSelfProfileStore(await createClient()),
}

/** Authenticates the active actor before opening the narrowly scoped server writer. */
export function createSelfProfileHandler(dependencies: SelfProfileDependencies = production) {
  return async function PATCH(request: Request) {
    try {
      await dependencies.requireActor(['admin', 'secretario', 'diretor', 'professor'])
      const input = profileInput.parse(await request.json())
      const store = await dependencies.store()
      const result = await store.renameAndRecord(input.nome)
      if (!result) return NextResponse.json({ error: 'PROFILE_NOT_FOUND' }, { status: 404 })
      return NextResponse.json(result)
    } catch (error) {
      if (error instanceof z.ZodError || error instanceof SyntaxError) {
        return NextResponse.json({ error: 'PROFILE_INVALID' }, { status: 400 })
      }
      return pilotErrorResponse(error, { feature: 'self-profile', fallbackCode: 'PROFILE_UPDATE_FAILED', fallbackStatus: 503 })
    }
  }
}
