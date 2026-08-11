'use client'

import { useState } from 'react'
import { AuthGuard } from '@/components/layout/auth-guard'
import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'
import { MobileHeader } from '@/components/layout/mobile-header'
import { MobileSidebar } from '@/components/layout/mobile-sidebar'
import { MobileNav } from '@/components/layout/MobileNav'
import { SessionRealtimeProvider } from '@/contexts/session-realtime-context'
import { EscolaProvider } from '@/contexts/escola-context'
import { DemoSandboxBanner } from '@/components/demo-sandbox/DemoSandboxBanner'
import { isDemoSandboxEnabled } from '@/lib/demo-sandbox/demo-sandbox'
import { Toaster } from '@/components/ui/sonner'
import { useAuth } from '@/hooks/use-auth'
import { ModalProvider } from '@/components/ui/modal-manager'
import { ModalRenderer } from '@/components/ui/modal-renderer'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AuthGuard allowedRoles={['admin', 'diretor', 'secretario', 'professor']}>
      <ModalProvider>
        <DashboardWithRealtime>
          <DashboardLayoutInner>
            {children}
          </DashboardLayoutInner>
          <Toaster />
        </DashboardWithRealtime>
        <ModalRenderer />
      </ModalProvider>
    </AuthGuard>
  )
}

// Inner layout component to manage mobile menu state
function DashboardLayoutInner({ children }: { children: React.ReactNode }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen)
  }

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false)
  }

  return (
    <div className="flex h-screen bg-[var(--educa-paper)]">
      {/* Desktop Sidebar - Full navigation starts when the content can support it */}
      <div className="hidden shrink-0 lg:block">
        <Sidebar />
      </div>

      {/* Mobile and tablet sidebar overlay */}
      <MobileSidebar isOpen={isMobileMenuOpen} onClose={closeMobileMenu} />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Desktop Header - Full controls start at the desktop layout breakpoint */}
        <div className="hidden shrink-0 lg:block">
          <Header />
        </div>

        {/* Mobile and tablet Header */}
        <div className="lg:hidden">
          <MobileHeader
            onMenuToggle={toggleMobileMenu}
            isMenuOpen={isMobileMenuOpen}
          />
        </div>

        {/* Main content reserves space for the mobile and tablet navigation bar */}
        <main id="main-content" className="mobile-content-padding min-h-0 min-w-0 flex-1 overflow-auto p-4 sm:p-6 lg:px-8 lg:py-6">
          {isDemoSandboxEnabled() && <DemoSandboxBanner />}
          {children}
        </main>
      </div>

      {/* Mobile and tablet Bottom Navigation */}
      <MobileNav />
    </div>
  )
}

// Wrapper component to access user data after authentication
function DashboardWithRealtime({ children }: { children: React.ReactNode }) {
  const { userProfile } = useAuth()

  if (!userProfile) {
    return <div>Carregando...</div>
  }

  return (
    <EscolaProvider>
      <SessionRealtimeProvider
        user={{
          id: userProfile.id,
          tipo_usuario: userProfile.tipo_usuario,
          escola_id: userProfile.escola_id || '' // Default to empty string if null
        }}
      >
        {children}
      </SessionRealtimeProvider>
    </EscolaProvider>
  )
}
