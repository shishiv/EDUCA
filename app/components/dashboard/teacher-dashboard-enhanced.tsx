'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { BookOpenCheck, CheckCircle2, Clock3, GraduationCap, Users } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'
import { getTodaySaoPaulo } from '@/lib/date-utils'
import { logger } from '@/lib/logger'

export interface TeacherDashboardEnhancedProps {
  professorId: string
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

/** Labels each teacher class by its real attendance session for the São Paulo day. */
function getTeacherSessionStatus(session: TeacherClassSession | null) {
  if (!session) {
    return {
      label: 'Chamada pendente',
      variant: 'warning' as const,
      actionLabel: 'Abrir chamada',
    }
  }

  if (session.status === 'ABERTA') {
    return {
      label: 'Chamada aberta',
      variant: 'info' as const,
      actionLabel: 'Continuar chamada',
    }
  }

  if (session.status === 'FECHADA') {
    return {
      label: 'Chamada concluída',
      variant: 'success' as const,
      actionLabel: 'Ver chamada',
    }
  }

  return {
    label: 'Sessão cancelada',
    variant: 'secondary' as const,
    actionLabel: 'Ver turma',
  }
}

/** Shows a professor only the assigned classes, active enrollments, and today's calls. */
export function TeacherDashboardEnhanced({ professorId }: TeacherDashboardEnhancedProps) {
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
        setError('Não foi possível carregar suas turmas.')
      } finally {
        setLoading(false)
      }
    }

    void loadTeacherDashboard()
  }, [professorId])

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[0, 1, 2].map(index => (
          <Card key={index} className="h-32 animate-pulse bg-muted" />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <Card className="border-destructive">
        <CardContent className="py-6 text-sm text-destructive">{error}</CardContent>
      </Card>
    )
  }

  const totalAlunos = turmas.reduce((total, turma) => total + turma.alunosAtivos, 0)
  const chamadasRegistradas = turmas.filter(turma => turma.sessaoHoje).length

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="border-b border-gray-200 pb-6">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900 sm:text-3xl">
          <GraduationCap className="h-7 w-7 text-green-700" />
          Painel do Professor
        </h1>
        <p className="mt-1 text-sm text-gray-600 sm:text-base">
          Acompanhe suas turmas e a chamada de hoje.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Minhas turmas</CardDescription>
            <CardTitle className="text-3xl">{turmas.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Alunos ativos</CardDescription>
            <CardTitle className="text-3xl">{totalAlunos}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Chamadas registradas hoje</CardDescription>
            <CardTitle className="text-3xl">{chamadasRegistradas}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Turmas atribuídas</CardTitle>
          <CardDescription>Abra ou revise a chamada de cada turma.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {turmas.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma turma foi atribuída a este professor.</p>
          ) : (
            turmas.map(turma => {
              const session = getTeacherSessionStatus(turma.sessaoHoje)
              const chamadaHref = turma.sessaoHoje
                ? `/dashboard/turmas/${turma.id}/chamada?sessao=${turma.sessaoHoje.id}`
                : `/dashboard/turmas/${turma.id}/chamada`

              return (
                <div
                  key={turma.id}
                  className="flex flex-col gap-3 rounded-lg border border-gray-200 p-4 sm:flex-row sm:items-center"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-gray-900">{turma.nome}</p>
                    <p className="text-sm text-gray-600">{turma.serie} - {turma.turno}</p>
                    <p className="mt-1 flex items-center gap-1 text-sm text-gray-600">
                      <Users className="h-4 w-4" />
                      {turma.alunosAtivos} alunos ativos
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={session.variant}>{session.label}</Badge>
                    <Button asChild size="sm">
                      <Link href={chamadaHref}>
                        <BookOpenCheck className="mr-2 h-4 w-4" />
                        {session.actionLabel}
                      </Link>
                    </Button>
                  </div>
                </div>
              )
            })
          )}
        </CardContent>
      </Card>

      {chamadasRegistradas < turmas.length && (
        <p className="flex items-center gap-2 text-sm text-amber-700">
          <Clock3 className="h-4 w-4" />
          Há turmas sem chamada registrada hoje.
        </p>
      )}
      {turmas.length > 0 && chamadasRegistradas === turmas.length && (
        <p className="flex items-center gap-2 text-sm text-green-700">
          <CheckCircle2 className="h-4 w-4" />
          Todas as suas turmas têm chamada registrada hoje.
        </p>
      )}
    </div>
  )
}
