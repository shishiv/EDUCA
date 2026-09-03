import { NextRequest, NextResponse } from 'next/server'
import { requirePilotActor } from '@/lib/pilot/pilot-server-auth'
import { logger } from '@/lib/logger'
import { searchGlobal, globalSearchKinds, type GlobalSearchStatus, type GlobalSearchType } from '@/lib/global-search'
import { createClient } from '@/lib/supabase/server'

const emptyResponse = (status: number) => NextResponse.json({ results: [] }, { status })

function parseType(value: string | null): GlobalSearchType | null {
  if (!value || value === 'all') return 'all'
  return globalSearchKinds.includes(value as typeof globalSearchKinds[number])
    ? value as GlobalSearchType
    : null
}

function parseStatus(value: string | null): GlobalSearchStatus | null {
  if (!value || value === 'active') return 'active'
  if (value === 'inactive' || value === 'all') return value
  return null
}

function parseNumber(value: string | null, fallback: number, maximum: number) {
  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed < 0) return fallback
  return Math.min(parsed, maximum)
}

export async function GET(request: NextRequest) {
  let actor
  try {
    actor = await requirePilotActor(['admin', 'diretor', 'secretario', 'professor'])
  } catch (error) {
    const code = error instanceof Error ? error.message : ''
    return emptyResponse(code === 'PILOT_AUTH_REQUIRED' ? 401 : 403)
  }

  const type = parseType(request.nextUrl.searchParams.get('type'))
  const status = parseStatus(request.nextUrl.searchParams.get('status'))
  if (!type || !status) return emptyResponse(400)

  try {
    const result = await searchGlobal(await createClient(), {
      id: actor.id,
      role: actor.role,
      schoolId: actor.schoolId,
    }, {
      query: request.nextUrl.searchParams.get('query') ?? '',
      type,
      status,
      limit: parseNumber(request.nextUrl.searchParams.get('limit'), 10, 50) || 1,
      offset: parseNumber(request.nextUrl.searchParams.get('offset'), 0, 10_000),
    })
    return NextResponse.json(result)
  } catch {
    logger.error('GLOBAL_SEARCH_READ_FAILED', new Error('search read failed'))
    return emptyResponse(500)
  }
}
