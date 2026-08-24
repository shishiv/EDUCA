'use client'

import { useCallback, useEffect, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import Link from 'next/link'
import {
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  GraduationCap,
  UserCheck,
  Users,
} from 'lucide-react'
import { AlertasCard } from '@/components/dashboard/alertas-card'
import { TeacherDashboardEnhanced } from '@/components/dashboard/teacher-dashboard-enhanced'
import { useAuth } from '@/hooks/use-auth'
import { CONFORMIDADE } from '@/lib/attendance/attendance-policy'
import { dashboardStatsApi } from '@/lib/api/dashboard-stats'
import {
  quickAccessItems,
  resolveVisibleQuickAccess,
  type QuickAccessRole,
} from '@/lib/dashboard/quick-access'
import { isDemoSandboxEnabled } from '@/lib/demo-sandbox/demo-sandbox'
import { logger } from '@/lib/logger'
import { canManagePilotSchool, isPilotModeEnabled } from '@/lib/pilot/pilot-scope'
import { supabase } from '@/lib/supabase'

interface DashboardStats {
  totalAlunos: number
  totalEscolas: number
  totalTurmas: number
  totalProfessores: number
  frequenciaMedia: number
}

interface Turma {
  id: string
  nome: string
  serie: string
  turno: string
  alunosCount: number
}

function getSerieTone(serie: string) {
  const normalized = serie.toLowerCase()
  if (normalized.includes('infantil')) return 'infantil'
  if (normalized.includes('fundamental i') || normalized.includes('fundamental 1')) return 'fundamental-one'
  if (normalized.includes('fundamental ii') || normalized.includes('fundamental 2')) return 'fundamental-two'
  return 'default'
}

function DashboardSkeleton() {
  const t = useTranslations('layout.dashboard')
  return (
    <div className="app-dashboard app-dashboard-skeleton" aria-busy="true" aria-label={t('loading')}>
      <div className="app-skeleton h-20 w-full" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[0, 1, 2, 3].map(item => <div key={item} className="app-skeleton h-28" />)}
      </div>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(280px,.8fr)]">
        <div className="app-skeleton h-80" />
        <div className="app-skeleton h-80" />
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const t = useTranslations('platform.dashboard')
  const locale = useLocale()
  const { userProfile } = useAuth()
  const userRole = userProfile?.tipo_usuario
  const [stats, setStats] = useState<DashboardStats>({
    totalAlunos: 0,
    totalEscolas: 0,
    totalTurmas: 0,
    totalProfessores: 0,
    frequenciaMedia: 0,
  })
  const [loading, setLoading] = useState(true)
  const [turmas, setTurmas] = useState<Turma[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)

  const loadDashboardData = useCallback(async () => {
    try {
      setLoading(true)
      setLoadError(null)

      const [apiStats, turmasResult] = await Promise.all([
        dashboardStatsApi.getStats(),
        supabase
          .from('turmas')
          .select('id, nome, serie, turno')
          .eq('ativo', true)
          .order('nome')
          .limit(5),
      ])

      setStats({
        totalAlunos: apiStats.totalAlunos,
        totalEscolas: apiStats.totalEscolas,
        totalTurmas: apiStats.totalTurmas,
        totalProfessores: apiStats.totalProfessores,
        frequenciaMedia: apiStats.frequenciaGeral,
      })

      if (turmasResult.error) throw turmasResult.error

      const turmaRows = turmasResult.data ?? []
      const turmaIds = turmaRows.map(turma => turma.id)
      let matriculasData: Array<{ turma_id: string }> = []

      if (turmaIds.length > 0) {
        const { data, error } = await supabase
          .from('matriculas')
          .select('turma_id')
          .in('turma_id', turmaIds)
          .eq('situacao', 'ativa')

        if (error) throw error
        matriculasData = data ?? []
      }

      const matriculasPorTurma = new Map<string, number>()
      for (const matricula of matriculasData) {
        matriculasPorTurma.set(
          matricula.turma_id,
          (matriculasPorTurma.get(matricula.turma_id) ?? 0) + 1
        )
      }

      setTurmas(turmaRows.map(turma => ({
        id: turma.id,
        nome: turma.nome,
        serie: turma.serie,
        turno: turma.turno,
        alunosCount: matriculasPorTurma.get(turma.id) ?? 0,
      })))
    } catch (error) {
      logger.error('DASHBOARD_DATA_LOAD_FAILED', error as Error, {
        feature: 'dashboard',
        action: 'load_dashboard_data',
      })
      setLoadError(t('loadError'))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    if (!userRole) return
    if (userRole === 'professor') {
      setLoading(false)
      return
    }

    void loadDashboardData()
  }, [loadDashboardData, userRole])

  if (loading) return <DashboardSkeleton />

  if (userProfile?.tipo_usuario === 'professor') {
    return <TeacherDashboardEnhanced professorId={userProfile.id} />
  }

  if (loadError) {
    return (
      <section className="app-dashboard-error" role="alert">
        <AlertTriangle aria-hidden="true" />
        <div>
          <h1>{t('errorTitle')}</h1>
          <p>{loadError} {t('errorHelp')}</p>
          <button type="button" onClick={() => void loadDashboardData()}>{t('retry')}</button>
        </div>
      </section>
    )
  }

  const pilotMode = isPilotModeEnabled()
  const demoSandbox = isDemoSandboxEnabled()
  const canManageSchool = !pilotMode || canManagePilotSchool(userProfile)
  const visibleQuickAccess = resolveVisibleQuickAccess(quickAccessItems, {
    role: (userProfile?.tipo_usuario as QuickAccessRole) ?? null,
    pilotMode,
    canManageSchool,
    demoSandbox,
  })
  const frequencyIsConformant = stats.frequenciaMedia >= CONFORMIDADE
  const formattedDate = new Intl.DateTimeFormat(locale, {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
  }).format(new Date())
  const number = new Intl.NumberFormat(locale)

  const metricItems = [
    {
      label: t('averageAttendance'),
      value: `${stats.frequenciaMedia}%`,
      detail: frequencyIsConformant ? t('compliant') : t('attention'),
      icon: frequencyIsConformant ? CheckCircle2 : AlertTriangle,
      tone: frequencyIsConformant ? 'teal' : 'warning',
    },
    { label: t('totalStudents'), value: number.format(stats.totalAlunos), detail: t('students'), icon: Users, tone: 'paper' },
    { label: t('activeClasses'), value: number.format(stats.totalTurmas), detail: t('activeClassesDescription'), icon: GraduationCap, tone: 'lime' },
    { label: t('activeTeachers'), value: number.format(stats.totalProfessores), detail: t('activeTeachers'), icon: UserCheck, tone: 'ink' },
  ] as const

  return (
    <div className="app-dashboard">
      <header className="app-dashboard__intro">
        <div>
          <h1>{t(`greeting.${new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'}`)}, {userProfile?.nome?.split(' ')[0] || t('user')}.</h1>
          <p>{t('subtitle')}</p>
        </div>
        <div className="app-dashboard__date">
          <CalendarDays aria-hidden="true" />
          <span>{t('today')}</span>
          <time dateTime={new Date().toISOString().slice(0, 10)}>{formattedDate}</time>
        </div>
      </header>

      <section className="app-dashboard__overview" aria-labelledby="network-overview-title">
        <div className="app-section-heading">
          <div>
            <h2 id="network-overview-title">{t('title')}</h2>
            <p>{t('subtitle')}</p>
          </div>
          <span>{t('activeSchools', { count: stats.totalEscolas })}</span>
        </div>

        <div className="app-metric-grid">
          {metricItems.map(({ label, value, detail, icon: Icon, tone }) => (
            <article className="app-metric" data-tone={tone} key={label}>
              <div className="app-metric__label">
                <span>{label}</span>
                <Icon aria-hidden="true" />
              </div>
              <strong className="text-3xl tabular-nums">{value}</strong>
              <small>{detail}</small>
            </article>
          ))}
        </div>
      </section>

      {visibleQuickAccess.length > 0 && (
        <section className="app-dashboard__routines" aria-labelledby="quick-access-title">
          <div className="app-section-heading app-section-heading--compact">
            <div>
              <h2 id="quick-access-title">{t('routines')}</h2>
              <p>{t('routinesDescription')}</p>
            </div>
          </div>
          <nav className="app-quick-actions" aria-label={t('quickAccess')}>
            {visibleQuickAccess.map(item => {
              const Icon = item.icon
              return (
                <Link key={item.name} href={item.href} className="app-quick-action">
                  <Icon aria-hidden="true" />
                  <span>{t(`quick.${item.labelKey}`)}</span>
                  <ArrowRight aria-hidden="true" />
                </Link>
              )
            })}
          </nav>
        </section>
      )}

      <div className="app-dashboard__work-grid">
        <section className="app-panel" aria-labelledby="classes-title">
          <header className="app-panel__header">
            <div>
              <h2 id="classes-title">{t('myClasses')}</h2>
              <p>{t('activeClassesDescription')}</p>
            </div>
            <Link href="/dashboard/turmas" className="app-text-link">
              {t('viewAllClasses')} <ArrowRight aria-hidden="true" />
            </Link>
          </header>

          {turmas.length === 0 ? (
            <div className="app-empty-state" role="status">
              <GraduationCap aria-hidden="true" />
              <div>
                <strong>{t('noClasses')}</strong>
              </div>
            </div>
          ) : (
            <ul className="app-class-list">
              {turmas.map(turma => (
                <li key={turma.id}>
                  <Link href={`/dashboard/turmas/${turma.id}`} className="app-class-row">
                    <span className="app-class-row__marker" data-tone={getSerieTone(turma.serie)} aria-hidden="true" />
                    <span className="app-class-row__copy">
                      <strong>{turma.nome}</strong>
                      <small>{turma.serie} · {turma.turno}</small>
                    </span>
                    <span className="app-class-row__count">
                      <strong className="tabular-nums">{number.format(turma.alunosCount)}</strong>
                      <small>{t('students')}</small>
                    </span>
                    <ArrowRight aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <AlertasCard />
      </div>
    </div>
  )
}
