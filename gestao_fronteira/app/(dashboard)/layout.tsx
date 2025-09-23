import { AuthGuard } from '@/components/layout/auth-guard'
import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'
import { MobileHeader } from '@/components/layout/mobile-header'
import { SessionRealtimeProvider } from '@/contexts/session-realtime-context'
import { Toaster } from '@/components/ui/sonner'
import { useAuth } from '@/hooks/use-auth'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AuthGuard allowedRoles={['admin', 'diretor', 'secretario', 'professor']}>
      <DashboardWithRealtime>
        <div className="flex h-screen bg-gray-50">
          <Sidebar />
          <div className="flex-1 flex flex-col overflow-hidden">
            <Header />
            <MobileHeader />
            <main className="flex-1 overflow-auto p-6">
              {children}
            </main>
          </div>
        </div>
        <Toaster />
      </DashboardWithRealtime>
    </AuthGuard>
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
        escola_id: userProfile.escola_id
      }}
    >
      {children}
    </SessionRealtimeProvider>
  )
}