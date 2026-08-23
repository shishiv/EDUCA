import { cookies } from 'next/headers'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { setUserLocale } from '@/i18n/actions'
import { localeCookieName, localeCookieOptions, type AppLocale } from '@/i18n/config'

describe('setUserLocale', () => {
  const set = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(cookies).mockResolvedValue({ set } as never)
  })

  it('writes an allowlisted locale with the shared cookie policy', async () => {
    await setUserLocale('en')

    expect(set).toHaveBeenCalledWith(localeCookieName, 'en', localeCookieOptions)
  })

  it('rejects unsupported values before writing a cookie', async () => {
    await expect(setUserLocale('fr' as AppLocale)).rejects.toThrow('UNSUPPORTED_LOCALE')
    expect(set).not.toHaveBeenCalled()
  })
})
