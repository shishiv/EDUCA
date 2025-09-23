/**
 * SessionControl Component - Enhanced "Abrir aula" Workflow
 * Three-phase session management for Brazilian educational compliance
 * Mobile-optimized with real-time updates
 */

'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { Clock, Users, CheckCircle, Lock, AlertTriangle, Wifi, WifiOff, Smartphone } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { toast } from '@/components/ui/use-toast'
import { cn } from '@/lib/utils'
import { SessionRealtimeManager, type SessionRealtimeData, type AttendanceStats } from '@/lib/realtime/session-realtime'

// Types
interface SessionControlProps {
  session: {
    id: string
    turma_id: string
    professor_id: string
    data_aula: string
    fase: 'planejamento' | 'chamada' | 'finalizada' | 'bloqueada'
    bloqueado: boolean
    bloqueado_em?: string
    total_alunos: number
    total_presentes: number
    total_ausentes: number
    turmas?: {
      nome: string
      ano_letivo: number
    }
    compliance_status: string
    can_modify: boolean
  }
  user: {
    id: string
    tipo_usuario: string
    nome_completo: string
    escola_id: string
  }
  onSessionUpdate: (session: any) => void
  onAttendanceClick?: () => void
  isMobile?: boolean
  className?: string
}

interface SessionStatus {
  phase: string
  compliance_status: string
  can_modify: boolean
  warnings: string[]
  requires_attention: boolean
}

interface AutoLockInfo {
  time_until_lock_ms: number
  time_until_lock: string
  approaching_lock: boolean
  should_lock: boolean
}

// Phase configuration
const PHASE_CONFIG = {
  planejamento: {
    label: 'Planejamento',
    color: 'bg-blue-500',
    icon: Clock,
    description: 'Preparação da aula',
    nextAction: 'Iniciar Aula'
  },
  chamada: {
    label: 'Chamada em Andamento',
    color: 'bg-green-500',
    icon: Users,
    description: 'Marcação de frequência ativa',
    nextAction: 'Finalizar Aula'
  },
  finalizada: {
    label: 'Finalizada',
    color: 'bg-orange-500',
    icon: CheckCircle,
    description: 'Aula concluída, aguardando bloqueio',
    nextAction: null
  },
  bloqueada: {
    label: 'Bloqueada',
    color: 'bg-red-500',
    icon: Lock,
    description: 'Registro permanente - "Não existe o esquecer"',
    nextAction: null
  }
}

export default function SessionControl({
  session,
  user,
  onSessionUpdate,
  onAttendanceClick,
  isMobile = false,
  className
}: SessionControlProps) {
  // State
  const [isLoading, setIsLoading] = useState(false)
  const [status, setStatus] = useState<SessionStatus | null>(null)
  const [autoLockInfo, setAutoLockInfo] = useState<AutoLockInfo | null>(null)
  const [attendanceStats, setAttendanceStats] = useState<AttendanceStats | null>(null)
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'error'>('disconnected')
  const [announcements, setAnnouncements] = useState<string[]>([])

  // Refs
  const realtimeManager = useRef<SessionRealtimeManager | null>(null)
  const swipeStart = useRef<{ x: number; y: number } | null>(null)

  // Computed values
  const phaseConfig = PHASE_CONFIG[session.fase]
  const attendancePercentage = session.total_alunos > 0
    ? Math.round((session.total_presentes / session.total_alunos) * 100)
    : 0

  // Real-time setup
  useEffect(() => {
    realtimeManager.current = new SessionRealtimeManager({
      onSessionUpdate: (sessionData, eventType) => {
        if (sessionData.id === session.id) {
          onSessionUpdate(sessionData)
          announceChange(`Sessão ${eventType === 'UPDATE' ? 'atualizada' : 'modificada'}`)
        }
      },
      onAttendanceStats: (sessionId, stats) => {
        if (sessionId === session.id) {
          setAttendanceStats(stats)
        }
      },
      onSessionLocked: (sessionId) => {
        if (sessionId === session.id) {
          toast({
            title: 'Sessão Bloqueada',
            description: 'A sessão foi bloqueada automaticamente às 18:00',
            variant: 'default'
          })
          announceChange('Sessão bloqueada automaticamente')
        }
      },
      onConnectionStatus: setConnectionStatus,
      onError: (error) => {
        console.error('Real-time error:', error)
        toast({
          title: 'Erro de Conexão',
          description: 'Problemas na conexão em tempo real. Tentando reconectar...',
          variant: 'destructive'
        })
      }
    })

    // Subscribe to session updates
    realtimeManager.current.subscribeToSessions({
      turma_id: session.turma_id
    })

    // Subscribe to attendance updates
    realtimeManager.current.subscribeToAttendance([session.id])

    return () => {
      realtimeManager.current?.unsubscribeAll()
    }
  }, [session.id, session.turma_id, onSessionUpdate])

  // Fetch session status periodically
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const response = await fetch(`/api/sessions/${session.id}/status`)
        if (response.ok) {
          const data = await response.json()
          setStatus(data.status)
          setAutoLockInfo(data.auto_lock)
        }
      } catch (error) {
        console.error('Error fetching session status:', error)
      }
    }

    fetchStatus()
    const interval = setInterval(fetchStatus, 30000) // Update every 30 seconds

    return () => clearInterval(interval)
  }, [session.id])

  // Session actions
  const handlePhaseTransition = useCallback(async (action: string) => {
    if (isLoading || !session.can_modify) return

    setIsLoading(true)
    try {
      let response

      switch (action) {
        case 'start':
          response = await fetch(`/api/sessions/${session.id}/status`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'start_session' })
          })
          break

        case 'complete':
          response = await fetch(`/api/sessions/${session.id}/status`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'complete_session' })
          })
          break

        default:
          throw new Error('Invalid action')
      }

      if (response?.ok) {
        const data = await response.json()
        onSessionUpdate(data.session)

        toast({
          title: 'Sucesso',
          description: data.message,
          variant: 'default'
        })

        announceChange(`Fase alterada para ${data.session.fase}`)
      } else {
        throw new Error('Failed to update session')
      }
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao atualizar sessão. Tente novamente.',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }, [session.id, session.can_modify, isLoading, onSessionUpdate])

  // Mobile swipe handling
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!isMobile || !session.can_modify) return

    const touch = e.touches[0]
    swipeStart.current = { x: touch.clientX, y: touch.clientY }
  }, [isMobile, session.can_modify])

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!isMobile || !swipeStart.current || !session.can_modify) return

    const touch = e.changedTouches[0]
    const deltaX = touch.clientX - swipeStart.current.x
    const deltaY = Math.abs(touch.clientY - swipeStart.current.y)

    // Only process horizontal swipes
    if (Math.abs(deltaX) > 100 && deltaY < 50) {
      if (deltaX > 0 && session.fase === 'planejamento') {
        handlePhaseTransition('start')
      } else if (deltaX < 0 && session.fase === 'chamada') {
        handlePhaseTransition('complete')
      }
    }

    swipeStart.current = null
  }, [isMobile, session.fase, session.can_modify, handlePhaseTransition])

  // Announce changes for accessibility
  const announceChange = useCallback((message: string) => {
    setAnnouncements(prev => [...prev.slice(-4), message])
  }, [])

  // Auto-lock warning component
  const AutoLockWarning = () => {
    if (!autoLockInfo?.approaching_lock) return null

    return (
      <Alert className="mb-4 border-orange-200 bg-orange-50" data-testid="auto-lock-warning">
        <AlertTriangle className="h-4 w-4 text-orange-600" />
        <AlertDescription className="text-orange-800">
          Esta sessão será bloqueada em {autoLockInfo.time_until_lock}
        </AlertDescription>
      </Alert>
    )
  }

  // Connection status indicator
  const ConnectionIndicator = () => (
    <div className="flex items-center gap-1" data-testid="connection-status">
      {connectionStatus === 'connected' ? (
        <Wifi className={cn("h-4 w-4 text-green-500", "connected")} />
      ) : (
        <WifiOff className={cn("h-4 w-4 text-red-500", connectionStatus)} />
      )}
      {isMobile && (
        <div className="text-xs text-muted-foreground" data-testid="offline-sync-status">
          {connectionStatus === 'connected' ? 'Online' : 'Offline'}
        </div>
      )}
    </div>
  )

  // Compliance status indicator
  const ComplianceIndicator = () => (
    <Badge
      variant={session.compliance_status === 'compliant' ? 'default' : 'secondary'}
      className={cn(
        'status-',
        session.compliance_status,
        session.compliance_status === 'compliant' && 'bg-green-100 text-green-800',
        session.compliance_status === 'non_compliant' && 'bg-red-100 text-red-800'
      )}
      data-testid="compliance-status"
    >
      {session.compliance_status === 'compliant' ? 'Conforme' :
       session.compliance_status === 'non_compliant' ? 'Não Conforme' : 'Pendente'}
    </Badge>
  )

  const PhaseIcon = phaseConfig.icon

  return (
    <Card
      className={cn(
        'w-full transition-all duration-200',
        isMobile && 'mobile-layout touch-manipulation',
        className
      )}
      data-testid={isMobile ? 'session-control-mobile' : 'session-control-desktop'}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">
            {session.turmas?.nome || 'Sessão'}
          </CardTitle>
          <div className="flex items-center gap-2">
            <ComplianceIndicator />
            <ConnectionIndicator />
          </div>
        </div>

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <PhaseIcon className="h-4 w-4" />
          <span>{session.data_aula}</span>
          <span>•</span>
          <span>{session.total_alunos} estudantes</span>
          <span>•</span>
          <span>{attendancePercentage}% presença</span>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <AutoLockWarning />

        {/* Phase Status */}
        <div
          className="flex items-center justify-between p-4 rounded-lg border"
          style={{ backgroundColor: `${phaseConfig.color}10` }}
        >
          <div className="flex items-center gap-3">
            <div className={cn('p-2 rounded-full text-white', phaseConfig.color)}>
              <PhaseIcon className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-medium" role="status" aria-label="Fase da aula">
                {phaseConfig.label}
              </h3>
              <p className="text-sm text-muted-foreground">
                {phaseConfig.description}
              </p>
            </div>
          </div>

          {session.bloqueado && (
            <div className="text-right">
              <Lock className="h-5 w-5 text-red-500 mb-1" data-testid="lock-icon" />
              <p className="text-xs text-red-600 font-medium">
                Não existe o esquecer
              </p>
            </div>
          )}
        </div>

        {/* Attendance Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Frequência Marcada</span>
            <span>{session.total_presentes + session.total_ausentes}/{session.total_alunos}</span>
          </div>
          <Progress
            value={(session.total_presentes + session.total_ausentes) / session.total_alunos * 100}
            className="h-2"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{session.total_presentes} presentes</span>
            <span>{session.total_ausentes} ausentes</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div
          className={cn(
            'grid gap-2',
            isMobile ? 'grid-cols-1' : 'grid-cols-2'
          )}
          data-testid="swipe-area"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {session.fase === 'planejamento' && session.can_modify && (
            <Button
              onClick={() => handlePhaseTransition('start')}
              disabled={isLoading}
              className={cn(
                'relative',
                isMobile && 'touch-target-large h-12 text-base'
              )}
              aria-describedby="start-session-help"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" data-testid="loading-spinner" />
                  Iniciando...
                </div>
              ) : (
                phaseConfig.nextAction
              )}
            </Button>
          )}

          {session.fase === 'chamada' && session.can_modify && (
            <>
              <Button
                onClick={() => handlePhaseTransition('complete')}
                disabled={isLoading}
                variant="default"
                className={cn(
                  isMobile && 'touch-target-large h-12 text-base'
                )}
              >
                {isLoading ? 'Finalizando...' : 'Finalizar Aula'}
              </Button>

              <Button
                onClick={onAttendanceClick}
                variant="outline"
                className={cn(
                  isMobile && 'touch-target-large h-12 text-base'
                )}
              >
                {isMobile && <Smartphone className="h-4 w-4 mr-2" />}
                Marcar Frequência
              </Button>
            </>
          )}

          {(session.fase === 'finalizada' || session.fase === 'bloqueada') && (
            <div className="text-center p-4 text-muted-foreground">
              {session.fase === 'finalizada'
                ? 'Aguardando bloqueio automático às 18:00'
                : 'Sessão permanentemente bloqueada'
              }
            </div>
          )}
        </div>

        {/* Status Warnings */}
        {status?.warnings && status.warnings.length > 0 && (
          <Alert className="border-yellow-200 bg-yellow-50">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-yellow-800">
              {status.warnings.join(', ')}
            </AlertDescription>
          </Alert>
        )}

        {/* Mobile swipe hint */}
        {isMobile && session.can_modify && (session.fase === 'planejamento' || session.fase === 'chamada') && (
          <div className="text-center text-xs text-muted-foreground">
            💡 Deslize para {session.fase === 'planejamento' ? 'iniciar' : 'finalizar'} aula
          </div>
        )}
      </CardContent>

      {/* Accessibility announcements */}
      <div
        role="log"
        aria-live="polite"
        aria-label="Atualizações da aula"
        className="sr-only"
      >
        {announcements.map((announcement, index) => (
          <div key={index}>{announcement}</div>
        ))}
      </div>

      {/* Help text */}
      <div id="start-session-help" className="sr-only">
        Inicia a sessão de chamada permitindo marcação de frequência
      </div>
    </Card>
  )
}