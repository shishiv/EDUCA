import { Settings, UserPlus, FileText, CheckSquare, Building2, BarChart3, GraduationCap, BookText, LucideIcon } from 'lucide-react'
import { isPilotDisabledPath } from '@/lib/pilot/pilot-scope'
import { resolveDemoSandboxCapability } from '@/lib/demo-sandbox/demo-sandbox'

// Generic attendance entry. A class-specific call lives at /dashboard/turmas/[id]/chamada.
export const ATTENDANCE_ROUTE = '/dashboard/turmas'

export type QuickAccessRole = 'admin' | 'diretor' | 'secretario' | 'professor' | 'responsavel'

export interface QuickAccessItem {
  name: string
  href: string
  icon: LucideIcon
  iconColor: string
  roles: QuickAccessRole[]
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
  { name: 'Novo Aluno', href: '/dashboard/alunos/novo', icon: UserPlus, iconColor: 'text-blue-600', roles: ['admin', 'diretor', 'secretario'], pilotRoles: ['diretor'], schoolWrite: true },
  { name: 'Matrícula', href: '/dashboard/matriculas/nova', icon: FileText, iconColor: 'text-emerald-600', roles: ['admin', 'diretor', 'secretario'], schoolWrite: true },
  { name: 'Frequência', href: ATTENDANCE_ROUTE, icon: CheckSquare, iconColor: 'text-amber-600', roles: ['admin', 'diretor', 'secretario', 'professor'] },
  { name: 'Diário de Classe', href: '/dashboard/diario', icon: BookText, iconColor: 'text-indigo-600', roles: ['admin', 'diretor', 'secretario', 'professor'] },
  { name: 'Nova Turma', href: '/dashboard/turmas/nova', icon: Building2, iconColor: 'text-violet-600', roles: ['admin', 'diretor', 'secretario'], schoolWrite: true },
  { name: 'Relatórios', href: '/dashboard/relatorios', icon: BarChart3, iconColor: 'text-rose-600', roles: ['admin', 'diretor', 'secretario'] },
  { name: 'Config', href: '/dashboard/configuracoes', icon: Settings, iconColor: 'text-slate-600', roles: ['admin', 'diretor'] },
]

export const defaultQuickActionCards: QuickActionCard[] = [
  { name: 'Nova Chamada', href: ATTENDANCE_ROUTE, icon: CheckSquare, iconColor: 'text-amber-600' },
  { name: 'Lancar Notas', href: '/dashboard/notas', icon: GraduationCap, iconColor: 'text-violet-600' },
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
      const roles = pilotMode && !demoSandbox && item.pilotRoles ? item.pilotRoles : item.roles
      if (!roles.includes(role)) return false

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
