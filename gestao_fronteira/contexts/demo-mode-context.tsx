/**
 * Demo Mode Context - Temporary Admin Permission Elevation
 *
 * Allows admin users to temporarily record attendance for demonstration/training purposes.
 * Demo mode is session-scoped (sessionStorage) - clears when browser tab closes.
 *
 * Security:
 * - Only admin users can enter demo mode (canUseDemoMode check)
 * - Actions are still recorded with admin's real user_id (audit trail)
 * - Demo mode overrides isViewOnly only for the specific turma
 *
 * Pattern: Follows EscolaContext implementation with sessionStorage hydration
 *
 * @see .planning/phases/13-admin-demo-assignment/13-RESEARCH.md
 */

'use client'

import * as React from 'react'
import { useAuth } from '@/hooks/use-auth'

// Storage key for sessionStorage
const STORAGE_KEY = 'educa-demo-mode'

// Types
interface DemoModeContextType {
  /** Whether demo mode is currently active */
  isDemoMode: boolean
  /** The turma ID for which demo mode is active */
  demoTurmaId: string | null
  /** Enter demo mode for a specific turma */
  enterDemoMode: (turmaId: string) => void
  /** Exit demo mode */
  exitDemoMode: () => void
  /** Whether the current user can use demo mode (admin only) */
  canUseDemoMode: boolean
}

const DemoModeContext = React.createContext<DemoModeContextType | null>(null)

// Provider Component
interface DemoModeProviderProps {
  children: React.ReactNode
}

export function DemoModeProvider({ children }: DemoModeProviderProps) {
  const { userProfile } = useAuth()

  // State
  const [demoTurmaId, setDemoTurmaId] = React.useState<string | null>(null)
  const [hydrated, setHydrated] = React.useState(false)

  // Hydrate from sessionStorage after mount (avoid SSR mismatch)
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = sessionStorage.getItem(STORAGE_KEY)
      if (stored) {
        setDemoTurmaId(stored)
      }
      setHydrated(true)
    }
  }, [])

  // Only admin can use demo mode
  const canUseDemoMode = userProfile?.tipo_usuario === 'admin'

  // Demo mode is active if hydrated, has turma ID, and user can use it
  const isDemoMode = hydrated && !!demoTurmaId && canUseDemoMode

  // Enter demo mode for a specific turma
  const enterDemoMode = React.useCallback((turmaId: string) => {
    setDemoTurmaId(turmaId)
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(STORAGE_KEY, turmaId)
    }
  }, [])

  // Exit demo mode
  const exitDemoMode = React.useCallback(() => {
    setDemoTurmaId(null)
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem(STORAGE_KEY)
    }
  }, [])

  const contextValue: DemoModeContextType = {
    isDemoMode,
    demoTurmaId,
    enterDemoMode,
    exitDemoMode,
    canUseDemoMode,
  }

  return (
    <DemoModeContext.Provider value={contextValue}>
      {children}
    </DemoModeContext.Provider>
  )
}

// Custom hook to use demo mode context
export function useDemoMode() {
  const context = React.useContext(DemoModeContext)
  if (!context) {
    throw new Error('useDemoMode must be used within a DemoModeProvider')
  }
  return context
}
