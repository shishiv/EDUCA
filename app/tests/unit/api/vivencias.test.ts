import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Vivencia } from '@/types/diario-infantil'
import { AttendanceAuthError, type AttendanceActor } from '@/lib/services/attendance-auth'
import type { VivenciaEnrollment, VivenciaScope, VivenciaTurma } from '@/lib/services/vivencias-auth'
import {
  createVivenciaByIdRouteHandlers,
  createVivenciasRouteHandlers,
  type VivenciasRouteContext,
} from '@/app/api/vivencias/handler'

const SCHOOL_ID = '10000000-0000-0000-0000-000000000001'
const TURMA_ID = '20000000-0000-0000-0000-000000000001'
const STUDENT_ID = '30000000-0000-0000-0000-000000000001'
const ENROLLMENT_ID = '40000000-0000-0000-0000-000000000001'
const TEACHER_ID = '50000000-0000-0000-0000-000000000001'

const teacher: AttendanceActor = {
  userId: TEACHER_ID,
  tipo_usuario: 'professor',
  escola_id: SCHOOL_ID,
}

const turma: VivenciaTurma = {
  turma_id: TURMA_ID,
  escola_id: SCHOOL_ID,
  professor_id: TEACHER_ID,
  ativo: true,
}

const enrollment: VivenciaEnrollment = {
  id: ENROLLMENT_ID,
  aluno_id: STUDENT_ID,
  turma_id: TURMA_ID,
  situacao: 'ativa',
}

const vivencia: Vivencia = {
  id: '60000000-0000-0000-0000-000000000001',
  escola_id: SCHOOL_ID,
  aluno_id: STUDENT_ID,
  matricula_id: ENROLLMENT_ID,
  turma_id: TURMA_ID,
  professor_id: TEACHER_ID,
  data_vivencia: '2026-08-20',
  campos_experiencia: ['eu'],
  descricao: 'A criança explorou movimentos com os colegas.',
  observacoes: null,
  escopo: 'individual',
  created_by: TEACHER_ID,
  updated_by: TEACHER_ID,
  created_at: '2026-08-20T12:00:00.000Z',
  updated_at: '2026-08-20T12:00:00.000Z',
}

interface VivenciaRequestBody {
  aluno_id?: string
  turma_id?: string
  professor_id?: string
  data_vivencia?: string
  campos_experiencia?: string[]
  descricao?: string
}

function jsonRequest(url: string, method: 'POST' | 'PUT', body: VivenciaRequestBody) {
  return new Request(url, {
    method,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('Vivências route handlers', () => {
  const create = vi.fn<VivenciasRouteContext['service']['create']>()
  const getByTurma = vi.fn<VivenciasRouteContext['service']['getByTurma']>()
  const getByAluno = vi.fn<VivenciasRouteContext['service']['getByAluno']>()
  const getByReport = vi.fn<VivenciasRouteContext['service']['getByReport']>()
  const getById = vi.fn<VivenciasRouteContext['service']['getById']>()
  const update = vi.fn<VivenciasRouteContext['service']['update']>()
  const remove = vi.fn<VivenciasRouteContext['service']['delete']>()
  const getTurma = vi.fn<(turmaId: string) => Promise<VivenciaTurma>>()
  const getEnrollment = vi.fn<(
    alunoId: string,
    turmaId: string,
  ) => Promise<VivenciaEnrollment>>()
  const assertReadAccess = vi.fn<(scope: VivenciaScope) => void>()
  const assertWriteAccess = vi.fn<(
    turmaScope: VivenciaTurma,
    scope: VivenciaScope,
    enrollmentScope: VivenciaEnrollment,
  ) => void>()
  const openContext = vi.fn<() => Promise<VivenciasRouteContext>>()

  const dependencies = { openContext }
  const collectionHandlers = createVivenciasRouteHandlers(dependencies)
  const itemHandlers = createVivenciaByIdRouteHandlers(dependencies)

  function contextFor(actor: AttendanceActor = teacher): VivenciasRouteContext {
    return {
      actor,
      service: {
        create,
        delete: remove,
        getByAluno,
        getById,
        getByReport,
        getByTurma,
        update,
      },
      getTurma,
      getEnrollment,
      assertReadAccess,
      assertWriteAccess,
    }
  }

  beforeEach(() => {
    vi.clearAllMocks()
    create.mockResolvedValue(vivencia)
    getByTurma.mockResolvedValue([vivencia])
    getByAluno.mockResolvedValue([vivencia])
    getByReport.mockResolvedValue([vivencia])
    getById.mockResolvedValue(vivencia)
    update.mockResolvedValue(vivencia)
    remove.mockResolvedValue(undefined)
    getTurma.mockResolvedValue(turma)
    getEnrollment.mockResolvedValue(enrollment)
    openContext.mockResolvedValue(contextFor())
  })

  it('derives school and teacher ownership from the authenticated actor', async () => {
    const response = await collectionHandlers.POST(jsonRequest('http://test/api/vivencias', 'POST', {
      aluno_id: STUDENT_ID,
      turma_id: TURMA_ID,
      professor_id: '99999999-9999-4999-8999-999999999999',
      data_vivencia: '2026-08-20',
      campos_experiencia: ['eu', 'corpo'],
      descricao: 'A criança explorou movimentos com os colegas.',
    }))

    expect(response.status).toBe(201)
    expect(create).toHaveBeenCalledWith(expect.objectContaining({
      escola_id: SCHOOL_ID,
      matricula_id: ENROLLMENT_ID,
      professor_id: TEACHER_ID,
      created_by: TEACHER_ID,
    }))
    expect(assertWriteAccess).toHaveBeenCalledWith(turma, turma, enrollment)
  })

  it('reads class narratives only after the class scope is authorized', async () => {
    const response = await collectionHandlers.GET(new Request(
      `http://test/api/vivencias?turma_id=${TURMA_ID}&limit=10`,
    ))

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ data: [vivencia] })
    expect(assertReadAccess).toHaveBeenCalledWith(turma)
    expect(getByTurma).toHaveBeenCalledWith(TURMA_ID, undefined, undefined)
  })

  it('passes student date bounds to the database query before limiting results', async () => {
    const response = await collectionHandlers.GET(new Request(
      `http://test/api/vivencias?aluno_id=${STUDENT_ID}&data_inicio=2026-08-01&data_fim=2026-08-01&limit=50`,
    ))

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ data: [vivencia] })
    expect(getByAluno).toHaveBeenCalledWith(STUDENT_ID, '2026-08-01', '2026-08-01', 50)
  })

  it('rejects reversed date ranges', async () => {
    const response = await collectionHandlers.GET(new Request(
      `http://test/api/vivencias?aluno_id=${STUDENT_ID}&data_inicio=2026-08-02&data_fim=2026-08-01`,
    ))

    expect(response.status).toBe(400)
    expect((await response.json()).code).toBe('VALIDATION_ERROR')
    expect(getByAluno).not.toHaveBeenCalled()
  })

  it('returns Vivências-specific authentication errors', async () => {
    openContext.mockRejectedValue(new AttendanceAuthError(
      'UNAUTHENTICATED',
      'Autenticação obrigatória para acessar vivências',
    ))

    const response = await collectionHandlers.GET(new Request(
      `http://test/api/vivencias?aluno_id=${STUDENT_ID}`,
    ))

    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toEqual({
      error: 'Autenticação obrigatória para acessar vivências',
      code: 'UNAUTHENTICATED',
    })
  })

  it('fails closed when the actor has no approved role', async () => {
    openContext.mockResolvedValue(contextFor({
      userId: 'other',
      tipo_usuario: 'responsavel',
      escola_id: SCHOOL_ID,
    }))

    const response = await collectionHandlers.GET(new Request(
      `http://test/api/vivencias?aluno_id=${STUDENT_ID}`,
    ))

    expect(response.status).toBe(403)
    expect((await response.json()).code).toBe('FORBIDDEN_ROLE')
  })

  it('uses the authenticated actor for edits and deletes after ownership checks', async () => {
    const id = vivencia.id
    const route = { params: Promise.resolve({ id }) }
    const getResponse = await itemHandlers.GET(new Request(`http://test/api/vivencias/${id}`), route)
    const updateResponse = await itemHandlers.PUT(
      jsonRequest(`http://test/api/vivencias/${id}`, 'PUT', {
        data_vivencia: '2026-08-19',
        descricao: 'A criança ampliou sua narrativa com os colegas.',
        professor_id: '99999999-9999-4999-8999-999999999999',
      }),
      route,
    )
    const deleteResponse = await itemHandlers.DELETE(
      new Request(`http://test/api/vivencias/${id}`),
      route,
    )

    expect(getResponse.status).toBe(200)
    expect(updateResponse.status).toBe(200)
    expect(update).toHaveBeenCalledWith(id, expect.objectContaining({
      data_vivencia: '2026-08-19',
      updated_by: TEACHER_ID,
    }))
    expect(assertReadAccess).toHaveBeenCalledWith(vivencia)
    expect(assertWriteAccess).toHaveBeenCalledWith(turma, vivencia, enrollment)
    expect(deleteResponse.status).toBe(204)
    expect(remove).toHaveBeenCalledWith(id)
  })

  it('rejects future dates when editing', async () => {
    const futureDate = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10)
    const response = await itemHandlers.PUT(
      jsonRequest(`http://test/api/vivencias/${vivencia.id}`, 'PUT', {
        data_vivencia: futureDate,
      }),
      { params: Promise.resolve({ id: vivencia.id }) },
    )

    expect(response.status).toBe(400)
    expect(update).not.toHaveBeenCalled()
  })

  it('maps database business rules to conflict responses', async () => {
    create.mockRejectedValue({ code: '23514', message: 'constraint failed' })

    const response = await collectionHandlers.POST(jsonRequest('http://test/api/vivencias', 'POST', {
      aluno_id: STUDENT_ID,
      turma_id: TURMA_ID,
      data_vivencia: '2026-08-20',
      campos_experiencia: ['eu'],
      descricao: 'A criança explorou movimentos com os colegas.',
    }))

    expect(response.status).toBe(409)
    expect((await response.json()).code).toBe('BUSINESS_RULE_VIOLATION')
  })
})
