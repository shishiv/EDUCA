'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  AlertTriangle,
  RefreshCw,
  TrendingUp,
  Users,
  Clock,
  Activity,
  Download,
  Filter
} from 'lucide-react'
import { LogEntry, LogLevel } from '@/lib/logger'
import { EducationalError, ErrorSeverity } from '@/lib/error-handling'

interface ErrorStats {
  total: number
  byLevel: Record<LogLevel, number>
  bySeverity: Record<ErrorSeverity, number>
  byFeature: Record<string, number>
  trends: {
    hourly: number[]
    daily: number[]
  }
  topErrors: Array<{
    message: string
    count: number
    lastSeen: string
  }>
}

interface ErrorLog {
  id: string
  timestamp: string
  level: LogLevel
  message: string
  context?: any
  error?: string
  user_id: string
  details?: any
}

export function ErrorMonitoringDashboard() {
  const [logs, setLogs] = useState<ErrorLog[]>([])
  const [stats, setStats] = useState<ErrorStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedLevel, setSelectedLevel] = useState<LogLevel | 'all'>('all')
  const [autoRefresh, setAutoRefresh] = useState(false)

  useEffect(() => {
    loadLogs()

    if (autoRefresh) {
      const interval = setInterval(loadLogs, 30000) // Refresh every 30 seconds
      return () => clearInterval(interval)
    }
  }, [selectedLevel, autoRefresh])

  const loadLogs = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()

      if (selectedLevel !== 'all') {
        params.append('level', selectedLevel)
      }

      const response = await fetch(`/api/logs?${params.toString()}`)

      if (!response.ok) {
        throw new Error('Failed to fetch logs')
      }

      const data = await response.json()
      setLogs(data.logs)

      // Calculate stats
      const calculatedStats = calculateStats(data.logs)
      setStats(calculatedStats)

    } catch (error) {
      console.error('Failed to load error logs:', error)
    } finally {
      setLoading(false)
    }
  }

  const calculateStats = (logs: ErrorLog[]): ErrorStats => {
    const stats: ErrorStats = {
      total: logs.length,
      byLevel: {
        debug: 0,
        info: 0,
        warn: 0,
        error: 0,
        critical: 0
      },
      bySeverity: {
        low: 0,
        medium: 0,
        high: 0,
        critical: 0
      },
      byFeature: {},
      trends: {
        hourly: new Array(24).fill(0),
        daily: new Array(7).fill(0)
      },
      topErrors: []
    }

    const errorCounts: Record<string, number> = {}
    const errorLastSeen: Record<string, string> = {}

    logs.forEach(log => {
      // Count by level
      if (log.level in stats.byLevel) {
        stats.byLevel[log.level as LogLevel]++
      }

      // Count by severity (map from level)
      const severity = mapLevelToSeverity(log.level as LogLevel)
      if (severity in stats.bySeverity) {
        stats.bySeverity[severity]++
      }

      // Count by feature
      const feature = log.details?.feature || 'unknown'
      stats.byFeature[feature] = (stats.byFeature[feature] || 0) + 1

      // Track error frequencies
      const errorKey = log.message
      errorCounts[errorKey] = (errorCounts[errorKey] || 0) + 1
      errorLastSeen[errorKey] = log.timestamp

      // Calculate hourly trends
      const hour = new Date(log.timestamp).getHours()
      stats.trends.hourly[hour]++

      // Calculate daily trends
      const dayOfWeek = new Date(log.timestamp).getDay()
      stats.trends.daily[dayOfWeek]++
    })

    // Get top errors
    stats.topErrors = Object.entries(errorCounts)
      .map(([message, count]) => ({
        message,
        count,
        lastSeen: errorLastSeen[message]
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    return stats
  }

  const mapLevelToSeverity = (level: LogLevel): ErrorSeverity => {
    switch (level) {
      case 'critical':
        return ErrorSeverity.CRITICAL
      case 'error':
        return ErrorSeverity.HIGH
      case 'warn':
        return ErrorSeverity.MEDIUM
      default:
        return ErrorSeverity.LOW
    }
  }

  const getLevelColor = (level: LogLevel): string => {
    switch (level) {
      case 'critical':
        return 'bg-red-500'
      case 'error':
        return 'bg-red-400'
      case 'warn':
        return 'bg-yellow-500'
      case 'info':
        return 'bg-blue-500'
      case 'debug':
        return 'bg-gray-500'
      default:
        return 'bg-gray-400'
    }
  }

  const formatTimestamp = (timestamp: string): string => {
    return new Date(timestamp).toLocaleString('pt-BR')
  }

  const exportLogs = () => {
    const csvContent = [
      'Timestamp,Level,Message,Feature,User,Error',
      ...logs.map(log => [
        log.timestamp,
        log.level,
        `"${log.message.replace(/"/g, '""')}"`,
        log.details?.feature || '',
        log.user_id,
        log.error ? `"${log.error.replace(/"/g, '""')}"` : ''
      ].join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `error-logs-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-6 w-6 animate-spin mr-2" />
        Carregando logs de erro...
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Monitoramento de Erros</h2>
          <p className="text-gray-600">
            Sistema de monitoramento para a plataforma educacional
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={autoRefresh ? 'bg-green-50 border-green-200' : ''}
          >
            <Activity className="h-4 w-4 mr-2" />
            {autoRefresh ? 'Auto Refresh ON' : 'Auto Refresh OFF'}
          </Button>

          <Button variant="outline" onClick={loadLogs}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>

          <Button variant="outline" onClick={exportLogs}>
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total de Logs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-gray-600">últimas 24 horas</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Erros Críticos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {stats.byLevel.critical + stats.byLevel.error}
              </div>
              <p className="text-xs text-gray-600">requerem atenção</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Funcionalidades Afetadas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {Object.keys(stats.byFeature).length}
              </div>
              <p className="text-xs text-gray-600">módulos do sistema</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Taxa de Erro</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.total > 0 ?
                  ((stats.byLevel.error + stats.byLevel.critical) / stats.total * 100).toFixed(1)
                  : '0'
                }%
              </div>
              <p className="text-xs text-gray-600">erros críticos</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Critical Alerts */}
      {stats && stats.byLevel.critical > 0 && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            <strong>Atenção:</strong> Foram detectados {stats.byLevel.critical} erros críticos
            que podem afetar a experiência dos usuários no sistema educacional.
          </AlertDescription>
        </Alert>
      )}

      {/* Tabs */}
      <Tabs defaultValue="logs" className="w-full">
        <TabsList>
          <TabsTrigger value="logs">Lista de Logs</TabsTrigger>
          <TabsTrigger value="analysis">Análise</TabsTrigger>
          <TabsTrigger value="trends">Tendências</TabsTrigger>
        </TabsList>

        <TabsContent value="logs" className="space-y-4">
          {/* Filters */}
          <div className="flex gap-2 items-center">
            <Filter className="h-4 w-4" />
            <span className="text-sm">Filtrar por nível:</span>
            {(['all', 'critical', 'error', 'warn', 'info', 'debug'] as const).map(level => (
              <Button
                key={level}
                variant={selectedLevel === level ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedLevel(level)}
              >
                {level === 'all' ? 'Todos' : level}
              </Button>
            ))}
          </div>

          {/* Logs List */}
          <div className="space-y-2">
            {logs.map((log, index) => (
              <Card key={index} className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge
                        className={`${getLevelColor(log.level as LogLevel)} text-white`}
                      >
                        {log.level.toUpperCase()}
                      </Badge>
                      <span className="text-sm text-gray-600">
                        {formatTimestamp(log.timestamp)}
                      </span>
                      {log.details?.feature && (
                        <Badge variant="outline">
                          {log.details.feature}
                        </Badge>
                      )}
                    </div>

                    <p className="font-medium mb-1">{log.message}</p>

                    {log.error && (
                      <div className="text-sm text-red-600 bg-red-50 p-2 rounded mt-2">
                        <strong>Erro:</strong> {log.error}
                      </div>
                    )}

                    {log.context && (
                      <details className="mt-2">
                        <summary className="text-sm text-gray-600 cursor-pointer">
                          Contexto Técnico
                        </summary>
                        <pre className="text-xs bg-gray-100 p-2 rounded mt-1 overflow-x-auto">
                          {JSON.stringify(log.context, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>

                  <div className="text-xs text-gray-500">
                    User: {log.user_id.slice(0, 8)}...
                  </div>
                </div>
              </Card>
            ))}

            {logs.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                Nenhum log encontrado para os filtros selecionados.
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="analysis">
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Top Errors */}
              <Card>
                <CardHeader>
                  <CardTitle>Erros Mais Frequentes</CardTitle>
                  <CardDescription>
                    Principais problemas no sistema educacional
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {stats.topErrors.map((error, index) => (
                      <div key={index} className="flex justify-between items-center">
                        <div className="flex-1">
                          <p className="text-sm font-medium truncate">
                            {error.message}
                          </p>
                          <p className="text-xs text-gray-500">
                            Última ocorrência: {formatTimestamp(error.lastSeen)}
                          </p>
                        </div>
                        <Badge variant="outline">
                          {error.count}x
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Features Affected */}
              <Card>
                <CardHeader>
                  <CardTitle>Funcionalidades Afetadas</CardTitle>
                  <CardDescription>
                    Módulos educacionais com erros
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {Object.entries(stats.byFeature)
                      .sort(([,a], [,b]) => b - a)
                      .slice(0, 10)
                      .map(([feature, count]) => (
                      <div key={feature} className="flex justify-between items-center">
                        <span className="text-sm">{feature}</span>
                        <Badge variant="outline">{count}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="trends">
          <Card>
            <CardHeader>
              <CardTitle>Análise de Tendências</CardTitle>
              <CardDescription>
                Padrões de erro ao longo do tempo
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-gray-500">
                <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Gráficos de tendência serão implementados em breve.</p>
                <p className="text-sm">
                  Integração com bibliotecas de visualização planejada.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default ErrorMonitoringDashboard