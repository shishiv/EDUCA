/**
 * HTTP adapter for the canonical session-opening server action.
 * POST /api/sessoes/aula/abrir
 *
 * Legacy professor_id, escola_id, disciplina_id and time fields are not part of
 * this contract. The server action derives identity from auth and the turma.
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { openSessionAction } from '@/app/actions/attendance/open-session'

const OpenSessionSchema = z.object({
  turma_id: z.string().uuid('ID da turma inválido'),
  data_aula: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de data inválido'),
  conteudo_programatico: z.string().max(500).optional(),
})

const HTTP_STATUS_BY_OPEN_SESSION_CODE = new Map<string, number>([
  ['UNAUTHENTICATED', 401],
  ['FORBIDDEN_ROLE', 403],
  ['SCHOOL_MISMATCH', 403],
  ['TURMA_NOT_OWNED', 403],
  ['TURMA_NOT_FOUND', 404],
  ['SESSION_ALREADY_OPEN', 409],
  ['DATE_NOT_CURRENT', 409],
  ['SESSION_CUTOFF_PASSED', 409],
])

function statusForOpenSessionCode(code?: string): number {
  return code ? HTTP_STATUS_BY_OPEN_SESSION_CODE.get(code) ?? 400 : 400
}

export async function POST(request: NextRequest) {
  try {
    const payload = OpenSessionSchema.parse(await request.json())
    const result = await openSessionAction(payload)

    if (!result.success) {
      return NextResponse.json(result, { status: statusForOpenSessionCode(result.code) })
    }

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, code: 'VALIDATION_ERROR', error: 'Dados de entrada inválidos', details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { success: false, code: 'INTERNAL_ERROR', error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
