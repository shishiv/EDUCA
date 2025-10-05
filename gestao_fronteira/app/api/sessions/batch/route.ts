/**
 * Batch Operations API - Enhanced "Abrir aula" Workflow
 * Optimized for mobile devices with offline capabilities
 * Brazilian Educational Compliance Implementation
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { z } from 'zod'
import { logger } from '@/lib/logger'

// Validation schemas
const BatchSessionUpdateSchema = z.object({
  session_id: z.string().uuid(),
  fase: z.enum(['planejamento', 'chamada', 'finalizada', 'bloqueada']).optional(),
  observacoes: z.string().optional(),
  timestamp: z.string().optional() // For conflict resolution
})

const BatchAttendanceUpdateSchema = z.object({
  session_id: z.string().uuid(),
  aluno_id: z.string().uuid(),
  presente: z.boolean(),
  observacoes: z.string().optional(),
  timestamp: z.string().optional() // For conflict resolution
})

const BatchOperationsSchema = z.object({
  operations: z.object({
    session_updates: z.array(BatchSessionUpdateSchema).optional(),
    attendance_updates: z.array(BatchAttendanceUpdateSchema).optional()
  }),
  device_info: z.object({
    device_id: z.string(),
    app_version: z.string(),
    last_sync: z.string().optional()
  }).optional(),
  conflict_resolution: z.enum(['server_wins', 'client_wins', 'merge']).default('server_wins')
})

const SyncRequestSchema = z.object({
  last_sync_timestamp: z.string().optional(),
  escola_id: z.string().uuid().optional(),
  professor_id: z.string().uuid().optional(),
  include_locked: z.boolean().default(false)
})

// Create Supabase client
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
      },
    }
  )
}

// Validate user authentication
async function validateAuth(supabase: any) {
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    throw new Error('Unauthorized')
  }

  const { data: profile } = await supabase
    .from('users')
    .select('id, tipo_usuario, escola_id, nome_completo')
    .eq('id', user.id)
    .single()

  if (!profile) {
    throw new Error('User profile not found')
  }

  return { user, profile }
}

/**
 * POST /api/sessions/batch
 * Process batch operations for sessions and attendance (mobile sync)
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseClient()
    const { profile } = await validateAuth(supabase)

    const body = await request.json()
    const validatedData = BatchOperationsSchema.parse(body)

    const results = {
      session_updates: {
        successful: 0,
        failed: 0,
        conflicts: 0,
        errors: [] as any[]
      },
      attendance_updates: {
        successful: 0,
        failed: 0,
        conflicts: 0,
        errors: [] as any[]
      },
      sync_timestamp: new Date().toISOString(),
      server_time: new Date().toISOString()
    }

    // Process session updates
    if (validatedData.operations.session_updates) {
      const sessionResults = await processBatchSessionUpdates(
        supabase,
        validatedData.operations.session_updates,
        profile,
        validatedData.conflict_resolution
      )
      results.session_updates = sessionResults
    }

    // Process attendance updates
    if (validatedData.operations.attendance_updates) {
      const attendanceResults = await processBatchAttendanceUpdates(
        supabase,
        validatedData.operations.attendance_updates,
        profile,
        validatedData.conflict_resolution
      )
      results.attendance_updates = attendanceResults
    }

    // Log batch operation for audit
    await logBatchOperation(supabase, profile.id, validatedData, results)

    return NextResponse.json({
      message: 'Batch operations processed',
      results,
      summary: {
        total_operations:
          (validatedData.operations.session_updates?.length || 0) +
          (validatedData.operations.attendance_updates?.length || 0),
        successful_operations:
          results.session_updates.successful +
          results.attendance_updates.successful,
        failed_operations:
          results.session_updates.failed +
          results.attendance_updates.failed,
        conflicts:
          results.session_updates.conflicts +
          results.attendance_updates.conflicts
      }
    })

  } catch (error) {
    logger.error('Batch operations error:', { error: error })

    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Invalid batch operations data',
        details: error.errors
      }, { status: 400 })
    }

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * GET /api/sessions/batch?action=sync
 * Get data for offline sync (download changes since last sync)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseClient()
    const { profile } = await validateAuth(supabase)

    const url = new URL(request.url)
    const action = url.searchParams.get('action')

    if (action !== 'sync') {
      return NextResponse.json({ error: 'Invalid action. Use ?action=sync' }, { status: 400 })
    }

    // Parse sync parameters
    const queryParams = Object.fromEntries(url.searchParams.entries())
    delete queryParams.action // Remove action from validation
    const validatedQuery = SyncRequestSchema.parse(queryParams)

    // Determine escola_id based on user role
    let escolaId = validatedQuery.escola_id
    if (profile.tipo_usuario !== 'admin') {
      escolaId = profile.escola_id
    }

    // Determine professor_id filter
    let professorId = validatedQuery.professor_id
    if (profile.tipo_usuario === 'professor') {
      professorId = profile.id // Professors can only sync their own data
    }

    // Build sync data
    const syncData = await buildSyncData(supabase, {
      lastSyncTimestamp: validatedQuery.last_sync_timestamp,
      escolaId,
      professorId,
      includeLocked: validatedQuery.include_locked,
      userProfile: profile
    })

    return NextResponse.json({
      sync_data: syncData,
      sync_timestamp: new Date().toISOString(),
      server_time: new Date().toISOString(),
      user_permissions: {
        can_modify_sessions: profile.tipo_usuario !== 'responsavel',
        can_view_all_school: ['admin', 'diretor', 'secretario'].includes(profile.tipo_usuario),
        escola_id: escolaId
      }
    })

  } catch (error) {
    logger.error('Sync data fetch error:', { error: error })

    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Invalid sync parameters',
        details: error.errors
      }, { status: 400 })
    }

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Helper functions
async function processBatchSessionUpdates(
  supabase: any,
  updates: any[],
  profile: any,
  conflictResolution: string
) {
  const results = {
    successful: 0,
    failed: 0,
    conflicts: 0,
    errors: [] as any[]
  }

  for (const update of updates) {
    try {
      // Get current session state for conflict detection
      const { data: currentSession, error: fetchError } = await supabase
        .from('aula_sessions')
        .select('id, fase, bloqueado, updated_at, professor_id, turma_id, turmas:turma_id(escola_id)')
        .eq('id', update.session_id)
        .single()

      if (fetchError || !currentSession) {
        results.errors.push({
          session_id: update.session_id,
          error: 'Session not found',
          type: 'not_found'
        })
        results.failed++
        continue
      }

      // Access control check
      const canModify = checkSessionModifyAccess(currentSession, profile)
      if (!canModify) {
        results.errors.push({
          session_id: update.session_id,
          error: 'Insufficient permissions',
          type: 'permission_denied'
        })
        results.failed++
        continue
      }

      // Cannot modify locked sessions
      if (currentSession.bloqueado) {
        results.errors.push({
          session_id: update.session_id,
          error: 'Session is locked',
          type: 'locked_session'
        })
        results.failed++
        continue
      }

      // Conflict detection
      if (update.timestamp && conflictResolution !== 'client_wins') {
        const updateTime = new Date(update.timestamp)
        const serverTime = new Date(currentSession.updated_at)

        if (serverTime > updateTime) {
          results.conflicts++

          if (conflictResolution === 'server_wins') {
            results.errors.push({
              session_id: update.session_id,
              error: 'Server version newer than client',
              type: 'conflict_server_wins',
              server_data: currentSession
            })
            continue
          }
          // For 'merge' strategy, we would implement merge logic here
        }
      }

      // Perform update
      const updateData: any = {}
      if (update.fase) updateData.fase = update.fase
      if (update.observacoes !== undefined) updateData.observacoes = update.observacoes

      const { error: updateError } = await supabase
        .from('aula_sessions')
        .update(updateData)
        .eq('id', update.session_id)

      if (updateError) {
        results.errors.push({
          session_id: update.session_id,
          error: updateError.message,
          type: 'update_failed'
        })
        results.failed++
      } else {
        results.successful++
      }

    } catch (error) {
      results.errors.push({
        session_id: update.session_id,
        error: error instanceof Error ? error.message : 'Unknown error',
        type: 'exception'
      })
      results.failed++
    }
  }

  return results
}

async function processBatchAttendanceUpdates(
  supabase: any,
  updates: any[],
  profile: any,
  conflictResolution: string
) {
  const results = {
    successful: 0,
    failed: 0,
    conflicts: 0,
    errors: [] as any[]
  }

  for (const update of updates) {
    try {
      // Get session information for access control
      const { data: session, error: sessionError } = await supabase
        .from('aula_sessions')
        .select('id, bloqueado, professor_id, turma_id, data_aula, turmas:turma_id(escola_id)')
        .eq('id', update.session_id)
        .single()

      if (sessionError || !session) {
        results.errors.push({
          session_id: update.session_id,
          aluno_id: update.aluno_id,
          error: 'Session not found',
          type: 'session_not_found'
        })
        results.failed++
        continue
      }

      // Access control check
      const canModify = checkSessionModifyAccess(session, profile)
      if (!canModify) {
        results.errors.push({
          session_id: update.session_id,
          aluno_id: update.aluno_id,
          error: 'Insufficient permissions',
          type: 'permission_denied'
        })
        results.failed++
        continue
      }

      // Cannot modify locked sessions
      if (session.bloqueado) {
        results.errors.push({
          session_id: update.session_id,
          aluno_id: update.aluno_id,
          error: 'Session is locked',
          type: 'locked_session'
        })
        results.failed++
        continue
      }

      // Check for existing attendance record
      const { data: existingRecord } = await supabase
        .from('frequencia')
        .select('id, is_locked, updated_at')
        .eq('session_id', update.session_id)
        .eq('aluno_id', update.aluno_id)
        .single()

      // Cannot modify locked attendance records
      if (existingRecord?.is_locked) {
        results.errors.push({
          session_id: update.session_id,
          aluno_id: update.aluno_id,
          error: 'Attendance record is locked',
          type: 'locked_record'
        })
        results.failed++
        continue
      }

      // Conflict detection for existing records
      if (existingRecord && update.timestamp && conflictResolution !== 'client_wins') {
        const updateTime = new Date(update.timestamp)
        const serverTime = new Date(existingRecord.updated_at)

        if (serverTime > updateTime) {
          results.conflicts++

          if (conflictResolution === 'server_wins') {
            results.errors.push({
              session_id: update.session_id,
              aluno_id: update.aluno_id,
              error: 'Server version newer than client',
              type: 'conflict_server_wins'
            })
            continue
          }
        }
      }

      // Perform upsert
      const { error: upsertError } = await supabase
        .from('frequencia')
        .upsert({
          session_id: update.session_id,
          aluno_id: update.aluno_id,
          data: session.data_aula,
          presente: update.presente,
          observacoes: update.observacoes || null
        }, {
          onConflict: 'session_id,aluno_id'
        })

      if (upsertError) {
        results.errors.push({
          session_id: update.session_id,
          aluno_id: update.aluno_id,
          error: upsertError.message,
          type: 'upsert_failed'
        })
        results.failed++
      } else {
        results.successful++
      }

    } catch (error) {
      results.errors.push({
        session_id: update.session_id,
        aluno_id: update.aluno_id,
        error: error instanceof Error ? error.message : 'Unknown error',
        type: 'exception'
      })
      results.failed++
    }
  }

  return results
}

async function buildSyncData(supabase: any, options: {
  lastSyncTimestamp?: string,
  escolaId?: string,
  professorId?: string,
  includeLocked: boolean,
  userProfile: any
}) {
  const syncData: any = {
    sessions: [],
    attendance: [],
    students: [],
    classes: []
  }

  // Build sessions query
  let sessionsQuery = supabase
    .from('aula_sessions')
    .select(`
      id,
      turma_id,
      professor_id,
      data_aula,
      fase,
      bloqueado,
      bloqueado_em,
      observacoes,
      total_alunos,
      total_presentes,
      total_ausentes,
      created_at,
      updated_at
    `)

  // Apply filters based on user role and permissions
  if (options.escolaId) {
    sessionsQuery = sessionsQuery.in('turma_id',
      supabase.from('turmas').select('id').eq('escola_id', options.escolaId)
    )
  }

  if (options.professorId) {
    sessionsQuery = sessionsQuery.eq('professor_id', options.professorId)
  }

  // Only include unlocked sessions unless specifically requested
  if (!options.includeLocked) {
    sessionsQuery = sessionsQuery.eq('bloqueado', false)
  }

  // Filter by last sync timestamp if provided
  if (options.lastSyncTimestamp) {
    sessionsQuery = sessionsQuery.gte('updated_at', options.lastSyncTimestamp)
  }

  // Limit to reasonable date range for mobile devices
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  sessionsQuery = sessionsQuery.gte('data_aula', thirtyDaysAgo.toISOString().split('T')[0])

  const { data: sessions } = await sessionsQuery.limit(100) // Limit for mobile performance

  syncData.sessions = sessions || []

  // Get attendance data for the sessions
  if (sessions && sessions.length > 0) {
    const sessionIds = sessions.map(s => s.id)

    let attendanceQuery = supabase
      .from('frequencia')
      .select('id, session_id, aluno_id, presente, observacoes, is_locked, created_at, updated_at')
      .in('session_id', sessionIds)

    if (!options.includeLocked) {
      attendanceQuery = attendanceQuery.eq('is_locked', false)
    }

    if (options.lastSyncTimestamp) {
      attendanceQuery = attendanceQuery.gte('updated_at', options.lastSyncTimestamp)
    }

    const { data: attendance } = await attendanceQuery

    syncData.attendance = attendance || []
  }

  // Get class information if user can access it
  if (options.escolaId || options.professorId) {
    let classesQuery = supabase
      .from('turmas')
      .select('id, nome, ano_letivo, escola_id, professor_id')

    if (options.escolaId) {
      classesQuery = classesQuery.eq('escola_id', options.escolaId)
    }

    if (options.professorId) {
      classesQuery = classesQuery.eq('professor_id', options.professorId)
    }

    const { data: classes } = await classesQuery

    syncData.classes = classes || []

    // Get student information for these classes
    if (classes && classes.length > 0) {
      const classIds = classes.map(c => c.id)

      const { data: students } = await supabase
        .from('matriculas')
        .select(`
          aluno_id,
          turma_id,
          numero_chamada,
          ativo,
          alunos:aluno_id (
            id,
            nome_completo,
            numero_matricula,
            data_nascimento
          )
        `)
        .in('turma_id', classIds)
        .eq('ativo', true)

      syncData.students = students || []
    }
  }

  return syncData
}

async function logBatchOperation(supabase: any, userId: string, requestData: any, results: any) {
  try {
    await supabase
      .from('audit_logs')
      .insert({
        user_id: userId,
        action: 'BATCH_OPERATION',
        table_name: 'multiple',
        record_id: 'batch',
        new_values: {
          request_summary: {
            session_updates: requestData.operations.session_updates?.length || 0,
            attendance_updates: requestData.operations.attendance_updates?.length || 0
          },
          results_summary: results.summary
        },
        details: {
          device_info: requestData.device_info,
          conflict_resolution: requestData.conflict_resolution,
          timestamp: new Date().toISOString()
        }
      })
  } catch (error) {
    logger.error('Failed to log batch operation:', { error: error })
    // Don't fail the whole operation if audit logging fails
  }
}

function checkSessionModifyAccess(session: any, profile: any): boolean {
  if (profile.tipo_usuario === 'admin') return true

  if (profile.tipo_usuario === 'professor') {
    return session.professor_id === profile.id
  }

  if (['diretor', 'secretario'].includes(profile.tipo_usuario)) {
    return session.turmas?.escola_id === profile.escola_id
  }

  return false
}