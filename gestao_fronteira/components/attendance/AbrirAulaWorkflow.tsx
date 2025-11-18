'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2, BookOpen } from 'lucide-react'
import { toast } from 'sonner'
import { logger } from '@/lib/logger'

interface AbrirAulaWorkflowProps {
  turmaId: string
  professorId: string
  onSuccess?: () => void
  onCancel?: () => void
}

export function AbrirAulaWorkflow({ turmaId, professorId, onSuccess, onCancel }: AbrirAulaWorkflowProps) {
  const [loading, setLoading] = useState(false)

  const handleAbrirAula = async () => {
    setLoading(true)
    try {
      // TODO: Implement actual logic to open class session
      toast.success('Aula aberta com sucesso!')
      onSuccess?.()
    } catch (error) {
      logger.error('Erro ao abrir aula', error as Error, {
        feature: 'attendance',
        action: 'open_session',
        metadata: { turmaId, professorId }
      })
      toast.error('Erro ao abrir aula')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="h-5 w-5" />
          Abrir Aula
        </CardTitle>
        <CardDescription>
          Inicie uma nova sessão de aula para marcar frequência
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button
            onClick={handleAbrirAula}
            disabled={loading}
            className="flex-1"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Abrindo...
              </>
            ) : (
              'Abrir Aula'
            )}
          </Button>
          {onCancel && (
            <Button
              variant="outline"
              onClick={onCancel}
              disabled={loading}
            >
              Cancelar
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
