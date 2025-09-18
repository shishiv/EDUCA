'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { AuditLog } from '@/lib/auth'
import { Shield, Calendar, User, Activity, RefreshCw } from 'lucide-react'

export function AuditLogViewer() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)

  const loadLogs = () => {
    setLoading(true)
    try {
      // Load logs from localStorage (in production, this would be from the database)
      const storedLogs = localStorage.getItem('auth_audit_logs')
      const parsedLogs: AuditLog[] = storedLogs ? JSON.parse(storedLogs) : []

      // Sort by most recent first
      const sortedLogs = parsedLogs.sort(
        (a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
      )

      setLogs(sortedLogs)
    } catch (error) {
      // console.error('Error loading audit logs:', error)
      setLogs([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadLogs()
  }, [])

  const getActionLabel = (action: AuditLog['action']) => {
    const labels = {
      login: 'Login realizado',
      logout: 'Logout realizado',
      login_failed: 'Tentativa de login falhada',
      session_expired: 'Sessão expirada',
      password_changed: 'Senha alterada',
    }
    return labels[action] || action
  }

  const getActionColor = (action: AuditLog['action']) => {
    const colors = {
      login: 'bg-green-100 text-green-800',
      logout: 'bg-blue-100 text-blue-800',
      login_failed: 'bg-red-100 text-red-800',
      session_expired: 'bg-yellow-100 text-yellow-800',
      password_changed: 'bg-purple-100 text-purple-800',
    }
    return colors[action] || 'bg-gray-100 text-gray-800'
  }

  const getActionIcon = (action: AuditLog['action']) => {
    switch (action) {
      case 'login':
        return '🔓'
      case 'logout':
        return '🔐'
      case 'login_failed':
        return '❌'
      case 'session_expired':
        return '⏰'
      case 'password_changed':
        return '🔑'
      default:
        return '📝'
    }
  }

  const clearLogs = () => {
    localStorage.removeItem('auth_audit_logs')
    setLogs([])
  }

  if (loading) {
    return (
      <Card className="w-full">
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-8 w-8 animate-spin" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Logs de Auditoria
        </CardTitle>
        <CardDescription>
          Histórico de eventos de autenticação e segurança
        </CardDescription>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadLogs}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={clearLogs}
            disabled={logs.length === 0}
          >
            Limpar Logs
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        {logs.length === 0 ? (
          <div className="text-center py-8">
            <Activity className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-500">Nenhum log de auditoria encontrado</p>
            <p className="text-sm text-gray-400 mt-2">
              Os eventos de autenticação aparecerão aqui
            </p>
          </div>
        ) : (
          <ScrollArea className="h-[400px]">
            <div className="space-y-4">
              {logs.map((log, index) => (
                <div key={index} className="p-4 border rounded-lg bg-gray-50">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{getActionIcon(log.action)}</span>
                      <div>
                        <Badge className={getActionColor(log.action)}>
                          {getActionLabel(log.action)}
                        </Badge>
                      </div>
                    </div>

                    <div className="text-sm text-gray-500 flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {log.created_at
                        ? new Date(log.created_at).toLocaleString('pt-BR')
                        : 'Data não disponível'
                      }
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-gray-700 flex items-center gap-1">
                        <User className="h-3 w-3" />
                        Usuário:
                      </span>
                      <span className="text-gray-600 ml-1">
                        {log.user_id === 'anonymous' ? 'Não autenticado' : log.user_id.slice(0, 8) + '...'}
                      </span>
                    </div>

                    {log.details && Object.keys(log.details).length > 0 && (
                      <div className="md:col-span-2">
                        <span className="font-medium text-gray-700">Detalhes:</span>
                        <div className="bg-white p-2 rounded mt-1 border">
                          <pre className="text-xs text-gray-600 whitespace-pre-wrap">
                            {JSON.stringify(log.details, null, 2)}
                          </pre>
                        </div>
                      </div>
                    )}

                    {log.ip_address && (
                      <div>
                        <span className="font-medium text-gray-700">IP:</span>
                        <span className="text-gray-600 ml-1">{log.ip_address}</span>
                      </div>
                    )}

                    {log.user_agent && (
                      <div>
                        <span className="font-medium text-gray-700">User Agent:</span>
                        <span className="text-gray-600 ml-1 text-xs">
                          {log.user_agent.slice(0, 50)}...
                        </span>
                      </div>
                    )}
                  </div>

                  {index < logs.length - 1 && <Separator className="mt-4" />}
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  )
}