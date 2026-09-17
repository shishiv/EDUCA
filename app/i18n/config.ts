function defineLocales<const T extends readonly string[]>(...values: T): T {
  return values
}

function literal<T extends string>(value: T): T {
  return value
}

export const locales = defineLocales('pt-BR', 'en')

export type AppLocale = (typeof locales)[number]

export const defaultLocale: AppLocale = 'pt-BR'
export const localeCookieName = 'EDUCA_LOCALE'
export const applicationTimeZone = 'America/Sao_Paulo'

export const localeCookieOptions = {
  path: '/',
  maxAge: 60 * 60 * 24 * 365,
  sameSite: literal('lax'),
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
}

export function isAppLocale(value: string | undefined): value is AppLocale {
  if (value === undefined) return false
  return locales.some(locale => locale === value)
}

/**
 * Resolve an explicitly persisted locale while keeping Portuguese as the
 * deterministic default. Browser language never changes the application
 * implicitly; English is opt-in through the locale selector.
 */
export function resolveLocale(value: string | undefined): AppLocale {
  return isAppLocale(value) ? value : defaultLocale
}
