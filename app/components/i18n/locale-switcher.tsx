'use client'

import { Languages } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { startTransition, useEffect, useState } from 'react'
import { setUserLocale } from '@/i18n/actions'
import { isAppLocale } from '@/i18n/config'

export function LocaleSwitcher({ variant = 'app' }: { variant?: 'app' | 'public' }) {
  const locale = useLocale()
  const router = useRouter()
  const t = useTranslations('common.locale')
  const [selectedLocale, setSelectedLocale] = useState(locale)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState(false)

  useEffect(() => setSelectedLocale(locale), [locale])

  function changeLocale(value: string) {
    if (!isAppLocale(value) || value === locale) return

    setSelectedLocale(value)
    setPending(true)
    setError(false)
    startTransition(async () => {
      try {
        await setUserLocale(value)
        router.refresh()
      } catch {
        setSelectedLocale(locale)
        setError(true)
      } finally {
        setPending(false)
      }
    })
  }

  const variantClass = variant === 'public' ? 'locale-switcher--public' : 'locale-switcher--app'

  return (
    <div
      data-testid="locale-switcher"
      className={`locale-switcher ${variantClass}`}
    >
      <Languages className="h-4 w-4 text-gray-600" aria-hidden="true" />
      <label htmlFor="application-locale" className="sr-only">
        {t('label')}
      </label>
      <select
        id="application-locale"
        value={selectedLocale}
        onChange={event => changeLocale(event.target.value)}
        disabled={pending}
        aria-busy={pending}
        className="min-h-9 rounded-md border-0 bg-transparent px-1 text-sm font-medium text-gray-700 outline-none focus-visible:ring-2 focus-visible:ring-green-600 focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-60"
      >
        <option value="pt-BR">{t('portuguese')}</option>
        <option value="en">{t('english')}</option>
      </select>
      <span className="sr-only" role="status" aria-live="polite">
        {pending ? t('changing') : ''}
      </span>
      {error && (
        <span
          className="absolute bottom-full right-0 mb-2 w-64 rounded-md bg-red-50 px-3 py-2 text-xs text-red-700 shadow-sm"
          role="alert"
        >
          {t('error')}
        </span>
      )}
    </div>
  )
}
