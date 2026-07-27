/** Pilot feature groups allowed by the confirmed 90-day core scope. */
export const PILOT_CORE_FEATURES = [
  'auth',
  'schools',
  'users',
  'students',
  'classes',
  'enrollments',
  'guardians',
  'teacher_assignments',
  'attendance',
  'dashboard',
] as const

export const PILOT_DISABLED_ROUTE_PREFIXES = [
  '/dashboard/notas',
  '/dashboard/diario',
  '/dashboard/relatorios',
  '/dashboard/calendario',
  '/dashboard/configuracoes',
  '/dashboard/sessoes',
  '/relatorios',
  '/relatorios/bolsa-familia',
  '/relatorios/conteudo',
  '/dashboard/flags',
  '/offline',
  '/api/grades',
  '/api/reports/bolsa-familia',
  '/api/reports',
  '/api/configs',
  '/api/educacenso',
] as const

const PILOT_DISABLED_ROUTE_FRAGMENTS = ['/diario', '/boletim'] as const

/** Returns true when the path is in a disabled pilot module. */
export function isPilotDisabledPath(pathname: string): boolean {
  if (pathname === '/diario/frequencia' || pathname.startsWith('/api/frequencia')) {
    return false
  }

  return PILOT_DISABLED_ROUTE_PREFIXES.some(prefix =>
    pathname === prefix || pathname.startsWith(`${prefix}/`)
  ) || PILOT_DISABLED_ROUTE_FRAGMENTS.some(fragment => pathname.includes(fragment))
}

/** Pilot mode is explicit so the full OSS build can remain available outside a municipal pilot. */
export function isPilotModeEnabled(): boolean {
  return process.env.NEXT_PUBLIC_PILOT_MODE === 'true' || process.env.PILOT_MODE === 'true'
}

export interface PilotScopedProfile {
  tipo_usuario: string | null
  escola_id: string | null
}

/**
 * Mirrors the `pilot_can_manage_school` RLS predicate for the caller's own
 * school so the UI never offers a write the database will reject: municipal
 * secretariat (`escola_id IS NULL`) or the director of that school.
 */
export function canManagePilotSchool(profile: PilotScopedProfile | null | undefined): boolean {
  if (!profile) return false
  if (profile.tipo_usuario === 'diretor') return profile.escola_id !== null
  return (profile.tipo_usuario === 'admin' || profile.tipo_usuario === 'secretario') && profile.escola_id === null
}
