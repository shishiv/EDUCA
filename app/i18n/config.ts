export const locales = ['pt-BR', 'en'] as const

export type AppLocale = (typeof locales)[number]

export const defaultLocale: AppLocale = 'pt-BR'
export const localeCookieName = 'EDUCA_LOCALE'
export const applicationTimeZone = 'America/Sao_Paulo'

export const localeCookieOptions = {
  path: '/',
  maxAge: 60 * 60 * 24 * 365,
  sameSite: 'lax' as const,
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
}

export function isAppLocale(value: unknown): value is AppLocale {
  return typeof value === 'string' && locales.includes(value as AppLocale)
}

/**
 * Resolve an explicitly persisted locale while keeping Portuguese as the
 * deterministic default. Browser language never changes the application
 * implicitly; English is opt-in through the locale selector.
 */
export function resolveLocale(value: unknown): AppLocale {
  return isAppLocale(value) ? value : defaultLocale
}
