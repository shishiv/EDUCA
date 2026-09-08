'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { ServiceWorkerProvider } from '@/components/providers/service-worker-provider'
import { AuthProvider } from '@/contexts/auth-context'
import { LocaleSwitcher } from '@/components/i18n/locale-switcher'

const PUBLIC_PATHS = ['/', '/demo', '/login', '/primeiro-acesso', '/reset-password', '/politica-privacidade', '/blog', '/offline']

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.some(path => path === '/' ? pathname === path : pathname === path || pathname.startsWith(`${path}/`))
}

type ProviderComponent = React.ComponentType<{ children: React.ReactNode }>

export function Providers({
  children,
  pathname: pathnameOverride,
  Auth = AuthProvider,
  ServiceWorker = ServiceWorkerProvider,
}: {
  children: React.ReactNode
  pathname?: string
  Auth?: ProviderComponent
  ServiceWorker?: ProviderComponent
}) {
  const currentPathname = usePathname()
  const pathname = pathnameOverride ?? currentPathname
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            refetchOnWindowFocus: false,
          },
        },
      })
  )

  return (
    <QueryClientProvider client={queryClient}>
      <Auth>
        <ServiceWorker>
          {!isPublicPath(pathname) && <LocaleSwitcher />}
          {children}
        </ServiceWorker>
      </Auth>
    </QueryClientProvider>
  )
}
