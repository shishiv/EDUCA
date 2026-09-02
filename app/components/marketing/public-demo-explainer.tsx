'use client'

import Link from 'next/link'
import { ArrowRight, ShieldCheck } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { PublicHeader } from '@/components/marketing/public-header'

export function PublicDemoExplainer() {
  const t = useTranslations('public.demo')

  return (
    <div className="public-demo">
      <PublicHeader />

      <main className="public-demo__main">
        <p className="public-demo__eyebrow"><ShieldCheck aria-hidden="true" size={17} /> {t('eyebrow')}</p>
        <h1>{t('title')}</h1>
        <p className="public-demo__intro">{t('intro')}</p>
        <ul className="public-demo__facts">
          <li>{t('facts.synthetic')}</li>
          <li>{t('facts.noRealPeople')}</li>
          <li>{t('facts.sharedEnvironment')}</li>
          <li>{t('facts.blockedEffects')}</li>
          <li>{t('facts.reset')}</li>
          <li>{t('facts.noRealData')}</li>
        </ul>
        <div className="public-demo__actions">
          <Link className="landing-button public-demo__primary" href="/login">
            {t('login')} <ArrowRight aria-hidden="true" size={17} />
          </Link>
        </div>
      </main>
    </div>
  )
}