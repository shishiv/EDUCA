import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import {
  isValidVivenciaDate,
  isVivenciaDateNotFuture,
  VIVENCIA_ERROR_MESSAGES,
  VIVENCIA_VALIDATION,
  type Vivencia,
} from '@/types/diario-infantil'
import {
  VivenciasApiService,
  type CreateVivenciaInput,
  type UpdateVivenciaInput,
} from '@/lib/api/vivencias'
import {
  assertVivenciaReadAccess,
  assertVivenciaWriteAccess,
  getVivenciaEnrollment,
  getVivenciaTurma,
  requireVivenciaActor,
  type VivenciaEnrollment,
  type VivenciaScope,
  type VivenciaTurma,
} from '@/lib/services/vivencias-auth'
import {
  AttendanceAuthError,
  type AttendanceActor,
} from '@/lib/services/attendance-auth'

const campoSchema = z.enum(['eu', 'corpo', 'tracos', 'escuta', 'espacos'])
const databaseErrorSchema = z.object({ code: z.string() }).passthrough()
const readableRoles = new Set(['admin', 'secretario', 'diretor', 'professor'])
const createBusinessRuleCodes = new Set(['23503', '23514'])
const updateBusinessRuleCodes = new Set(['23001', '23503', '23514'])

const dateSchema = z.string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de data inválido')
  .refine(isValidVivenciaDate, 'Data inválida')

const querySchema = z.object({
  aluno_id: z.string().uuid().optional(),
  turma_id: z.string().uuid().optional(),
  report_id: z.string().uuid().optional(),
  data_inicio: dateSchema.optional(),
  data_fim: dateSchema.optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
}).refine(value => Boolean(value.aluno_id || value.turma_id || value.report_id), {
  message: 'aluno_id, turma_id ou report_id é obrigatório',
}).refine(value => !value.data_inicio || !value.data_fim || value.data_inicio <= value.data_fim, {
  message: 'data_inicio não pode ser posterior a data_fim',
})

const camposSchema = z.array(campoSchema)
  .min(VIVENCIA_VALIDATION.minCamposSelected, VIVENCIA_ERROR_MESSAGES.noCampoSelected)
  .refine(values => new Set(values).size === values.length, 'Campos de experiência duplicados')

const descricaoSchema = z.string()
  .min(VIVENCIA_VALIDATION.minDescricaoLength, VIVENCIA_ERROR_MESSAGES.descricaoTooShort)
  .max(VIVENCIA_VALIDATION.maxDescricaoLength, VIVENCIA_ERROR_MESSAGES.descricaoTooLong)

const observacoesSchema = z.string()
  .max(VIVENCIA_VALIDATION.maxObservacoesLength, VIVENCIA_ERROR_MESSAGES.observacoesTooLong)
  .nullable()

const createSchema = z.object({
  aluno_id: z.string().uuid('ID do aluno inválido'),
  turma_id: z.string().uuid('ID da turma inválido'),
  data_vivencia: dateSchema.refine(isVivenciaDateNotFuture, 'A data não pode ser futura'),
  campos_experiencia: camposSchema,
  descricao: descricaoSchema,
  observacoes: observacoesSchema.optional(),
  escopo: z.enum(['individual', 'coletiva']).optional(),
})

const paramsSchema = z.object({ id: z.string().uuid('ID da vivência inválido') })

const updateSchema = z.object({
  data_vivencia: dateSchema.refine(isVivenciaDateNotFuture, 'A data não pode ser futura').optional(),
  campos_experiencia: camposSchema.optional(),
  descricao: descricaoSchema.optional(),
  observacoes: observacoesSchema.optional(),
}).refine(value => Object.keys(value).length > 0, 'Nenhum campo para atualizar')

type VivenciasService = Pick<VivenciasApiService,
  'create' | 'delete' | 'getByAluno' | 'getById' | 'getByReport' | 'getByTurma' | 'update'>

export interface VivenciasRouteContext {
  actor: AttendanceActor
  service: VivenciasService
  getTurma(turmaId: string): Promise<VivenciaTurma>
  getEnrollment(alunoId: string, turmaId: string): Promise<VivenciaEnrollment>
  assertReadAccess(scope: VivenciaScope): void
  assertWriteAccess(
    turma: VivenciaTurma,
    scope: VivenciaScope,
    enrollment: VivenciaEnrollment,
  ): void
}

export interface VivenciasRouteDependencies {
  openContext(): Promise<VivenciasRouteContext>
}

export interface VivenciaRouteParameters {
  params: Promise<{ id: string }>
}

const productionDependencies: VivenciasRouteDependencies = {
  async openContext() {
    const supabase = await createClient()
    const actor = await requireVivenciaActor(supabase)
    return {
      actor,
      service: new VivenciasApiService(supabase),
      getTurma: turmaId => getVivenciaTurma(supabase, turmaId),
      getEnrollment: (alunoId, turmaId) => getVivenciaEnrollment(supabase, alunoId, turmaId),
      assertReadAccess: scope => assertVivenciaReadAccess(actor, scope),
      assertWriteAccess: (turma, scope, enrollment) => {
        assertVivenciaWriteAccess(actor, turma, scope, enrollment)
      },
    }
  },
}

function authenticationStatus(error: AttendanceAuthError): number {
  if (error.code === 'UNAUTHENTICATED') return 401
  if (error.code === 'TURMA_NOT_FOUND' || error.code === 'SESSION_NOT_FOUND') return 404
  return 403
}

async function handleVivenciaRequest(
  operation: () => Promise<NextResponse>,
  fallbackCode: string,
  businessRuleCodes: ReadonlySet<string>,
  businessRuleMessage: string,
): Promise<NextResponse> {
  try {
    return await operation()
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Dados inválidos',
        code: 'VALIDATION_ERROR',
        details: error.issues,
      }, { status: 400 })
    }

    if (error instanceof AttendanceAuthError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: authenticationStatus(error) },
      )
    }

    const databaseError = databaseErrorSchema.safeParse(error)
    if (databaseError.success && businessRuleCodes.has(databaseError.data.code)) {
      return NextResponse.json({
        error: businessRuleMessage,
        code: 'BUSINESS_RULE_VIOLATION',
      }, { status: 409 })
    }

    logger.error(fallbackCode, error instanceof Error ? error : new Error(fallbackCode), {
      feature: 'vivencias',
      action: fallbackCode,
    })
    return NextResponse.json({ error: 'Erro interno do servidor', code: 'INTERNAL_ERROR' }, { status: 500 })
  }
}

function assertReadableRole(actor: AttendanceActor): void {
  if (!readableRoles.has(actor.tipo_usuario)) {
    throw new AttendanceAuthError('FORBIDDEN_ROLE', 'Usuário sem permissão para consultar vivências')
  }
}

async function readVivencias(
  context: VivenciasRouteContext,
  query: z.infer<typeof querySchema>,
): Promise<Vivencia[]> {
  if (query.report_id) {
    assertReadableRole(context.actor)
    const data = await context.service.getByReport(query.report_id)
    return data.slice(0, query.limit)
  }

  if (query.turma_id) {
    const turma = await context.getTurma(query.turma_id)
    context.assertReadAccess(turma)
    const data = await context.service.getByTurma(
      query.turma_id,
      query.data_inicio,
      query.data_fim,
    )
    const scopedData = query.aluno_id
      ? data.filter(vivencia => vivencia.aluno_id === query.aluno_id)
      : data
    return scopedData.slice(0, query.limit)
  }

  assertReadableRole(context.actor)
  if (!query.aluno_id) throw new Error('vivencias_query_scope_missing')
  return context.service.getByAluno(
    query.aluno_id,
    query.data_inicio,
    query.data_fim,
    query.limit,
  )
}

async function loadVivencia(
  dependencies: VivenciasRouteDependencies,
  id: string,
): Promise<{ context: VivenciasRouteContext; vivencia: Vivencia }> {
  const context = await dependencies.openContext()
  const vivencia = await context.service.getById(id)
  if (!vivencia) {
    throw new AttendanceAuthError('SESSION_NOT_FOUND', 'Vivência não encontrada')
  }
  context.assertReadAccess(vivencia)
  return { context, vivencia }
}

export function createVivenciasRouteHandlers(
  dependencies: VivenciasRouteDependencies = productionDependencies,
) {
  return {
    GET: (request: Request) => handleVivenciaRequest(async () => {
      const context = await dependencies.openContext()
      const url = new URL(request.url)
      const query = querySchema.parse({
        aluno_id: url.searchParams.get('aluno_id') || undefined,
        turma_id: url.searchParams.get('turma_id') || undefined,
        report_id: url.searchParams.get('report_id') || undefined,
        data_inicio: url.searchParams.get('data_inicio') || undefined,
        data_fim: url.searchParams.get('data_fim') || undefined,
        limit: url.searchParams.get('limit') || undefined,
      })
      return NextResponse.json({ data: await readVivencias(context, query) })
    }, 'vivencias_list_failed', createBusinessRuleCodes, 'Vivência não pôde ser persistida'),

    POST: (request: Request) => handleVivenciaRequest(async () => {
      const context = await dependencies.openContext()
      const input = createSchema.parse(await request.json())
      const turma = await context.getTurma(input.turma_id)
      const enrollment = await context.getEnrollment(input.aluno_id, input.turma_id)
      context.assertWriteAccess(turma, turma, enrollment)
      const createInput: CreateVivenciaInput = {
        ...input,
        escola_id: turma.escola_id,
        matricula_id: enrollment.id,
        professor_id: context.actor.userId,
        created_by: context.actor.userId,
        observacoes: input.observacoes ?? null,
      }
      return NextResponse.json(
        { data: await context.service.create(createInput) },
        { status: 201 },
      )
    }, 'vivencias_create_failed', createBusinessRuleCodes, 'Vivência não pôde ser persistida'),
  }
}

export function createVivenciaByIdRouteHandlers(
  dependencies: VivenciasRouteDependencies = productionDependencies,
) {
  return {
    GET: (_request: Request, route: VivenciaRouteParameters) => handleVivenciaRequest(async () => {
      const { id } = paramsSchema.parse(await route.params)
      const { vivencia } = await loadVivencia(dependencies, id)
      return NextResponse.json({ data: vivencia })
    }, 'vivencia_get_failed', updateBusinessRuleCodes, 'Vivência não pôde ser alterada'),

    PUT: (request: Request, route: VivenciaRouteParameters) => handleVivenciaRequest(async () => {
      const { id } = paramsSchema.parse(await route.params)
      const { context, vivencia } = await loadVivencia(dependencies, id)
      const turma = await context.getTurma(vivencia.turma_id)
      const enrollment = await context.getEnrollment(vivencia.aluno_id, vivencia.turma_id)
      context.assertWriteAccess(turma, vivencia, enrollment)
      const input = updateSchema.parse(await request.json())
      const updateInput: UpdateVivenciaInput = {
        ...input,
        updated_by: context.actor.userId,
      }
      return NextResponse.json({ data: await context.service.update(id, updateInput) })
    }, 'vivencia_update_failed', updateBusinessRuleCodes, 'Vivência não pôde ser alterada'),

    DELETE: (_request: Request, route: VivenciaRouteParameters) => handleVivenciaRequest(async () => {
      const { id } = paramsSchema.parse(await route.params)
      const { context, vivencia } = await loadVivencia(dependencies, id)
      const turma = await context.getTurma(vivencia.turma_id)
      const enrollment = await context.getEnrollment(vivencia.aluno_id, vivencia.turma_id)
      context.assertWriteAccess(turma, vivencia, enrollment)
      await context.service.delete(id)
      return new NextResponse(null, { status: 204 })
    }, 'vivencia_delete_failed', updateBusinessRuleCodes, 'Vivência não pôde ser alterada'),
  }
}
