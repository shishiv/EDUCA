import type { Aluno, Responsavel } from '@/lib/supabase'
import { asPilotRpcClient } from '@/lib/pilot/pilot-rpc-client'

export type AuthorizedStudentProfile = Omit<Aluno, 'bolsa_familia' | 'nis'> & {
  escola_id: string
}

export type AuthorizedGuardianProfile = Omit<Responsavel, 'cpf'> & {
  cpf: string | null
  escola_id: string
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
