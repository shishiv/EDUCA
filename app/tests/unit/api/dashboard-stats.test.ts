import { describe, expect, it } from 'vitest'
import { createDashboardStatsApi } from '@/lib/api/dashboard-stats'

interface Row {
  [key: string]: unknown
}

class Query implements PromiseLike<{ data: Row[] | null; error: null; count: number | null }> {
  private filters: Array<(row: Row) => boolean> = []
  private head = false
  private countRequested = false
  private start = 0
  private end = Number.POSITIVE_INFINITY

  constructor(private rows: Row[]) {}

  select(_columns: string, options?: { count?: string; head?: boolean }) {
    this.head = options?.head ?? false
    this.countRequested = Boolean(options?.count)
    return this
  }

  eq(column: string, value: unknown) {
    this.filters.push(row => row[column] === value)
    return this
  }

  in(column: string, values: unknown[]) {
    this.filters.push(row => values.includes(row[column]))
    return this
  }

  not(column: string, operator: string, value: unknown) {
    if (operator === 'is') this.filters.push(row => row[column] !== value)
    return this
  }

  gte(column: string, value: unknown) {
    this.filters.push(row => String(row[column]) >= String(value))
    return this
  }

  lte(column: string, value: unknown) {
    this.filters.push(row => String(row[column]) <= String(value))
    return this
  }

  order() {
    return this
  }

  range(start: number, end: number) {
    this.start = start
    this.end = end
    return this
  }

  then<TResult1 = { data: Row[] | null; error: null; count: number | null }, TResult2 = never>(
    onfulfilled?: ((value: { data: Row[] | null; error: null; count: number | null }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    const rows = this.rows.filter(row => this.filters.every(filter => filter(row)))
    const result = {
      data: this.head ? null : rows.slice(this.start, this.end + 1),
      error: null,
      count: this.countRequested ? rows.length : null,
    }
    return Promise.resolve(result).then(onfulfilled, onrejected)
  }
}

const schoolA = '00000000-0000-0000-0000-000000000001'
const schoolB = '00000000-0000-0000-0000-000000000002'

function createSyntheticClient() {
  const data: Record<string, Row[]> = {
    escolas: [
      { id: schoolA, ativo: true },
      { id: schoolB, ativo: true },
    ],
    turmas: [
      { id: 'class-current-a', escola_id: schoolA, ano_letivo: 2027, professor_id: 'teacher-a', ativo: true },
      { id: 'class-prior-a', escola_id: schoolA, ano_letivo: 2026, professor_id: 'teacher-prior', ativo: true },
      { id: 'class-current-b', escola_id: schoolB, ano_letivo: 2027, professor_id: 'teacher-b', ativo: true },
    ],
    matriculas: [
      { id: 'enrollment-a-1', aluno_id: 'student-a-1', turma_id: 'class-current-a', ano_letivo: 2027, situacao: 'ativa' },
      { id: 'enrollment-a-2', aluno_id: 'student-a-2', turma_id: 'class-current-a', ano_letivo: 2027, situacao: 'ativa' },
      { id: 'enrollment-prior-a', aluno_id: 'student-prior', turma_id: 'class-prior-a', ano_letivo: 2026, situacao: 'ativa' },
      { id: 'enrollment-b', aluno_id: 'student-b', turma_id: 'class-current-b', ano_letivo: 2027, situacao: 'ativa' },
    ],
    users: [
      { id: 'teacher-a', tipo_usuario: 'professor', ativo: true },
      { id: 'teacher-prior', tipo_usuario: 'professor', ativo: true },
      { id: 'teacher-b', tipo_usuario: 'professor', ativo: true },
    ],
    frequencia: [
      { id: 'attendance-a-1', matricula_id: 'enrollment-a-1', sessao_id: 'session-a-1', data_aula: '2027-02-03', presente: true, status_presenca: 'PRESENTE', justificativa: null },
      { id: 'attendance-a-2', matricula_id: 'enrollment-a-2', sessao_id: 'session-a-2', data_aula: '2027-02-03', presente: false, status_presenca: 'FALTA', justificativa: null },
      { id: 'attendance-prior-a', matricula_id: 'enrollment-prior-a', sessao_id: 'session-prior-a', data_aula: '2026-06-03', presente: true, status_presenca: 'PRESENTE', justificativa: null },
      { id: 'attendance-b', matricula_id: 'enrollment-b', sessao_id: 'session-b', data_aula: '2027-02-03', presente: true, status_presenca: 'PRESENTE', justificativa: null },
    ],
  }

  return { from: (table: string) => new Query(data[table] ?? []) }
}

describe('dashboard stats', () => {
  const academicYear = {
    year: 2027,
    startDate: '2027-01-01',
    endDate: '2027-12-31',
    configured: true,
  }

  it('excludes historical classes and enrollments from current-year totals', async () => {
    const service = createDashboardStatsApi(createSyntheticClient() as never)

    await expect(service.getStats({ escolaId: schoolA, academicYear })).resolves.toEqual({
      totalAlunos: 2,
      totalEscolas: 1,
      totalTurmas: 1,
      totalProfessores: 1,
      frequenciaGeral: 50,
    })
  })

  it('does not mix another school into current-year totals', async () => {
    const service = createDashboardStatsApi(createSyntheticClient() as never)

    await expect(service.getStats({ escolaId: schoolB, academicYear })).resolves.toEqual({
      totalAlunos: 1,
      totalEscolas: 1,
      totalTurmas: 1,
      totalProfessores: 1,
      frequenciaGeral: 100,
    })
  })
})
