import { createClient } from '@supabase/supabase-js'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getCurrentUser, signIn } from '@/lib/auth'
import type { Database } from '@/types/database'

const authUser = {
  id: 'user-1',
  aud: 'authenticated',
  role: 'authenticated',
  email: 'director@example.com',
  email_confirmed_at: '2026-09-08T12:00:00.000Z',
  phone: '',
  confirmed_at: '2026-09-08T12:00:00.000Z',
  last_sign_in_at: '2026-09-08T12:00:00.000Z',
  app_metadata: { provider: 'email', providers: ['email'] },
  user_metadata: { nome: 'Diretora Teste' },
  identities: [],
  created_at: '2026-09-08T12:00:00.000Z',
  updated_at: '2026-09-08T12:00:00.000Z',
  is_anonymous: false,
}

function createAuthClient(
  userMetadata: Record<string, string | number> = authUser.user_metadata,
  signInFails = false,
) {
  return createClient<Database>('http://127.0.0.1:54321', 'synthetic-anon-key', {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      fetch: async (input, init) => {
        const request = new Request(input, init)
        const pathname = new URL(request.url).pathname
        if (pathname === '/auth/v1/user') return Response.json({ ...authUser, user_metadata: userMetadata })
        expect(pathname).toBe('/auth/v1/token')
        expect(await request.json()).toMatchObject({ email: 'director@example.com', password: 'password' })
        if (signInFails) return Response.json({ message: 'Invalid login credentials' }, { status: 400 })
        return Response.json({
          access_token: 'token',
          token_type: 'bearer',
          expires_in: 3600,
          refresh_token: 'refresh-token',
          user: { ...authUser, user_metadata: userMetadata },
        })
      },
    },
  })
}

describe('signIn', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500 }))
  })

  it('keeps a successful login successful when best-effort audit recording fails', async () => {
    const result = await signIn('director@example.com', 'password', createAuthClient())

    expect(result.user?.id).toBe('user-1')
    expect(result.session?.access_token).toBe('token')
    const [, init] = vi.mocked(fetch).mock.calls[0]
    expect(JSON.parse(String(init?.body))).not.toHaveProperty('schoolId')
  })

  it('does not attempt a protected audit for a failed unauthenticated login', async () => {
    await expect(signIn('director@example.com', 'password', createAuthClient(authUser.user_metadata, true))).rejects.toThrow()

    expect(fetch).not.toHaveBeenCalled()
  })

  it('validates display metadata returned by Supabase', async () => {
    const client = createAuthClient()
    await signIn('director@example.com', 'password', client)

    await expect(getCurrentUser(client)).resolves.toMatchObject({
      id: 'user-1',
      user_metadata: { nome: 'Diretora Teste' },
    })
  })

  it('rejects invalid display metadata returned by Supabase', async () => {
    const client = createAuthClient({ nome: 42 })
    await signIn('director@example.com', 'password', client)

    await expect(getCurrentUser(client)).rejects.toThrow()
  })
})
