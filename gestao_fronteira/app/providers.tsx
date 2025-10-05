'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'
import dynamic from 'next/dynamic'
import { ServiceWorkerProvider } from '@/components/providers/service-worker-provider'

// Fix React 19 setState warning: Load Toaster only on client-side
const Toaster = dynamic(
  () => import('sonner').then((mod) => mod.Toaster),
  { ssr: false }
)

export function Providers({ children }: { children: React.ReactNode }) {
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
    <>
      <QueryClientProvider client={queryClient}>
        <ServiceWorkerProvider>
          {children}
        </ServiceWorkerProvider>
      </QueryClientProvider>
      <Toaster position="top-right" richColors closeButton />
    </>
  )
}