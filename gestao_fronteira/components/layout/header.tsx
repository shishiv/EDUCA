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
import { Bell, LogOut, User, Settings, Wifi, WifiOff, Clock, FileText, AlertTriangle, AlertCircle, XCircle, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'

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
      <header className="hidden md:flex items-center justify-end px-8 h-[73px] bg-gradient-to-r from-white via-fronteira-gray-50/30 to-fronteira-primary/8 border-b border-fronteira-gray-100 shadow-sm backdrop-blur-sm">
        <div className="flex items-center space-x-6">
          {/* Enhanced Connection Status */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/90 shadow-sm border border-fronteira-gray-200" title={`Conexão: ${connectionStatus}`}>
            {connectionStatus === 'connected' ? (
              <Wifi className="h-4 w-4 text-green-500" />
            ) : (
              <WifiOff className="h-4 w-4 text-red-500" />
            )}
            <span className="text-xs font-medium text-gray-600 hidden lg:inline">
              {connectionStatus === 'connected' ? 'Online' : 'Offline'}
            </span>
          </div>

          {/* Enhanced User Info */}
          <div className="hidden lg:flex flex-col items-end px-4 py-2 rounded-lg bg-white/80 shadow-sm border border-fronteira-gray-200">
            <p className="text-sm font-semibold text-fronteira-primary">
              {userProfile?.nome || 'Usuário'}
            </p>
            <p className="text-xs text-fronteira-gray-600 font-medium">
              {getRoleLabel(userProfile?.tipo_usuario || '')}
            </p>
          </div>

          {/* Enhanced Notifications */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="relative h-10 w-10 rounded-full bg-white/80 hover:bg-white shadow-sm border border-fronteira-gray-200 text-fronteira-gray-600 hover:text-fronteira-primary transition-all duration-200"
              >
                <Bell className="h-5 w-5" />
                {allNotifications.length > 0 && (
                  <Badge
                    variant="destructive"
                    className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs bg-red-500 hover:bg-red-600 shadow-lg animate-pulse"
                  >
                    {allNotifications.length > 9 ? '9+' : allNotifications.length}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-96 max-h-96 overflow-y-auto shadow-xl border-0 ring-1 ring-black/5" align="end">
              <DropdownMenuLabel className="font-semibold text-fronteira-primary">
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
                      className="p-4 hover:bg-fronteira-primary/5 cursor-pointer"
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
                                <div className="flex items-center gap-1 mt-2 text-xs text-fronteira-primary hover:text-fronteira-blue">
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

        {/* Enhanced Profile Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-12 w-12 rounded-full bg-white/90 hover:bg-white shadow-md border border-fronteira-gray-200 transition-all duration-200 hover:shadow-lg">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-gradient-to-r from-fronteira-primary to-fronteira-blue text-white font-bold text-sm">
                  {userProfile?.nome ? getInitials(userProfile.nome) : 'U'}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-64 shadow-xl border-0 ring-1 ring-black/5" align="end" forceMount>
            <DropdownMenuLabel className="font-normal p-4">
              <div className="flex flex-col space-y-2">
                <p className="text-sm font-semibold leading-none text-fronteira-primary">
                  {userProfile?.nome || 'Usuário'}
                </p>
                <p className="text-xs leading-none text-fronteira-gray-600">
                  {getRoleLabel(userProfile?.tipo_usuario || '')}
                </p>
                <div className="mt-2 pt-2 border-t border-gray-100">
                  <p className="text-xs text-gray-500">Sistema Educacional Fronteira/MG</p>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild className="p-3 hover:bg-fronteira-primary/5">
              <Link href="/dashboard/perfil">
                <User className="mr-3 h-4 w-4 text-fronteira-primary" />
                <span className="font-medium">Meu Perfil</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild className="p-3 hover:bg-fronteira-primary/5">
              <Link href="/dashboard/configuracoes">
                <Settings className="mr-3 h-4 w-4 text-fronteira-primary" />
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