/**
 * Aula Phase Indicator - Three-Phase Workflow Visualization
 *
 * Displays current attendance session phase with visual feedback:
 * - Planejamento (Planning): Yellow badge, preparing class
 * - Marcando (Attendance): Green badge, marking attendance
 * - Finalizada (Completed): Gray badge, session locked
 *
 * Integrates with Task 2 state management (Zustand store)
 * Brazilian Compliance: "não existe o esquecer" visual enforcement
 */

'use client'

import React from 'react'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { cn } from '@/lib/utils'
import {
  Clock,
  CheckCircle2,
  Lock,
  FileCheck,
  AlertTriangle
} from 'lucide-react'
import {
  useCurrentPhase,
  useIsSessionLocked,
  useActiveSession,
  useSessionError,
  type SessionPhase
} from '@/lib/stores/attendance-session-store'

interface AulaPhaseIndicatorProps {
  className?: string
  showLockMessage?: boolean
  compact?: boolean
}

// Phase configuration
const PHASE_CONFIG: Record<
  SessionPhase,
  {
    label: string
    color: string
    icon: React.ReactNode
    badgeVariant: 'default' | 'secondary' | 'destructive' | 'outline'
    bgColor: string
    textColor: string
    description: string
  }
> = {
  planning: {
    label: 'Planejamento',
    color: 'yellow',
    icon: <Clock className="h-4 w-4" />,
    badgeVariant: 'outline',
    bgColor: 'bg-yellow-50 border-yellow-200',
    textColor: 'text-yellow-800',
    description: 'Preparando aula. Clique em "Abrir Aula" para iniciar a chamada.',
  },
  attendance: {
    label: 'Marcando Frequência',
    color: 'green',
    icon: <CheckCircle2 className="h-4 w-4" />,
    badgeVariant: 'default',
    bgColor: 'bg-green-50 border-green-200',
    textColor: 'text-green-800',
    description: 'Aula aberta. Marque a presença dos alunos.',
  },
  completion: {
    label: 'Encerrando',
    color: 'blue',
    icon: <FileCheck className="h-4 w-4" />,
    badgeVariant: 'secondary',
    bgColor: 'bg-blue-50 border-blue-200',
    textColor: 'text-blue-800',
    description: 'Finalizando aula. Revise a frequência antes de encerrar.',
  },
  locked: {
    label: 'Finalizada',
    color: 'gray',
    icon: <Lock className="h-4 w-4" />,
    badgeVariant: 'secondary',
    bgColor: 'bg-gray-100 border-gray-300',
    textColor: 'text-gray-700',
    description: 'Aula encerrada. Documento legal imutável.',
  },
}

export function AulaPhaseIndicator({
  className,
  showLockMessage = true,
  compact = false,
}: AulaPhaseIndicatorProps) {
  const currentPhase = useCurrentPhase()
  const isLocked = useIsSessionLocked()
  const activeSession = useActiveSession()
  const error = useSessionError()

  const phaseConfig = PHASE_CONFIG[currentPhase]

  // Error state
  if (error) {
    return (
      <Alert variant="destructive" className={cn('border-red-200', className)}>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          <strong>Erro:</strong> {error}
        </AlertDescription>
      </Alert>
    )
  }

  // Compact mode: badge only
  if (compact) {
    return (
      <Badge
        variant={phaseConfig.badgeVariant}
        className={cn(
          'flex items-center gap-1.5 px-3 py-1.5',
          phaseConfig.color === 'yellow' && 'bg-yellow-100 text-yellow-800 border-yellow-300',
          phaseConfig.color === 'green' && 'bg-green-600 text-white',
          phaseConfig.color === 'blue' && 'bg-blue-100 text-blue-800 border-blue-300',
          phaseConfig.color === 'gray' && 'bg-gray-200 text-gray-700',
          className
        )}
      >
        {phaseConfig.icon}
        <span className="font-medium">{phaseConfig.label}</span>
      </Badge>
    )
  }

  // Full mode: card with phase progression
  return (
    <div className={cn('space-y-3', className)}>
      {/* Phase Progress Bar */}
      <div className="flex items-center gap-2">
        {(['planning', 'attendance', 'completion', 'locked'] as SessionPhase[]).map(
          (phase, index) => {
            const isActive = phase === currentPhase
            const isPast =
              (currentPhase === 'attendance' && phase === 'planning') ||
              (currentPhase === 'completion' &&
                (phase === 'planning' || phase === 'attendance')) ||
              (currentPhase === 'locked' &&
                phase !== 'locked')

            const config = PHASE_CONFIG[phase]

            return (
              <React.Fragment key={phase}>
                <div
                  className={cn(
                    'flex flex-col items-center flex-1 p-3 rounded-lg border-2 transition-all',
                    isActive && config.bgColor,
                    isPast && 'bg-gray-50 border-gray-200 opacity-60',
                    !isActive && !isPast && 'bg-white border-gray-200 opacity-40'
                  )}
                >
                  <div
                    className={cn(
                      'flex items-center justify-center w-8 h-8 rounded-full mb-2',
                      isActive &&
                        (config.color === 'yellow'
                          ? 'bg-yellow-200'
                          : config.color === 'green'
                          ? 'bg-green-600'
                          : config.color === 'blue'
                          ? 'bg-blue-200'
                          : 'bg-gray-300'),
                      isPast && 'bg-gray-200',
                      !isActive && !isPast && 'bg-gray-100'
                    )}
                  >
                    <span
                      className={cn(
                        isActive &&
                          (config.color === 'green' ? 'text-white' : config.textColor),
                        isPast && 'text-gray-500',
                        !isActive && !isPast && 'text-gray-400'
                      )}
                    >
                      {config.icon}
                    </span>
                  </div>

                  <span
                    className={cn(
                      'text-xs font-medium text-center',
                      isActive && config.textColor,
                      isPast && 'text-gray-500',
                      !isActive && !isPast && 'text-gray-400'
                    )}
                  >
                    {config.label}
                  </span>
                </div>

                {/* Connector line between phases */}
                {index < 3 && (
                  <div
                    className={cn(
                      'h-0.5 w-8 flex-shrink-0',
                      isPast || isActive ? 'bg-gray-300' : 'bg-gray-200'
                    )}
                  />
                )}
              </React.Fragment>
            )
          }
        )}
      </div>

      {/* Current Phase Description */}
      <div
        className={cn(
          'p-4 rounded-lg border',
          phaseConfig.bgColor
        )}
      >
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 mt-0.5">
            <span className={phaseConfig.textColor}>{phaseConfig.icon}</span>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className={cn('font-semibold text-sm', phaseConfig.textColor)}>
                {phaseConfig.label}
              </h3>

              {isLocked && (
                <Badge
                  variant="destructive"
                  className="bg-red-100 text-red-700 border-red-300"
                >
                  <Lock className="h-3 w-3 mr-1" />
                  Bloqueada
                </Badge>
              )}
            </div>

            <p className={cn('text-sm', phaseConfig.textColor)}>
              {phaseConfig.description}
            </p>

            {/* Session metadata */}
            {activeSession && (
              <div className="mt-2 text-xs opacity-80">
                {activeSession.aberta_em && (
                  <span>
                    Aberta às{' '}
                    {new Date(activeSession.aberta_em).toLocaleTimeString('pt-BR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                )}

                {activeSession.fechada_em && (
                  <span className="ml-3">
                    Fechada às{' '}
                    {new Date(activeSession.fechada_em).toLocaleTimeString('pt-BR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Lock enforcement message */}
      {isLocked && showLockMessage && (
        <Alert className="border-red-200 bg-red-50">
          <Lock className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            <strong>Documento Legal Oficial:</strong> Esta frequência está finalizada e não
            pode mais ser alterada, conforme o princípio <em>"não existe o esquecer"</em> da
            legislação educacional brasileira.
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}