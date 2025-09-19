'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Unlock, CheckCircle, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface AbrirAulaButtonProps {
  turmaId: string
  professorId: string
  turmaNome: string
  isSessionOpen?: boolean
  disabled?: boolean
  className?: string
  onSuccess?: (sessionData: any) => void
  onError?: (error: any) => void
}

export function AbrirAulaButton({
  turmaId,
  professorId,
  turmaNome,
  isSessionOpen = false,
  disabled = false,
  className,
  onSuccess,
  onError
}: AbrirAulaButtonProps) {
  const [loading, setLoading] = useState(false)
  const [sessionOpened, setSessionOpened] = useState(isSessionOpen)

  const handleAbrirAula = async () => {
    if (loading || sessionOpened) return

    setLoading(true)

    try {
      const response = await fetch('/api/aulas/abrir', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          turma_id: turmaId,
          observacoes: 'Aula aberta via interface do professor'
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error?.message || 'Erro ao abrir aula')
      }

      if (result.success) {
        setSessionOpened(true)
        toast.success(
          'Aula aberta com sucesso! Agora você pode marcar a frequência dos alunos.'
        )
        onSuccess?.(result.data)
      } else {
        throw new Error(result.error?.message || 'Erro desconhecido')
      }

    } catch (error: any) {
      console.error('Erro ao abrir aula:', error)

      let errorMessage = 'Erro ao abrir aula. Tente novamente.'

      if (error.message) {
        errorMessage = error.message
      } else if (error.name === 'TypeError' && error.message?.includes('fetch')) {
        errorMessage = 'Erro de conexão. Verifique sua internet e tente novamente.'
      }

      toast.error(errorMessage)
      onError?.(error)
    } finally {
      setLoading(false)
    }
  }

  const getCurrentTime = () => {
    return new Date().toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'America/Sao_Paulo'
    })
  }

  if (sessionOpened) {
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
          <span className="text-xs opacity-90">Frequência Liberada</span>
        </div>
        <Badge
          variant="outline"
          className="ml-2 bg-green-100 border-green-300 text-green-700"
        >
          {getCurrentTime()}
        </Badge>
      </Button>
    )
  }

  return (
    <Button
      onClick={handleAbrirAula}
      disabled={disabled || loading}
      className={cn(
        'w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white min-h-[44px]',
        className
      )}
      aria-label={`Abrir aula para turma ${turmaNome}`}
      aria-disabled={disabled || loading}
    >
      {loading ? (
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