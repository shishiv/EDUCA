'use client'

import { useState } from 'react'
import { AlertTriangle, CheckCircle, Clock3, FileText, Loader2, RotateCcw, XCircle } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  decideAttendanceReopenAction,
  type DecideAttendanceReopenParams,
} from '@/app/actions/attendance/decide-reopen'
import {
  requestAttendanceReopenAction,
  type RequestAttendanceReopenParams,
} from '@/app/actions/attendance/request-reopen'
import type { AttendanceReopenRequest } from '@/lib/services/attendance-reopen'
import { useClassroomTranslations } from '@/i18n/classroom'

export interface AttendanceReopenPanelProps {
  sessionId: string
  sessionStatus: string
  request: AttendanceReopenRequest | null
  isTeacher: boolean
  isDirector: boolean
  onRequestChanged: (request: AttendanceReopenRequest) => void
  onRequestCompleted: () => Promise<void>
  onDecisionCompleted: (request: AttendanceReopenRequest) => Promise<void>
}

type DialogMode = 'request' | 'reject' | null

function formatTimestamp(value: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value))
}

export function AttendanceReopenPanel({
  sessionId,
  sessionStatus,
  request,
  isTeacher,
  isDirector,
  onRequestChanged,
  onRequestCompleted,
  onDecisionCompleted,
}: AttendanceReopenPanelProps) {
  const t = useClassroomTranslations()
  const [dialogMode, setDialogMode] = useState<DialogMode>(null)
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [decisionError, setDecisionError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (sessionStatus !== 'FECHADA') return null

  const isPending = request?.status === 'PENDENTE'
  const isRejected = request?.status === 'REJEITADA'
  const canRequest = isTeacher && !isPending
  const canSeeTeacherStatus = isTeacher && request?.status !== 'APROVADA'
  const canDecide = isDirector && isPending && request !== null

  if (!canSeeTeacherStatus && !canDecide) return null

  const closeDialog = () => {
    if (isSubmitting) return
    setDialogMode(null)
    setReason('')
    setError(null)
  }

  const handleRequest = async () => {
    if (!reason.trim()) {
      setError('Informe o motivo da reabertura.')
      return
    }

    setIsSubmitting(true)
    setError(null)
    setDecisionError(null)
    try {
      const params: RequestAttendanceReopenParams = {
        session_id: sessionId,
        reason,
      }
      const result = await requestAttendanceReopenAction(params)
      if (!result.success || !result.request) {
        setError(result.error || 'Não foi possível solicitar a reabertura.')
        return
      }
      onRequestChanged(result.request)
      await onRequestCompleted()
      setDialogMode(null)
      setReason('')
      setError(null)
      toast.success('Solicitação de reabertura enviada ao diretor.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDecision = async (decision: DecideAttendanceReopenParams['decision']) => {
    if (!request) return
    if (decision === 'REJEITADA' && !reason.trim()) {
      setError('Informe o motivo da rejeição.')
      return
    }

    setIsSubmitting(true)
    setError(null)
    setDecisionError(null)
    try {
      const result = await decideAttendanceReopenAction({
        request_id: request.id,
        decision,
        reason: reason || undefined,
      })
      if (!result.success || !result.request) {
        const decisionMessage = result.error || 'Não foi possível registrar a decisão.'
        setDecisionError(decisionMessage)
        return
      }
      onRequestChanged(result.request)
      await onDecisionCompleted(result.request)
      setDialogMode(null)
      setReason('')
      setError(null)
      toast.success(decision === 'APROVADA'
        ? 'Solicitação aprovada. A sessão foi reaberta.'
        : 'Solicitação rejeitada.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section
      aria-labelledby="attendance-reopen-title"
      className="rounded-lg border border-amber-200 bg-amber-50 p-4"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-3">
          {canDecide ? (
            <FileText className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" aria-hidden="true" />
          ) : (
            <RotateCcw className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" aria-hidden="true" />
          )}
          <div className="space-y-1">
            <h2 id="attendance-reopen-title" className="font-semibold text-amber-950">
              {canDecide ? t('attendance.reopenPending') : 'Solicitar reabertura da chamada'}
            </h2>
            <p className="text-sm text-amber-900">
              {canDecide
                ? 'Revise o motivo e registre uma decisão. A aprovação reabre somente esta sessão canônica.'
                : isRejected
                  ? 'A solicitação anterior foi rejeitada. Envie um novo pedido com o motivo da correção.'
                  : 'A sessão está fechada. O diretor precisa aprovar qualquer correção nos registros.'}
            </p>
            {request && (
              <div className="mt-3 space-y-2 rounded-md border border-amber-200 bg-white/70 p-3 text-sm text-amber-950">
                <div className="flex items-center gap-2">
                  <Clock3 className="h-4 w-4" aria-hidden="true" />
                  <span>Solicitada em {formatTimestamp(request.requested_at)}</span>
                  {isPending && <Badge variant="outline">{t('status.pending')}</Badge>}
                  {isRejected && <Badge variant="destructive">{t('status.rejected')}</Badge>}
                </div>
                <p><strong>Motivo:</strong> {request.request_reason}</p>
                {isRejected && request.decision_reason && (
                  <p><strong>Decisão:</strong> {request.decision_reason}</p>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap gap-2 sm:justify-end">
          {canRequest && (
            <Button type="button" onClick={() => setDialogMode('request')}>
              <RotateCcw className="mr-2 h-4 w-4" aria-hidden="true" />
              {isRejected ? 'Solicitar novamente' : t('attendance.reopen')}
            </Button>
          )}
          {canDecide && (
            <>
              <Button type="button" onClick={() => void handleDecision('APROVADA')} disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> : <CheckCircle className="mr-2 h-4 w-4" aria-hidden="true" />}
                {t('attendance.approve')}
              </Button>
              <Button type="button" variant="outline" onClick={() => setDialogMode('reject')} disabled={isSubmitting}>
                <XCircle className="mr-2 h-4 w-4" aria-hidden="true" />
                {t('attendance.reject')}
              </Button>
            </>
          )}
        </div>
      </div>

      {decisionError && (
        <div
          role="alert"
          aria-live="assertive"
          className="mt-4 flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <div>
            <p className="font-medium">Não foi possível registrar a decisão.</p>
            <p className="mt-1">{decisionError}</p>
          </div>
        </div>
      )}

      <Dialog open={dialogMode !== null} onOpenChange={open => !open && closeDialog()}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>
              {dialogMode === 'reject' ? 'Rejeitar reabertura' : t('attendance.reopen')}
            </DialogTitle>
            <DialogDescription>
              {dialogMode === 'reject'
                ? 'O motivo da rejeição ficará registrado na decisão da solicitação.'
                : 'Descreva o motivo da correção. O pedido será enviado ao diretor da escola.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-4">
            <Label htmlFor="attendance-reopen-reason">
              {dialogMode === 'reject' ? 'Motivo da rejeição' : 'Motivo da reabertura'}
            </Label>
            <Textarea
              id="attendance-reopen-reason"
              value={reason}
              onChange={event => setReason(event.target.value)}
              placeholder={dialogMode === 'reject'
                ? 'Explique por que a solicitação não foi aprovada...'
                : 'Explique qual correção precisa ser feita...'}
              aria-invalid={error ? 'true' : undefined}
              aria-describedby={error ? 'attendance-reopen-reason-error' : undefined}
              rows={5}
              autoFocus
            />
            {error && (
              <p id="attendance-reopen-reason-error" role="alert" className="text-sm text-red-700">
                <AlertTriangle className="mr-1 inline h-4 w-4" aria-hidden="true" />
                {error}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={closeDialog} disabled={isSubmitting}>
              {t('actions.cancel')}
            </Button>
            <Button
              type="button"
              onClick={() => dialogMode === 'reject' ? void handleDecision('REJEITADA') : void handleRequest()}
              disabled={isSubmitting}
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
              {dialogMode === 'reject' ? 'Confirmar rejeição' : 'Enviar solicitação'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  )
}
