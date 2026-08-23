import { createTranslator } from 'next-intl'
import { describe, expect, it } from 'vitest'
import { getMessagesForLocale } from '@/i18n/messages'

describe('classroom catalog', () => {
  it('keeps the classroom catalog structurally identical across locales', () => {
    const paths = (value: unknown, prefix = ''): string[] => {
      if (!value || typeof value !== 'object' || Array.isArray(value)) return [prefix]
      return Object.entries(value as Record<string, unknown>).flatMap(([key, child]) =>
        paths(child, prefix ? `${prefix}.${key}` : key)
      )
    }
    expect(paths(getMessagesForLocale('pt-BR').classroom).sort()).toEqual(
      paths(getMessagesForLocale('en').classroom).sort()
    )
  })

  it.each(['pt-BR', 'en'] as const)('renders core classroom messages in %s', locale => {
    const t = createTranslator({
      locale,
      messages: getMessagesForLocale(locale) as never,
    }) as unknown as (key: string) => string
    expect(t('classroom.classes.title')).toBe(locale === 'en' ? 'Classes' : 'Turmas')
    expect(t('classroom.attendance.open')).toBe(locale === 'en' ? 'Open lesson' : 'Abrir Aula')
    expect(t('classroom.diary.title')).toBe(locale === 'en' ? 'Class diary' : 'Diário de Classe')
  })
})
