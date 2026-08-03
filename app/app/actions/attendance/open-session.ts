/**
 * Opens the canonical attendance session for a class and date.
 *
 * The authenticated actor, school, and titular teacher come from server-side
 * rows. Client-supplied identity fields stay accepted only for old callers and
 * are ignored.
 */

'use server'

import { revalidatePath } from 'next/cache'
import type { Tables } from '@/lib/supabase'
import { logger } from '@/lib/logger'
import { createClient } from '@/lib/supabase/server'
import {
  assertCanRecordAttendance,
  assertTurmaWriteAccess,
  AttendanceAuthError,
  requireAttendanceActor,
} from '@/lib/services/attendance-auth'

interface OpenSessionParams {
  turma_id: string
  data_aula: string
  conteudo_programatico?: string
  /** @deprecated The server derives the professor from the actor and turma. */
  professor_id?: string
  /** @deprecated The server derives the school from the turma. */
  escola_id?: string
}

interface OpenSessionResult {
  success: boolean
  session?: Tables<'sessoes_aula'>
  error?: string
  code?: string
}

function isIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const parsed = new Date(`${value}T00:00:00.000Z`)
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
}

function calculateSaoPauloCutoff(dataAula: string): string {
  const [year, month, day] = dataAula.split('-').map(Number)
  const cutoffDay = process.env.EDUCA_E2E_MODE === 'true' ? day + 1 : day
  return new Date(Date.UTC(year, month - 1, cutoffDay, 21, 0, 0)).toISOString()
}

export async function openSessionAction(
  params: OpenSessionParams
): Promise<OpenSessionResult> {
  try {
    if (!params || !params.turma_id) {
      return { success: false, code: 'TURMA_REQUIRED', error: 'ID da turma é obrigatório' }
    }

    if (!isIsoDate(params.data_aula)) {
      return { success: false, code: 'DATE_INVALID', error: 'Data da aula inválida' }
    }

    const content = params.conteudo_programatico?.trim() || 'Chamada'
    if (content.length > 500) {
      return { success: false, code: 'CONTENT_TOO_LONG', error: 'Conteúdo da aula muito longo' }
    }

    const supabase = await createClient()
    const actor = await requireAttendanceActor(supabase)
    assertCanRecordAttendance(actor)

    const { data: turma, error: turmaError } = await supabase
      .from('turmas')
      .select('id, escola_id, professor_id, ativo')
      .eq('id', params.turma_id)
      .single()

    if (turmaError || !turma) {
      return { success: false, code: 'TURMA_NOT_FOUND', error: 'Turma não encontrada' }
    }

    assertTurmaWriteAccess(actor, turma)

    const professorId = turma.professor_id
    if (!professorId) {
      return {
        success: false,
        code: 'TURMA_WITHOUT_PROFESSOR',
        error: 'A turma não possui professor titular para abrir a chamada',
      }
    }

    const { data: existingSession, error: existingError } = await supabase
      .from('sessoes_aula')
      .select('id, status, data_aula')
      .eq('turma_id', turma.id)
      .eq('data_aula', params.data_aula)
      .in('status', ['PLANEJADA', 'ABERTA', 'planejada', 'aberta'])
      .limit(1)
      .maybeSingle()

    if (existingError && existingError.code !== 'PGRST116') {
      return {
        success: false,
        code: 'SESSION_LOOKUP_FAILED',
        error: `Erro ao verificar chamada existente: ${existingError.message}`,
      }
    }

    if (existingSession) {
      return {
        success: false,
        code: 'SESSION_ALREADY_OPEN',
        error: 'Já existe uma chamada aberta para esta turma nesta data',
      }
    }

    const { data: session, error: insertError } = await supabase
      .from('sessoes_aula')
      .insert({
        turma_id: turma.id,
        escola_id: turma.escola_id,
        professor_id: professorId,
        data_aula: params.data_aula,
        status: 'ABERTA',
        aberta_em: new Date().toISOString(),
        auto_fechamento_agendado: calculateSaoPauloCutoff(params.data_aula),
        conteudo_programatico: content,
      })
      .select()
      .single()

    if (insertError || !session) {
      logger.error('ATTENDANCE_SESSION_OPEN_FAILED', insertError ?? new Error('Sessão não retornada'), {
        metadata: { turmaId: turma.id, date: params.data_aula },
      })

      if (insertError?.code === '23505') {
        return {
          success: false,
          code: 'SESSION_ALREADY_OPEN',
          error: 'Já existe uma chamada aberta para esta turma nesta data',
        }
      }

      return {
        success: false,
        code: 'SESSION_OPEN_FAILED',
        error: insertError?.message || 'Não foi possível abrir a chamada',
      }
    }

    revalidatePath(`/dashboard/turmas/${turma.id}/chamada`)
    revalidatePath(`/dashboard/turmas/${turma.id}`)

    return { success: true, session }
  } catch (error) {
    if (error instanceof AttendanceAuthError) {
      return { success: false, code: error.code, error: error.message }
    }

    logger.error('ATTENDANCE_SESSION_OPEN_UNEXPECTED', error as Error, {
      metadata: { turmaId: params?.turma_id, date: params?.data_aula },
    })

    return {
      success: false,
      code: 'SESSION_OPEN_FAILED',
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    }
  }
}
