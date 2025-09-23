/**
 * SessionDashboard Component - Administrative Monitoring & Compliance
 * Brazilian Educational Standards Dashboard with Real-time Updates
 * Task 3: Frontend Components - SessionDashboard
 */

'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
  Calendar,
  Users,
  AlertTriangle,
  CheckCircle,
  Clock,
  Lock,
  TrendingUp,
  Activity,
  School,
  FileText,
  Settings,
  RefreshCw
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DatePickerWithRange } from '@/components/ui/date-range-picker'
import { ScrollArea } from '@/components/ui/scroll-area'
import { toast } from '@/components/ui/use-toast'
import { cn } from '@/lib/utils'
import { SessionRealtimeManager, createAdminRealtimeManager } from '@/lib/realtime/session-realtime'
import { addDays, format, subDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'

// Types
interface DashboardData {
  overview: {
    total_sessions: number
    by_phase: {
      planejamento: number
      chamada: number
      finalizada: number
      bloqueada: number
    }
    compliance: {
      compliant: number
      non_compliant: number
      pending: number
    }
    attendance: {
      total_students: number
      total_present: number
      average_attendance: number
    }
  }
  active_sessions: Array<{
    id: string
    fase: string
    bloqueado: boolean
    data_aula: string
    total_alunos: number
    total_presentes: number
    updated_at: string
    turmas: {
      id: string
      nome: string
    }
    users: {
      nome_completo: string
    }
    requires_attention: boolean
    time_until_lock: { hours: number; minutes: number; overdue: boolean }
    completion_percentage: number
  }>
  compliance: {
    average_compliance_score: number
    total_sessions: number
    sessions_with_issues: number
    recent_violations: Array<{
      session_date: string
      turma: string
      professor: string
      compliance_score: number
      issues: string[]
    }>
  }
  recent_activity: Array<{
    id: string
    action: string
    timestamp: string
    user_name: string
    description: string
  }>
  alerts: Array<{
    type: string
    severity: 'high' | 'medium' | 'low'
    title: string
    message: string
    count: number
    action_required: boolean
  }>
}

interface SessionDashboardProps {
  user: {
    id: string
    tipo_usuario: string
    escola_id: string
    nome_completo: string
  }
  className?: string
}

export default function SessionDashboard({ user, className }: SessionDashboardProps) {
  // State
  const [data, setData] = useState<DashboardData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedDateRange, setSelectedDateRange] = useState({
    from: subDays(new Date(), 7),
    to: new Date()
  })
  const [selectedProfessor, setSelectedProfessor] = useState<string>('all')
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())

  // Refs
  const realtimeManager = useRef<SessionRealtimeManager | null>(null)
  const refreshInterval = useRef<NodeJS.Timeout | null>(null)

  // Fetch dashboard data
  const fetchDashboardData = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        date_from: format(selectedDateRange.from, 'yyyy-MM-dd'),
        date_to: format(selectedDateRange.to, 'yyyy-MM-dd'),
        include_stats: 'true'
      })

      if (user.tipo_usuario !== 'admin') {
        params.append('escola_id', user.escola_id)
      }

      if (selectedProfessor !== 'all') {
        params.append('professor_id', selectedProfessor)
      }

      const response = await fetch(`/api/sessions/dashboard?${params}`)
      if (response.ok) {
        const dashboardData = await response.json()
        setData(dashboardData)
        setLastUpdate(new Date())
      } else {
        throw new Error('Failed to fetch dashboard data')
      }
    } catch (error) {
      console.error('Error fetching dashboard:', error)
      toast({
        title: 'Erro',
        description: 'Erro ao carregar dados do painel. Tente novamente.',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }, [selectedDateRange, selectedProfessor, user])

  // Setup real-time updates
  useEffect(() => {
    if (!realtimeManager.current) {
      realtimeManager.current = createAdminRealtimeManager(user.escola_id, {
        onSessionUpdate: () => {
          // Refresh data when sessions are updated
          fetchDashboardData()
        },
        onAttendanceUpdate: () => {
          // Refresh data when attendance is updated
          fetchDashboardData()
        }
      })

      realtimeManager.current.subscribeToDashboard(user.escola_id)
    }

    return () => {
      realtimeManager.current?.unsubscribeAll()
    }
  }, [user.escola_id, fetchDashboardData])

  // Auto-refresh setup
  useEffect(() => {
    if (autoRefresh) {
      refreshInterval.current = setInterval(fetchDashboardData, 60000) // 1 minute
    } else {
      if (refreshInterval.current) {
        clearInterval(refreshInterval.current)
      }
    }

    return () => {
      if (refreshInterval.current) {
        clearInterval(refreshInterval.current)
      }
    }
  }, [autoRefresh, fetchDashboardData])

  // Initial data fetch
  useEffect(() => {
    fetchDashboardData()
  }, [fetchDashboardData])

  // Force refresh
  const handleRefresh = useCallback(() => {
    setIsLoading(true)
    fetchDashboardData()
  }, [fetchDashboardData])

  // Overview metrics component
  const OverviewMetrics = () => {
    if (!data?.overview) return null

    const metrics = [
      {
        title: 'Total de Sessões',
        value: data.overview.total_sessions,
        icon: Calendar,
        color: 'text-blue-600'
      },
      {
        title: 'Estudantes',
        value: data.overview.attendance.total_students,
        icon: Users,
        color: 'text-green-600'
      },
      {
        title: 'Presença Média',
        value: `${Math.round(data.overview.attendance.average_attendance)}%`,
        icon: TrendingUp,
        color: 'text-purple-600'
      },
      {
        title: 'Conformidade',
        value: `${Math.round((data.overview.compliance.compliant / data.overview.total_sessions) * 100)}%`,
        icon: CheckCircle,
        color: 'text-green-600'
      }
    ]

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((metric, index) => {
          const Icon = metric.icon
          return (
            <Card key={index}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      {metric.title}
                    </p>
                    <p className="text-2xl font-bold">{metric.value}</p>
                  </div>
                  <Icon className={cn('h-8 w-8', metric.color)} />
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    )
  }

  // Session phases chart
  const SessionPhasesChart = () => {
    if (!data?.overview) return null

    const phases = [
      { name: 'Planejamento', value: data.overview.by_phase.planejamento, color: 'bg-blue-500' },
      { name: 'Ativa', value: data.overview.by_phase.chamada, color: 'bg-green-500' },
      { name: 'Finalizada', value: data.overview.by_phase.finalizada, color: 'bg-orange-500' },
      { name: 'Bloqueada', value: data.overview.by_phase.bloqueada, color: 'bg-red-500' }
    ]

    const total = data.overview.total_sessions

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Fases das Sessões
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {phases.map((phase, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={cn('w-3 h-3 rounded-full', phase.color)} />
                  <span className="text-sm font-medium">{phase.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">{phase.value}</span>
                  <div className="w-20">
                    <Progress
                      value={total > 0 ? (phase.value / total) * 100 : 0}
                      className="h-2"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  // Active sessions list
  const ActiveSessionsList = () => {
    if (!data?.active_sessions) return null

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Sessões Ativas Hoje
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            {data.active_sessions.length > 0 ? (
              <div className="space-y-3">
                {data.active_sessions.map((session) => (
                  <div
                    key={session.id}
                    className={cn(
                      'p-3 rounded-lg border',
                      session.requires_attention ? 'border-red-200 bg-red-50' : 'border-gray-200'
                    )}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">{session.turmas.nome}</h4>
                        <Badge
                          variant={session.fase === 'chamada' ? 'default' : 'secondary'}
                          className={cn(
                            session.fase === 'chamada' && 'bg-green-100 text-green-800',
                            session.fase === 'finalizada' && 'bg-orange-100 text-orange-800'
                          )}
                        >
                          {session.fase === 'chamada' ? 'Ativa' : 'Finalizada'}
                        </Badge>
                      </div>
                      {session.requires_attention && (
                        <AlertTriangle className="h-4 w-4 text-red-500" />
                      )}
                    </div>

                    <div className="text-sm text-muted-foreground mb-2">
                      Prof. {session.users.nome_completo}
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="text-sm">
                        {session.total_presentes}/{session.total_alunos} presentes
                        ({session.completion_percentage}%)
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {session.time_until_lock.overdue ? (
                          <span className="text-red-600 font-medium">Atrasado</span>
                        ) : (
                          `${session.time_until_lock.hours}h ${session.time_until_lock.minutes}m para bloqueio`
                        )}
                      </div>
                    </div>

                    <Progress
                      value={session.completion_percentage}
                      className="h-1 mt-2"
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-8">
                Nenhuma sessão ativa hoje
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    )
  }

  // Compliance overview
  const ComplianceOverview = () => {
    if (!data?.compliance) return null

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Conformidade Educacional
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Pontuação Média de Conformidade</span>
              <span className="text-lg font-bold text-green-600">
                {data.compliance.average_compliance_score.toFixed(1)}%
              </span>
            </div>

            <Progress
              value={data.compliance.average_compliance_score}
              className="h-3"
            />

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Sessões Conformes</p>
                <p className="font-semibold">
                  {data.compliance.total_sessions - data.compliance.sessions_with_issues}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Com Problemas</p>
                <p className="font-semibold text-red-600">
                  {data.compliance.sessions_with_issues}
                </p>
              </div>
            </div>

            {data.compliance.recent_violations.length > 0 && (
              <div>
                <h4 className="font-medium mb-2">Violações Recentes</h4>
                <div className="space-y-2">
                  {data.compliance.recent_violations.slice(0, 3).map((violation, index) => (
                    <div key={index} className="p-2 rounded bg-red-50 border border-red-200">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-sm font-medium">{violation.turma}</p>
                          <p className="text-xs text-muted-foreground">
                            {violation.professor} - {violation.session_date}
                          </p>
                        </div>
                        <Badge variant="destructive" className="text-xs">
                          {violation.compliance_score.toFixed(0)}%
                        </Badge>
                      </div>
                      {violation.issues.length > 0 && (
                        <div className="mt-1">
                          <p className="text-xs text-red-700">
                            {violation.issues.join(', ')}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  // Recent activity feed
  const RecentActivityFeed = () => {
    if (!data?.recent_activity) return null

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Atividade Recente
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[300px]">
            {data.recent_activity.length > 0 ? (
              <div className="space-y-3">
                {data.recent_activity.map((activity) => (
                  <div key={activity.id} className="flex items-start gap-3 pb-3 border-b border-gray-100 last:border-0">
                    <div className="w-2 h-2 rounded-full bg-blue-500 mt-2 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">{activity.description}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-xs text-muted-foreground">
                          {activity.user_name}
                        </p>
                        <span className="text-xs text-muted-foreground">•</span>
                        <p className="text-xs text-muted-foreground">
                          {new Date(activity.timestamp).toLocaleTimeString('pt-BR')}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-8">
                Nenhuma atividade recente
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    )
  }

  // System alerts
  const SystemAlerts = () => {
    if (!data?.alerts || data.alerts.length === 0) return null

    return (
      <div className="space-y-3">
        {data.alerts.map((alert, index) => (
          <Alert
            key={index}
            className={cn(
              alert.severity === 'high' && 'border-red-200 bg-red-50',
              alert.severity === 'medium' && 'border-orange-200 bg-orange-50',
              alert.severity === 'low' && 'border-blue-200 bg-blue-50'
            )}
          >
            <AlertTriangle className={cn(
              'h-4 w-4',
              alert.severity === 'high' && 'text-red-600',
              alert.severity === 'medium' && 'text-orange-600',
              alert.severity === 'low' && 'text-blue-600'
            )} />
            <AlertDescription>
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">{alert.title}</h4>
                  <p className="text-sm">{alert.message}</p>
                </div>
                {alert.count > 0 && (
                  <Badge variant="outline">
                    {alert.count}
                  </Badge>
                )}
              </div>
            </AlertDescription>
          </Alert>
        ))}
      </div>
    )
  }

  if (isLoading && !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-current border-t-transparent" />
          <span>Carregando painel...</span>
        </div>
      </div>
    )
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Painel de Sessões</h1>
          <p className="text-muted-foreground">
            Monitoramento e conformidade educacional
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isLoading}
          >
            <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
            Atualizar
          </Button>

          <div className="text-xs text-muted-foreground">
            Última atualização: {lastUpdate.toLocaleTimeString('pt-BR')}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <DatePickerWithRange
          date={selectedDateRange}
          onDateChange={(range) => range && setSelectedDateRange(range)}
        />

        <Select value={selectedProfessor} onValueChange={setSelectedProfessor}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filtrar por professor" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os professores</SelectItem>
            {/* Additional professor options would be loaded here */}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="auto-refresh"
            checked={autoRefresh}
            onChange={(e) => setAutoRefresh(e.target.checked)}
            className="rounded"
          />
          <label htmlFor="auto-refresh" className="text-sm">
            Atualização automática
          </label>
        </div>
      </div>

      {/* System Alerts */}
      <SystemAlerts />

      {/* Overview Metrics */}
      <OverviewMetrics />

      {/* Main Content */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="sessions">Sessões Ativas</TabsTrigger>
          <TabsTrigger value="compliance">Conformidade</TabsTrigger>
          <TabsTrigger value="activity">Atividade</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SessionPhasesChart />
            <ComplianceOverview />
          </div>
        </TabsContent>

        <TabsContent value="sessions" className="space-y-4">
          <ActiveSessionsList />
        </TabsContent>

        <TabsContent value="compliance" className="space-y-4">
          <ComplianceOverview />
        </TabsContent>

        <TabsContent value="activity" className="space-y-4">
          <RecentActivityFeed />
        </TabsContent>
      </Tabs>
    </div>
  )
}