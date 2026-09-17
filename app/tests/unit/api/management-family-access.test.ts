import { createClient } from '@supabase/supabase-js'
import { describe, expect, it } from 'vitest'
import {
  getGuardianManagementProfiles,
  getPrimaryGuardianForStudent,
  getStudentManagementProfiles,
} from '@/lib/sensitive-family-access'
import type {
  AuthorizedGuardianProfile,
  AuthorizedStudentProfile,
} from '@/lib/sensitive-family-access'
import type { Database } from '@/types/database'

const SCHOOL_ID = 'school-a'

type EnrollmentRow = {
  id: string
  matriculas: Array<{
    situacao: string | null
    turmas: { nome: string; escolas: { nome: string } | null } | null
  }>
}

type StudentGuardianLink = {
  aluno_id: string
  responsavel_id: string
  prioridade: number
  ativo: boolean
  responsaveis: { id: string; nome: string }
}

type GuardianStudentLink = {
  responsavel_id: string
  ativo: boolean
  alunos: {
    id: string
    nome_completo: string
    data_nascimento: string
    sexo: string
    ativo: boolean | null
    matriculas: Array<{
      situacao: string | null
      turmas: {
        nome: string
        escola_id: string
        escolas: { nome: string } | null
      } | null
    }>
  }
}

type FamilyFixture = {
  students?: AuthorizedStudentProfile[]
  guardians?: AuthorizedGuardianProfile[]
  enrollmentRows?: EnrollmentRow[]
  studentLinks?: StudentGuardianLink[]
  guardianLinks?: GuardianStudentLink[]
}

function authorizedStudent(id: string, nomeCompleto: string, ativo = true): AuthorizedStudentProfile {
  return {
    ativo,
    cor_raca: 'nao_declarada',
    cpf: '',
    created_at: '2026-09-08T00:00:00Z',
    data_nascimento: '2018-01-01',
    email: '',
    endereco: 'Rua da Escola, 1',
    escola_id: SCHOOL_ID,
    id,
    necessidades_especiais: '',
    nome_completo: nomeCompleto,
    nome_mae: 'Mãe',
    nome_pai: '',
    responsavel_id: '',
    rg: '',
    sexo: 'F',
    telefone: '',
    tipo_deficiencia: [],
    transporte_escolar: false,
    zona_residencial: 'urbana',
  }
}

function authorizedGuardian(id: string, nome: string): AuthorizedGuardianProfile {
  return {
    ativo: true,
    cpf: '12345678901',
    created_at: '2026-09-08T00:00:00Z',
    data_nascimento: '1985-01-01',
    email: 'guardian@example.com',
    endereco: 'Rua da Família, 2',
    escola_id: SCHOOL_ID,
    escolaridade: 'medio_completo',
    estado_civil: 'solteiro',
    id,
    lgpd_consentimento: true,
    lgpd_data_consentimento: '2026-09-08T00:00:00Z',
    nacionalidade: 'brasileira',
    nome,
    orgao_emissor_rg: 'SSP',
    parentesco: 'mae',
    profissao: 'Professora',
    renda_familiar: 3000,
    rg: '1234567',
    telefone: '34999990000',
  }
}

function json<Value>(value: Value): Response {
  return new Response(JSON.stringify(value), { headers: { 'Content-Type': 'application/json' } })
}

function activeStudentLinks(request: Request, fixture: FamilyFixture): StudentGuardianLink[] {
  const url = new URL(request.url)
  const links = fixture.studentLinks ?? []
  const activeLinks = url.searchParams.get('ativo') === 'eq.true'
    ? links.filter(link => link.ativo)
    : links
  if (url.searchParams.get('order') === 'prioridade.asc') {
    return activeLinks.toSorted((left, right) => left.prioridade - right.prioridade)
  }
  return activeLinks
}

function familyLinkResponse(request: Request, fixture: FamilyFixture): Response {
  const url = new URL(request.url)
  const select = url.searchParams.get('select') ?? ''
  if (select.includes('responsaveis(id,nome)')) {
    return json(activeStudentLinks(request, fixture))
  }
  if (select.includes('alunos!inner')) {
    const links = fixture.guardianLinks ?? []
    return json(url.searchParams.get('ativo') === 'eq.true' ? links.filter(link => link.ativo) : links)
  }

  const studentId = url.searchParams.get('aluno_id')?.replace(/^eq\./, '')
  const [link] = activeStudentLinks(request, fixture).filter(candidate => candidate.aluno_id === studentId)
  return json(link ? { responsavel_id: link.responsavel_id } : null)
}

function familyClient(fixture: FamilyFixture, requests: Request[]) {
  return createClient<Database>('http://127.0.0.1:54321', 'synthetic-key', {
    auth: { autoRefreshToken: false, persistSession: false },
    global: {
      fetch: async (input, init) => {
        const request = new Request(input, init)
        requests.push(request)
        const path = new URL(request.url).pathname
        switch (path) {
          case '/rest/v1/rpc/get_authorized_student_profiles':
            return json(fixture.students ?? [])
          case '/rest/v1/rpc/get_authorized_guardian_profiles':
            return json(fixture.guardians ?? [])
          case '/rest/v1/alunos':
            return json(fixture.enrollmentRows ?? [])
          case '/rest/v1/aluno_responsaveis':
            return familyLinkResponse(request, fixture)
          default:
            throw new Error(`Unexpected synthetic request: ${request.method} ${path}`)
        }
      },
    },
  })
}

function requestFor(requests: Request[], path: string, selectFragment?: string): Request {
  const request = requests.find(candidate => {
    const url = new URL(candidate.url)
    return url.pathname === path && (!selectFragment || url.searchParams.get('select')?.includes(selectFragment))
  })
  if (!request) throw new Error(`Expected request for ${path}`)
  return request
}

describe('management family reads', () => {
  it('retains every authorized student and selects the first active canonical guardian by priority', async () => {
    const requests: Request[] = []
    const client = familyClient({
      students: [
        authorizedStudent('unenrolled', 'Active Unenrolled'),
        authorizedStudent('enrolled', 'Active Enrolled'),
        authorizedStudent('inactive', 'Inactive', false),
      ],
      enrollmentRows: [
        { id: 'unenrolled', matriculas: [] },
        { id: 'enrolled', matriculas: [{ situacao: 'ativa', turmas: { nome: 'A', escolas: { nome: 'School' } } }] },
        { id: 'inactive', matriculas: [] },
      ],
      studentLinks: [
        { aluno_id: 'unenrolled', responsavel_id: 'guardian-b', prioridade: 2, ativo: true, responsaveis: { id: 'guardian-b', nome: 'Second Guardian' } },
        { aluno_id: 'unenrolled', responsavel_id: 'guardian-a', prioridade: 1, ativo: true, responsaveis: { id: 'guardian-a', nome: 'Canonical Guardian' } },
        { aluno_id: 'unenrolled', responsavel_id: 'guardian-old', prioridade: 0, ativo: false, responsaveis: { id: 'guardian-old', nome: 'Inactive Guardian' } },
      ],
    }, requests)

    const result = await getStudentManagementProfiles(client, { schoolId: SCHOOL_ID })

    expect(result.map(student => student.id)).toEqual(['unenrolled', 'enrolled', 'inactive'])
    expect(result[0].responsavel).toEqual({ id: 'guardian-a', nome: 'Canonical Guardian' })
    expect(result[1].matriculas).toHaveLength(1)
    expect(new Set(result.map(student => student.id)).size).toBe(result.length)

    const linkRequest = requestFor(requests, '/rest/v1/aluno_responsaveis', 'responsaveis(id,nome)')
    const linkUrl = new URL(linkRequest.url)
    expect(linkUrl.searchParams.get('ativo')).toBe('eq.true')
    expect(linkUrl.searchParams.get('order')).toBe('prioridade.asc')
  })

  it('returns only active canonical student links and stops before link reads when guardian access is denied', async () => {
    const allowedRequests: Request[] = []
    const allowed = familyClient({
      guardians: [authorizedGuardian('guardian-a', 'Guardian A')],
      guardianLinks: [{
        responsavel_id: 'guardian-a',
        ativo: true,
        alunos: {
          id: 'student-a', nome_completo: 'Student A', data_nascimento: '2018-01-01', sexo: 'F', ativo: false, matriculas: [],
        },
      }, {
        responsavel_id: 'guardian-a',
        ativo: false,
        alunos: {
          id: 'historical-student', nome_completo: 'Historical Student', data_nascimento: '2017-01-01', sexo: 'M', ativo: true, matriculas: [],
        },
      }],
    }, allowedRequests)
    const deniedRequests: Request[] = []
    const denied = familyClient({ guardians: [] }, deniedRequests)

    const [guardian] = await getGuardianManagementProfiles(allowed, { guardianId: 'guardian-a' })
    const deniedResult = await getGuardianManagementProfiles(denied, { guardianId: 'guardian-b' })

    expect(guardian.alunos.map(student => student.id)).toEqual(['student-a'])
    expect(guardian.alunos[0].ativo).toBe(false)
    expect(guardian.alunos_count).toBe(1)
    expect(requestFor(allowedRequests, '/rest/v1/aluno_responsaveis', 'alunos!inner')).toBeDefined()
    expect(deniedResult).toEqual([])
    expect(deniedRequests.map(request => new URL(request.url).pathname)).toEqual([
      '/rest/v1/rpc/get_authorized_guardian_profiles',
    ])
  })

  it('loads primary guardian sensitive fields only through the authorized projection', async () => {
    const requests: Request[] = []
    const client = familyClient({
      guardians: [authorizedGuardian('guardian-a', 'Guardian A')],
      studentLinks: [
        { aluno_id: 'student-a', responsavel_id: 'guardian-old', prioridade: 0, ativo: false, responsaveis: { id: 'guardian-old', nome: 'Inactive Guardian' } },
        { aluno_id: 'student-a', responsavel_id: 'guardian-a', prioridade: 1, ativo: true, responsaveis: { id: 'guardian-a', nome: 'Guardian A' } },
      ],
    }, requests)

    const guardian = await getPrimaryGuardianForStudent(client, 'student-a')

    expect(guardian).toMatchObject({
      id: 'guardian-a',
      cpf: '12345678901',
      telefone: '34999990000',
      endereco: 'Rua da Família, 2',
      profissao: 'Professora',
    })
    const rpcRequest = requestFor(requests, '/rest/v1/rpc/get_authorized_guardian_profiles')
    expect(await rpcRequest.clone().text()).toContain('"p_guardian_id":"guardian-a"')
  })

  it('does not expose a linked guardian when the authorized projection denies it', async () => {
    const requests: Request[] = []
    const client = familyClient({
      guardians: [],
      studentLinks: [
        { aluno_id: 'student-a', responsavel_id: 'guardian-denied', prioridade: 1, ativo: true, responsaveis: { id: 'guardian-denied', nome: 'Denied Guardian' } },
      ],
    }, requests)

    await expect(getPrimaryGuardianForStudent(client, 'student-a')).resolves.toBeNull()
    expect(requestFor(requests, '/rest/v1/rpc/get_authorized_guardian_profiles')).toBeDefined()
  })
})
