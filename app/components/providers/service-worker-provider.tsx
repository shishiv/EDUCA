/**
 * ServiceWorkerProvider - Task 4.6
 *
 * Global provider for service worker functionality
 * Displays offline status and update notifications
 *
 * Usage: Wrap app in app/layout.tsx
 */

'use client'

import React, { useEffect, useRef } from 'react'
import { useServiceWorker } from '@/hooks/use-service-worker'
import { toast } from 'sonner'
import { WifiOff, Wifi, Download } from 'lucide-react'
import { logger } from '@/lib/logger'
import { useTranslations } from 'next-intl'

interface ServiceWorkerProviderProps {
  children: React.ReactNode
}

export function ServiceWorkerProvider({ children }: ServiceWorkerProviderProps) {
  const t = useTranslations('layout.serviceWorker')
  const { isInstalled, isOnline, needsUpdate, activateUpdate, getOfflineCount } = useServiceWorker()

  // Track if initial render is complete to avoid ForwardRef warning
  const isInitialRender = useRef(true)

  // Mark initial render as complete after mount
  useEffect(() => {
    // Use setTimeout to ensure we're past the initial render cycle
    const timer = setTimeout(() => {
      isInitialRender.current = false
    }, 100)
    return () => clearTimeout(timer)
  }, [])

  // Show installation notification
  useEffect(() => {
    if (isInstalled && !isInitialRender.current) {
      logger.info('Service worker installed successfully', {
        feature: 'offline',
        action: 'sw_installed'
      })

      toast.success(t('installed'), {
        description: t('installedDescription'),
        icon: <Wifi className="h-4 w-4" />,
        duration: 3000
      })
    }
  }, [isInstalled, t])

  // Show offline/online notifications
  useEffect(() => {
    // Skip during initial render to avoid ForwardRef warning
    if (isInitialRender.current) return

    if (!isOnline) {
      toast.warning(t('offline'), {
        description: t('offlineDescription'),
        icon: <WifiOff className="h-4 w-4" />,
        duration: 5000
      })
    } else {
      // Check for offline attendance to sync
      getOfflineCount().then(count => {
        if (count > 0) {
          toast.info(t('syncing', { count }), {
            icon: <Wifi className="h-4 w-4" />,
            duration: 3000
          })
        }
      })
    }
  }, [isOnline, getOfflineCount, t])

  // Show update notification
  useEffect(() => {
    // Skip during initial render to avoid ForwardRef warning
    if (isInitialRender.current) return

    if (needsUpdate) {
      toast(t('update'), {
        description: t('updateDescription'),
        icon: <Download className="h-4 w-4" />,
        action: {
          label: t('updateAction'),
          onClick: () => {
            activateUpdate()
            toast.success(t('updating'), {
              description: t('updatingDescription'),
              duration: 2000
            })
          }
        },
        duration: 10000
      })
    }
  }, [needsUpdate, activateUpdate, t])

  return <>{children}</>
}
