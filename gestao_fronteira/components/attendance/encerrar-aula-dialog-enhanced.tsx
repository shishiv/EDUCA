/**
 * Enhanced Encerrar Aula Dialog - Integrated with Task 2 State Management
 *
 * Features:
 * - Session statistics from Zustand store
 * - closeSessionAction from Task 2 server actions
 * - Lock warning with Brazilian compliance messaging
 * - Attendance summary (total, present, absent, percentage)
 * - Mobile-optimized with Sheet component for small screens
 *
 * Brazilian Compliance: Final confirmation before "não existe o esquecer"
 */

'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import {
  Users,
  UserCheck,
  UserX,
  AlertTriangle,
  Lock,
  FileCheck,
  Loader2,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { useCloseSession } from '@/hooks/use-attendance-hooks'
import {
  useActiveSession,
  useSessionStats,
  useCurrentPhase,
} from '@/lib/stores/attendance-session-store'

interface EncerrarAulaDialogEnhancedProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  isMobile?: boolean
  onSuccess?: () => void
  onError?: (error: any) => void
}

export function EncerrarAulaDialogEnhanced({
  open,
  onOpenChange,
  isMobile = false,
  onSuccess,
  onError,
}: EncerrarAulaDialogEnhancedProps) {
  // Task 2 hooks integration
  const activeSession = useActiveSession()
  const sessionStats = useSessionStats()
  const currentPhase = useCurrentPhase()
  const closeSessionMutation = useCloseSession()

  // Local state
  const [observacoes, setObservacoes] = useState('')
  const [confirmChecked, setConfirmChecked] = useState(false)

  // Prevent closing if no active session
  if (!activeSession) {
    return null
  }

  // Calculate percentage
  const percentagePresent =
    sessionStats.total > 0
      ? Math.round((sessionStats.present / sessionStats.total) * 100)
      : 0

  // Determine risk level for attendance percentage
  const getRiskLevel = (percentage: number) => {
    if (percentage >= 80) return { level: 'good', color: 'green', label: 'Ótima' }
    if (percentage >= 70) return { level: 'medium', color: 'yellow', label: 'Boa' }
    return { level: 'low', color: 'red', label: 'Atenção' }
  }

  const riskLevel = getRiskLevel(percentagePresent)

  const handleEncerrar = async () => {
    if (!activeSession) return

    if (!confirmChecked) {
      toast.error('Confirmação necessária', {
        description: 'Marque a caixa de confirmação para encerrar a aula.',
      })
      return
    }

    closeSessionMutation.mutate(
      {
        session_id: activeSession.id,
        observacoes,
      },
      {
        onSuccess: (result) => {
          if (result.success) {
            toast.success('Aula encerrada com sucesso!', {
              description: `Frequência travada. Documento legal gerado.`,
              duration: 5000,
            })

            // Close dialog
            onOpenChange(false)

            // Reset form
            setObservacoes('')
            setConfirmChecked(false)

            onSuccess?.()
          } else {
            const errorMessage = result.error || 'Erro ao encerrar aula'
            toast.error(errorMessage)
            onError?.(new Error(errorMessage))
          }
        },
        onError: (error: any) => {
          console.error('Erro ao encerrar aula:', error)

          toast.error('Erro ao encerrar aula', {
            description: error.message || 'Tente novamente em alguns instantes.',
          })

          onError?.(error)
        },
      }
    )
  }

  const dialogContent = (
    <>
      <div className="space-y-4">
        {/* Attendance Statistics Summary */}
        <div className="bg-gray-50 rounded-lg p-4 space-y-3">
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <Users className="h-4 w-4" />
            Resumo da Frequência
          </h3>

          <div className="grid grid-cols-3 gap-3">
            {/* Total Students */}
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{sessionStats.total}</div>
              <div className="text-xs text-gray-600 mt-1">Total de Alunos</div>
            </div>

            {/* Present */}
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600 flex items-center justify-center gap-1">
                {sessionStats.present}
                <UserCheck className="h-5 w-5" />
              </div>
              <div className="text-xs text-gray-600 mt-1">Presentes</div>
            </div>

            {/* Absent */}
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600 flex items-center justify-center gap-1">
                {sessionStats.absent}
                <UserX className="h-5 w-5" />
              </div>
              <div className="text-xs text-gray-600 mt-1">Ausentes</div>
            </div>
          </div>

          {/* Attendance Percentage Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Taxa de Presença</span>
              <Badge
                variant="outline"
                className={cn(
                  'font-bold',
                  riskLevel.color === 'green' &&
                    'bg-green-100 text-green-700 border-green-300',
                  riskLevel.color === 'yellow' &&
                    'bg-yellow-100 text-yellow-700 border-yellow-300',
                  riskLevel.color === 'red' && 'bg-red-100 text-red-700 border-red-300'
                )}
              >
                {percentagePresent}% - {riskLevel.label}
              </Badge>
            </div>

            <Progress
              value={percentagePresent}
              className="h-2"
            />

            {/* Bolsa Família Warning (if applicable) */}
            {percentagePresent < 80 && (
              <Alert className="mt-2 border-yellow-200 bg-yellow-50">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                <AlertDescription className="text-yellow-800 text-xs">
                  <strong>Atenção:</strong> Taxa de presença abaixo de 80%. Alunos do Bolsa
                  Família podem ser afetados.
                </AlertDescription>
              </Alert>
            )}
          </div>
        </div>

        {/* Session Info */}
        <div className="text-sm text-gray-600 space-y-1">
          <div className="flex justify-between">
            <span>Data:</span>
            <span className="font-medium">
              {new Date(activeSession.data_aula).toLocaleDateString('pt-BR')}
            </span>
          </div>

          {activeSession.aberta_em && (
            <div className="flex justify-between">
              <span>Aberta às:</span>
              <span className="font-medium">
                {new Date(activeSession.aberta_em).toLocaleTimeString('pt-BR', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
          )}
        </div>

        {/* Observations */}
        <div className="space-y-2">
          <Label htmlFor="observacoes">
            Observações Finais <span className="text-gray-500 text-xs">(opcional)</span>
          </Label>
          <Textarea
            id="observacoes"
            value={observacoes}
            onChange={(e) => setObservacoes(e.target.value)}
            placeholder="Adicione observações sobre a aula (conteúdo ministrado, ocorrências, etc.)"
            className="resize-none min-h-[80px]"
            maxLength={500}
          />
          <div className="text-xs text-gray-500 text-right">
            {observacoes.length}/500 caracteres
          </div>
        </div>

        {/* Legal Compliance Warning */}
        <Alert className="border-red-200 bg-red-50">
          <Lock className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800 text-sm">
            <strong>Atenção - Documento Legal:</strong> Ao encerrar esta aula, a frequência
            será travada e não poderá mais ser alterada, conforme o princípio{' '}
            <em>"não existe o esquecer"</em> da legislação educacional brasileira.
          </AlertDescription>
        </Alert>

        {/* Confirmation Checkbox */}
        <div className="flex items-start space-x-2 p-3 bg-gray-50 rounded-lg">
          <input
            type="checkbox"
            id="confirm-close"
            checked={confirmChecked}
            onChange={(e) => setConfirmChecked(e.target.checked)}
            className="mt-1 h-4 w-4 rounded border-gray-300"
          />
          <label
            htmlFor="confirm-close"
            className="text-sm text-gray-700 cursor-pointer select-none"
          >
            Confirmo que revisei todas as presenças e estou ciente de que esta ação é{' '}
            <strong>irreversível</strong>.
          </label>
        </div>
      </div>
    </>
  )

  const dialogFooter = (
    <>
      <Button
        variant="outline"
        onClick={() => onOpenChange(false)}
        disabled={closeSessionMutation.isPending}
      >
        Cancelar
      </Button>

      <Button
        onClick={handleEncerrar}
        disabled={!confirmChecked || closeSessionMutation.isPending}
        className="bg-red-600 hover:bg-red-700 text-white"
        data-testid="confirm-encerrar-button"
      >
        {closeSessionMutation.isPending ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Encerrando...
          </>
        ) : (
          <>
            <FileCheck className="h-4 w-4 mr-2" />
            Encerrar Aula
          </>
        )}
      </Button>
    </>
  )

  // Mobile: Use Sheet component
  if (isMobile) {
    return (
      <Sheet
        open={open}
        onOpenChange={onOpenChange}
      >
        <SheetContent side="bottom" className="h-[90vh]">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <FileCheck className="h-5 w-5" />
              Encerrar Aula
            </SheetTitle>
            <SheetDescription>
              Revise as informações antes de finalizar a aula.
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 overflow-y-auto max-h-[calc(90vh-180px)]">{dialogContent}</div>

          <SheetFooter className="mt-4">{dialogFooter}</SheetFooter>
        </SheetContent>
      </Sheet>
    )
  }

  // Desktop: Use Dialog component
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileCheck className="h-5 w-5" />
            Encerrar Aula
          </DialogTitle>
          <DialogDescription>
            Revise as informações antes de finalizar a aula.
          </DialogDescription>
        </DialogHeader>

        {dialogContent}

        <DialogFooter>{dialogFooter}</DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Export with backward compatibility alias
export { EncerrarAulaDialogEnhanced as EncerrarAulaDialog }