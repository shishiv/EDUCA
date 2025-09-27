'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { StatsCard } from '@/components/dashboard/stats-card'
import { TeacherDashboardEnhanced } from '@/components/dashboard/teacher-dashboard-enhanced'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Users, School, UserCheck, GraduationCap, AlertCircle, TrendingUp, Calendar, Clock, Settings } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface DashboardStats {
  totalAlunos: number
  totalEscolas: number
  totalTurmas: number
  totalMatriculas: number
  frequenciaMedia: number
  alunosComBaixaFrequencia: number
}

interface RecentActivity {
  id: string
  type: 'matricula' | 'frequencia' | 'nota'
  description: string
  timestamp: string
}

export default function DashboardPage() {
  const { userProfile } = useAuth()
  const router = useRouter()
  const [stats, setStats] = useState<DashboardStats>({
    totalAlunos: 0,
    totalEscolas: 0,
    totalTurmas: 0,
    totalMatriculas: 0,
    frequenciaMedia: 0,
    alunosComBaixaFrequencia: 0
  })
  const [loading, setLoading] = useState(true)
  const [activities, setActivities] = useState<RecentActivity[]>([])

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      // Mock data for development
      setStats({
        totalAlunos: 5,
        totalEscolas: 3,
        totalTurmas: 8,
        totalMatriculas: 3,
        frequenciaMedia: 87.5,
        alunosComBaixaFrequencia: 1
      })

      // Mock recent activities
      setActivities([
        {
          id: '1',
          type: 'matricula',
          description: 'Nova matrícula: Pedro Silva Santos',
          timestamp: '2024-01-15T10:30:00Z'
        },
        {
          id: '2',
          type: 'frequencia',
          description: 'Frequência lançada para Turma 5º Ano A',
          timestamp: '2024-01-15T09:15:00Z'
        },
        {
          id: '3',
          type: 'nota',
          description: 'Notas lançadas para disciplina Matemática',
          timestamp: '2024-01-14T16:45:00Z'
        }
      ])

    } catch (error) {
      // console.error('Erro ao carregar dados do dashboard:', error)
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

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'matricula': return UserCheck
      case 'frequencia': return Calendar
      case 'nota': return GraduationCap
      default: return Clock
    }
  }

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'matricula': return 'bg-blue-100 text-blue-600'
      case 'frequencia': return 'bg-green-100 text-green-600'
      case 'nota': return 'bg-orange-100 text-orange-600'
      default: return 'bg-gray-100 text-gray-600'
    }
  }

  const handleNavigateToAttendance = (classInfo: any, sessionData?: any) => {
    // Navigate to attendance marking page
    router.push(`/dashboard/frequencia?turma=${classInfo.id}&sessao=${sessionData?.id || ''}`)
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
        onNavigateToAttendance={handleNavigateToAttendance}
      />
    )
  }

  return (
    <div className="space-y-10 max-w-7xl mx-auto">
      {/* Enhanced Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-fronteira-primary/10 via-white to-fronteira-green/10 p-8 border border-fronteira-gray-200 shadow-sm">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,theme(colors.fronteira-blue/10),transparent_50%)]"></div>
        <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold text-fronteira-primary">
              {getGreeting()}, {userProfile?.nome?.split(' ')[0] || 'Usuário'}!
            </h1>
            <p className="text-lg text-fronteira-gray-700 max-w-2xl">
              Bem-vindo ao Sistema de Gestão Educacional. Acompanhe as principais métricas e informações do sistema educacional municipal.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <Badge variant="outline" className="px-4 py-2 text-sm font-semibold bg-white/80 border-fronteira-primary/20">
              📚 Ano Letivo 2024
            </Badge>
            <Button asChild className="bg-gradient-to-r from-fronteira-primary to-fronteira-blue hover:from-fronteira-primary/90 hover:to-fronteira-blue/90 shadow-lg">
              <Link href="/dashboard/matriculas">
                <UserCheck className="w-4 h-4 mr-2" />
                Nova Matrícula
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Enhanced Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="Total de Alunos"
          value={stats.totalAlunos}
          icon={Users}
          variant="primary"
          trend={{ value: 5.2, isPositive: true }}
        />
        <StatsCard
          title="Escolas Ativas"
          value={stats.totalEscolas}
          icon={School}
          variant="secondary"
        />
        <StatsCard
          title="Turmas Ativas"
          value={stats.totalTurmas}
          icon={GraduationCap}
          variant="accent"
        />
        <StatsCard
          title="Matrículas Ativas"
          value={stats.totalMatriculas}
          icon={UserCheck}
          variant="default"
          trend={{ value: 2.1, isPositive: true }}
        />
      </div>

      {/* Enhanced Dashboard Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Enhanced Attendance Card */}
        <Card className="group hover:shadow-xl transition-all duration-300 border-0 shadow-lg ring-1 ring-black/5 hover:ring-fronteira-primary/20">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center justify-between text-lg">
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 rounded-lg bg-gradient-to-r from-green-500 to-green-600 flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-white" />
                </div>
                <span className="text-fronteira-gray-900 group-hover:text-fronteira-primary transition-colors">
                  Frequência Geral
                </span>
              </div>
            </CardTitle>
            <CardDescription className="text-base text-fronteira-gray-600">
              Média de frequência dos alunos matriculados
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="flex items-end justify-between">
                <div>
                  <span className="text-3xl font-bold text-green-600">
                    {stats.frequenciaMedia}%
                  </span>
                  <p className="text-sm text-gray-500">Taxa atual</p>
                </div>
                <Badge variant="secondary" className="bg-green-100 text-green-800 px-3 py-1">
                  🎯 Meta: 75%
                </Badge>
              </div>
              <div className="space-y-2">
                <Progress value={stats.frequenciaMedia} className="h-3 bg-gray-200" />
                <p className="text-sm text-green-600 font-medium">
                  ✅ Resultado excelente! Acima da meta estabelecida.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Enhanced Alerts Card */}
        <Card className="group hover:shadow-xl transition-all duration-300 border-0 shadow-lg ring-1 ring-amber-200/50 bg-gradient-to-br from-amber-50 to-yellow-50">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center space-x-3 text-lg">
              <div className="h-10 w-10 rounded-lg bg-gradient-to-r from-amber-500 to-yellow-500 flex items-center justify-center">
                <AlertCircle className="h-5 w-5 text-white" />
              </div>
              <span className="text-amber-800 group-hover:text-amber-900 transition-colors">
                Alertas Importantes
              </span>
            </CardTitle>
            <CardDescription className="text-base text-amber-700">
              Itens que precisam de atenção imediata
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-white/80 rounded-xl border border-amber-200 hover:bg-white transition-colors">
                <div className="flex items-center space-x-3">
                  <div className="h-8 w-8 rounded-full bg-red-100 flex items-center justify-center">
                    <span className="text-red-600 text-xs font-bold">{stats.alunosComBaixaFrequencia}</span>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">Baixa Frequência</p>
                    <p className="text-sm text-gray-600">
                      {stats.alunosComBaixaFrequencia} aluno abaixo de 75%
                    </p>
                  </div>
                </div>
                <Button variant="outline" size="sm" asChild className="border-amber-300 text-amber-700 hover:bg-amber-50">
                  <Link href="/dashboard/frequencia">
                    Ver Detalhes
                  </Link>
                </Button>
              </div>
              <div className="flex items-center justify-between p-4 bg-white/80 rounded-xl border border-amber-200 hover:bg-white transition-colors">
                <div className="flex items-center space-x-3">
                  <div className="h-8 w-8 rounded-full bg-orange-100 flex items-center justify-center">
                    <span className="text-orange-600 text-xs font-bold">2</span>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">Documentos Pendentes</p>
                    <p className="text-sm text-gray-600">2 alunos com docs incompletos</p>
                  </div>
                </div>
                <Button variant="outline" size="sm" asChild className="border-amber-300 text-amber-700 hover:bg-amber-50">
                  <Link href="/dashboard/alunos">
                    Verificar
                  </Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Enhanced Recent Activities Card */}
        <Card className="group hover:shadow-xl transition-all duration-300 border-0 shadow-lg ring-1 ring-black/5 hover:ring-fronteira-primary/20">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center space-x-3 text-lg">
              <div className="h-10 w-10 rounded-lg bg-gradient-to-r from-fronteira-primary to-fronteira-blue flex items-center justify-center">
                <Clock className="h-5 w-5 text-white" />
              </div>
              <span className="text-fronteira-gray-900 group-hover:text-fronteira-primary transition-colors">
                Atividades Recentes
              </span>
            </CardTitle>
            <CardDescription className="text-base text-fronteira-gray-600">
              Últimas ações realizadas no sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {activities.map((activity) => {
                const Icon = getActivityIcon(activity.type)
                return (
                  <div key={activity.id} className="flex items-start space-x-4 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                    <div className={`h-10 w-10 rounded-xl flex items-center justify-center shadow-sm ${getActivityColor(activity.type)}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 mb-1">
                        {activity.description}
                      </p>
                      <p className="text-xs text-gray-500 flex items-center">
                        <Clock className="w-3 h-3 mr-1" />
                        {new Date(activity.timestamp).toLocaleString('pt-BR')}
                      </p>
                    </div>
                  </div>
                )
              })}
              <Button variant="outline" className="w-full mt-6 bg-white hover:bg-fronteira-primary hover:text-white transition-all duration-200 border-fronteira-primary/20" asChild>
                <Link href="/dashboard/atividades">
                  📊 Ver Todas Atividades
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Enhanced Quick Access */}
      <Card className="group hover:shadow-xl transition-all duration-300 border-0 shadow-lg ring-1 ring-black/5 hover:ring-fronteira-primary/20">
        <CardHeader className="pb-6">
          <CardTitle className="flex items-center space-x-3 text-2xl">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-r from-fronteira-primary to-fronteira-blue flex items-center justify-center">
              <GraduationCap className="h-6 w-6 text-white" />
            </div>
            <span className="text-fronteira-gray-900 group-hover:text-fronteira-primary transition-colors">
              Acesso Rápido
            </span>
          </CardTitle>
          <CardDescription className="text-lg text-fronteira-gray-600">
            Principais funcionalidades do sistema educacional
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-6">
            {[
              { name: 'Cadastrar Aluno', href: '/dashboard/alunos/novo', icon: Users, color: 'from-blue-500 to-blue-600', emoji: '👥' },
              { name: 'Nova Matrícula', href: '/dashboard/matriculas/nova', icon: UserCheck, color: 'from-green-500 to-green-600', emoji: '📝' },
              { name: 'Lançar Frequência', href: '/dashboard/frequencia', icon: Calendar, color: 'from-orange-500 to-orange-600', emoji: '📊' },
              { name: 'Criar Turma', href: '/dashboard/turmas/nova', icon: GraduationCap, color: 'from-purple-500 to-purple-600', emoji: '🏫' },
              { name: 'Relatórios', href: '/dashboard/relatorios', icon: TrendingUp, color: 'from-pink-500 to-pink-600', emoji: '📈' },
              { name: 'Configurações', href: '/dashboard/configuracoes', icon: Settings, color: 'from-gray-500 to-gray-600', emoji: '⚙️' },
            ].map((item) => (
              <Link key={item.name} href={item.href}>
                <div className="group/item flex flex-col items-center p-6 rounded-2xl border border-gray-200 hover:border-fronteira-primary/30 bg-white hover:bg-gradient-to-b hover:from-white hover:to-fronteira-primary/5 transition-all duration-300 cursor-pointer hover:shadow-lg transform hover:-translate-y-1">
                  <div className={`h-16 w-16 rounded-2xl bg-gradient-to-r ${item.color} flex items-center justify-center mb-4 shadow-lg group-hover/item:scale-110 transition-transform duration-200`}>
                    <span className="text-2xl">{item.emoji}</span>
                  </div>
                  <span className="text-sm font-semibold text-center text-gray-700 group-hover/item:text-fronteira-primary transition-colors">
                    {item.name}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}