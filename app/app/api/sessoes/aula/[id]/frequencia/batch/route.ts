/**
 * Canonical batch attendance endpoint.
 * POST /api/sessoes/aula/[id]/frequencia/batch
 *
 * The endpoint is an HTTP adapter only. Authorization and all identity
 * derivation live in markAttendanceBatchAction, the same server action used by
 * the canonical chamada page.
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { markAttendanceBatchAction } from '@/app/actions/attendance/mark-attendance-batch'

const BatchAttendanceSchema = z.object({
  attendance: z.array(z.object({
    matricula_id: z.string().uuid('ID da matrícula inválido'),
    status: z.enum(['P', 'F', 'J', 'A']).nullable(),
    justificativa: z.string().max(500, 'Justificativa muito longa').nullable().optional(),
  })).min(1, 'Pelo menos um registro de frequência é necessário'),
})

function statusForCode(code?: string): number {
  if (code === 'UNAUTHENTICATED') return 401
  if (code === 'SESSION_NOT_FOUND' || code === 'TURMA_NOT_FOUND' || code === 'MATRICULA_NOT_FOUND') return 404
  if (code === 'FORBIDDEN_ROLE' || code === 'SESSION_NOT_OWNED' || code === 'SCHOOL_MISMATCH' || code === 'TURMA_NOT_OWNED') return 403
  if (code === 'SESSION_CLOSED' || code === 'SESSION_DATE_NOT_CURRENT' || code === 'ATTENDANCE_WRITE_FAILED') return 409
  return 400
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  if (!z.string().uuid().safeParse(id).success) {
    return NextResponse.json(
      { success: false, code: 'VALIDATION_ERROR', error: 'ID da sessão inválido' },
      { status: 400 }
    )
  }

  try {
    const payload = BatchAttendanceSchema.parse(await request.json())
    const result = await markAttendanceBatchAction({
      sessao_id: id,
      records: payload.attendance,
    })

    if (!result.success) {
      return NextResponse.json(result, { status: statusForCode(result.code) })
    }

    return NextResponse.json({
      success: true,
      results: {
        processed_count: result.processed_count,
        total_requested: payload.attendance.length,
      },
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          code: 'VALIDATION_ERROR',
          error: 'Dados de entrada inválidos',
          details: error.issues.map(issue => ({
            field: issue.path.join('.'),
            message: issue.message,
          })),
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { success: false, code: 'INTERNAL_ERROR', error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
