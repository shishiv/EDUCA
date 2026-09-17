'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useLocale, useTranslations } from 'next-intl'
import type { LucideIcon } from 'lucide-react'
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
import { EscolaRequiredState } from '@/components/ui/escola-required-state'
import { useEscola } from '@/contexts/escola-context'
import { useAuth } from '@/hooks/use-auth'
import { dashboardStatsApi } from '@/lib/api/dashboard-stats'
import { CONFORMIDADE } from '@/lib/attendance/attendance-policy'
import { getTodaySaoPaulo } from '@/lib/date-utils'
import {
  isQuickAccessRole,
  quickAccessItems,
  resolveVisibleQuickAccess,
} from '@/lib/dashboard/quick-access'
import { isDemoSandboxEnabled } from '@/lib/demo-sandbox/demo-sandbox'
import { logger } from '@/lib/logger'
import { canManagePilotSchool, isPilotModeEnabled } from '@/lib/pilot/pilot-scope'
import { createAcademicYearService, type ResolvedAcademicYear } from '@/lib/services/academic-year'
import { supabase } from '@/lib/supabase'
import type { UserProfile } from '@/lib/auth'

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

interface MetricItem {
  label: string
  value: string
  detail: string
  icon: LucideIcon
  tone: 'teal' | 'warning' | 'paper' | 'lime' | 'ink'
}

const academicYearService = createAcademicYearService(supabase)

function getSerieTone(serie: string) {
  const normalized = serie.toLowerCase()
  if (normalized.includes('infantil')) return 'infantil'
  if (normalized.includes('fundamental i') || normalized.includes('fundamental 1')) return 'fundamental-one'
  if (normalized.includes('fundamental ii') || normalized.includes('fundamental 2')) return 'fundamental-two'
  return 'default'
}

function getGreetingKey(hour: number): 'morning' | 'afternoon' | 'evening' {
  if (hour < 12) return 'morning'
  if (hour < 18) return 'afternoon'
  return 'evening'
}

async function loadClassSummaries(escolaId: string, academicYear: number): Promise<Turma[]> {
  const { data: turmaRows, error: turmasError } = await supabase
    .from('turmas')
    .select('id, nome, serie, turno')
    .eq('escola_id', escolaId)
    .eq('ano_letivo', academicYear)
    .eq('ativo', true)
    .order('nome')
    .limit(5)

  if (turmasError) throw turmasError

  const classes = turmaRows ?? []
  const classIds = classes.map((turma) => turma.id)
  if (classIds.length === 0) {
    return classes.map((turma) => ({ ...turma, alunosCount: 0 }))
  }

  const { data: matriculasData, error: matriculasError } = await supabase
    .from('matriculas')
    .select('turma_id')
    .in('turma_id', classIds)
    .eq('ano_letivo', academicYear)
    .eq('situacao', 'ativa')

  if (matriculasError) throw matriculasError

  const enrollmentsByClass = new Map<string, number>()
  for (const matricula of matriculasData ?? []) {
    enrollmentsByClass.set(
      matricula.turma_id,
      (enrollmentsByClass.get(matricula.turma_id) ?? 0) + 1,
    )
  }

  return classes.map((turma) => ({
    ...turma,
    alunosCount: enrollmentsByClass.get(turma.id) ?? 0,
  }))
}

function DashboardSkeleton() {
  const t = useTranslations('layout.dashboard')
  return (
    <div className="app-dashboard app-dashboard-skeleton" aria-busy="true" aria-label={t('loading')}>
      <div className="app-skeleton h-20 w-full" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[0, 1, 2, 3].map((item) => <div key={item} className="app-skeleton h-28" />)}
      </div>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(280px,.8fr)]">
        <div className="app-skeleton h-80" />
        <div className="app-skeleton h-80" />
      </div>
    </div>
  )
}

function useDashboardData({
  escolaId,
  escolaLoading,
  userRole,
}: {
  escolaId: string | null
  escolaLoading: boolean
  userRole: UserProfile['tipo_usuario'] | undefined
}) {
  const t = useTranslations('platform.dashboard')
  const [stats, setStats] = useState<DashboardStats>({
    totalAlunos: 0,
    totalEscolas: 0,
    totalTurmas: 0,
    totalProfessores: 0,
    frequenciaMedia: 0,
  })
  const [loading, setLoading] = useState(true)
  const [turmas, setTurmas] = useState<Turma[]>([])
  const [academicYear, setAcademicYear] = useState<ResolvedAcademicYear | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  const loadDashboardData = useCallback(async () => {
    if (!escolaId) return

    try {
      setLoading(true)
      setLoadError(null)

      const resolvedAcademicYear = await academicYearService.resolveCurrent(escolaId, getTodaySaoPaulo())
      setAcademicYear(resolvedAcademicYear)
      if (userRole === 'professor') return

      const [apiStats, classSummaries] = await Promise.all([
        dashboardStatsApi.getStats({ escolaId, academicYear: resolvedAcademicYear }),
        loadClassSummaries(escolaId, resolvedAcademicYear.year),
      ])

      setStats({
        totalAlunos: apiStats.totalAlunos,
        totalEscolas: apiStats.totalEscolas,
        totalTurmas: apiStats.totalTurmas,
        totalProfessores: apiStats.totalProfessores,
        frequenciaMedia: apiStats.frequenciaGeral,
      })
      setTurmas(classSummaries)
    } catch (error) {
      logger.error(
        'DASHBOARD_DATA_LOAD_FAILED',
        error instanceof Error ? error : new Error(String(error)),
        {
          feature: 'dashboard',
          action: 'load_dashboard_data',
        },
      )
      setAcademicYear(null)
      setLoadError(t('loadError'))
    } finally {
      setLoading(false)
    }
  }, [escolaId, t, userRole])

  useEffect(() => {
    if (!userRole || escolaLoading) return
    if (!escolaId) {
      setAcademicYear(null)
      setLoading(false)
      return
    }

    void loadDashboardData()
  }, [escolaId, escolaLoading, loadDashboardData, userRole])

  return { academicYear, loadDashboardData, loadError, loading, stats, turmas }
}

function DashboardIntro({ academicYear, userName }: { academicYear: ResolvedAcademicYear; userName?: string | null }) {
  const t = useTranslations('platform.dashboard')
  const locale = useLocale()
  const now = new Date()
  const formattedDate = new Intl.DateTimeFormat(locale, {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
  }).format(now)

  return (
    <header className="app-dashboard__intro">
      <div>
        <h1>{t(`greeting.${getGreetingKey(now.getHours())}`)}, {userName?.split(' ')[0] || t('user')}.</h1>
        <p>{t('subtitle', { year: academicYear.year })}</p>
      </div>
      <div className="app-dashboard__date">
        <CalendarDays aria-hidden="true" />
        <span>{t('today')}</span>
        <time dateTime={now.toISOString().slice(0, 10)}>{formattedDate}</time>
      </div>
    </header>
  )
}

function DashboardMetrics({ academicYear, stats }: { academicYear: ResolvedAcademicYear; stats: DashboardStats }) {
  const t = useTranslations('platform.dashboard')
  const locale = useLocale()
  const frequencyIsConformant = stats.frequenciaMedia >= CONFORMIDADE
  const number = new Intl.NumberFormat(locale)
  const metrics: MetricItem[] = [
    {
      label: t('averageAttendance'),
      value: `${stats.frequenciaMedia}%`,
      detail: frequencyIsConformant ? t('compliant') : t('attention'),
      icon: frequencyIsConformant ? CheckCircle2 : AlertTriangle,
      tone: frequencyIsConformant ? 'teal' : 'warning',
    },
    {
      label: t('totalStudents'),
      value: number.format(stats.totalAlunos),
      detail: t('students'),
      icon: Users,
      tone: 'paper',
    },
    {
      label: t('activeClasses'),
      value: number.format(stats.totalTurmas),
      detail: t('activeClassesDescription', { year: academicYear.year }),
      icon: GraduationCap,
      tone: 'lime',
    },
    {
      label: t('activeTeachers'),
      value: number.format(stats.totalProfessores),
      detail: t('activeTeachers'),
      icon: UserCheck,
      tone: 'ink',
    },
  ]

  return (
    <section className="app-dashboard__overview" aria-labelledby="network-overview-title">
      <div className="app-section-heading">
        <div>
          <h2 id="network-overview-title">{t('title')}</h2>
          <p>{t('subtitle', { year: academicYear.year })}</p>
        </div>
        <span>{t('activeSchools', { count: stats.totalEscolas })}</span>
      </div>

      <div className="app-metric-grid">
        {metrics.map(({ label, value, detail, icon: Icon, tone }) => (
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
  )
}

function DashboardQuickAccess({ role }: { role: UserProfile['tipo_usuario'] | undefined }) {
  const t = useTranslations('platform.dashboard')
  const { userProfile } = useAuth()
  const pilotMode = isPilotModeEnabled()
  const demoSandbox = isDemoSandboxEnabled()
  const canManageSchool = !pilotMode || canManagePilotSchool(userProfile)
  const visibleQuickAccess = resolveVisibleQuickAccess(quickAccessItems, {
    role: isQuickAccessRole(role) ? role : null,
    pilotMode,
    canManageSchool,
    demoSandbox,
  })

  if (visibleQuickAccess.length === 0) return null

  return (
    <section className="app-dashboard__routines" aria-labelledby="quick-access-title">
      <div className="app-section-heading app-section-heading--compact">
        <div>
          <h2 id="quick-access-title">{t('routines')}</h2>
          <p>{t('routinesDescription')}</p>
        </div>
      </div>
      <nav className="app-quick-actions" aria-label={t('quickAccess')}>
        {visibleQuickAccess.map((item) => {
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
  )
}

function DashboardClasses({ academicYear, turmas }: { academicYear: ResolvedAcademicYear; turmas: Turma[] }) {
  const t = useTranslations('platform.dashboard')
  const locale = useLocale()
  const number = new Intl.NumberFormat(locale)

  return (
    <section className="app-panel" aria-labelledby="classes-title">
      <header className="app-panel__header">
        <div>
          <h2 id="classes-title">{t('myClasses')}</h2>
          <p>{t('activeClassesDescription', { year: academicYear.year })}</p>
        </div>
        <Link href="/dashboard/turmas" className="app-text-link">
          {t('viewAllClasses')} <ArrowRight aria-hidden="true" />
        </Link>
      </header>

      {turmas.length === 0 ? (
        <div className="app-empty-state" role="status">
          <GraduationCap aria-hidden="true" />
          <div><strong>{t('noClasses')}</strong></div>
        </div>
      ) : (
        <ul className="app-class-list">
          {turmas.map((turma) => (
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
  )
}

function DashboardOverview({
  academicYear,
  escolaId,
  stats,
  turmas,
  userName,
  role,
}: {
  academicYear: ResolvedAcademicYear
  escolaId: string
  stats: DashboardStats
  turmas: Turma[]
  userName?: string | null
  role: UserProfile['tipo_usuario'] | undefined
}) {
  return (
    <div className="app-dashboard">
      <DashboardIntro academicYear={academicYear} userName={userName} />
      <DashboardMetrics academicYear={academicYear} stats={stats} />
      <DashboardQuickAccess role={role} />
      <div className="app-dashboard__work-grid">
        <DashboardClasses academicYear={academicYear} turmas={turmas} />
        <AlertasCard escolaId={escolaId} academicYear={academicYear} />
      </div>
    </div>
  )
}

function DashboardSchoolContent({
  academicYear,
  escolaId,
  loadDashboardData,
  loadError,
  stats,
  turmas,
  userProfile,
}: {
  academicYear: ResolvedAcademicYear | null
  escolaId: string
  loadDashboardData: () => Promise<void>
  loadError: string | null
  stats: DashboardStats
  turmas: Turma[]
  userProfile: UserProfile | null
}) {
  const t = useTranslations('platform.dashboard')

  if (userProfile?.tipo_usuario === 'professor' && academicYear) {
    return <TeacherDashboardEnhanced professorId={userProfile.id} academicYear={academicYear} />
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
  if (!academicYear) return <DashboardSkeleton />

  return (
    <DashboardOverview
      academicYear={academicYear}
      escolaId={escolaId}
      stats={stats}
      turmas={turmas}
      userName={userProfile?.nome}
      role={userProfile?.tipo_usuario}
    />
  )
}

function DashboardContent({
  academicYear,
  escolaId,
  escolaLoading,
  loadDashboardData,
  loadError,
  loading,
  stats,
  turmas,
  userProfile,
}: {
  academicYear: ResolvedAcademicYear | null
  escolaId: string | null
  escolaLoading: boolean
  loadDashboardData: () => Promise<void>
  loadError: string | null
  loading: boolean
  stats: DashboardStats
  turmas: Turma[]
  userProfile: UserProfile | null
}) {
  if (loading) return <DashboardSkeleton />
  if (escolaLoading) return <DashboardSkeleton />
  if (!escolaId) return <div className="app-dashboard"><EscolaRequiredState /></div>

  return (
    <DashboardSchoolContent
      academicYear={academicYear}
      escolaId={escolaId}
      loadDashboardData={loadDashboardData}
      loadError={loadError}
      stats={stats}
      turmas={turmas}
      userProfile={userProfile}
    />
  )
}

export default function DashboardPage() {
  const { userProfile } = useAuth()
  const { selectedEscolaId, shouldShowSelector, loading: escolaLoading } = useEscola()
  const escolaId = shouldShowSelector ? selectedEscolaId : userProfile?.escola_id ?? null
  const dashboardData = useDashboardData({
    escolaId,
    escolaLoading,
    userRole: userProfile?.tipo_usuario,
  })

  return (
    <DashboardContent
      {...dashboardData}
      escolaId={escolaId}
      escolaLoading={escolaLoading}
      userProfile={userProfile}
    />
  )
}
