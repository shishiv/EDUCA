/**
 * Mark Attendance - Server Action
 *
 * Marks or updates attendance for a single student in a session.
 * Validates session is editable before marking (not locked).
 * Supports toggle: can update existing record if already marked.
 *
 * Authorization (issue #30):
 * - resolves the authenticated actor from the server session
 * - only professor (own sessions) and diretor (own escola) can mark
 * - `professor_id` and `marcado_por` come from the actor/session, never from
 *   the client
 *
 * Performance Target: <1s per student (including database round trip)
 * Brazilian Compliance: "não existe o esquecer" - prevents locked modifications
 */

'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { logger } from '@/lib/logger'
import {
  assertCanRecordAttendance,
  assertMatriculaInTurma,
  assertSessionWriteAccess,
  AttendanceAuthError,
  requireAttendanceActor,
} from '@/lib/services/attendance-auth'

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
  code?: string
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

    // Resolve the authenticated actor from the server session (issue #30).
    const actor = await requireAttendanceActor(supabase)
    assertCanRecordAttendance(actor)

    // Load the session and assert ownership: the client-supplied sessao_id
    // must belong to the actor (professor) or to the actor's escola (diretor).
    const { data: session, error: sessionError } = await supabase
      .from('sessoes_aula')
      .select('id, turma_id, professor_id, escola_id, status, data_aula')
      .eq('id', params.sessao_id)
      .single()

    if (sessionError || !session) {
      return {
        success: false,
        code: 'SESSION_NOT_FOUND',
        error: 'Sessão de aula não encontrada',
      }
    }

    assertSessionWriteAccess(actor, {
      id: session.id,
      professor_id: session.professor_id,
      escola_id: session.escola_id,
    })

    // Assert the student's matricula belongs to the session's turma.
    // Prevents marking students from other classes into this session.
    const { data: matricula } = await supabase
      .from('matriculas')
      .select('id, turma_id')
      .eq('id', params.matricula_id)
      .single()

    if (!matricula) {
      return {
        success: false,
        code: 'MATRICULA_NOT_FOUND',
        error: 'Matrícula não encontrada',
      }
    }

    assertMatriculaInTurma(matricula, session.turma_id)

    // The attendance date must be the session's own class date: a client
    // cannot attach attendance rows with a forged date to this session.
    if (params.data_aula !== session.data_aula) {
      return {
        success: false,
        code: 'DATA_MISMATCH',
        error: 'Data da frequência não corresponde à data da sessão de aula',
      }
    }

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

    // Upsert attendance record (insert or update if exists).
    // professor_id is the session owner (never client-supplied); marcado_por
    // records who performed the action.
    const { data: attendanceRecord, error: upsertError } = await supabase
      .from('frequencia')
      .upsert(
        {
          sessao_id: params.sessao_id,
          matricula_id: params.matricula_id,
          presente: params.presente,
          data_aula: params.data_aula,
          professor_id: session.professor_id,
          marcado_por: actor.userId,
          marcado_em: new Date().toISOString(),
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
    // Expected authorization failures are returned to the caller as-is.
    if (error instanceof AttendanceAuthError) {
      return {
        success: false,
        code: error.code,
        error: error.message,
      }
    }

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
