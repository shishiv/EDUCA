/**
 * Open Attendance Session - Server Action
 *
 * Creates a new attendance session for a class (turma) on a specific date.
 * Validates that no duplicate session exists for the same day.
 * Sets auto_fechamento_agendado to 18:00 São Paulo time.
 *
 * Brazilian Compliance: Implements three-phase workflow (planning → attendance)
 * Security: RLS policies enforce teacher can only create for their own turmas
 */

'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

interface OpenSessionParams {
  turma_id: string
  professor_id: string
  data_aula: string // YYYY-MM-DD format
  conteudo_programatico?: string
}

interface OpenSessionResult {
  success: boolean
  session?: any
  error?: string
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

    if (!params.professor_id) {
      return {
        success: false,
        error: 'ID do professor é obrigatório',
      }
    }

    if (!params.data_aula) {
      return {
        success: false,
        error: 'Data da aula é obrigatória',
      }
    }

    const supabase = await createClient()

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

    // Create new session
    const { data: newSession, error: insertError } = await supabase
      .from('sessoes_aula')
      .insert({
        turma_id: params.turma_id,
        professor_id: params.professor_id,
        data_aula: params.data_aula,
        status: 'ABERTA',
        aberta_em: new Date().toISOString(),
        auto_fechamento_agendado: cutoffTime.toISOString(),
        conteudo_programatico: params.conteudo_programatico || null,
      })
      .select()
      .single()

    if (insertError) {
      console.error('Erro ao criar sessão:', insertError)
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
    console.error('Erro inesperado ao abrir sessão:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    }
  }
}