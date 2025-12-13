/**
 * Enhanced Session Cancellation API
 * Handles session cancellation with Brazilian legal compliance
 * PUT /api/sessoes-aula/[id]/cancelar
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { logger } from '@/lib/logger'
import { createClient } from '@/lib/supabase/server'

// Validation schemas
const SessionParamsSchema = z.object({
  id: z.string().uuid('ID da sessão inválido')
})

const CancelSessionSchema = z.object({
  motivo_cancelamento: z.string()
    .min(10, 'Motivo do cancelamento deve ter pelo menos 10 caracteres')
    .max(500, 'Motivo muito longo (máximo 500 caracteres)'),
  observacoes_adicionais: z.string()
    .max(300, 'Observações muito longas (máximo 300 caracteres)')
    .optional()
})

// Validate authentication
async function validateAuth(supabase: any) {
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    throw new Error('Não autorizado')
  }

  const { data: profile } = await supabase
    .from('users')
    .select('id, tipo_usuario, escola_id, nome_completo')
    .eq('id', user.id)
    .single()

  if (!profile) {
    throw new Error('Perfil do usuário não encontrado')
  }

  return { user, profile }
}

// Validate session access and cancellation eligibility
async function validateCancellationEligibility(supabase: any, sessionId: string, profile: any) {
  const { data: session, error } = await supabase
    .from('sessoes_aula')
    .select(`
      id,
      turma_id,
      professor_id,
      status,
      data_aula,
      aberta_em,
      fechada_em,
      hash_legal,
      conteudo_ministrado,
      turmas:turma_id (
        id,
        nome,
        escola_id
      )
    `)
    .eq('id', sessionId)
    .single()

  if (error || !session) {
    throw new Error('Sessão não encontrada')
  }

  // Access control validation
  if (profile.tipo_usuario === 'professor') {
    if (session.professor_id !== profile.id) {
      throw new Error('Você só pode cancelar suas próprias sessões')
    }
  } else if (['diretor', 'secretario'].includes(profile.tipo_usuario)) {
    if (session.turmas?.escola_id !== profile.escola_id) {
      throw new Error('Você só pode cancelar sessões da sua escola')
    }
  } else if (profile.tipo_usuario !== 'admin') {
    throw new Error('Permissões insuficientes para cancelar esta sessão')
  }

  // Check if session can be cancelled
  if (session.status === 'FECHADA') {
    throw new Error('Não é possível cancelar sessões já fechadas (princípio "não existe o esquecer")')
  }

  if (session.status === 'CANCELADA') {
    throw new Error('Esta sessão já foi cancelada')
  }

  // Check if session has legal hash (extra protection)
  if (session.hash_legal) {
    throw new Error('Não é possível cancelar sessões com registro legal finalizado')
  }

  return session
}

// Check for existing attendance records
async function checkExistingAttendance(supabase: any, sessionId: string) {
  const { data: attendanceRecords, error } = await supabase
    .from('frequencia')
    .select('id, aluno_id, presente')
    .eq('aula_session_id', sessionId)

  if (error) {
    logger.warn('Erro ao verificar registros de frequência:', { error })
    return []
  }

  return attendanceRecords || []
}

/**
 * PUT /api/sessoes-aula/[id]/cancelar
 * Cancel a session with proper audit trail and legal compliance
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { profile } = await validateAuth(supabase)
    const { id } = await params

    // Validate request parameters
    const validatedParams = SessionParamsSchema.parse({ id })
    const body = await request.json()
    const validatedData = CancelSessionSchema.parse(body)

    // Validate cancellation eligibility
    const session = await validateCancellationEligibility(supabase, validatedParams.id, profile)

    // Check for existing attendance records
    const attendanceRecords = await checkExistingAttendance(supabase, validatedParams.id)

    // Prepare cancellation data
    const cancellationData = {
      status: 'CANCELADA',
      cancelada_em: new Date().toISOString(),
      observacoes_fechamento: formatCancellationObservations(
        validatedData.motivo_cancelamento,
        validatedData.observacoes_adicionais,
        attendanceRecords.length,
        profile.nome_completo
      )
    }

    // Perform the cancellation update
    const { data: cancelledSession, error: updateError } = await supabase
      .from('sessoes_aula')
      .update(cancellationData)
      .eq('id', validatedParams.id)
      .select(`
        id,
        turma_id,
        professor_id,
        disciplina_id,
        data_aula,
        status,
        criada_em,
        aberta_em,
        cancelada_em,
        conteudo_ministrado,
        observacoes_fechamento,
        tempo_total_aula,
        turmas:turma_id (
          nome,
          ano_letivo,
          escola_id
        ),
        users:professor_id (
          nome_completo
        ),
        disciplinas:disciplina_id (
          nome,
          codigo
        )
      `)
      .single()

    if (updateError) {
      logger.error('Erro ao cancelar sessão:', { error: updateError })
      throw new Error('Falha ao cancelar sessão')
    }

    // Handle existing attendance records
    let attendanceMessage = ''
    if (attendanceRecords.length > 0) {
      // Mark existing attendance records as cancelled
      const { error: attendanceError } = await supabase
        .from('frequencia')
        .update({
          observacoes: `SESSÃO CANCELADA: ${validatedData.motivo_cancelamento}`,
          updated_at: new Date().toISOString()
        })
        .eq('aula_session_id', validatedParams.id)

      if (attendanceError) {
        logger.warn('Erro ao atualizar registros de frequência:', { attendanceError })
      } else {
        attendanceMessage = ` ${attendanceRecords.length} registro(s) de frequência foram marcados como cancelados.`
      }
    }

    // Log successful cancellation
    logger.info(`Sessão ${validatedParams.id} cancelada por ${profile.nome_completo}: ${validatedData.motivo_cancelamento}`)

    // Return success response
    return NextResponse.json({
      success: true,
      message: `Sessão cancelada com sucesso.${attendanceMessage}`,
      session: {
        ...cancelledSession,
        compliance_status: 'cancelled',
        can_modify: false,
        cancellation_info: {
          cancelled_by: profile.nome_completo,
          cancelled_at: cancellationData.cancelada_em,
          reason: validatedData.motivo_cancelamento,
          had_attendance_records: attendanceRecords.length > 0,
          affected_records: attendanceRecords.length
        },
        workflow_status: {
          previous_phase: session.status,
          current_phase: 'CANCELADA',
          next_allowed_transitions: [], // No further transitions allowed
          legal_compliance: 'cancelled'
        }
      }
    })

  } catch (error) {
    logger.error('Erro no endpoint de cancelamento:', { error: error })

    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Dados de entrada inválidos',
        details: error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        })),
        code: 'VALIDATION_ERROR'
      }, { status: 400 })
    }

    if (error instanceof Error) {
      const statusCode = error.message.includes('autorizado') ? 401 :
                        error.message.includes('encontrado') ? 404 :
                        error.message.includes('Permissões') ? 403 :
                        error.message.includes('cancelar') ? 400 : 500

      return NextResponse.json({
        error: error.message,
        code: getErrorCode(error.message)
      }, { status: statusCode })
    }

    return NextResponse.json({
      error: 'Erro interno do servidor',
      code: 'INTERNAL_ERROR'
    }, { status: 500 })
  }
}

// Helper function to format cancellation observations
function formatCancellationObservations(
  motivo: string,
  observacoesAdicionais: string | undefined,
  attendanceCount: number,
  cancelledBy: string
): string {
  let observations = `SESSÃO CANCELADA\n`
  observations += `Motivo: ${motivo}\n`
  observations += `Cancelada por: ${cancelledBy}\n`
  observations += `Data/Hora: ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}\n`

  if (attendanceCount > 0) {
    observations += `Registros de frequência afetados: ${attendanceCount}\n`
  }

  if (observacoesAdicionais) {
    observations += `Observações adicionais: ${observacoesAdicionais}\n`
  }

  return observations
}

// Helper function to generate error codes
function getErrorCode(message: string): string {
  if (message.includes('autorizado')) return 'UNAUTHORIZED'
  if (message.includes('encontrado')) return 'NOT_FOUND'
  if (message.includes('Permissões')) return 'INSUFFICIENT_PERMISSIONS'
  if (message.includes('cancelar')) return 'CANCELLATION_NOT_ALLOWED'
  if (message.includes('cancelada')) return 'ALREADY_CANCELLED'
  if (message.includes('fechadas')) return 'SESSION_CLOSED'
  return 'BUSINESS_RULE_VIOLATION'
}