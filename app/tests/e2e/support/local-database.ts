import { Client } from 'pg'

export function readEntityAudit(entityId: string) {
  return withLocalDatabase(async db => (await db.query<{ id: string; escola_id: string; fingerprint: string }>(
    'SELECT id, escola_id, md5(to_jsonb(a)::text) AS fingerprint FROM pilot_audit_log a WHERE entity_id = $1 ORDER BY id',
    [entityId],
  )).rows)
}

/** Independent SQL oracle. Never connect to a linked, demo or remote database. */
export async function withLocalDatabase<T>(run: (client: Client) => Promise<T>): Promise<T> {
  const connectionString = process.env.SUPABASE_DB_URL
  if (!connectionString || !['127.0.0.1', 'localhost'].includes(new URL(connectionString).hostname)) {
    throw new Error('Browser SQL proofs require an explicit loopback SUPABASE_DB_URL')
  }
  if (process.env.PILOT_SYNTHETIC_DATA_ONLY !== 'true') {
    throw new Error('Browser SQL proofs require synthetic-only fixtures')
  }
  const client = new Client({ connectionString })
  await client.connect()
  try {
    return await run(client)
  } finally {
    await client.end()
  }
}
