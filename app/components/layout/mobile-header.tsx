'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useLocale, useTranslations } from 'next-intl'
import {
  AlertTriangle,
  ChevronDown,
  LogOut,
  Menu,
  Settings,
  User,
  Wifi,
  WifiOff,
  X,
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
import { useAuth } from '@/hooks/use-auth'
import { canAccessRoute } from '@/lib/route-policy'
import { GlobalSearch } from '@/components/layout/global-search'

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
}

function getInitials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .map(part => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

type MobileRole = 'admin' | 'diretor' | 'secretario' | 'professor' | 'responsavel'
type MobileRoleKey = `roles.${MobileRole}`

function mobileRoleLabel(role: string | undefined, translate: (key: MobileRoleKey) => string) {
  const roles: MobileRole[] = ['admin', 'diretor', 'secretario', 'professor', 'responsavel']
  // SAFETY: `roles` is the complete MobileRole allowlist used for this runtime narrowing.
  if (!role || !roles.includes(role as MobileRole)) return role ?? ''
  // SAFETY: the allowlist above narrows role to the complete MobileRole union.
  return translate(`roles.${role}` as MobileRoleKey)
}

function MobileProfileMenu({ name, role, onSignOut }: { name?: string; role?: string; onSignOut: () => void }) {
  const t = useTranslations('layout.mobileHeader')
  const header = useTranslations('layout.header')
  const common = useTranslations('common')
  const roleLabel = mobileRoleLabel(role, common)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" className="app-mobile-profile" aria-label={t('userOptions')}>
          <span className="app-avatar" aria-hidden="true">{name ? getInitials(name) : 'U'}</span>
          <ChevronDown aria-hidden="true" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="app-dropdown app-profile-menu" align="end" forceMount>
        <DropdownMenuLabel className="app-profile-menu__identity">
          <strong>{name || header('userFallback')}</strong>
          <small>{roleLabel}</small>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild className="app-dropdown__item">
          <Link href="/dashboard/perfil"><User aria-hidden="true" /> {header('myProfile')}</Link>
        </DropdownMenuItem>
        <MobileSettingsMenu role={role} label={header('settings')} />
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onSignOut} className="app-dropdown__item app-dropdown__item--danger">
          <LogOut aria-hidden="true" /> {t('signOut')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function MobileSettingsMenu({ role, label }: { role?: string; label: string }) {
  if (!canAccessRoute('/dashboard/configuracoes', role)) return null
  return (
    <DropdownMenuItem asChild className="app-dropdown__item">
      <Link href="/dashboard/configuracoes"><Settings aria-hidden="true" /> {label}</Link>
    </DropdownMenuItem>
  )
}

type MobileSession = NonNullable<MobileHeaderProps['currentSession']>

function MobileSessionStrip({ session }: { session: MobileSession }) {
  const t = useTranslations('layout.mobileHeader')
  const phases = { planejamento: 'planning', chamada: 'attendance', finalizada: 'finished', bloqueada: 'blocked' } as const
  return (
    <div className="app-session-strip">
      <span className="app-session-strip__dot" data-phase={session.fase} aria-hidden="true" />
      <strong>{session.turma_nome}</strong>
      <span>{t(`phases.${phases[session.fase]}`)}</span>
      <span>{t('presentCount', { present: session.total_presentes, total: session.total_alunos })}</span>
    </div>
  )
}

function MobileOfflineAlert({ pendingSync }: { pendingSync: number }) {
  const t = useTranslations('layout.mobileHeader')
  return (
    <div className="app-offline-alert" role="status" data-testid="offline-alert">
      <AlertTriangle aria-hidden="true" />
      <span>{t('offlineMessage', { pending: pendingSync })}</span>
    </div>
  )
}

function MobileMenuButton({ isMenuOpen, onMenuToggle, label }: { isMenuOpen: boolean; onMenuToggle?: () => void; label: string }) {
  return (
    <button type="button" onClick={onMenuToggle} className="app-icon-button app-mobile-header__menu" aria-label={label} data-testid="menu-toggle">
      {isMenuOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
    </button>
  )
}

function MobileConnectionClock({ currentTime, locale, connectionStatus }: { currentTime: Date; locale: string; connectionStatus: string }) {
  return (
    <div className="app-mobile-clock">
      <time dateTime={currentTime.toISOString()}>{currentTime.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}</time>
      <span>{connectionStatus === 'connected' ? <Wifi aria-hidden="true" /> : <WifiOff aria-hidden="true" />}</span>
    </div>
  )
}

async function signOutWithToast(signOut: () => Promise<void>, onSuccess: () => void, onError: () => void) {
  try {
    await signOut()
    onSuccess()
  } catch {
    onError()
  }
}

export function MobileHeader({
  onMenuToggle,
  isMenuOpen = false,
  currentSession,
  connectionStatus = 'connected',
  pendingSync = 0,
}: MobileHeaderProps) {
  const t = useTranslations('layout.mobileHeader')
  const header = useTranslations('layout.header')
  const locale = useLocale()
  const { userProfile, signOut } = useAuth()
  const [currentTime, setCurrentTime] = useState(() => new Date())
  const showOfflineAlert = connectionStatus !== 'connected'
  const role = userProfile?.tipo_usuario
  useEffect(() => {
    const timer = window.setInterval(() => setCurrentTime(new Date()), 60_000)
    return () => window.clearInterval(timer)
  }, [])

  const handleSignOut = () => signOutWithToast(
    signOut,
    () => toast.success(header('signOutSuccess')),
    () => toast.error(header('signOutError')),
  )

  return (
    <>
      <header className="app-mobile-header" data-testid="mobile-header">
        <div className="app-mobile-header__bar">
          <MobileMenuButton isMenuOpen={isMenuOpen} onMenuToggle={onMenuToggle} label={isMenuOpen ? t('closeMenu') : t('openMenu')} />

          <Link href="/dashboard" className="app-wordmark">
            <span className="app-wordmark__mark" aria-hidden="true">E</span>
            <span className="app-wordmark__copy"><strong>EDUCA</strong></span>
          </Link>

          <div className="app-mobile-header__actions">
            <MobileConnectionClock currentTime={currentTime} locale={locale} connectionStatus={connectionStatus} />

            <MobileProfileMenu name={userProfile?.nome} role={role} onSignOut={handleSignOut} />
          </div>
        </div>

        <div className="app-mobile-header__search">
          <GlobalSearch />
        </div>

        {currentSession && !isMenuOpen && <MobileSessionStrip session={currentSession} />}
      </header>

      {showOfflineAlert && <MobileOfflineAlert pendingSync={pendingSync} />}
    </>
  )
}
