import type { Aluno, Responsavel } from '@/lib/supabase'
import type { Database } from '@/types/database'
import type { SupabaseClient } from '@supabase/supabase-js'
import { asPilotRpcClient } from '@/lib/pilot/pilot-rpc-client'

export type AuthorizedStudentProfile = Omit<Aluno, 'bolsa_familia' | 'nis'> & {
  escola_id: string
}

export type AuthorizedGuardianProfile = Omit<Responsavel, 'cpf'> & {
  cpf: string | null
  escola_id: string
}

export type StudentManagementProfile = AuthorizedStudentProfile & {
  responsaveis?: { nome: string }
  matriculas?: Array<{
    situacao: string | null
    turmas: {
      nome: string
      escolas: { nome: string } | null
    } | null
  }>
}

export type GuardianManagementProfile = AuthorizedGuardianProfile & {
  alunos: Array<{
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
  }>
  alunos_count: number
}

export async function getAuthorizedStudentProfiles(
  client: unknown,
  filters: { studentId?: string; schoolId?: string } = {},
): Promise<AuthorizedStudentProfile[]> {
  const { data, error } = await asPilotRpcClient(client).rpc<AuthorizedStudentProfile[]>(
    'get_authorized_student_profiles',
    {
      p_student_id: filters.studentId ?? null,
      p_school_id: filters.schoolId ?? null,
    },
  )
  if (error) throw new Error(error.message)
  return data ?? []
}

export async function getAuthorizedGuardianProfiles(
  client: unknown,
  filters: { guardianId?: string; schoolId?: string } = {},
): Promise<AuthorizedGuardianProfile[]> {
  const { data, error } = await asPilotRpcClient(client).rpc<AuthorizedGuardianProfile[]>(
    'get_authorized_guardian_profiles',
    {
      p_guardian_id: filters.guardianId ?? null,
      p_school_id: filters.schoolId ?? null,
    },
  )
  if (error) throw new Error(error.message)
  return data ?? []
}

export async function getStudentManagementProfiles(
  client: SupabaseClient<Database>,
  filters: { schoolId?: string } = {},
): Promise<StudentManagementProfile[]> {
  const profiles = await getAuthorizedStudentProfiles(client, filters)
  const studentIds = profiles.map(profile => profile.id)
  if (studentIds.length === 0) return []

  const [{ data: enrollmentRows, error: enrollmentError }, { data: guardianLinks, error: guardianError }] = await Promise.all([
    client
      .from('alunos')
      .select(`
        id,
        matriculas (
          situacao,
          turmas (
            nome,
            escolas (nome)
          )
        )
      `)
      .in('id', studentIds),
    client
      .from('aluno_responsaveis')
      .select('aluno_id,prioridade,responsaveis(nome)')
      .in('aluno_id', studentIds)
      .eq('ativo', true)
      .order('prioridade', { ascending: true }),
  ])
  if (enrollmentError) throw enrollmentError
  if (guardianError) throw guardianError

  const enrollmentsByStudent = new Map((enrollmentRows ?? []).map(row => [row.id, row.matriculas]))
  const guardiansByStudent = new Map<string, { nome: string }>()
  for (const link of guardianLinks ?? []) {
    if (link.responsaveis && !guardiansByStudent.has(link.aluno_id)) {
      guardiansByStudent.set(link.aluno_id, link.responsaveis)
    }
  }

  return profiles.map(profile => ({
    ...profile,
    responsaveis: guardiansByStudent.get(profile.id),
    matriculas: enrollmentsByStudent.get(profile.id) ?? [],
  }))
}

export async function getGuardianManagementProfiles(
  client: SupabaseClient<Database>,
  filters: { guardianId?: string; schoolId?: string } = {},
): Promise<GuardianManagementProfile[]> {
  const profiles = await getAuthorizedGuardianProfiles(client, filters)
  const guardianIds = profiles.map(profile => profile.id)
  if (guardianIds.length === 0) return []

  const { data: links, error } = await client
    .from('aluno_responsaveis')
    .select(`
      responsavel_id,
      alunos!inner (
        id,
        nome_completo,
        data_nascimento,
        sexo,
        ativo,
        matriculas (
          situacao,
          turmas (
            nome,
            escola_id,
            escolas (nome)
          )
        )
      )
    `)
    .in('responsavel_id', guardianIds)
    .eq('ativo', true)
  if (error) throw error

  const studentsByGuardian = new Map<string, GuardianManagementProfile['alunos']>()
  for (const link of links ?? []) {
    if (!link.alunos) continue
    const students = studentsByGuardian.get(link.responsavel_id) ?? []
    students.push(link.alunos)
    studentsByGuardian.set(link.responsavel_id, students)
  }

  return profiles.map(profile => {
    const alunos = studentsByGuardian.get(profile.id) ?? []
    return { ...profile, alunos, alunos_count: alunos.length }
  })
}
