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
import { useTranslations } from 'next-intl'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AuthGuard allowedRoles={['admin', 'diretor', 'secretario', 'professor']}>
      <DashboardWithRealtime>
        <DashboardLayoutInner>
          {children}
        </DashboardLayoutInner>
        <Toaster />
      </DashboardWithRealtime>
    </AuthGuard>
  )
}

// Inner layout component to manage mobile menu state
function DashboardLayoutInner({ children }: { children: React.ReactNode }) {
  const t = useTranslations('layout.navigation')
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(current => !current)
  }

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false)
  }

  return (
    <div className="educa-app app-shell">
      <a href="#main-content" className="skip-to-content">{t('skipToContent')}</a>
      <div className="hidden shrink-0 lg:block">
        <Sidebar />
      </div>

      <MobileSidebar isOpen={isMobileMenuOpen} onClose={closeMobileMenu} />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <div className="hidden shrink-0 lg:block">
          <Header />
        </div>

        <div className="shrink-0 lg:hidden">
          <MobileHeader
            onMenuToggle={toggleMobileMenu}
            isMenuOpen={isMobileMenuOpen}
          />
        </div>

        <main id="main-content" className="app-main mobile-content-padding">
          <div className="app-main__inner">
            {isDemoSandboxEnabled() && <DemoSandboxBanner />}
            {children}
          </div>
        </main>
      </div>

      <MobileNav />
    </div>
  )
}

// Wrapper component to access user data after authentication
function DashboardWithRealtime({ children }: { children: React.ReactNode }) {
  const t = useTranslations('layout.dashboard')
  const { userProfile } = useAuth()

  if (!userProfile) {
    return (
      <div className="educa-app app-auth-state" role="status" aria-live="polite">
        <span className="app-loading-mark" aria-hidden="true">E</span>
        <p>{t('preparing')}</p>
      </div>
    )
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
