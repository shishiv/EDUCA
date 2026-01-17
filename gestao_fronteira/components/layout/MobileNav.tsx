/**
 * MobileNav - Bottom Navigation for Mobile Devices
 *
 * EDUCA Design System - Mobile Navigation
 *
 * Features:
 * - Fixed bottom navigation bar for mobile (hidden on desktop md+)
 * - Icons for: Dashboard, Frequencia, Diario, Relatorios
 * - EDUCA green active state (bg-green-50, text-green-600)
 * - Touch-friendly with 44px minimum targets (WCAG)
 * - 10px border-radius per mockup styling
 *
 * Responsive (LAY-05):
 * - Mobile (<768px): Visible, hamburger menu pattern
 * - Tablet/Desktop (768+): Hidden, full sidebar used instead
 */

'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  Home,
  CheckSquare,
  BookText,
  FileText,
} from 'lucide-react'

// ============================================================================
// Types
// ============================================================================

interface NavItem {
  name: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  /** Match pattern for active state (supports partial path matching) */
  matchPath?: string
}

// ============================================================================
// Navigation Items Configuration
// ============================================================================

const navigationItems: NavItem[] = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: Home,
    matchPath: '/dashboard',
  },
  {
    name: 'Frequencia',
    href: '/diario/frequencia',
    icon: CheckSquare,
    matchPath: '/diario/frequencia',
  },
  {
    name: 'Diario',
    href: '/diario',
    icon: BookText,
    matchPath: '/diario',
  },
  {
    name: 'Relatorios',
    href: '/relatorios',
    icon: FileText,
    matchPath: '/relatorios',
  },
]

// ============================================================================
// Component
// ============================================================================

export function MobileNav() {
  const pathname = usePathname()

  /**
   * Check if a nav item is active
   * Handles exact match for dashboard, partial match for others
   */
  const isActive = (item: NavItem): boolean => {
    if (!pathname) return false

    // Exact match for dashboard (to avoid matching all dashboard/* routes)
    if (item.href === '/dashboard') {
      return pathname === '/dashboard'
    }

    // For other items, check if pathname starts with the item's matchPath or href
    const matchPath = item.matchPath || item.href
    return pathname.startsWith(matchPath)
  }

  return (
    <nav
      className={cn(
        // Container styling
        'fixed bottom-0 left-0 right-0 z-50',
        // Background with blur effect
        'bg-white/95 backdrop-blur-sm',
        // Border and shadow
        'border-t border-gray-200 shadow-lg',
        // Safe area padding for iOS devices
        'pb-safe',
        // Hide on desktop (md and above)
        'md:hidden'
      )}
      aria-label="Navegacao principal mobile"
    >
      <div className="flex items-center justify-around h-16 px-2">
        {navigationItems.map((item) => {
          const active = isActive(item)
          const Icon = item.icon

          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                // Base button styling
                'flex flex-col items-center justify-center',
                // Touch-friendly size (minimum 44px per WCAG)
                'min-w-[64px] min-h-[44px] px-2 py-1',
                // Transition
                'transition-all duration-200',
                // EDUCA mockup: 10px border-radius
                'rounded-[10px]',
                // Active/inactive states - EDUCA green styling
                active ? [
                  'text-green-600',
                  'bg-green-50',
                ] : [
                  'text-gray-500',
                  'hover:text-gray-700',
                  'hover:bg-gray-50',
                  'active:bg-gray-100',
                ],
              )}
              aria-current={active ? 'page' : undefined}
            >
              {/* Icon */}
              <Icon
                className={cn(
                  'w-5 h-5 mb-0.5',
                  active ? 'text-green-600' : 'text-gray-500'
                )}
                aria-hidden="true"
              />

              {/* Label */}
              <span
                className={cn(
                  'text-[10px] font-medium leading-tight',
                  active ? 'text-green-600' : 'text-gray-500'
                )}
              >
                {item.name}
              </span>

              {/* Active indicator dot - EDUCA green */}
              {active && (
                <div
                  className="absolute bottom-1 w-1 h-1 bg-green-600 rounded-full"
                  aria-hidden="true"
                />
              )}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

// ============================================================================
// Spacer Component (to prevent content from being hidden by bottom nav)
// ============================================================================

/**
 * MobileNavSpacer - Adds bottom padding when MobileNav is visible
 * Use this at the bottom of page layouts to prevent content overlap
 */
export function MobileNavSpacer() {
  return (
    <div
      className="h-16 md:hidden"
      aria-hidden="true"
    />
  )
}
