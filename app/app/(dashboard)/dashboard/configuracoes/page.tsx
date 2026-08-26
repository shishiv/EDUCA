'use client'

import { useTranslations } from 'next-intl'
import { AcademicYearSettings } from '@/components/settings/academic-year-settings'

export default function ConfiguracoesPage() {
  const t = useTranslations('platform.settings')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">{t('title')}</h1>
        <p className="mt-1 text-gray-600">{t('subtitle')}</p>
      </div>
      <AcademicYearSettings />
    </div>
  )
}
