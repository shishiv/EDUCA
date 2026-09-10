import { NextRequest, NextResponse } from 'next/server'
import { requirePilotActor } from '@/lib/pilot/pilot-server-auth'
import { logger } from '@/lib/logger'
import {
  createSupabaseGlobalSearchStore,
  globalSearchKinds,
  searchGlobal,
  type GlobalSearchActor,
  type GlobalSearchStatus,
  type GlobalSearchStore,
  type GlobalSearchType,
  type GlobalSearchResponse,
} from '@/lib/global-search'
import { createClient } from '@/lib/supabase/server'

export interface SearchRouteDependencies {
  requireActor: (allowedRoles: Array<'admin' | 'diretor' | 'secretario' | 'professor'>) => Promise<GlobalSearchActor>
  createStore: () => Promise<GlobalSearchStore>
  search: typeof searchGlobal
}
const defaultDependencies: SearchRouteDependencies = {
  requireActor: requirePilotActor,
  createStore: createSupabaseSearchStore,
  search: searchGlobal,
}
const emptyResponse = (status: number) => NextResponse.json({ results: [] }, { status })
function parseType(value: string | null): GlobalSearchType | null { if (!value || value === 'all') return 'all'; return isSearchKind(value) ? value : null }
function isSearchKind(value: string): value is Exclude<GlobalSearchType, 'all'> { return globalSearchKinds.some(kind => kind === value) }
function parseStatus(value: string | null): GlobalSearchStatus | null { if (!value || value === 'active') return 'active'; if (value === 'inactive' || value === 'all') return value; return null }
function parseNumber(value: string | null, fallback: number, maximum: number) { const parsed = Number(value); return !Number.isInteger(parsed) || parsed < 0 ? fallback : Math.min(parsed, maximum) }
export function createSearchRoute(dependencies: SearchRouteDependencies = defaultDependencies) {
  return async function GET(request: NextRequest) {
    let actor: GlobalSearchActor
    try { actor = await dependencies.requireActor(['admin', 'diretor', 'secretario', 'professor']) } catch (error) { return emptyResponse(error instanceof Error && error.message === 'PILOT_AUTH_REQUIRED' ? 401 : 403) }
    const type = parseType(request.nextUrl.searchParams.get('type'))
    const status = parseStatus(request.nextUrl.searchParams.get('status'))
    if (!type || !status) return emptyResponse(400)
    try {
      const result: GlobalSearchResponse = await dependencies.search(await dependencies.createStore(), { id: actor.id, role: actor.role, schoolId: actor.schoolId }, { query: request.nextUrl.searchParams.get('query') ?? '', type, status, limit: parseNumber(request.nextUrl.searchParams.get('limit'), 10, 50) || 1, offset: parseNumber(request.nextUrl.searchParams.get('offset'), 0, 10_000) })
      return NextResponse.json(result)
    } catch { logger.error('GLOBAL_SEARCH_READ_FAILED', new Error('search read failed')); return emptyResponse(500) }
  }
}

async function createSupabaseSearchStore(): Promise<GlobalSearchStore> {
  return createSupabaseGlobalSearchStore(await createClient())
}
