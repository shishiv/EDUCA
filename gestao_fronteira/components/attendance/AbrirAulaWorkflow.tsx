'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2, BookOpen } from 'lucide-react'
import { toast } from 'sonner'
import { logger } from '@/lib/logger'
import { enhancedAttendanceApi } from '@/lib/api/enhanced-attendance'

export interface AbrirAulaWorkflowProps {
  turmaId: string
  professorId: string
  onSuccess?: (sessionId: string) => void
  onCancel?: () => void
}

export function AbrirAulaWorkflow({ turmaId, professorId, onSuccess, onCancel }: AbrirAulaWorkflowProps) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleAbrirAula = async () => {
    setLoading(true)
    try {
      // Get today's date in YYYY-MM-DD format
      const today = new Date().toISOString().split('T')[0]

      // Create session via API
      const session = await enhancedAttendanceApi.createSession({
        turma_id: turmaId,
        professor_id: professorId,
        data_aula: today,
        conteudo_programatico: '', // Can be filled later
        duracao_minutos: 50, // Default class duration
        status: 'aberta',
        inicio_aula: new Date().toISOString(),
        escola_id: '' // Will be set by the API from teacher's escola
      })

      toast.success('Aula aberta com sucesso!')

      // Call success callback with session ID
      if (onSuccess) {
        onSuccess(session.id)
      } else {
        // Navigate to chamada page for this turma and date
        router.push(`/dashboard/chamada?turmaId=${turmaId}&data=${today}`)
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'

      logger.error('Erro ao abrir aula', error as Error, {
        feature: 'attendance',
        action: 'open_session',
        metadata: { turmaId, professorId }
      })

      // Show user-friendly error message
      if (errorMessage.includes('ERRO_TEMPORAL')) {
        toast.error('Nao e possivel abrir aula com mais de 1 dia de atraso')
      } else if (errorMessage.includes('ERRO_DUPLICACAO')) {
        toast.error('Ja existe uma sessao aberta para esta turma hoje')
      } else if (errorMessage.includes('ERRO_AUTORIZACAO')) {
        toast.error('Voce nao tem permissao para abrir esta aula')
      } else {
        toast.error('Erro ao abrir aula. Tente novamente.')
      }
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
