import { beforeEach, describe, expect, it, vi } from 'vitest'
import { persistUserLocale } from '@/i18n/locale-persistence'
import { localeCookieName, localeCookieOptions } from '@/i18n/config'

describe('setUserLocale', () => {
  const set = vi.fn()

  beforeEach(() => {
    set.mockReset()
  })

  it('writes an allowlisted locale with the shared cookie policy', async () => {
    persistUserLocale('en', { set })

    expect(set).toHaveBeenCalledWith(localeCookieName, 'en', localeCookieOptions)
  })

  it('rejects unsupported values before writing a cookie', async () => {
    expect(() => persistUserLocale('fr', { set })).toThrow('UNSUPPORTED_LOCALE')
    expect(set).not.toHaveBeenCalled()
  })
})
