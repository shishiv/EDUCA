'use server'

import { cookies } from 'next/headers'
import { persistUserLocale } from './locale-persistence'

export async function setUserLocale(locale: string): Promise<void> {
  const cookieStore = await cookies()
  persistUserLocale(locale, cookieStore)
}
