/**
 * Feature Flag React Query Hooks
 * Check flag status for current escola with caching
 *
 * Provides:
 * - useFeatureFlag: Check single flag status (most common use case)
 * - useAllFlags: List all active flags
 * - useFeatureFlagsWithStatus: Admin matrix view
 * - useToggleFlags: Mutation for bulk toggle
 *
 * @see hooks/use-diary-query.ts for pattern reference
 * @see lib/api/feature-flags.ts for API
 */

'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useEscola } from '@/contexts/escola-context'
import { featureFlagsApi } from '@/lib/api/feature-flags'
import { useAuth } from '@/hooks/use-auth'
import { toast } from 'sonner'
import type { FeatureFlag, FlagWithEscolaStatus } from '@/types/feature-flags'

// ============================================================================
// Query Keys
// ============================================================================

export const featureFlagQueryKeys = {
  all: () => ['featureFlags'] as const,
  flag: (flagName: string, escolaId: string) =>
    [...featureFlagQueryKeys.all(), flagName, escolaId] as const,
  allFlags: () => [...featureFlagQueryKeys.all(), 'list'] as const,
  withStatus: () => [...featureFlagQueryKeys.all(), 'withStatus'] as const,
}

// ============================================================================
// Hooks: Check Single Flag
// ============================================================================

interface UseFeatureFlagOptions {
  /** Enable/disable the query (default: true) */
  enabled?: boolean
}

/**
 * Check if a feature flag is enabled for the current escola
 *
 * IMPORTANT: Returns false while loading (placeholderData: false)
 * This prevents flash of enabled content for disabled features.
 *
 * @param flagName - The flag name to check (e.g., 'nutricao', 'estoque_escolar')
 * @param options - Query options
 * @returns Query result with data (boolean), isLoading, error
 *
 * @example
 * ```tsx
 * const { data: isNutricaoEnabled, isLoading } = useFeatureFlag('nutricao')
 *
 * if (!isNutricaoEnabled) return null // Hidden when disabled
 *
 * return <NutricaoModule />
 * ```
 */
export function useFeatureFlag(
  flagName: string,
  options: UseFeatureFlagOptions = {}
) {
  const { selectedEscolaId } = useEscola()
  const { enabled = true } = options

  return useQuery({
    queryKey: featureFlagQueryKeys.flag(flagName, selectedEscolaId || ''),
    queryFn: async () => {
      if (!selectedEscolaId) return false
      return featureFlagsApi.getFlagForEscola(flagName, selectedEscolaId)
    },
    staleTime: 5 * 60 * 1000, // 5 minutes - static data per CONVENTIONS.md
    gcTime: 10 * 60 * 1000, // 10 minutes
    enabled: enabled && !!selectedEscolaId,
    placeholderData: false, // CRITICAL: false while loading, no flash
  })
}

// ============================================================================
// Hooks: List All Flags (Admin)
// ============================================================================

/**
 * Get all active feature flags
 * Used by admin UI to list available flags
 *
 * @returns Query result with array of FeatureFlag
 */
export function useAllFlags() {
  return useQuery({
    queryKey: featureFlagQueryKeys.allFlags(),
    queryFn: () => featureFlagsApi.getAllFlags(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  })
}

// ============================================================================
// Hooks: Flags with Escola Status (Admin Matrix)
// ============================================================================

/**
 * Get all flags with their escola enablement status
 * Used by admin UI for matrix view
 *
 * @returns Query result with array of FlagWithEscolaStatus
 */
export function useFeatureFlagsWithStatus() {
  return useQuery({
    queryKey: featureFlagQueryKeys.withStatus(),
    queryFn: () => featureFlagsApi.getFlagsWithEscolaStatus(),
    staleTime: 0, // Always refetch - admin toggles need immediate updates
    gcTime: 5 * 60 * 1000, // 5 minutes
  })
}

// ============================================================================
// Mutations: Toggle Flags
// ============================================================================

interface ToggleFlagsParams {
  flagId: string
  escolaIds: string[]
  enabled: boolean
}

/**
 * Mutation to toggle flags for multiple escolas
 * Used by admin UI bulk toggle
 *
 * @returns Mutation with mutate/mutateAsync
 */
export function useToggleFlags() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async (params: ToggleFlagsParams) => {
      if (!user?.id) {
        throw new Error('User not authenticated')
      }
      return featureFlagsApi.toggleFlagsForEscolas(
        params.flagId,
        params.escolaIds,
        params.enabled,
        user.id
      )
    },
    onSuccess: () => {
      // Invalidate all flag-related queries
      queryClient.invalidateQueries({
        queryKey: featureFlagQueryKeys.all(),
      })
      toast.success('Flags atualizadas com sucesso')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao atualizar flags')
    },
  })
}

interface ToggleSingleFlagParams {
  flagId: string
  escolaId: string
  enabled: boolean
}

/**
 * Mutation to toggle a single flag for a single escola
 * Used by admin UI single toggle
 *
 * @returns Mutation with mutate/mutateAsync
 */
export function useToggleSingleFlag() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async (params: ToggleSingleFlagParams) => {
      if (!user?.id) {
        throw new Error('User not authenticated')
      }
      return featureFlagsApi.toggleSingleFlag(
        params.flagId,
        params.escolaId,
        params.enabled,
        user.id
      )
    },
    onSuccess: async () => {
      // Invalidate and refetch immediately to ensure UI updates
      await queryClient.invalidateQueries({
        queryKey: featureFlagQueryKeys.withStatus(),
      })
      await queryClient.refetchQueries({
        queryKey: featureFlagQueryKeys.withStatus(),
      })
      toast.success('Flag atualizada')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao atualizar flag')
    },
  })
}
