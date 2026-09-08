import '@testing-library/jest-dom/vitest'

// Unit imports must never construct a client for a configured external project.
// Live suites retain their explicitly provisioned local stack environment.
if (process.env.EDUCA_LIVE_SUPABASE !== '1') {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://127.0.0.1:9'
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'synthetic-unit-anon-key'
}
