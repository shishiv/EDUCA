/**
 * React Query configuration and helpers
 * Centralized query keys and invalidation utilities
 */

// Query key factory for type-safe query keys
export const queryKeys = {
  users: {
    all: () => ['users'] as const,
    list: (filters?: {
      searchTerm?: string
      roles?: string[]
      schools?: string[]
      activeOnly?: boolean
      limit?: number
      offset?: number
    }) => [...queryKeys.users.all(), 'list', filters] as const,
    detail: (id: string) => [...queryKeys.users.all(), 'detail', id] as const,
    stats: () => [...queryKeys.users.all(), 'stats'] as const,
  },
  schools: {
    all: () => ['schools'] as const,
    list: () => [...queryKeys.schools.all(), 'list'] as const,
    detail: (id: string) => [...queryKeys.schools.all(), 'detail', id] as const,
  },
  turmas: {
    all: () => ['turmas'] as const,
    list: (escolaId?: string) => [...queryKeys.turmas.all(), 'list', escolaId] as const,
    detail: (id: string) => [...queryKeys.turmas.all(), 'detail', id] as const,
  },
}

// Invalidation helpers using queryClient from context
// Note: These should be called within React components with access to queryClient
import { useQueryClient } from '@tanstack/react-query'

export function useInvalidateQueries() {
  const queryClient = useQueryClient()

  return {
    users: () => queryClient.invalidateQueries({ queryKey: queryKeys.users.all() }),
    usersList: () => queryClient.invalidateQueries({ queryKey: ['users', 'list'] }),
    userStats: () => queryClient.invalidateQueries({ queryKey: ['users', 'stats'] }),
    schools: () => queryClient.invalidateQueries({ queryKey: queryKeys.schools.all() }),
    turmas: () => queryClient.invalidateQueries({ queryKey: queryKeys.turmas.all() }),
  }
}

// For backward compatibility - direct invalidation object
// This requires queryClient to be passed or used in a context that provides it
export const invalidateQueries = {
  users: () => {
    console.warn('invalidateQueries.users() called outside React context - use useInvalidateQueries() hook instead')
  },
  usersList: () => {
    console.warn('invalidateQueries.usersList() called outside React context - use useInvalidateQueries() hook instead')
  },
  userStats: () => {
    console.warn('invalidateQueries.userStats() called outside React context - use useInvalidateQueries() hook instead')
  },
}
