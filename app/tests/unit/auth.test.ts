import { beforeEach, describe, expect, it, vi } from 'vitest'
import { signIn } from '@/lib/auth'

const { signInWithPasswordMock } = vi.hoisted(() => ({
  signInWithPasswordMock: vi.fn(),
}))

vi.mock('@/lib/supabase', () => ({
  supabase: { auth: { signInWithPassword: signInWithPasswordMock } },
}))
vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), info: vi.fn() },
}))

describe('signIn', () => {
  beforeEach(() => {
    signInWithPasswordMock.mockReset()
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500 }))
  })

  it('keeps a successful login successful when best-effort audit recording fails', async () => {
    const data = { user: { id: 'user-1' }, session: { access_token: 'token' } }
    signInWithPasswordMock.mockResolvedValue({ data, error: null })

    await expect(signIn('director@example.com', 'password')).resolves.toBe(data)
    const [, init] = vi.mocked(fetch).mock.calls[0]
    expect(JSON.parse(String(init?.body))).not.toHaveProperty('schoolId')
  })
})
