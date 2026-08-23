import { cookies } from 'next/headers'
import { getRequestConfig } from 'next-intl/server'
import { applicationTimeZone, localeCookieName, resolveLocale } from './config'
import { formats } from './formats'
import { getMessagesForLocale } from './messages'

export default getRequestConfig(async () => {
  const cookieStore = await cookies()
  const locale = resolveLocale(cookieStore.get(localeCookieName)?.value)

  return {
    locale,
    messages: getMessagesForLocale(locale),
    timeZone: applicationTimeZone,
    formats,
  }
})
