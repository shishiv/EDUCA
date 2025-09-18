'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { StatsCard } from '@/components/dashboard/stats-card'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Users, School, UserCheck, GraduationCap, AlertCircle, TrendingUp, Calendar, Clock } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import Link from 'next/link'

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

  return (
    <div className="space-y-8">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {getGreeting()}, {userProfile?.nome?.split(' ')[0] || 'Usuário'}!
          </h1>
          <p className="text-gray-600 mt-1">
            Acompanhe as principais informações do sistema educacional
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Badge variant="outline" className="px-3 py-1">
            Ano Letivo 2024
          </Badge>
          <Button asChild>
            <Link href="/dashboard/matriculas">
              Nova Matrícula
            </Link>
          </Button>
        </div>
      </div>

      {/* Cards de Estatísticas */}
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

      {/* Segunda linha de cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Frequência Geral */}
        <Card className="card-hover">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Frequência Geral</span>
              <TrendingUp className="h-5 w-5 text-green-600" />
            </CardTitle>
            <CardDescription>
              Média de frequência dos alunos matriculados
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold text-green-600">
                  {stats.frequenciaMedia}%
                </span>
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                  Meta: 75%
                </Badge>
              </div>
              <Progress value={stats.frequenciaMedia} className="h-3" />
              <p className="text-sm text-gray-600">
                Resultado excelente! Acima da meta estabelecida.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Alertas */}
        <Card className="card-hover border-yellow-200 bg-yellow-50">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-yellow-800">
              <AlertCircle className="h-5 w-5" />
              <span>Alertas</span>
            </CardTitle>
            <CardDescription className="text-yellow-600">
              Itens que precisam de atenção
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-white rounded-lg border">
                <div>
                  <p className="font-medium text-gray-900">Baixa Frequência</p>
                  <p className="text-sm text-gray-600">
                    {stats.alunosComBaixaFrequencia} aluno abaixo de 75%
                  </p>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/dashboard/frequencia">
                    Ver Detalhes
                  </Link>
                </Button>
              </div>
              <div className="flex items-center justify-between p-3 bg-white rounded-lg border">
                <div>
                  <p className="font-medium text-gray-900">Documentos Pendentes</p>
                  <p className="text-sm text-gray-600">2 alunos com docs incompletos</p>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/dashboard/alunos">
                    Verificar
                  </Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Atividades Recentes */}
        <Card className="card-hover">
          <CardHeader>
            <CardTitle>Atividades Recentes</CardTitle>
            <CardDescription>
              Últimas ações realizadas no sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {activities.map((activity) => {
                const Icon = getActivityIcon(activity.type)
                return (
                  <div key={activity.id} className="flex items-start space-x-3">
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center ${getActivityColor(activity.type)}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">
                        {activity.description}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(activity.timestamp).toLocaleString('pt-BR')}
                      </p>
                    </div>
                  </div>
                )
              })}
              <Button variant="outline" className="w-full mt-4" asChild>
                <Link href="/dashboard/atividades">
                  Ver Todas Atividades
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Acesso Rápido */}
      <Card className="card-hover">
        <CardHeader>
          <CardTitle>Acesso Rápido</CardTitle>
          <CardDescription>
            Principais funcionalidades do sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              { name: 'Cadastrar Aluno', href: '/dashboard/alunos/novo', icon: Users, color: 'bg-blue-100 text-blue-600' },
              { name: 'Nova Matrícula', href: '/dashboard/matriculas/nova', icon: UserCheck, color: 'bg-green-100 text-green-600' },
              { name: 'Lançar Frequência', href: '/dashboard/frequencia', icon: Calendar, color: 'bg-orange-100 text-orange-600' },
              { name: 'Criar Turma', href: '/dashboard/turmas/nova', icon: GraduationCap, color: 'bg-purple-100 text-purple-600' },
              { name: 'Relatórios', href: '/dashboard/relatorios', icon: TrendingUp, color: 'bg-pink-100 text-pink-600' },
              { name: 'Configurações', href: '/dashboard/configuracoes', icon: AlertCircle, color: 'bg-gray-100 text-gray-600' },
            ].map((item) => (
              <Link key={item.name} href={item.href}>
                <div className="flex flex-col items-center p-4 rounded-lg border hover:bg-gray-50 transition-colors cursor-pointer">
                  <div className={`h-12 w-12 rounded-lg flex items-center justify-center mb-2 ${item.color}`}>
                    <item.icon className="h-6 w-6" />
                  </div>
                  <span className="text-sm font-medium text-center">{item.name}</span>
                </div>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}