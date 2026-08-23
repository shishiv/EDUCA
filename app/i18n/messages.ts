import type { AbstractIntlMessages } from 'next-intl'
import type { AppLocale } from './config'

import authEn from '@/messages/en/auth.json'
import classroomEn from '@/messages/en/classroom.json'
import commonEn from '@/messages/en/common.json'
import layoutEn from '@/messages/en/layout.json'
import platformEn from '@/messages/en/platform.json'
import publicEn from '@/messages/en/public.json'
import registryEn from '@/messages/en/registry.json'
import authPtBr from '@/messages/pt-BR/auth.json'
import classroomPtBr from '@/messages/pt-BR/classroom.json'
import commonPtBr from '@/messages/pt-BR/common.json'
import layoutPtBr from '@/messages/pt-BR/layout.json'
import platformPtBr from '@/messages/pt-BR/platform.json'
import publicPtBr from '@/messages/pt-BR/public.json'
import registryPtBr from '@/messages/pt-BR/registry.json'

const messagesByLocale = {
  'pt-BR': {
    common: commonPtBr,
    auth: authPtBr,
    public: publicPtBr,
    layout: layoutPtBr,
    registry: registryPtBr,
    classroom: classroomPtBr,
    platform: platformPtBr,
  },
  en: {
    common: commonEn,
    auth: authEn,
    public: publicEn,
    layout: layoutEn,
    registry: registryEn,
    classroom: classroomEn,
    platform: platformEn,
  },
} satisfies Record<AppLocale, AbstractIntlMessages>

export function getMessagesForLocale(locale: AppLocale): AbstractIntlMessages {
  return messagesByLocale[locale]
}
