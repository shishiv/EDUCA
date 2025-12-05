'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { MunicipalBrasao } from '@/components/identity/municipal-assets'
import { useAuth } from '@/hooks/use-auth'
import {
  GraduationCap,
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
  type LucideIcon
} from 'lucide-react'

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
    ],
  },
  {
    name: 'Acadêmico',
    icon: GraduationCap,
    defaultOpen: true,
    items: [
      {
        name: 'Frequência',
        href: '/dashboard/frequencia',
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
      "relative flex flex-col bg-white border-r border-fronteira-gray-100 sidebar-transition",
      collapsed ? "w-16" : "w-64",
      className
    )}>
      {/* Municipal Header */}
      <div className="flex items-center justify-between px-4 h-[73px] border-b border-fronteira-gray-100 bg-gradient-to-r from-fronteira-primary/5 via-fronteira-primary/3 to-transparent">
        {collapsed ? (
          /* Collapsed state - show only small icon */
          <div className="flex items-center justify-center w-full">
            <MunicipalBrasao size="sm" priority />
          </div>
        ) : (
          /* Expanded state - show full identity */
          <div className="flex items-center space-x-3 sidebar-transition">
            {/* Municipal Brasão */}
            <div className="flex-shrink-0">
              <MunicipalBrasao size="sm" priority />
            </div>
            <div>
              <h2 className="text-sm font-bold text-fronteira-primary">Sistema Escolar</h2>
              <p className="text-xs text-fronteira-gray-500">Prefeitura de Fronteira/MG</p>
            </div>
          </div>
        )}

      </div>

      {/* Subtle side expand/collapse button */}
      <div className="absolute top-1/2 -right-3 transform -translate-y-1/2 z-20">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCollapsed(!collapsed)}
          className="h-6 w-6 p-0 rounded-full bg-white border border-fronteira-gray-200 text-fronteira-gray-400 hover:text-fronteira-primary hover:bg-fronteira-primary/5 hover:border-fronteira-primary/20 shadow-sm transition-all duration-200"
        >
          {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
        </Button>
      </div>

      {/* Navigation with Groups */}
      <ScrollArea className="flex-1 py-4">
        <nav className="space-y-1 px-2">
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
                          variant={isActive ? "default" : "ghost"}
                          className={cn(
                            "w-full justify-center h-10 px-2 sidebar-transition",
                            isActive
                              ? "bg-fronteira-primary text-fronteira-primary-foreground hover:bg-fronteira-primary/90 shadow-sm"
                              : "text-fronteira-gray-500 hover:text-fronteira-primary hover:bg-fronteira-gray-50"
                          )}
                          title={item.name}
                        >
                          <item.icon className="h-4 w-4" />
                        </Button>
                      </Link>
                    )
                  })}
                </div>
              )
            }

            // Expanded sidebar with collapsible groups
            return (
              <div key={group.name} className="space-y-1">
                {/* Group Header - only show if group has more than 1 item */}
                {group.items.length > 1 ? (
                  <button
                    onClick={() => toggleGroup(group.name)}
                    className={cn(
                      "w-full flex items-center justify-between px-3 py-2 text-xs font-semibold uppercase tracking-wider rounded-md transition-colors",
                      groupActive
                        ? "text-fronteira-primary bg-fronteira-primary/5"
                        : "text-fronteira-gray-400 hover:text-fronteira-gray-600 hover:bg-fronteira-gray-50"
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

                {/* Group Items */}
                <div
                  className={cn(
                    "space-y-1 overflow-hidden transition-all duration-200",
                    group.items.length > 1 && !isExpanded ? "max-h-0 opacity-0" : "max-h-[500px] opacity-100",
                    group.items.length > 1 && "ml-2"
                  )}
                >
                  {group.items.map((item) => {
                    const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href + '/'))
                    return (
                      <Link key={item.name} href={item.href}>
                        <Button
                          variant={isActive ? "default" : "ghost"}
                          className={cn(
                            "w-full justify-start h-9 text-sm sidebar-transition",
                            isActive
                              ? "bg-fronteira-primary text-fronteira-primary-foreground hover:bg-fronteira-primary/90 shadow-sm"
                              : "text-fronteira-gray-500 hover:text-fronteira-primary hover:bg-fronteira-gray-50"
                          )}
                        >
                          <item.icon className="h-4 w-4 mr-3" />
                          <span className="sidebar-transition">{item.name}</span>
                        </Button>
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