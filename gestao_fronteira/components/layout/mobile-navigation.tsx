/**
 * Mobile Navigation Component
 * Bottom navigation bar for mobile devices with educational icons
 * Optimized for teacher and administrative staff quick access
 */

'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import {
  Home,
  Users,
  Calendar,
  FileText,
  User,
  Menu,
  X
} from 'lucide-react'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'

// Mobile navigation items optimized for educational workflow
const mobileNavItems = [
  {
    name: 'Início',
    href: '/dashboard',
    icon: Home,
    description: 'Dashboard principal'
  },
  {
    name: 'Alunos',
    href: '/dashboard/alunos',
    icon: Users,
    description: 'Gestão de alunos',
    badge: 'novo' // Example badge for new features
  },
  {
    name: 'Frequência',
    href: '/dashboard/frequencia',
    icon: Calendar,
    description: 'Marcar presença'
  },
  {
    name: 'Relatórios',
    href: '/dashboard/relatorios',
    icon: FileText,
    description: 'Relatórios'
  },
  {
    name: 'Perfil',
    href: '/dashboard/perfil',
    icon: User,
    description: 'Meu perfil'
  }
]

// Extended navigation items for sheet menu
const allNavItems = [
  ...mobileNavItems,
  {
    name: 'Escolas',
    href: '/dashboard/escolas',
    icon: Home,
    description: 'Gestão de escolas'
  },
  {
    name: 'Turmas',
    href: '/dashboard/turmas',
    icon: Users,
    description: 'Gestão de turmas'
  },
  {
    name: 'Matrículas',
    href: '/dashboard/matriculas',
    icon: FileText,
    description: 'Matrículas ativas'
  },
  {
    name: 'Notas',
    href: '/dashboard/notas',
    icon: Calendar,
    description: 'Lançamento de notas'
  },
  {
    name: 'Usuários',
    href: '/dashboard/usuarios',
    icon: User,
    description: 'Gestão de usuários'
  }
]

interface MobileNavigationProps {
  className?: string
}

export function MobileNavigation({ className }: MobileNavigationProps) {
  const pathname = usePathname()
  const [isSheetOpen, setIsSheetOpen] = useState(false)

  const isActivePath = (href: string) => {
    if (href === '/dashboard') {
      return pathname === '/dashboard'
    }
    return pathname.startsWith(href)
  }

  return (
    <>
      {/* Bottom Navigation Bar - Mobile Only */}
      <div className={cn(
        "fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 md:hidden",
        "safe-area-pb", // Safe area padding for devices with bottom notch
        className
      )}>
        <nav className="flex items-center justify-around px-2 py-2">
          {mobileNavItems.slice(0, 4).map((item) => {
            const isActive = isActivePath(item.href)
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex flex-col items-center justify-center p-2 rounded-lg transition-colors min-w-0 flex-1",
                  "min-h-[60px]", // Minimum touch target height
                  isActive
                    ? "text-primary bg-primary/10"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                )}
              >
                <div className="relative">
                  <item.icon className="h-5 w-5 mb-1" />
                  {item.badge && (
                    <Badge
                      variant="destructive"
                      className="absolute -top-2 -right-2 h-4 w-4 p-0 text-xs flex items-center justify-center"
                    >
                      •
                    </Badge>
                  )}
                </div>
                <span className="text-xs font-medium truncate w-full text-center">
                  {item.name}
                </span>
              </Link>
            )
          })}

          {/* More Menu Button */}
          <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                className={cn(
                  "flex flex-col items-center justify-center p-2 rounded-lg min-h-[60px] flex-1",
                  "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                )}
              >
                <Menu className="h-5 w-5 mb-1" />
                <span className="text-xs font-medium">Mais</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-[80vh] p-0">
              <div className="p-4 border-b">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">Menu Completo</h2>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsSheetOpen(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  Sistema Educacional - Fronteira/MG
                </p>
              </div>

              <ScrollArea className="flex-1 p-4">
                <div className="grid grid-cols-2 gap-3">
                  {allNavItems.map((item) => {
                    const isActive = isActivePath(item.href)
                    return (
                      <Link
                        key={item.name}
                        href={item.href}
                        onClick={() => setIsSheetOpen(false)}
                        className={cn(
                          "flex flex-col items-center p-4 rounded-lg border transition-colors",
                          "min-h-[80px]", // Large touch target
                          isActive
                            ? "border-primary bg-primary/5 text-primary"
                            : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                        )}
                      >
                        <div className="relative mb-2">
                          <item.icon className="h-6 w-6" />
                          {item.badge && (
                            <Badge
                              variant="destructive"
                              className="absolute -top-1 -right-1 h-4 w-4 p-0 text-xs flex items-center justify-center"
                            >
                              •
                            </Badge>
                          )}
                        </div>
                        <span className="text-sm font-medium text-center">
                          {item.name}
                        </span>
                        <span className="text-xs text-gray-500 text-center mt-1">
                          {item.description}
                        </span>
                      </Link>
                    )
                  })}
                </div>

                {/* Quick Actions Section */}
                <div className="mt-6 pt-6 border-t">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Ações Rápidas</h3>
                  <div className="space-y-2">
                    <Link
                      href="/dashboard/alunos/novo"
                      onClick={() => setIsSheetOpen(false)}
                      className="flex items-center p-3 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors"
                    >
                      <Users className="h-5 w-5 mr-3" />
                      <div>
                        <div className="font-medium">Novo Aluno</div>
                        <div className="text-sm opacity-90">Cadastrar aluno</div>
                      </div>
                    </Link>
                    <Link
                      href="/dashboard/frequencia"
                      onClick={() => setIsSheetOpen(false)}
                      className="flex items-center p-3 rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors"
                    >
                      <Calendar className="h-5 w-5 mr-3" />
                      <div>
                        <div className="font-medium">Marcar Frequência</div>
                        <div className="text-sm opacity-90">Lançar presença</div>
                      </div>
                    </Link>
                  </div>
                </div>
              </ScrollArea>
            </SheetContent>
          </Sheet>
        </nav>
      </div>

      {/* Bottom padding to prevent content from hiding behind nav */}
      <div className="h-16 md:hidden" />
    </>
  )
}

/**
 * Mobile Header Component
 * Top header for mobile devices with title and basic actions
 */
interface MobileHeaderProps {
  title?: string
  subtitle?: string
  actions?: React.ReactNode
  className?: string
}

export function MobileHeader({
  title = "Sistema Escolar",
  subtitle = "Fronteira/MG",
  actions,
  className
}: MobileHeaderProps) {
  return (
    <div className={cn(
      "sticky top-0 z-30 bg-white border-b border-gray-200 px-4 py-3 md:hidden",
      "safe-area-pt", // Safe area padding for devices with top notch
      className
    )}>
      <div className="flex items-center justify-between">
        <div className="min-w-0 flex-1">
          <h1 className="text-lg font-semibold text-gray-900 truncate">
            {title}
          </h1>
          {subtitle && (
            <p className="text-sm text-gray-600 truncate">
              {subtitle}
            </p>
          )}
        </div>
        {actions && (
          <div className="flex items-center space-x-2 ml-3">
            {actions}
          </div>
        )}
      </div>
    </div>
  )
}

export { MobileNavigation, MobileHeader }