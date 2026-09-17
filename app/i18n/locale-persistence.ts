import {
  isAppLocale,
  localeCookieName,
  localeCookieOptions,
  type AppLocale,
} from './config'

export interface LocaleCookieStore {
  set(name: string, value: AppLocale, options: typeof localeCookieOptions): void
}

export function persistUserLocale(locale: string, cookieStore: LocaleCookieStore): void {
  if (!isAppLocale(locale)) {
    throw new Error('UNSUPPORTED_LOCALE')
  }

  cookieStore.set(localeCookieName, locale, localeCookieOptions)
}
