import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import {
  isValidVivenciaDate,
  isVivenciaDateNotFuture,
  VIVENCIA_ERROR_MESSAGES,
  VIVENCIA_VALIDATION,
} from '@/types/diario-infantil'
import { VivenciasApiService } from '@/lib/api/vivencias'
import {
  assertVivenciaReadAccess,
  assertVivenciaWriteAccess,
  getVivenciaEnrollment,
  getVivenciaTurma,
  requireVivenciaActor,
} from '@/lib/services/vivencias-auth'
import { AttendanceAuthError } from '@/lib/services/attendance-auth'

const campoSchema = z.enum(['eu', 'corpo', 'tracos', 'escuta', 'espacos'])

const querySchema = z.object({
  aluno_id: z.string().uuid().optional(),
  turma_id: z.string().uuid().optional(),
  report_id: z.string().uuid().optional(),
  data_inicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(isValidVivenciaDate).optional(),
  data_fim: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(isValidVivenciaDate).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
}).refine((value) => Boolean(value.aluno_id || value.turma_id || value.report_id), {
  message: 'aluno_id, turma_id ou report_id é obrigatório',
}).refine((value) => !value.data_inicio || !value.data_fim || value.data_inicio <= value.data_fim, {
  message: 'data_inicio não pode ser posterior a data_fim',
})

const createSchema = z.object({
  aluno_id: z.string().uuid('ID do aluno inválido'),
  turma_id: z.string().uuid('ID da turma inválido'),
  data_vivencia: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de data inválido')
    .refine(isValidVivenciaDate, 'Data inválida')
    .refine(isVivenciaDateNotFuture, 'A data não pode ser futura'),
  campos_experiencia: z.array(campoSchema)
    .min(VIVENCIA_VALIDATION.minCamposSelected, VIVENCIA_ERROR_MESSAGES.noCampoSelected)
    .refine((values) => new Set(values).size === values.length, 'Campos de experiência duplicados'),
  descricao: z.string()
    .min(VIVENCIA_VALIDATION.minDescricaoLength, VIVENCIA_ERROR_MESSAGES.descricaoTooShort)
    .max(VIVENCIA_VALIDATION.maxDescricaoLength, VIVENCIA_ERROR_MESSAGES.descricaoTooLong),
  observacoes: z.string()
    .max(VIVENCIA_VALIDATION.maxObservacoesLength, VIVENCIA_ERROR_MESSAGES.observacoesTooLong)
    .nullable()
    .optional(),
  escopo: z.enum(['individual', 'coletiva']).optional(),
})

function errorResponse(error: unknown, fallbackCode: string): NextResponse {
  if (error instanceof z.ZodError) {
    return NextResponse.json({
      error: 'Dados inválidos',
      code: 'VALIDATION_ERROR',
      details: error.issues,
    }, { status: 400 })
  }

  if (error instanceof AttendanceAuthError) {
    const status = error.code === 'UNAUTHENTICATED'
      ? 401
      : ['TURMA_NOT_FOUND', 'SESSION_NOT_FOUND'].includes(error.code)
        ? 404
        : 403
    return NextResponse.json({ error: error.message, code: error.code }, { status })
  }

  const databaseError = error as { code?: string; message?: string }
  if (databaseError.code === '23503' || databaseError.code === '23514') {
    return NextResponse.json({ error: 'Vivência não pôde ser persistida', code: 'BUSINESS_RULE_VIOLATION' }, { status: 409 })
  }

  logger.error(fallbackCode, error instanceof Error ? error : new Error(fallbackCode), {
    feature: 'vivencias',
    action: fallbackCode,
  })
  return NextResponse.json({ error: 'Erro interno do servidor', code: 'INTERNAL_ERROR' }, { status: 500 })
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const actor = await requireVivenciaActor(supabase)
    const query = querySchema.parse({
      aluno_id: request.nextUrl.searchParams.get('aluno_id') || undefined,
      turma_id: request.nextUrl.searchParams.get('turma_id') || undefined,
      report_id: request.nextUrl.searchParams.get('report_id') || undefined,
      data_inicio: request.nextUrl.searchParams.get('data_inicio') || undefined,
      data_fim: request.nextUrl.searchParams.get('data_fim') || undefined,
      limit: request.nextUrl.searchParams.get('limit') || undefined,
    })

    const service = new VivenciasApiService(supabase)
    if (query.report_id) {
      if (!['admin', 'secretario', 'diretor', 'professor'].includes(actor.tipo_usuario)) {
        throw new AttendanceAuthError('FORBIDDEN_ROLE', 'Usuário sem permissão para consultar vivências')
      }
      const data = await service.getByReport(query.report_id)
      return NextResponse.json({ data: data.slice(0, query.limit) })
    }
    if (query.turma_id) {
      const turma = await getVivenciaTurma(supabase, query.turma_id)
      assertVivenciaReadAccess(actor, turma)
      let data = await service.getByTurma(query.turma_id, query.data_inicio, query.data_fim)
      if (query.aluno_id) data = data.filter((vivencia) => vivencia.aluno_id === query.aluno_id)
      return NextResponse.json({ data: data.slice(0, query.limit) })
    }

    if (!['admin', 'secretario', 'diretor', 'professor'].includes(actor.tipo_usuario)) {
      throw new AttendanceAuthError('FORBIDDEN_ROLE', 'Usuário sem permissão para consultar vivências')
    }

    const data = await service.getByAluno(query.aluno_id!, query.data_inicio, query.data_fim, query.limit)
    return NextResponse.json({ data })
  } catch (error) {
    return errorResponse(error, 'vivencias_list_failed')
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const actor = await requireVivenciaActor(supabase)
    const input = createSchema.parse(await request.json())
    const turma = await getVivenciaTurma(supabase, input.turma_id)
    const enrollment = await getVivenciaEnrollment(supabase, input.aluno_id, input.turma_id)
    assertVivenciaWriteAccess(actor, turma, turma, enrollment)

    const service = new VivenciasApiService(supabase)
    const vivencia = await service.create({
      ...input,
      escola_id: turma.escola_id,
      matricula_id: enrollment.id,
      professor_id: actor.userId,
      created_by: actor.userId,
      observacoes: input.observacoes ?? null,
    })

    return NextResponse.json({ data: vivencia }, { status: 201 })
  } catch (error) {
    return errorResponse(error, 'vivencias_create_failed')
  }
}
