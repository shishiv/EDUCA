'use client'

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { HelpCircle } from 'lucide-react'

interface HelpSystemProps {
  isOpen: boolean
  onClose: () => void
  topic?: string
}

export function HelpSystem({ isOpen, onClose, topic }: HelpSystemProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5" />
            Central de Ajuda
          </DialogTitle>
          <DialogDescription>
            Sistema de ajuda em desenvolvimento...
          </DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  )
}
