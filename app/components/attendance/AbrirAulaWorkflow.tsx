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
  /** @deprecated The server resolves the titular teacher from the turma. */
  professorId: string
  onSuccess?: (sessionId: string) => void
  onCancel?: () => void
}

/** Opens the canonical turma session through the server-backed API adapter. */
export function AbrirAulaWorkflow({ turmaId, professorId, onSuccess, onCancel }: AbrirAulaWorkflowProps) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleAbrirAula = async () => {
    setLoading(true)
    try {
      const today = new Date().toISOString().split('T')[0]
      const session = await enhancedAttendanceApi.createSession({
        turma_id: turmaId,
        professor_id: professorId,
        data_aula: today,
        conteudo_programatico: 'Chamada',
        duracao_minutos: 50,
        status: 'ABERTA',
        inicio_aula: new Date().toISOString(),
        escola_id: '',
      })

      toast.success('Chamada aberta com sucesso!')
      if (onSuccess) {
        onSuccess(session.id)
      } else {
        router.push(`/dashboard/turmas/${turmaId}/chamada?sessao=${session.id}`)
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'SESSION_OPEN_FAILED'
      logger.error('ATTENDANCE_SESSION_OPEN_UI_FAILED', error as Error, {
        feature: 'attendance',
        action: 'open_session',
        metadata: { turmaId },
      })

      if (errorMessage.includes('ERRO_TEMPORAL')) {
        toast.error('Não é possível abrir uma chamada com esta data')
      } else if (errorMessage.includes('ERRO_DUPLICACAO') || errorMessage.includes('SESSION_ALREADY_OPEN')) {
        toast.error('Já existe uma sessão de chamada aberta para esta turma nesta data')
      } else if (errorMessage.includes('ERRO_AUTORIZACAO') || errorMessage.includes('FORBIDDEN') || errorMessage.includes('NOT_OWNED')) {
        toast.error('Você não tem permissão para abrir esta chamada')
      } else {
        toast.error('Erro ao abrir a chamada. Tente novamente.')
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
          Inicie uma nova sessão para registrar a presença dos alunos desta turma.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button onClick={handleAbrirAula} disabled={loading} className="flex-1">
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
            <Button variant="outline" onClick={onCancel} disabled={loading}>
              Cancelar
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
