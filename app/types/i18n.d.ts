import type { AppLocale } from '@/i18n/config'
import type { formats } from '@/i18n/formats'
import auth from '@/messages/pt-BR/auth.json'
import classroom from '@/messages/pt-BR/classroom.json'
import common from '@/messages/pt-BR/common.json'
import layout from '@/messages/pt-BR/layout.json'
import platform from '@/messages/pt-BR/platform.json'
import publicMessages from '@/messages/pt-BR/public.json'
import registry from '@/messages/pt-BR/registry.json'

type Messages = {
  common: typeof common
  auth: typeof auth
  public: typeof publicMessages
  layout: typeof layout
  registry: typeof registry
  classroom: typeof classroom
  platform: typeof platform
}

declare module 'next-intl' {
  interface AppConfig {
    Locale: AppLocale
    Messages: Messages
    Formats: typeof formats
  }
}
