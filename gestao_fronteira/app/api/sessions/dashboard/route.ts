/**
 * Session Dashboard API - Enhanced "Abrir aula" Workflow
 * Provides administrative dashboard overview for session monitoring
 * Brazilian Educational Compliance Implementation
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { z } from 'zod'

// Validation schema
const DashboardQuerySchema = z.object({
  escola_id: z.string().uuid().optional(),
  date_from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  date_to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  professor_id: z.string().uuid().optional(),
  include_stats: z.string().transform(val => val === 'true').optional()
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
 * GET /api/sessions/dashboard
 * Get comprehensive dashboard overview of sessions
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseClient()
    const { profile } = await validateAuth(supabase)

    // Parse query parameters
    const url = new URL(request.url)
    const queryParams = Object.fromEntries(url.searchParams.entries())
    const validatedQuery = DashboardQuerySchema.parse(queryParams)

    // Determine escola_id based on user role
    let escolaId = validatedQuery.escola_id
    if (profile.tipo_usuario !== 'admin') {
      escolaId = profile.escola_id // Non-admins can only see their own school
    }

    // Set default date range if not provided
    const dateFrom = validatedQuery.date_from || new Date(new Date().setDate(new Date().getDate() - 7)).toISOString().split('T')[0]
    const dateTo = validatedQuery.date_to || new Date().toISOString().split('T')[0]

    // Get session overview
    const sessionOverview = await getSessionOverview(supabase, escolaId, dateFrom, dateTo, validatedQuery.professor_id)

    // Get active sessions requiring attention
    const activeSessions = await getActiveSessions(supabase, escolaId, validatedQuery.professor_id)

    // Get compliance overview
    const complianceOverview = await getComplianceOverview(supabase, escolaId, dateFrom, dateTo)

    // Get recent activity
    const recentActivity = await getRecentActivity(supabase, escolaId)

    // Get attendance statistics if requested
    let attendanceStats = null
    if (validatedQuery.include_stats) {
      attendanceStats = await getAttendanceStatistics(supabase, escolaId, dateFrom, dateTo)
    }

    // Get alerts and warnings
    const alerts = await getSystemAlerts(supabase, escolaId)

    return NextResponse.json({
      overview: sessionOverview,
      active_sessions: activeSessions,
      compliance: complianceOverview,
      recent_activity: recentActivity,
      attendance_stats: attendanceStats,
      alerts,
      filters: {
        escola_id: escolaId,
        date_from: dateFrom,
        date_to: dateTo,
        professor_id: validatedQuery.professor_id
      },
      timestamp: new Date().toISOString(),
      cache_duration: 60 // Suggest client cache for 60 seconds
    })

  } catch (error) {
    console.error('Dashboard fetch error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Invalid query parameters',
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
async function getSessionOverview(supabase: any, escolaId?: string, dateFrom?: string, dateTo?: string, professorId?: string) {
  let query = supabase
    .from('aula_sessions')
    .select(`
      id,
      fase,
      bloqueado,
      data_aula,
      total_alunos,
      total_presentes,
      turmas:turma_id (
        escola_id
      )
    `)

  // Apply filters
  if (escolaId) {
    query = query.in('turma_id',
      supabase.from('turmas').select('id').eq('escola_id', escolaId)
    )
  }

  if (dateFrom) {
    query = query.gte('data_aula', dateFrom)
  }

  if (dateTo) {
    query = query.lte('data_aula', dateTo)
  }

  if (professorId) {
    query = query.eq('professor_id', professorId)
  }

  const { data: sessions } = await query

  if (!sessions) return null

  // Calculate overview statistics
  const overview = {
    total_sessions: sessions.length,
    by_phase: {
      planejamento: sessions.filter(s => s.fase === 'planejamento').length,
      chamada: sessions.filter(s => s.fase === 'chamada').length,
      finalizada: sessions.filter(s => s.fase === 'finalizada').length,
      bloqueada: sessions.filter(s => s.fase === 'bloqueada').length
    },
    compliance: {
      compliant: sessions.filter(s => s.bloqueado).length,
      non_compliant: sessions.filter(s => {
        const sessionDate = new Date(s.data_aula)
        const today = new Date()
        return sessionDate < today && !s.bloqueado
      }).length,
      pending: sessions.filter(s => {
        const sessionDate = new Date(s.data_aula)
        const today = new Date()
        return sessionDate >= today && !s.bloqueado
      }).length
    },
    attendance: {
      total_students: sessions.reduce((sum, s) => sum + (s.total_alunos || 0), 0),
      total_present: sessions.reduce((sum, s) => sum + (s.total_presentes || 0), 0),
      average_attendance: sessions.length > 0
        ? (sessions.reduce((sum, s) => {
            if (s.total_alunos > 0) {
              return sum + (s.total_presentes / s.total_alunos)
            }
            return sum
          }, 0) / sessions.filter(s => s.total_alunos > 0).length) * 100
        : 0
    }
  }

  return overview
}

async function getActiveSessions(supabase: any, escolaId?: string, professorId?: string) {
  const today = new Date().toISOString().split('T')[0]

  let query = supabase
    .from('aula_sessions')
    .select(`
      id,
      fase,
      bloqueado,
      data_aula,
      total_alunos,
      total_presentes,
      updated_at,
      turmas:turma_id (
        id,
        nome,
        escola_id
      ),
      users:professor_id (
        id,
        nome_completo
      )
    `)
    .eq('data_aula', today)
    .in('fase', ['planejamento', 'chamada', 'finalizada'])
    .eq('bloqueado', false)

  // Apply filters
  if (escolaId) {
    query = query.in('turma_id',
      supabase.from('turmas').select('id').eq('escola_id', escolaId)
    )
  }

  if (professorId) {
    query = query.eq('professor_id', professorId)
  }

  query = query.order('updated_at', { ascending: false })

  const { data: sessions } = await query

  return (sessions || []).map(session => ({
    ...session,
    requires_attention: determineAttentionStatus(session),
    time_until_lock: calculateTimeUntilLock(session.data_aula),
    completion_percentage: session.total_alunos > 0
      ? (session.total_presentes / session.total_alunos) * 100
      : 0
  }))
}

async function getComplianceOverview(supabase: any, escolaId?: string, dateFrom?: string, dateTo?: string) {
  if (!escolaId) return null

  const { data: complianceData } = await supabase.rpc('get_compliance_audit_report', {
    escola_id_param: escolaId,
    date_from: dateFrom,
    date_to: dateTo
  })

  if (!complianceData || complianceData.length === 0) {
    return {
      average_compliance_score: 100,
      total_sessions: 0,
      sessions_with_issues: 0,
      recent_violations: []
    }
  }

  const avgScore = complianceData.reduce((sum: number, item: any) => sum + item.compliance_score, 0) / complianceData.length
  const sessionsWithIssues = complianceData.filter((item: any) => item.compliance_score < 90).length

  return {
    average_compliance_score: Math.round(avgScore * 100) / 100,
    total_sessions: complianceData.length,
    sessions_with_issues: sessionsWithIssues,
    recent_violations: complianceData
      .filter((item: any) => item.compliance_score < 80)
      .slice(0, 5)
      .map((item: any) => ({
        session_date: item.session_date,
        turma: item.turma_nome,
        professor: item.professor_nome,
        compliance_score: item.compliance_score,
        issues: item.total_actions > 10 ? ['Excessive modifications'] : []
      }))
  }
}

async function getRecentActivity(supabase: any, escolaId?: string) {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()

  let query = supabase
    .from('audit_logs')
    .select(`
      id,
      action,
      timestamp,
      details,
      users:user_id (
        nome_completo
      )
    `)
    .in('table_name', ['aula_sessions', 'frequencia'])
    .gte('timestamp', oneHourAgo)

  if (escolaId) {
    query = query.eq('escola_id', escolaId)
  }

  query = query
    .order('timestamp', { ascending: false })
    .limit(10)

  const { data: activity } = await query

  return (activity || []).map(item => ({
    id: item.id,
    action: item.action,
    timestamp: item.timestamp,
    user_name: item.users?.nome_completo || 'Unknown',
    description: generateActivityDescription(item.action, item.details)
  }))
}

async function getAttendanceStatistics(supabase: any, escolaId?: string, dateFrom?: string, dateTo?: string) {
  if (!escolaId) return null

  const { data: stats } = await supabase.rpc('get_session_statistics', {
    escola_id_param: escolaId,
    date_from: dateFrom,
    date_to: dateTo
  })

  return stats?.[0] || {
    total_sessions: 0,
    completed_sessions: 0,
    locked_sessions: 0,
    avg_attendance_rate: 0
  }
}

async function getSystemAlerts(supabase: any, escolaId?: string) {
  const alerts = []
  const today = new Date()
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000)

  // Check for sessions that should be locked but aren't
  let unlockedQuery = supabase
    .from('aula_sessions')
    .select(`
      id,
      data_aula,
      turmas:turma_id (
        nome,
        escola_id
      )
    `)
    .lt('data_aula', today.toISOString().split('T')[0])
    .eq('bloqueado', false)

  if (escolaId) {
    unlockedQuery = unlockedQuery.in('turma_id',
      supabase.from('turmas').select('id').eq('escola_id', escolaId)
    )
  }

  const { data: unlockedSessions } = await unlockedQuery

  if (unlockedSessions && unlockedSessions.length > 0) {
    alerts.push({
      type: 'compliance',
      severity: 'high',
      title: 'Sessions requiring lock',
      message: `${unlockedSessions.length} sessions from past dates are not locked`,
      count: unlockedSessions.length,
      action_required: true
    })
  }

  // Check for sessions approaching 18:00 lock time
  const todaySessions = await supabase
    .from('aula_sessions')
    .select('id, turmas:turma_id (escola_id)')
    .eq('data_aula', today.toISOString().split('T')[0])
    .eq('bloqueado', false)

  const currentHour = today.getHours()
  if (currentHour >= 17 && todaySessions?.data?.length > 0) {
    alerts.push({
      type: 'warning',
      severity: 'medium',
      title: 'Sessions approaching auto-lock',
      message: 'Sessions will be automatically locked at 18:00',
      count: todaySessions.data.length,
      action_required: false
    })
  }

  return alerts
}

// Utility functions
function determineAttentionStatus(session: any): boolean {
  const sessionDate = new Date(session.data_aula)
  const today = new Date()

  // Requires attention if it's an old unlocked session
  if (sessionDate < today && !session.bloqueado) {
    return true
  }

  // Requires attention if it's active but has low completion
  if (session.fase === 'chamada' && session.total_alunos > 0) {
    const completionRate = (session.total_presentes / session.total_alunos) * 100
    return completionRate < 50
  }

  return false
}

function calculateTimeUntilLock(sessionDate: string): { hours: number; minutes: number; overdue: boolean } {
  const lockTime = new Date(sessionDate)
  lockTime.setHours(18, 0, 0, 0)

  const now = new Date()
  const timeDiff = lockTime.getTime() - now.getTime()

  if (timeDiff <= 0) {
    return { hours: 0, minutes: 0, overdue: true }
  }

  const hours = Math.floor(timeDiff / (1000 * 60 * 60))
  const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60))

  return { hours, minutes, overdue: false }
}

function generateActivityDescription(action: string, details: any): string {
  const descriptions: Record<string, string> = {
    'SESSION_CREATED': 'Created new session',
    'SESSION_PHASE_CHANGED': 'Changed session phase',
    'SESSION_LOCKED': 'Locked session',
    'ATTENDANCE_MARKED': 'Marked student attendance',
    'ATTENDANCE_MODIFIED': 'Modified attendance record'
  }

  const baseDescription = descriptions[action] || action.toLowerCase().replace(/_/g, ' ')

  // Add context from details if available
  if (details?.compliance_context?.session_phase) {
    return `${baseDescription} (${details.compliance_context.session_phase})`
  }

  return baseDescription
}