/**
 * Enhanced Session Cancellation API
 * Handles session cancellation with Brazilian legal compliance
 * PUT /api/sessoes/aula/[id]/cancelar
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { logger } from '@/lib/logger'
import { createClient } from '@/lib/supabase/server'

// Validation schemas
const SessionParamsSchema = z.object({
  id: z.string().uuid('ID da sessao invalido')
})

const CancelSessionSchema = z.object({
  motivo_cancelamento: z.string()
    .min(10, 'Motivo do cancelamento deve ter pelo menos 10 caracteres')
    .max(500, 'Motivo muito longo (maximo 500 caracteres)'),
  observacoes_adicionais: z.string()
    .max(300, 'Observacoes muito longas (maximo 300 caracteres)')
    .optional()
})

// Validate authentication
async function validateAuth(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    throw new Error('Nao autorizado')
  }

  const { data: profile } = await supabase
    .from('users')
    .select('id, tipo_usuario, escola_id, nome')
    .eq('id', user.id)
    .single()

  if (!profile) {
    throw new Error('Perfil do usuario nao encontrado')
  }

  return { user, profile }
}

// Validate session access and cancellation eligibility
async function validateCancellationEligibility(supabase: Awaited<ReturnType<typeof createClient>>, sessionId: string, profile: { id: string; tipo_usuario: string; escola_id: string | null }) {
  const { data: session, error } = await supabase
    .from('sessoes_aula')
    .select(`
      id,
      turma_id,
      professor_id,
      escola_id,
      status,
      data_aula,
      aberta_em,
      fechada_em,
      hash_legal,
      conteudo_programatico
    `)
    .eq('id', sessionId)
    .single()

  if (error || !session) {
    throw new Error('Sessao nao encontrada')
  }

  // Access control validation
  if (profile.tipo_usuario === 'professor') {
    if (session.professor_id !== profile.id) {
      throw new Error('Voce so pode cancelar suas proprias sessoes')
    }
  } else if (['diretor', 'secretario'].includes(profile.tipo_usuario)) {
    // Use escola_id directly from sessoes_aula
    if (session.escola_id !== profile.escola_id) {
      throw new Error('Voce so pode cancelar sessoes da sua escola')
    }
  } else if (profile.tipo_usuario !== 'admin') {
    throw new Error('Permissoes insuficientes para cancelar esta sessao')
  }

  // Check if session can be cancelled
  if (session.status === 'FECHADA') {
    throw new Error('Nao e possivel cancelar sessoes ja fechadas (principio "nao existe o esquecer")')
  }

  if (session.status === 'CANCELADA') {
    throw new Error('Esta sessao ja foi cancelada')
  }

  // Check if session has legal hash (extra protection)
  if (session.hash_legal) {
    throw new Error('Nao e possivel cancelar sessoes com registro legal finalizado')
  }

  return session
}

// Check for existing attendance records - using sessao_id not aula_session_id
async function checkExistingAttendance(supabase: Awaited<ReturnType<typeof createClient>>, sessionId: string) {
  const { data: attendanceRecords, error } = await supabase
    .from('frequencia')
    .select('id, matricula_id, presente')
    .eq('sessao_id', sessionId)

  if (error) {
    logger.warn('Erro ao verificar registros de frequencia', { metadata: { error: error?.message || 'Unknown error' } })
    return []
  }

  return attendanceRecords || []
}

/**
 * PUT /api/sessoes/aula/[id]/cancelar
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
      status: 'CANCELADA' as const,
      cancelada_em: new Date().toISOString(),
      observacoes_fechamento: formatCancellationObservations(
        validatedData.motivo_cancelamento,
        validatedData.observacoes_adicionais,
        attendanceRecords.length,
        profile.nome
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
        created_at,
        aberta_em,
        cancelada_em,
        conteudo_programatico,
        observacoes_fechamento,
        tempo_total_aula,
        turmas:turma_id (
          nome,
          ano_letivo,
          escola_id
        ),
        users:professor_id (
          nome
        ),
        disciplinas:disciplina_id (
          nome,
          codigo
        )
      `)
      .single()

    if (updateError) {
      logger.error('Erro ao cancelar sessao:', updateError?.message || 'Unknown error')
      throw new Error('Falha ao cancelar sessao')
    }

    // Handle existing attendance records
    let attendanceMessage = ''
    if (attendanceRecords.length > 0) {
      // Mark existing attendance records as cancelled - use sessao_id
      const { error: attendanceError } = await supabase
        .from('frequencia')
        .update({
          observacoes: `SESSAO CANCELADA: ${validatedData.motivo_cancelamento}`
        })
        .eq('sessao_id', validatedParams.id)

      if (attendanceError) {
        logger.warn('Erro ao atualizar registros de frequencia', { metadata: { error: attendanceError?.message || 'Unknown error' } })
      } else {
        attendanceMessage = ` ${attendanceRecords.length} registro(s) de frequencia foram marcados como cancelados.`
      }
    }

    // Log successful cancellation
    logger.info(`Sessao ${validatedParams.id} cancelada por ${profile.nome}: ${validatedData.motivo_cancelamento}`)

    // Type-safe access to cancelledSession
    const sessionData = cancelledSession as {
      id: string
      turma_id: string
      professor_id: string
      disciplina_id: string | null
      data_aula: string
      status: string
      created_at: string | null
      aberta_em: string | null
      cancelada_em: string | null
      conteudo_programatico: string
      observacoes_fechamento: string | null
      tempo_total_aula: unknown
      turmas: { nome: string; ano_letivo: number; escola_id: string } | null
      users: { nome: string } | null
      disciplinas: { nome: string; codigo: string } | null
    }

    // Return success response
    return NextResponse.json({
      success: true,
      message: `Sessao cancelada com sucesso.${attendanceMessage}`,
      session: {
        ...sessionData,
        compliance_status: 'cancelled',
        can_modify: false,
        cancellation_info: {
          cancelled_by: profile.nome,
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
    logger.error('Erro no endpoint de cancelamento:', error instanceof Error ? error.message : String(error))

    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Dados de entrada invalidos',
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
                        error.message.includes('Permissoes') ? 403 :
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
  let observations = `SESSAO CANCELADA\n`
  observations += `Motivo: ${motivo}\n`
  observations += `Cancelada por: ${cancelledBy}\n`
  observations += `Data/Hora: ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}\n`

  if (attendanceCount > 0) {
    observations += `Registros de frequencia afetados: ${attendanceCount}\n`
  }

  if (observacoesAdicionais) {
    observations += `Observacoes adicionais: ${observacoesAdicionais}\n`
  }

  return observations
}

// Helper function to generate error codes
function getErrorCode(message: string): string {
  if (message.includes('autorizado')) return 'UNAUTHORIZED'
  if (message.includes('encontrado')) return 'NOT_FOUND'
  if (message.includes('Permissoes')) return 'INSUFFICIENT_PERMISSIONS'
  if (message.includes('cancelar')) return 'CANCELLATION_NOT_ALLOWED'
  if (message.includes('cancelada')) return 'ALREADY_CANCELLED'
  if (message.includes('fechadas')) return 'SESSION_CLOSED'
  return 'BUSINESS_RULE_VIOLATION'
}
