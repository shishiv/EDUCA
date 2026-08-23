'use client'

import { useTranslations } from 'next-intl'
import ptBrMessages from '@/messages/pt-BR/classroom.json'

type Translator = (key: string, values?: Record<string, unknown>) => string

function fallbackTranslate(key: string): string {
  const value = key.split('.').reduce<unknown>((current, part) => {
    if (!current || typeof current !== 'object') return undefined
    return (current as Record<string, unknown>)[part]
  }, ptBrMessages)
  return typeof value === 'string' ? value : key
}

/** Keeps isolated component consumers usable without a provider. */
export function useClassroomTranslations(): Translator {
  try {
    return useTranslations('classroom') as Translator
  } catch {
    return fallbackTranslate
  }
}
