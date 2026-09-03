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
import { canAccessRoute, type RouteRole } from '@/lib/route-policy'

export interface AppNavigationItem {
  id: NavigationItemKey
  labelKey: NavigationItemKey
  href: string
  icon: LucideIcon
  hiddenForRoles?: RouteRole[]
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
      { id: 'dashboard', labelKey: 'dashboard', href: '/dashboard', icon: Home },
    ],
  },
  {
    id: 'registrations', labelKey: 'registrations',
    defaultOpen: true,
    items: [
      { id: 'students', labelKey: 'students', href: '/dashboard/alunos', icon: Users },
      { id: 'users', labelKey: 'users', href: '/dashboard/usuarios', icon: User },
      { id: 'schools', labelKey: 'schools', href: '/dashboard/escolas', icon: School },
      { id: 'classes', labelKey: 'classes', href: '/dashboard/turmas', icon: BookOpen, hiddenForRoles: ['professor'] },
      { id: 'enrolments', labelKey: 'enrolments', href: '/dashboard/matriculas', icon: UserCheck },
      { id: 'assignments', labelKey: 'assignments', href: '/dashboard/atribuicoes', icon: UserCog },
      { id: 'guardians', labelKey: 'guardians', href: '/dashboard/responsaveis', icon: Users },
    ],
  },
  {
    id: 'academic', labelKey: 'academic',
    defaultOpen: true,
    items: [
      { id: 'attendance', labelKey: 'attendance', href: '/dashboard/turmas', icon: CheckSquare },
      { id: 'classDiary', labelKey: 'classDiary', href: '/diario', icon: BookText },
      { id: 'grades', labelKey: 'grades', href: '/dashboard/notas', icon: ClipboardList },
      { id: 'calendar', labelKey: 'calendar', href: '/dashboard/calendario', icon: Calendar },
    ],
  },
  {
    id: 'management', labelKey: 'management',
    defaultOpen: false,
    items: [
      { id: 'reports', labelKey: 'reports', href: '/dashboard/relatorios', icon: FileText },
      { id: 'settings', labelKey: 'settings', href: '/dashboard/configuracoes', icon: Settings },
    ],
  },
]

export function getNavigationForRole(userRole: string): AppNavigationGroup[] {
  return appNavigationGroups
    .map(group => ({
      ...group,
      items: group.items.filter(item =>
        canAccessRoute(item.href, userRole) &&
        !item.hiddenForRoles?.includes(userRole as RouteRole) &&
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
