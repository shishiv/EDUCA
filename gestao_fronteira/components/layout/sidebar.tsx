'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { EducaLogo, EducaLogoIcon } from '@/components/identity/educa-logo-v2'
import { useAuth } from '@/hooks/use-auth'
import {
  LayoutDashboard,
  Users,
  School,
  UserCheck,
  Calendar,
  ClipboardList,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Home,
  FileText,
  User,
  BookOpen,
  CheckSquare,
  BookText,
  FolderOpen,
  Download,
  LogOut,
  type LucideIcon
} from 'lucide-react'

// Hook to fetch pending attendance count
function usePendingAttendance() {
  const [count, setCount] = useState<number>(0)

  const fetchCount = useCallback(async () => {
    try {
      const res = await fetch('/api/chamada/pendentes')
      if (res.ok) {
        const data = await res.json()
        setCount(data.count || 0)
      }
    } catch {
      // Silently fail - badge will show 0
    }
  }, [])

  useEffect(() => {
    fetchCount()
    // Refresh every 5 minutes
    const interval = setInterval(fetchCount, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [fetchCount])

  return count
}

interface SidebarProps {
  className?: string
}

interface NavigationItem {
  name: string
  href: string
  icon: LucideIcon
  roles: string[]
  badge?: number
  badgeKey?: 'chamada' // Keys for dynamic badges
}

interface NavigationGroup {
  name: string
  icon: LucideIcon
  items: NavigationItem[]
  defaultOpen?: boolean
}

// Navigation structure matching brand guidelines mockups
const navigationGroups: NavigationGroup[] = [
  {
    name: 'Menu',
    icon: Home,
    defaultOpen: true,
    items: [
      {
        name: 'Dashboard',
        href: '/dashboard',
        icon: LayoutDashboard,
        roles: ['admin', 'diretor', 'secretario', 'professor'],
      },
      {
        name: 'Minhas Turmas',
        href: '/dashboard/turmas',
        icon: Users,
        roles: ['admin', 'diretor', 'secretario', 'professor'],
      },
      {
        name: 'Chamada',
        href: '/dashboard/frequencia',
        icon: CheckSquare,
        roles: ['admin', 'diretor', 'secretario', 'professor'],
        badgeKey: 'chamada', // Dynamic badge from API
      },
      {
        name: 'Diário de Classe',
        href: '/dashboard/diario',
        icon: FileText,
        roles: ['admin', 'diretor', 'secretario', 'professor'],
      },
      {
        name: 'Notas',
        href: '/dashboard/notas',
        icon: BarChart3,
        roles: ['admin', 'diretor', 'secretario', 'professor'],
      },
    ],
  },
  {
    name: 'Cadastros',
    icon: FolderOpen,
    defaultOpen: true,
    items: [
      {
        name: 'Alunos',
        href: '/dashboard/alunos',
        icon: User,
        roles: ['admin', 'diretor', 'secretario'],
      },
      {
        name: 'Responsáveis',
        href: '/dashboard/responsaveis',
        icon: Users,
        roles: ['admin', 'diretor', 'secretario'],
      },
      {
        name: 'Usuários',
        href: '/dashboard/usuarios',
        icon: UserCheck,
        roles: ['admin'],
      },
      {
        name: 'Escolas',
        href: '/dashboard/escolas',
        icon: School,
        roles: ['admin'],
      },
      {
        name: 'Matrículas',
        href: '/dashboard/matriculas',
        icon: BookOpen,
        roles: ['admin', 'diretor', 'secretario'],
      },
    ],
  },
  {
    name: 'Relatórios',
    icon: Download,
    defaultOpen: false,
    items: [
      {
        name: 'Frequência',
        href: '/dashboard/relatorios/frequencia',
        icon: Download,
        roles: ['admin', 'diretor', 'secretario'],
      },
      {
        name: 'Bolsa Família',
        href: '/dashboard/relatorios/bolsa-familia',
        icon: Calendar,
        roles: ['admin', 'diretor', 'secretario'],
      },
      {
        name: 'Conteúdo Ministrado',
        href: '/dashboard/relatorios/conteudo',
        icon: FileText,
        roles: ['admin', 'diretor', 'secretario', 'professor'],
      },
    ],
  },
  {
    name: 'Sistema',
    icon: Settings,
    defaultOpen: false,
    items: [
      {
        name: 'Calendário',
        href: '/dashboard/calendario',
        icon: Calendar,
        roles: ['admin', 'diretor'],
      },
      {
        name: 'Configurações',
        href: '/dashboard/configuracoes',
        icon: Settings,
        roles: ['admin', 'diretor'],
      },
    ],
  },
]

// Filter navigation groups based on user role
function getNavigationForRole(userRole: string): NavigationGroup[] {
  return navigationGroups
    .map(group => ({
      ...group,
      items: group.items.filter(item => item.roles.includes(userRole)),
    }))
    .filter(group => group.items.length > 0)
}

export function Sidebar({ className }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false)
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({})
  const pathname = usePathname()
  const { userProfile } = useAuth()
  const pendingAttendance = usePendingAttendance()

  // Get navigation groups based on user role
  const navigationGroups = userProfile ? getNavigationForRole(userProfile.tipo_usuario) : []

  // Helper to get badge value
  const getBadgeValue = (item: NavigationItem): number | undefined => {
    if (item.badge !== undefined) return item.badge
    if (item.badgeKey === 'chamada') return pendingAttendance > 0 ? pendingAttendance : undefined
    return undefined
  }

  // Initialize expanded groups from defaults
  useEffect(() => {
    const defaults: Record<string, boolean> = {}
    navigationGroups.forEach(group => {
      if (defaults[group.name] === undefined) {
        defaults[group.name] = group.defaultOpen ?? true
      }
    })
    setExpandedGroups(prev => ({ ...defaults, ...prev }))
  }, [userProfile])

  const toggleGroup = (groupName: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupName]: !prev[groupName]
    }))
  }

  // Check if any item in a group is active
  const isGroupActive = (group: NavigationGroup) => {
    return group.items.some(item =>
      pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href + '/'))
    )
  }

  // Get user initials for avatar
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const getRoleLabel = (role: string) => {
    const roles: Record<string, string> = {
      admin: 'Administrador',
      diretor: 'Diretor(a)',
      secretario: 'Secretário(a)',
      professor: 'Professor(a)',
    }
    return roles[role] || role
  }

  return (
    <aside className={cn(
      "relative flex flex-col bg-white border-r border-gray-200 h-screen fixed sidebar-transition",
      collapsed ? "w-16" : "w-[260px]",
      className
    )}>
      {/* Logo Area - Brand Guidelines v1.0 */}
      <div className="p-6 border-b border-gray-100">
        {collapsed ? (
          <div className="flex items-center justify-center">
            <EducaLogoIcon size={32} />
          </div>
        ) : (
          <EducaLogo size="sm" />
        )}
      </div>

      {/* Subtle side expand/collapse button */}
      <div className="absolute top-1/2 -right-3 transform -translate-y-1/2 z-20">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCollapsed(!collapsed)}
          className="h-6 w-6 p-0 rounded-full bg-white border border-gray-200 text-gray-400 hover:text-jardim-green-600 hover:bg-jardim-green-50 hover:border-jardim-green-200 shadow-sm transition-all duration-200"
        >
          {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
        </Button>
      </div>

      {/* Navigation with Groups */}
      <ScrollArea className="flex-1 py-4">
        <nav className="space-y-6 px-4">
          {navigationGroups.map((group) => {
            const isExpanded = expandedGroups[group.name] ?? group.defaultOpen
            const groupActive = isGroupActive(group)

            // If sidebar is collapsed, just show icons
            if (collapsed) {
              return (
                <div key={group.name} className="space-y-1">
                  {group.items.map((item) => {
                    const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href + '/'))
                    return (
                      <Link key={item.name} href={item.href}>
                        <div
                          className={cn(
                            "flex items-center justify-center h-10 w-10 mx-auto rounded-nav-item transition-colors",
                            isActive
                              ? "bg-jardim-green-50 text-jardim-green-600"
                              : "text-gray-600 hover:bg-gray-50 hover:text-gray-800"
                          )}
                          title={item.name}
                        >
                          <item.icon className="h-5 w-5" strokeWidth={2} />
                        </div>
                      </Link>
                    )
                  })}
                </div>
              )
            }

            // Expanded sidebar with collapsible groups
            return (
              <div key={group.name} className="space-y-1">
                {/* Section Title - Brand Guidelines */}
                <p className="text-[0.7rem] font-semibold text-gray-400 uppercase tracking-wider px-3 mb-2">
                  {group.name}
                </p>

                {/* Group Items */}
                <div className="space-y-1">
                  {group.items.map((item) => {
                    const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href + '/'))
                    return (
                      <Link key={item.name} href={item.href}>
                        <div
                          className={cn(
                            "flex items-center gap-3 px-3 py-3 rounded-nav-item text-[0.9rem] font-medium transition-colors",
                            isActive
                              ? "bg-jardim-green-50 text-jardim-green-600"
                              : "text-gray-600 hover:bg-gray-50 hover:text-gray-800"
                          )}
                        >
                          <item.icon className="h-5 w-5" strokeWidth={2} />
                          <span className="flex-1">{item.name}</span>
                          {(() => {
                            const badgeValue = getBadgeValue(item)
                            return badgeValue && badgeValue > 0 ? (
                              <span className="ml-auto bg-jardim-pink-400 text-white text-[0.7rem] font-semibold px-2 py-0.5 rounded-nav-item">
                                {badgeValue}
                              </span>
                            ) : null
                          })()}
                        </div>
                      </Link>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </nav>
      </ScrollArea>

      {/* User Card Footer - Brand Guidelines */}
      {userProfile && !collapsed && (
        <div className="p-4 border-t border-gray-100">
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
            <div className="w-10 h-10 bg-gradient-to-br from-jardim-green-400 to-jardim-blue-400 rounded-nav-item flex items-center justify-center text-white font-semibold text-sm">
              {userProfile.nome ? getInitials(userProfile.nome) : 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-[0.85rem] text-gray-800 truncate">
                {userProfile.nome || 'Usuário'}
              </p>
              <p className="text-[0.75rem] text-gray-500">
                {getRoleLabel(userProfile.tipo_usuario)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Collapsed User Icon */}
      {userProfile && collapsed && (
        <div className="p-2 border-t border-gray-100">
          <div className="w-10 h-10 mx-auto bg-gradient-to-br from-jardim-green-400 to-jardim-blue-400 rounded-nav-item flex items-center justify-center text-white font-semibold text-sm">
            {userProfile.nome ? getInitials(userProfile.nome) : 'U'}
          </div>
        </div>
      )}
    </aside>
  )
}