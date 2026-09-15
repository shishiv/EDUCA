// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { Client } from 'pg'

const enabled = process.env.EDUCA_USER_STATUS_DB_TEST === '1'
const SCHOOL_A = 'f0430000-0000-4000-8000-000000000001'
const SCHOOL_B = 'f0430000-0000-4000-8000-000000000002'
const ADMIN = 'f0440000-0000-4000-8000-000000000001'
const TARGET = 'f0440000-0000-4000-8000-000000000002'
const rpc = 'SELECT * FROM public.set_governed_user_status($1, $2)'

async function connect() {
  const url = new URL(process.env.SUPABASE_DB_URL ?? '')
  if (!['127.0.0.1', 'localhost'].includes(url.hostname)) throw new Error('F04_LOCAL_DATABASE_REQUIRED')
  const client = new Client({ connectionString: url.toString(), statement_timeout: 8000 })
  await client.connect()
  return client
}
async function actorTransaction(client: Client) {
  await client.query('BEGIN; SET LOCAL ROLE authenticated')
  await client.query("SELECT set_config('request.jwt.claim.sub', $1, true)", [ADMIN])
}
async function waitForLock(observer: Client, waiter: number, holder: number) {
  for (let attempt = 0; attempt < 100; attempt++) {
    const result = await observer.query<{ blocked: boolean }>('SELECT $2::int = ANY(pg_blocking_pids($1::int)) AS blocked', [waiter, holder])
    if (result.rows[0].blocked) return
    await new Promise(resolve => setTimeout(resolve, 20))
  }
  throw new Error('F04_EXPECTED_ROW_LOCK_NOT_OBSERVED')
}
async function backendPid(client: Client) {
  const result = await client.query<{ pid: number }>('SELECT pg_backend_pid() AS pid')
  return result.rows[0].pid
}

describe.skipIf(!enabled)('F04 live PostgreSQL serialization', () => {
  let observer: Client
  let first: Client
  let second: Client
  let firstPid: number
  let secondPid: number
  beforeAll(async () => {
    observer = await connect()
    first = await connect()
    second = await connect()
    firstPid = await backendPid(first)
    secondPid = await backendPid(second)
    await observer.query(`INSERT INTO public.escolas(id,codigo,nome,tipo) VALUES
      ($1,'F04-CONC-A','F04 concorrência A','fundamental'),($2,'F04-CONC-B','F04 concorrência B','fundamental')`, [SCHOOL_A, SCHOOL_B])
    await observer.query(`INSERT INTO public.users(id,nome,email,tipo_usuario,escola_id,ativo) VALUES
      ($1,'F04 admin','f04-concurrency-admin@synthetic.invalid','admin',$3,true),
      ($2,'F04 target','f04-concurrency-target@synthetic.invalid','professor',$3,true)`, [ADMIN, TARGET, SCHOOL_A])
  })
  afterAll(async () => {
    await first?.query('ROLLBACK')
    await second?.query('ROLLBACK')
    await first?.end()
    await second?.end()
    await observer?.end()
    // Fixture and append-only audit records belong to the disposable database.
  })

  async function reset() {
    await first.query('ROLLBACK')
    await second.query('ROLLBACK')
    await observer.query("UPDATE public.users SET ativo=true, escola_id=$1, tipo_usuario=CASE WHEN id=$2 THEN 'admin' ELSE 'professor' END WHERE id IN ($2,$3)", [SCHOOL_A, ADMIN, TARGET])
  }
  async function state() {
    const result = await observer.query<{ ativo: boolean }>('SELECT ativo FROM public.users WHERE id=$1', [TARGET])
    return result.rows[0].ativo
  }
  async function receipts() {
    const result = await observer.query<{ count: number }>("SELECT count(*)::int AS count FROM public.pilot_audit_log WHERE event_type='user_status_updated' AND entity_id=$1", [TARGET])
    return result.rows[0].count
  }

  it.each([
    [ADMIN, 'ativo=false', 'PILOT_USER_STATUS_ROLE_DENIED'],
    [ADMIN, "tipo_usuario='secretario'", 'PILOT_USER_STATUS_ROLE_DENIED'],
    [ADMIN, `escola_id='${SCHOOL_B}'`, 'PILOT_USER_STATUS_SCHOOL_DENIED'],
    [TARGET, `escola_id='${SCHOOL_B}'`, 'PILOT_USER_STATUS_SCHOOL_DENIED'],
  ])('revalidates committed change to %s (%s)', async (id, change, expected) => {
    await reset()
    const before = await receipts()
    await first.query('BEGIN')
    await first.query(`UPDATE public.users SET ${change} WHERE id=$1`, [id])
    await actorTransaction(second)
    const pending = second.query(rpc, [TARGET, false]).then(() => 'UNEXPECTED_SUCCESS', error => error.message)
    await waitForLock(observer, secondPid, firstPid)
    await first.query('COMMIT')
    expect(await pending).toBe(expected)
    await second.query('ROLLBACK')
    expect(await state()).toBe(true)
    expect(await receipts()).toBe(before)
  })

  it('status-first holds actor and target scope until both status and receipt commit', async () => {
    await reset()
    await actorTransaction(first)
    const result = await first.query(rpc, [TARGET, false])
    expect(result.rows[0].audit_id).toBeTruthy()
    expect(await state()).toBe(true) // no externally visible partial write
    await second.query('BEGIN')
    const move = second.query('UPDATE public.users SET escola_id=$1 WHERE id=$2', [SCHOOL_B, TARGET])
    await waitForLock(observer, secondPid, firstPid)
    await first.query('COMMIT')
    await move
    await second.query('COMMIT')
    expect(await state()).toBe(false)
    const receipt = await observer.query('SELECT escola_id,actor_user_id,redacted_metadata FROM public.pilot_audit_log WHERE id=$1', [result.rows[0].audit_id])
    expect(receipt.rows[0]).toEqual({ escola_id: SCHOOL_A, actor_user_id: ADMIN, redacted_metadata: { previous_active: true, active: false, changed: true } })
    await actorTransaction(first)
    await expect(first.query(rpc, [TARGET, true])).rejects.toThrow('PILOT_USER_STATUS_SCHOOL_DENIED')
    await first.query('ROLLBACK')
  })

  it('serializes opposite desired states and audits the actual predecessor', async () => {
    await reset()
    const before = await receipts()
    await actorTransaction(first)
    const deactivate = await first.query(rpc, [TARGET, false])
    await actorTransaction(second)
    const activation = second.query(rpc, [TARGET, true])
    await waitForLock(observer, secondPid, firstPid)
    await first.query('COMMIT')
    const activated = await activation
    await second.query('COMMIT')
    expect(await state()).toBe(true)
    expect(await receipts()).toBe(before + 2)
    expect(activated.rows[0].audit_id).not.toBe(deactivate.rows[0].audit_id)
    const receipt = await observer.query('SELECT redacted_metadata FROM public.pilot_audit_log WHERE id=$1', [activated.rows[0].audit_id])
    expect(receipt.rows[0].redacted_metadata).toEqual({ previous_active: false, active: true, changed: true })
  })
})
