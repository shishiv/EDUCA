'use client'

import { useAuth } from '@/hooks/use-auth'
import { useSessionRealtime } from '@/contexts/session-realtime-context'
import { useComplianceWarnings } from '@/hooks/use-compliance-warnings'
import { useEscola } from '@/contexts/escola-context'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Bell, LogOut, User, Settings, Wifi, WifiOff, FileText, AlertTriangle, AlertCircle, Search, School } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import { useTranslations } from 'next-intl'

/**
 * Header Component - EDUCA Design System
 *
 * Updated to match EDUCA mockups with:
 * - Global search field (LAY-02)
 * - Notification bell with indicator
 * - User dropdown with quick actions
 * - Responsive behavior (search hidden on mobile)
 */

export function Header() {
  const t = useTranslations('layout.header')
  const common = useTranslations('common')
  const schoolSelector = useTranslations('layout.schoolSelector')
  const { userProfile, signOut } = useAuth()
  const { connectionStatus, notifications } = useSessionRealtime()
  const { data: complianceWarnings = [] } = useComplianceWarnings()
  const { selectedEscola, shouldShowSelector } = useEscola()

  // Map compliance warnings to notification format
  // ComplianceWarning has: id, type, severity, title, description, studentId, studentName, etc.
  const complianceNotifications = complianceWarnings.map(warning => ({
    id: warning.id,
    title: warning.title,
    message: warning.description, // Map description to message
    type: warning.type,
    severity: warning.severity,
    icon: warning.severity === 'critical' ? AlertCircle : warning.severity === 'warning' ? AlertTriangle : FileText,
    studentName: warning.studentName
  }))

  // Combine system notifications with compliance notifications
  const allNotifications = [...notifications, ...complianceNotifications]

  const handleSignOut = async () => {
    try {
      await signOut()
      toast.success(t('signOutSuccess'))
    } catch {
      toast.error(t('signOutError'))
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
    const roleKeys = ['admin', 'diretor', 'secretario', 'professor', 'responsavel'] as const
    const roleKey = roleKeys.find(key => key === role)
    return roleKey ? common(`roles.${roleKey}`) : role
  }

  return (
    <>
      {/* Header - EDUCA mockup: 70px height, white bg, border-bottom */}
      <header className="hidden lg:flex items-center justify-between px-8 h-[70px] bg-white border-b border-gray-200">
        {/* Header Left - Page title area (can be used by pages) */}
        <div className="flex items-center gap-6">
          {/* Page title placeholder - will be set by individual pages via context/props if needed */}
        </div>

        {/* Header Right - Search, notifications, user */}
        <div className="flex items-center gap-4">
          {/* Global Search Box - EDUCA mockup: LAY-02 requirement */}
          {/* Mockup: padding 10px 16px, bg gray-50, border 1px gray-200, border-radius 10px, width 280px */}
          <div className="hidden xl:flex items-center gap-2.5 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-[10px] w-[280px]">
            <Search className="h-[18px] w-[18px] text-gray-400 flex-shrink-0" />
            <input
              type="text"
              placeholder={t('searchPlaceholder')}
              className="border-none bg-transparent outline-none font-sans text-[0.9rem] text-gray-800 w-full placeholder:text-gray-400"
            />
          </div>

          {/* Connection Status - compact indicator */}
          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-[10px] bg-gray-50 border border-gray-200"
            title={t('connection', {
              status: connectionStatus === 'connected' ? common('status.online') : common('status.offline'),
            })}
          >
            {connectionStatus === 'connected' ? (
              <Wifi className="h-4 w-4 text-green-500" />
            ) : (
              <WifiOff className="h-4 w-4 text-red-500" />
            )}
            <span className="text-xs font-medium text-gray-600 hidden xl:inline">
              {connectionStatus === 'connected' ? common('status.online') : common('status.offline')}
            </span>
          </div>

          {/* Escola Indicator - shows selected escola for admin users */}
          {shouldShowSelector && selectedEscola && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-[10px] bg-green-50 border border-green-200">
              <School className="h-4 w-4 text-green-600" />
              <span className="text-xs font-medium text-green-700 hidden xl:inline truncate max-w-[150px]">
                {selectedEscola.nome}
              </span>
            </div>
          )}

          {shouldShowSelector && !selectedEscola && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-[10px] bg-yellow-50 border border-yellow-200">
              <School className="h-4 w-4 text-yellow-600" />
              <span className="text-xs font-medium text-yellow-700 hidden xl:inline">
                {schoolSelector('none')}
              </span>
            </div>
          )}

          {/* Notifications - EDUCA mockup: 40px button, rounded-[10px], notification dot */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label={t('openNotifications')}
                className="relative flex h-10 w-10 items-center justify-center rounded-[10px] border border-gray-200 bg-gray-50 text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2"
              >
                <Bell className="h-5 w-5" aria-hidden="true" />
                {allNotifications.length > 0 && (
                  <span className="absolute top-2 right-2 w-2 h-2 bg-pink-400 rounded-full border-2 border-white" />
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-96 max-h-96 overflow-y-auto shadow-xl border-0 ring-1 ring-black/5" align="end">
              <DropdownMenuLabel className="font-semibold text-green-600">
                {t('notifications')}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {allNotifications.length > 0 ? (
                allNotifications.map((notification, index) => {
                  // Determine if this is a compliance notification (from complianceWarnings)
                  const isCompliance = 'severity' in notification
                  // Get the icon - for compliance use the mapped icon, for session use Bell
                  const Icon = isCompliance ? (notification as typeof complianceNotifications[number]).icon : Bell
                  // Get severity for coloring
                  const severity = isCompliance ? (notification as typeof complianceNotifications[number]).severity : null
                  return (
                    <DropdownMenuItem
                      key={notification.id || index}
                      className="p-4 hover:bg-green-50 cursor-pointer"
                    >
                      <div className="flex items-start space-x-3 w-full">
                        <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                          severity === 'critical'
                            ? 'bg-red-100 text-red-600'
                            : severity === 'warning'
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
                              {isCompliance && severity && (
                                <div className="flex items-center gap-2 mt-2">
                                  <Badge
                                    variant="outline"
                                    className={`text-xs ${
                                      severity === 'critical'
                                        ? 'border-red-200 bg-red-50 text-red-800'
                                        : 'border-yellow-200 bg-yellow-50 text-yellow-800'
                                    }`}
                                  >
                                    {severity === 'critical' ? t('urgent') : t('attention')}
                                  </Badge>
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
                    <span className="text-sm">{t('noNotifications')}</span>
                  </div>
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

        {/* Profile Menu - EDUCA styled avatar with gradient */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button type="button" aria-label={t('openUserMenu')} className="relative flex h-10 w-10 items-center justify-center rounded-[10px] bg-gradient-to-br from-green-600 to-sky-600 text-sm font-semibold text-white shadow-sm transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2">
              {userProfile?.nome ? getInitials(userProfile.nome) : 'U'}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-64 shadow-xl border-0 ring-1 ring-black/5" align="end" forceMount>
            <DropdownMenuLabel className="font-normal p-4">
              <div className="flex flex-col space-y-2">
                <p className="text-sm font-semibold leading-none text-green-600">
                  {userProfile?.nome || t('userFallback')}
                </p>
                <p className="text-xs leading-none text-gray-500">
                  {getRoleLabel(userProfile?.tipo_usuario || '')}
                </p>
                <div className="mt-2 pt-2 border-t border-gray-100">
                  <p className="text-xs text-gray-500">{common('brand.municipalEducationSystem')}</p>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild className="p-3 hover:bg-green-50">
              <Link href="/dashboard/perfil">
                <User className="mr-3 h-4 w-4 text-green-600" />
                <span className="font-medium">{t('myProfile')}</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild className="p-3 hover:bg-green-50">
              <Link href="/dashboard/configuracoes">
                <Settings className="mr-3 h-4 w-4 text-green-600" />
                <span className="font-medium">{t('settings')}</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut} className="p-3 text-red-600 hover:text-red-700 hover:bg-red-50 font-medium">
              <LogOut className="mr-3 h-4 w-4" />
              <span>{t('signOut')}</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        </div>
      </header>
    </>
  )
}
