import { vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

/**
 * Test adapter for the Attendance Module seam.
 *
 * Produces a SupabaseClient-shaped mock that records every table and RPC
 * touched, so tests can assert that attendance database calls go through the
 * client injected by the caller (the production adapter is createClient()
 * from '@/lib/supabase/server', which carries the authenticated session).
 *
 * All chainable query methods return the builder itself; terminal methods
 * resolve to `{ data: null, error: null }` unless overridden via singleResult
 * or rpcResult.
 */
export function createMockSupabaseClient(options: {
  singleResult?: unknown
  rpcResult?: unknown
} = {}) {
  const fromMock = vi.fn(() => createMockQueryBuilder(options.singleResult))
  const rpcMock = vi.fn(() => createMockQueryBuilder(options.rpcResult))

  const client = {
    from: fromMock,
    rpc: rpcMock,
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
    },
  } as unknown as SupabaseClient<Database> & {
    from: ReturnType<typeof vi.fn>
    rpc: ReturnType<typeof vi.fn>
  }

  return client
}

export function createMockQueryBuilder(result?: unknown) {
  return {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    and: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: result ?? null, error: null }),
    maybeSingle: vi.fn().mockResolvedValue({ data: result ?? null, error: null }),
  }
}
