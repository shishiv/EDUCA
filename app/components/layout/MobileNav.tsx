/** Role-aware bottom navigation for authenticated mobile routes. */

'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/use-auth'
import { getMobileNavigationForRole, isNavigationItemActive } from './navigation'

export function MobileNav() {
  const t = useTranslations('layout.navigation')
  const pathname = usePathname()
  const { userProfile } = useAuth()
  const visibleNavigationItems = getMobileNavigationForRole(userProfile?.tipo_usuario ?? '')

  return (
    <nav
      className="app-mobile-nav mobile-nav-safe-area lg:hidden"
      aria-label={t('ariaLabel')}
    >
      <div className="app-mobile-nav__inner">
        {visibleNavigationItems.map((item) => {
          const active = isNavigationItemActive(pathname, item)
          const Icon = item.icon

          return (
            <Link
              key={item.labelKey}
              href={item.href}
              className={cn('app-mobile-nav__link', active && 'is-active')}
              aria-current={active ? 'page' : undefined}
            >
              <Icon aria-hidden="true" />
              <span>{t(`items.${item.labelKey === 'classDiary' ? 'diary' : item.labelKey}`)}</span>
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
