import { createClient } from '@supabase/supabase-js'
import { describe, expect, it } from 'vitest'
import { getClassDiary } from '@/lib/api/class-diary'
import type { Database } from '@/types/database'

function diarySession(id: string) {
  return {
    id,
    data_aula: '2026-09-08',
    turma_id: 'turma-1',
    professor_id: 'prof-1',
    disciplina_id: null,
    status: 'ABERTA',
    observacoes: null,
    observacoes_fechamento: null,
    aberta_em: '2026-09-08T08:00:00Z',
    fechada_em: null,
    travada_em: null,
    created_at: '2026-09-08T08:00:00Z',
    turmas: { id: 'turma-1', nome: 'Turma 1', serie: '1º Ano', ano_letivo: 2026, escola_id: 'school-1', escolas: { id: 'school-1', nome: 'Escola 1' } },
    professor: { id: 'prof-1', nome: 'Professor' },
    disciplina: null,
  }
}

function fakeSupabase(requests: Request[]) {
  return createClient<Database>('http://127.0.0.1:54321', 'synthetic-key', {
    auth: { autoRefreshToken: false, persistSession: false },
    global: {
      fetch: async (input, init) => {
        const request = new Request(input, init)
        requests.push(request)
        const path = new URL(request.url).pathname

        if (path === '/rest/v1/sessoes_aula') {
          return new Response(JSON.stringify([diarySession('session-21')]), {
            headers: {
              'Content-Type': 'application/json',
              'Content-Range': '20-20/21',
            },
          })
        }
        if (path === '/rest/v1/rpc/get_municipal_settings') {
          return Response.json([{ attendance_bands: { reference: 90, attention: 95 } }])
        }
        if (path === '/rest/v1/frequencia') {
          return new Response('[]', { headers: { 'Content-Type': 'application/json' } })
        }
        throw new Error(`Unexpected synthetic request: ${request.method} ${path}`)
      },
    },
  })
}

describe('getClassDiary pagination', () => {
  it('returns exact total independently of the current page and preserves filters', async () => {
    const requests: Request[] = []
    const result = await getClassDiary(fakeSupabase(requests), {
      turma_id: 'turma-1',
      date_from: '2026-09-01',
      date_to: '2026-09-30',
      limit: 1,
      offset: 20,
    })

    expect(result.error).toBeNull()
    expect(result.total).toBe(21)
    expect(result.data).toHaveLength(1)
    expect(result.data?.[0].bands).toEqual({ reference: 90, attention: 95 })

    const pageRequest = requests[0]
    const pageUrl = new URL(pageRequest.url)
    expect(pageUrl.pathname).toBe('/rest/v1/sessoes_aula')
    expect(pageUrl.searchParams.get('turma_id')).toBe('eq.turma-1')
    expect(pageUrl.searchParams.getAll('data_aula')).toEqual([
      'gte.2026-09-01',
      'lte.2026-09-30',
    ])
    expect(pageUrl.searchParams.get('offset')).toBe('20')
    expect(pageUrl.searchParams.get('limit')).toBe('1')
    expect(pageRequest.headers.get('prefer')).toContain('count=exact')
    expect(requests[1] && new URL(requests[1].url).pathname).toBe('/rest/v1/frequencia')
  })
})
