'use client'

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'

interface TutorialOverlayProps {
  isOpen: boolean
  onClose: () => void
  step?: number
}

export function TutorialOverlay({ isOpen, onClose, step = 0 }: TutorialOverlayProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tutorial</DialogTitle>
          <DialogDescription>
            Tutorial em desenvolvimento...
          </DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  )
}
