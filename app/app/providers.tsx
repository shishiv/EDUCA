'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { ServiceWorkerProvider } from '@/components/providers/service-worker-provider'
import { AuthProvider } from '@/contexts/auth-context'
import { LocaleSwitcher } from '@/components/i18n/locale-switcher'

const PUBLIC_PATHS = ['/', '/demo', '/login', '/primeiro-acesso', '/reset-password', '/politica-privacidade', '/blog']

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.some(path => path === '/' ? pathname === path : pathname === path || pathname.startsWith(`${path}/`))
}

function isPortugueseOnlyBlogPath(pathname: string) {
  return pathname === '/blog' || pathname.startsWith('/blog/')
}

export function Providers({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
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
      <AuthProvider>
        <ServiceWorkerProvider>
          {!isPortugueseOnlyBlogPath(pathname) && <LocaleSwitcher variant={isPublicPath(pathname) ? 'public' : 'app'} />}
          {children}
        </ServiceWorkerProvider>
      </AuthProvider>
    </QueryClientProvider>
  )
}
