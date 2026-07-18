/**
 * App Store - Stub implementation
 * TODO: Implement full Zustand store when needed
 */

import { create } from 'zustand'

interface UserFilters {
  searchTerm: string
  roles: string[]
  schools: string[]
  status: string
}

interface AppState {
  filters: {
    users: UserFilters
  }
}

export const useAppStore = create<AppState>()(() => ({
  filters: {
    users: {
      searchTerm: '',
      roles: [],
      schools: [],
      status: 'all',
    },
  },
}))

// Stub functions for recent activity tracking
export function addRecentActivity(activity: {
  type: string
  title: string
  description: string
  entityId: string
  entityType: string
}) {
  // TODO: Implement activity tracking
  console.debug('Activity:', activity)
}

// Stub function for clearing bulk selection
export function clearBulkSelection() {
  // TODO: Implement bulk selection state
  console.debug('Bulk selection cleared')
}

// Stub function for notifications
export function addNotification(notification: {
  type: string
  message: string
}) {
  // TODO: Implement notifications
  console.debug('Notification:', notification)
}
