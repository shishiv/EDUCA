'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import {
  ChevronDown,
  LogOut,
  Settings,
  User,
  Wifi,
  WifiOff,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useEscola } from '@/contexts/escola-context'
import { useSessionRealtime } from '@/contexts/session-realtime-context'
import { useAuth } from '@/hooks/use-auth'

const routeLabels = [
  ['/dashboard/alunos', 'students'], ['/dashboard/usuarios', 'users'],
  ['/dashboard/escolas', 'schools'], ['/dashboard/turmas', 'classes'],
  ['/dashboard/matriculas', 'enrolments'], ['/dashboard/atribuicoes', 'assignments'],
  ['/dashboard/responsaveis', 'guardians'], ['/dashboard/notas', 'grades'],
  ['/dashboard/relatorios', 'reports'], ['/dashboard/configuracoes', 'settings'],
  ['/diario', 'classDiary'], ['/relatorios', 'reports'],
] as const

function getInitials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .map(part => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function Header() {
  const t = useTranslations('layout')
  const common = useTranslations('common')
  const pathname = usePathname()
  const { userProfile, signOut } = useAuth()
  const { connectionStatus } = useSessionRealtime()
  const { selectedEscola, shouldShowSelector } = useEscola()
  const section = pathname.startsWith('/dashboard/perfil')
    ? t('header.myProfile')
    : t(`navigation.items.${pathname === '/dashboard' ? 'dashboard' : routeLabels.find(([path]) => pathname.startsWith(path))?.[1] ?? 'dashboard'}`)
  const role = userProfile?.tipo_usuario
  const roleLabel = role && ['admin', 'diretor', 'secretario', 'professor', 'responsavel'].includes(role)
    ? common(`roles.${role as 'admin' | 'diretor' | 'secretario' | 'professor' | 'responsavel'}`)
    : role ?? ''

  const handleSignOut = async () => {
    try {
      await signOut()
      toast.success(t('header.signOutSuccess'))
    } catch {
      toast.error(t('header.signOutError'))
    }
  }

  return (
    <header className="app-header">
      <nav className="app-header__context" aria-label={section}>
        <span>EDUCA</span>
        <span aria-hidden="true">/</span>
        <strong>{section}</strong>
      </nav>

      <div className="app-header__actions">
        <div
          className="app-connection"
          data-status={connectionStatus}
          title={t('header.connection', { status: connectionStatus === 'connected' ? common('status.online') : common('status.offline') })}
        >
          {connectionStatus === 'connected' ? <Wifi aria-hidden="true" /> : <WifiOff aria-hidden="true" />}
          <span>{connectionStatus === 'connected' ? common('status.online') : common('status.offline')}</span>
        </div>

        {shouldShowSelector && (
          <div className="app-school-context" data-empty={!selectedEscola}>
            <span>{selectedEscola?.nome || t('schoolSelector.select')}</span>
          </div>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button type="button" className="app-profile-trigger" aria-label={t('header.openUserMenu')}>
              <span className="app-avatar" aria-hidden="true">
                {userProfile?.nome ? getInitials(userProfile.nome) : 'U'}
              </span>
              <span className="app-profile-trigger__copy" aria-hidden="true">
                <strong>{userProfile?.nome?.split(' ')[0] || t('header.userFallback')}</strong>
                <small>{roleLabel}</small>
              </span>
              <ChevronDown aria-hidden="true" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="app-dropdown app-profile-menu" align="end" forceMount>
            <DropdownMenuLabel className="app-profile-menu__identity">
              <strong>{userProfile?.nome || t('header.userFallback')}</strong>
              <small>{roleLabel}</small>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild className="app-dropdown__item">
              <Link href="/dashboard/perfil"><User aria-hidden="true" /> {t('header.myProfile')}</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild className="app-dropdown__item">
              <Link href="/dashboard/configuracoes"><Settings aria-hidden="true" /> {t('header.settings')}</Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut} className="app-dropdown__item app-dropdown__item--danger">
              <LogOut aria-hidden="true" /> {t('header.signOut')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
