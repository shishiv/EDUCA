import type { Database } from '@/types/database'
import type { SupabaseClient } from '@supabase/supabase-js'
import { asPilotRpcClient } from '@/lib/pilot/pilot-rpc-client'
import type { WhatsAppSupabase } from '@/lib/notifications/whatsapp-database'

export type AuthorizedStudentProfile = Database['public']['Functions']['get_authorized_student_profiles']['Returns'][number]
export type AuthorizedGuardianProfile = Database['public']['Functions']['get_authorized_guardian_profiles']['Returns'][number]

type StudentProfileFilters = { studentId?: string; schoolId?: string }
type GuardianProfileFilters = { guardianId?: string; schoolId?: string }
type PrimaryGuardianSummary = Pick<AuthorizedGuardianProfile, 'id' | 'nome'>
type GuardianProfileClient = SupabaseClient<Database> | WhatsAppSupabase

export type StudentManagementProfile = AuthorizedStudentProfile & {
  responsavel?: PrimaryGuardianSummary
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
  client: SupabaseClient<Database>,
  filters: StudentProfileFilters = {},
): Promise<AuthorizedStudentProfile[]> {
  const { data, error } = await asPilotRpcClient(client).rpc(
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
  client: GuardianProfileClient,
  filters: GuardianProfileFilters = {},
): Promise<AuthorizedGuardianProfile[]> {
  const { data, error } = await asPilotRpcClient(client).rpc(
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
  filters: StudentProfileFilters = {},
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
      .select('aluno_id,responsavel_id,prioridade,responsaveis(id,nome)')
      .in('aluno_id', studentIds)
      .eq('ativo', true)
      .order('prioridade', { ascending: true }),
  ])
  if (enrollmentError) throw enrollmentError
  if (guardianError) throw guardianError

  const enrollmentsByStudent = new Map((enrollmentRows ?? []).map(row => [row.id, row.matriculas]))
  const guardiansByStudent = new Map<string, PrimaryGuardianSummary>()
  for (const link of guardianLinks ?? []) {
    if (link.responsaveis && !guardiansByStudent.has(link.aluno_id)) {
      guardiansByStudent.set(link.aluno_id, link.responsaveis)
    }
  }

  return profiles.map(profile => ({
    ...profile,
    responsavel: guardiansByStudent.get(profile.id),
    matriculas: enrollmentsByStudent.get(profile.id) ?? [],
  }))
}

export async function getPrimaryGuardianForStudent(
  client: SupabaseClient<Database>,
  studentId: string,
): Promise<AuthorizedGuardianProfile | null> {
  const { data: link, error } = await client
    .from('aluno_responsaveis')
    .select('responsavel_id')
    .eq('aluno_id', studentId)
    .eq('ativo', true)
    .order('prioridade', { ascending: true })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  if (!link) return null

  const [guardian] = await getAuthorizedGuardianProfiles(client, {
    guardianId: link.responsavel_id,
  })
  return guardian ?? null
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
