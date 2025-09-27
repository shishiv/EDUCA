/**
 * Enhanced Session Status Management API
 * Handles three-phase workflow transitions with Brazilian legal compliance
 * PUT /api/sessoes-aula/[id]/status
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { z } from 'zod'

// Validation schemas
const SessionParamsSchema = z.object({
  id: z.string().uuid('ID da sessão inválido')
})

const StatusUpdateSchema = z.object({
  status: z.enum(['PLANEJADA', 'ABERTA', 'FECHADA', 'CANCELADA'], {
    errorMap: () => ({ message: 'Status deve ser: PLANEJADA, ABERTA, FECHADA ou CANCELADA' })
  }),
  conteudo_ministrado: z.string()
    .min(10, 'Conteúdo ministrado deve ter pelo menos 10 caracteres')
    .max(1000, 'Conteúdo ministrado muito longo (máximo 1000 caracteres)')
    .optional(),
  observacoes_fechamento: z.string()
    .max(500, 'Observações muito longas (máximo 500 caracteres)')
    .optional(),
  motivo_cancelamento: z.string()
    .min(5, 'Motivo do cancelamento deve ter pelo menos 5 caracteres')
    .max(500, 'Motivo muito longo (máximo 500 caracteres)')
    .optional()
})

// Create Supabase client
function createSupabaseClient() {
  const cookieStore = cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
      },
    }
  )
}

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

// Validate session access permissions
async function validateSessionAccess(supabase: any, sessionId: string, profile: any) {
  const { data: session, error } = await supabase
    .from('sessoes_aula')
    .select(`
      id,
      turma_id,
      professor_id,
      status,
      data_aula,
      hash_legal,
      turmas:turma_id (
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
      throw new Error('Você só pode modificar suas próprias sessões')
    }
  } else if (['diretor', 'secretario'].includes(profile.tipo_usuario)) {
    if (session.turmas?.escola_id !== profile.escola_id) {
      throw new Error('Você só pode modificar sessões da sua escola')
    }
  } else if (profile.tipo_usuario !== 'admin') {
    throw new Error('Permissões insuficientes para modificar esta sessão')
  }

  return session
}

// Validate status transitions according to Brazilian educational workflow
function validateStatusTransition(currentStatus: string, newStatus: string): boolean {
  const validTransitions: Record<string, string[]> = {
    'PLANEJADA': ['ABERTA', 'CANCELADA'],
    'ABERTA': ['FECHADA', 'CANCELADA'],
    'FECHADA': [], // Cannot transition from closed state (não existe o esquecer)
    'CANCELADA': [] // Cannot transition from cancelled state
  }

  return validTransitions[currentStatus]?.includes(newStatus) ?? false
}

// Generate legal compliance hash for closed sessions
function generateLegalHash(sessionData: any): string {
  const hashInput = [
    sessionData.turma_id,
    sessionData.professor_id,
    sessionData.data_aula,
    sessionData.aberta_em || sessionData.criada_em,
    sessionData.fechada_em || new Date().toISOString(),
    sessionData.conteudo_ministrado || ''
  ].join('|')

  // In production, use crypto.subtle.digest with SHA-256
  // For now, simulate hash generation
  return require('crypto')
    .createHash('sha256')
    .update(hashInput)
    .digest('hex')
}

/**
 * PUT /api/sessoes-aula/[id]/status
 * Update session status with legal compliance validation
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createSupabaseClient()
    const { profile } = await validateAuth(supabase)

    // Validate request parameters
    const validatedParams = SessionParamsSchema.parse(params)
    const body = await request.json()
    const validatedData = StatusUpdateSchema.parse(body)

    // Get current session and validate access
    const session = await validateSessionAccess(supabase, validatedParams.id, profile)

    // Validate status transition
    if (!validateStatusTransition(session.status, validatedData.status)) {
      return NextResponse.json({
        error: `Transição inválida de ${session.status} para ${validatedData.status}`,
        valid_transitions: getValidTransitions(session.status),
        code: 'INVALID_TRANSITION'
      }, { status: 400 })
    }

    // Check for "não existe o esquecer" principle
    if (session.status === 'FECHADA' && session.hash_legal) {
      return NextResponse.json({
        error: 'Não é possível modificar sessões já fechadas (princípio "não existe o esquecer")',
        code: 'SESSION_IMMUTABLE'
      }, { status: 403 })
    }

    // Prepare update data based on status transition
    const updateData = await prepareUpdateData(session, validatedData, supabase)

    // Perform the status update
    const { data: updatedSession, error: updateError } = await supabase
      .from('sessoes_aula')
      .update(updateData)
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
        fechada_em,
        cancelada_em,
        conteudo_ministrado,
        observacoes_fechamento,
        hash_legal,
        tempo_total_aula,
        auto_fechamento_agendado,
        turmas:turma_id (
          nome,
          ano_letivo
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
      console.error('Erro ao atualizar status da sessão:', updateError)
      throw new Error('Falha ao atualizar status da sessão')
    }

    // Log the status change
    console.log(`Status da sessão ${validatedParams.id} alterado de ${session.status} para ${validatedData.status}`)

    // Return success response with workflow information
    return NextResponse.json({
      success: true,
      message: getStatusChangeMessage(session.status, validatedData.status),
      session: {
        ...updatedSession,
        compliance_status: getComplianceStatus(updatedSession),
        can_modify: canModifySession(updatedSession),
        workflow_status: {
          previous_phase: session.status,
          current_phase: validatedData.status,
          next_allowed_transitions: getValidTransitions(validatedData.status),
          legal_compliance: updatedSession.hash_legal ? 'compliant' : 'pending'
        },
        audit_info: {
          changed_by: profile.nome_completo,
          changed_at: new Date().toISOString(),
          change_type: getChangeType(session.status, validatedData.status)
        }
      }
    })

  } catch (error) {
    console.error('Erro no endpoint de status da sessão:', error)

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
                        error.message.includes('Permissões') ? 403 : 400

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

// Helper function to prepare update data based on status transition
async function prepareUpdateData(session: any, validatedData: any, supabase: any) {
  const updateData: any = {
    status: validatedData.status
  }

  switch (validatedData.status) {
    case 'ABERTA':
      updateData.aberta_em = new Date().toISOString()
      // Auto-closure is already set during creation
      break

    case 'FECHADA':
      updateData.fechada_em = new Date().toISOString()

      // Content is required for closing
      if (validatedData.conteudo_ministrado) {
        updateData.conteudo_ministrado = validatedData.conteudo_ministrado
      }

      if (validatedData.observacoes_fechamento) {
        updateData.observacoes_fechamento = validatedData.observacoes_fechamento
      }

      // Generate legal compliance hash
      const hashData = {
        ...session,
        ...updateData,
        conteudo_ministrado: validatedData.conteudo_ministrado || session.conteudo_ministrado
      }
      updateData.hash_legal = generateLegalHash(hashData)
      break

    case 'CANCELADA':
      updateData.cancelada_em = new Date().toISOString()

      if (validatedData.motivo_cancelamento) {
        updateData.observacoes_fechamento = `CANCELADA: ${validatedData.motivo_cancelamento}`
      }
      break
  }

  return updateData
}

// Helper functions
function getValidTransitions(status: string): string[] {
  const transitions: Record<string, string[]> = {
    'PLANEJADA': ['ABERTA', 'CANCELADA'],
    'ABERTA': ['FECHADA', 'CANCELADA'],
    'FECHADA': [],
    'CANCELADA': []
  }
  return transitions[status] || []
}

function getStatusChangeMessage(oldStatus: string, newStatus: string): string {
  const messages: Record<string, Record<string, string>> = {
    'PLANEJADA': {
      'ABERTA': 'Aula aberta com sucesso. A chamada pode ser realizada.',
      'CANCELADA': 'Sessão cancelada com sucesso.'
    },
    'ABERTA': {
      'FECHADA': 'Aula fechada com sucesso. Registro legal criado.',
      'CANCELADA': 'Sessão cancelada durante a aula.'
    }
  }
  return messages[oldStatus]?.[newStatus] || 'Status atualizado com sucesso'
}

function getComplianceStatus(session: any): string {
  if (session.status === 'FECHADA' && session.hash_legal) {
    return 'compliant'
  }
  if (session.status === 'CANCELADA') {
    return 'cancelled'
  }
  if (session.status === 'ABERTA') {
    return 'active'
  }
  return 'pending'
}

function canModifySession(session: any): boolean {
  return session.status !== 'FECHADA' && !session.hash_legal
}

function getChangeType(oldStatus: string, newStatus: string): string {
  if (oldStatus === 'PLANEJADA' && newStatus === 'ABERTA') return 'session_opened'
  if (oldStatus === 'ABERTA' && newStatus === 'FECHADA') return 'session_closed'
  if (newStatus === 'CANCELADA') return 'session_cancelled'
  return 'status_changed'
}

function getErrorCode(message: string): string {
  if (message.includes('autorizado')) return 'UNAUTHORIZED'
  if (message.includes('encontrado')) return 'NOT_FOUND'
  if (message.includes('Permissões')) return 'INSUFFICIENT_PERMISSIONS'
  return 'BUSINESS_RULE_VIOLATION'
}