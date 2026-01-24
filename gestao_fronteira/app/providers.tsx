'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState, useEffect } from 'react'
import { Toaster } from 'sonner'
import { ServiceWorkerProvider } from '@/components/providers/service-worker-provider'

export function Providers({ children }: { children: React.ReactNode }) {
  // Track client-side mount to avoid hydration mismatch with Toaster
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

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
      {mounted && <Toaster position="top-right" richColors closeButton />}
    </>
  )
}