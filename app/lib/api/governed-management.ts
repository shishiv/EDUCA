import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

type ManagementClient = Pick<SupabaseClient<Database>, 'rpc'>
type ManagementFunctions = Database['public']['Functions']
type MutationReceipt = { audit_id: string }
type SchoolCreationReceipt = ManagementFunctions['create_governed_school']['Returns'][number]
type SchoolUpdateReceipt = ManagementFunctions['update_governed_school']['Returns'][number]
type SchoolDirectorReceipt = ManagementFunctions['assign_governed_school_director']['Returns'][number]
type ClassReceipt = ManagementFunctions['write_governed_turma']['Returns'][number]
type EnrollmentCreationReceipt = ManagementFunctions['create_governed_enrollment']['Returns'][number]
type EnrollmentUpdateReceipt = ManagementFunctions['update_governed_enrollment']['Returns'][number]

export interface GovernedSchoolInput {
  codigo: string
  diretorId?: string | null
  email?: string | null
  endereco?: string | null
  nome: string
  telefone?: string | null
  tipo: 'creche' | 'pre_escola' | 'fundamental'
}

export type GovernedSchoolChanges = Partial<{
  ativo: boolean
  codigo: string
  diretor_id: string | null
  email: string | null
  endereco: string | null
  nome: string
  telefone: string | null
  tipo: 'creche' | 'pre_escola' | 'fundamental'
}>

export type GovernedClassChanges = Partial<{
  ano_letivo: number
  ativo: boolean
  capacidade: number
  escola_id: string
  nome: string
  professor_id: string | null
  serie: string
  turno: 'matutino' | 'vespertino' | 'integral'
}>

async function requireReceipt<T extends MutationReceipt>(
  operation: PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
): Promise<T> {
  const { data, error } = await operation
  if (error) throw new Error(error.message)

  const receipt = data?.[0]
  if (!receipt?.audit_id.trim()) throw new Error('PILOT_MANAGEMENT_EMPTY_RESULT')
  return receipt
}

export async function createGovernedSchool(
  client: ManagementClient,
  input: GovernedSchoolInput,
): Promise<SchoolCreationReceipt> {
  return requireReceipt(client.rpc('create_governed_school', {
    p_nome: input.nome,
    p_codigo: input.codigo,
    p_tipo: input.tipo,
    p_diretor_id: input.diretorId ?? undefined,
    p_email: input.email ?? undefined,
    p_telefone: input.telefone ?? undefined,
    p_endereco: input.endereco ?? undefined,
  }))
}

export async function updateGovernedSchool(
  client: ManagementClient,
  schoolId: string,
  changes: GovernedSchoolChanges,
): Promise<SchoolUpdateReceipt> {
  return requireReceipt(client.rpc('update_governed_school', {
    p_school_id: schoolId,
    p_changes: changes,
  }))
}

export async function assignGovernedSchoolDirector(
  client: ManagementClient,
  schoolId: string,
  directorId: string | null,
): Promise<SchoolDirectorReceipt> {
  return requireReceipt(client.rpc('assign_governed_school_director', {
    p_school_id: schoolId,
    p_diretor_id: directorId ?? undefined,
  }))
}

export async function writeGovernedClass(
  client: ManagementClient,
  classId: string | null,
  changes: GovernedClassChanges,
): Promise<ClassReceipt> {
  return requireReceipt(client.rpc('write_governed_turma', {
    p_turma_id: classId ?? undefined,
    p_changes: changes,
  }))
}

export async function createGovernedEnrollment(
  client: ManagementClient,
  input: {
    alunoId: string
    anoLetivo: number
    dataMatricula: string
    observacoes?: string | null
    turmaId: string
  },
): Promise<EnrollmentCreationReceipt> {
  return requireReceipt(client.rpc('create_governed_enrollment', {
    p_aluno_id: input.alunoId,
    p_turma_id: input.turmaId,
    p_ano_letivo: input.anoLetivo,
    p_data_matricula: input.dataMatricula,
    p_observacoes: input.observacoes ?? undefined,
  }))
}

export async function updateGovernedEnrollment(
  client: ManagementClient,
  enrollmentId: string,
  situation: 'ativa' | 'transferida' | 'concluida' | 'cancelada',
  observations?: string | null,
): Promise<EnrollmentUpdateReceipt> {
  return requireReceipt(client.rpc('update_governed_enrollment', {
    p_matricula_id: enrollmentId,
    p_situacao: situation,
    p_observacoes: observations ?? undefined,
  }))
}
