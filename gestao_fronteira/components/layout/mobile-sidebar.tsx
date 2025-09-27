'use client'

import { Fragment } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Dialog, Transition } from '@headlessui/react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { MunicipalBrasao } from '@/components/identity/municipal-assets'
import {
  GraduationCap,
  Users,
  School,
  UserCheck,
  Calendar,
  ClipboardList,
  BarChart3,
  Settings,
  Home,
  FileText,
  User,
  BookOpen,
  CheckSquare,
  X
} from 'lucide-react'

interface MobileSidebarProps {
  isOpen: boolean
  onClose: () => void
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

export function MobileSidebar({ isOpen, onClose }: MobileSidebarProps) {
  const pathname = usePathname()

  return (
    <Transition.Root show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50 md:hidden" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="transition-opacity ease-linear duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="transition-opacity ease-linear duration-300"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-gray-900/80" />
        </Transition.Child>

        <div className="fixed inset-0 flex">
          <Transition.Child
            as={Fragment}
            enter="transition ease-in-out duration-300 transform"
            enterFrom="-translate-x-full"
            enterTo="translate-x-0"
            leave="transition ease-in-out duration-300 transform"
            leaveFrom="translate-x-0"
            leaveTo="-translate-x-full"
          >
            <Dialog.Panel className="relative mr-16 flex w-full max-w-xs flex-1">
              <Transition.Child
                as={Fragment}
                enter="ease-in-out duration-300"
                enterFrom="opacity-0"
                enterTo="opacity-100"
                leave="ease-in-out duration-300"
                leaveFrom="opacity-100"
                leaveTo="opacity-0"
              >
                <div className="absolute left-full top-0 flex w-16 justify-center pt-5">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onClose}
                    className="-m-2.5 p-2.5 text-white hover:text-white hover:bg-white/20"
                  >
                    <span className="sr-only">Fechar sidebar</span>
                    <X className="h-6 w-6" aria-hidden="true" />
                  </Button>
                </div>
              </Transition.Child>

              {/* Mobile sidebar content */}
              <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-white px-6 pb-4">
                {/* Municipal Header */}
                <div className="flex items-center justify-between py-4 border-b border-fronteira-gray-100">
                  <div className="flex items-center space-x-3">
                    {/* Municipal Brasão */}
                    <div className="flex-shrink-0">
                      <MunicipalBrasao size="sm" priority />
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-fronteira-primary">Sistema Escolar</h2>
                      <p className="text-xs text-fronteira-gray-500">Prefeitura de Fronteira/MG</p>
                    </div>
                  </div>
                </div>

                {/* Navigation */}
                <nav className="flex flex-1 flex-col">
                  <ul role="list" className="flex flex-1 flex-col gap-y-7">
                    <li>
                      <ul role="list" className="-mx-2 space-y-1">
                        {navigation.map((item) => {
                          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
                          return (
                            <li key={item.name}>
                              <Link
                                href={item.href}
                                onClick={onClose} // Close menu when navigation item is clicked
                                className={cn(
                                  isActive
                                    ? 'bg-fronteira-primary text-white shadow-sm'
                                    : 'text-fronteira-gray-500 hover:text-fronteira-primary hover:bg-fronteira-gray-50',
                                  'group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-medium'
                                )}
                              >
                                <item.icon
                                  className={cn(
                                    isActive
                                      ? 'text-white'
                                      : 'text-fronteira-gray-500 group-hover:text-fronteira-primary',
                                    'h-5 w-5 shrink-0'
                                  )}
                                  aria-hidden="true"
                                />
                                {item.name}
                              </Link>
                            </li>
                          )
                        })}
                      </ul>
                    </li>
                  </ul>
                </nav>
              </div>
            </Dialog.Panel>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition.Root>
  )
}