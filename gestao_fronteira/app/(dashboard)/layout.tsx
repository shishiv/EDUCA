'use client'

import { useState } from 'react'
import { AuthGuard } from '@/components/layout/auth-guard'
import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'
import { MobileHeader } from '@/components/layout/mobile-header'
import { MobileSidebar } from '@/components/layout/mobile-sidebar'
import { MobileNav } from '@/components/layout/MobileNav'
import { SessionRealtimeProvider } from '@/contexts/session-realtime-context'
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
    <div className="flex min-h-screen">
      {/* Desktop Sidebar - Hidden on mobile */}
      <div className="hidden md:block">
        <Sidebar />
      </div>

      {/* Mobile Sidebar Overlay */}
      <MobileSidebar isOpen={isMobileMenuOpen} onClose={closeMobileMenu} />

      {/* Main content area - offset by sidebar width */}
      <main className="flex-1 md:ml-[260px] min-h-screen bg-gray-100">
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

        {/* Page content with padding */}
        <div className="p-8 pb-20 md:pb-8">
          {children}
        </div>
      </main>

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
    <SessionRealtimeProvider
      user={{
        id: userProfile.id,
        tipo_usuario: userProfile.tipo_usuario,
        escola_id: userProfile.escola_id || '' // Default to empty string if null
      }}
    >
      {children}
    </SessionRealtimeProvider>
  )
}
