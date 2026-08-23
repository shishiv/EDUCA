import type { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  authMiddleware: vi.fn(),
}))

vi.mock('@/lib/middleware/auth-middleware', () => ({
  authMiddleware: mocks.authMiddleware,
}))

import { config, proxy } from '@/proxy'

describe('Next.js 16 proxy contract', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('delegates the unchanged request to the auth and Pilot Gate boundary', async () => {
    const request = { nextUrl: { pathname: '/dashboard' } } as NextRequest
    const expectedResponse = new Response(null, { status: 204 })
    mocks.authMiddleware.mockResolvedValue(expectedResponse)

    await expect(proxy(request)).resolves.toBe(expectedResponse)
    expect(mocks.authMiddleware).toHaveBeenCalledOnce()
    expect(mocks.authMiddleware).toHaveBeenCalledWith(request)
  })

  it('retains the existing broad matcher', () => {
    expect(config.matcher).toEqual([
      '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ])
  })
})
