'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { dashboardStatsApi } from '@/lib/api/dashboard-stats'
import { StatCard } from '@/components/ui'
import { TeacherDashboardEnhanced } from '@/components/dashboard/teacher-dashboard-enhanced'
import { AlertasCard } from '@/components/dashboard/alertas-card'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Users, UserCheck, GraduationCap, CalendarCheck } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import Link from 'next/link'
import { logger } from '@/lib/logger'
import { canManagePilotSchool, isPilotModeEnabled } from '@/lib/pilot/pilot-scope'
import { isDemoSandboxEnabled } from '@/lib/demo-sandbox/demo-sandbox'
import { quickAccessItems, resolveVisibleQuickAccess, resolveVisibleQuickActionCards, type QuickAccessRole } from '@/lib/dashboard/quick-access'

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

export default function DashboardPage() {
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

  useEffect(() => {
    if (!userRole) return
    if (userRole === 'professor') {
      setLoading(false)
      return
    }

    void loadDashboardData()
  }, [userRole])

  const loadDashboardData = async () => {
    try {
      setLoadError(null)

      const apiStats = await dashboardStatsApi.getStats()

      const newStats: DashboardStats = {
        totalAlunos: apiStats.totalAlunos,
        totalEscolas: apiStats.totalEscolas,
        totalTurmas: apiStats.totalTurmas,
        totalProfessores: apiStats.totalProfessores,
        frequenciaMedia: apiStats.frequenciaGeral,
      }

      setStats(newStats)

      const { data: turmasData, error: turmasError } = await supabase
        .from('turmas')
        .select('id, nome, serie, turno')
        .eq('ativo', true)
        .order('nome')
        .limit(5)

      if (turmasError) throw turmasError

      const turmaIds = (turmasData ?? []).map(turma => turma.id)
      let matriculasData: Array<{ turma_id: string }> = []
      if (turmaIds.length > 0) {
        const { data, error: matriculasError } = await supabase
          .from('matriculas')
          .select('turma_id')
          .in('turma_id', turmaIds)
          .eq('situacao', 'ativa')

        if (matriculasError) throw matriculasError
        matriculasData = data ?? []
      }

      const matriculasPorTurma = new Map<string, number>()
      for (const matricula of matriculasData) {
        matriculasPorTurma.set(
          matricula.turma_id,
          (matriculasPorTurma.get(matricula.turma_id) ?? 0) + 1
        )
      }

      const turmasWithCount: Turma[] = (turmasData || []).map((t) => ({
        id: t.id,
        nome: t.nome,
        serie: t.serie,
        turno: t.turno,
        alunosCount: matriculasPorTurma.get(t.id) ?? 0,
      }))
      setTurmas(turmasWithCount)

    } catch (error) {
      logger.error('DASHBOARD_DATA_LOAD_FAILED', error as Error, {
        feature: 'dashboard',
        action: 'load_dashboard_data',
      })
      setLoadError('Não foi possível carregar os indicadores do dashboard.')
    } finally {
      setLoading(false)
    }
  }

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Bom dia'
    if (hour < 18) return 'Boa tarde'
    return 'Boa noite'
  }

  // Color indicator by serie for turmas
  const getSerieColor = (serie: string) => {
    const serieLower = serie.toLowerCase()
    if (serieLower.includes('infantil')) return 'bg-pink-500'
    if (serieLower.includes('fundamental i') || serieLower.includes('fundamental 1')) return 'bg-orange-500'
    if (serieLower.includes('fundamental ii') || serieLower.includes('fundamental 2')) return 'bg-violet-500'
    return 'bg-green-500'
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="bg-gray-200 h-32 rounded-lg"></div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (userProfile?.tipo_usuario === 'professor') {
    return <TeacherDashboardEnhanced professorId={userProfile.id} />
  }

  if (loadError) {
    return (
      <Card className="border-destructive">
        <CardContent className="py-6 text-sm text-destructive">{loadError}</CardContent>
      </Card>
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

  const visibleQuickActionCards = resolveVisibleQuickActionCards(pilotMode, canManageSchool, demoSandbox)

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page heading and one compact action row */}
      <div className="mb-8 flex flex-col gap-2 border-b border-gray-200 pb-6">
        <h1 className="font-display text-2xl font-bold leading-tight text-gray-900 sm:text-3xl">
          {getGreeting()}, {userProfile?.nome?.split(' ')[0] || 'Usuário'}!
        </h1>
        <p className="text-sm text-gray-600 sm:text-base">
          Sistema de Gestão Educacional - Ano Letivo 2024
        </p>
      </div>

      {visibleQuickAccess.length > 0 && (
        <nav aria-label="Acessos rápidos" className="mb-8">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:flex lg:flex-wrap">
            {visibleQuickAccess.map((item) => {
              const IconComponent = item.icon
              return (
                <Button
                  key={item.name}
                  variant="outline"
                  size="touch"
                  asChild
                  className="w-full justify-start gap-2 border-gray-200 bg-white px-3 text-sm text-green-900 shadow-none hover:border-green-300 hover:bg-green-50 hover:text-green-700 lg:w-auto"
                >
                  <Link href={item.href}>
                    <IconComponent className={`h-4 w-4 ${item.iconColor}`} aria-hidden="true" />
                    <span>{item.name}</span>
                  </Link>
                </Button>
              )
            })}
          </div>
        </nav>
      )}

      {/* Statistics Cards - Responsive grid: 1 col mobile, 2 cols tablet, 4 cols desktop */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Users}
          iconColor="blue"
          value={stats.totalAlunos}
          label="Total de Alunos"
        />
        <StatCard
          icon={GraduationCap}
          iconColor="green"
          value={stats.totalTurmas}
          label="Turmas Ativas"
        />
        <StatCard
          icon={CalendarCheck}
          iconColor="yellow"
          value={`${stats.frequenciaMedia}%`}
          label="Frequencia Media"
          trend={stats.frequenciaMedia >= 75 ? { value: "Acima da meta", direction: "up" } : undefined}
        />
        <StatCard
          icon={UserCheck}
          iconColor="pink"
          value={stats.totalProfessores}
          label="Professores Ativos"
        />
      </div>

      {/* Main Content Grid - 2 columns on desktop, stack on mobile */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Minhas Turmas */}
        <Card className="bg-white border border-gray-200 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="font-display text-lg text-gray-800">
              Minhas Turmas
            </CardTitle>
            <CardDescription className="text-sm text-gray-500">
              Turmas ativas no sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {turmas.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">Nenhuma turma encontrada</p>
              ) : (
                turmas.map((turma) => (
                  <Link key={turma.id} href={`/dashboard/turmas/${turma.id}`}>
                    <div className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 hover:border-green-200 hover:bg-green-50/50 transition-all cursor-pointer group">
                      {/* Color indicator bar by serie */}
                      <div className={`w-1 h-12 rounded-full ${getSerieColor(turma.serie)}`} />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 group-hover:text-green-700 transition-colors">
                          {turma.nome}
                        </p>
                        <p className="text-sm text-gray-500">
                          {turma.serie} - {turma.turno}
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge variant="secondary" className="bg-gray-100 text-gray-600">
                          {turma.alunosCount} alunos
                        </Badge>
                      </div>
                    </div>
                  </Link>
                ))
              )}
              <Button variant="outline" className="w-full mt-2" asChild>
                <Link href="/dashboard/turmas">
                  Ver Todas as Turmas
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Right Column - Alerts + Quick Actions */}
        <div className="space-y-6">
          <AlertasCard />

          {/* Quick Actions */}
          <Card className="bg-white border border-gray-200 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="font-display text-lg text-gray-800">
                Acoes Rapidas
              </CardTitle>
              <CardDescription className="text-sm text-gray-500">
                Atalhos para tarefas frequentes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                {visibleQuickActionCards.map((card) => {
                  const CardIcon = card.icon
                  return (
                    <Button key={card.name} variant="outline" className="h-auto py-3 flex flex-col items-center gap-2" asChild>
                      <Link href={card.href}>
                        <CardIcon className={`h-5 w-5 ${card.iconColor}`} />
                        <span className="text-sm">{card.name}</span>
                      </Link>
                    </Button>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

    </div>
  )
}
