import { describe, expect, it } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '@/app/api/frequencia/marcar/route'

describe('POST /api/frequencia/marcar', () => {
  it('does not expose the legacy aulas_abertas write boundary', async () => {
    const response = await POST(new NextRequest('http://test/api/frequencia/marcar', { method: 'POST' }))
    const body = await response.json() as Record<string, unknown>

    expect(response.status).toBe(410)
    expect(body.code).toBe('ATTENDANCE_ROUTE_DEPRECATED')
    expect(body.route).toBe('/dashboard/turmas/[id]/chamada')
  })
})
