/**
 * Mark Attendance - Server Action
 *
 * Marks or updates attendance for a single student in a session.
 * Validates session is editable before marking (not locked).
 * Supports toggle: can update existing record if already marked.
 *
 * Performance Target: <1s per student (including database round trip)
 * Brazilian Compliance: "não existe o esquecer" - prevents locked modifications
 */

'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

interface MarkAttendanceParams {
  sessao_aula_id: string
  aluno_id: string
  presente: boolean
  data: string // YYYY-MM-DD format
}

interface MarkAttendanceResult {
  success: boolean
  record?: any
  error?: string
}

export async function markAttendanceAction(
  params: MarkAttendanceParams
): Promise<MarkAttendanceResult> {
  try {
    // Validate required parameters
    if (!params.sessao_aula_id) {
      return {
        success: false,
        error: 'ID da sessão é obrigatório',
      }
    }

    if (!params.aluno_id) {
      return {
        success: false,
        error: 'ID do aluno é obrigatório',
      }
    }

    if (!params.data) {
      return {
        success: false,
        error: 'Data é obrigatória',
      }
    }

    const supabase = await createClient()

    // Check if session is editable (calls database function)
    const { data: isEditable, error: checkError } = await supabase.rpc(
      'is_session_editable',
      {
        session_id: params.sessao_aula_id,
      }
    )

    if (checkError) {
      return {
        success: false,
        error: `Erro ao verificar sessão: ${checkError.message}`,
      }
    }

    if (!isEditable) {
      return {
        success: false,
        error:
          'Frequência já finalizada. Não existe o esquecer. (Sessão bloqueada)',
      }
    }

    // Upsert attendance record (insert or update if exists)
    const { data: attendanceRecord, error: upsertError } = await supabase
      .from('frequencia')
      .upsert(
        {
          sessao_aula_id: params.sessao_aula_id,
          aluno_id: params.aluno_id,
          presente: params.presente,
          data: params.data,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'sessao_aula_id,aluno_id,data', // Unique constraint
        }
      )
      .select()
      .single()

    if (upsertError) {
      console.error('Erro ao marcar frequência:', upsertError)
      return {
        success: false,
        error: `Erro ao salvar frequência: ${upsertError.message}`,
      }
    }

    // Revalidate relevant pages
    revalidatePath('/dashboard/frequencia')

    return {
      success: true,
      record: attendanceRecord,
    }
  } catch (error) {
    console.error('Erro inesperado ao marcar frequência:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    }
  }
}