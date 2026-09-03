'use client'

import { useTranslations } from 'next-intl'
import { AcademicYearSettings } from '@/components/settings/academic-year-settings'
import { MunicipalSettings } from '@/components/settings/municipal-settings'
import { useAuth } from '@/hooks/use-auth'

export default function ConfiguracoesPage() {
  const t = useTranslations('platform.settings')
  const { userProfile } = useAuth()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">{t('title')}</h1>
        <p className="mt-1 text-gray-600">{t('subtitle')}</p>
      </div>
      <MunicipalSettings />
      {userProfile?.tipo_usuario === 'diretor' && <AcademicYearSettings />}
    </div>
  )
}
