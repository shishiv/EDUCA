'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Separator } from '@/components/ui/separator'
import { MunicipalBrasao } from '@/components/identity/municipal-assets'
import { useNavigation } from './navigation-provider'
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
  Star,
  AlertCircle,
  Clock
} from 'lucide-react'

interface SidebarProps {
  className?: string
}

interface NavigationItem {
  name: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  badge?: string | number
  roles?: string[]
  isNew?: boolean
  description?: string
}

const navigationItems: NavigationItem[] = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: Home,
    description: 'Visão geral do sistema'
  },
  {
    name: 'Alunos',
    href: '/dashboard/alunos',
    icon: Users,
    description: 'Gerenciar estudantes matriculados'
  },
  {
    name: 'Usuários',
    href: '/dashboard/usuarios',
    icon: User,
    roles: ['admin', 'diretor'],
    description: 'Gerenciar usuários do sistema'
  },
  {
    name: 'Escolas',
    href: '/dashboard/escolas',
    icon: School,
    roles: ['admin'],
    description: 'Gerenciar unidades escolares'
  },
  {
    name: 'Turmas',
    href: '/dashboard/turmas',
    icon: GraduationCap,
    description: 'Gerenciar turmas e classes'
  },
  {
    name: 'Matrículas',
    href: '/dashboard/matriculas',
    icon: UserCheck,
    description: 'Processos de matrícula'
  },
  {
    name: 'Frequência',
    href: '/dashboard/frequencia',
    icon: CheckSquare,
    description: 'Controle de presença diária',
    badge: 'Crítico'
  },
  {
    name: 'Diário de Classe',
    href: '/dashboard/diario',
    icon: BookOpen,
    description: 'Histórico de aulas e frequência',
    isNew: true
  },
  {
    name: 'Notas',
    href: '/dashboard/notas',
    icon: ClipboardList,
    description: 'Lançamento de avaliações'
  },
  {
    name: 'Calendário',
    href: '/dashboard/calendario',
    icon: Calendar,
    description: 'Feriados e eventos escolares',
    isNew: true
  },
  {
    name: 'Relatórios',
    href: '/dashboard/relatorios',
    icon: FileText,
    description: 'Relatórios e estatísticas'
  },
  {
    name: 'Configurações',
    href: '/dashboard/configuracoes',
    icon: Settings,
    description: 'Configurações do sistema'
  },
]

export function EnhancedSidebar({ className }: SidebarProps) {
  const { sidebarCollapsed, setSidebarCollapsed, lastVisitedPages, addToRecentlyVisited } = useNavigation()
  const { userProfile } = useAuth()
  const pathname = usePathname()

  // Filter navigation items based on user role
  const filteredNavigation = navigationItems.filter(item => {
    if (!item.roles) return true
    return item.roles.includes(userProfile?.tipo_usuario || '')
  })

  const handleNavigation = (item: NavigationItem) => {
    addToRecentlyVisited({
      name: item.name,
      href: item.href,
      icon: item.icon
    })
  }

  const NavItem = ({ item }: { item: NavigationItem }) => {
    const isActive = pathname === item.href || pathname.startsWith(item.href + '/')

    const button = (
      <Button
        variant={isActive ? "default" : "ghost"}
        className={cn(
          "w-full justify-start h-11 sidebar-transition relative",
          sidebarCollapsed && "px-2",
          isActive
            ? "bg-fronteira-primary text-fronteira-primary-foreground hover:bg-fronteira-primary/90 shadow-sm"
            : "text-fronteira-gray-500 hover:text-fronteira-primary hover:bg-fronteira-gray-50"
        )}
        onClick={() => handleNavigation(item)}
      >
        <item.icon className={cn(
          "h-4 w-4 flex-shrink-0",
          !sidebarCollapsed && "mr-3"
        )} />
        {!sidebarCollapsed && (
          <>
            <span className="sidebar-transition flex-1 text-left">{item.name}</span>
            {item.badge && (
              <Badge
                variant={item.badge === 'Crítico' ? 'destructive' : 'secondary'}
                className="ml-auto text-xs"
              >
                {item.badge}
              </Badge>
            )}
            {item.isNew && (
              <Badge variant="default" className="ml-auto text-xs bg-green-500">
                Novo
              </Badge>
            )}
          </>
        )}
        {isActive && (
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-fronteira-primary rounded-r" />
        )}
      </Button>
    )

    if (sidebarCollapsed) {
      return (
        <Tooltip>
          <TooltipTrigger asChild>
            <Link href={item.href}>
              {button}
            </Link>
          </TooltipTrigger>
          <TooltipContent side="right" className="flex flex-col gap-1">
            <span className="font-medium">{item.name}</span>
            {item.description && (
              <span className="text-xs text-muted-foreground">{item.description}</span>
            )}
          </TooltipContent>
        </Tooltip>
      )
    }

    return (
      <Link href={item.href}>
        {button}
      </Link>
    )
  }

  return (
    <TooltipProvider>
      <div className={cn(
        "relative flex flex-col bg-white border-r border-fronteira-gray-100 sidebar-transition shadow-sm",
        sidebarCollapsed ? "w-16" : "w-64",
        className
      )}>
        {/* Municipal Header */}
        <div className="flex items-center justify-between p-4 border-b border-fronteira-gray-100 bg-gradient-to-r from-fronteira-primary/5 to-transparent">
          <div className={cn(
            "flex items-center space-x-3 sidebar-transition",
            sidebarCollapsed && "opacity-0 pointer-events-none"
          )}>
            {/* Municipal Brasão */}
            <div className="flex-shrink-0">
              <MunicipalBrasao size="sm" priority />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-fronteira-primary truncate">Sistema Escolar</h2>
              <p className="text-xs text-fronteira-gray-500 truncate">Prefeitura de Fronteira/MG</p>
            </div>
          </div>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="h-8 w-8 p-0 text-fronteira-gray-500 hover:text-fronteira-primary hover:bg-fronteira-gray-50 flex-shrink-0"
                aria-label={sidebarCollapsed ? 'Expandir sidebar' : 'Recolher sidebar'}
              >
                {sidebarCollapsed ? (
                  <ChevronRight className="h-4 w-4" />
                ) : (
                  <ChevronLeft className="h-4 w-4" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              {sidebarCollapsed ? 'Expandir menu' : 'Recolher menu'}
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Navigation */}
        <ScrollArea className="flex-1 p-4">
          <nav className="space-y-2">
            {/* Main Navigation */}
            <div className="space-y-1">
              {filteredNavigation.map((item) => (
                <NavItem key={item.href} item={item} />
              ))}
            </div>

            {/* Recently Visited - Only show when expanded and has items */}
            {!sidebarCollapsed && lastVisitedPages.length > 0 && (
              <>
                <Separator className="my-4" />
                <div className="space-y-2">
                  <div className="flex items-center gap-2 px-2">
                    <Clock className="h-3 w-3 text-fronteira-gray-400" />
                    <span className="text-xs font-medium text-fronteira-gray-400 uppercase tracking-wider">
                      Recentes
                    </span>
                  </div>
                  <div className="space-y-1">
                    {lastVisitedPages.slice(0, 3).map((page) => (
                      <Link key={page.href} href={page.href}>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full justify-start h-8 text-fronteira-gray-500 hover:text-fronteira-primary hover:bg-fronteira-gray-50"
                        >
                          {page.icon && <page.icon className="h-3 w-3 mr-2" />}
                          <span className="text-xs truncate">{page.name}</span>
                        </Button>
                      </Link>
                    ))}
                  </div>
                </div>
              </>
            )}
          </nav>
        </ScrollArea>

        {/* Footer with version info - Only when expanded */}
        {!sidebarCollapsed && (
          <div className="p-4 border-t border-fronteira-gray-100">
            <div className="text-xs text-fronteira-gray-400 text-center">
              <p>Gestão Fronteira v1.0</p>
              <p>Sistema Educacional</p>
            </div>
          </div>
        )}
      </div>
    </TooltipProvider>
  )
}