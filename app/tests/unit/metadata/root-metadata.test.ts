import { describe, expect, it, vi } from 'vitest'

vi.mock('next/font/google', () => ({
  Inter: () => ({ className: 'inter', variable: '--font-inter' }),
  Lexend: () => ({ className: 'lexend', variable: '--font-lexend' }),
}))

vi.mock('next-intl/server', () => ({
  getLocale: vi.fn(),
  getTranslations: vi.fn(async () => (key: string) => key),
}))

vi.mock('@/app/providers', () => ({ Providers: () => null }))

import { generateMetadata } from '@/app/layout'

describe('root metadata', () => {
  it('discovers the public web manifest', async () => {
    await expect(generateMetadata()).resolves.toMatchObject({ manifest: '/site.webmanifest' })
  })
})
