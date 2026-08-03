/**
 * Runtime policy for the EDUCA public demo sandbox (issue #23).
 *
 * The demo is a synthetic-data instance. It can expose product capabilities
 * that the narrower municipal pilot hides, but only through explicit route
 * rules. Authentication, role checks, school context, RLS and audit remain
 * owned by the normal application and database boundaries.
 *
 * This is separate from the session-scoped attendance demo mode in
 * `contexts/demo-mode-context.tsx`: that flag never changes authorization.
 */

import { NextResponse } from 'next/server'

/** Env flag that switches the instance into public demo sandbox mode. */
export const DEMO_SANDBOX_ENV_KEY = 'NEXT_PUBLIC_DEMO_SANDBOX'

/** Marker written by the deterministic demo seed and checked by validation. */
export const DEMO_SYNTHETIC_DATA_MARKER = 'SYNTHETIC-EDUCA-DEMO'

/** Config key that carries the synthetic demo marker in the database. */
export const DEMO_SYNTHETIC_MARKER_CONFIG_KEY = 'demo_synthetic_marker'

/** Returns true only for an explicit public demo sandbox flag. */
export function isDemoSandboxEnabled(
  env: Record<string, string | undefined> = process.env
): boolean {
  return env[DEMO_SANDBOX_ENV_KEY] === 'true' || env.DEMO_SANDBOX === 'true'
}

/**
 * A product capability that the public demo may expose over synthetic rows.
 * Route rules are intentionally explicit instead of falling back to all paths.
 */
export const DEMO_SANDBOX_CAPABILITIES = [
  {
    id: 'dashboard',
    label: 'Dashboard, alertas, busca e indicadores',
    exactRoutePaths: ['/dashboard'],
    routePrefixes: [],
    apiPrefixes: [
      '/api/attendance',
      '/api/chamada',
      '/api/compliance',
      '/api/dashboard',
      '/api/health',
      '/api/search',
      '/api/turmas',
    ],
  },
  {
    id: 'schools',
    label: 'Escolas e contexto multi-escola',
    routePrefixes: ['/dashboard/escolas'],
    apiPrefixes: [],
  },
  {
    id: 'users',
    label: 'Usuários existentes e permissões',
    routePrefixes: ['/dashboard/usuarios'],
    apiPrefixes: [],
  },
  {
    id: 'students',
    label: 'Alunos e dados sintéticos de cadastro',
    routePrefixes: ['/dashboard/alunos'],
    apiPrefixes: [],
  },
  {
    id: 'classes',
    label: 'Turmas',
    routePrefixes: ['/dashboard/turmas'],
    apiPrefixes: [],
  },
  {
    id: 'enrollments',
    label: 'Matrículas',
    routePrefixes: ['/dashboard/matriculas'],
    apiPrefixes: [],
  },
  {
    id: 'guardians',
    label: 'Responsáveis',
    routePrefixes: ['/dashboard/responsaveis'],
    apiPrefixes: [],
  },
  {
    id: 'teacher-assignments',
    label: 'Atribuições de professores',
    routePrefixes: ['/dashboard/atribuicoes'],
    apiPrefixes: [],
  },
  {
    id: 'attendance',
    label: 'Frequência e sessões de aula',
    routePrefixes: ['/diario/frequencia', '/dashboard/sessoes'],
    apiPrefixes: ['/api/frequencia', '/api/sessoes'],
  },
  {
    id: 'diary',
    label: 'Diário de classe',
    routePrefixes: ['/dashboard/diario', '/diario'],
    apiPrefixes: ['/api/vivencias'],
  },
  {
    id: 'grades',
    label: 'Notas e boletins',
    routePrefixes: ['/dashboard/notas'],
    apiPrefixes: ['/api/grades'],
  },
  {
    id: 'reports',
    label: 'Relatórios sobre dados sintéticos',
    routePrefixes: ['/dashboard/relatorios', '/relatorios'],
    apiPrefixes: ['/api/reports'],
  },
  {
    id: 'calendar',
    label: 'Calendário escolar',
    routePrefixes: ['/dashboard/calendario'],
    apiPrefixes: [],
  },
  {
    id: 'settings',
    label: 'Configurações e flags internas',
    routePrefixes: ['/dashboard/configuracoes', '/dashboard/flags'],
    apiPrefixes: ['/api/configs'],
  },
  {
    id: 'profile',
    label: 'Perfil autenticado',
    routePrefixes: ['/dashboard/perfil'],
    apiPrefixes: [],
  },
  {
    id: 'audit-and-metrics',
    label: 'Auditoria e métricas internas',
    routePrefixes: [],
    apiPrefixes: ['/api/pilot/audit', '/api/pilot/metrics'],
  },
  {
    id: 'whatsapp-local',
    label: 'Simulação local de notificação',
    routePrefixes: [],
    apiPrefixes: ['/api/whatsapp/notify', '/api/whatsapp/opt-in'],
  },
] as const

export type DemoSandboxCapability = typeof DEMO_SANDBOX_CAPABILITIES[number]['id']

/** Effects that never run from the public demo, even with synthetic input. */
export const DEMO_SANDBOX_BLOCKED_EFFECTS = [
  'auth_invitation',
  'synthetic_import',
  'educacenso_export',
  'government_integration',
  'real_whatsapp_delivery',
  'real_pii_export',
] as const

export type DemoSandboxBlockedReason =
  | 'auth_mutation'
  | 'dataset_ingest'
  | 'external_effect'

/** API prefixes for operations that must not run in the shared demo. */
export const DEMO_SANDBOX_BLOCKED_API_PREFIXES = [
  '/api/pilot/imports',
  '/api/pilot/invitations',
  '/api/pilot/first-access',
  '/api/educacenso',
  '/api/government',
  '/api/integracoes',
  '/api/export',
  '/api/exports',
  '/api/censo',
  '/api/inep',
  '/api/reports/educacenso',
  '/api/reports/export',
  '/api/whatsapp/webhook',
] as const

/** Page prefixes for government exports and other external integrations. */
export const DEMO_SANDBOX_BLOCKED_ROUTE_PREFIXES = [
  '/dashboard/educacenso',
  '/dashboard/relatorios/educacenso',
  '/relatorios/educacenso',
  '/educacenso',
  '/integracoes',
  '/dashboard/integracoes',
  '/dashboard/configuracoes/integracoes',
] as const

function matchesPathPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`)
}

/** Returns the block reason for a path, or null when the path is not blocked. */
export function getDemoSandboxBlockedReason(
  pathname: string
): DemoSandboxBlockedReason | null {
  if (DEMO_SANDBOX_BLOCKED_API_PREFIXES.some(prefix => matchesPathPrefix(pathname, prefix))) {
    if (pathname.startsWith('/api/pilot/imports')) return 'dataset_ingest'
    if (pathname.startsWith('/api/pilot/invitations') || pathname.startsWith('/api/pilot/first-access')) {
      return 'auth_mutation'
    }
    return 'external_effect'
  }

  if (DEMO_SANDBOX_BLOCKED_ROUTE_PREFIXES.some(prefix => matchesPathPrefix(pathname, prefix))) {
    return 'external_effect'
  }

  return null
}

/** Returns true when the path is one of the explicitly blocked demo APIs. */
export function isDemoSandboxBlockedApiPath(pathname: string): boolean {
  return DEMO_SANDBOX_BLOCKED_API_PREFIXES.some(prefix => matchesPathPrefix(pathname, prefix))
}

/**
 * Resolves a path to a named demo capability. Blocked effects win before any
 * capability match, so a future broad report route cannot expose Educacenso.
 */
export function resolveDemoSandboxCapability(
  pathname: string
): DemoSandboxCapability | null {
  if (getDemoSandboxBlockedReason(pathname)) return null

  for (const capability of DEMO_SANDBOX_CAPABILITIES) {
    if (
      ('exactRoutePaths' in capability && capability.exactRoutePaths.some(path => path === pathname)) ||
      capability.routePrefixes.some(prefix => matchesPathPrefix(pathname, prefix)) ||
      capability.apiPrefixes.some(prefix => matchesPathPrefix(pathname, prefix))
    ) {
      return capability.id
    }
  }

  return null
}

/** Returns true when a named route or API is safe to expose in demo mode. */
export function isDemoSandboxCapabilityAllowed(
  pathname: string,
  env: Record<string, string | undefined> = process.env
): boolean {
  return isDemoSandboxEnabled(env) && resolveDemoSandboxCapability(pathname) !== null
}

/**
 * Returns true only for an explicitly listed pilot-disabled capability. This
 * is the narrow scope exception used by middleware and navigation, not a
 * global demo bypass.
 */
export function isDemoSandboxPilotPathAllowed(
  pathname: string,
  env: Record<string, string | undefined> = process.env
): boolean {
  return isDemoSandboxCapabilityAllowed(pathname, env)
}

/**
 * Returns a 403 response when demo sandbox mode is active, null otherwise.
 * Route handlers call this at the top of mutating handlers as defense in depth.
 */
export function demoSandboxGuardResponse(
  reason: DemoSandboxBlockedReason = 'dataset_ingest',
  env: Record<string, string | undefined> = process.env
): NextResponse | null {
  if (!isDemoSandboxEnabled(env)) return null

  const externalEffect = reason === 'external_effect'
  return NextResponse.json(
    {
      error: externalEffect ? 'DEMO_EXTERNAL_EFFECT_BLOCKED' : 'DEMO_SANDBOX_READ_ONLY',
      message: externalEffect
        ? 'Efeito externo bloqueado no sandbox publico de demonstracao.'
        : 'Operacao indisponivel no sandbox publico de demonstracao.',
    },
    { status: 403 }
  )
}
