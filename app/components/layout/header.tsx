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
import { canAccessRoute } from '@/lib/route-policy'
import { GlobalSearch } from '@/components/layout/global-search'

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

function getSectionKey(pathname: string) {
  if (pathname.startsWith('/dashboard/perfil')) return 'myProfile'

  return pathname === '/dashboard'
    ? 'dashboard'
    : routeLabels.find(([path]) => pathname.startsWith(path))?.[1] ?? 'dashboard'
}

function ConnectionIndicator({ connected, label, status, title }: { connected: boolean; label: string; status: string; title: string }) {
  return (
    <div className="app-connection" data-status={status} title={title}>
      {connected ? <Wifi aria-hidden="true" /> : <WifiOff aria-hidden="true" />}
      <span>{label}</span>
    </div>
  )
}

function SchoolContext({ name, selectSchool }: { name?: string; selectSchool: string }) {
  return (
    <div className="app-school-context" data-empty={!name}>
      <span>{name || selectSchool}</span>
    </div>
  )
}

function ProfileMenu({
  initials,
  canAccessSettings,
  name,
  onSignOut,
  openUserMenu,
  roleLabel,
  settings,
  signOut,
  userFallback,
  myProfile,
}: {
  initials: string
  canAccessSettings: boolean
  name?: string
  onSignOut: () => void
  openUserMenu: string
  roleLabel: string
  settings: string
  signOut: string
  userFallback: string
  myProfile: string
}) {
  const displayName = name || userFallback

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" className="app-profile-trigger" aria-label={openUserMenu}>
          <span className="app-avatar" aria-hidden="true">{initials}</span>
          <span className="app-profile-trigger__copy" aria-hidden="true">
            <strong>{name?.split(' ')[0] || userFallback}</strong>
            <small>{roleLabel}</small>
          </span>
          <ChevronDown aria-hidden="true" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="app-dropdown app-profile-menu" align="end" forceMount>
        <DropdownMenuLabel className="app-profile-menu__identity">
          <strong>{displayName}</strong>
          <small>{roleLabel}</small>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild className="app-dropdown__item">
          <Link href="/dashboard/perfil"><User aria-hidden="true" /> {myProfile}</Link>
        </DropdownMenuItem>
        {canAccessSettings && (
          <DropdownMenuItem asChild className="app-dropdown__item">
            <Link href="/dashboard/configuracoes"><Settings aria-hidden="true" /> {settings}</Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onSignOut} className="app-dropdown__item app-dropdown__item--danger">
          <LogOut aria-hidden="true" /> {signOut}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function Header() {
  const t = useTranslations('layout')
  const common = useTranslations('common')
  const pathname = usePathname()
  const { userProfile, signOut } = useAuth()
  const { connectionStatus } = useSessionRealtime()
  const { selectedEscola, shouldShowSelector } = useEscola()
  const sectionKey = getSectionKey(pathname)
  const section = sectionKey === 'myProfile' ? t('header.myProfile') : t(`navigation.items.${sectionKey}`)
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

  const connected = connectionStatus === 'connected'
  const connectionLabel = connected ? common('status.online') : common('status.offline')

  return (
    <header className="app-header">
      <nav className="app-header__context" aria-label={section}>
        <span>EDUCA</span>
        <span aria-hidden="true">/</span>
        <strong>{section}</strong>
      </nav>

      <div className="app-header__actions">
        <GlobalSearch />
        <ConnectionIndicator
          connected={connected}
          label={connectionLabel}
          status={connectionStatus}
          title={t('header.connection', { status: connectionLabel })}
        />

        {shouldShowSelector && (
          <SchoolContext name={selectedEscola?.nome} selectSchool={t('schoolSelector.select')} />
        )}

        <ProfileMenu
          initials={userProfile?.nome ? getInitials(userProfile.nome) : 'U'}
          canAccessSettings={canAccessRoute('/dashboard/configuracoes', role)}
          name={userProfile?.nome}
          onSignOut={handleSignOut}
          openUserMenu={t('header.openUserMenu')}
          roleLabel={roleLabel}
          settings={t('header.settings')}
          signOut={t('header.signOut')}
          userFallback={t('header.userFallback')}
          myProfile={t('header.myProfile')}
        />
      </div>
    </header>
  )
}
