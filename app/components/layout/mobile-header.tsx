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

export function MobileHeader({
  onMenuToggle,
  isMenuOpen = false,
  currentSession,
  connectionStatus = 'connected',
  pendingSync = 0,
}: MobileHeaderProps) {
  const t = useTranslations('layout.mobileHeader')
  const header = useTranslations('layout.header')
  const common = useTranslations('common')
  const locale = useLocale()
  const { userProfile, signOut } = useAuth()
  const [currentTime, setCurrentTime] = useState(() => new Date())
  const showOfflineAlert = connectionStatus !== 'connected'
  const role = userProfile?.tipo_usuario
  const roleLabel = role && ['admin', 'diretor', 'secretario', 'professor', 'responsavel'].includes(role)
    ? common(`roles.${role as 'admin' | 'diretor' | 'secretario' | 'professor' | 'responsavel'}`)
    : role ?? ''

  useEffect(() => {
    const timer = window.setInterval(() => setCurrentTime(new Date()), 60_000)
    return () => window.clearInterval(timer)
  }, [])

  const handleSignOut = async () => {
    try {
      await signOut()
      toast.success(header('signOutSuccess'))
    } catch {
      toast.error(header('signOutError'))
    }
  }

  return (
    <>
      <header className="app-mobile-header" data-testid="mobile-header">
        <div className="app-mobile-header__bar">
          <button
            type="button"
            onClick={onMenuToggle}
            className="app-icon-button app-mobile-header__menu"
            aria-label={isMenuOpen ? t('closeMenu') : t('openMenu')}
            data-testid="menu-toggle"
          >
            {isMenuOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
          </button>

          <Link href="/dashboard" className="app-wordmark">
            <span className="app-wordmark__mark" aria-hidden="true">E</span>
            <span className="app-wordmark__copy"><strong>EDUCA</strong></span>
          </Link>

          <div className="app-mobile-header__actions">
            <div className="app-mobile-clock">
              <time dateTime={currentTime.toISOString()}>{currentTime.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}</time>
              <span>{connectionStatus === 'connected' ? <Wifi aria-hidden="true" /> : <WifiOff aria-hidden="true" />}</span>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button type="button" className="app-mobile-profile" aria-label={t('userOptions')}>
                  <span className="app-avatar" aria-hidden="true">
                    {userProfile?.nome ? getInitials(userProfile.nome) : 'U'}
                  </span>
                  <ChevronDown aria-hidden="true" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="app-dropdown app-profile-menu" align="end" forceMount>
                <DropdownMenuLabel className="app-profile-menu__identity">
                  <strong>{userProfile?.nome || header('userFallback')}</strong>
                  <small>{roleLabel}</small>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild className="app-dropdown__item">
                  <Link href="/dashboard/perfil"><User aria-hidden="true" /> {header('myProfile')}</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="app-dropdown__item">
                  <Link href="/dashboard/configuracoes"><Settings aria-hidden="true" /> {header('settings')}</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="app-dropdown__item app-dropdown__item--danger">
                  <LogOut aria-hidden="true" /> {t('signOut')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {currentSession && !isMenuOpen && (
          <div className="app-session-strip">
            <span className="app-session-strip__dot" data-phase={currentSession.fase} aria-hidden="true" />
            <strong>{currentSession.turma_nome}</strong>
            <span>{t(`phases.${({ planejamento: 'planning', chamada: 'attendance', finalizada: 'finished', bloqueada: 'blocked' } as const)[currentSession.fase]}`)}</span>
            <span>{t('presentCount', { present: currentSession.total_presentes, total: currentSession.total_alunos })}</span>
          </div>
        )}
      </header>

      {showOfflineAlert && (
        <div className="app-offline-alert" role="status" data-testid="offline-alert">
          <AlertTriangle aria-hidden="true" />
          <span>{t('offlineMessage', { pending: pendingSync })}</span>
        </div>
      )}
    </>
  )
}
