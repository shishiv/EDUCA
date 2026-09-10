import { describe, expect, it } from 'vitest'
import { createTranslator } from 'next-intl'
import { createRootMetadata } from '@/lib/root-metadata'
import { getMessagesForLocale } from '@/i18n/messages'

describe('root metadata', () => {
  it.each(['pt-BR', 'en'] as const)('declares the manifest and localized metadata in %s', (locale) => {
    const messages = getMessagesForLocale(locale)
    const t = createTranslator({ locale, messages, namespace: 'common.metadata' })
    const metadata = createRootMetadata({ title: t('title'), description: t('description') })
    expect(metadata.manifest).toBe('/site.webmanifest')
    expect(metadata.title).toBe(messages.common.metadata.title)
    expect(metadata.description).toBe(messages.common.metadata.description)
    expect(metadata.metadataBase).toEqual(new URL('https://geteduca.vercel.app'))
  })
})
