import { describe, expect, it } from 'vitest'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import type { PilotActor } from '@/lib/pilot/pilot-server-auth'
import { createSelfProfileHandler, createSupabaseSelfProfileStore } from '@/app/api/users/me/handler'

const actor: PilotActor = {
  id: 'b5200000-0000-0000-0000-000000000002',
  name: 'Professor Sintético',
  email: 'profile@synthetic.invalid',
  role: 'professor',
  schoolId: 'b5100000-0000-0000-0000-000000000001',
}

interface RequestRecord {
  request: Request
}

function fixture(options: {
  authFailure?: 'PILOT_AUTH_REQUIRED' | 'PILOT_ROLE_DENIED'
  result?: 'saved' | 'missing' | 'failed'
} = {}) {
  const requests: RequestRecord[] = []
  let storeCreations = 0
  const client = createClient<Database>('http://127.0.0.1:54321', 'synthetic-session-key', {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: {
      fetch: async (input: RequestInfo | URL, init?: RequestInit) => {
        const request = new Request(input, init)
        requests.push({ request: request.clone() })
        const path = new URL(request.url).pathname

        if (request.method !== 'POST' || path !== '/rest/v1/rpc/update_current_pilot_profile_name') {
          throw new Error('Unexpected profile request: ' + request.method + ' ' + path)
        }
        if (options.result === 'failed') {
          return Response.json({ message: 'write unavailable', code: 'XX000' }, { status: 500 })
        }
        if (options.result === 'missing') return Response.json([])
        return Response.json([{
          id: actor.id,
          nome: 'Nome atualizado',
          email: actor.email,
          tipo_usuario: actor.role,
          escola_id: actor.schoolId,
          ativo: true,
          audit_id: 'persisted-receipt',
        }])
      },
    },
  })
  const handler = createSelfProfileHandler({
    requireActor: async roles => {
      if (options.authFailure) throw new Error(options.authFailure)
      if (!roles.includes(actor.role)) throw new Error('PILOT_ROLE_DENIED')
      return actor
    },
    store: async () => {
      storeCreations++
      return createSupabaseSelfProfileStore(client)
    },
  })

  return { handler, requests, storeCreations: () => storeCreations }
}

function updateRequest(body = '{"nome":"  Nome atualizado  "}') {
  return new Request('http://localhost/api/users/me', {
    method: 'PATCH', headers: { 'content-type': 'application/json' }, body,
  })
}

describe('self profile server mutation', () => {
  it('uses one session RPC to persist the profile update and audit receipt atomically', async () => {
    const state = fixture()
    const response = await state.handler(updateRequest())

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      profile: {
        id: actor.id,
        nome: 'Nome atualizado',
        email: actor.email,
        tipo_usuario: actor.role,
        escola_id: actor.schoolId,
        ativo: true,
      },
      receipt: 'persisted-receipt',
    })
    expect(state.requests).toHaveLength(1)
    const request = state.requests[0].request
    expect(request.method).toBe('POST')
    expect(new URL(request.url).pathname).toBe('/rest/v1/rpc/update_current_pilot_profile_name')
    expect(await request.json()).toEqual({ p_nome: 'Nome atualizado' })
  })

  it.each([
    ['unknown fields', JSON.stringify({ nome: 'Nome atualizado', id: 'forged' })],
    ['malformed JSON', '{"nome":'],
  ])('rejects %s before opening the profile store', async (_label, body) => {
    const state = fixture()
    const response = await state.handler(updateRequest(body))

    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({ error: 'PROFILE_INVALID' })
    expect(state.storeCreations()).toBe(0)
    expect(state.requests).toHaveLength(0)
  })

  it.each([
    ['PILOT_AUTH_REQUIRED', 401],
    ['PILOT_ROLE_DENIED', 403],
  ] as const)('denies %s before opening the profile store', async (authFailure, status) => {
    const state = fixture({ authFailure })

    expect((await state.handler(updateRequest())).status).toBe(status)
    expect(state.storeCreations()).toBe(0)
    expect(state.requests).toHaveLength(0)
  })

  it('returns PROFILE_NOT_FOUND when the RPC returns no updated profile', async () => {
    const state = fixture({ result: 'missing' })
    const response = await state.handler(updateRequest())

    expect(response.status).toBe(404)
    expect(await response.json()).toEqual({ error: 'PROFILE_NOT_FOUND' })
    expect(state.requests).toHaveLength(1)
  })

  it('returns the pilot fallback when the transactional RPC fails', async () => {
    const state = fixture({ result: 'failed' })
    const response = await state.handler(updateRequest())

    expect(response.status).toBe(503)
    expect(await response.json()).toEqual({ error: 'PROFILE_UPDATE_FAILED' })
    expect(state.requests).toHaveLength(1)
  })
})
