'use client'

import { createTranslator, useTranslations } from 'next-intl'
import ptBrMessages from '@/messages/pt-BR/classroom.json'

type Translator = (key: string, values?: Record<string, unknown>) => string

const fallbackTranslate = createTranslator({
  locale: 'pt-BR',
  messages: ptBrMessages,
}) as Translator

/** Keeps isolated component consumers usable without a provider. */
export function useClassroomTranslations(): Translator {
  try {
    return useTranslations('classroom') as Translator
  } catch {
    return fallbackTranslate
  }
}
