'use client';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  BookOpen,
  Search,
  Calendar,
  History,
  BarChart3,
  Settings,
  Users,
  BookPlus,
  Package,
  Clock,
  TrendingUp,
  BookmarkCheck,
  GraduationCap,
  FileText,
  Star
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { usePathname } from 'next/navigation';
import Link from 'next/link';

interface SidebarProps {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const studentNavItems = [
  {
    title: 'Dashboard',
    href: '/dashboard/student',
    icon: BarChart3,
  },
  {
    title: 'Catálogo de Livros',
    href: '/dashboard/student/catalog',
    icon: BookOpen,
  },
  {
    title: 'Pesquisar',
    href: '/dashboard/student/search',
    icon: Search,
  },
  {
    title: 'Minhas Reservas',
    href: '/dashboard/student/reservations',
    icon: Calendar,
    badge: '2',
  },
  {
    title: 'Histórico',
    href: '/dashboard/student/history',
    icon: History,
  },
  {
    title: 'Progresso de Leitura',
    href: '/dashboard/student/progress',
    icon: TrendingUp,
  },
];

const teacherNavItems = [
  {
    title: 'Dashboard',
    href: '/dashboard/teacher',
    icon: BarChart3,
  },
  {
    title: 'Catálogo de Livros',
    href: '/dashboard/teacher/catalog',
    icon: BookOpen,
  },
  {
    title: 'Recomendações',
    href: '/dashboard/teacher/recommendations',
    icon: Star,
  },
  {
    title: 'Listas de Leitura',
    href: '/dashboard/teacher/reading-lists',
    icon: FileText,
  },
  {
    title: 'Relatórios',
    href: '/dashboard/teacher/reports',
    icon: BarChart3,
  },
];

const librarianNavItems = [
  {
    title: 'Dashboard',
    href: '/dashboard/librarian',
    icon: BarChart3,
  },
  {
    section: 'Gestão de Livros',
  },
  {
    title: 'Catálogo',
    href: '/dashboard/librarian/catalog',
    icon: BookOpen,
  },
  {
    title: 'Adicionar Livro',
    href: '/dashboard/librarian/add-book',
    icon: BookPlus,
  },
  {
    title: 'Inventário',
    href: '/dashboard/librarian/inventory',
    icon: Package,
  },
  {
    section: 'Gestão de Usuários',
  },
  {
    title: 'Reservas',
    href: '/dashboard/librarian/reservations',
    icon: Calendar,
    badge: '8',
  },
  {
    title: 'Devoluções',
    href: '/dashboard/librarian/returns',
    icon: Clock,
    badge: '3',
  },
  {
    title: 'Usuários',
    href: '/dashboard/librarian/users',
    icon: Users,
  },
  {
    section: 'Relatórios',
  },
  {
    title: 'Relatórios',
    href: '/dashboard/librarian/reports',
    icon: BarChart3,
  },
];

export function Sidebar({ open, setOpen }: SidebarProps) {
  const { user } = useAuth();
  const pathname = usePathname();

  const getNavItems = () => {
    switch (user?.role) {
      case 'student':
        return studentNavItems;
      case 'teacher':
        return teacherNavItems;
      case 'librarian':
        return librarianNavItems;
      default:
        return [];
    }
  };

  const navItems = getNavItems();

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={cn(
          'fixed top-16 left-0 z-50 h-[calc(100vh-4rem)] w-64 transform bg-white border-r border-school-blue-200 transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 shadow-lg lg:shadow-none',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <ScrollArea className="h-full px-3 py-4">
          <div className="space-y-2">
            {navItems.map((item, index) => {
              if ('section' in item) {
                return (
                  <div key={index}>
                    <Separator className="my-3 bg-school-blue-200" />
                    <h4 className="mb-2 px-2 text-sm font-semibold text-school-blue-700">
                      {item.section}
                    </h4>
                  </div>
                );
              }

              const isActive = pathname === item.href;
              const Icon = item.icon;

              return (
                <Button
                  key={item.href}
                  variant={isActive ? 'secondary' : 'ghost'}
                  className={cn(
                    'w-full justify-start gap-2 transition-all duration-200',
                    isActive 
                      ? 'bg-school-blue-100 text-school-blue-800 border-l-4 border-school-blue-600 shadow-sm' 
                      : 'hover:bg-school-blue-50 text-school-blue-700 hover:text-school-blue-800'
                  )}
                  asChild
                >
                  <Link href={item.href} onClick={() => setOpen(false)}>
                    <Icon className="h-4 w-4" />
                    <span className="flex-1 text-left">{item.title}</span>
                    {item.badge && (
                      <Badge 
                        variant="secondary" 
                        className="ml-auto bg-school-red-100 text-school-red-700 hover:bg-school-red-200"
                      >
                        {item.badge}
                      </Badge>
                    )}
                  </Link>
                </Button>
              );
            })}
          </div>
        </ScrollArea>
      </div>
    </>
  );
}