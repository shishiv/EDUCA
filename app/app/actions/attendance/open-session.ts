/**
 * Open Attendance Session - Server Action
 *
 * Creates a new attendance session for a class (turma) on a specific date.
 * Validates that no duplicate session exists for the same day.
 * Sets auto_fechamento_agendado to 18:00 São Paulo time.
 *
 * Authorization (issue #30):
 * - resolves the authenticated actor from the server session
 * - professor: opens only own turmas; the session's professor_id is the actor
 * - diretor: opens only turmas of the own escola; the session's professor_id
 *   is the turma's assigned professor
 * - client-supplied `professor_id` and `escola_id` are NEVER trusted
 *
 * Brazilian Compliance: Implements three-phase workflow (planning → attendance)
 */

'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { logger } from '@/lib/logger'
import {
  assertCanRecordAttendance,
  assertTurmaWriteAccess,
  AttendanceAuthError,
  requireAttendanceActor,
} from '@/lib/services/attendance-auth'

interface OpenSessionParams {
  turma_id: string
  // Deprecated: kept for call-site compatibility, ignored for authorization.
  // professor_id and escola_id are derived from the authenticated actor and
  // the turma row, never from the client.
  professor_id?: string
  escola_id?: string
  data_aula: string // YYYY-MM-DD format
  conteudo_programatico: string
}

interface OpenSessionResult {
  success: boolean
  session?: any
  error?: string
  code?: string
}

export async function openSessionAction(
  params: OpenSessionParams
): Promise<OpenSessionResult> {
  try {
    // Validate required parameters
    if (!params.turma_id) {
      return {
        success: false,
        error: 'ID da turma é obrigatório',
      }
    }

    if (!params.data_aula) {
      return {
        success: false,
        error: 'Data da aula e obrigatoria',
      }
    }

    if (!params.conteudo_programatico) {
      return {
        success: false,
        error: 'Conteudo programatico e obrigatorio',
      }
    }

    const supabase = await createClient()

    // Resolve the authenticated actor from the server session (issue #30).
    const actor = await requireAttendanceActor(supabase)
    assertCanRecordAttendance(actor)

    // Load the turma and assert access. Identity fields are derived from the
    // turma row and the actor; the client-supplied professor_id/escola_id are
    // ignored.
    const { data: turma, error: turmaError } = await supabase
      .from('turmas')
      .select('id, escola_id, professor_id, ativo')
      .eq('id', params.turma_id)
      .single()

    if (turmaError || !turma) {
      return {
        success: false,
        code: 'TURMA_NOT_FOUND',
        error: 'Turma não encontrada',
      }
    }

    assertTurmaWriteAccess(actor, turma)

    // The session always belongs to the turma's assigned professor.
    // A diretor may open a session on behalf of the class teacher, but the
    // teacher's identity still comes from the turma row, never from the client.
    const professorId =
      actor.tipo_usuario === 'professor' ? actor.userId : turma.professor_id

    if (!professorId) {
      return {
        success: false,
        code: 'TURMA_WITHOUT_PROFESSOR',
        error: 'A turma não possui professor designado para abrir a sessão',
      }
    }

    const escolaId = turma.escola_id

    // Check if session already exists for this turma on this date
    const { data: existingSession, error: checkError } = await supabase
      .from('sessoes_aula')
      .select('id, status, data_aula')
      .eq('turma_id', params.turma_id)
      .eq('data_aula', params.data_aula)
      .in('status', ['PLANEJADA', 'ABERTA', 'aberta'])
      .single()

    if (checkError && checkError.code !== 'PGRST116') {
      // PGRST116 = no rows returned (expected for new session)
      return {
        success: false,
        error: `Erro ao verificar sessão existente: ${checkError.message}`,
      }
    }

    if (existingSession) {
      return {
        success: false,
        error: `Já existe uma aula aberta para esta turma hoje (${new Date(
          existingSession.data_aula
        ).toLocaleDateString('pt-BR')})`,
      }
    }

    // Calculate auto-closure time: 18:00 São Paulo time on session date
    const sessionDate = new Date(params.data_aula + 'T00:00:00')
    const cutoffTime = new Date(
      sessionDate.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' })
    )
    cutoffTime.setHours(18, 0, 0, 0)

    // Create new session with identities derived from auth + turma
    const { data: newSession, error: insertError } = await supabase
      .from('sessoes_aula')
      .insert({
        turma_id: params.turma_id,
        professor_id: professorId,
        escola_id: escolaId,
        data_aula: params.data_aula,
        status: 'aberta',
        aberta_em: new Date().toISOString(),
        auto_fechamento_agendado: cutoffTime.toISOString(),
        conteudo_programatico: params.conteudo_programatico,
      })
      .select()
      .single()

    if (insertError) {
      logger.error('Erro ao criar sessão', insertError, {
        metadata: {
          turmaId: params.turma_id,
          professorId,
          dataAula: params.data_aula
        }
      })
      return {
        success: false,
        error: `Erro ao abrir aula: ${insertError.message}`,
      }
    }

    // Revalidate attendance pages
    revalidatePath('/dashboard/frequencia')
    revalidatePath(`/dashboard/turmas/${params.turma_id}`)

    return {
      success: true,
      session: newSession,
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

    logger.error('Erro inesperado ao abrir sessão', error as Error, {
      metadata: {
        turmaId: params.turma_id,
        professorId: params.professor_id
      }
    })
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    }
  }
}
