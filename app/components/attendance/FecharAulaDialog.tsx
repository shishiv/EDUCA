'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Loader2, XCircle, CheckCircle } from 'lucide-react'
import { logger } from '@/lib/logger'

export interface FecharAulaDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (observacoes?: string) => Promise<void>
  sessaoId: string
}

export function FecharAulaDialog({ open, onOpenChange, onConfirm, sessaoId }: FecharAulaDialogProps) {
  const [observacoes, setObservacoes] = useState('')
  const [loading, setLoading] = useState(false)

  const handleConfirm = async () => {
    setLoading(true)
    try {
      await onConfirm(observacoes)
      onOpenChange(false)
      setObservacoes('')
    } catch (error) {
      logger.error('Erro ao fechar aula', error as Error, {
        feature: 'attendance',
        action: 'close_session',
        metadata: { sessaoId, hasObservacoes: !!observacoes }
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            Encerrar Aula
          </DialogTitle>
          <DialogDescription>
            Confirme o encerramento da aula. Após confirmar, a frequência será bloqueada e não poderá ser alterada.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="observacoes">
              Observações (opcional)
            </Label>
            <Textarea
              id="observacoes"
              placeholder="Adicione observações sobre a aula, se necessário..."
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              rows={4}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              Ex: Conteúdo ministrado, atividades realizadas, comportamento da turma, etc.
            </p>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <div className="flex gap-2">
              <XCircle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-amber-800">
                <strong>Atenção:</strong> Esta ação não pode ser desfeita. A frequência ficará bloqueada após o encerramento.
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={loading}
            className="bg-green-600 hover:bg-green-700"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Encerrando...
              </>
            ) : (
              <>
                <CheckCircle className="mr-2 h-4 w-4" />
                Confirmar Encerramento
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
