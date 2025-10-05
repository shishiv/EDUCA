'use client'

import { useState } from 'react'
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
  Home,
  FileText,
  User,
  BookOpen,
  CheckSquare,
  BookText
} from 'lucide-react'

interface SidebarProps {
  className?: string
}

// Define menu items with role permissions
const navigationItems = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: Home,
    roles: ['admin', 'diretor', 'secretario', 'professor'], // Todos podem ver
  },
  {
    name: 'Alunos',
    href: '/dashboard/alunos',
    icon: Users,
    roles: ['admin', 'diretor', 'secretario'], // Professor não gerencia alunos diretamente
  },
  {
    name: 'Usuários',
    href: '/dashboard/usuarios',
    icon: User,
    roles: ['admin'], // Apenas admin gerencia usuários
  },
  {
    name: 'Escolas',
    href: '/dashboard/escolas',
    icon: School,
    roles: ['admin'], // Apenas admin gerencia escolas
  },
  {
    name: 'Turmas',
    href: '/dashboard/turmas',
    icon: BookOpen,
    roles: ['admin', 'diretor', 'secretario'], // Professor vê apenas suas turmas
  },
  {
    name: 'Matrículas',
    href: '/dashboard/matriculas',
    icon: UserCheck,
    roles: ['admin', 'diretor', 'secretario'], // Professor não gerencia matrículas
  },
  {
    name: 'Frequência',
    href: '/dashboard/frequencia',
    icon: CheckSquare,
    roles: ['admin', 'diretor', 'secretario', 'professor'], // Todos trabalham com frequência
  },
  {
    name: 'Diário de Classe',
    href: '/dashboard/diario',
    icon: BookText,
    roles: ['admin', 'diretor', 'secretario', 'professor'], // Todos podem visualizar o diário
  },
  {
    name: 'Notas',
    href: '/dashboard/notas',
    icon: ClipboardList,
    roles: ['admin', 'diretor', 'secretario', 'professor'], // Todos trabalham com notas
  },
  {
    name: 'Relatórios',
    href: '/dashboard/relatorios',
    icon: FileText,
    roles: ['admin', 'diretor', 'secretario'], // Professor tem relatórios limitados
  },
  {
    name: 'Configurações',
    href: '/dashboard/configuracoes',
    icon: Settings,
    roles: ['admin', 'diretor'], // Apenas admin e diretor configuram
  },
]

// Filter navigation based on user role
function getNavigationForRole(userRole: string) {
  return navigationItems.filter(item => item.roles.includes(userRole))
}

export function Sidebar({ className }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false)
  const pathname = usePathname()
  const { userProfile } = useAuth()

  // Get navigation items based on user role
  const navigation = userProfile ? getNavigationForRole(userProfile.tipo_usuario) : []

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

      {/* Subtle side expand button when collapsed */}
      {collapsed && (
        <div className="absolute top-1/2 -right-3 transform -translate-y-1/2 z-20">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCollapsed(!collapsed)}
            className="h-6 w-6 p-0 rounded-full bg-white border border-fronteira-gray-200 text-fronteira-gray-400 hover:text-fronteira-primary hover:bg-fronteira-primary/5 hover:border-fronteira-primary/20 shadow-sm transition-all duration-200"
          >
            <ChevronRight className="h-3 w-3" />
          </Button>
        </div>
      )}

      {/* Subtle side collapse button when expanded */}
      {!collapsed && (
        <div className="absolute top-1/2 -right-3 transform -translate-y-1/2 z-20">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCollapsed(!collapsed)}
            className="h-6 w-6 p-0 rounded-full bg-white border border-fronteira-gray-200 text-fronteira-gray-400 hover:text-fronteira-primary hover:bg-fronteira-primary/5 hover:border-fronteira-primary/20 shadow-sm transition-all duration-200"
          >
            <ChevronLeft className="h-3 w-3" />
          </Button>
        </div>
      )}

      {/* Navigation */}
      <ScrollArea className="flex-1 p-4">
        <nav className="space-y-2">
          {navigation.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href + '/'))
            return (
              <Link key={item.name} href={item.href}>
                <Button
                  variant={isActive ? "default" : "ghost"}
                  className={cn(
                    "w-full justify-start h-10 sidebar-transition",
                    collapsed && "px-2",
                    isActive
                      ? "bg-fronteira-primary text-fronteira-primary-foreground hover:bg-fronteira-primary/90 shadow-sm"
                      : "text-fronteira-gray-500 hover:text-fronteira-primary hover:bg-fronteira-gray-50"
                  )}
                >
                  <item.icon className={cn(
                    "h-4 w-4",
                    !collapsed && "mr-3"
                  )} />
                  {!collapsed && (
                    <span className="sidebar-transition">{item.name}</span>
                  )}
                </Button>
              </Link>
            )
          })}
        </nav>
      </ScrollArea>
    </div>
  )
}