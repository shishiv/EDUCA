'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { BookOpenText, CalendarDays, FileWarning, ArrowRight } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/hooks/use-auth'
import { canAccessRoute } from '@/lib/route-policy'

const reportDestinations = [
  {
    href: '/relatorios/frequencia',
    title: 'Frequência',
    description: 'Acompanhe a presença por turma e período.',
    icon: CalendarDays,
  },
  {
    href: '/relatorios/conteudo',
    title: 'Conteúdo',
    description: 'Consulte os conteúdos registrados nas aulas.',
    icon: BookOpenText,
  },
  {
    href: '/relatorios/bolsa-familia',
    title: 'Bolsa Família',
    description: 'Monitore as condicionalidades de frequência.',
    icon: FileWarning,
  },
] as const

export default function RelatoriosPage() {
  const t = useTranslations('platform')
  const { userProfile } = useAuth()
  const role = userProfile?.tipo_usuario
  const visibleDestinations = reportDestinations.filter((report) => canAccessRoute(report.href, role))

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold text-gray-900">{t('reports.title')}</h1>
        <p className="mt-1 text-gray-600">{t('reports.subtitle')}</p>
      </header>

      <section aria-label={t('reports.title')} className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {visibleDestinations.map(({ href, title, description, icon: Icon }) => (
          <Link key={href} href={href} className="group">
            <Card className="h-full transition-shadow group-hover:shadow-md">
              <CardHeader>
                <Icon className="h-6 w-6 text-blue-600" aria-hidden="true" />
                <CardTitle>{title}</CardTitle>
                <CardDescription>{description}</CardDescription>
              </CardHeader>
              <CardContent className="flex items-center gap-2 text-sm font-medium text-blue-700">
                Acessar relatório <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </CardContent>
            </Card>
          </Link>
        ))}
      </section>
    </div>
  )
}
