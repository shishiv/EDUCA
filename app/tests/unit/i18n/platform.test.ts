import { createTranslator } from 'next-intl'
import { describe, expect, it } from 'vitest'
import { getMessagesForLocale } from '@/i18n/messages'
import { leafPaths } from './message-test-helpers'


describe('platform catalog', () => {
  it('keeps Portuguese and English platform keys in structural parity', () => {
    const pt = getMessagesForLocale('pt-BR').platform
    const en = getMessagesForLocale('en').platform
    expect(leafPaths(pt).sort()).toEqual(leafPaths(en).sort())
  })

  it('translates dashboard and report labels while keeping Portuguese default', () => {
    const pt = createTranslator({ locale: 'pt-BR', messages: getMessagesForLocale('pt-BR') })
    const en = createTranslator({ locale: 'en', messages: getMessagesForLocale('en') })
    expect(pt('platform.dashboard.title')).toBe('Dashboard')
    expect(en('platform.dashboard.averageAttendance')).toBe('Average attendance')
    expect(en('platform.reports.title')).toBe('Reports')
    expect(pt('platform.reports.title')).toBe('Relatórios')
  })
})
