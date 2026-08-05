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

export async function POST(request: NextRequest) {
  try {
    const payload = OpenSessionSchema.parse(await request.json())
    const result = await openSessionAction(payload)

    if (!result.success) {
      const status = result.code === 'UNAUTHENTICATED'
        ? 401
        : result.code === 'FORBIDDEN_ROLE' || result.code === 'SCHOOL_MISMATCH' || result.code === 'TURMA_NOT_OWNED'
          ? 403
          : result.code === 'TURMA_NOT_FOUND'
            ? 404
            : result.code === 'SESSION_ALREADY_OPEN'
              ? 409
              : result.code === 'DATE_NOT_CURRENT'
                ? 409
                : 400
      return NextResponse.json(result, { status })
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
