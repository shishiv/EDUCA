/**
 * Enhanced Batch Attendance Marking API
 * High-performance attendance recording with <1 second requirement
 * POST /api/sessoes-aula/[id]/frequencia/batch
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { z } from 'zod'

// Validation schemas
const SessionParamsSchema = z.object({
  id: z.string().uuid('ID da sessão inválido')
})

const AttendanceRecordSchema = z.object({
  aluno_id: z.string().uuid('ID do aluno inválido'),
  presente: z.boolean(),
  observacoes: z.string().max(200, 'Observações muito longas').optional(),
  horario_marcacao: z.string().datetime().optional()
})

const BatchAttendanceSchema = z.object({
  attendance: z.array(AttendanceRecordSchema)
    .min(1, 'Pelo menos um registro de frequência é necessário')
    .max(50, 'Máximo de 50 registros por lote (para performance)'),
  force_overwrite: z.boolean().default(false),
  bulk_observations: z.string().max(300, 'Observações gerais muito longas').optional()
})

// Create Supabase client with proper cookie handling for Next.js 15
async function createSupabaseClient(request: NextRequest) {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          // In API routes, we can't set cookies but we can read them
        },
        remove(name: string, options: any) {
          // In API routes, we can't remove cookies but we can read them
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

// Validate session and attendance marking eligibility
async function validateAttendanceEligibility(supabase: any, sessionId: string, profile: any) {
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
      throw new Error('Você só pode marcar frequência nas suas próprias sessões')
    }
  } else if (['diretor', 'secretario'].includes(profile.tipo_usuario)) {
    if (session.turmas?.escola_id !== profile.escola_id) {
      throw new Error('Você só pode marcar frequência em sessões da sua escola')
    }
  } else if (profile.tipo_usuario !== 'admin') {
    throw new Error('Permissões insuficientes para marcar frequência')
  }

  // Check session status
  if (session.status !== 'ABERTA') {
    throw new Error('Frequência só pode ser marcada em sessões abertas')
  }

  // Check if session is already closed/locked
  if (session.hash_legal) {
    throw new Error('Não é possível marcar frequência em sessões já fechadas')
  }

  return session
}

// Validate student enrollments for the class
async function validateStudentEnrollments(supabase: any, turmaId: string, studentIds: string[]) {
  const { data: enrollments, error } = await supabase
    .from('matriculas')
    .select('aluno_id, ativo')
    .eq('turma_id', turmaId)
    .in('aluno_id', studentIds)

  if (error) {
    throw new Error('Erro ao verificar matrículas dos alunos')
  }

  const validStudents = enrollments?.filter(e => e.ativo).map(e => e.aluno_id) || []
  const invalidStudents = studentIds.filter(id => !validStudents.includes(id))

  if (invalidStudents.length > 0) {
    throw new Error(`Alunos não matriculados ou inativos: ${invalidStudents.join(', ')}`)
  }

  return validStudents
}

// Check for existing attendance records
async function checkExistingAttendance(supabase: any, sessionId: string, studentIds: string[]) {
  const { data: existing, error } = await supabase
    .from('frequencia')
    .select('aluno_id, presente, is_locked, created_at')
    .eq('aula_session_id', sessionId)
    .in('aluno_id', studentIds)

  if (error) {
    console.warn('Erro ao verificar frequência existente:', error)
    return []
  }

  return existing || []
}

// Perform optimized batch insert/update
async function performBatchAttendanceUpdate(
  supabase: any,
  sessionId: string,
  attendanceData: any[],
  existingRecords: any[],
  forceOverwrite: boolean,
  bulkObservations: string | undefined,
  profile: any
) {
  const timestamp = new Date().toISOString()
  const results = {
    inserted: 0,
    updated: 0,
    skipped: 0,
    errors: []
  }

  // Prepare data for bulk operations
  const toInsert: any[] = []
  const toUpdate: any[] = []
  const existingMap = new Map(existingRecords.map(r => [r.aluno_id, r]))

  for (const record of attendanceData) {
    const existing = existingMap.get(record.aluno_id)

    if (existing) {
      // Record exists - check if update is allowed
      if (existing.is_locked && !forceOverwrite) {
        results.skipped++
        results.errors.push({
          aluno_id: record.aluno_id,
          error: 'Registro travado - use force_overwrite para sobrescrever'
        })
        continue
      }

      toUpdate.push({
        aluno_id: record.aluno_id,
        presente: record.presente,
        observacoes: record.observacoes || bulkObservations || existing.observacoes,
        horario_marcacao: record.horario_marcacao || timestamp,
        updated_at: timestamp,
        updated_by: profile.id
      })
    } else {
      // New record
      toInsert.push({
        aula_session_id: sessionId,
        aluno_id: record.aluno_id,
        presente: record.presente,
        observacoes: record.observacoes || bulkObservations,
        horario_marcacao: record.horario_marcacao || timestamp,
        created_at: timestamp,
        created_by: profile.id
      })
    }
  }

  // Perform bulk insert (optimized for performance)
  if (toInsert.length > 0) {
    const { error: insertError } = await supabase
      .from('frequencia')
      .insert(toInsert)

    if (insertError) {
      throw new Error(`Erro na inserção em lote: ${insertError.message}`)
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
          horario_marcacao: record.horario_marcacao,
          updated_at: record.updated_at,
          updated_by: record.updated_by
        })
        .eq('aula_session_id', sessionId)
        .eq('aluno_id', record.aluno_id)
    )

    const updateResults = await Promise.allSettled(updatePromises)

    updateResults.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        results.updated++
      } else {
        results.errors.push({
          aluno_id: toUpdate[index].aluno_id,
          error: result.reason?.message || 'Erro na atualização'
        })
      }
    })
  }

  return results
}

/**
 * POST /api/sessoes-aula/[id]/frequencia/batch
 * Process batch attendance marking with <1 second performance requirement
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = performance.now()

  try {
    const supabase = await createSupabaseClient(request)
    const { profile } = await validateAuth(supabase)
    const { id } = await params

    // Validate request parameters
    const validatedParams = SessionParamsSchema.parse({ id })
    const body = await request.json()
    const validatedData = BatchAttendanceSchema.parse(body)

    // Validate session and attendance eligibility
    const session = await validateAttendanceEligibility(supabase, validatedParams.id, profile)

    // Extract student IDs for validation
    const studentIds = validatedData.attendance.map(a => a.aluno_id)

    // Validate student enrollments (parallel with existing attendance check)
    const [validStudents, existingRecords] = await Promise.all([
      validateStudentEnrollments(supabase, session.turma_id, studentIds),
      checkExistingAttendance(supabase, validatedParams.id, studentIds)
    ])

    // Perform batch attendance update
    const results = await performBatchAttendanceUpdate(
      supabase,
      validatedParams.id,
      validatedData.attendance,
      existingRecords,
      validatedData.force_overwrite,
      validatedData.bulk_observations,
      profile
    )

    // Update session statistics (optional - can be done asynchronously)
    const totalRecords = results.inserted + results.updated
    if (totalRecords > 0) {
      // This could be done asynchronously for better performance
      supabase
        .rpc('update_session_attendance_stats', {
          session_id: validatedParams.id
        })
        .then()
        .catch(err => console.warn('Erro ao atualizar estatísticas:', err))
    }

    const endTime = performance.now()
    const executionTime = endTime - startTime

    // Log performance metrics
    console.log(`Frequência em lote processada em ${executionTime.toFixed(2)}ms para ${totalRecords} registros`)

    // Check performance requirement (<1 second)
    const performanceCompliant = executionTime < 1000

    return NextResponse.json({
      success: true,
      message: `Frequência processada com sucesso em ${executionTime.toFixed(2)}ms`,
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
        turma_nome: session.turmas?.nome,
        processed_by: profile.nome_completo,
        processed_at: new Date().toISOString()
      }
    })

  } catch (error) {
    const endTime = performance.now()
    const executionTime = endTime - startTime

    console.error('Erro no processamento em lote da frequência:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Dados de entrada inválidos',
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
                        error.message.includes('Permissões') ? 403 :
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
  if (message.includes('Permissões')) return 'INSUFFICIENT_PERMISSIONS'
  if (message.includes('abertas')) return 'SESSION_NOT_OPEN'
  if (message.includes('fechadas')) return 'SESSION_CLOSED'
  if (message.includes('matriculados')) return 'INVALID_ENROLLMENT'
  if (message.includes('inserção')) return 'BULK_INSERT_ERROR'
  return 'BUSINESS_RULE_VIOLATION'
}