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
import { logger } from '@/lib/logger'

interface MarkAttendanceParams {
  sessao_id: string
  matricula_id: string
  presente: boolean
  data_aula: string // YYYY-MM-DD format
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
    if (!params.sessao_id) {
      return {
        success: false,
        error: 'ID da sessao e obrigatorio',
      }
    }

    if (!params.matricula_id) {
      return {
        success: false,
        error: 'ID da matricula e obrigatorio',
      }
    }

    if (!params.data_aula) {
      return {
        success: false,
        error: 'Data e obrigatoria',
      }
    }

    const supabase = await createClient()

    // Check if session is editable (calls database function)
    const { data: isEditable, error: checkError } = await supabase.rpc(
      'is_session_editable',
      {
        session_id: params.sessao_id,
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
          sessao_id: params.sessao_id,
          matricula_id: params.matricula_id,
          presente: params.presente,
          data_aula: params.data_aula,
        },
        {
          onConflict: 'matricula_id,data_aula', // Unique constraint
        }
      )
      .select()
      .single()

    if (upsertError) {
      logger.error('Erro ao marcar frequencia', upsertError, {
        metadata: {
          sessaoId: params.sessao_id,
          matriculaId: params.matricula_id,
          dataAula: params.data_aula
        }
      })
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
    logger.error('Erro inesperado ao marcar frequencia', error as Error, {
      metadata: {
        sessaoId: params.sessao_id,
        matriculaId: params.matricula_id
      }
    })
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    }
  }
}