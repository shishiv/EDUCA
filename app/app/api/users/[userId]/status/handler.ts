import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requirePilotActor } from '@/lib/pilot/pilot-server-auth'
import { pilotErrorResponse } from '@/lib/pilot/pilot-api-error'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { createClient } from '@/lib/supabase/server'
import { asPilotRpcClient } from '@/lib/pilot/pilot-rpc-client'

const paramsSchema = z.object({ userId: z.string().uuid() })
const statusSchema = z.object({ ativo: z.boolean() }).strict()
type Service = ReturnType<typeof createServiceRoleClient>
type StatusTarget = { id: string; escola_id: string | null }
export type UserStatusStore = {
  find(userId: string): Promise<StatusTarget | null>
  update(userId: string, ativo: boolean, schoolId: string | null): Promise<{ id: string; ativo: boolean } | null>
  audit(target: StatusTarget): Promise<string | null>
}
type Dependencies = { requireActor: typeof requirePilotActor; store: () => UserStatusStore }

export function createStatusHandler(dependencies: Dependencies = { requireActor: requirePilotActor, store: createUserStatusStore }) {
  return async function PATCH(request: Request, context: { params: Promise<{ userId: string }> }) {
    try {
      const actor = await dependencies.requireActor(['admin'])
      const { userId } = paramsSchema.parse(await context.params)
      const { ativo } = statusSchema.parse(await request.json())
      const store = dependencies.store()
      const target = await store.find(userId)
      if (!target) return NextResponse.json({ error: 'USER_STATUS_TARGET_NOT_FOUND' }, { status: 404 })
      if (actor.schoolId !== null && target.escola_id !== actor.schoolId) return NextResponse.json({ error: 'USER_STATUS_SCHOOL_DENIED' }, { status: 403 })
      const user = await store.update(target.id, ativo, actor.schoolId)
      if (!user) return NextResponse.json({ error: 'USER_STATUS_TARGET_NOT_FOUND' }, { status: 404 })
      const receipt = await store.audit(target)
      if (!receipt) return NextResponse.json({ error: 'USER_STATUS_AUDIT_INCOMPLETE', completed: false }, { status: 503 })
      return NextResponse.json({ user, receipt })
    } catch (error) {
      if (error instanceof z.ZodError) return NextResponse.json({ error: 'USER_STATUS_INVALID' }, { status: 400 })
      return pilotErrorResponse(error, { feature: 'user-status', fallbackCode: 'USER_STATUS_UPDATE_FAILED' })
    }
  }
}

function createUserStatusStore(): UserStatusStore {
  const service = createServiceRoleClient()
  const auditClient = createClient
  return {
    async find(userId) { return findTarget(service, userId) },
    async update(userId, ativo, schoolId) { return updateTarget(service, userId, ativo, schoolId) },
    async audit(target) {
      const { data, error } = await asPilotRpcClient(await auditClient()).rpc<string>('write_pilot_audit_event', { p_event_type: 'user_status_updated', p_entity_type: 'user', p_entity_id: target.id, p_escola_id: target.escola_id ?? undefined, p_metadata: {} })
      if (error) throw error
      return data
    },
  }
}

async function findTarget(service: Service, userId: string) { const { data, error } = await service.from('users').select('id,escola_id').eq('id', userId).maybeSingle(); if (error) throw error; return data }
async function updateTarget(service: Service, userId: string, ativo: boolean, schoolId: string | null) { let query = service.from('users').update({ ativo }).eq('id', userId); if (schoolId !== null) query = query.eq('escola_id', schoolId); const { data, error } = await query.select('id,ativo').maybeSingle(); if (error) throw error; return data }
