'use server'

import { cookies } from 'next/headers'
import {
  isAppLocale,
  localeCookieName,
  localeCookieOptions,
  type AppLocale,
} from './config'

export async function setUserLocale(locale: AppLocale): Promise<void> {
  if (!isAppLocale(locale)) {
    throw new Error('UNSUPPORTED_LOCALE')
  }

  const cookieStore = await cookies()
  cookieStore.set(localeCookieName, locale, localeCookieOptions)
}
