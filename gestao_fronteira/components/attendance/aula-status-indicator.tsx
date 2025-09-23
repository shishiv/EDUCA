'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { toast } from '@/components/ui/use-toast'
import {
  Lock,
  Unlock,
  Timer,
  CheckCircle,
  AlertCircle,
  Loader2,
  RefreshCw,
  Wifi,
  WifiOff,
  Clock
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import {
  AulasAbertasListener,
  createTeacherAulasListener,
  type AulaAbertaData,
  type AulaStatusChange
} from '@/lib/realtime/aulas-abertas-listener'

interface AulaStatus {
  id: string
  status: 'aberta' | 'fechada' | 'travada'
  aberta_em: string
  fechada_em?: string
  travada_em?: string
  tempo_limite_minutos: number
}

interface AulaStatusIndicatorProps {
  aulaId?: string
  turmaId: string
  professorId: string
  className?: string
  showConnectionStatus?: boolean
  enableNotifications?: boolean
  onStatusChange?: (status: AulaStatus) => void
  onTimeWarning?: (minutesRemaining: number) => void
}

export function AulaStatusIndicator({
  aulaId,
  turmaId,
  professorId,
  className,
  showConnectionStatus = false,
  enableNotifications = true,
  onStatusChange,
  onTimeWarning
}: AulaStatusIndicatorProps) {
  const [status, setStatus] = useState<AulaStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [remainingTime, setRemainingTime] = useState<number | null>(null)
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'error' | 'reconnecting'>('disconnected')
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)

  const listenerRef = useRef<AulasAbertasListener | null>(null)

  const formatTime = (date: string) => {
    return new Date(date).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'America/Sao_Paulo'
    })
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      timeZone: 'America/Sao_Paulo'
    })
  }

  const calculateRemainingTime = useCallback((aulaStatus: AulaStatus) => {
    if (aulaStatus.status !== 'fechada' || !aulaStatus.fechada_em) {
      return null
    }

    const fechadaEm = new Date(aulaStatus.fechada_em)
    const seraTravadasEm = new Date(fechadaEm.getTime() + (aulaStatus.tempo_limite_minutos * 60 * 1000))
    const agora = new Date()

    const tempoRestanteMs = seraTravadasEm.getTime() - agora.getTime()

    if (tempoRestanteMs <= 0) {
      return 0
    }

    return Math.floor(tempoRestanteMs / (1000 * 60)) // minutes
  }, [])

  const fetchAulaStatus = useCallback(async () => {
    try {
      setError(null)

      if (!aulaId) {
        // Try to find active session for today
        const hoje = new Date().toISOString().split('T')[0]

        const { data, error } = await supabase
          .from('aulas_abertas')
          .select('*')
          .eq('turma_id', turmaId)
          .eq('professor_id', professorId)
          .gte('aberta_em', `${hoje}T00:00:00`)
          .lt('aberta_em', `${hoje}T23:59:59`)
          .single()

        if (error && error.code !== 'PGRST116') {
          throw error
        }

        if (data) {
          const aulaStatus = data as AulaStatus
          setStatus(aulaStatus)
          setRemainingTime(calculateRemainingTime(aulaStatus))
          onStatusChange?.(aulaStatus)
        } else {
          setStatus(null)
          setRemainingTime(null)
        }
      } else {
        // Fetch specific session
        const { data, error } = await supabase
          .from('aulas_abertas')
          .select('*')
          .eq('id', aulaId)
          .single()

        if (error) {
          if (error.code === 'PGRST116') {
            setStatus(null)
            setRemainingTime(null)
            return
          }
          throw error
        }

        const aulaStatus = data as AulaStatus
        setStatus(aulaStatus)
        setRemainingTime(calculateRemainingTime(aulaStatus))
        onStatusChange?.(aulaStatus)
      }
    } catch (err: any) {
      console.error('Erro ao buscar status da aula:', err)
      setError('Erro ao carregar status da aula')
    } finally {
      setLoading(false)
    }
  }, [aulaId, turmaId, professorId, calculateRemainingTime, onStatusChange])

  // Update remaining time every minute for closed sessions
  useEffect(() => {
    if (!status || status.status !== 'fechada') {
      return
    }

    const interval = setInterval(() => {
      const newRemainingTime = calculateRemainingTime(status)
      setRemainingTime(newRemainingTime)

      // Auto-update status if time has expired
      if (newRemainingTime === 0) {
        fetchAulaStatus()
      }
    }, 60000) // Update every minute

    return () => clearInterval(interval)
  }, [status, calculateRemainingTime, fetchAulaStatus])

  // Set up enhanced real-time subscription
  useEffect(() => {
    fetchAulaStatus()

    // Setup enhanced real-time listener
    if (!listenerRef.current) {
      listenerRef.current = createTeacherAulasListener(professorId, {
        onAulaOpened: (aula: AulaAbertaData) => {
          if (aula.turma_id === turmaId) {
            const aulaStatus: AulaStatus = {
              id: aula.id,
              status: aula.status,
              aberta_em: aula.aberta_em,
              fechada_em: aula.fechada_em,
              travada_em: aula.travada_em,
              tempo_limite_minutos: aula.tempo_limite_minutos
            }
            setStatus(aulaStatus)
            setRemainingTime(calculateRemainingTime(aulaStatus))
            setLastUpdate(new Date())
            onStatusChange?.(aulaStatus)

            if (enableNotifications) {
              toast({
                title: "Aula Aberta",
                description: `Frequência liberada para marcação`,
                variant: "default"
              })
            }
          }
        },

        onAulaClosed: (aula: AulaAbertaData) => {
          if (aula.turma_id === turmaId) {
            const aulaStatus: AulaStatus = {
              id: aula.id,
              status: aula.status,
              aberta_em: aula.aberta_em,
              fechada_em: aula.fechada_em,
              travada_em: aula.travada_em,
              tempo_limite_minutos: aula.tempo_limite_minutos
            }
            setStatus(aulaStatus)
            setRemainingTime(calculateRemainingTime(aulaStatus))
            setLastUpdate(new Date())
            onStatusChange?.(aulaStatus)

            if (enableNotifications) {
              toast({
                title: "Aula Fechada",
                description: `Aguardando travamento automático`,
                variant: "default"
              })
            }
          }
        },

        onAulaLocked: (aula: AulaAbertaData, isAutomatic: boolean) => {
          if (aula.turma_id === turmaId) {
            const aulaStatus: AulaStatus = {
              id: aula.id,
              status: aula.status,
              aberta_em: aula.aberta_em,
              fechada_em: aula.fechada_em,
              travada_em: aula.travada_em,
              tempo_limite_minutos: aula.tempo_limite_minutos
            }
            setStatus(aulaStatus)
            setRemainingTime(0)
            setLastUpdate(new Date())
            onStatusChange?.(aulaStatus)

            if (enableNotifications) {
              toast({
                title: "Aula Travada",
                description: isAutomatic
                  ? "Registro bloqueado automaticamente às 18:00"
                  : "Registro permanentemente bloqueado",
                variant: "destructive"
              })
            }
          }
        },

        onTimeWarning: (aula: AulaAbertaData, minutesRemaining: number) => {
          if (aula.turma_id === turmaId) {
            onTimeWarning?.(minutesRemaining)

            if (enableNotifications) {
              const urgency = minutesRemaining <= 10 ? "destructive" : "default"
              toast({
                title: `${minutesRemaining} minutos restantes`,
                description: minutesRemaining <= 10
                  ? "Tempo crítico! Conclua a marcação de frequência"
                  : "Tempo se esgotando para marcação de frequência",
                variant: urgency
              })
            }
          }
        },

        onStatusChange: (aula: AulaAbertaData, change: AulaStatusChange) => {
          if (aula.turma_id === turmaId) {
            setLastUpdate(new Date())

            // Log status transitions for compliance
            console.log('Aula status change:', {
              id: aula.id,
              turma_id: aula.turma_id,
              previous: change.previousStatus,
              new: change.newStatus,
              changedBy: change.changedBy,
              timestamp: change.timestamp,
              metadata: change.metadata
            })
          }
        },

        onConnectionChange: (status) => {
          setConnectionStatus(status)

          if (enableNotifications) {
            if (status === 'connected') {
              toast({
                title: "Conexão Restabelecida",
                description: "Atualizações em tempo real ativas",
                variant: "default"
              })
            } else if (status === 'error') {
              toast({
                title: "Problema de Conexão",
                description: "Tentando reconectar...",
                variant: "destructive"
              })
            }
          }
        },

        onError: (error, context) => {
          console.error('AulaStatusIndicator error:', error, context)
          setError(`Erro na conexão: ${error.message}`)

          if (enableNotifications) {
            toast({
              title: "Erro de Conexão",
              description: "Problema na atualização em tempo real",
              variant: "destructive"
            })
          }
        }
      })

      listenerRef.current.start()
    }

    return () => {
      if (listenerRef.current) {
        listenerRef.current.stop()
        listenerRef.current = null
      }
    }
  }, [
    turmaId,
    professorId,
    enableNotifications,
    calculateRemainingTime,
    onStatusChange,
    onTimeWarning,
    fetchAulaStatus
  ])

  const handleRetry = () => {
    setLoading(true)
    setError(null)
    fetchAulaStatus()
  }

  const getConnectionStatusIcon = () => {
    switch (connectionStatus) {
      case 'connected':
        return <Wifi className="h-3 w-3 text-green-600" />
      case 'reconnecting':
        return <Loader2 className="h-3 w-3 animate-spin text-yellow-600" />
      case 'error':
      case 'disconnected':
        return <WifiOff className="h-3 w-3 text-red-600" />
      default:
        return null
    }
  }

  const ConnectionStatusBadge = () => {
    if (!showConnectionStatus) return null

    return (
      <div className="flex items-center gap-1 text-xs">
        {getConnectionStatusIcon()}
        <span className={cn(
          'capitalize',
          connectionStatus === 'connected' ? 'text-green-600' :
          connectionStatus === 'reconnecting' ? 'text-yellow-600' :
          'text-red-600'
        )}>
          {connectionStatus === 'connected' ? 'Online' :
           connectionStatus === 'reconnecting' ? 'Reconectando' :
           connectionStatus === 'error' ? 'Erro' : 'Offline'}
        </span>
        {lastUpdate && connectionStatus === 'connected' && (
          <span className="text-gray-500 ml-1">
            • {lastUpdate.toLocaleTimeString('pt-BR', {
              hour: '2-digit',
              minute: '2-digit'
            })}
          </span>
        )}
      </div>
    )
  }

  if (loading) {
    return (
      <div
        className={cn('flex items-center gap-2 p-3 rounded-lg bg-gray-50', className)}
        data-testid="aula-status-indicator"
        aria-label="Carregando status da aula"
      >
        <Loader2 className="h-4 w-4 animate-spin" data-testid="loading-spinner" />
        <div className="flex-1">
          <span className="text-sm text-gray-600">Carregando status...</span>
          <ConnectionStatusBadge />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <Alert className={cn('border-red-200 bg-red-50', className)}>
        <AlertCircle className="h-4 w-4 text-red-600" />
        <AlertDescription className="flex items-center justify-between">
          <span className="text-red-800">Erro ao carregar status da aula</span>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRetry}
            className="text-red-700 border-red-300 hover:bg-red-100"
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            Tentar novamente
          </Button>
        </AlertDescription>
      </Alert>
    )
  }

  if (!status) {
    return (
      <div
        className={cn('flex items-center gap-2 p-3 rounded-lg bg-gray-50 border border-gray-200', className)}
        data-testid="aula-status-indicator"
        aria-label="Status da aula: não aberta"
      >
        <Lock className="h-4 w-4 text-gray-500" data-testid="lock-icon" />
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-700">Aula Não Aberta</span>
            <Badge
              variant="outline"
              className="bg-gray-100 border-gray-300 text-gray-600"
              data-testid="status-badge"
            >
              Inativa
            </Badge>
          </div>
          <p className="text-xs text-gray-500 mt-1">Nenhuma sessão ativa para hoje</p>
        </div>
        <span className="sr-only" data-testid="sr-status-text">
          Aula não aberta, nenhuma sessão ativa
        </span>
      </div>
    )
  }

  const getStatusDisplay = () => {
    switch (status.status) {
      case 'aberta':
        return (
          <div
            className={cn('flex items-center gap-2 p-3 rounded-lg bg-green-50 border border-green-200', className)}
            data-testid="aula-status-indicator"
            aria-label="Status da aula: aberta e ativa"
          >
            <Unlock className="h-4 w-4 text-green-600" data-testid="unlock-icon" />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium text-green-800">Aula Aberta</span>
                <Badge
                  variant="outline"
                  className="bg-green-100 border-green-300 text-green-700"
                  data-testid="status-badge"
                >
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Ativa
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-xs text-green-700">
                  Frequência liberada • Aberta às {formatTime(status.aberta_em)}
                </p>
                <ConnectionStatusBadge />
              </div>
            </div>
            <span className="sr-only" data-testid="sr-status-text">
              Aula aberta e ativa, frequência liberada para marcação
            </span>
          </div>
        )

      case 'fechada':
        return (
          <div
            className={cn('flex items-center gap-2 p-3 rounded-lg bg-yellow-50 border border-yellow-200', className)}
            data-testid="aula-status-indicator"
            aria-label="Status da aula: fechada, aguardando travamento"
          >
            <Timer className="h-4 w-4 text-yellow-600" />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium text-yellow-800">Aula Fechada</span>
                <Badge
                  variant="outline"
                  className="bg-yellow-100 border-yellow-300 text-yellow-700"
                  data-testid="status-badge"
                >
                  Aguardando travamento
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-xs text-yellow-700">
                  {remainingTime !== null && remainingTime > 0 ? (
                    <>Tempo para alterações: {remainingTime} minutos</>
                  ) : (
                    <>Tempo esgotado - será travada automaticamente</>
                  )}
                </p>
                <ConnectionStatusBadge />
              </div>
            </div>
            <span className="sr-only" data-testid="sr-status-text">
              Aula fechada, {remainingTime !== null && remainingTime > 0
                ? `${remainingTime} minutos restantes para alterações`
                : 'tempo para alterações esgotado'}
            </span>
          </div>
        )

      case 'travada':
        return (
          <div
            className={cn('flex flex-col gap-3 p-4 rounded-lg bg-red-50 border border-red-200', className)}
            data-testid="aula-status-indicator"
            aria-label="Status da aula: travada permanentemente"
          >
            <div className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-red-600" />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-red-800">Aula Travada</span>
                  <Badge
                    variant="outline"
                    className="bg-red-100 border-red-300 text-red-700"
                    data-testid="status-badge"
                  >
                    Registro imutável
                  </Badge>
                </div>
                <p className="text-xs text-red-700 mt-1">
                  Travada às {formatTime(status.travada_em!)} • {formatDate(status.travada_em!)}
                </p>
              </div>
            </div>

            <Alert className="bg-red-100 border-red-300">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800 text-xs">
                <strong>Documento oficial:</strong> Este registro de frequência está
                permanentemente bloqueado conforme a legislação educacional brasileira.
                Não é possível realizar alterações.
              </AlertDescription>
            </Alert>

            <span className="sr-only" data-testid="sr-status-text">
              Aula travada permanentemente, registro imutável conforme legislação educacional brasileira
            </span>
          </div>
        )

      default:
        return null
    }
  }

  return getStatusDisplay()
}