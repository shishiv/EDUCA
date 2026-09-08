import { createTranslator } from 'next-intl'
import { describe, expect, it } from 'vitest'
import { getMessagesForLocale } from '@/i18n/messages'
import { leafPaths } from './message-test-helpers'

const supportedLocales: Array<'pt-BR' | 'en'> = ['pt-BR', 'en']

describe('classroom catalog', () => {
  it('keeps the classroom catalog structurally identical across locales', () => {
    expect(leafPaths(getMessagesForLocale('pt-BR').classroom).sort()).toEqual(
      leafPaths(getMessagesForLocale('en').classroom).sort()
    )
  })

  it.each(supportedLocales)('renders core classroom messages in %s', locale => {
    const t = createTranslator({
      locale,
      messages: getMessagesForLocale(locale),
    })
    expect(t('classroom.classes.title')).toBe(locale === 'en' ? 'Classes' : 'Turmas')
    expect(t('classroom.attendance.open')).toBe(locale === 'en' ? 'Open lesson' : 'Abrir Aula')
    expect(t('classroom.diary.title')).toBe(locale === 'en' ? 'Class diary' : 'Diário de Classe')
  })
})
