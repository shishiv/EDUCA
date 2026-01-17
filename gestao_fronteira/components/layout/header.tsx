'use client'

import { useAuth } from '@/hooks/use-auth'
import { useSessionRealtime } from '@/contexts/session-realtime-context'
import { useComplianceWarnings } from '@/hooks/use-compliance-warnings'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MunicipalHeaderIdentity } from '@/components/identity/municipal-assets'
import { Bell, LogOut, User, Settings, Wifi, WifiOff, Clock, FileText, AlertTriangle, AlertCircle, XCircle, ExternalLink, Search } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'

/**
 * Header Component - EDUCA Design System
 *
 * Updated to match EDUCA mockups with:
 * - Global search field (LAY-02)
 * - Notification bell with indicator
 * - User dropdown with quick actions
 * - Responsive behavior (search hidden on mobile)
 */

// Helper function to map icon names to components
function getIconComponent(iconName: string) {
  const iconMap: Record<string, any> = {
    Clock,
    FileText,
    AlertTriangle,
    AlertCircle,
    XCircle
  }
  return iconMap[iconName] || Bell
}

export function Header() {
  const { userProfile, signOut } = useAuth()
  const { connectionStatus, notifications, clearNotification } = useSessionRealtime()
  const { data: complianceWarnings = [] } = useComplianceWarnings()

  // Map compliance warnings to notification format
  const complianceNotifications = complianceWarnings.map(warning => ({
    id: warning.id,
    title: warning.title,
    message: warning.message,
    type: warning.type,
    icon: getIconComponent(warning.icon),
    actionUrl: warning.actionUrl,
    actionText: warning.actionText,
    deadline: warning.deadline ? new Date(warning.deadline) : undefined
  }))

  // Combine system notifications with compliance notifications
  const allNotifications = [...notifications, ...complianceNotifications]

  const handleSignOut = async () => {
    try {
      await signOut()
      toast.success('Logout realizado com sucesso!')
    } catch (error) {
      toast.error('Erro ao fazer logout')
    }
  }

  const formatTimeRemaining = (deadline: Date) => {
    const now = new Date()
    const diff = deadline.getTime() - now.getTime()

    if (diff <= 0) return 'Vencido'

    const hours = Math.floor(diff / (1000 * 60 * 60))
    const days = Math.floor(hours / 24)

    if (days > 0) return `${days} dia${days !== 1 ? 's' : ''}`
    if (hours > 0) return `${hours} hora${hours !== 1 ? 's' : ''}`

    const minutes = Math.floor(diff / (1000 * 60))
    return `${minutes} minuto${minutes !== 1 ? 's' : ''}`
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const getRoleLabel = (role: string) => {
    const roles = {
      admin: 'Administrador',
      diretor: 'Diretor(a)',
      secretario: 'Secretário(a)',
      professor: 'Professor(a)',
      responsavel: 'Responsável'
    }
    return roles[role as keyof typeof roles] || role
  }

  return (
    <>
      {/* Header - EDUCA mockup: 70px height, white bg, border-bottom */}
      <header className="hidden md:flex items-center justify-between px-8 h-[70px] bg-white border-b border-gray-200">
        {/* Header Left - Page title area (can be used by pages) */}
        <div className="flex items-center gap-6">
          {/* Page title placeholder - will be set by individual pages via context/props if needed */}
        </div>

        {/* Header Right - Search, notifications, user */}
        <div className="flex items-center gap-4">
          {/* Global Search Box - EDUCA mockup: LAY-02 requirement */}
          {/* Mockup: padding 10px 16px, bg gray-50, border 1px gray-200, border-radius 10px, width 280px */}
          <div className="hidden lg:flex items-center gap-2.5 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-[10px] w-[280px]">
            <Search className="h-[18px] w-[18px] text-gray-400 flex-shrink-0" />
            <input
              type="text"
              placeholder="Buscar alunos, turmas..."
              className="border-none bg-transparent outline-none font-sans text-[0.9rem] text-gray-800 w-full placeholder:text-gray-400"
            />
          </div>

          {/* Connection Status - compact indicator */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-[10px] bg-gray-50 border border-gray-200" title={`Conexão: ${connectionStatus}`}>
            {connectionStatus === 'connected' ? (
              <Wifi className="h-4 w-4 text-green-500" />
            ) : (
              <WifiOff className="h-4 w-4 text-red-500" />
            )}
            <span className="text-xs font-medium text-gray-600 hidden xl:inline">
              {connectionStatus === 'connected' ? 'Online' : 'Offline'}
            </span>
          </div>

          {/* Notifications - EDUCA mockup: 40px button, rounded-[10px], notification dot */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="relative h-10 w-10 rounded-[10px] bg-gray-50 hover:bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-600 hover:text-gray-800 transition-all duration-200"
              >
                <Bell className="h-5 w-5" />
                {allNotifications.length > 0 && (
                  <span className="absolute top-2 right-2 w-2 h-2 bg-pink-400 rounded-full border-2 border-white" />
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-96 max-h-96 overflow-y-auto shadow-xl border-0 ring-1 ring-black/5" align="end">
              <DropdownMenuLabel className="font-semibold text-green-600">
                Notificações do Sistema
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {allNotifications.length > 0 ? (
                allNotifications.map((notification, index) => {
                  const Icon = notification.icon || Bell
                  const isCompliance = 'deadline' in notification
                  return (
                    <DropdownMenuItem
                      key={notification.id || index}
                      className="p-4 hover:bg-green-50 cursor-pointer"
                      onClick={() => {
                        if (notification.actionUrl) {
                          window.location.href = notification.actionUrl
                        }
                      }}
                    >
                      <div className="flex items-start space-x-3 w-full">
                        <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                          notification.type === 'critical'
                            ? 'bg-red-100 text-red-600'
                            : notification.type === 'warning'
                            ? 'bg-yellow-100 text-yellow-600'
                            : 'bg-blue-100 text-blue-600'
                        }`}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <p className="text-sm font-semibold text-gray-900 mb-1">
                                {notification.title}
                              </p>
                              <p className="text-xs text-gray-600 leading-relaxed">
                                {notification.message}
                              </p>
                              {isCompliance && notification.deadline && (
                                <div className="flex items-center gap-2 mt-2">
                                  <Badge
                                    variant="outline"
                                    className={`text-xs ${
                                      notification.type === 'critical'
                                        ? 'border-red-200 bg-red-50 text-red-800'
                                        : 'border-yellow-200 bg-yellow-50 text-yellow-800'
                                    }`}
                                  >
                                    <Clock className="h-3 w-3 mr-1" />
                                    {formatTimeRemaining(notification.deadline)}
                                  </Badge>
                                </div>
                              )}
                              {notification.actionText && notification.actionUrl && (
                                <div className="flex items-center gap-1 mt-2 text-xs text-green-600 hover:text-green-700">
                                  <span>{notification.actionText}</span>
                                  <ExternalLink className="h-3 w-3" />
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </DropdownMenuItem>
                  )
                })
              ) : (
                <DropdownMenuItem disabled className="p-3">
                  <div className="flex items-center space-x-3 text-gray-500">
                    <Bell className="h-4 w-4" />
                    <span className="text-sm">Nenhuma notificação</span>
                  </div>
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

        {/* Profile Menu - EDUCA styled avatar with gradient */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button type="button" className="relative h-10 w-10 rounded-[10px] bg-gradient-to-br from-green-400 to-blue-400 hover:from-green-500 hover:to-blue-500 flex items-center justify-center text-white font-semibold text-sm transition-all duration-200 shadow-sm hover:shadow-md">
              {userProfile?.nome ? getInitials(userProfile.nome) : 'U'}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-64 shadow-xl border-0 ring-1 ring-black/5" align="end" forceMount>
            <DropdownMenuLabel className="font-normal p-4">
              <div className="flex flex-col space-y-2">
                <p className="text-sm font-semibold leading-none text-green-600">
                  {userProfile?.nome || 'Usuário'}
                </p>
                <p className="text-xs leading-none text-gray-500">
                  {getRoleLabel(userProfile?.tipo_usuario || '')}
                </p>
                <div className="mt-2 pt-2 border-t border-gray-100">
                  <p className="text-xs text-gray-500">Sistema Educacional Fronteira/MG</p>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild className="p-3 hover:bg-green-50">
              <Link href="/dashboard/perfil">
                <User className="mr-3 h-4 w-4 text-green-600" />
                <span className="font-medium">Meu Perfil</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild className="p-3 hover:bg-green-50">
              <Link href="/dashboard/configuracoes">
                <Settings className="mr-3 h-4 w-4 text-green-600" />
                <span className="font-medium">Configurações</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut} className="p-3 text-red-600 hover:text-red-700 hover:bg-red-50 font-medium">
              <LogOut className="mr-3 h-4 w-4" />
              <span>Sair do Sistema</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        </div>
      </header>
    </>
  )
}