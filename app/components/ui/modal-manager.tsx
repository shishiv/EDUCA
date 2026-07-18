/**
 * Modal Manager Component
 * Centralized modal state management to prevent overlapping modals
 * Uses shadcn/ui Dialog components with proper z-index management
 */

'use client'

import React, { createContext, useContext, useState, useCallback } from 'react'

type ModalType = 'close-session' | 'cancel-session' | 'abrir-aula' | 'attendance' | null

interface ModalState {
  type: ModalType
  props?: any
}

interface ModalContextType {
  activeModal: ModalState | null
  openModal: (type: ModalType, props?: any) => void
  closeModal: () => void
  isModalOpen: (type?: ModalType) => boolean
}

const ModalContext = createContext<ModalContextType | undefined>(undefined)

export function ModalProvider({ children }: { children: React.ReactNode }) {
  const [activeModal, setActiveModal] = useState<ModalState | null>(null)

  const openModal = useCallback((type: ModalType, props?: any) => {
    // Close any existing modal first
    setActiveModal(null)

    // Small delay to ensure proper cleanup
    setTimeout(() => {
      setActiveModal({ type, props })
    }, 100)
  }, [])

  const closeModal = useCallback(() => {
    setActiveModal(null)
  }, [])

  const isModalOpen = useCallback((type?: ModalType) => {
    if (type) {
      return activeModal?.type === type
    }
    return activeModal !== null
  }, [activeModal])

  return (
    <ModalContext.Provider value={{
      activeModal,
      openModal,
      closeModal,
      isModalOpen
    }}>
      {children}
    </ModalContext.Provider>
  )
}

export function useModal() {
  const context = useContext(ModalContext)
  if (context === undefined) {
    throw new Error('useModal must be used within a ModalProvider')
  }
  return context
}