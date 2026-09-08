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
import type { UserProfile } from '@/lib/auth'
import {
  readStoredSchoolSelection,
  schoolSelectionMode,
  shouldShowSchoolSelector,
  writeStoredSchoolSelection,
} from '@/contexts/escola-selection'

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

interface EscolaLoadResult {
  escolas: Escola[]
  selectedEscolaId: string | null
}

async function loadMultiSchoolSelection(userId: string): Promise<EscolaLoadResult> {
  const { data, error } = await supabase
    .from('escolas')
    .select('id, nome')
    .eq('ativo', true)
    .order('nome')

  if (error) {
    logger.error('[EscolaContext] Failed to fetch escolas', error)
    return { escolas: [], selectedEscolaId: null }
  }

  const escolas = data ?? []
  const selectedEscolaId = readStoredSchoolSelection(userId, escolas, sessionStorage)
  return { escolas, selectedEscolaId }
}

async function loadSingleSchool(escolaId: string): Promise<EscolaLoadResult> {
  const { data, error } = await supabase
    .from('escolas')
    .select('id, nome')
    .eq('id', escolaId)
    .single()

  if (error) {
    logger.error('[EscolaContext] Failed to fetch user escola', error)
    return { escolas: [], selectedEscolaId: null }
  }
  return data
    ? { escolas: [data], selectedEscolaId: data.id }
    : { escolas: [], selectedEscolaId: null }
}

async function loadAccessibleSchools(userProfile: UserProfile): Promise<EscolaLoadResult> {
  const mode = schoolSelectionMode(userProfile)
  if (mode === 'multi') return loadMultiSchoolSelection(userProfile.id)
  if (mode === 'single' && userProfile.escola_id) return loadSingleSchool(userProfile.escola_id)
  return { escolas: [], selectedEscolaId: null }
}

export function EscolaProvider({ children }: EscolaProviderProps) {
  const { userProfile, loading: authLoading } = useAuth()

  // State
  const [escolas, setEscolas] = React.useState<Escola[]>([])
  const [selectedEscolaId, setSelectedEscolaId] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [hydrated, setHydrated] = React.useState(false)

  // Hydrate from sessionStorage after mount (avoid SSR mismatch)
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      setHydrated(true)
    }
  }, [])

  // Fetch escolas when userProfile is available
  React.useEffect(() => {
    if (authLoading || !hydrated) return
    let active = true

    const fetchEscolas = async () => {
      setLoading(true)

      try {
        if (!userProfile) {
          setEscolas([])
          setSelectedEscolaId(null)
          return
        }
        const result = await loadAccessibleSchools(userProfile)
        if (!active) return
        setEscolas(result.escolas)
        setSelectedEscolaId(result.selectedEscolaId)
      } catch (error) {
        if (!active) return
        logger.error('[EscolaContext] Error fetching escolas', error instanceof Error ? error : String(error))
        setEscolas([])
        setSelectedEscolaId(null)
      } finally {
        if (active) setLoading(false)
      }
    }

    void fetchEscolas()
    return () => { active = false }
  }, [userProfile, authLoading, hydrated])

  // The UI selection is scoped to the authenticated identity. It narrows
  // presentation only; every data read remains protected by server/RLS scope.
  const selectEscola = React.useCallback((id: string | null) => {
    if (id && !escolas.some(escola => escola.id === id)) return
    setSelectedEscolaId(id)

    if (typeof window !== 'undefined' && userProfile) {
      writeStoredSchoolSelection(userProfile.id, id, sessionStorage)
    }
  }, [escolas, userProfile])

  // Clear selection
  const clearSelection = React.useCallback(() => {
    setSelectedEscolaId(null)

    if (typeof window !== 'undefined' && userProfile) {
      writeStoredSchoolSelection(userProfile.id, null, sessionStorage)
    }
  }, [userProfile])

  // Derived: selected escola object
  const selectedEscola = React.useMemo(
    () => escolas.find(e => e.id === selectedEscolaId) || null,
    [escolas, selectedEscolaId]
  )

  // Computed: should show selector based on user role
  const shouldShowSelector = React.useMemo(() => {
    if (!userProfile) return false
    return shouldShowSchoolSelector(userProfile, escolas.length)
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
