'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { BrandLogo } from '@/components/marketing/brand-logo'
import { LocaleSwitcher } from '@/components/i18n/locale-switcher'

export function PublicHeader() {
  const t = useTranslations('public.navigation')

  return (
    <header className="public-header">
      <div className="public-header__inner">
        <Link href="/" className="landing-wordmark" aria-label={t('home')}>
          <BrandLogo priority />
        </Link>
        <nav className="public-header__nav" aria-label={t('label')}>
          <Link href="/">{t('home')}</Link>
          <Link href="/demo">{t('demo')}</Link>
          <Link href="/blog">{t('blog')}</Link>
          <Link href="/login">{t('login')}</Link>
        </nav>
        <LocaleSwitcher variant="button" />
      </div>
    </header>
  )
}
