import { describe, expect, it } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import {
  getGuardianManagementProfiles,
  getStudentManagementProfiles,
} from '@/lib/sensitive-family-access'

type Result = { data: unknown[]; error: null }

class Query {
  private rows: unknown[]

  constructor(
    result: Result,
    private readonly calls: string[],
  ) {
    this.rows = result.data
  }

  select(value: string) {
    this.calls.push(value)
    return this
  }

  in() {
    return this
  }

  eq(column: string, value: unknown) {
    this.rows = this.rows.filter(row => (row as Record<string, unknown>)[column] === value)
    return this
  }

  order() {
    return this
  }

  then(resolve: (result: Result) => unknown) {
    return Promise.resolve(resolve({ data: this.rows, error: null }))
  }
}

function clientFor(input: {
  students?: unknown[]
  guardians?: unknown[]
  studentRows?: unknown[]
  links?: unknown[]
}) {
  const calls: string[] = []
  const client = {
    rpc: async (name: string) => ({
      data: name === 'get_authorized_student_profiles' ? input.students ?? [] : input.guardians ?? [],
      error: null,
    }),
    from: (table: string) => {
      calls.push(table)
      return new Query(
        { data: table === 'alunos' ? input.studentRows ?? [] : input.links ?? [], error: null },
        calls,
      )
    },
  } as unknown as SupabaseClient<Database>
  return { client, calls }
}

describe('management family reads', () => {
  it('keeps active unenrolled and enrolled students once while retaining inactive rows', async () => {
    const { client, calls } = clientFor({
      students: [
        { id: 'unenrolled', nome_completo: 'Active Unenrolled', ativo: true },
        { id: 'enrolled', nome_completo: 'Active Enrolled', ativo: true },
        { id: 'inactive', nome_completo: 'Inactive', ativo: false },
      ],
      studentRows: [
        { id: 'unenrolled', matriculas: [] },
        { id: 'enrolled', matriculas: [{ situacao: 'ativa', turmas: { nome: 'A', escolas: { nome: 'School' } } }] },
        { id: 'inactive', matriculas: [] },
      ],
      links: [{ aluno_id: 'unenrolled', prioridade: 1, ativo: true, responsaveis: { nome: 'Canonical Guardian' } }],
    })

    const result = await getStudentManagementProfiles(client, { schoolId: 'school-a' })

    expect(result.map(student => student.id)).toEqual(['unenrolled', 'enrolled', 'inactive'])
    expect(result[0].responsaveis?.nome).toBe('Canonical Guardian')
    expect(result[1].matriculas).toHaveLength(1)
    expect(new Set(result.map(student => student.id)).size).toBe(result.length)
    expect(calls.join('\n')).toContain('aluno_responsaveis')
  })

  it('uses active canonical links and stops before link reads when the guardian is denied', async () => {
    const allowed = clientFor({
      guardians: [{ id: 'guardian-a', nome: 'Guardian A' }],
      links: [{
        responsavel_id: 'guardian-a',
        ativo: true,
        alunos: {
          id: 'student-a',
          nome_completo: 'Student A',
          data_nascimento: '2018-01-01',
          sexo: 'F',
          ativo: false,
          matriculas: [],
        },
      }, {
        responsavel_id: 'guardian-a',
        ativo: false,
        alunos: {
          id: 'historical-student',
          nome_completo: 'Historical Student',
          data_nascimento: '2017-01-01',
          sexo: 'M',
          ativo: true,
          matriculas: [],
        },
      }],
    })
    const denied = clientFor({ guardians: [] })

    const [guardian] = await getGuardianManagementProfiles(allowed.client, { guardianId: 'guardian-a' })
    const deniedResult = await getGuardianManagementProfiles(denied.client, { guardianId: 'guardian-b' })

    expect(guardian.alunos.map(student => student.id)).toEqual(['student-a'])
    expect(guardian.alunos[0].ativo).toBe(false)
    expect(guardian.alunos_count).toBe(1)
    expect(allowed.calls.join('\n')).toContain('aluno_responsaveis')
    expect(deniedResult).toEqual([])
    expect(denied.calls).toEqual([])
  })
})
