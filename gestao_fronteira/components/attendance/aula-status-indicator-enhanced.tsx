'use client'

import React from 'react'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { useSessaoRealtime } from '@/hooks/use-sessao-realtime'
import { cn } from '@/lib/utils'
import {
  Lock,
  Unlock,
  CheckCircle,
  Clock,
  AlertTriangle,
  Loader2,
  RefreshCw
} from 'lucide-react'

interface AulaStatusIndicatorEnhancedProps {
  turmaId: string
  professorId: string
  sessaoId?: string // Updated from aulaId to sessaoId
  className?: string
  onStatusChange?: (status: any) => void
}

export function AulaStatusIndicatorEnhanced({
  turmaId,
  professorId,
  sessaoId,
  className,
  onStatusChange
}: AulaStatusIndicatorEnhancedProps) {
  const {
    sessao,
    loading,
    error,
    remainingMinutes,
    autoCloseTime,
    refreshStatus,
    isPlanejada,
    isAberta,
    isFechada,
    isCancelada,
    isApproachingClosure
  } = useSessaoRealtime({
    turmaId,
    professorId,
    sessaoId,
    enableAutoRefresh: true,
    onStatusChange,
    onError: (error) => console.error('Sessão status error:', error)
  })

  const formatTime = (minutes: number): string => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return hours > 0 ? `${hours}h ${mins}min` : `${mins}min`
  }

  const getStatusColor = () => {
    if (loading) return 'bg-gray-100 border-gray-300'
    if (error) return 'bg-red-50 border-red-200'
    if (isCancelada) return 'bg-red-50 border-red-200'
    if (isFechada) return 'bg-yellow-50 border-yellow-200'
    if (isAberta) {
      if (isApproachingClosure) return 'bg-orange-50 border-orange-200'
      return 'bg-green-50 border-green-200'
    }
    if (isPlanejada) return 'bg-blue-50 border-blue-200'
    return 'bg-gray-50 border-gray-200'
  }

  const getStatusIcon = () => {
    if (loading) return <Loader2 className="h-4 w-4 animate-spin text-gray-600" />
    if (error) return <AlertTriangle className="h-4 w-4 text-red-600" />
    if (isCancelada) return <Lock className="h-4 w-4 text-red-600" />
    if (isFechada) return <Clock className="h-4 w-4 text-yellow-600" />
    if (isAberta) {
      if (isApproachingClosure) return <AlertTriangle className="h-4 w-4 text-orange-600" />
      return <Unlock className="h-4 w-4 text-green-600" />
    }
    if (isPlanejada) return <Clock className="h-4 w-4 text-blue-600" />
    return <Lock className="h-4 w-4 text-gray-600" />
  }

  const getStatusBadge = () => {
    if (loading) return <Badge variant="outline">Carregando...</Badge>
    if (error) return <Badge variant="destructive">Erro</Badge>
    if (isCancelada) return <Badge variant="destructive">Cancelada</Badge>
    if (isFechada) return <Badge variant="secondary">Fechada</Badge>
    if (isAberta) return <Badge variant="default" className="bg-green-600">Aberta</Badge>
    if (isPlanejada) return <Badge variant="outline" className="border-blue-300">Planejada</Badge>
    return <Badge variant="outline">Inativa</Badge>
  }

  const getStatusText = () => {
    if (loading) return 'Verificando status da sessão...'
    if (error) return 'Erro ao verificar status'

    if (isCancelada) {
      const canceladaEm = sessao?.cancelada_em ? new Date(sessao.cancelada_em).toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit'
      }) : ''
      return `Sessão cancelada${canceladaEm ? ` às ${canceladaEm}` : ''}`
    }

    if (isFechada) {
      const fechadaEm = sessao?.fechada_em ? new Date(sessao.fechada_em).toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit'
      }) : ''
      return `Sessão fechada${fechadaEm ? ` às ${fechadaEm}` : ''}. "Não existe o esquecer" - compliance brasileiro.`
    }

    if (isAberta) {
      const abertaEm = sessao?.aberta_em ? new Date(sessao.aberta_em).toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit'
      }) : ''
      if (isApproachingClosure && autoCloseTime) {
        return `Sessão aberta${abertaEm ? ` às ${abertaEm}` : ''}. ⚠️ Fechamento automático às ${autoCloseTime}`
      }
      return `Sessão aberta${abertaEm ? ` às ${abertaEm}` : ''} - Frequência disponível`
    }

    if (isPlanejada) {
      return 'Sessão planejada. Clique em "Abrir Aula" para iniciar.'
    }

    return 'Nenhuma sessão ativa hoje. Abra uma aula para marcar presença.'
  }

  if (loading && !sessao) {
    return (
      <div className={cn("flex items-center space-x-3 p-4 rounded-lg border bg-gray-50", className)}>
        <Loader2 className="h-4 w-4 animate-spin text-gray-600" />
        <div className="flex-1">
          <div className="flex items-center space-x-2">
            <Badge variant="outline">Carregando...</Badge>
          </div>
          <p className="text-sm text-gray-600 mt-1">
            Verificando status da aula...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className={cn(
      "flex items-start space-x-3 p-4 rounded-lg border transition-colors",
      getStatusColor(),
      className
    )}>
      <div className="flex-shrink-0 mt-0.5">
        {getStatusIcon()}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            {getStatusBadge()}

            {isAberta && remainingMinutes !== null && (
              <Badge
                variant="outline"
                className={cn(
                  isApproachingClosure
                    ? "bg-orange-50 border-orange-200 text-orange-700"
                    : "bg-blue-50 border-blue-200 text-blue-700"
                )}
              >
                <Clock className="h-3 w-3 mr-1" />
                {remainingMinutes > 0 ? formatTime(remainingMinutes) : 'Fechamento iminente'}
              </Badge>
            )}
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={refreshStatus}
            className="h-7 w-7 p-0"
            title="Atualizar status"
          >
            <RefreshCw className="h-3 w-3" />
          </Button>
        </div>

        <p className="text-sm text-gray-700">
          {getStatusText()}
        </p>

        {/* Additional information for active sessions */}
        {isAberta && sessao && autoCloseTime && (
          <div className="mt-2 text-xs text-gray-600">
            <p>
              Fechamento automático: {autoCloseTime}
              {sessao.conteudo_ministrado && ` • ${sessao.conteudo_ministrado}`}
            </p>
          </div>
        )}

        {/* Time warning for sessions about to expire */}
        {isOpen && remainingTime !== null && remainingTime <= 15 && remainingTime > 0 && (
          <Alert className="mt-3 border-yellow-200 bg-yellow-50">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-yellow-800">
              <strong>Atenção:</strong> A aula será travada automaticamente em {formatTime(remainingTime)}.
              Finalize a marcação de presença.
            </AlertDescription>
          </Alert>
        )}

        {/* Legal compliance notice for locked sessions */}
        {isLocked && (
          <Alert className="mt-3 border-red-200 bg-red-50">
            <Lock className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              <strong>Documento Legal:</strong> Esta frequência está travada e não pode mais ser alterada,
              conforme a legislação educacional brasileira.
            </AlertDescription>
          </Alert>
        )}

        {/* Error state */}
        {error && (
          <Alert className="mt-3 border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              <strong>Erro:</strong> {error}
            </AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  )
}