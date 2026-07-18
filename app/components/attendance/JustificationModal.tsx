/**
 * JustificationModal Component
 * Modal for entering mandatory justification reason when marking J (Justificada)
 *
 * @see .planning/phases/04-turmas-chamada/04-02-PLAN.md
 */

'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'

// ============================================================================
// Types
// ============================================================================

export interface JustificationModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (motivo: string) => void
  studentName: string
}

// ============================================================================
// Component
// ============================================================================

export function JustificationModal({
  isOpen,
  onClose,
  onConfirm,
  studentName,
}: JustificationModalProps) {
  const [motivo, setMotivo] = useState('')

  // Reset motivo when modal opens
  useEffect(() => {
    if (isOpen) {
      setMotivo('')
    }
  }, [isOpen])

  const handleConfirm = () => {
    if (motivo.trim()) {
      onConfirm(motivo.trim())
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Allow Ctrl+Enter to submit
    if (e.key === 'Enter' && e.ctrlKey && motivo.trim()) {
      e.preventDefault()
      handleConfirm()
    }
  }

  const isValidMotivo = motivo.trim().length > 0

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Justificar Falta</DialogTitle>
          <DialogDescription>
            Informe o motivo da falta justificada para {studentName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="motivo">
              Motivo <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="motivo"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ex: Atestado medico, comparecimento a audiencia, doenca familiar..."
              className="min-h-[100px] resize-none"
              autoFocus
            />
            <p className="text-xs text-muted-foreground">
              O motivo e obrigatorio para registro de falta justificada.
              Pressione Ctrl+Enter para confirmar.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={!isValidMotivo}
          >
            Confirmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default JustificationModal
