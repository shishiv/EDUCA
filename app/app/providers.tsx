'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'
import { ServiceWorkerProvider } from '@/components/providers/service-worker-provider'
import { AuthProvider } from '@/contexts/auth-context'
import { Toaster } from '@/components/ui/sonner'

type ProviderComponent = React.ComponentType<{ children: React.ReactNode }>

export function Providers({
  children,
  Auth = AuthProvider,
  ServiceWorker = ServiceWorkerProvider,
}: {
  children: React.ReactNode
  Auth?: ProviderComponent
  ServiceWorker?: ProviderComponent
}) {
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
          {children}
          <Toaster />
        </ServiceWorker>
      </Auth>
    </QueryClientProvider>
  )
}
