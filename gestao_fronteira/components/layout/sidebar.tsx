'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
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
  CheckSquare
} from 'lucide-react'

interface SidebarProps {
  className?: string
}

const navigation = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: Home,
  },
  {
    name: 'Alunos',
    href: '/dashboard/alunos',
    icon: Users,
  },
  {
    name: 'Usuários',
    href: '/dashboard/usuarios',
    icon: User,
  },
  {
    name: 'Escolas',
    href: '/dashboard/escolas',
    icon: School,
  },
  {
    name: 'Turmas',
    href: '/dashboard/turmas',
    icon: BookOpen,
  },
  {
    name: 'Matrículas',
    href: '/dashboard/matriculas',
    icon: UserCheck,
  },
  {
    name: 'Frequência',
    href: '/dashboard/frequencia',
    icon: CheckSquare,
  },
  {
    name: 'Notas',
    href: '/dashboard/notas',
    icon: ClipboardList,
  },
  {
    name: 'Relatórios',
    href: '/dashboard/relatorios',
    icon: FileText,
  },
  {
    name: 'Configurações',
    href: '/dashboard/configuracoes',
    icon: Settings,
  },
]

export function Sidebar({ className }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false)
  const pathname = usePathname()

  return (
    <div className={cn(
      "relative flex flex-col bg-white border-r border-gray-200 sidebar-transition",
      collapsed ? "w-16" : "w-64",
      className
    )}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className={cn(
          "flex items-center space-x-3 sidebar-transition",
          collapsed && "opacity-0"
        )}>
          <div className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center">
            <GraduationCap className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-gray-900">Sistema Escolar</h2>
            <p className="text-xs text-gray-500">Fronteira/MG</p>
          </div>
        </div>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCollapsed(!collapsed)}
          className="h-8 w-8 p-0"
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 p-4">
        <nav className="space-y-2">
          {navigation.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <Link key={item.name} href={item.href}>
                <Button
                  variant={isActive ? "default" : "ghost"}
                  className={cn(
                    "w-full justify-start h-10 sidebar-transition",
                    collapsed && "px-2",
                    isActive && "bg-primary text-white hover:bg-primary/90"
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