/**
 * ServiceWorkerProvider - Task 4.6
 *
 * Global provider for service worker functionality
 * Displays offline status and update notifications
 *
 * Usage: Wrap app in app/layout.tsx
 */

'use client'

import React, { useEffect } from 'react'
import { useServiceWorker } from '@/hooks/use-service-worker'
import { toast } from 'sonner'
import { WifiOff, Wifi, Download } from 'lucide-react'
import { logger } from '@/lib/logger'

interface ServiceWorkerProviderProps {
  children: React.ReactNode
}

export function ServiceWorkerProvider({ children }: ServiceWorkerProviderProps) {
  const { isInstalled, isOnline, needsUpdate, activateUpdate, getOfflineCount } = useServiceWorker()

  // Show installation notification
  useEffect(() => {
    if (isInstalled) {
      logger.info('Service worker installed successfully', {
        feature: 'offline',
        action: 'sw_installed'
      })

      toast.success('Sistema preparado para uso offline', {
        description: 'Você pode marcar frequência mesmo sem internet.',
        icon: <Wifi className="h-4 w-4" />,
        duration: 3000
      })
    }
  }, [isInstalled])

  // Show offline/online notifications
  useEffect(() => {
    if (!isOnline) {
      toast.warning('Você está offline', {
        description: 'Suas marcações serão sincronizadas quando a conexão retornar.',
        icon: <WifiOff className="h-4 w-4" />,
        duration: 5000
      })
    } else {
      // Check for offline attendance to sync
      getOfflineCount().then(count => {
        if (count > 0) {
          toast.info(`Sincronizando ${count} marcações offline...`, {
            icon: <Wifi className="h-4 w-4" />,
            duration: 3000
          })
        }
      })
    }
  }, [isOnline, getOfflineCount])

  // Show update notification
  useEffect(() => {
    if (needsUpdate) {
      toast('Nova versão disponível', {
        description: 'Clique para atualizar o sistema.',
        icon: <Download className="h-4 w-4" />,
        action: {
          label: 'Atualizar',
          onClick: () => {
            activateUpdate()
            toast.success('Atualizando sistema...', {
              description: 'A página será recarregada.',
              duration: 2000
            })
          }
        },
        duration: 10000
      })
    }
  }, [needsUpdate, activateUpdate])

  return <>{children}</>
}
