'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MunicipalHeaderIdentity } from '@/components/identity/municipal-assets'
import { Bell, LogOut, User, Settings, Menu, X, Wifi, WifiOff, Clock, Users, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import { cn } from '@/lib/utils'

interface MobileHeaderProps {
  onMenuToggle?: () => void
  isMenuOpen?: boolean
  currentSession?: {
    id: string
    turma_nome: string
    fase: 'planejamento' | 'chamada' | 'finalizada' | 'bloqueada'
    total_alunos: number
    total_presentes: number
  }
  connectionStatus?: 'connected' | 'disconnected' | 'error'
  pendingSync?: number
  notifications?: number
}

export function MobileHeader({
  onMenuToggle,
  isMenuOpen = false,
  currentSession,
  connectionStatus = 'connected',
  pendingSync = 0,
  notifications = 0
}: MobileHeaderProps) {
  const { userProfile, signOut } = useAuth()
  const [currentTime, setCurrentTime] = useState(new Date())
  const [showOfflineAlert, setShowOfflineAlert] = useState(false)

  // Update current time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 60000)

    return () => clearInterval(timer)
  }, [])

  // Monitor connection status and show offline alerts
  useEffect(() => {
    if (connectionStatus === 'disconnected' || connectionStatus === 'error') {
      setShowOfflineAlert(true)
    } else {
      setShowOfflineAlert(false)
    }
  }, [connectionStatus])

  const handleSignOut = async () => {
    try {
      await signOut()
      toast.success('Logout realizado com sucesso!')
    } catch (error) {
      toast.error('Erro ao fazer logout')
    }
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

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getPhaseColor = (fase: string) => {
    switch (fase) {
      case 'planejamento': return 'bg-blue-500'
      case 'chamada': return 'bg-green-500'
      case 'finalizada': return 'bg-orange-500'
      case 'bloqueada': return 'bg-red-500'
      default: return 'bg-gray-500'
    }
  }

  const getPhaseLabel = (fase: string) => {
    switch (fase) {
      case 'planejamento': return 'Planejamento'
      case 'chamada': return 'Chamada'
      case 'finalizada': return 'Finalizada'
      case 'bloqueada': return 'Bloqueada'
      default: return 'Indefinido'
    }
  }

  // Connection status indicator for tablets
  const ConnectionIndicator = () => (
    <div className="flex items-center gap-1" data-testid="connection-status">
      {connectionStatus === 'connected' ? (
        <Wifi className="h-4 w-4 text-green-500" />
      ) : (
        <WifiOff className="h-4 w-4 text-red-500" />
      )}
      <span className="text-xs text-muted-foreground hidden sm:inline">
        {connectionStatus === 'connected' ? 'Online' : 'Offline'}
      </span>
      {pendingSync > 0 && (
        <Badge variant="secondary" className="ml-1 text-xs">
          {pendingSync}
        </Badge>
      )}
    </div>
  )

  return (
    <>
      <header
        className={cn(
          "sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60",
          "mobile-header touch-manipulation md:hidden"
        )}
        data-testid="mobile-header"
      >
        <div className="flex items-center justify-between px-4 py-3">
          {/* Left side - Menu button and session info */}
          <div className="flex items-center space-x-3 min-w-0 flex-1">
            {/* Mobile Menu Toggle - Larger touch target */}
            <Button
              variant="ghost"
              size="sm"
              onClick={onMenuToggle}
              className="h-10 w-10 text-fronteira-gray-500 hover:text-fronteira-primary hover:bg-fronteira-gray-50 touch-target-large"
              aria-label={isMenuOpen ? 'Fechar menu' : 'Abrir menu'}
              data-testid="menu-toggle"
            >
              {isMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </Button>

            {/* Current Session Info - Tablet optimized */}
            {currentSession && (
              <div className="flex items-center gap-2 min-w-0">
                <div
                  className={cn(
                    'w-3 h-3 rounded-full flex-shrink-0',
                    getPhaseColor(currentSession.fase)
                  )}
                  data-testid="session-phase-indicator"
                />
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">
                    {currentSession.turma_nome}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {getPhaseLabel(currentSession.fase)} • {currentSession.total_presentes}/{currentSession.total_alunos}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Center - Municipal Identity - Compact for tablets */}
          <div className="flex-shrink-0 mx-2">
            <MunicipalHeaderIdentity
              variant="default"
              className="hidden sm:flex"
            />
          </div>

          {/* Right side - Time, Connection, Notifications and Profile */}
          <div className="flex items-center space-x-2">
            {/* Current Time - Classroom essential */}
            <div className="text-right hidden xs:block">
              <p className="text-sm font-medium">
                {formatTime(currentTime)}
              </p>
              <p className="text-xs text-muted-foreground">
                {getRoleLabel(userProfile?.tipo_usuario || '')}
              </p>
            </div>

            {/* Connection Status */}
            <ConnectionIndicator />

            {/* Notificações with count */}
            <Button
              variant="ghost"
              size="sm"
              className="relative text-fronteira-gray-500 hover:text-fronteira-primary hover:bg-fronteira-gray-50 h-10 w-10 touch-target-large"
            >
              <Bell className="h-4 w-4" />
              {notifications > 0 && (
                <Badge
                  variant="destructive"
                  className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
                >
                  {notifications > 9 ? '9+' : notifications}
                </Badge>
              )}
            </Button>

            {/* Profile Menu - Larger touch target */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full hover:bg-fronteira-gray-50 touch-target-large">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-fronteira-primary text-fronteira-primary-foreground text-xs">
                      {userProfile?.nome ? getInitials(userProfile.nome) : 'U'}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {userProfile?.nome || 'Usuário'}
                    </p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {getRoleLabel(userProfile?.tipo_usuario || '')}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/perfil">
                    <User className="mr-2 h-4 w-4" />
                    <span>Meu Perfil</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/configuracoes">
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Configurações</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="text-fronteira-red hover:text-fronteira-red hover:bg-red-50">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sair</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Session Info Bar - Only show when active session and menu closed */}
        {!isMenuOpen && currentSession && (
          <div className="border-t px-4 py-2 bg-muted/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <Users className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="text-sm truncate">
                  Turma: {currentSession.turma_nome}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span>Aula {getPhaseLabel(currentSession.fase).toLowerCase()}</span>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Offline Alert - Critical for classroom tablets */}
      {showOfflineAlert && (
        <Alert className="mx-4 mt-2 border-orange-200 bg-orange-50" data-testid="offline-alert">
          <AlertTriangle className="h-4 w-4 text-orange-600" />
          <AlertDescription className="text-orange-800">
            Modo Offline: Suas alterações serão sincronizadas quando a conexão for restabelecida
            {pendingSync > 0 && (
              <span className="font-medium">
                {' '}({pendingSync} pendente{pendingSync !== 1 ? 's' : ''})
              </span>
            )}
          </AlertDescription>
        </Alert>
      )}
    </>
  )
}