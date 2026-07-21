/**
 * Escola Context - Global School Selection State Management
 * Provides escola selection for multi-school users (admin, gestor_sme)
 * Single-school users automatically have their escola set
 */

'use client'

import * as React from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/use-auth'
import { logger } from '@/lib/logger'

// Persist the admin's school choice across tabs and browser restarts.
const STORAGE_KEY = 'educa-selected-escola'

// Types
interface Escola {
  id: string
  nome: string
}

interface EscolaContextType {
  // Data
  escolas: Escola[]
  selectedEscolaId: string | null
  selectedEscola: Escola | null

  // Loading
  loading: boolean

  // Actions
  selectEscola: (id: string | null) => void
  clearSelection: () => void

  // Computed
  shouldShowSelector: boolean
}

const EscolaContext = React.createContext<EscolaContextType | null>(null)

// Provider Component
interface EscolaProviderProps {
  children: React.ReactNode
}

export function EscolaProvider({ children }: EscolaProviderProps) {
  const { userProfile, loading: authLoading } = useAuth()

  // State
  const [escolas, setEscolas] = React.useState<Escola[]>([])
  const [selectedEscolaId, setSelectedEscolaId] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [hydrated, setHydrated] = React.useState(false)

  // Hydrate from localStorage after mount (avoid SSR mismatch)
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        setSelectedEscolaId(stored)
      }
      setHydrated(true)
    }
  }, [])

  // Fetch escolas when userProfile is available
  React.useEffect(() => {
    if (authLoading || !hydrated) return

    const fetchEscolas = async () => {
      setLoading(true)

      try {
        if (!userProfile) {
          setEscolas([])
          setSelectedEscolaId(null)
          setLoading(false)
          return
        }

        const tipoUsuario = userProfile.tipo_usuario

        // Multi-school users: fetch all escolas
        if (tipoUsuario === 'admin' || tipoUsuario === 'gestor_sme') {
          const { data, error } = await supabase
            .from('escolas')
            .select('id, nome')
            .eq('ativo', true)
            .order('nome')

          if (error) {
            logger.error('[EscolaContext] Failed to fetch escolas', error)
            setEscolas([])
          } else {
            setEscolas(data || [])
          }
        }
        // Single-school users: use their escola_id
        else if (userProfile.escola_id) {
          const { data, error } = await supabase
            .from('escolas')
            .select('id, nome')
            .eq('id', userProfile.escola_id)
            .single()

          if (error) {
            logger.error('[EscolaContext] Failed to fetch user escola', error)
            setEscolas([])
          } else if (data) {
            setEscolas([data])
            // Auto-select for single-school users
            setSelectedEscolaId(data.id)
          }
        }
        // Users without escola_id (edge case)
        else {
          setEscolas([])
        }
      } catch (error) {
        logger.error('[EscolaContext] Error fetching escolas', error instanceof Error ? error : String(error))
        setEscolas([])
      } finally {
        setLoading(false)
      }
    }

    fetchEscolas()
  }, [userProfile, authLoading, hydrated])

  // Persist selection to localStorage so new tabs keep the same context.
  const selectEscola = React.useCallback((id: string | null) => {
    setSelectedEscolaId(id)

    if (typeof window !== 'undefined') {
      if (id) {
        localStorage.setItem(STORAGE_KEY, id)
      } else {
        localStorage.removeItem(STORAGE_KEY)
      }
    }
  }, [])

  // Clear selection
  const clearSelection = React.useCallback(() => {
    setSelectedEscolaId(null)

    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY)
    }
  }, [])

  // Derived: selected escola object
  const selectedEscola = React.useMemo(
    () => escolas.find(e => e.id === selectedEscolaId) || null,
    [escolas, selectedEscolaId]
  )

  // Computed: should show selector based on user role
  const shouldShowSelector = React.useMemo(() => {
    if (!userProfile) return false

    const tipoUsuario = userProfile.tipo_usuario

    // Admin and Gestor SME: always show selector (multi-school access)
    if (tipoUsuario === 'admin' || tipoUsuario === 'gestor_sme') {
      return true
    }

    // Diretor and Secretario: never show (single escola bound)
    if (tipoUsuario === 'diretor' || tipoUsuario === 'secretario') {
      return false
    }

    // Coordenador and Professor: show only if multiple escolas
    // (future support for multi-escola coordinators/teachers)
    if (tipoUsuario === 'coordenador' || tipoUsuario === 'professor') {
      return escolas.length > 1
    }

    // Responsavel and others: never show
    return false
  }, [userProfile, escolas.length])

  const contextValue: EscolaContextType = {
    escolas,
    selectedEscolaId,
    selectedEscola,
    loading: loading || authLoading,
    selectEscola,
    clearSelection,
    shouldShowSelector,
  }

  return (
    <EscolaContext.Provider value={contextValue}>
      {children}
    </EscolaContext.Provider>
  )
}

// Custom hook to use escola context
export function useEscola() {
  const context = React.useContext(EscolaContext)
  if (!context) {
    throw new Error('useEscola must be used within an EscolaProvider')
  }
  return context
}
