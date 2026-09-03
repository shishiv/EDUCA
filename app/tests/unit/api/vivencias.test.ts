import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const {
  actorMock,
  turmaMock,
  enrollmentMock,
  serviceConstructorMock,
  createClientMock,
} = vi.hoisted(() => ({
  actorMock: vi.fn(),
  turmaMock: vi.fn(),
  enrollmentMock: vi.fn(),
  serviceConstructorMock: vi.fn(),
  createClientMock: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({ createClient: createClientMock }))
vi.mock('@/lib/services/vivencias-auth', () => ({
  requireVivenciaActor: actorMock,
  getVivenciaTurma: turmaMock,
  getVivenciaEnrollment: enrollmentMock,
  assertVivenciaReadAccess: vi.fn(),
  assertVivenciaWriteAccess: vi.fn(),
}))
vi.mock('@/lib/api/vivencias', () => ({ VivenciasApiService: serviceConstructorMock }))

import { GET, POST } from '@/app/api/vivencias/route'
import { DELETE, GET as GET_BY_ID, PUT } from '@/app/api/vivencias/[id]/route'
import { AttendanceAuthError } from '@/lib/services/attendance-auth'

const SCHOOL_ID = '10000000-0000-0000-0000-000000000001'
const TURMA_ID = '20000000-0000-0000-0000-000000000001'
const STUDENT_ID = '30000000-0000-0000-0000-000000000001'
const ENROLLMENT_ID = '40000000-0000-0000-0000-000000000001'
const TEACHER_ID = '50000000-0000-0000-0000-000000000001'

const vivencia = {
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

function request(url: string, body?: unknown) {
  return new NextRequest(url, body === undefined ? undefined : {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('Vivências route handlers', () => {
  const create = vi.fn()
  const getByTurma = vi.fn()
  const getByAluno = vi.fn()
  const getById = vi.fn()
  const update = vi.fn()
  const remove = vi.fn()

  beforeEach(() => {
    actorMock.mockReset()
    turmaMock.mockReset()
    enrollmentMock.mockReset()
    serviceConstructorMock.mockReset()
    createClientMock.mockReset()
    create.mockReset()
    getByTurma.mockReset()
    getByAluno.mockReset()
    getById.mockReset()
    update.mockReset()
    remove.mockReset()
    createClientMock.mockResolvedValue({})
    actorMock.mockResolvedValue({ userId: TEACHER_ID, tipo_usuario: 'professor', escola_id: SCHOOL_ID })
    turmaMock.mockResolvedValue({ turma_id: TURMA_ID, escola_id: SCHOOL_ID, professor_id: TEACHER_ID, ativo: true })
    enrollmentMock.mockResolvedValue({ id: ENROLLMENT_ID, aluno_id: STUDENT_ID, turma_id: TURMA_ID, situacao: 'ativa' })
    create.mockResolvedValue(vivencia)
    getByTurma.mockResolvedValue([vivencia])
    getByAluno.mockResolvedValue([vivencia])
    getById.mockResolvedValue(vivencia)
    update.mockResolvedValue(vivencia)
    remove.mockResolvedValue(undefined)
    serviceConstructorMock.mockImplementation(function () {
      return {
        create,
        getByTurma,
        getByAluno,
        getById,
        update,
        delete: remove,
      }
    })
  })

  it('derives school and teacher ownership from the authenticated actor', async () => {
    const response = await POST(request('http://test/api/vivencias', {
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
  })

  it('reads class narratives only after the class scope is authorized', async () => {
    const response = await GET(new NextRequest(
      `http://test/api/vivencias?turma_id=${TURMA_ID}&limit=10`,
    ))

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ data: [vivencia] })
    expect(getByTurma).toHaveBeenCalledWith(TURMA_ID, undefined, undefined)
  })

  it('passes student date bounds to the database query before limiting results', async () => {
    const response = await GET(new NextRequest(
      `http://test/api/vivencias?aluno_id=${STUDENT_ID}&data_inicio=2026-08-01&data_fim=2026-08-01&limit=50`,
    ))

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ data: [vivencia] })
    expect(getByAluno).toHaveBeenCalledWith(STUDENT_ID, '2026-08-01', '2026-08-01', 50)
  })

  it('rejects reversed date ranges', async () => {
    const response = await GET(new NextRequest(
      `http://test/api/vivencias?aluno_id=${STUDENT_ID}&data_inicio=2026-08-02&data_fim=2026-08-01`,
    ))

    expect(response.status).toBe(400)
    expect((await response.json()).code).toBe('VALIDATION_ERROR')
    expect(getByAluno).not.toHaveBeenCalled()
  })

  it('returns Vivências-specific authentication errors', async () => {
    actorMock.mockRejectedValue(new AttendanceAuthError(
      'UNAUTHENTICATED',
      'Autenticação obrigatória para acessar vivências',
    ))

    const response = await GET(new NextRequest(
      `http://test/api/vivencias?aluno_id=${STUDENT_ID}`,
    ))

    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toEqual({
      error: 'Autenticação obrigatória para acessar vivências',
      code: 'UNAUTHENTICATED',
    })
  })

  it('fails closed when the actor has no approved role', async () => {
    actorMock.mockResolvedValue({ userId: 'other', tipo_usuario: 'responsavel', escola_id: SCHOOL_ID })

    const response = await GET(new NextRequest(
      `http://test/api/vivencias?aluno_id=${STUDENT_ID}`,
    ))

    expect(response.status).toBe(403)
    expect((await response.json()).code).toBe('FORBIDDEN_ROLE')
  })

  it('uses the authenticated actor for edits and deletes', async () => {
    const id = vivencia.id
    const getResponse = await GET_BY_ID(
      new NextRequest(`http://test/api/vivencias/${id}`),
      { params: Promise.resolve({ id }) },
    )
    const updateResponse = await PUT(
      request(`http://test/api/vivencias/${id}`, {
        data_vivencia: '2026-08-19',
        descricao: 'A criança ampliou sua narrativa com os colegas.',
        professor_id: '99999999-9999-4999-8999-999999999999',
      }),
      { params: Promise.resolve({ id }) },
    )
    const deleteResponse = await DELETE(
      new NextRequest(`http://test/api/vivencias/${id}`),
      { params: Promise.resolve({ id }) },
    )

    expect(getResponse.status).toBe(200)
    expect(updateResponse.status).toBe(200)
    expect(update).toHaveBeenCalledWith(id, expect.objectContaining({
      data_vivencia: '2026-08-19',
      updated_by: TEACHER_ID,
    }))
    expect(deleteResponse.status).toBe(204)
    expect(remove).toHaveBeenCalledWith(id)
  })

  it('rejects future dates when editing', async () => {
    const futureDate = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10)
    const response = await PUT(
      request(`http://test/api/vivencias/${vivencia.id}`, { data_vivencia: futureDate }),
      { params: Promise.resolve({ id: vivencia.id }) },
    )

    expect(response.status).toBe(400)
    expect(update).not.toHaveBeenCalled()
  })
})
