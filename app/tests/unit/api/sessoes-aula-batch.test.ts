import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '@/app/api/sessoes/aula/[id]/frequencia/batch/route'

const { batchAction } = vi.hoisted(() => ({
  batchAction: vi.fn(),
}))

vi.mock('@/app/actions/attendance/mark-attendance-batch', () => ({
  markAttendanceBatchAction: batchAction,
}))

const SESSION_ID = '44444444-4444-4444-8444-444444444444'
const MATRICULA_ID = '33333333-3333-4333-8333-333333333333'

function request(body: unknown): NextRequest {
  return new NextRequest(`http://test/api/sessoes/aula/${SESSION_ID}/frequencia/batch`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/sessoes/aula/[id]/frequencia/batch', () => {
  beforeEach(() => batchAction.mockReset())

  it('passes only the canonical matricula/status payload to the server action', async () => {
    batchAction.mockResolvedValue({ success: true, processed_count: 1 })

    const response = await POST(
      request({ attendance: [{ matricula_id: MATRICULA_ID, status: 'J', justificativa: 'Atestado' }] }),
      { params: Promise.resolve({ id: SESSION_ID }) }
    )

    expect(response.status).toBe(200)
    expect(batchAction).toHaveBeenCalledWith({
      sessao_id: SESSION_ID,
      records: [{ matricula_id: MATRICULA_ID, status: 'J', justificativa: 'Atestado' }],
    })
  })

  it('rejects the old aluno_id payload before any server action runs', async () => {
    const response = await POST(
      request({ attendance: [{ aluno_id: MATRICULA_ID, presente: true }] }),
      { params: Promise.resolve({ id: SESSION_ID }) }
    )

    expect(response.status).toBe(400)
    expect(batchAction).not.toHaveBeenCalled()
  })
})
