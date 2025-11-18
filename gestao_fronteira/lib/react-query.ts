'use client'

import { QueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

// Type definitions for error handling
interface ApiError {
  message?: string
  status?: number
}

// Type guard for API errors
function isApiError(error: unknown): error is ApiError {
  return (
    typeof error === 'object' &&
    error !== null &&
    ('message' in error || 'status' in error)
  )
}

// Create a client
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Stale time for educational data - 5 minutes
      staleTime: 5 * 60 * 1000,
      // Garbage collect time - 10 minutes
      gcTime: 10 * 60 * 1000,
      // Retry configuration
      retry: (failureCount, error: unknown) => {
        // Don't retry on 4xx errors except 408, 429
        if (isApiError(error) && error.status) {
          if (error.status >= 400 && error.status < 500 && ![408, 429].includes(error.status)) {
            return false
          }
        }
        // Retry up to 3 times for other errors
        return failureCount < 3
      },
      // Refetch on window focus for critical data
      refetchOnWindowFocus: true,
      // Refetch on reconnect
      refetchOnReconnect: true,
    },
    mutations: {
      // Global error handling
      onError: (error: unknown) => {

        // Show user-friendly error messages
        const message = isApiError(error) && error.message
          ? error.message
          : 'Ocorreu um erro inesperado'

        // Handle common error types
        if (isApiError(error) && error.status) {
          if (error.status === 401) {
            toast.error('Sessão expirada. Faça login novamente.')
          } else if (error.status === 403) {
            toast.error('Você não tem permissão para realizar esta ação.')
          } else if (error.status === 404) {
            toast.error('Recurso não encontrado.')
          } else if (error.status >= 500) {
            toast.error('Erro interno do servidor. Tente novamente.')
          } else {
            toast.error(message)
          }
        } else {
          toast.error(message)
        }
      },
      // Global success handling
      onSuccess: () => {
        // You can add global success handling here if needed
      }
    }
  }
})

// Type definitions for query filters
export interface QueryFilters {
  search?: string
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  [key: string]: string | number | boolean | undefined
}

// Query keys for consistent cache management
export const queryKeys = {
  // Users
  users: {
    all: () => ['users'] as const,
    lists: () => [...queryKeys.users.all(), 'list'] as const,
    list: (filters?: QueryFilters) => [...queryKeys.users.lists(), { filters }] as const,
    details: () => [...queryKeys.users.all(), 'detail'] as const,
    detail: (id: string) => [...queryKeys.users.details(), id] as const,
    stats: () => [...queryKeys.users.all(), 'stats'] as const,
    profile: (id: string) => [...queryKeys.users.all(), 'profile', id] as const,
  },

  // Schools
  schools: {
    all: () => ['schools'] as const,
    lists: () => [...queryKeys.schools.all(), 'list'] as const,
    list: (filters?: QueryFilters) => [...queryKeys.schools.lists(), { filters }] as const,
    details: () => [...queryKeys.schools.all(), 'detail'] as const,
    detail: (id: string) => [...queryKeys.schools.details(), id] as const,
  },

  // Students
  students: {
    all: () => ['students'] as const,
    lists: () => [...queryKeys.students.all(), 'list'] as const,
    list: (filters?: QueryFilters) => [...queryKeys.students.lists(), { filters }] as const,
    details: () => [...queryKeys.students.all(), 'detail'] as const,
    detail: (id: string) => [...queryKeys.students.details(), id] as const,
    bySchool: (schoolId: string) => [...queryKeys.students.all(), 'bySchool', schoolId] as const,
    byClass: (classId: string) => [...queryKeys.students.all(), 'byClass', classId] as const,
  },

  // Classes
  classes: {
    all: () => ['classes'] as const,
    lists: () => [...queryKeys.classes.all(), 'list'] as const,
    list: (filters?: QueryFilters) => [...queryKeys.classes.lists(), { filters }] as const,
    details: () => [...queryKeys.classes.all(), 'detail'] as const,
    detail: (id: string) => [...queryKeys.classes.details(), id] as const,
    bySchool: (schoolId: string) => [...queryKeys.classes.all(), 'bySchool', schoolId] as const,
  },

  // Attendance
  attendance: {
    all: () => ['attendance'] as const,
    lists: () => [...queryKeys.attendance.all(), 'list'] as const,
    list: (filters?: QueryFilters) => [...queryKeys.attendance.lists(), { filters }] as const,
    byClass: (classId: string, date?: string) =>
      [...queryKeys.attendance.all(), 'byClass', classId, date] as const,
    byStudent: (studentId: string, period?: string) =>
      [...queryKeys.attendance.all(), 'byStudent', studentId, period] as const,
    stats: (filters?: QueryFilters) => [...queryKeys.attendance.all(), 'stats', { filters }] as const,
  },

  // Reports
  reports: {
    all: () => ['reports'] as const,
    attendance: (filters?: QueryFilters) => [...queryKeys.reports.all(), 'attendance', { filters }] as const,
    frequency: (filters?: QueryFilters) => [...queryKeys.reports.all(), 'frequency', { filters }] as const,
    students: (filters?: QueryFilters) => [...queryKeys.reports.all(), 'students', { filters }] as const,
  }
} as const

// Cache invalidation helpers
export const invalidateQueries = {
  users: () => queryClient.invalidateQueries({ queryKey: queryKeys.users.all() }),
  usersList: () => queryClient.invalidateQueries({ queryKey: queryKeys.users.lists() }),
  userDetail: (id: string) => queryClient.invalidateQueries({ queryKey: queryKeys.users.detail(id) }),
  userStats: () => queryClient.invalidateQueries({ queryKey: queryKeys.users.stats() }),

  schools: () => queryClient.invalidateQueries({ queryKey: queryKeys.schools.all() }),
  schoolsList: () => queryClient.invalidateQueries({ queryKey: queryKeys.schools.lists() }),

  students: () => queryClient.invalidateQueries({ queryKey: queryKeys.students.all() }),
  studentsList: () => queryClient.invalidateQueries({ queryKey: queryKeys.students.lists() }),

  attendance: () => queryClient.invalidateQueries({ queryKey: queryKeys.attendance.all() }),
  attendanceByClass: (classId: string) =>
    queryClient.invalidateQueries({ queryKey: queryKeys.attendance.byClass(classId) }),

  reports: () => queryClient.invalidateQueries({ queryKey: queryKeys.reports.all() }),
}

// Generic type for entity updates
type EntityUpdates = Record<string, unknown>

// Generic type for list items with id
interface EntityWithId {
  id: string
  [key: string]: unknown
}

// Optimistic update helpers
export const optimisticUpdates = {
  updateUser: (userId: string, updates: EntityUpdates) => {
    queryClient.setQueryData(
      queryKeys.users.detail(userId),
      (old: unknown) => {
        if (!old || typeof old !== 'object') return old
        return { ...old, ...updates }
      }
    )
  },

  updateUserInList: (userId: string, updates: EntityUpdates) => {
    queryClient.setQueriesData(
      { queryKey: queryKeys.users.lists() },
      (old: unknown) => {
        if (!old || !Array.isArray(old)) return old
        return old.map((user: unknown) => {
          if (
            typeof user === 'object' &&
            user !== null &&
            'id' in user &&
            (user as EntityWithId).id === userId
          ) {
            return { ...user, ...updates }
          }
          return user
        })
      }
    )
  },
}

// Prefetch helpers for better UX
export const prefetchQueries = {
  userDetail: async (id: string) => {
    await queryClient.prefetchQuery({
      queryKey: queryKeys.users.detail(id),
      queryFn: () => import('@/lib/api/users').then(({ usersApi }) => usersApi.getById(id)),
      staleTime: 2 * 60 * 1000, // 2 minutes for detail views
    })
  },

  usersList: async (filters?: QueryFilters) => {
    await queryClient.prefetchQuery({
      queryKey: queryKeys.users.list(filters),
      queryFn: () => import('@/lib/api/users').then(({ usersApi }) =>
        usersApi.getUsersWithSchool(filters)
      ),
      staleTime: 1 * 60 * 1000, // 1 minute for lists
    })
  }
}