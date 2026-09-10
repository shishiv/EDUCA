import type { AppMessages } from './messages'
import type { AppLocale } from './config'

declare module 'next-intl' {
  interface AppConfig {
    Locale: AppLocale
    Messages: AppMessages
  }
}
