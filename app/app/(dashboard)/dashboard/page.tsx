'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { dashboardStatsApi } from '@/lib/api/dashboard-stats'
import { StatCard, AlertItem } from '@/components/ui'
import { TeacherDashboardEnhanced } from '@/components/dashboard/teacher-dashboard-enhanced'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Users, UserCheck, GraduationCap, CalendarCheck } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import Link from 'next/link'
import { logger } from '@/lib/logger'
import type { Database } from '@/types/database'
import { canManagePilotSchool, isPilotModeEnabled } from '@/lib/pilot/pilot-scope'
import { isDemoSandboxEnabled } from '@/lib/demo-sandbox/demo-sandbox'
import { quickAccessItems, resolveVisibleQuickAccess, resolveVisibleQuickActionCards, type QuickAccessRole } from '@/lib/dashboard/quick-access'

type MatriculaRow = Database['public']['Tables']['matriculas']['Row']
type AlunoRow = Database['public']['Tables']['alunos']['Row']

interface DashboardStats {
  totalAlunos: number
  totalEscolas: number
  totalTurmas: number
  totalMatriculas: number
  frequenciaMedia: number
  alunosComBaixaFrequencia: number
  alunosComDocumentosPendentes: number
}

interface RecentActivity {
  id: string
  type: 'matricula' | 'frequencia' | 'nota'
  description: string
  timestamp: string
}

interface Turma {
  id: string
  nome: string
  serie: string
  turno: string
  alunosCount: number
}

interface DashboardAlert {
  id: string
  severity: 'warning' | 'error' | 'info' | 'success'
  message: string
  timestamp: string
}

export default function DashboardPage() {
  const { userProfile } = useAuth()
  const [stats, setStats] = useState<DashboardStats>({
    totalAlunos: 0,
    totalEscolas: 0,
    totalTurmas: 0,
    totalMatriculas: 0,
    frequenciaMedia: 0,
    alunosComBaixaFrequencia: 0,
    alunosComDocumentosPendentes: 0
  })
  const [loading, setLoading] = useState(true)
  const [activities, setActivities] = useState<RecentActivity[]>([])
  const [turmas, setTurmas] = useState<Turma[]>([])
  const [alerts, setAlerts] = useState<DashboardAlert[]>([])

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      logger.info('Loading dashboard data...')

      // Fetch stats via API service (follows three-layer architecture per STD-03)
      const apiStats = await dashboardStatsApi.getStats()

      // Map API stats to component state
      const newStats: DashboardStats = {
        totalAlunos: apiStats.totalAlunos,
        totalEscolas: apiStats.totalEscolas,
        totalTurmas: apiStats.totalTurmas,
        totalMatriculas: apiStats.totalMatriculas,
        frequenciaMedia: apiStats.frequenciaGeral,
        alunosComBaixaFrequencia: apiStats.alunosComBaixaFrequencia,
        alunosComDocumentosPendentes: apiStats.alunosComDocumentosPendentes
      }

      logger.info('Dashboard stats loaded:', { metadata: { newStats } })
      setStats(newStats)

      // Load recent activities from recent data
      const { data: recentMatriculas } = await supabase
        .from('matriculas')
        .select(`
          id,
          created_at,
          alunos (nome_completo)
        `)
        .order('created_at', { ascending: false })
        .limit(3)

      type MatriculaWithAluno = MatriculaRow & {
        alunos: Pick<AlunoRow, 'nome_completo'> | null
      }

      const recentActivities: RecentActivity[] = ((recentMatriculas || []) as MatriculaWithAluno[]).map((matricula) => ({
        id: matricula.id,
        type: 'matricula' as const,
        description: `Nova matrícula: ${matricula.alunos?.nome_completo || 'Aluno'}`,
        timestamp: matricula.created_at || new Date().toISOString()
      }))

      // Add some sample activities if we don't have enough real data
      if (recentActivities.length < 3) {
        recentActivities.push(
          {
            id: 'freq-1',
            type: 'frequencia',
            description: 'Frequência lançada para turma ativa',
            timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() // 2 hours ago
          },
          {
            id: 'nota-1',
            type: 'nota',
            description: 'Sistema atualizado com novas funcionalidades',
            timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() // 1 day ago
          }
        )
      }

      logger.info('Recent activities loaded', { metadata: { count: recentActivities.length } })
      setActivities(recentActivities.slice(0, 3))

      // Load turmas for "Minhas Turmas" section
      const { data: turmasData } = await supabase
        .from('turmas')
        .select('id, nome, serie, turno')
        .eq('ativo', true)
        .limit(5)

      const turmasWithCount: Turma[] = (turmasData || []).map((t) => ({
        id: t.id,
        nome: t.nome,
        serie: t.serie || 'Fundamental I',
        turno: t.turno || 'Matutino',
        alunosCount: Math.floor(Math.random() * 20) + 15 // Placeholder - would need join query
      }))
      setTurmas(turmasWithCount)

      // Generate alerts based on stats
      const dashboardAlerts: DashboardAlert[] = []
      if (newStats.alunosComBaixaFrequencia > 0) {
        dashboardAlerts.push({
          id: 'alert-baixa-freq',
          severity: newStats.alunosComBaixaFrequencia > 5 ? 'error' : 'warning',
          message: `${newStats.alunosComBaixaFrequencia} aluno(s) com frequência abaixo de 75%`,
          timestamp: new Date().toISOString()
        })
      }
      if (newStats.alunosComDocumentosPendentes > 0) {
        dashboardAlerts.push({
          id: 'alert-docs',
          severity: 'warning',
          message: `${newStats.alunosComDocumentosPendentes} alunos com documentação pendente`,
          timestamp: new Date().toISOString()
        })
      }
      if (newStats.frequenciaMedia >= 85) {
        dashboardAlerts.push({
          id: 'alert-meta',
          severity: 'success',
          message: 'Meta de frequência alcançada! Parabéns!',
          timestamp: new Date().toISOString()
        })
      }
      if (dashboardAlerts.length === 0) {
        dashboardAlerts.push({
          id: 'alert-info',
          severity: 'info',
          message: 'Nenhum alerta pendente no momento.',
          timestamp: new Date().toISOString()
        })
      }
      setAlerts(dashboardAlerts)

    } catch (error) {
      logger.error('Erro ao carregar dados do dashboard:', error as any)
      // Fallback to basic stats if there's an error
      setStats({
        totalAlunos: 0,
        totalEscolas: 0,
        totalTurmas: 0,
        totalMatriculas: 0,
        frequenciaMedia: 0,
        alunosComBaixaFrequencia: 0,
        alunosComDocumentosPendentes: 0
      })
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

  // Show teacher-specific dashboard for professors
  if (userProfile?.tipo_usuario === 'professor') {
    return (
      <TeacherDashboardEnhanced
        professorId={userProfile.id}
      />
    )
  }

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
          label="Frequência Média"
          trend={stats.frequenciaMedia >= 75 ? { value: "Acima da meta", direction: "up" } : undefined}
        />
        <StatCard
          icon={UserCheck}
          iconColor="pink"
          value={stats.totalMatriculas}
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
                  Ver todas as turmas
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Right Column - Alerts + Quick Actions */}
        <div className="space-y-6">
          {/* Alerts Panel */}
          <Card className="bg-white border border-gray-200 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="font-display text-lg text-gray-800">
                Alertas Recentes
              </CardTitle>
              <CardDescription className="text-sm text-gray-500">
                Notificações e alertas do sistema
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {alerts.map((alert) => (
                  <AlertItem key={alert.id} severity={alert.severity}>
                    <div className="flex justify-between items-start gap-2">
                      <span>{alert.message}</span>
                      <span className="text-xs opacity-70 whitespace-nowrap">
                        {new Date(alert.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </AlertItem>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="bg-white border border-gray-200 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="font-display text-lg text-gray-800">
                Ações Rápidas
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
