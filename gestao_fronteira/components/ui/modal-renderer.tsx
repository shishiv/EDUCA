/**
 * Modal Renderer Component
 * Renders the appropriate modal based on the active modal type
 * Uses shadcn/ui components and ensures only one modal is open at a time
 */

'use client'

import React from 'react'
import { useModal } from './modal-manager'
import { TutorialOverlay } from '../tutorial/TutorialOverlay-fixed'
import { HelpSystem } from '../help/HelpSystem-fixed'
import { AbrirAulaWorkflow } from '../attendance/AbrirAulaWorkflow'
import { AttendanceGrid } from '../attendance/AttendanceGrid'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './dialog'

export function ModalRenderer() {
  const { activeModal, closeModal } = useModal()

  if (!activeModal) {
    return null
  }

  switch (activeModal.type) {
    case 'tutorial':
      return (
        <TutorialOverlay
          steps={activeModal.props?.steps || []}
          onComplete={activeModal.props?.onComplete || (() => {})}
          onSkip={activeModal.props?.onSkip || (() => {})}
          title={activeModal.props?.title}
          description={activeModal.props?.description}
          canSkip={activeModal.props?.canSkip}
          showProgress={activeModal.props?.showProgress}
        />
      )

    case 'help':
      return (
        <HelpSystem
          onClose={activeModal.props?.onClose}
          initialSection={activeModal.props?.initialSection}
          searchQuery={activeModal.props?.searchQuery}
        />
      )

    case 'abrir-aula':
      return (
        <Dialog open={true} onOpenChange={(open) => { if (!open) closeModal() }}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
            <DialogHeader>
              <DialogTitle>
                Abrir Aula - {activeModal.props?.classInfo?.nome}
              </DialogTitle>
              <DialogDescription>
                Inicie uma nova sessão de aula para registrar a frequência dos alunos.
                Este processo cria uma sessão oficial para controle de presença.
              </DialogDescription>
            </DialogHeader>
            <AbrirAulaWorkflow
              turmaId={activeModal.props?.classInfo?.id}
              onWorkflowComplete={closeModal}
            />
          </DialogContent>
        </Dialog>
      )

    case 'attendance':
      return (
        <Dialog open={true} onOpenChange={(open) => { if (!open) closeModal() }}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-auto">
            <DialogHeader>
              <DialogTitle>
                Marcar Frequência - {activeModal.props?.classInfo?.nome}
              </DialogTitle>
              <DialogDescription>
                Registre a presença dos alunos para esta sessão de aula.
                A frequência marcada não poderá ser alterada após o salvamento.
              </DialogDescription>
            </DialogHeader>
            <AttendanceGrid
              turmaId={activeModal.props?.classInfo?.id}
              sessaoId="mock-session-id"
              onComplete={closeModal}
            />
          </DialogContent>
        </Dialog>
      )

    default:
      return null
  }
}