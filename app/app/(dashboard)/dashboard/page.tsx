'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { dashboardStatsApi } from '@/lib/api/dashboard-stats'
import { StatCard, AlertItem } from '@/components/ui'
import { TeacherDashboardEnhanced } from '@/components/dashboard/teacher-dashboard-enhanced'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Users, UserCheck, GraduationCap, Settings, UserPlus, FileText, CheckSquare, Building2, BarChart3, CalendarCheck, LucideIcon } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import Link from 'next/link'
import { logger } from '@/lib/logger'
import type { Database } from '@/types/database'

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

interface QuickAccessItem {
  name: string
  href: string
  icon: LucideIcon
  color: string
  iconColor: string
  borderColor: string
  roles: Array<'admin' | 'diretor' | 'secretario' | 'professor' | 'responsavel'>
}

const quickAccessItems: QuickAccessItem[] = [
  { name: 'Novo Aluno', href: '/dashboard/alunos/novo', icon: UserPlus, color: 'bg-blue-50 hover:bg-blue-100', iconColor: 'text-blue-600', borderColor: 'hover:border-blue-300', roles: ['admin', 'diretor', 'secretario'] },
  { name: 'Matrícula', href: '/dashboard/matriculas/nova', icon: FileText, color: 'bg-emerald-50 hover:bg-emerald-100', iconColor: 'text-emerald-600', borderColor: 'hover:border-emerald-300', roles: ['admin', 'diretor', 'secretario'] },
  { name: 'Frequência', href: '/dashboard/frequencia', icon: CheckSquare, color: 'bg-amber-50 hover:bg-amber-100', iconColor: 'text-amber-600', borderColor: 'hover:border-amber-300', roles: ['admin', 'diretor', 'secretario', 'professor'] },
  { name: 'Nova Turma', href: '/dashboard/turmas/nova', icon: Building2, color: 'bg-violet-50 hover:bg-violet-100', iconColor: 'text-violet-600', borderColor: 'hover:border-violet-300', roles: ['admin', 'diretor', 'secretario'] },
  { name: 'Relatórios', href: '/dashboard/relatorios', icon: BarChart3, color: 'bg-rose-50 hover:bg-rose-100', iconColor: 'text-rose-600', borderColor: 'hover:border-rose-300', roles: ['admin', 'diretor', 'secretario'] },
  { name: 'Config', href: '/dashboard/configuracoes', icon: Settings, color: 'bg-slate-50 hover:bg-slate-100', iconColor: 'text-slate-600', borderColor: 'hover:border-slate-300', roles: ['admin', 'diretor'] },
]

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
          message: `${newStats.alunosComBaixaFrequencia} aluno(s) com frequencia abaixo de 75%`,
          timestamp: new Date().toISOString()
        })
      }
      if (newStats.alunosComDocumentosPendentes > 0) {
        dashboardAlerts.push({
          id: 'alert-docs',
          severity: 'warning',
          message: `${newStats.alunosComDocumentosPendentes} alunos com documentacao pendente`,
          timestamp: new Date().toISOString()
        })
      }
      if (newStats.frequenciaMedia >= 85) {
        dashboardAlerts.push({
          id: 'alert-meta',
          severity: 'success',
          message: 'Meta de frequencia alcancada! Parabens!',
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
      {/* Simplified Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">
          {getGreeting()}, {userProfile?.nome?.split(' ')[0] || 'Usuário'}!
        </h1>
        <p className="text-gray-600 mt-1">
          Sistema de Gestão Educacional - Ano Letivo 2024
        </p>
      </div>

      {/* Quick Access - Moved to Top */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-6">
        {(quickAccessItems satisfies QuickAccessItem[]).filter((item) =>
          userProfile && item.roles.includes(userProfile.tipo_usuario as QuickAccessItem['roles'][number])
        ).map((item) => {
          const IconComponent = item.icon
          return (
            <Link key={item.name} href={item.href}>
              <div className={`flex flex-col items-center p-4 rounded-lg ${item.color} border border-transparent ${item.borderColor} transition-all duration-200 hover:scale-105 cursor-pointer shadow-sm hover:shadow-md`}>
                <IconComponent className={`h-6 w-6 mb-2 ${item.iconColor}`} />
                <span className="text-xs font-medium text-center text-gray-700">
                  {item.name}
                </span>
              </div>
            </Link>
          )
        })}
      </div>

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
                  Ver Todas as Turmas
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
                Notificacoes e alertas do sistema
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
                Acoes Rapidas
              </CardTitle>
              <CardDescription className="text-sm text-gray-500">
                Atalhos para tarefas frequentes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                <Button variant="outline" className="h-auto py-3 flex flex-col items-center gap-2" asChild>
                  <Link href="/dashboard/frequencia">
                    <CheckSquare className="h-5 w-5 text-amber-600" />
                    <span className="text-sm">Nova Chamada</span>
                  </Link>
                </Button>
                <Button variant="outline" className="h-auto py-3 flex flex-col items-center gap-2" asChild>
                  <Link href="/dashboard/notas">
                    <GraduationCap className="h-5 w-5 text-violet-600" />
                    <span className="text-sm">Lancar Notas</span>
                  </Link>
                </Button>
                <Button variant="outline" className="h-auto py-3 flex flex-col items-center gap-2" asChild>
                  <Link href="/dashboard/relatorios">
                    <BarChart3 className="h-5 w-5 text-rose-600" />
                    <span className="text-sm">Ver Relatorios</span>
                  </Link>
                </Button>
                <Button variant="outline" className="h-auto py-3 flex flex-col items-center gap-2" asChild>
                  <Link href="/dashboard/alunos/novo">
                    <UserPlus className="h-5 w-5 text-blue-600" />
                    <span className="text-sm">Cadastrar Aluno</span>
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

    </div>
  )
}