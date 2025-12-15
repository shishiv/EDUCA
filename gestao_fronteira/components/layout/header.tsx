'use client'

import { useAuth } from '@/hooks/use-auth'
import { useSessionRealtime } from '@/contexts/session-realtime-context'
import { useComplianceWarnings } from '@/hooks/use-compliance-warnings'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { GlobalSearch } from '@/components/layout/global-search'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Bell, LogOut, User, Settings, Wifi, WifiOff, Clock, FileText, AlertTriangle, AlertCircle, XCircle, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

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

  const pathname = usePathname()

  // Generate page title and breadcrumbs from pathname
  const getPageInfo = () => {
    const pathSegments = pathname.split('/').filter(Boolean)
    const pageNames: Record<string, string> = {
      dashboard: 'Dashboard',
      alunos: 'Alunos',
      turmas: 'Minhas Turmas',
      frequencia: 'Chamada',
      diario: 'Diário de Classe',
      notas: 'Notas',
      usuarios: 'Usuários',
      escolas: 'Escolas',
      matriculas: 'Matrículas',
      responsaveis: 'Responsáveis',
      relatorios: 'Relatórios',
      configuracoes: 'Configurações',
      calendario: 'Calendário',
      perfil: 'Meu Perfil',
    }

    const lastSegment = pathSegments[pathSegments.length - 1]
    const pageTitle = pageNames[lastSegment] || 'Dashboard'

    const breadcrumbs = pathSegments.map((segment, index) => ({
      label: pageNames[segment] || segment,
      href: '/' + pathSegments.slice(0, index + 1).join('/'),
    }))

    return { pageTitle, breadcrumbs }
  }

  const { pageTitle, breadcrumbs } = getPageInfo()

  return (
    <>
      <header className="hidden md:flex items-center justify-between px-8 h-[70px] bg-white border-b border-gray-200 sticky top-0 z-50">
        {/* Left side - Page Title and Breadcrumbs */}
        <div className="flex items-center gap-6">
          <h1 className="font-display text-[1.25rem] font-semibold text-gray-800">
            {pageTitle}
          </h1>
          {breadcrumbs.length > 1 && (
            <nav className="flex items-center gap-2 text-[0.85rem] text-gray-500">
              {breadcrumbs.map((item, i) => (
                <span key={item.href} className="flex items-center gap-2">
                  {i > 0 && <span>›</span>}
                  {i < breadcrumbs.length - 1 ? (
                    <Link href={item.href} className="hover:text-jardim-green-600 transition-colors">
                      {item.label}
                    </Link>
                  ) : (
                    <span className="text-gray-400">{item.label}</span>
                  )}
                </span>
              ))}
            </nav>
          )}
        </div>

        {/* Right side - Search, Connection, Notifications, Profile */}
        <div className="flex items-center gap-4">
          {/* Global Search - Functional */}
          <GlobalSearch />

          {/* Connection Status */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-nav-item bg-gray-50 border border-gray-200" title={`Conexão: ${connectionStatus}`}>
            {connectionStatus === 'connected' ? (
              <Wifi className="h-4 w-4 text-jardim-green-500" />
            ) : (
              <WifiOff className="h-4 w-4 text-red-500" />
            )}
            <span className="text-xs font-medium text-gray-600 hidden lg:inline">
              {connectionStatus === 'connected' ? 'Online' : 'Offline'}
            </span>
          </div>

          {/* Notification Button - Brand Guidelines */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="w-10 h-10 bg-gray-50 rounded-nav-item flex items-center justify-center text-gray-600 hover:bg-gray-100 relative transition-colors">
                <Bell className="w-5 h-5" />
                {allNotifications.length > 0 && (
                  <span className="absolute top-2 right-2 w-2 h-2 bg-jardim-pink-400 rounded-full border-2 border-white" />
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-96 max-h-96 overflow-y-auto shadow-xl border border-gray-200 rounded-card" align="end">
              <DropdownMenuLabel className="font-display font-semibold text-gray-800 px-4 py-3">
                Notificações
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {allNotifications.length > 0 ? (
                allNotifications.map((notification, index) => {
                  const Icon = notification.icon || Bell
                  const isCompliance = 'deadline' in notification
                  return (
                    <DropdownMenuItem
                      key={notification.id || index}
                      className="p-4 hover:bg-jardim-green-50 cursor-pointer"
                      onClick={() => {
                        if (notification.actionUrl) {
                          window.location.href = notification.actionUrl
                        }
                      }}
                    >
                      <div className="flex items-start space-x-3 w-full">
                        <div className={`h-10 w-10 rounded-nav-item flex items-center justify-center ${
                          notification.type === 'critical'
                            ? 'bg-red-100 text-red-600'
                            : notification.type === 'warning'
                            ? 'bg-jardim-yellow-100 text-amber-600'
                            : 'bg-jardim-blue-100 text-jardim-blue-500'
                        }`}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
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
                                    : 'border-jardim-yellow-300 bg-jardim-yellow-100 text-amber-800'
                                }`}
                              >
                                <Clock className="h-3 w-3 mr-1" />
                                {formatTimeRemaining(notification.deadline)}
                              </Badge>
                            </div>
                          )}
                          {notification.actionText && notification.actionUrl && (
                            <div className="flex items-center gap-1 mt-2 text-xs text-jardim-green-600 hover:text-jardim-blue-500">
                              <span>{notification.actionText}</span>
                              <ExternalLink className="h-3 w-3" />
                            </div>
                          )}
                        </div>
                      </div>
                    </DropdownMenuItem>
                  )
                })
              ) : (
                <DropdownMenuItem disabled className="p-4">
                  <div className="flex items-center space-x-3 text-gray-500">
                    <Bell className="h-4 w-4" />
                    <span className="text-sm">Nenhuma notificação</span>
                  </div>
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Profile Menu - Brand Guidelines */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="h-10 w-10 rounded-nav-item overflow-hidden">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-gradient-to-br from-jardim-green-400 to-jardim-blue-400 text-white font-bold text-sm">
                    {userProfile?.nome ? getInitials(userProfile.nome) : 'U'}
                  </AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-64 shadow-xl border border-gray-200 rounded-card" align="end" forceMount>
              <DropdownMenuLabel className="font-normal p-4">
                <div className="flex flex-col space-y-2">
                  <p className="text-sm font-semibold leading-none text-gray-800">
                    {userProfile?.nome || 'Usuário'}
                  </p>
                  <p className="text-xs leading-none text-gray-500">
                    {getRoleLabel(userProfile?.tipo_usuario || '')}
                  </p>
                  <div className="mt-2 pt-2 border-t border-gray-100">
                    <p className="text-xs text-gray-400">EDUCA — Fronteira/MG</p>
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild className="p-3 hover:bg-jardim-green-50">
                <Link href="/dashboard/perfil">
                  <User className="mr-3 h-4 w-4 text-jardim-green-600" />
                  <span className="font-medium">Meu Perfil</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild className="p-3 hover:bg-jardim-green-50">
                <Link href="/dashboard/configuracoes">
                  <Settings className="mr-3 h-4 w-4 text-jardim-green-600" />
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