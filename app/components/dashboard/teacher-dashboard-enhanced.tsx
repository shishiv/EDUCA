'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useLocale, useTranslations } from 'next-intl'
import { AlertTriangle, ArrowRight, BookOpenCheck, CalendarDays, CheckCircle2, Clock3, GraduationCap, Users } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { getTodaySaoPaulo } from '@/lib/date-utils'
import { logger } from '@/lib/logger'
import type { ResolvedAcademicYear } from '@/lib/services/academic-year'

export interface TeacherDashboardEnhancedProps {
  professorId: string
  academicYear: ResolvedAcademicYear
}

interface TeacherClassSession {
  id: string
  status: string
}

interface TeacherClassSummary {
  id: string
  nome: string
  serie: string
  turno: string
  alunosAtivos: number
  sessaoHoje: TeacherClassSession | null
}

/** Shows a professor only the assigned classes, active enrollments, and today's calls. */
export function TeacherDashboardEnhanced({ professorId, academicYear }: TeacherDashboardEnhancedProps) {
  const t = useTranslations('platform.dashboard')
  const locale = useLocale()
  const [turmas, setTurmas] = useState<TeacherClassSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadTeacherDashboard() {
      try {
        setLoading(true)
        setError(null)

        const { data: turmaRows, error: turmasError } = await supabase
          .from('turmas')
          .select('id, nome, serie, turno')
          .eq('professor_id', professorId)
          .eq('ano_letivo', academicYear.year)
          .eq('ativo', true)
          .order('nome')

        if (turmasError) throw turmasError

        const turmaIds = (turmaRows ?? []).map(turma => turma.id)
        if (turmaIds.length === 0) {
          setTurmas([])
          return
        }

        const [matriculasResult, sessoesResult] = await Promise.all([
          supabase
            .from('matriculas')
            .select('turma_id')
            .in('turma_id', turmaIds)
            .eq('ano_letivo', academicYear.year)
            .eq('situacao', 'ativa'),
          supabase
            .from('sessoes_aula')
            .select('id, turma_id, status')
            .in('turma_id', turmaIds)
            .eq('data_aula', getTodaySaoPaulo())
            .order('created_at', { ascending: false }),
        ])

        if (matriculasResult.error) throw matriculasResult.error
        if (sessoesResult.error) throw sessoesResult.error

        const alunosPorTurma = new Map<string, number>()
        for (const matricula of matriculasResult.data ?? []) {
          alunosPorTurma.set(
            matricula.turma_id,
            (alunosPorTurma.get(matricula.turma_id) ?? 0) + 1
          )
        }

        const sessoesPorTurma = new Map<string, TeacherClassSession>()
        for (const sessao of sessoesResult.data ?? []) {
          const existing = sessoesPorTurma.get(sessao.turma_id)
          if (!existing || sessao.status === 'ABERTA') {
            sessoesPorTurma.set(sessao.turma_id, { id: sessao.id, status: sessao.status })
          }
        }

        setTurmas((turmaRows ?? []).map(turma => ({
          id: turma.id,
          nome: turma.nome,
          serie: turma.serie,
          turno: turma.turno,
          alunosAtivos: alunosPorTurma.get(turma.id) ?? 0,
          sessaoHoje: sessoesPorTurma.get(turma.id) ?? null,
        })))
      } catch (loadError) {
        logger.error('TEACHER_DASHBOARD_LOAD_FAILED', loadError as Error, {
          feature: 'teacher-dashboard',
          action: 'load_assigned_classes',
          metadata: { professorId },
        })
        setError(t('teacherLoadError'))
      } finally {
        setLoading(false)
      }
    }

    void loadTeacherDashboard()
  }, [academicYear.year, professorId, t])

  if (loading) {
    return (
      <div className="app-dashboard app-dashboard-skeleton" aria-busy="true" aria-label={t('teacherLoading')}>
        <div className="app-skeleton h-20" />
        <div className="grid grid-cols-3 gap-3">
          {[0, 1, 2].map(index => <div key={index} className="app-skeleton h-28" />)}
        </div>
        <div className="app-skeleton h-72" />
      </div>
    )
  }

  if (error) {
    return (
      <section className="app-dashboard-error" role="alert">
        <AlertTriangle aria-hidden="true" />
        <div><h1>{t('teacherUnavailable')}</h1><p>{error}</p></div>
      </section>
    )
  }

  const totalAlunos = turmas.reduce((total, turma) => total + turma.alunosAtivos, 0)
  const chamadasRegistradas = turmas.filter(turma => turma.sessaoHoje).length
  const number = new Intl.NumberFormat(locale)
  const now = new Date()
  const formattedDate = new Intl.DateTimeFormat(locale, { weekday: 'long', day: '2-digit', month: 'long' }).format(now)

  const getTeacherSessionStatus = (session: TeacherClassSession | null) => {
    if (!session) return { label: t('pendingCall'), tone: 'warning' as const, actionLabel: t('openCall') }
    if (session.status === 'ABERTA') return { label: t('openedCall'), tone: 'info' as const, actionLabel: t('continueCall') }
    if (session.status === 'FECHADA') return { label: t('completedCall'), tone: 'success' as const, actionLabel: t('viewCall') }
    return { label: t('cancelledSession'), tone: 'neutral' as const, actionLabel: t('viewClass') }
  }

  return (
    <div className="app-dashboard app-teacher-dashboard">
      <header className="app-dashboard__intro">
        <div>
          <h1>{t('teacherPanel')}</h1>
          <p>{t('teacherSubtitle', { year: academicYear.year })}</p>
        </div>
        <div className="app-dashboard__date">
          <CalendarDays aria-hidden="true" />
          <span>{t('today')}</span>
          <time dateTime={now.toISOString().slice(0, 10)}>{formattedDate}</time>
        </div>
      </header>

      <section className="app-dashboard__overview" aria-labelledby="teacher-overview-title">
        <div className="app-section-heading">
          <div>
            <h2 id="teacher-overview-title">{t('teacherTodayRoutine')}</h2>
            <p>{t('teacherTodaySummary')}</p>
          </div>
        </div>
        <div className="app-metric-grid app-metric-grid--three">
          <article className="app-metric" data-tone="paper">
            <div className="app-metric__label"><span>{t('myClassesShort')}</span><GraduationCap aria-hidden="true" /></div>
            <strong className="text-3xl tabular-nums">{number.format(turmas.length)}</strong>
            <small>{t('teacherAssignedCount', { count: turmas.length })}</small>
          </article>
          <article className="app-metric" data-tone="lime">
            <div className="app-metric__label"><span>{t('activeStudents')}</span><Users aria-hidden="true" /></div>
            <strong className="text-3xl tabular-nums">{number.format(totalAlunos)}</strong>
            <small>{t('teacherCurrentClasses', { year: academicYear.year })}</small>
          </article>
          <article className="app-metric" data-tone="ink">
            <div className="app-metric__label"><span>{t('callsToday')}</span><BookOpenCheck aria-hidden="true" /></div>
            <strong className="text-3xl tabular-nums">{number.format(chamadasRegistradas)}</strong>
            <small>{t('teacherCallsOfClasses', { calls: chamadasRegistradas, classes: turmas.length })}</small>
          </article>
        </div>
      </section>

      <section className="app-panel" aria-labelledby="assigned-classes-title">
        <header className="app-panel__header">
          <div>
            <h2 id="assigned-classes-title">{t('assignedClasses')}</h2>
            <p>{t('openOrReview')}</p>
          </div>
          {turmas.length > 0 ? (
            <span className="app-teacher-summary" data-complete={chamadasRegistradas === turmas.length}>
              {chamadasRegistradas === turmas.length ? <CheckCircle2 aria-hidden="true" /> : <Clock3 aria-hidden="true" />}
              {chamadasRegistradas === turmas.length ? t('allCalls') : t('teacherPendingCount', { count: turmas.length - chamadasRegistradas })}
            </span>
          ) : null}
        </header>

        {turmas.length === 0 ? (
          <div className="app-empty-state" role="status">
            <GraduationCap aria-hidden="true" />
            <div><strong>{t('noAssigned')}</strong><p>{t('teacherNoAssignedDescription')}</p></div>
          </div>
        ) : (
          <ul className="app-teacher-class-list">
            {turmas.map(turma => {
              const session = getTeacherSessionStatus(turma.sessaoHoje)
              const chamadaHref = turma.sessaoHoje
                ? `/dashboard/turmas/${turma.id}/chamada?sessao=${turma.sessaoHoje.id}`
                : `/dashboard/turmas/${turma.id}/chamada`

              return (
                <li key={turma.id}>
                  <div className="app-teacher-class-row">
                    <span className="app-teacher-class-row__copy">
                      <strong>{turma.nome}</strong>
                      <small>{turma.serie} · {turma.turno} · {t('teacherActiveStudentCount', { count: turma.alunosAtivos })}</small>
                    </span>
                    <span className="app-status-label" data-tone={session.tone}>{session.label}</span>
                    <Link href={chamadaHref} className="app-row-action">
                      <span>{session.actionLabel}</span><ArrowRight aria-hidden="true" />
                    </Link>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}
