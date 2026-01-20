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
import { DemoModeProvider } from '@/contexts/demo-mode-context'
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
    <div className="flex h-screen bg-gray-50">
      {/* Desktop Sidebar - Hidden on mobile */}
      <div className="hidden md:block">
        <Sidebar />
      </div>

      {/* Mobile Sidebar Overlay */}
      <MobileSidebar isOpen={isMobileMenuOpen} onClose={closeMobileMenu} />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Desktop Header - Hidden on mobile */}
        <div className="hidden md:block">
          <Header />
        </div>

        {/* Mobile Header - Visible on mobile only */}
        <div className="md:hidden">
          <MobileHeader
            onMenuToggle={toggleMobileMenu}
            isMenuOpen={isMobileMenuOpen}
          />
        </div>

        {/* Main content with bottom padding for mobile nav */}
        <main className="flex-1 overflow-auto p-4 sm:p-6 pb-20 md:pb-6">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation - Visible on mobile only */}
      <MobileNav />
    </div>
  )
}

// Wrapper component to access user data after authentication
function DashboardWithRealtime({ children }: { children: React.ReactNode }) {
  const { userProfile } = useAuth()

  if (!userProfile) {
    return <div>Loading...</div>
  }

  return (
    <EscolaProvider>
      <DemoModeProvider>
        <SessionRealtimeProvider
          user={{
            id: userProfile.id,
            tipo_usuario: userProfile.tipo_usuario,
            escola_id: userProfile.escola_id || '' // Default to empty string if null
          }}
        >
          {children}
        </SessionRealtimeProvider>
      </DemoModeProvider>
    </EscolaProvider>
  )
}
