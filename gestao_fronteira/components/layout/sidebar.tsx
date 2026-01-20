'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { MunicipalBrasao } from '@/components/identity/municipal-assets'
import { useAuth } from '@/hooks/use-auth'
import { EscolaSelector } from '@/components/layout/escola-selector'
import {
  GraduationCap,
  Users,
  School,
  UserCheck,
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
  UserCog,
  type LucideIcon
} from 'lucide-react'

/**
 * Sidebar Component - EDUCA Design System
 *
 * Updated to match EDUCA mockups with:
 * - Green active states (bg-green-50, text-green-600)
 * - 10px border-radius on nav items
 * - 0.7rem uppercase section titles
 * - Hierarchical navigation with collapsible groups
 * - Lexend font for header title
 *
 * Responsive behavior (LAY-05):
 * - Desktop (1200+): Full sidebar visible (260px width)
 * - Tablet (768-1199): Sidebar can be collapsed via button
 * - Mobile (<768): Sidebar hidden, MobileNav used instead
 */

interface SidebarProps {
  className?: string
}

interface NavigationItem {
  name: string
  href: string
  icon: LucideIcon
  roles: string[]
}

interface NavigationGroup {
  name: string
  icon: LucideIcon
  items: NavigationItem[]
  defaultOpen?: boolean
}

// Organized navigation with groups (Notion-style)
const navigationGroups: NavigationGroup[] = [
  {
    name: 'Principal',
    icon: Home,
    defaultOpen: true,
    items: [
      {
        name: 'Dashboard',
        href: '/dashboard',
        icon: Home,
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
        icon: Users,
        roles: ['admin', 'diretor', 'secretario'],
      },
      {
        name: 'Usuários',
        href: '/dashboard/usuarios',
        icon: User,
        roles: ['admin'],
      },
      {
        name: 'Escolas',
        href: '/dashboard/escolas',
        icon: School,
        roles: ['admin'],
      },
      {
        name: 'Turmas',
        href: '/dashboard/turmas',
        icon: BookOpen,
        roles: ['admin', 'diretor', 'secretario'],
      },
      {
        name: 'Matrículas',
        href: '/dashboard/matriculas',
        icon: UserCheck,
        roles: ['admin', 'diretor', 'secretario'],
      },
      {
        name: 'Atribuicoes',
        href: '/dashboard/atribuicoes',
        icon: UserCog,
        roles: ['admin', 'diretor'],
      },
      {
        name: 'Responsáveis',
        href: '/dashboard/responsaveis',
        icon: Users,
        roles: ['admin', 'diretor', 'secretario'],
      },
    ],
  },
  {
    name: 'Acadêmico',
    icon: GraduationCap,
    defaultOpen: true,
    items: [
      {
        name: 'Frequência',
        href: '/diario/frequencia',
        icon: CheckSquare,
        roles: ['admin', 'diretor', 'secretario', 'professor'],
      },
      {
        name: 'Diário de Classe',
        href: '/dashboard/diario',
        icon: BookText,
        roles: ['admin', 'diretor', 'secretario', 'professor'],
      },
      {
        name: 'Notas',
        href: '/dashboard/notas',
        icon: ClipboardList,
        roles: ['admin', 'diretor', 'secretario', 'professor'],
      },
    ],
  },
  {
    name: 'Gestão',
    icon: BarChart3,
    defaultOpen: false,
    items: [
      {
        name: 'Relatórios',
        href: '/dashboard/relatorios',
        icon: FileText,
        roles: ['admin', 'diretor', 'secretario'],
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

  // Get navigation groups based on user role
  const navigationGroups = userProfile ? getNavigationForRole(userProfile.tipo_usuario) : []

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

  return (
    <div className={cn(
      // Base styles
      "relative flex-col bg-white border-r border-gray-200 sidebar-transition",
      // Width based on collapsed state
      collapsed ? "w-16" : "w-[260px]",
      // Responsive: hidden on mobile (<768px), flex on tablet+
      "hidden md:flex",
      className
    )}>
      {/* Sidebar Header - EDUCA styled */}
      <div className="flex items-center justify-between px-6 h-[73px] border-b border-gray-100">
        {collapsed ? (
          /* Collapsed state - show only small icon */
          <div className="flex items-center justify-center w-full">
            <MunicipalBrasao size="sm" priority />
          </div>
        ) : (
          /* Expanded state - show full EDUCA identity */
          <div className="flex items-center space-x-3 sidebar-transition">
            {/* Municipal Brasão */}
            <div className="flex-shrink-0">
              <MunicipalBrasao size="sm" priority />
            </div>
            <div>
              <h2 className="text-sm font-bold text-green-600 font-display">Sistema Escolar</h2>
              <p className="text-xs text-gray-500">Prefeitura de Fronteira/MG</p>
            </div>
          </div>
        )}

      </div>

      {/* Escola Selector - for admin users */}
      <div className="px-3 py-2 border-b border-gray-100">
        <EscolaSelector collapsed={collapsed} />
      </div>

      {/* Collapse/Expand button - EDUCA styled (rounded, subtle) */}
      <div className="absolute top-1/2 -right-3 transform -translate-y-1/2 z-20">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCollapsed(!collapsed)}
          className="h-6 w-6 p-0 rounded-full bg-white border border-gray-200 text-gray-400 hover:text-green-600 hover:bg-green-50 hover:border-green-200 shadow-sm transition-all duration-200"
        >
          {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
        </Button>
      </div>

      {/* Navigation with Groups - EDUCA styled */}
      <ScrollArea className="flex-1 py-4">
        <nav className="space-y-6 px-3">
          {navigationGroups.map((group) => {
            const isExpanded = expandedGroups[group.name] ?? group.defaultOpen
            const groupActive = isGroupActive(group)

            // If sidebar is collapsed, just show icons for first item of each group
            if (collapsed) {
              return (
                <div key={group.name} className="space-y-1">
                  {group.items.map((item) => {
                    const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href + '/'))
                    return (
                      <Link key={item.name} href={item.href}>
                        <Button
                          variant="ghost"
                          className={cn(
                            "w-full justify-center h-10 px-2 sidebar-transition rounded-[10px]",
                            isActive
                              ? "bg-green-50 text-green-600 hover:bg-green-100"
                              : "text-gray-600 hover:text-gray-800 hover:bg-gray-50"
                          )}
                          title={item.name}
                        >
                          <item.icon className="h-5 w-5" />
                        </Button>
                      </Link>
                    )
                  })}
                </div>
              )
            }

            // Expanded sidebar with collapsible groups
            return (
              <div key={group.name} className="space-y-2">
                {/* Group Section Title - EDUCA mockup style: 0.7rem, uppercase, tracking-wide */}
                {group.items.length > 1 ? (
                  <button
                    onClick={() => toggleGroup(group.name)}
                    className={cn(
                      "w-full flex items-center justify-between px-3 py-1.5 text-[0.7rem] font-semibold uppercase tracking-[0.5px] rounded-lg transition-colors",
                      groupActive
                        ? "text-green-600"
                        : "text-gray-400 hover:text-gray-600"
                    )}
                  >
                    <span className="flex items-center gap-2">
                      <group.icon className="h-3.5 w-3.5" />
                      {group.name}
                    </span>
                    <ChevronDown
                      className={cn(
                        "h-3.5 w-3.5 transition-transform duration-200",
                        isExpanded ? "rotate-0" : "-rotate-90"
                      )}
                    />
                  </button>
                ) : null}

                {/* Group Items - EDUCA mockup style */}
                <div
                  className={cn(
                    "space-y-1 overflow-hidden transition-all duration-200",
                    group.items.length > 1 && !isExpanded ? "max-h-0 opacity-0" : "max-h-[500px] opacity-100"
                  )}
                >
                  {group.items.map((item) => {
                    const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href + '/'))
                    return (
                      <Link key={item.name} href={item.href}>
                        {/* Nav item - EDUCA mockup: padding 12px, border-radius 10px, font-size 0.9rem, font-weight 500 */}
                        <div
                          className={cn(
                            "flex items-center gap-3 px-3 py-3 rounded-[10px] text-[0.9rem] font-medium cursor-pointer transition-all duration-200",
                            isActive
                              ? "bg-green-50 text-green-600"
                              : "text-gray-600 hover:bg-gray-50 hover:text-gray-800"
                          )}
                        >
                          <item.icon className="h-5 w-5 flex-shrink-0" strokeWidth={2} />
                          <span className="sidebar-transition">{item.name}</span>
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
    </div>
  )
}