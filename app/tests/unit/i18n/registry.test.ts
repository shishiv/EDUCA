import { createTranslator } from 'next-intl'
import { describe, expect, it } from 'vitest'
import { getMessagesForLocale } from '@/i18n/messages'
import { isMessageObject, leafPaths } from './message-test-helpers'

const supportedLocales: Array<'pt-BR' | 'en'> = ['pt-BR', 'en']

describe('registry catalog', () => {
  it('keeps every registry message available in Portuguese and English', () => {
    const portuguese = getMessagesForLocale('pt-BR').registry
    const english = getMessagesForLocale('en').registry

    expect(leafPaths(portuguese).sort()).toEqual(leafPaths(english).sort())
    expect(isMessageObject(portuguese) && Object.keys(portuguese)).not.toHaveLength(0)
  })

  it.each(supportedLocales)('translates registry labels for %s', locale => {
    const translate = createTranslator({
      locale,
      messages: getMessagesForLocale(locale),
    })

    expect(translate('registry.labels.responsaveis')).toBe(locale === 'en' ? 'Guardians' : 'Responsáveis')
    expect(translate('registry.labels.novo-usuario')).toBe(locale === 'en' ? 'New User' : 'Novo Usuário')
  })
})
