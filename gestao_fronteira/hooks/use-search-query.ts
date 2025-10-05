/**
 * React Query Hook for Search with Caching
 * Provides optimized search with automatic caching and revalidation
 */

import { useQuery } from '@tanstack/react-query'
import { logger } from '@/lib/logger'

export interface SearchResult {
  id: string
  type: 'student' | 'teacher' | 'school' | 'class'
  data: any
  relevanceScore: number
  matchedFields: string[]
  lastUpdated: Date
  status: string
}

export interface SearchParams {
  query: string
  type?: 'student' | 'teacher' | 'school' | 'class' | 'all'
  limit?: number
  offset?: number
  filters?: Record<string, any>
}

export interface SearchResponse {
  success: boolean
  results: SearchResult[]
  totalCount: number
  query: string
  type: string
}

/**
 * Fetch search results from API
 */
async function fetchSearchResults(params: SearchParams): Promise<SearchResponse> {
  const { query, type = 'all', limit = 50, offset = 0, filters = {} } = params

  // Build query parameters
  const searchParams = new URLSearchParams({
    query,
    type,
    limit: String(limit),
    offset: String(offset)
  })

  // Add additional filters
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== '') {
      searchParams.append(key, String(value))
    }
  })

  // Call search API
  const response = await fetch(`/api/search?${searchParams.toString()}`)

  if (!response.ok) {
    throw new Error(`Search API error: ${response.status}`)
  }

  const data = await response.json()

  return {
    success: data.success ?? true,
    results: data.results || [],
    totalCount: data.totalCount || 0,
    query: data.query || query,
    type: data.type || type
  }
}

/**
 * React Query hook for search with caching
 *
 * Features:
 * - Automatic caching (5 minute stale time)
 * - Deduplication of identical queries
 * - Background refetching
 * - Optimistic updates
 */
export function useSearchQuery(params: SearchParams) {
  return useQuery({
    queryKey: ['search', params.query, params.type, params.filters],
    queryFn: () => fetchSearchResults(params),

    // Cache configuration
    staleTime: 5 * 60 * 1000, // 5 minutes - data is considered fresh
    gcTime: 10 * 60 * 1000, // 10 minutes - cached data kept in memory

    // Only fetch if query is not empty
    enabled: params.query.length >= 2,

    // Retry configuration
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),

    // Error handling
    throwOnError: false,

    // Background refetch
    refetchOnWindowFocus: false, // Don't refetch on window focus for search
    refetchOnReconnect: true,

    // Callbacks
    onError: (error) => {
      logger.error('Search query error', { error, params })
    }
  })
}

/**
 * Hook for prefetching search results
 * Useful for predictive loading based on user behavior
 */
export function usePrefetchSearch() {
  const queryClient = useQuery().client

  return async (params: SearchParams) => {
    await queryClient.prefetchQuery({
      queryKey: ['search', params.query, params.type, params.filters],
      queryFn: () => fetchSearchResults(params),
      staleTime: 5 * 60 * 1000
    })
  }
}

/**
 * Hook to invalidate search cache
 * Call this after creating/updating/deleting entities
 */
export function useInvalidateSearch() {
  const queryClient = useQuery().client

  return {
    // Invalidate all search queries
    invalidateAll: () => {
      queryClient.invalidateQueries({ queryKey: ['search'] })
    },

    // Invalidate specific entity type
    invalidateType: (type: 'student' | 'teacher' | 'school' | 'class') => {
      queryClient.invalidateQueries({
        queryKey: ['search'],
        predicate: (query) => {
          const [, , queryType] = query.queryKey as [string, string, string]
          return queryType === type || queryType === 'all'
        }
      })
    },

    // Clear all search cache
    clearCache: () => {
      queryClient.removeQueries({ queryKey: ['search'] })
    }
  }
}
