import {
  BookOpen,
  BookText,
  Calendar,
  CheckSquare,
  ClipboardList,
  FileText,
  Home,
  Settings,
  School,
  User,
  UserCheck,
  UserCog,
  Users,
  type LucideIcon,
} from 'lucide-react'
import { isDemoSandboxPilotPathAllowed } from '@/lib/demo-sandbox/demo-sandbox'
import { isPilotDisabledPath, isPilotModeEnabled } from '@/lib/pilot/pilot-scope'

export interface AppNavigationItem {
  id: NavigationItemKey
  labelKey: NavigationItemKey
  href: string
  icon: LucideIcon
  roles: string[]
}

export interface AppNavigationGroup {
  id: NavigationGroupKey
  labelKey: NavigationGroupKey
  items: AppNavigationItem[]
  defaultOpen?: boolean
}

export type NavigationGroupKey = 'main' | 'registrations' | 'academic' | 'management'
export type NavigationItemKey = 'dashboard' | 'students' | 'users' | 'schools' | 'classes' | 'enrolments' | 'assignments' | 'guardians' | 'attendance' | 'classDiary' | 'grades' | 'calendar' | 'reports' | 'settings'

export const appNavigationGroups: AppNavigationGroup[] = [
  {
    id: 'main', labelKey: 'main',
    defaultOpen: true,
    items: [
      { id: 'dashboard', labelKey: 'dashboard', href: '/dashboard', icon: Home, roles: ['admin', 'diretor', 'secretario', 'professor'] },
    ],
  },
  {
    id: 'registrations', labelKey: 'registrations',
    defaultOpen: true,
    items: [
      { id: 'students', labelKey: 'students', href: '/dashboard/alunos', icon: Users, roles: ['admin', 'diretor', 'secretario'] },
      { id: 'users', labelKey: 'users', href: '/dashboard/usuarios', icon: User, roles: ['admin'] },
      { id: 'schools', labelKey: 'schools', href: '/dashboard/escolas', icon: School, roles: ['admin'] },
      { id: 'classes', labelKey: 'classes', href: '/dashboard/turmas', icon: BookOpen, roles: ['admin', 'diretor', 'secretario'] },
      { id: 'enrolments', labelKey: 'enrolments', href: '/dashboard/matriculas', icon: UserCheck, roles: ['admin', 'diretor', 'secretario'] },
      { id: 'assignments', labelKey: 'assignments', href: '/dashboard/atribuicoes', icon: UserCog, roles: ['admin', 'diretor'] },
      { id: 'guardians', labelKey: 'guardians', href: '/dashboard/responsaveis', icon: Users, roles: ['admin', 'diretor', 'secretario'] },
    ],
  },
  {
    id: 'academic', labelKey: 'academic',
    defaultOpen: true,
    items: [
      { id: 'attendance', labelKey: 'attendance', href: '/dashboard/turmas', icon: CheckSquare, roles: ['admin', 'diretor', 'secretario', 'professor'] },
      { id: 'classDiary', labelKey: 'classDiary', href: '/diario', icon: BookText, roles: ['admin', 'diretor', 'secretario', 'professor'] },
      { id: 'grades', labelKey: 'grades', href: '/dashboard/notas', icon: ClipboardList, roles: ['admin', 'diretor', 'secretario', 'professor'] },
      { id: 'calendar', labelKey: 'calendar', href: '/dashboard/calendario', icon: Calendar, roles: ['admin', 'diretor', 'secretario', 'professor'] },
    ],
  },
  {
    id: 'management', labelKey: 'management',
    defaultOpen: false,
    items: [
      { id: 'reports', labelKey: 'reports', href: '/dashboard/relatorios', icon: FileText, roles: ['admin', 'diretor', 'secretario'] },
      { id: 'settings', labelKey: 'settings', href: '/dashboard/configuracoes', icon: Settings, roles: ['diretor'] },
    ],
  },
]

export function getNavigationForRole(userRole: string): AppNavigationGroup[] {
  return appNavigationGroups
    .map(group => ({
      ...group,
      items: group.items.filter(item =>
        item.roles.includes(userRole) &&
        (!isPilotModeEnabled() ||
          !isPilotDisabledPath(item.href) ||
          isDemoSandboxPilotPathAllowed(item.href))
      ),
    }))
    .filter(group => group.items.length > 0)
}

export function isNavigationItemActive(pathname: string, item: AppNavigationItem) {
  return pathname === item.href ||
    (item.href !== '/dashboard' && pathname.startsWith(`${item.href}/`))
}

export function getActiveNavigationItemId(pathname: string, groups: AppNavigationGroup[]) {
  return groups.flatMap(group => group.items).find(item => isNavigationItemActive(pathname, item))?.id
}
