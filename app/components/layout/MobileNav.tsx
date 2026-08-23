/** Role-aware bottom navigation for authenticated mobile routes. */

'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'
import { isPilotDisabledPath, isPilotModeEnabled } from '@/lib/pilot/pilot-scope'
import { isDemoSandboxPilotPathAllowed } from '@/lib/demo-sandbox/demo-sandbox'
import { useAuth } from '@/hooks/use-auth'
import {
  Home,
  CheckSquare,
  BookText,
  FileText,
  Users,
} from 'lucide-react'

// ============================================================================
// Types
// ============================================================================

interface NavItem {
  labelKey: 'dashboard' | 'students' | 'attendance' | 'diary' | 'reports'
  href: string
  icon: React.ComponentType<{ className?: string }>
  /** Match pattern for active state (supports partial path matching) */
  matchPath?: string
  roles: string[]
}

// ============================================================================
// Navigation Items Configuration
// ============================================================================

const navigationItems: NavItem[] = [
  {
    labelKey: 'dashboard',
    href: '/dashboard',
    icon: Home,
    matchPath: '/dashboard',
    roles: ['admin', 'diretor', 'secretario', 'professor'],
  },
  {
    labelKey: 'students',
    href: '/dashboard/alunos',
    icon: Users,
    matchPath: '/dashboard/alunos',
    roles: ['admin', 'diretor', 'secretario'],
  },
  {
    labelKey: 'attendance',
    href: '/dashboard/turmas',
    icon: CheckSquare,
    matchPath: '/dashboard/turmas',
    roles: ['admin', 'diretor', 'secretario', 'professor'],
  },
  {
    labelKey: 'diary',
    href: '/diario',
    icon: BookText,
    matchPath: '/diario',
    roles: ['admin', 'diretor', 'secretario', 'professor'],
  },
  {
    labelKey: 'reports',
    href: '/dashboard/relatorios',
    icon: FileText,
    matchPath: '/dashboard/relatorios',
    roles: ['admin', 'diretor', 'secretario'],
  },
]

// ============================================================================
// Component
// ============================================================================

export function MobileNav() {
  const t = useTranslations('layout.navigation')
  const pathname = usePathname()
  const { userProfile } = useAuth()
  const visibleNavigationItems = navigationItems.filter(item =>
    !!userProfile &&
    item.roles.includes(userProfile.tipo_usuario) &&
    (
      !isPilotModeEnabled() ||
      !isPilotDisabledPath(item.href) ||
      isDemoSandboxPilotPathAllowed(item.href)
    )
  )

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
      className="app-mobile-nav mobile-nav-safe-area lg:hidden"
      aria-label={t('ariaLabel')}
    >
      <div className="app-mobile-nav__inner">
        {visibleNavigationItems.map((item) => {
          const active = isActive(item)
          const Icon = item.icon

          return (
            <Link
              key={item.labelKey}
              href={item.href}
              className={cn('app-mobile-nav__link', active && 'is-active')}
              aria-current={active ? 'page' : undefined}
            >
              <Icon aria-hidden="true" />
              <span>{t(`items.${item.labelKey}`)}</span>
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
      className="h-16 lg:hidden"
      aria-hidden="true"
    />
  )
}
