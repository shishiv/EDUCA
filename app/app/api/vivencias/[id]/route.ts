import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import { VIVENCIA_ERROR_MESSAGES, VIVENCIA_VALIDATION } from '@/types/diario-infantil'
import { VivenciasApiService } from '@/lib/api/vivencias'
import {
  assertVivenciaReadAccess,
  assertVivenciaWriteAccess,
  getVivenciaEnrollment,
  getVivenciaTurma,
  requireVivenciaActor,
} from '@/lib/services/vivencias-auth'
import { AttendanceAuthError } from '@/lib/services/attendance-auth'

const paramsSchema = z.object({ id: z.string().uuid('ID da vivência inválido') })

const updateSchema = z.object({
  campos_experiencia: z.array(z.enum(['eu', 'corpo', 'tracos', 'escuta', 'espacos']))
    .min(VIVENCIA_VALIDATION.minCamposSelected, VIVENCIA_ERROR_MESSAGES.noCampoSelected)
    .refine((values) => new Set(values).size === values.length, 'Campos de experiência duplicados')
    .optional(),
  descricao: z.string()
    .min(VIVENCIA_VALIDATION.minDescricaoLength, VIVENCIA_ERROR_MESSAGES.descricaoTooShort)
    .max(VIVENCIA_VALIDATION.maxDescricaoLength, VIVENCIA_ERROR_MESSAGES.descricaoTooLong)
    .optional(),
  observacoes: z.string()
    .max(VIVENCIA_VALIDATION.maxObservacoesLength, VIVENCIA_ERROR_MESSAGES.observacoesTooLong)
    .nullable()
    .optional(),
}).refine((value) => Object.keys(value).length > 0, 'Nenhum campo para atualizar')

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

  const databaseError = error as { code?: string }
  if (databaseError.code === '23001' || databaseError.code === '23503' || databaseError.code === '23514') {
    return NextResponse.json({ error: 'Vivência não pôde ser alterada', code: 'BUSINESS_RULE_VIOLATION' }, { status: 409 })
  }

  logger.error(fallbackCode, error instanceof Error ? error : new Error(fallbackCode), {
    feature: 'vivencias',
    action: fallbackCode,
  })
  return NextResponse.json({ error: 'Erro interno do servidor', code: 'INTERNAL_ERROR' }, { status: 500 })
}

async function loadVivencia(id: string) {
  const supabase = await createClient()
  const actor = await requireVivenciaActor(supabase)
  const service = new VivenciasApiService(supabase)
  const vivencia = await service.getById(id)
  if (!vivencia) {
    throw new AttendanceAuthError('SESSION_NOT_FOUND', 'Vivência não encontrada')
  }
  assertVivenciaReadAccess(actor, vivencia)
  return { supabase, actor, service, vivencia }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = paramsSchema.parse(await params)
    const { vivencia } = await loadVivencia(id)
    return NextResponse.json({ data: vivencia })
  } catch (error) {
    return errorResponse(error, 'vivencia_get_failed')
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = paramsSchema.parse(await params)
    const { supabase, actor, service, vivencia } = await loadVivencia(id)
    const turma = await getVivenciaTurma(supabase, vivencia.turma_id)
    const enrollment = await getVivenciaEnrollment(supabase, vivencia.aluno_id, vivencia.turma_id)
    assertVivenciaWriteAccess(actor, turma, vivencia, enrollment)
    const input = updateSchema.parse(await request.json())
    const updated = await service.update(id, { ...input, updated_by: actor.userId })
    return NextResponse.json({ data: updated })
  } catch (error) {
    return errorResponse(error, 'vivencia_update_failed')
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = paramsSchema.parse(await params)
    const { supabase, actor, service, vivencia } = await loadVivencia(id)
    const turma = await getVivenciaTurma(supabase, vivencia.turma_id)
    const enrollment = await getVivenciaEnrollment(supabase, vivencia.aluno_id, vivencia.turma_id)
    assertVivenciaWriteAccess(actor, turma, vivencia, enrollment)
    await service.delete(id)
    return new NextResponse(null, { status: 204 })
  } catch (error) {
    return errorResponse(error, 'vivencia_delete_failed')
  }
}
