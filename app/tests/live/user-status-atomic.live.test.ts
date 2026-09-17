// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createServerClient } from '@supabase/ssr'
import { Client } from 'pg'
import type { Database } from '@/types/database'

const enabled = process.env.EDUCA_USER_STATUS_HTTP_TEST === '1'
const actorId = '20000000-0000-0000-0000-000000000001'
const schoolId = '10000000-0000-0000-0000-000000000001'

function localUrl(value: string | undefined) {
  const url = new URL(value ?? '')
  if (!['127.0.0.1', 'localhost'].includes(url.hostname)) throw new Error('F04_LOCAL_ENDPOINT_REQUIRED')
  return url.toString()
}

describe.skipIf(!enabled)('F04 real HTTP status and semantic receipt', () => {
  let database: Client
  let cookie: string
  let origin: string
  let targetId: string

  beforeAll(async () => {
    origin = localUrl(process.env.NEXT_PUBLIC_APP_URL)
    database = new Client({ connectionString: localUrl(process.env.SUPABASE_DB_URL), statement_timeout: 8000 })
    await database.connect()
    const target = await database.query<{ id: string }>("SELECT id FROM public.users WHERE email='professora.a@synthetic.invalid'")
    targetId = target.rows[0].id
    const client = createServerClient<Database>(
      localUrl(process.env.NEXT_PUBLIC_SUPABASE_URL), process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
      { cookies: { getAll: () => [], setAll: entries => { cookie = entries.map(entry => `${entry.name}=${entry.value}`).join('; ') } } },
    )
    const login = await client.auth.signInWithPassword({ email: 'admin@synthetic.invalid', password: 'Synthetic-Only-2026!' })
    if (login.error) throw login.error
    expect(login.data.user?.id).toBe(actorId)
  })

  afterAll(async () => {
    if (!database) return
    try {
      await database.query('DROP TRIGGER IF EXISTS f04_http_receipt_failure ON public.pilot_audit_log; DROP FUNCTION IF EXISTS public.f04_http_receipt_failure()')
    } finally {
      await database.end()
    }
  })

  async function snapshot() {
    const result = await database.query<{ ativo: boolean; semantic: number; generic: number }>(`SELECT ativo,
      (SELECT count(*)::int FROM public.pilot_audit_log WHERE entity_id=$1 AND event_type='user_status_updated') AS semantic,
      (SELECT count(*)::int FROM public.pilot_audit_log WHERE entity_id=$1 AND event_type='update') AS generic
      FROM public.users WHERE id=$1::uuid`, [targetId])
    return result.rows[0]
  }

  async function patch(ativo: boolean) {
    return fetch(new URL(`/api/users/${targetId}/status`, origin), {
      method: 'PATCH', headers: { cookie, 'content-type': 'application/json' }, body: JSON.stringify({ ativo }),
    })
  }

  it.each(['throw', 'suppress'])('%s of semantic receipt preserves persisted state and both audit counts', async fault => {
    await database.query('UPDATE public.users SET ativo=true WHERE id=$1', [targetId])
    const before = await snapshot()
    await database.query(`CREATE OR REPLACE FUNCTION public.f04_http_receipt_failure() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN
        IF NEW.event_type='user_status_updated' THEN
          ${fault === 'suppress' ? 'RETURN NULL;' : "RAISE EXCEPTION 'F04_HTTP_RECEIPT_FAILURE';"}
        END IF;
        RETURN NEW;
      END $$;
      CREATE TRIGGER f04_http_receipt_failure BEFORE INSERT ON public.pilot_audit_log
      FOR EACH ROW EXECUTE FUNCTION public.f04_http_receipt_failure()`)
    try {
      const response = await patch(false)
      const body = await response.json()
      const after = await snapshot()
      console.info('F04_HTTP_FAULT', { fault, status: response.status, body, before, after })
      expect(response.status).toBe(503)
      expect(body).not.toHaveProperty('receipt')
      expect(after).toEqual(before)
    } finally {
      await database.query('DROP TRIGGER f04_http_receipt_failure ON public.pilot_audit_log; DROP FUNCTION public.f04_http_receipt_failure()')
    }
  }, 30000)

  it('retries with a truthful no-op receipt after a committed desired state', async () => {
    await database.query('UPDATE public.users SET ativo=true WHERE id=$1', [targetId])
    for (const previousActive of [true, false]) {
      const response = await patch(false)
      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.user).toEqual({ id: targetId, ativo: false })
      const receipt = await database.query(`SELECT actor_user_id,escola_id,entity_type,entity_id,redacted_metadata
        FROM public.pilot_audit_log WHERE id=$1 AND event_type='user_status_updated'`, [body.receipt])
      expect(receipt.rows).toEqual([{
        actor_user_id: actorId, escola_id: schoolId, entity_type: 'user', entity_id: targetId,
        redacted_metadata: { previous_active: previousActive, active: false, changed: previousActive },
      }])
      expect((await snapshot()).ativo).toBe(false)
      console.info('F04_HTTP_RECEIPT', { body, receipt: receipt.rows[0] })
    }
  })
})
