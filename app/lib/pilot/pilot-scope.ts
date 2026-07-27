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
