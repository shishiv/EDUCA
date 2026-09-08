import { NextRequest } from 'next/server'
import { describe, expect, it } from 'vitest'

import { config, proxy } from '@/proxy'

describe('Next.js 16 proxy contract', () => {
  it('executes the real auth boundary for an API request', async () => {
    const previousUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const previousKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://127.0.0.1:54321'
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'synthetic-anon-key'

    try {
      const response = await proxy(new NextRequest('http://test.local/api/health'))

      expect(response.status).toBe(200)
    } finally {
      if (previousUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL
      else process.env.NEXT_PUBLIC_SUPABASE_URL = previousUrl
      if (previousKey === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      else process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = previousKey
    }
  })

  it('retains the existing broad matcher', () => {
    expect(config.matcher).toEqual([
      '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ])
  })
})
