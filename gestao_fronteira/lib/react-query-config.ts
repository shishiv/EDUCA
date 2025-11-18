'use client'

import { QueryClient, DefaultOptions } from '@tanstack/react-query'

// Educational data caching strategies optimized for school environment
const EDUCATIONAL_CACHE_CONFIG = {
  // Student data - relatively stable, cache for longer
  students: {
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 30 * 60 * 1000, // 30 minutes
    refetchOnWindowFocus: false,
    retry: 3
  },

  // School and class data - very stable
  schools: {
    staleTime: 15 * 60 * 1000, // 15 minutes
    cacheTime: 60 * 60 * 1000, // 1 hour
    refetchOnWindowFocus: false,
    retry: 2
  },

  // Attendance data - critical and frequently changing
  attendance: {
    staleTime: 30 * 1000, // 30 seconds
    cacheTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: true,
    retry: 5,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000)
  },

  // Grades - moderate frequency changes
  grades: {
    staleTime: 2 * 60 * 1000, // 2 minutes
    cacheTime: 15 * 60 * 1000, // 15 minutes
    refetchOnWindowFocus: false,
    retry: 3
  },

  // User profiles - rarely changes
  userProfile: {
    staleTime: 10 * 60 * 1000, // 10 minutes
    cacheTime: 60 * 60 * 1000, // 1 hour
    refetchOnWindowFocus: false,
    retry: 2
  },

  // Reports - expensive queries, cache aggressively
  reports: {
    staleTime: 10 * 60 * 1000, // 10 minutes
    cacheTime: 60 * 60 * 1000, // 1 hour
    refetchOnWindowFocus: false,
    retry: 2
  }
}

// Default React Query configuration optimized for educational management
const defaultQueryOptions: DefaultOptions = {
  queries: {
    // General settings for all queries
    staleTime: 2 * 60 * 1000, // 2 minutes default
    cacheTime: 10 * 60 * 1000, // 10 minutes default
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    retry: (failureCount, error: any) => {
      // Don't retry on 4xx errors (client errors)
      if (error?.status >= 400 && error?.status < 500) {
        return false
      }
      // Retry up to 3 times for other errors
      return failureCount < 3
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000)
  },
  mutations: {
    // Attendance submissions need immediate retry
    retry: (failureCount, error: any) => {
      if (error?.status >= 400 && error?.status < 500) {
        return false
      }
      return failureCount < 5 // More retries for critical operations
    },
    retryDelay: (attemptIndex) => Math.min(500 * 2 ** attemptIndex, 5000)
  }
}

// Create optimized QueryClient for educational system
export function createEducationalQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: defaultQueryOptions,
    logger: {
      log: console.log,
      warn: console.warn,
      error: (error) => {
        // Enhanced error logging for educational context
        //         // console.error('Educational Query Error:', {
        //           message: error,
        //           timestamp: new Date().toISOString(),
        //           userAgent: navigator.userAgent
        //         })
      }
    }
  })
}

// Query key factories for consistent caching
export const queryKeys = {
  // Student queries
  students: {
    all: ['students'] as const,
    lists: () => [...queryKeys.students.all, 'list'] as const,
    list: (filters: Record<string, any>) => [...queryKeys.students.lists(), filters] as const,
    details: () => [...queryKeys.students.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.students.details(), id] as const,
    bySchool: (schoolId: string) => [...queryKeys.students.all, 'school', schoolId] as const,
    byClass: (classId: string) => [...queryKeys.students.all, 'class', classId] as const
  },

  // School queries
  schools: {
    all: ['schools'] as const,
    lists: () => [...queryKeys.schools.all, 'list'] as const,
    detail: (id: string) => [...queryKeys.schools.all, 'detail', id] as const,
    classes: (schoolId: string) => [...queryKeys.schools.all, schoolId, 'classes'] as const
  },

  // Attendance queries
  attendance: {
    all: ['attendance'] as const,
    byClass: (classId: string, date: string) => [...queryKeys.attendance.all, 'class', classId, date] as const,
    byStudent: (studentId: string) => [...queryKeys.attendance.all, 'student', studentId] as const,
    summary: (filters: Record<string, any>) => [...queryKeys.attendance.all, 'summary', filters] as const,
    reports: (filters: Record<string, any>) => [...queryKeys.attendance.all, 'reports', filters] as const
  },

  // Grade queries
  grades: {
    all: ['grades'] as const,
    byStudent: (studentId: string) => [...queryKeys.grades.all, 'student', studentId] as const,
    byClass: (classId: string) => [...queryKeys.grades.all, 'class', classId] as const,
    byPeriod: (period: string) => [...queryKeys.grades.all, 'period', period] as const
  },

  // User queries
  users: {
    all: ['users'] as const,
    profile: () => [...queryKeys.users.all, 'profile'] as const,
    byRole: (role: string) => [...queryKeys.users.all, 'role', role] as const
  },

  // Report queries
  reports: {
    all: ['reports'] as const,
    attendance: (filters: Record<string, any>) => [...queryKeys.reports.all, 'attendance', filters] as const,
    academic: (filters: Record<string, any>) => [...queryKeys.reports.all, 'academic', filters] as const,
    dashboard: () => [...queryKeys.reports.all, 'dashboard'] as const
  }
}

// Educational-specific query options
export const educationalQueryOptions = {
  // Get students with educational caching
  students: (filters?: Record<string, any>) => ({
    queryKey: queryKeys.students.list(filters || {}),
    ...EDUCATIONAL_CACHE_CONFIG.students
  }),

  // Get student details
  studentDetail: (id: string) => ({
    queryKey: queryKeys.students.detail(id),
    ...EDUCATIONAL_CACHE_CONFIG.students
  }),

  // Get attendance data (critical for educational compliance)
  attendance: (classId: string, date: string) => ({
    queryKey: queryKeys.attendance.byClass(classId, date),
    ...EDUCATIONAL_CACHE_CONFIG.attendance
  }),

  // Get schools (stable data)
  schools: () => ({
    queryKey: queryKeys.schools.lists(),
    ...EDUCATIONAL_CACHE_CONFIG.schools
  }),

  // Get user profile
  userProfile: () => ({
    queryKey: queryKeys.users.profile(),
    ...EDUCATIONAL_CACHE_CONFIG.userProfile
  }),

  // Get reports (expensive queries)
  attendanceReport: (filters: Record<string, any>) => ({
    queryKey: queryKeys.reports.attendance(filters),
    ...EDUCATIONAL_CACHE_CONFIG.reports
  })
}

// Cache invalidation helpers for educational workflows
export const cacheInvalidation = {
  // Invalidate after student operations
  afterStudentUpdate: (queryClient: QueryClient, studentId?: string) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.students.all })
    if (studentId) {
      queryClient.invalidateQueries({ queryKey: queryKeys.attendance.byStudent(studentId) })
    }
  },

  // Invalidate after attendance marking (critical)
  afterAttendanceUpdate: (queryClient: QueryClient, classId: string, date: string) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.attendance.byClass(classId, date) })
    queryClient.invalidateQueries({ queryKey: queryKeys.attendance.summary({}) })
    queryClient.invalidateQueries({ queryKey: queryKeys.reports.attendance({}) })
  },

  // Invalidate after grade updates
  afterGradeUpdate: (queryClient: QueryClient, studentId: string, classId: string) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.grades.byStudent(studentId) })
    queryClient.invalidateQueries({ queryKey: queryKeys.grades.byClass(classId) })
  },

  // Clear all caches (admin operation)
  clearAllCaches: (queryClient: QueryClient) => {
    queryClient.clear()
  },

  // Selective cache refresh for performance
  refreshCriticalData: (queryClient: QueryClient) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.attendance.all })
    queryClient.invalidateQueries({ queryKey: queryKeys.users.profile() })
  }
}

// Prefetching strategies for educational workflows
export const prefetchStrategies = {
  // Prefetch data for teacher dashboard
  teacherDashboard: async (queryClient: QueryClient, teacherId: string) => {
    // Prefetch teacher's classes
    await queryClient.prefetchQuery({
      queryKey: ['teacher-classes', teacherId],
      ...EDUCATIONAL_CACHE_CONFIG.schools
    })

    // Prefetch today's attendance data
    const today = new Date().toISOString().split('T')[0]
    await queryClient.prefetchQuery({
      queryKey: ['teacher-attendance', teacherId, today],
      ...EDUCATIONAL_CACHE_CONFIG.attendance
    })
  },

  // Prefetch data for student management
  studentManagement: async (queryClient: QueryClient, schoolId: string) => {
    await queryClient.prefetchQuery({
      queryKey: queryKeys.students.bySchool(schoolId),
      ...EDUCATIONAL_CACHE_CONFIG.students
    })
  },

  // Prefetch attendance marking page
  attendanceMarking: async (queryClient: QueryClient, classId: string) => {
    const today = new Date().toISOString().split('T')[0]

    await queryClient.prefetchQuery({
      queryKey: queryKeys.students.byClass(classId),
      ...EDUCATIONAL_CACHE_CONFIG.students
    })

    await queryClient.prefetchQuery({
      queryKey: queryKeys.attendance.byClass(classId, today),
      ...EDUCATIONAL_CACHE_CONFIG.attendance
    })
  }
}

// Background sync utilities for offline support
export const offlineSync = {
  // Queue mutations for offline sync
  queueMutation: (mutationKey: string, variables: any) => {
    const queue = JSON.parse(localStorage.getItem('mutation-queue') || '[]')
    queue.push({
      key: mutationKey,
      variables,
      timestamp: Date.now()
    })
    localStorage.setItem('mutation-queue', JSON.stringify(queue))
  },

  // Process queued mutations when back online
  processQueue: async (queryClient: QueryClient) => {
    const queue = JSON.parse(localStorage.getItem('mutation-queue') || '[]')

    for (const item of queue) {
      try {
        // Process each queued mutation
        // This would integrate with your mutation functions
      } catch (error) {
      }
    }

    // Clear queue after processing
    localStorage.setItem('mutation-queue', '[]')
  }
}

export default createEducationalQueryClient