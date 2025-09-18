'use client'

import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import { UserProfile } from '@/lib/auth'

// Global app state interface
interface AppState {
  // UI State
  sidebarCollapsed: boolean
  setSidebarCollapsed: (collapsed: boolean) => void

  // Current user and selected entities
  currentUser: UserProfile | null
  selectedSchool: string | null
  selectedClass: string | null
  setCurrentUser: (user: UserProfile | null) => void
  setSelectedSchool: (schoolId: string | null) => void
  setSelectedClass: (classId: string | null) => void

  // Loading states
  isLoading: boolean
  loadingMessage: string
  setLoading: (loading: boolean, message?: string) => void

  // Notifications
  notifications: AppNotification[]
  addNotification: (notification: Omit<AppNotification, 'id' | 'timestamp'>) => void
  removeNotification: (id: string) => void
  clearNotifications: () => void

  // Bulk operations state
  bulkSelection: {
    selectedIds: string[]
    selectAll: boolean
    entity: 'users' | 'students' | 'classes' | null
  }
  setBulkSelection: (selection: Partial<AppState['bulkSelection']>) => void
  clearBulkSelection: () => void

  // Filters and search
  filters: {
    users: UserFilters
    students: StudentFilters
    attendance: AttendanceFilters
  }
  setUserFilters: (filters: Partial<UserFilters>) => void
  setStudentFilters: (filters: Partial<StudentFilters>) => void
  setAttendanceFilters: (filters: Partial<AttendanceFilters>) => void

  // Recent activity
  recentActivity: RecentActivity[]
  addRecentActivity: (activity: Omit<RecentActivity, 'id' | 'timestamp'>) => void

  // Settings
  settings: AppSettings
  updateSettings: (settings: Partial<AppSettings>) => void

  // Cache management
  lastRefresh: Record<string, number>
  setLastRefresh: (key: string, timestamp?: number) => void
}

// Supporting interfaces
export interface AppNotification {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  title: string
  message?: string
  timestamp: number
  read?: boolean
  action?: {
    label: string
    onClick: () => void
  }
}

export interface UserFilters {
  searchTerm: string
  roles: string[]
  schools: string[]
  status: 'all' | 'active' | 'inactive'
  sortBy: 'name' | 'email' | 'role' | 'created_at'
  sortOrder: 'asc' | 'desc'
}

export interface StudentFilters {
  searchTerm: string
  schools: string[]
  classes: string[]
  status: 'all' | 'active' | 'inactive'
  specialNeeds: 'all' | 'yes' | 'no'
  ageRange: [number, number] | null
  sortBy: 'name' | 'age' | 'class' | 'created_at'
  sortOrder: 'asc' | 'desc'
}

export interface AttendanceFilters {
  dateRange: [string, string] | null
  schools: string[]
  classes: string[]
  students: string[]
  status: 'all' | 'present' | 'absent' | 'excused'
  threshold: number // for at-risk students (below X% attendance)
}

export interface RecentActivity {
  id: string
  type: 'user_created' | 'student_enrolled' | 'attendance_marked' | 'report_generated'
  title: string
  description: string
  timestamp: number
  userId?: string
  entityId?: string
  entityType?: string
}

export interface AppSettings {
  theme: 'light' | 'dark' | 'system'
  language: 'pt-BR' | 'en-US'
  dateFormat: 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD'
  timezone: string
  autoRefresh: boolean
  autoRefreshInterval: number // minutes
  showNotifications: boolean
  compactMode: boolean
  defaultPageSize: number
}

// Create the store
export const useAppStore = create<AppState>()(
  devtools(
    persist(
      (set, get) => ({
        // UI State
        sidebarCollapsed: false,
        setSidebarCollapsed: (collapsed) =>
          set({ sidebarCollapsed: collapsed }, false, 'setSidebarCollapsed'),

        // Current user and entities
        currentUser: null,
        selectedSchool: null,
        selectedClass: null,
        setCurrentUser: (user) =>
          set({ currentUser: user }, false, 'setCurrentUser'),
        setSelectedSchool: (schoolId) =>
          set({ selectedSchool: schoolId }, false, 'setSelectedSchool'),
        setSelectedClass: (classId) =>
          set({ selectedClass: classId }, false, 'setSelectedClass'),

        // Loading states
        isLoading: false,
        loadingMessage: '',
        setLoading: (loading, message = '') =>
          set({ isLoading: loading, loadingMessage: message }, false, 'setLoading'),

        // Notifications
        notifications: [],
        addNotification: (notification) => {
          const newNotification: AppNotification = {
            ...notification,
            id: Math.random().toString(36).substr(2, 9),
            timestamp: Date.now(),
          }
          set(
            (state) => ({
              notifications: [newNotification, ...state.notifications].slice(0, 100) // Keep max 100
            }),
            false,
            'addNotification'
          )
        },
        removeNotification: (id) =>
          set(
            (state) => ({
              notifications: state.notifications.filter((n) => n.id !== id)
            }),
            false,
            'removeNotification'
          ),
        clearNotifications: () =>
          set({ notifications: [] }, false, 'clearNotifications'),

        // Bulk operations
        bulkSelection: {
          selectedIds: [],
          selectAll: false,
          entity: null,
        },
        setBulkSelection: (selection) =>
          set(
            (state) => ({
              bulkSelection: { ...state.bulkSelection, ...selection }
            }),
            false,
            'setBulkSelection'
          ),
        clearBulkSelection: () =>
          set({
            bulkSelection: {
              selectedIds: [],
              selectAll: false,
              entity: null,
            }
          }, false, 'clearBulkSelection'),

        // Filters
        filters: {
          users: {
            searchTerm: '',
            roles: [],
            schools: [],
            status: 'active',
            sortBy: 'created_at',
            sortOrder: 'desc',
          },
          students: {
            searchTerm: '',
            schools: [],
            classes: [],
            status: 'active',
            specialNeeds: 'all',
            ageRange: null,
            sortBy: 'name',
            sortOrder: 'asc',
          },
          attendance: {
            dateRange: null,
            schools: [],
            classes: [],
            students: [],
            status: 'all',
            threshold: 80,
          },
        },
        setUserFilters: (filters) =>
          set(
            (state) => ({
              filters: {
                ...state.filters,
                users: { ...state.filters.users, ...filters }
              }
            }),
            false,
            'setUserFilters'
          ),
        setStudentFilters: (filters) =>
          set(
            (state) => ({
              filters: {
                ...state.filters,
                students: { ...state.filters.students, ...filters }
              }
            }),
            false,
            'setStudentFilters'
          ),
        setAttendanceFilters: (filters) =>
          set(
            (state) => ({
              filters: {
                ...state.filters,
                attendance: { ...state.filters.attendance, ...filters }
              }
            }),
            false,
            'setAttendanceFilters'
          ),

        // Recent activity
        recentActivity: [],
        addRecentActivity: (activity) => {
          const newActivity: RecentActivity = {
            ...activity,
            id: Math.random().toString(36).substr(2, 9),
            timestamp: Date.now(),
          }
          set(
            (state) => ({
              recentActivity: [newActivity, ...state.recentActivity].slice(0, 50) // Keep max 50
            }),
            false,
            'addRecentActivity'
          )
        },

        // Settings
        settings: {
          theme: 'light',
          language: 'pt-BR',
          dateFormat: 'DD/MM/YYYY',
          timezone: 'America/Sao_Paulo',
          autoRefresh: true,
          autoRefreshInterval: 5,
          showNotifications: true,
          compactMode: false,
          defaultPageSize: 25,
        },
        updateSettings: (settings) =>
          set(
            (state) => ({
              settings: { ...state.settings, ...settings }
            }),
            false,
            'updateSettings'
          ),

        // Cache management
        lastRefresh: {},
        setLastRefresh: (key, timestamp = Date.now()) =>
          set(
            (state) => ({
              lastRefresh: { ...state.lastRefresh, [key]: timestamp }
            }),
            false,
            'setLastRefresh'
          ),
      }),
      {
        name: 'app-store',
        partialize: (state) => ({
          sidebarCollapsed: state.sidebarCollapsed,
          selectedSchool: state.selectedSchool,
          selectedClass: state.selectedClass,
          filters: state.filters,
          settings: state.settings,
        }),
      }
    ),
    {
      name: 'app-store',
    }
  )
)

// Selectors for better performance
export const useCurrentUser = () => useAppStore((state) => state.currentUser)
export const useSidebarCollapsed = () => useAppStore((state) => state.sidebarCollapsed)
export const useSelectedSchool = () => useAppStore((state) => state.selectedSchool)
export const useSelectedClass = () => useAppStore((state) => state.selectedClass)
export const useNotifications = () => useAppStore((state) => state.notifications)
export const useBulkSelection = () => useAppStore((state) => state.bulkSelection)
export const useUserFilters = () => useAppStore((state) => state.filters.users)
export const useStudentFilters = () => useAppStore((state) => state.filters.students)
export const useAttendanceFilters = () => useAppStore((state) => state.filters.attendance)
export const useAppSettings = () => useAppStore((state) => state.settings)