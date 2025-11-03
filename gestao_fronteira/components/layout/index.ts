/**
 * Layout Components Export Index
 * Centralized exports for layout, navigation, and guard components
 * Educational Management System - Layout Module
 */

// Main layout components
export { Sidebar } from './sidebar'
export { EnhancedSidebar } from './enhanced-sidebar'
export { Header } from './header'
export { MobileHeader } from './mobile-header'

// Navigation and breadcrumbs
export { EnhancedBreadcrumbs, PageHeader } from './enhanced-breadcrumbs'

// Navigation provider
export { NavigationProvider, useNavigation } from './navigation-provider'

// Mobile responsive components
export { MobileSidebar } from './mobile-sidebar'

// Authentication and access control
export { AuthGuard } from './auth-guard'

// Type exports
export type { AuthGuardProps } from './auth-guard'
