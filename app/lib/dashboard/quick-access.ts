import { Settings, UserPlus, FileText, CheckSquare, Building2, BarChart3, GraduationCap, BookText, LucideIcon } from 'lucide-react'
import { isPilotDisabledPath } from '@/lib/pilot/pilot-scope'
import { resolveDemoSandboxCapability } from '@/lib/demo-sandbox/demo-sandbox'
import { canAccessRoute, type RouteRole } from '@/lib/route-policy'

// Generic attendance entry. A class-specific call lives at /dashboard/turmas/[id]/chamada.
export const ATTENDANCE_ROUTE = '/dashboard/turmas'

export type QuickAccessRole = RouteRole

export interface QuickAccessItem {
  name: string
  labelKey: 'newStudent' | 'enrollment' | 'attendance' | 'classDiary' | 'newClass' | 'reports' | 'settings'
  href: string
  icon: LucideIcon
  iconColor: string
  pilotHref?: string
  pilotRoles?: QuickAccessRole[]
  schoolWrite?: boolean
}

export interface QuickActionCard {
  name: string
  href: string
  icon: LucideIcon
  iconColor: string
  schoolWrite?: boolean
}

export const quickAccessItems: QuickAccessItem[] = [
  { name: 'Novo Aluno', labelKey: 'newStudent', href: '/dashboard/alunos/novo', icon: UserPlus, iconColor: 'text-blue-600', pilotRoles: ['diretor'], schoolWrite: true },
  { name: 'Matrícula', labelKey: 'enrollment', href: '/dashboard/matriculas/nova', icon: FileText, iconColor: 'text-emerald-600', schoolWrite: true },
  { name: 'Frequência', labelKey: 'attendance', href: ATTENDANCE_ROUTE, icon: CheckSquare, iconColor: 'text-amber-600' },
  { name: 'Diário de Classe', labelKey: 'classDiary', href: '/diario', icon: BookText, iconColor: 'text-indigo-600' },
  { name: 'Nova Turma', labelKey: 'newClass', href: '/dashboard/turmas/nova', icon: Building2, iconColor: 'text-violet-600', schoolWrite: true },
  { name: 'Relatórios', labelKey: 'reports', href: '/dashboard/relatorios', icon: BarChart3, iconColor: 'text-rose-600' },
  { name: 'Config', labelKey: 'settings', href: '/dashboard/configuracoes', icon: Settings, iconColor: 'text-slate-600' },
]

export const defaultQuickActionCards: QuickActionCard[] = [
  { name: 'Nova Chamada', href: ATTENDANCE_ROUTE, icon: CheckSquare, iconColor: 'text-amber-600' },
  { name: 'Lançar Notas', href: '/dashboard/notas', icon: GraduationCap, iconColor: 'text-violet-600' },
  { name: 'Ver Relatorios', href: '/dashboard/relatorios', icon: BarChart3, iconColor: 'text-rose-600' },
  { name: 'Cadastrar Aluno', href: '/dashboard/alunos/novo', icon: UserPlus, iconColor: 'text-blue-600', schoolWrite: true },
]

export const pilotQuickActionCards: QuickActionCard[] = [
  { name: 'Nova Chamada', href: ATTENDANCE_ROUTE, icon: CheckSquare, iconColor: 'text-amber-600' },
  { name: 'Ver Turmas', href: '/dashboard/turmas', icon: GraduationCap, iconColor: 'text-violet-600' },
  { name: 'Ver Matriculas', href: '/dashboard/matriculas', icon: BarChart3, iconColor: 'text-rose-600' },
  { name: 'Cadastrar Aluno', href: '/dashboard/alunos/novo', icon: UserPlus, iconColor: 'text-blue-600', schoolWrite: true },
]

export interface QuickAccessContext {
  role: QuickAccessRole | null
  pilotMode: boolean
  canManageSchool: boolean
  /** Exposes safe synthetic capabilities without widening role or school checks. */
  demoSandbox?: boolean
}

export function resolveVisibleQuickAccess(
  items: QuickAccessItem[],
  { role, pilotMode, canManageSchool, demoSandbox = false }: QuickAccessContext
): QuickAccessItem[] {
  return items
    .map((item) => ({
      ...item,
      href: pilotMode && !demoSandbox && item.pilotHref ? item.pilotHref : item.href,
    }))
    .filter((item) => {
      if (!role) return false
      if (!canAccessRoute(item.href, role)) return false
      if (pilotMode && !demoSandbox && item.pilotRoles && !item.pilotRoles.includes(role)) return false

      const pilotPathIsAllowed = demoSandbox && resolveDemoSandboxCapability(item.href) !== null
      if (pilotMode && isPilotDisabledPath(item.href) && !pilotPathIsAllowed) return false
      return !item.schoolWrite || canManageSchool
    })
}

export function resolveVisibleQuickActionCards(
  pilotMode: boolean,
  canManageSchool: boolean,
  demoSandbox = false
): QuickActionCard[] {
  return (pilotMode && !demoSandbox ? pilotQuickActionCards : defaultQuickActionCards)
    .filter((card) => {
      if (!pilotMode || !isPilotDisabledPath(card.href)) return true
      return demoSandbox && resolveDemoSandboxCapability(card.href) !== null
    })
    .filter((card) => !card.schoolWrite || canManageSchool)
}
