/**
 * Student Admission - transactional student + enrollment + guardian creation via database RPC.  Requires authenticated actor with escola resolution.
 */
import type { Tables } from '@/lib/supabase'

export interface StudentAdmissionGuardianInput {
  nome: string
  telefone?: string
  email?: string
  grau_parentesco: string
}

export interface StudentAdmissionArgs {
  p_nome_completo: string
  p_data_nascimento: string
  p_sexo: 'M' | 'F'
  p_escola_id: string
  p_cpf?: string | null
  p_rg?: string | null
  p_email?: string | null
  p_telefone?: string | null
  p_endereco?: string | null
  p_nome_mae?: string | null
  p_nome_pai?: string | null
  p_necessidades_especiais?: string | null
  p_responsavel: StudentAdmissionGuardianInput | null
}

export type StudentAdmissionRow = Tables<'alunos'>

interface StudentAdmissionRpcError {
  code?: string
  details?: string
  hint?: string
  message: string
}

interface StudentAdmissionRpcClient {
  rpc(
    functionName: 'create_student_admission',
    args: StudentAdmissionArgs
  ): Promise<{
    data: StudentAdmissionRow[] | null
    error: StudentAdmissionRpcError | null
  }>
}

/** Bridges the generated client to the migration-owned admission RPC contract. */
export function asStudentAdmissionRpcClient(client: unknown): StudentAdmissionRpcClient {
  return client as StudentAdmissionRpcClient
}

/** Executes the student, guardian, and relationship write as one database call. */
export async function createStudentAdmission(
  client: unknown,
  args: StudentAdmissionArgs
): Promise<StudentAdmissionRow> {
  const { data, error } = await asStudentAdmissionRpcClient(client).rpc(
    'create_student_admission',
    args
  )

  if (error) throw error

  const student = data?.[0]
  if (!student) throw new Error('STUDENT_ADMISSION_EMPTY_RESULT')

  return student
}
