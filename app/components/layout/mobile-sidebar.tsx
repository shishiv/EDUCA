'use client'

import { Fragment } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Dialog, Transition } from '@headlessui/react'
import { X } from 'lucide-react'
import { EscolaSelector } from '@/components/layout/escola-selector'
import { getActiveNavigationItemId, getNavigationForRole } from '@/components/layout/navigation'
import { useAuth } from '@/hooks/use-auth'
import { cn } from '@/lib/utils'

interface MobileSidebarProps {
  isOpen: boolean
  onClose: () => void
}

export function MobileSidebar({ isOpen, onClose }: MobileSidebarProps) {
  const t = useTranslations('layout.navigation')
  const common = useTranslations('common')
  const pathname = usePathname()
  const { userProfile } = useAuth()
  const visibleGroups = userProfile ? getNavigationForRole(userProfile.tipo_usuario) : []
  const activeItemId = getActiveNavigationItemId(pathname, visibleGroups)

  return (
    <Transition.Root show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-[70] lg:hidden" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="transition-opacity ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="transition-opacity ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="app-drawer-backdrop" />
        </Transition.Child>

        <div className="fixed inset-0 flex">
          <Transition.Child
            as={Fragment}
            enter="transition-transform ease-out duration-200"
            enterFrom="-translate-x-full"
            enterTo="translate-x-0"
            leave="transition-transform ease-in duration-150"
            leaveFrom="translate-x-0"
            leaveTo="-translate-x-full"
          >
            <Dialog.Panel className="app-drawer">
              <div className="app-drawer__header">
                <Dialog.Title className="sr-only">{t('drawerTitle')}</Dialog.Title>
                <Link href="/dashboard" className="app-wordmark" onClick={onClose}>
                  <span className="app-wordmark__mark" aria-hidden="true">E</span>
                  <span className="app-wordmark__copy">
                    <strong>EDUCA</strong>
                    <small>{common('brand.schoolSystem')}</small>
                  </span>
                </Link>
                <button type="button" className="app-drawer__close" onClick={onClose}>
                  <span className="sr-only">{t('closeSidebar')}</span>
                  <X aria-hidden="true" />
                </button>
              </div>

              <div className="app-drawer__school">
                <EscolaSelector />
              </div>

              <nav className="app-drawer__nav" aria-label={t('ariaLabel')}>
                {visibleGroups.map(group => (
                  <section key={group.id} className="app-drawer__group" aria-label={t(`groups.${group.labelKey}`)}>
                    <h2>{t(`groups.${group.labelKey}`)}</h2>
                    <ul>
                      {group.items.map(item => {
                        const active = activeItemId === item.id
                        const Icon = item.icon

                        return (
                          <li key={`${group.id}-${item.id}`}>
                            <Link
                              href={item.href}
                              onClick={onClose}
                              aria-current={active ? 'page' : undefined}
                              className={cn('app-drawer__link', active && 'is-active')}
                            >
                              <Icon aria-hidden="true" />
                              <span>{t(`items.${item.labelKey}`)}</span>
                            </Link>
                          </li>
                        )
                      })}
                    </ul>
                  </section>
                ))}
              </nav>
            </Dialog.Panel>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition.Root>
  )
}
