'use client'

import { createTranslator, useTranslations } from 'next-intl'
import { getMessagesForLocale } from './messages'

type Translator = ReturnType<typeof useTranslations<'classroom'>>

const fallbackTranslate: Translator = createTranslator({
  locale: 'pt-BR',
  messages: getMessagesForLocale('pt-BR'),
  namespace: 'classroom',
})

/** Keeps isolated component consumers usable without a provider. */
export function useClassroomTranslations(): Translator {
  try {
    return useTranslations('classroom')
  } catch {
    return fallbackTranslate
  }
}
