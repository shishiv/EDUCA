'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { EscolaSelector } from '@/components/layout/escola-selector'
import {
  appNavigationGroups,
  getActiveNavigationItemId,
  getNavigationForRole,
  isNavigationItemActive,
} from '@/components/layout/navigation'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useAuth } from '@/hooks/use-auth'
import { cn } from '@/lib/utils'

interface SidebarProps {
  className?: string
}

export function Sidebar({ className }: SidebarProps) {
  const t = useTranslations('layout.navigation')
  const common = useTranslations('common')
  const [collapsed, setCollapsed] = useState(false)
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({})
  const pathname = usePathname()
  const { userProfile } = useAuth()
  const visibleGroups = userProfile ? getNavigationForRole(userProfile.tipo_usuario) : []
  const activeItemId = getActiveNavigationItemId(pathname, visibleGroups)

  const toggleGroup = (groupName: string) => {
    setExpandedGroups(current => ({
      ...current,
      [groupName]: !(current[groupName] ?? appNavigationGroups.find(group => group.id === groupName)?.defaultOpen),
    }))
  }

  return (
    <aside
      className={cn('app-sidebar', collapsed && 'app-sidebar--collapsed', className)}
      aria-label={t('desktopAriaLabel')}
    >
      <div className="app-sidebar__brand">
        <Link href="/dashboard" className="app-wordmark">
          <span className="app-wordmark__mark" aria-hidden="true">E</span>
          {!collapsed && (
            <span className="app-wordmark__copy">
              <strong>EDUCA</strong>
              <small>{common('brand.schoolSystem')}</small>
            </span>
          )}
        </Link>
      </div>

      <div className="app-sidebar__school">
        <EscolaSelector collapsed={collapsed} />
      </div>

      <button
        type="button"
        onClick={() => setCollapsed(current => !current)}
        aria-label={collapsed ? t('expand') : t('collapse')}
        className="app-sidebar__collapse"
      >
        {collapsed ? <ChevronRight aria-hidden="true" /> : <ChevronLeft aria-hidden="true" />}
      </button>

      <ScrollArea className="min-h-0 flex-1">
        <nav className="app-sidebar__nav">
          {visibleGroups.map(group => {
            const isExpanded = expandedGroups[group.id] ?? group.defaultOpen
            const groupIsActive = group.items.some(item => isNavigationItemActive(pathname, item))

            return (
              <section className="app-nav-group" key={group.id} aria-label={t(`groups.${group.labelKey}`)}>
                {collapsed ? null : (
                  <button
                    type="button"
                    onClick={() => toggleGroup(group.id)}
                    className={cn('app-nav-group__trigger', groupIsActive && 'is-active')}
                    aria-expanded={isExpanded}
                    aria-controls={`nav-group-${group.id}`}
                  >
                    <span>{t(`groups.${group.labelKey}`)}</span>
                    <ChevronDown aria-hidden="true" className={cn(!isExpanded && '-rotate-90')} />
                  </button>
                )}

                <div
                  id={`nav-group-${group.id}`}
                  className={cn('app-nav-group__items', !collapsed && !isExpanded && 'is-collapsed')}
                >
                  {group.items.map(item => {
                    const active = activeItemId === item.id
                    const Icon = item.icon

                    return (
                      <Link
                        key={`${group.id}-${item.id}`}
                        href={item.href}
                        aria-current={active ? 'page' : undefined}
                        className={cn('app-nav-link', active && 'is-active')}
                        title={collapsed ? t(`items.${item.labelKey}`) : undefined}
                      >
                        <Icon aria-hidden="true" />
                        {collapsed ? <span className="sr-only">{t(`items.${item.labelKey}`)}</span> : <span>{t(`items.${item.labelKey}`)}</span>}
                      </Link>
                    )
                  })}
                </div>
              </section>
            )
          })}
        </nav>
      </ScrollArea>

      {collapsed ? null : (
        <p className="app-sidebar__footnote">{t('authenticatedEnvironment')}</p>
      )}
    </aside>
  )
}
