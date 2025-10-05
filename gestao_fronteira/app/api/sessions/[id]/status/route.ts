/**
 * Real-time Session Status API - Enhanced "Abrir aula" Workflow
 * Provides live session status updates for classroom monitoring
 * Brazilian Educational Compliance Implementation
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { z } from 'zod'
import { logger } from '@/lib/logger'

const SessionParamsSchema = z.object({
  id: z.string().uuid('Invalid session ID')
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
 * GET /api/sessions/[id]/status
 * Get real-time session status with live attendance tracking
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createSupabaseClient()
    const { profile } = await validateAuth(supabase)
    const { id } = await params

    const validatedParams = SessionParamsSchema.parse({ id })

    // Get session with real-time data
    const { data: session, error } = await supabase
      .from('aula_sessions')
      .select(`
        id,
        turma_id,
        professor_id,
        data_aula,
        fase,
        bloqueado,
        bloqueado_em,
        total_alunos,
        total_presentes,
        total_ausentes,
        updated_at,
        turmas:turma_id (
          id,
          nome,
          escola_id
        )
      `)
      .eq('id', validatedParams.id)
      .single()

    if (error || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    // Access control validation
    const canAccess = checkSessionAccess(session, profile)
    if (!canAccess) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Get real-time attendance statistics
    const { data: attendanceData } = await supabase
      .from('frequencia')
      .select('presente, is_locked, updated_at')
      .eq('session_id', session.id)

    // Calculate real-time statistics
    const stats = calculateAttendanceStats(attendanceData || [])

    // Get expected student count for this class
    const { data: expectedStudents } = await supabase
      .from('matriculas')
      .select('count')
      .eq('turma_id', session.turma_id)
      .eq('ativo', true)

    const expectedCount = expectedStudents?.[0]?.count || 0

    // Determine session status and warnings
    const status = determineSessionStatus(session, stats, expectedCount)

    // Get time until auto-lock (if applicable)
    const autoLockInfo = calculateAutoLockInfo(session.data_aula)

    // Check for recent activity (last 5 minutes)
    const recentActivity = await getRecentActivity(supabase, session.id)

    return NextResponse.json({
      session_id: session.id,
      fase: session.fase,
      bloqueado: session.bloqueado,
      bloqueado_em: session.bloqueado_em,
      last_updated: session.updated_at,

      // Real-time attendance statistics
      attendance: {
        expected_students: expectedCount,
        marked_attendance: stats.total_marked,
        present_count: stats.present_count,
        absent_count: stats.absent_count,
        pending_count: expectedCount - stats.total_marked,
        completion_percentage: expectedCount > 0 ? (stats.total_marked / expectedCount) * 100 : 0,
        locked_records: stats.locked_count
      },

      // Session status and compliance
      status: {
        phase: session.fase,
        compliance_status: status.compliance,
        can_modify: status.can_modify,
        warnings: status.warnings,
        requires_attention: status.requires_attention
      },

      // Auto-lock information
      auto_lock: autoLockInfo,

      // Recent activity for live updates
      recent_activity: recentActivity,

      // Timestamps for client-side caching
      timestamp: new Date().toISOString(),
      cache_duration: 30 // Suggest client cache for 30 seconds
    })

  } catch (error) {
    logger.error('Session status fetch error:', { error: error })

    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Invalid session ID',
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
 * POST /api/sessions/[id]/status
 * Update session status (phase transitions, manual lock, etc.)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createSupabaseClient()
    const { profile } = await validateAuth(supabase)
    const { id } = await params

    const validatedParams = SessionParamsSchema.parse({ id })
    const body = await request.json()

    const { action, ...actionData } = body

    switch (action) {
      case 'start_session':
        return await startSession(supabase, validatedParams.id, profile)

      case 'complete_session':
        return await completeSession(supabase, validatedParams.id, profile)

      case 'lock_session':
        return await lockSession(supabase, validatedParams.id, profile, actionData.force)

      case 'refresh_stats':
        return await refreshSessionStats(supabase, validatedParams.id, profile)

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

  } catch (error) {
    logger.error('Session status update error:', { error: error })

    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Invalid request data',
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
function checkSessionAccess(session: any, profile: any): boolean {
  if (profile.tipo_usuario === 'admin') return true

  if (profile.tipo_usuario === 'professor') {
    return session.professor_id === profile.id
  }

  if (['diretor', 'secretario'].includes(profile.tipo_usuario)) {
    return session.turmas?.escola_id === profile.escola_id
  }

  return false
}

function calculateAttendanceStats(attendanceData: any[]) {
  return {
    total_marked: attendanceData.length,
    present_count: attendanceData.filter(a => a.presente).length,
    absent_count: attendanceData.filter(a => !a.presente).length,
    locked_count: attendanceData.filter(a => a.is_locked).length
  }
}

function determineSessionStatus(session: any, stats: any, expectedCount: number) {
  const warnings = []
  const sessionDate = new Date(session.data_aula)
  const today = new Date()

  // Check compliance status
  let compliance = 'pending'
  if (session.bloqueado) {
    compliance = 'compliant'
  } else if (sessionDate < today && session.fase !== 'bloqueada') {
    compliance = 'non_compliant'
    warnings.push('Session should be locked (past due date)')
  }

  // Check attendance completion
  if (session.fase === 'chamada' && expectedCount > 0) {
    const completionRate = (stats.total_marked / expectedCount) * 100
    if (completionRate < 50) {
      warnings.push('Low attendance completion rate')
    }
  }

  // Check if session is approaching auto-lock time
  const autoLockInfo = calculateAutoLockInfo(session.data_aula)
  if (autoLockInfo.approaching_lock && !session.bloqueado) {
    warnings.push(`Session will auto-lock in ${autoLockInfo.time_until_lock}`)
  }

  return {
    compliance,
    can_modify: !session.bloqueado,
    warnings,
    requires_attention: warnings.length > 0 || compliance === 'non_compliant'
  }
}

function calculateAutoLockInfo(sessionDate: string) {
  const sessionDateTime = new Date(sessionDate)
  const lockTime = new Date(sessionDateTime)
  lockTime.setHours(18, 0, 0, 0) // 18:00 Brazilian time

  const now = new Date()
  const timeUntilLock = lockTime.getTime() - now.getTime()

  return {
    lock_time: lockTime.toISOString(),
    time_until_lock_ms: Math.max(0, timeUntilLock),
    time_until_lock: formatTimeUntilLock(timeUntilLock),
    approaching_lock: timeUntilLock > 0 && timeUntilLock < 3600000, // Within 1 hour
    should_lock: timeUntilLock <= 0
  }
}

function formatTimeUntilLock(milliseconds: number): string {
  if (milliseconds <= 0) return 'Overdue'

  const hours = Math.floor(milliseconds / (1000 * 60 * 60))
  const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60))

  if (hours > 0) {
    return `${hours}h ${minutes}m`
  }
  return `${minutes}m`
}

async function getRecentActivity(supabase: any, sessionId: string) {
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()

  const { data: activity } = await supabase
    .from('audit_logs')
    .select('action, timestamp, details')
    .eq('record_id', sessionId)
    .gte('timestamp', fiveMinutesAgo)
    .order('timestamp', { ascending: false })
    .limit(5)

  return activity || []
}

// Action handlers
async function startSession(supabase: any, sessionId: string, profile: any) {
  const { data, error } = await supabase
    .from('aula_sessions')
    .update({ fase: 'chamada' })
    .eq('id', sessionId)
    .eq('fase', 'planejamento') // Only allow starting from planning phase
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: 'Failed to start session' }, { status: 500 })
  }

  if (!data) {
    return NextResponse.json({ error: 'Session not in planning phase' }, { status: 400 })
  }

  return NextResponse.json({
    message: 'Session started successfully',
    session: data
  })
}

async function completeSession(supabase: any, sessionId: string, profile: any) {
  const { data, error } = await supabase
    .from('aula_sessions')
    .update({ fase: 'finalizada' })
    .eq('id', sessionId)
    .eq('fase', 'chamada') // Only allow completing from active phase
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: 'Failed to complete session' }, { status: 500 })
  }

  if (!data) {
    return NextResponse.json({ error: 'Session not in active phase' }, { status: 400 })
  }

  return NextResponse.json({
    message: 'Session completed successfully',
    session: data
  })
}

async function lockSession(supabase: any, sessionId: string, profile: any, force: boolean = false) {
  // Only admins can force lock
  if (force && profile.tipo_usuario !== 'admin') {
    return NextResponse.json({ error: 'Only administrators can force lock sessions' }, { status: 403 })
  }

  const { data, error } = await supabase
    .from('aula_sessions')
    .update({
      fase: 'bloqueada',
      bloqueado: true,
      bloqueado_em: new Date().toISOString()
    })
    .eq('id', sessionId)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: 'Failed to lock session' }, { status: 500 })
  }

  return NextResponse.json({
    message: 'Session locked successfully',
    session: data
  })
}

async function refreshSessionStats(supabase: any, sessionId: string, profile: any) {
  const { error } = await supabase.rpc('update_session_stats', {
    session_uuid: sessionId
  })

  if (error) {
    return NextResponse.json({ error: 'Failed to refresh session statistics' }, { status: 500 })
  }

  return NextResponse.json({
    message: 'Session statistics refreshed successfully'
  })
}