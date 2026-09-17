/**
 * Student Admission - transactional student + enrollment + guardian creation via database RPC.  Requires authenticated actor with escola resolution.
 */
import type { Tables } from '@/lib/supabase'
import type { Database } from '@/types/database'
import type { SupabaseClient } from '@supabase/supabase-js'

export type StudentAdmissionArgs = Database['public']['Functions']['create_student_admission']['Args']

export type StudentAdmissionRow = Tables<'alunos'>

/** Executes the student, guardian, and relationship write as one database call. */
export async function createStudentAdmission(
  client: SupabaseClient<Database>,
  args: StudentAdmissionArgs
): Promise<StudentAdmissionRow> {
  const { data, error } = await client.rpc(
    'create_student_admission',
    args
  )

  if (error) throw error

  const student = data?.[0]
  if (!student) throw new Error('STUDENT_ADMISSION_EMPTY_RESULT')

  return student
}
