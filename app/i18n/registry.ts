'use client'

import { createTranslator, useTranslations } from 'next-intl'
import ptBrMessages from '@/messages/pt-BR/registry.json'

type Translator = (key: string, values?: Record<string, unknown>) => string

const fallbackTranslate = createTranslator({
  locale: 'pt-BR',
  messages: ptBrMessages,
}) as Translator

/** Keeps isolated registry component consumers usable without a provider. */
export function useRegistryTranslations(): Translator {
  try {
    return useTranslations('registry') as Translator
  } catch {
    return fallbackTranslate
  }
}
