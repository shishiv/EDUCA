'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Home, ArrowLeft, FileQuestion, GraduationCap } from 'lucide-react'
import { useTranslations } from 'next-intl'

export default function NotFound() {
  const t = useTranslations('public.notFound')

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 flex items-center justify-center px-4">
      <Card className="w-full max-w-2xl shadow-xl">
        <CardHeader className="text-center space-y-6">
          <div className="mx-auto h-24 w-24 bg-red-100 rounded-full flex items-center justify-center">
            <FileQuestion className="h-12 w-12 text-red-600" />
          </div>
          <div>
            <CardTitle className="text-4xl font-bold text-gray-900 mb-2">404</CardTitle>
            <CardDescription className="text-xl text-gray-600">
              {t('subtitle')}
            </CardDescription>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <div className="text-center space-y-4">
            <p className="text-gray-600">
              {t('description')}
            </p>
            <p className="text-sm text-gray-500">
              {t('hint')}
            </p>
          </div>

          {/* Ações Rápidas */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Button asChild className="h-12">
              <Link href="/dashboard">
                <Home className="h-4 w-4 mr-2" />
                {t('dashboardAction')}
              </Link>
            </Button>
            <Button variant="outline" onClick={() => window.history.back()} className="h-12">
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t('backAction')}
            </Button>
          </div>

          {/* Links Úteis */}
          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <GraduationCap className="h-5 w-5 mr-2" />
              {t('mainPages')}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Link href="/dashboard/alunos" className="flex items-center p-3 rounded-lg border hover:bg-gray-50 transition-colors">
                <div className="text-sm">
                  <div className="font-medium text-gray-900">{t('links.students')}</div>
                  <div className="text-gray-500">{t('links.studentsDescription')}</div>
                </div>
              </Link>
              <Link href="/dashboard/usuarios" className="flex items-center p-3 rounded-lg border hover:bg-gray-50 transition-colors">
                <div className="text-sm">
                  <div className="font-medium text-gray-900">{t('links.users')}</div>
                  <div className="text-gray-500">{t('links.usersDescription')}</div>
                </div>
              </Link>
              <Link href="/dashboard/escolas" className="flex items-center p-3 rounded-lg border hover:bg-gray-50 transition-colors">
                <div className="text-sm">
                  <div className="font-medium text-gray-900">{t('links.schools')}</div>
                  <div className="text-gray-500">{t('links.schoolsDescription')}</div>
                </div>
              </Link>
              <Link href="/dashboard/turmas" className="flex items-center p-3 rounded-lg border hover:bg-gray-50 transition-colors">
                <div className="text-sm">
                  <div className="font-medium text-gray-900">{t('links.classes')}</div>
                  <div className="text-gray-500">{t('links.classesDescription')}</div>
                </div>
              </Link>
              <Link href="/dashboard/matriculas" className="flex items-center p-3 rounded-lg border hover:bg-gray-50 transition-colors">
                <div className="text-sm">
                  <div className="font-medium text-gray-900">{t('links.enrolments')}</div>
                  <div className="text-gray-500">{t('links.enrolmentsDescription')}</div>
                </div>
              </Link>
              <Link href="/dashboard/relatorios" className="flex items-center p-3 rounded-lg border hover:bg-gray-50 transition-colors">
                <div className="text-sm">
                  <div className="font-medium text-gray-900">{t('links.reports')}</div>
                  <div className="text-gray-500">{t('links.reportsDescription')}</div>
                </div>
              </Link>
            </div>
          </div>

          {/* Informações de Contato */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">{t('helpTitle')}</h4>
            <p className="text-sm text-blue-700">
              {t('helpDescription')}
            </p>
            <p className="text-xs text-blue-600 mt-1">
              {t('helpContact')}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
