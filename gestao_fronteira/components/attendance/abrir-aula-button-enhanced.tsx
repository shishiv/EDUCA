/**
 * Enhanced Abrir Aula Button - Integrated with Task 2 State Management
 *
 * Features:
 * - Uses openSessionAction from Task 2 server actions
 * - Integrates with Zustand store for state updates
 * - TanStack Query for optimistic updates
 * - 44px touch targets for mobile
 * - Toast notifications with error handling
 * - Lock enforcement from store
 *
 * Brazilian Compliance: Prevents duplicate sessions per day
 */

'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Unlock, CheckCircle, Loader2, AlertTriangle, Clock } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import {
  useOpenSession,
  useAttendanceSession,
} from '@/hooks/use-attendance-hooks'
import {
  useCurrentPhase,
  useIsSessionLocked,
} from '@/lib/stores/attendance-session-store'

interface AbrirAulaButtonEnhancedProps {
  turmaId: string
  professorId: string
  turmaNome: string
  dataAula?: string // YYYY-MM-DD format, defaults to today
  conteudoProgramatico?: string
  disabled?: boolean
  className?: string
  onSuccess?: (sessionData: any) => void
  onError?: (error: any) => void
}

export function AbrirAulaButtonEnhanced({
  turmaId,
  professorId,
  turmaNome,
  dataAula,
  conteudoProgramatico,
  disabled = false,
  className,
  onSuccess,
  onError,
}: AbrirAulaButtonEnhancedProps) {
  // Task 2 hooks integration
  const currentPhase = useCurrentPhase()
  const isLocked = useIsSessionLocked()
  const { data: sessionData, isLoading: isCheckingSession } = useAttendanceSession(turmaId)
  const openSessionMutation = useOpenSession()

  // Derive actual disabled state
  const isDisabled =
    disabled ||
    isLocked ||
    currentPhase === 'attendance' ||
    currentPhase === 'completion' ||
    currentPhase === 'locked' ||
    openSessionMutation.isPending

  // Calculate date (default to today in São Paulo timezone)
  const effectiveDate =
    dataAula ||
    new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' }) // YYYY-MM-DD

  const handleAbrirAula = async () => {
    if (isDisabled) return

    openSessionMutation.mutate(
      {
        turma_id: turmaId,
        professor_id: professorId,
        data_aula: effectiveDate,
        conteudo_programatico: conteudoProgramatico,
      },
      {
        onSuccess: (result) => {
          if (result.success && result.session) {
            toast.success(
              `Aula aberta com sucesso para ${turmaNome}!`,
              {
                description: `Frequência liberada. Marque a presença dos alunos.`,
                duration: 4000,
              }
            )
            onSuccess?.(result.session)
          } else {
            // Server returned success: false
            const errorMessage = result.error || 'Erro ao abrir aula'
            toast.error(errorMessage, {
              description: 'Verifique se já existe uma aula aberta para hoje.',
            })
            onError?.(new Error(errorMessage))
          }
        },
        onError: (error: any) => {
          console.error('Erro ao abrir aula:', error)

          let errorMessage = 'Erro ao abrir aula. Tente novamente.'

          if (error.message) {
            errorMessage = error.message
          } else if (error.name === 'TypeError' && error.message?.includes('fetch')) {
            errorMessage = 'Erro de conexão. Verifique sua internet.'
          }

          toast.error(errorMessage, {
            description: 'Se o erro persistir, entre em contato com o suporte.',
          })

          onError?.(error)
        },
      }
    )
  }

  const getCurrentTime = () => {
    return new Date().toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'America/Sao_Paulo',
    })
  }

  // Loading state while checking session
  if (isCheckingSession) {
    return (
      <Button
        disabled
        className={cn(
          'w-full sm:w-auto bg-gray-100 text-gray-600 min-h-[44px]',
          className
        )}
        aria-label="Verificando status da aula"
      >
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        <span>Verificando...</span>
      </Button>
    )
  }

  // Session already open (attendance or completion phase)
  if (currentPhase === 'attendance' || currentPhase === 'completion') {
    return (
      <Button
        disabled
        className={cn(
          'w-full sm:w-auto bg-green-600 hover:bg-green-600 text-white min-h-[44px]',
          className
        )}
        aria-label={`Aula aberta para ${turmaNome} - Frequência liberada`}
      >
        <CheckCircle
          className="h-4 w-4 mr-2"
          data-testid="check-icon"
        />
        <div className="flex flex-col items-start">
          <span className="font-medium">Aula Aberta</span>
          <span className="text-xs opacity-90">
            {currentPhase === 'completion' ? 'Encerrando' : 'Frequência Liberada'}
          </span>
        </div>
        <Badge
          variant="outline"
          className="ml-2 bg-green-100 border-green-300 text-green-700"
        >
          <Clock className="h-3 w-3 mr-1" />
          {getCurrentTime()}
        </Badge>
      </Button>
    )
  }

  // Session locked (cannot reopen)
  if (currentPhase === 'locked' || isLocked) {
    return (
      <Button
        disabled
        className={cn(
          'w-full sm:w-auto bg-gray-200 text-gray-600 min-h-[44px]',
          className
        )}
        aria-label="Aula finalizada - não pode ser reaberta"
      >
        <CheckCircle className="h-4 w-4 mr-2 text-gray-500" />
        <div className="flex flex-col items-start">
          <span className="font-medium">Aula Finalizada</span>
          <span className="text-xs opacity-90">Documento Legal</span>
        </div>
      </Button>
    )
  }

  // Planning phase: ready to open
  return (
    <Button
      onClick={handleAbrirAula}
      disabled={isDisabled}
      className={cn(
        'w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white min-h-[44px] touch-manipulation',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        className
      )}
      aria-label={`Abrir aula para turma ${turmaNome}`}
      aria-disabled={isDisabled}
      data-testid="abrir-aula-button"
    >
      {openSessionMutation.isPending ? (
        <>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          <span>Abrindo...</span>
        </>
      ) : (
        <>
          <Unlock
            className="h-4 w-4 mr-2"
            data-testid="unlock-icon"
          />
          <div className="flex flex-col items-start">
            <span className="font-medium">Abrir Aula</span>
            <span className="text-xs opacity-90">{turmaNome}</span>
          </div>
        </>
      )}
    </Button>
  )
}

// Export with backward compatibility alias
export { AbrirAulaButtonEnhanced as AbrirAulaButton }