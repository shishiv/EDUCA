import { createTranslator } from 'next-intl'
import { describe, expect, it } from 'vitest'
import {
  defaultLocale,
  isAppLocale,
  localeCookieName,
  localeCookieOptions,
  resolveLocale,
} from '@/i18n/config'
import { formatDateForLocale, formatNumberForLocale } from '@/i18n/formats'
import { getMessagesForLocale } from '@/i18n/messages'

function leafPaths(value: unknown, prefix = ''): string[] {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return [prefix]
  }

  return Object.entries(value as Record<string, unknown>).flatMap(([key, child]) =>
    leafPaths(child, prefix ? `${prefix}.${key}` : key)
  )
}

function messageAt(messages: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((value, key) => {
    if (!value || typeof value !== 'object') return undefined
    return (value as Record<string, unknown>)[key]
  }, messages)
}

describe('i18n foundation', () => {
  it('keeps pt-BR as the deterministic default and only accepts allowlisted locales', () => {
    expect(defaultLocale).toBe('pt-BR')
    expect(isAppLocale('pt-BR')).toBe(true)
    expect(isAppLocale('en')).toBe(true)
    expect(isAppLocale('en-US')).toBe(false)
    expect(resolveLocale(undefined)).toBe('pt-BR')
    expect(resolveLocale('fr')).toBe('pt-BR')
    expect(resolveLocale('en')).toBe('en')
  })

  it('persists the locale in a bounded same-site cookie without changing URLs', () => {
    expect(localeCookieName).toBe('EDUCA_LOCALE')
    expect(localeCookieOptions).toMatchObject({
      path: '/',
      maxAge: 31_536_000,
      sameSite: 'lax',
      httpOnly: true,
    })
  })

  it('keeps Portuguese and English catalog structures in parity', () => {
    const portuguese = getMessagesForLocale('pt-BR')
    const english = getMessagesForLocale('en')

    expect(leafPaths(english).sort()).toEqual(leafPaths(portuguese).sort())
    expect(portuguese.registry).toEqual({})
    expect(portuguese.classroom).toEqual({})
    expect(portuguese.platform).toEqual({})
  })

  it('provides translated auth and public messages in both locales', () => {
    const portuguese = getMessagesForLocale('pt-BR')
    const english = getMessagesForLocale('en')

    expect(messageAt(portuguese, 'auth.login.title')).toBe('Entrar no sistema')
    expect(messageAt(english, 'auth.login.title')).toBe('Sign in')
    expect(messageAt(portuguese, 'public.offline.title')).toBe('Você está offline')
    expect(messageAt(english, 'public.offline.title')).toBe('You are offline')
  })

  it.each(['pt-BR', 'en'] as const)('compiles rich text and plural ICU messages for %s', locale => {
    const translate = createTranslator({
      locale,
      messages: getMessagesForLocale(locale) as never,
    }) as unknown as {
      (key: string, values?: Record<string, unknown>): string
      rich(key: string, values: Record<string, unknown>): unknown
    }

    expect(() => translate('layout.mobileHeader.offlineMessage', { pending: 2 })).not.toThrow()
    expect(() =>
      translate.rich('public.privacy.demo.paragraph1', {
        strong: (chunks: unknown) => chunks,
      })
    ).not.toThrow()
  })

  it('formats dates and numbers according to locale in the municipal timezone', () => {
    const value = new Date('2026-01-15T12:00:00.000Z')

    expect(formatDateForLocale(value, 'pt-BR')).toBe('15/01/2026')
    expect(formatDateForLocale(value, 'en')).toBe('01/15/2026')
    expect(formatNumberForLocale(1234.5, 'pt-BR')).toBe('1.234,5')
    expect(formatNumberForLocale(1234.5, 'en')).toBe('1,234.5')
  })
})
