/**
 * Session Timer and Time-lock Countdown Display Component
 * Task 4.5: Add session timer and time-lock countdown display
 */

'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Clock,
  Timer,
  AlertTriangle,
  CheckCircle,
  Lock,
  Play,
  Pause
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface SessionTimerProps {
  sessionId: string
  startTime: string // ISO timestamp when session started
  timeLimit: number // Time limit in minutes
  currentPhase: 'planejamento' | 'chamada' | 'finalizada' | 'bloqueada'
  onTimeExpired?: () => void
  onWarningThreshold?: (minutesRemaining: number) => void
  className?: string
}

interface TimeRemaining {
  hours: number
  minutes: number
  seconds: number
  totalMinutes: number
  percentage: number
}

export function SessionTimerDisplay({
  sessionId,
  startTime,
  timeLimit,
  currentPhase,
  onTimeExpired,
  onWarningThreshold,
  className
}: SessionTimerProps) {
  const [timeRemaining, setTimeRemaining] = useState<TimeRemaining | null>(null)
  const [isExpired, setIsExpired] = useState(false)
  const [warningTriggered, setWarningTriggered] = useState(false)
  const [isPaused, setIsPaused] = useState(false)

  // Calculate time remaining
  const calculateTimeRemaining = (): TimeRemaining | null => {
    if (currentPhase === 'bloqueada' || currentPhase === 'finalizada') {
      return null
    }

    const start = new Date(startTime)
    const now = new Date()
    const limitMs = timeLimit * 60 * 1000
    const elapsedMs = now.getTime() - start.getTime()
    const remainingMs = limitMs - elapsedMs

    if (remainingMs <= 0) {
      return {
        hours: 0,
        minutes: 0,
        seconds: 0,
        totalMinutes: 0,
        percentage: 0
      }
    }

    const totalSeconds = Math.floor(remainingMs / 1000)
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60
    const totalMinutes = Math.floor(remainingMs / (60 * 1000))
    const percentage = (remainingMs / limitMs) * 100

    return {
      hours,
      minutes,
      seconds,
      totalMinutes,
      percentage
    }
  }

  // Update timer every second
  useEffect(() => {
    if (isPaused || currentPhase === 'bloqueada' || currentPhase === 'finalizada') {
      return
    }

    const interval = setInterval(() => {
      const remaining = calculateTimeRemaining()
      setTimeRemaining(remaining)

      if (!remaining || remaining.totalMinutes <= 0) {
        setIsExpired(true)
        onTimeExpired?.()
        return
      }

      // Trigger warning at 10 minutes remaining
      if (!warningTriggered && remaining.totalMinutes <= 10) {
        setWarningTriggered(true)
        onWarningThreshold?.(remaining.totalMinutes)
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [
    isPaused,
    currentPhase,
    warningTriggered,
    onTimeExpired,
    onWarningThreshold,
    startTime,
    timeLimit
  ])

  // Initial calculation
  useEffect(() => {
    const remaining = calculateTimeRemaining()
    setTimeRemaining(remaining)

    if (!remaining || remaining.totalMinutes <= 0) {
      setIsExpired(true)
    }
  }, [startTime, timeLimit, currentPhase])

  const formatTime = (time: TimeRemaining): string => {
    if (time.hours > 0) {
      return `${time.hours}:${time.minutes.toString().padStart(2, '0')}:${time.seconds.toString().padStart(2, '0')}`
    }
    return `${time.minutes}:${time.seconds.toString().padStart(2, '0')}`
  }

  const getTimerVariant = (): 'default' | 'warning' | 'critical' | 'expired' => {
    if (isExpired || !timeRemaining) return 'expired'
    if (timeRemaining.totalMinutes <= 5) return 'critical'
    if (timeRemaining.totalMinutes <= 10) return 'warning'
    return 'default'
  }

  const getProgressColor = (): string => {
    const variant = getTimerVariant()
    switch (variant) {
      case 'critical': return 'bg-red-500'
      case 'warning': return 'bg-yellow-500'
      case 'expired': return 'bg-gray-400'
      default: return 'bg-green-500'
    }
  }

  const getBadgeVariant = () => {
    const variant = getTimerVariant()
    switch (variant) {
      case 'critical': return 'destructive'
      case 'warning': return 'secondary'
      case 'expired': return 'outline'
      default: return 'default'
    }
  }

  if (currentPhase === 'bloqueada') {
    return (
      <Card className={cn('border-red-200 bg-red-50', className)}>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-full">
              <Lock className="h-4 w-4 text-red-600" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium text-red-900">Sessão Bloqueada</span>
                <Badge variant="destructive" className="text-xs">
                  Imutável
                </Badge>
              </div>
              <p className="text-sm text-red-700 mt-1">
                Os registros estão permanentemente bloqueados conforme a legislação educacional brasileira
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (currentPhase === 'finalizada') {
    return (
      <Card className={cn('border-green-200 bg-green-50', className)}>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-full">
              <CheckCircle className="h-4 w-4 text-green-600" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium text-green-900">Sessão Finalizada</span>
                <Badge variant="default" className="text-xs bg-green-100 text-green-800">
                  Completa
                </Badge>
              </div>
              <p className="text-sm text-green-700 mt-1">
                Frequência salva com sucesso. Aguardando bloqueio automático.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (isExpired || !timeRemaining) {
    return (
      <Alert className="border-red-200 bg-red-50">
        <AlertTriangle className="h-4 w-4 text-red-600" />
        <AlertDescription className="text-red-800">
          <div className="flex items-center justify-between">
            <div>
              <strong>Tempo Esgotado!</strong>
              <p className="text-sm mt-1">
                O tempo limite para marcação de frequência expirou.
                A sessão será bloqueada automaticamente.
              </p>
            </div>
            <Badge variant="destructive" className="ml-4">
              00:00
            </Badge>
          </div>
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <Card className={cn('transition-all duration-300', className)}>
      <CardContent className="p-4">
        <div className="space-y-3">
          {/* Header with timer icon and time display */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={cn(
                'p-2 rounded-full transition-colors',
                getTimerVariant() === 'critical' ? 'bg-red-100' :
                getTimerVariant() === 'warning' ? 'bg-yellow-100' : 'bg-blue-100'
              )}>
                <Timer className={cn(
                  'h-4 w-4',
                  getTimerVariant() === 'critical' ? 'text-red-600' :
                  getTimerVariant() === 'warning' ? 'text-yellow-600' : 'text-blue-600'
                )} />
              </div>
              <div>
                <span className="font-medium text-gray-900">
                  Tempo para Marcação
                </span>
                <p className="text-xs text-gray-500">
                  Sessão iniciada há {Math.floor((new Date().getTime() - new Date(startTime).getTime()) / (1000 * 60))} min
                </p>
              </div>
            </div>

            <div className="text-right">
              <div className="flex items-center gap-2">
                <Badge variant={getBadgeVariant()} className="font-mono text-sm">
                  {formatTime(timeRemaining)}
                </Badge>
                {currentPhase === 'chamada' && (
                  <div className="flex items-center gap-1">
                    <div className={cn(
                      'h-2 w-2 rounded-full animate-pulse',
                      getTimerVariant() === 'critical' ? 'bg-red-500' :
                      getTimerVariant() === 'warning' ? 'bg-yellow-500' : 'bg-green-500'
                    )} />
                    <span className="text-xs text-gray-500">Ativa</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Progress bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-gray-500">
              <span>Progresso da Sessão</span>
              <span>{Math.round(timeRemaining.percentage)}% restante</span>
            </div>
            <Progress
              value={timeRemaining.percentage}
              className="h-2"
              aria-label={`${Math.round(timeRemaining.percentage)}% do tempo restante`}
            />
            <div className={cn(
              'h-1 rounded-full transition-all duration-300',
              getProgressColor()
            )} style={{ width: `${timeRemaining.percentage}%` }} />
          </div>

          {/* Warning messages */}
          {getTimerVariant() === 'warning' && (
            <Alert className="border-yellow-200 bg-yellow-50">
              <Clock className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="text-yellow-800 text-sm">
                <strong>Atenção:</strong> Restam apenas {timeRemaining.totalMinutes} minutos
                para concluir a marcação de frequência.
              </AlertDescription>
            </Alert>
          )}

          {getTimerVariant() === 'critical' && (
            <Alert className="border-red-200 bg-red-50">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800 text-sm">
                <strong>Urgente:</strong> Apenas {timeRemaining.totalMinutes} minutos restantes!
                Conclua a marcação de frequência imediatamente.
              </AlertDescription>
            </Alert>
          )}

          {/* Session info */}
          <div className="flex justify-between text-xs text-gray-500 pt-2 border-t">
            <span>Limite: {timeLimit} minutos</span>
            <span>ID da Sessão: {sessionId.slice(-8)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default SessionTimerDisplay