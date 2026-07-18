/**
 * Enhanced Batch Attendance Marking API
 * High-performance attendance recording with <1 second requirement
 * POST /api/sessoes/aula/[id]/frequencia/batch
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { z } from 'zod'
import { logger } from '@/lib/logger'

// Type for batch result errors
interface BatchError {
  matricula_id: string
  error: string
}

// Validation schemas
const SessionParamsSchema = z.object({
  id: z.string().uuid('ID da sessao invalido')
})

const AttendanceRecordSchema = z.object({
  matricula_id: z.string().uuid('ID da matricula invalido'),
  presente: z.boolean(),
  observacoes: z.string().max(200, 'Observacoes muito longas').optional()
})

const BatchAttendanceSchema = z.object({
  attendance: z.array(AttendanceRecordSchema)
    .min(1, 'Pelo menos um registro de frequencia e necessario')
    .max(50, 'Maximo de 50 registros por lote (para performance)'),
  force_overwrite: z.boolean().default(false),
  bulk_observations: z.string().max(300, 'Observacoes gerais muito longas').optional()
})

// Create Supabase client with proper cookie handling for Next.js 15
async function createSupabaseClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set() {
          // In API routes, we can't set cookies but we can read them
        },
        remove() {
          // In API routes, we can't remove cookies but we can read them
        },
      },
    }
  )
}

// Validate authentication
async function validateAuth(supabase: ReturnType<typeof createServerClient>) {
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

// Validate session and attendance marking eligibility
async function validateAttendanceEligibility(supabase: ReturnType<typeof createServerClient>, sessionId: string, profile: { id: string; tipo_usuario: string; escola_id: string | null }) {
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
      turmas:turma_id (
        id,
        nome,
        escola_id
      )
    `)
    .eq('id', sessionId)
    .single()

  if (error || !session) {
    throw new Error('Sessao nao encontrada')
  }

  // Access control validation
  if (profile.tipo_usuario === 'professor') {
    if (session.professor_id !== profile.id) {
      throw new Error('Voce so pode marcar frequencia nas suas proprias sessoes')
    }
  } else if (['diretor', 'secretario'].includes(profile.tipo_usuario)) {
    // Use escola_id directly from sessoes_aula
    if (session.escola_id !== profile.escola_id) {
      throw new Error('Voce so pode marcar frequencia em sessoes da sua escola')
    }
  } else if (profile.tipo_usuario !== 'admin') {
    throw new Error('Permissoes insuficientes para marcar frequencia')
  }

  // Check session status
  if (session.status !== 'ABERTA') {
    throw new Error('Frequencia so pode ser marcada em sessoes abertas')
  }

  // Check if session is already closed/locked
  if (session.hash_legal) {
    throw new Error('Nao e possivel marcar frequencia em sessoes ja fechadas')
  }

  return session
}

// Validate student enrollments for the class - now using matricula_id
async function validateStudentEnrollments(supabase: ReturnType<typeof createServerClient>, turmaId: string, matriculaIds: string[]) {
  const { data: enrollments, error } = await supabase
    .from('matriculas')
    .select('id, situacao')
    .eq('turma_id', turmaId)
    .in('id', matriculaIds)

  if (error) {
    throw new Error('Erro ao verificar matriculas dos alunos')
  }

  const validMatriculas = enrollments?.filter((e: { id: string; situacao: string }) => e.situacao === 'ativa').map((e: { id: string; situacao: string }) => e.id) || []
  const invalidMatriculas = matriculaIds.filter(id => !validMatriculas.includes(id))

  if (invalidMatriculas.length > 0) {
    throw new Error(`Matriculas nao encontradas ou inativas: ${invalidMatriculas.join(', ')}`)
  }

  return validMatriculas
}

// Check for existing attendance records - using matricula_id and sessao_id
async function checkExistingAttendance(supabase: ReturnType<typeof createServerClient>, sessionId: string, matriculaIds: string[]) {
  const { data: existing, error } = await supabase
    .from('frequencia')
    .select('matricula_id, presente, bloqueado, travado, created_at')
    .eq('sessao_id', sessionId)
    .in('matricula_id', matriculaIds)

  if (error) {
    logger.warn('Erro ao verificar frequencia existente', { metadata: { error: error?.message || 'Unknown error' } })
    return []
  }

  return existing || []
}

// Perform optimized batch insert/update
async function performBatchAttendanceUpdate(
  supabase: ReturnType<typeof createServerClient>,
  sessionId: string,
  sessionDataAula: string,
  attendanceData: Array<{ matricula_id: string; presente: boolean; observacoes?: string }>,
  existingRecords: Array<{ matricula_id: string; presente: boolean; bloqueado: boolean; travado: boolean | null }>,
  forceOverwrite: boolean,
  bulkObservations: string | undefined,
  profile: { id: string }
) {
  const timestamp = new Date().toISOString()
  const results: {
    inserted: number
    updated: number
    skipped: number
    errors: BatchError[]
  } = {
    inserted: 0,
    updated: 0,
    skipped: 0,
    errors: []
  }

  // Prepare data for bulk operations
  const toInsert: Array<{
    sessao_id: string
    matricula_id: string
    presente: boolean
    data_aula: string
    observacoes: string | null
    marcado_em: string
    marcado_por: string
    status_presenca: string
  }> = []

  const toUpdate: Array<{
    matricula_id: string
    presente: boolean
    observacoes: string | null
    marcado_em: string
    marcado_por: string
    status_presenca: string
  }> = []

  const existingMap = new Map(existingRecords.map(r => [r.matricula_id, r]))

  for (const record of attendanceData) {
    const existing = existingMap.get(record.matricula_id)

    if (existing) {
      // Record exists - check if update is allowed
      if ((existing.bloqueado || existing.travado) && !forceOverwrite) {
        results.skipped++
        results.errors.push({
          matricula_id: record.matricula_id,
          error: 'Registro travado - use force_overwrite para sobrescrever'
        })
        continue
      }

      toUpdate.push({
        matricula_id: record.matricula_id,
        presente: record.presente,
        observacoes: record.observacoes || bulkObservations || null,
        marcado_em: timestamp,
        marcado_por: profile.id,
        status_presenca: record.presente ? 'presente' : 'ausente'
      })
    } else {
      // New record - frequencia requires matricula_id, sessao_id, data_aula
      toInsert.push({
        sessao_id: sessionId,
        matricula_id: record.matricula_id,
        presente: record.presente,
        data_aula: sessionDataAula,
        observacoes: record.observacoes || bulkObservations || null,
        marcado_em: timestamp,
        marcado_por: profile.id,
        status_presenca: record.presente ? 'presente' : 'ausente'
      })
    }
  }

  // Perform bulk insert (optimized for performance)
  if (toInsert.length > 0) {
    const { error: insertError } = await supabase
      .from('frequencia')
      .insert(toInsert)

    if (insertError) {
      throw new Error(`Erro na insercao em lote: ${insertError.message}`)
    }

    results.inserted = toInsert.length
  }

  // Perform bulk updates (using batch updates for performance)
  if (toUpdate.length > 0) {
    const updatePromises = toUpdate.map(record =>
      supabase
        .from('frequencia')
        .update({
          presente: record.presente,
          observacoes: record.observacoes,
          marcado_em: record.marcado_em,
          marcado_por: record.marcado_por,
          status_presenca: record.status_presenca
        })
        .eq('sessao_id', sessionId)
        .eq('matricula_id', record.matricula_id)
    )

    const updateResults = await Promise.allSettled(updatePromises)

    updateResults.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        results.updated++
      } else {
        results.errors.push({
          matricula_id: toUpdate[index].matricula_id,
          error: result.reason?.message || 'Erro na atualizacao'
        })
      }
    })
  }

  return results
}

/**
 * POST /api/sessoes/aula/[id]/frequencia/batch
 * Process batch attendance marking with <1 second performance requirement
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = performance.now()

  try {
    const supabase = await createSupabaseClient()
    const { profile } = await validateAuth(supabase)
    const { id } = await params

    // Validate request parameters
    const validatedParams = SessionParamsSchema.parse({ id })
    const body = await request.json()
    const validatedData = BatchAttendanceSchema.parse(body)

    // Validate session and attendance eligibility
    const session = await validateAttendanceEligibility(supabase, validatedParams.id, profile)

    // Extract matricula IDs for validation
    const matriculaIds = validatedData.attendance.map(a => a.matricula_id)

    // Validate student enrollments (parallel with existing attendance check)
    const [validMatriculas, existingRecords] = await Promise.all([
      validateStudentEnrollments(supabase, session.turma_id, matriculaIds),
      checkExistingAttendance(supabase, validatedParams.id, matriculaIds)
    ])

    // Perform batch attendance update
    const results = await performBatchAttendanceUpdate(
      supabase,
      validatedParams.id,
      session.data_aula,
      validatedData.attendance,
      existingRecords as Array<{ matricula_id: string; presente: boolean; bloqueado: boolean; travado: boolean | null }>,
      validatedData.force_overwrite,
      validatedData.bulk_observations,
      profile
    )

    // Update session statistics (optional - can be done asynchronously)
    const totalRecords = results.inserted + results.updated
    if (totalRecords > 0) {
      // This could be done asynchronously for better performance
      // Note: update_session_attendance_stats RPC may not exist - fire and forget
      void supabase
        .rpc('update_session_attendance_stats', {
          session_id: validatedParams.id
        })
        .then(() => {
          // Successfully updated stats (fire and forget)
        })
    }

    const endTime = performance.now()
    const executionTime = endTime - startTime

    // Log performance metrics
    logger.info(`Frequencia em lote processada em ${executionTime.toFixed(2)}ms para ${totalRecords} registros`)

    // Check performance requirement (<1 second)
    const performanceCompliant = executionTime < 1000

    // Type-safe access to turmas join
    const turmasData = session.turmas as unknown as { nome: string } | null

    return NextResponse.json({
      success: true,
      message: `Frequencia processada com sucesso em ${executionTime.toFixed(2)}ms`,
      results: {
        processed_count: totalRecords,
        inserted: results.inserted,
        updated: results.updated,
        skipped: results.skipped,
        errors: results.errors,
        total_requested: validatedData.attendance.length
      },
      performance: {
        execution_time_ms: Math.round(executionTime),
        performance_compliant: performanceCompliant,
        requirement_met: executionTime < 1000,
        records_per_second: totalRecords > 0 ? Math.round((totalRecords / executionTime) * 1000) : 0
      },
      session_info: {
        session_id: validatedParams.id,
        turma_nome: turmasData?.nome,
        processed_by: profile.nome,
        processed_at: new Date().toISOString()
      }
    })

  } catch (error) {
    const endTime = performance.now()
    const executionTime = endTime - startTime

    logger.error('Erro no processamento em lote da frequencia:', error instanceof Error ? error.message : String(error))

    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Dados de entrada invalidos',
        details: error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        })),
        code: 'VALIDATION_ERROR',
        execution_time_ms: Math.round(executionTime)
      }, { status: 400 })
    }

    if (error instanceof Error) {
      const statusCode = error.message.includes('autorizado') ? 401 :
                        error.message.includes('encontrado') ? 404 :
                        error.message.includes('Permissoes') ? 403 :
                        error.message.includes('abertas') ? 400 : 500

      return NextResponse.json({
        error: error.message,
        code: getErrorCode(error.message),
        execution_time_ms: Math.round(executionTime)
      }, { status: statusCode })
    }

    return NextResponse.json({
      error: 'Erro interno do servidor',
      code: 'INTERNAL_ERROR',
      execution_time_ms: Math.round(executionTime)
    }, { status: 500 })
  }
}

// Helper function to generate error codes
function getErrorCode(message: string): string {
  if (message.includes('autorizado')) return 'UNAUTHORIZED'
  if (message.includes('encontrado')) return 'NOT_FOUND'
  if (message.includes('Permissoes')) return 'INSUFFICIENT_PERMISSIONS'
  if (message.includes('abertas')) return 'SESSION_NOT_OPEN'
  if (message.includes('fechadas')) return 'SESSION_CLOSED'
  if (message.includes('matriculados')) return 'INVALID_ENROLLMENT'
  if (message.includes('insercao')) return 'BULK_INSERT_ERROR'
  return 'BUSINESS_RULE_VIOLATION'
}
