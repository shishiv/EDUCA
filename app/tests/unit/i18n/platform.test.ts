import { createTranslator } from 'next-intl'
import { describe, expect, it } from 'vitest'
import { getMessagesForLocale } from '@/i18n/messages'

function leafPaths(value: unknown, prefix = ''): string[] {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return [prefix]
  return Object.entries(value as Record<string, unknown>).flatMap(([key, child]) =>
    leafPaths(child, prefix ? `${prefix}.${key}` : key)
  )
}

describe('platform catalog', () => {
  it('keeps Portuguese and English platform keys in structural parity', () => {
    const pt = getMessagesForLocale('pt-BR').platform
    const en = getMessagesForLocale('en').platform
    expect(leafPaths(pt).sort()).toEqual(leafPaths(en).sort())
  })

  it('translates dashboard and report labels while keeping Portuguese default', () => {
    const pt = createTranslator({ locale: 'pt-BR', messages: getMessagesForLocale('pt-BR') as never }) as unknown as (key: string, values?: Record<string, unknown>) => string
    const en = createTranslator({ locale: 'en', messages: getMessagesForLocale('en') as never }) as unknown as (key: string, values?: Record<string, unknown>) => string
    expect(pt('platform.dashboard.title')).toBe('Dashboard')
    expect(en('platform.dashboard.averageAttendance')).toBe('Network average attendance')
    expect(en('platform.reports.title')).toBe('Reports')
    expect(pt('platform.reports.title')).toBe('Relatórios')
  })
})
