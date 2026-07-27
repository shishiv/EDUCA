import { createClient } from '@supabase/supabase-js'

/** Creates the server-only Supabase service-role client without user cookies. */
export function createServiceRoleClient() {
  if (typeof window !== 'undefined') {
    throw new Error('SERVICE_ROLE_SERVER_ONLY: service-role client cannot run in a browser')
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    throw new Error('SERVICE_ROLE_CONFIG_MISSING: server Supabase credentials are required')
  }

  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  })
}
