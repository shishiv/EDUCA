import { createTranslator } from 'next-intl'
import { describe, expect, it } from 'vitest'
import { getMessagesForLocale } from '@/i18n/messages'

function leafPaths(value: unknown, prefix = ''): string[] {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return [prefix]
  return Object.entries(value as Record<string, unknown>).flatMap(([key, child]) =>
    leafPaths(child, prefix ? `${prefix}.${key}` : key),
  )
}

describe('registry catalog', () => {
  it('keeps every registry message available in Portuguese and English', () => {
    const portuguese = getMessagesForLocale('pt-BR').registry
    const english = getMessagesForLocale('en').registry

    expect(leafPaths(portuguese).sort()).toEqual(leafPaths(english).sort())
    expect(Object.keys(portuguese as object)).not.toHaveLength(0)
  })

  it.each(['pt-BR', 'en'] as const)('translates registry labels for %s', locale => {
    const translate = createTranslator({
      locale,
      messages: getMessagesForLocale(locale) as never,
    }) as unknown as (key: string) => string

    expect(translate('registry.labels.responsaveis')).toBe(locale === 'en' ? 'Guardians' : 'Responsáveis')
    expect(translate('registry.labels.novo-usuario')).toBe(locale === 'en' ? 'New User' : 'Novo Usuário')
  })
})
