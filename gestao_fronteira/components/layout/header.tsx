'use client'

import { useAuth } from '@/hooks/use-auth'
import { useSessionRealtime } from '@/contexts/session-realtime-context'
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
import ComplianceWarningBanner from '@/components/compliance/compliance-warning-banner'
import { Bell, LogOut, User, Settings, Wifi, WifiOff } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'

export function Header() {
  const { userProfile, signOut } = useAuth()
  const { connectionStatus, notifications, clearNotification } = useSessionRealtime()

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

  return (
    <>
      <header className="hidden md:flex items-center justify-between px-6 py-3 bg-white border-b border-fronteira-gray-100 shadow-sm">
        <div className="flex items-center space-x-6">
          {/* Municipal Identity Section */}
          <MunicipalHeaderIdentity variant="full" className="flex-shrink-0" />

          {/* System Title with Municipal Context */}
          <div className="hidden md:flex flex-col border-l border-fronteira-gray-100 pl-6">
            <h1 className="text-lg font-bold text-fronteira-primary">
              Sistema de Gestão Escolar
            </h1>
            <p className="text-sm text-fronteira-gray-500">
              Secretaria Municipal de Educação
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          {/* Connection Status */}
          <div className="flex items-center gap-2" title={`Conexão: ${connectionStatus}`}>
            {connectionStatus === 'connected' ? (
              <Wifi className="h-4 w-4 text-green-500" />
            ) : (
              <WifiOff className="h-4 w-4 text-red-500" />
            )}
            <span className="text-xs text-muted-foreground hidden lg:inline">
              {connectionStatus === 'connected' ? 'Online' : 'Offline'}
            </span>
          </div>

          {/* User Info - Hidden on Mobile */}
          <div className="hidden lg:flex flex-col text-right">
            <p className="text-sm font-medium text-fronteira-primary">
              {userProfile?.nome || 'Usuário'}
            </p>
            <p className="text-xs text-fronteira-gray-500">
              {getRoleLabel(userProfile?.tipo_usuario || '')}
            </p>
          </div>

          {/* Notificações with count */}
          <Button
            variant="ghost"
            size="sm"
            className="relative text-fronteira-gray-500 hover:text-fronteira-primary hover:bg-fronteira-gray-50"
          >
            <Bell className="h-5 w-5" />
            {notifications.length > 0 && (
              <Badge
                variant="destructive"
                className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
              >
                {notifications.length > 9 ? '9+' : notifications.length}
              </Badge>
            )}
          </Button>

        {/* Profile Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-10 w-10 rounded-full hover:bg-fronteira-gray-50">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-fronteira-primary text-fronteira-primary-foreground">
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
    </header>

    {/* Brazilian Compliance Warning Banner */}
    <ComplianceWarningBanner
      position="top"
      maxVisible={2}
      autoRefresh={true}
      onWarningDismiss={clearNotification}
    />
    </>
  )
}